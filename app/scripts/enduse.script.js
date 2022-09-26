"use strict";

const request = require("request-promise");
const _ = require("lodash");
const moment = require("moment");
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;

const { Building } = require("../models/building.server.model");
const { MonthlyEndUse } = require("../models/monthlyenduse.script.model");
const { YearlyEndUse } = require("../models/yearlyenduse.script.model");
const { findByBuilding } = require("../dao/buildingEquipment.server.dao");
const { findById } = require("../dao/equipment.server.dao");
const { getProjects } = require("../dao/project.server.dao");

let isYearly = true;
let collection;
let successBuildingArr = [];
let failedBuildingArr = [];

const getBuildings = async (buildingIds, skip, limit) => {
  const aggregator = [
    {
      $match: {
        $nor: [
          {
            utilityIds: { $exists: false }
          },
          {
            utilityIds: { $size: 0 }
          }
        ]
      }
    },
    {
      $lookup: {
        from: "utilities",
        localField: "utilityIds",
        foreignField: "_id",
        as: "utilitiesData"
      }
    },
    {
      $project: {
        _id: 1,
        occupancy: "$buildingUse",
        open24: "$open247",
        vintage: "$buildYear",
        projectIds: "$projectIds",
        operations: "$operations",
        size: "$squareFeet",
        rates: "$rates",
        stories: "$floorCount",
        zipCode: {
          $cond: {
            if: "$location.zipCode",
            then: "$location.zipCode",
            else: "$zipCode"
          }
        },
        utilitiesData: 1
      }
    }
  ];

  if (!buildingIds.length) {
    if (skip) {
      aggregator.push({ $skip: skip });
    }
    aggregator.push({
      $sort: {
        created: 1
      }
    });
    aggregator.push({ $limit: limit });
  } else {
    let ids = [];
    buildingIds = _.uniq(buildingIds);
    for (let id of buildingIds) {
      ids.push(new ObjectId(id));
    }
    aggregator[0]["$match"]["_id"] = { $in: ids };
  }
  return await Building.aggregate(aggregator);
};

const getDates = async (years, isYearly, months) => {
  let datesArr = [];
  if (isYearly) {
    for (let year of years) {
      let dateObj = {};
      dateObj["startDate"] = new Date(`${+year}-01-01T00:00:00.000Z`);
      dateObj["endDate"] = new Date(`${+year}-12-31T00:00:00.000Z`);
      datesArr.push(dateObj);
    }
    return datesArr;
  } else {
    for (let year of years) {
      months = months.length ? months : moment.months();
      for (let month of months) {
        let dateObj = {};
        month = moment()
          .month(month)
          .format("MM");
        dateObj["startDate"] = new Date(`${+year}-${month}-01T00:00:00.000Z`);
        dateObj["endDate"] = new Date(`${+year}-${month}-31T00:00:00.000Z`);
        datesArr.push(dateObj);
      }
    }
  }
  return datesArr;
};

const noOfDaysDiff = (startDate, endDate) => {
  return Math.abs(moment(startDate).diff(endDate, "days"));
};

const calculateEstimates = async (meterObj, dateObj) => {
  const estimatesObj = {
    totalCost: 0,
    electric: 0,
    gas: 0,
    date: dateObj["startDate"]
  };
  for (let key of Object.keys(meterObj)) {
    _.filter(meterObj[key], meter => {
      const {
        startDate,
        endDate,
        estimation,
        demandCost,
        demand,
        totalUsage,
        totalCost
      } = meter;
      if (
        moment(startDate).isSameOrAfter(dateObj.startDate) &&
        moment(endDate).isSameOrBefore(dateObj.endDate)
      ) {
        estimatesObj["totalCost"] += totalCost ? totalCost : 0;
        if (key == "electric") {
          estimatesObj["totalCost"] += demandCost ? demandCost : 0;
          estimatesObj["electric"] +=
            (totalUsage ? totalUsage : 0) + (demand ? demand : 0);
        } else if (key == "natural-gas") {
          estimatesObj["gas"] += totalUsage ? totalUsage : 0;
        }
      } else {
        const noOfDaysCurrMonth = noOfDaysDiff(
          dateObj.startDate,
          dateObj.endDate
        );
        if (
          moment(meter.startDate).isSameOrAfter(dateObj.startDate) &&
          moment(meter.startDate).isSameOrBefore(dateObj.endDate)
        ) {
          // 26-01-2018 31-01-2018 6 for calculated Jan totalCost = totalCost/30 * 6

          const noOfDays = noOfDaysDiff(meter.startDate, dateObj.endDate);
          let totalCostInCurrMonth = totalCost
            ? (totalCost / noOfDaysCurrMonth) * noOfDays
            : 0;
          let totalUsageInCurrMonth = totalUsage
            ? (totalUsage / noOfDaysCurrMonth) * noOfDays
            : 0;
          if (key == "electric") {
            totalCostInCurrMonth += demandCost
              ? (demandCost / noOfDaysCurrMonth) * noOfDays
              : 0;
            totalUsageInCurrMonth += demandCost
              ? (demand / noOfDaysCurrMonth) * noOfDays
              : 0;
            estimatesObj["electric"] += totalUsageInCurrMonth;
          }
          if (key == "natural-gas") {
            estimatesObj["gas"] += totalUsageInCurrMonth;
          }
          estimatesObj["totalCost"] += totalCostInCurrMonth;
        } else if (
          moment(meter.endDate).isSameOrAfter(dateObj.startDate) &&
          moment(meter.endDate).isSameOrBefore(dateObj.endDate)
        ) {
          // 26-01-2018 01-02-2018 eliminate 6 days
          // meter.startDate - meter.endDate 30 days totalCost = totalCost - totalCost/30 *6
          const noOfDays = noOfDaysDiff(meter.startDate, dateObj.startDate);
          let totalCostInCurrMonth = totalCost
            ? totalCost - (totalCost / noOfDaysCurrMonth) * noOfDays
            : 0;
          let totalUsageInCurrMonth = totalUsage
            ? totalUsage - (totalUsage / noOfDaysCurrMonth) * noOfDays
            : 0;
          if (key == "electric") {
            totalCostInCurrMonth += demandCost
              ? demandCost - (demandCost / noOfDaysCurrMonth) * noOfDays
              : 0;
            totalUsageInCurrMonth += demandCost
              ? demand - (demand / noOfDaysCurrMonth) * noOfDays
              : 0;
            estimatesObj["electric"] += totalUsageInCurrMonth;
          }
          if (key == "natural-gas") {
            estimatesObj["gas"] += totalUsageInCurrMonth;
          }
          estimatesObj["totalCost"] += totalCostInCurrMonth;
        }
      }
    });
  }
  return estimatesObj;
};

const constructUri = (
  occupancy,
  open24,
  size,
  stories,
  vintage,
  zipCode,
  totalCost,
  electric,
  gas
) => {
  let urls = {};
  urls[
    "enduse"
  ] = `http://analysis-qa.buildee.com/simple-cbecs?electric=${electric}&gas=${gas}&occupancy=${occupancy}&open24=${open24}&size=${size}&stories=${stories}&total-cost=${totalCost}&vintage=${vintage}&zipcode=${zipCode}&wwr=0.3`;
  urls[
    "electricenduse"
  ] = `http://analysis-qa.buildee.com/simple-cbecs/electric?electric=${electric}&gas=${gas}&occupancy=${occupancy}&open24=${open24}&size=${size}&stories=${stories}&total-cost=${totalCost}&vintage=${vintage}&zipcode=${zipCode}&wwr=0.3`;
  urls[
    "naturalgasenduse"
  ] = `http://analysis-qa.buildee.com/simple-cbecs/natural-gas?electric=${electric}&gas=${gas}&occupancy=${occupancy}&open24=${open24}&size=${size}&stories=${stories}&total-cost=${totalCost}&vintage=${vintage}&zipcode=${zipCode}&wwr=0.3`;
  return urls;
};

const callApi = async (uri, body) => {
  const options = {
    method: "POST",
    uri,
    body,
    json: true
  };
  try {
    const result = await request(options);
    return Promise.resolve(result);
  } catch (error) {
    return Promise.resolve(null);
  }
};

const getEndUse = async (
  building,
  occupancy,
  open24,
  size,
  stories,
  vintage,
  zipCode,
  estimatesArr
) => {
  collection = isYearly ? YearlyEndUse : MonthlyEndUse;
  // console.log("inside end use");
  for (let estimates of estimatesArr) {
    // console.log("inside if");
    const { totalCost, electric, gas, date } = estimates;
    const urls = constructUri(
      occupancy,
      open24,
      size,
      stories,
      vintage,
      zipCode,
      totalCost,
      electric,
      gas
    );
    const monthEndUse = {
      building: building._id,
      year: moment(date).year(),
      actual: true
    };
    Object.assign(
      monthEndUse,
      !isYearly ? { month: moment.months()[moment(date).month()] } : null,
      isYearly
        ? {
            date: moment(date)
              .utc(false)
              .startOf("year")
          }
        : { date: date }
    );
    // console.log("monthend use", monthEndUse);
    if (
      !(await (
        await collection.find({
          building: building._id,
          date,
          month: monthEndUse["month"],
          year: monthEndUse["year"]
        })
      ).length)
    ) {
      for (let key of Object.keys(urls)) {
        const startDate = moment([monthEndUse["year"], 0]);
        const endDate = moment(startDate).endOf('year');
        const utilities = building.utilitiesData;
        const electricUtilities = utilities.filter(
          utility => utility.utilType === "electric"
        );
        let electric = _.flatten(
          electricUtilities.map(utility =>
            utility.meterData.filter(
              meter => meter.startDate >= startDate && meter.endDate <= endDate
            )
          )
        );
        electric = _.uniqBy(electric, "startDate");
        electric = _.uniqBy(electric, "endDate");

        const gasUtilities = utilities.filter(
          utility => utility.utilType === "natural-gas"
        );
        let gas = _.flatten(
          gasUtilities.map(utility =>
            utility.meterData.filter(
              meter => meter.startDate >= startDate && meter.endDate <= endDate
            )
          )
        );
        gas = _.uniqBy(_.uniqBy(gas, "startDate"), "endDate");

        const equipmentsObject = {};
        const equipments = await findByBuilding(building._id.toString());
        const libraryEquipments = await Promise.all(
          equipments.map(async equipment => {
            const found = await findById(equipment.libraryEquipment);
            const operation = building.operations.find(operation => {
              return operation.id == equipment.operation.id;
            });
            return (
              found && {
                equipment: found,
                annualHours: operation && operation.annualHours
              }
            );
          })
        );
        _.compact(libraryEquipments).forEach(({ equipment, annualHours }) => {
          let equipmentObj = equipment.toObject();
          const category = equipment.category === "KITCHEN" ? "COOKING" : equipment.category;
          equipmentObj.fieldsArray = undefined;
          equipmentObj.annualHours = annualHours;
          if (!equipmentsObject[category]) {
            equipmentsObject[category] = [];
          }
          equipmentsObject[category].push(equipmentObj);
        });
        const equipment = [];
        const equipmentArray = Object.entries(equipmentsObject);
        equipmentArray.forEach(([key, value]) => {
          const temp = {};
          temp[key] = value;
          equipment.push(temp);
        });
        const rates = {
          electric: building.rates.electric,
          gas: building.rates.gas
        };

        const projects = await getProjects(building.projectIds);
        let projectsData = projects.map(project => ({
          fuelType: project.fuel,
          category: project.project_category,
          application: project.project_application,
          results: Object.values(project.runResults).map(result => ({
            energySavings: result ? result["energy-savings"] : 0,
            costSavings: result ? result["annual-savings"] : 0
          }))
        }));

        //cleanup projects with empty results
        projectsData = projectsData.filter(project => project.results && project.results.length > 0 && !_.isNil(project.results[0].energySavings))

        const request = {
          utilityData: [{ electric }, { gas }],
          equipment,
          rates,
          year: monthEndUse["year"],
          projects: projectsData
        };
        monthEndUse[key] = await callApi(urls[key], request);
      }
      if (
        monthEndUse.enduse &&
        monthEndUse.electricenduse &&
        monthEndUse.naturalgasenduse
      ) {
        // console.log("data created building", building);
        successBuildingArr.push(building._id);
        await collection.create(monthEndUse);
      } else {
        failedBuildingArr.push(building._id);
      }
    }
  }
};

const transformAndSaveData = async (buildings, years, isYearly, months) => {
  const requiredFields = ["size", "zipCode"];
  buildings = _.filter(buildings, building => {
    let dataExists = false;
    for (let key of requiredFields) {
      if (
        building[key] &&
        (typeof building[key] == "number"
          ? building[key]
          : building[key].length)
      ) {
        dataExists = true;
      } else {
        dataExists = false;
        failedBuildingArr.push(building._id);
        // TODO: Push the failed building ids to JSON
        break;
      }
    }
    if (dataExists) return building;
  });
  for (let buildingObj of buildings) {
    const {
      occupancy,
      open24,
      size,
      stories,
      vintage,
      zipCode,
      utilitiesData
    } = buildingObj;
    const dates = await getDates(years, isYearly, months);
    const groupByutilType = _.groupBy(utilitiesData, "utilType");
    let meterObj = {};
    for (let utilType of Object.keys(groupByutilType)) {
      let meterDataArr = [];
      for (let utility of groupByutilType[utilType]) {
        meterDataArr.push(utility.meterData);
      }
      meterDataArr = _.flatten(meterDataArr);
      meterObj[utilType] = meterDataArr;
    }
    let estimatesArr = [];
    for (let dateobj of dates) {
      let estimates = await calculateEstimates(meterObj, dateobj);
      estimatesArr.push(estimates);
    }
    return await getEndUse(
      buildingObj,
      occupancy,
      open24,
      size,
      stories,
      vintage,
      zipCode,
      estimatesArr
    );
  }
};

const endUse = async (options = null) => {
  // console.log("SCRIPT STarted");
  const buildingIds = (options && options["buildingIds"]) || [];
  const years = (options && options["years"]) || [
    "2017",
    "2018",
    "2019",
    "2020"
  ];
  const limit = (options && options["limit"]) || 100;
  const months = (options && options["months"]) || [];
  isYearly = (options && options["type"] == "year") || false;
  try {
    if (!buildingIds.length) {
      const buildingsCount = await Building.countDocuments({
        $nor: [{ utilityIds: { $exists: false } }, { utilityIds: { $size: 0 } }]
      });
      for (let curr = 0; curr <= buildingsCount; curr = curr + limit) {
        const buildings = await getBuildings(buildingIds, curr, limit);
        // console.log("building Data", buildings);
        await transformAndSaveData(buildings, years, isYearly, months);
        // Note: Just for developing Purpose
        if (curr + 50 < buildingsCount) {
          // console.log(`saved ${curr + 50} of ${buildingsCount} buildings`);
        } else {
          // console.log(`saved ${buildingsCount} of ${buildingsCount} buildings`);
        }
      }
    } else {
      const buildings = await getBuildings(buildingIds);
      await transformAndSaveData(buildings, years, isYearly, months);
    }
    failedBuildingArr = _.uniq(failedBuildingArr);
    successBuildingArr = _.uniq(successBuildingArr);
  } catch (e) {
    console.error(e);
  }
};

module.exports = {
  endUse
};
