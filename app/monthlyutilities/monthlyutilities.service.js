const organizationsService = require("../organizations/organizations.service");
const repository = require("../repository");
const { UTILITY_TYPES, UNIT_DETAILS } = require("../static/utility-units");
const moment = require("moment");
const _ = require("lodash");

const generateWaitingTime = 3 * 1000; // 3 seconds
let generateTimeoutFunction; // 3 seconds
let buildingIdsToProcess = []; // 3 seconds
const STARTDATE = "2015-01-01";

/**
 * Handler to process utility changes. It only starts generating weather data after x amount of milliseconds so that multiple building ids can be processed at the same time
 *
 * @param {string[]} buildingIds Building ids that had their utility data updated
 */
exports.utilityChangesHandler = buildingIds => {
  if (generateTimeoutFunction) clearTimeout(generateTimeoutFunction);
  buildingIdsToProcess = _.union(buildingIdsToProcess, buildingIds);
  generateTimeoutFunction = setTimeout(() => {
    console.debug(
      "Monthly utilities utilityChangesHandler -> Generating monthly utilities after waiting",
      generateWaitingTime,
      "milliseconds"
    );
    exports.generate({
      buildingIds: Object.assign([], buildingIdsToProcess),
      update: true
    });
    buildingIdsToProcess = [];
  }, generateWaitingTime);
};

exports.generate = options => {
  try {
    console.log(
      "Monthly utilities generate -> Started for options",
      JSON.stringify(options)
    );
    let buildingIds;
    organizationsService
      .getBuildingIds(options.organizationIds, options.buildingIds)
      .then(ids => {
        buildingIds = ids;
        let buildings;
        let monthlyUtilityData;
        const promises = [];
        console.log(
          "Monthly utilities generate -> Getting buildings and monthly utilities data for buildings",
          JSON.stringify(buildingIds)
        );
        promises.push(
          repository.buildings
            .findByIdsWithUtilityData(buildingIds)
            .then(data => (buildings = data))
        );
        promises.push(
          repository.monthlyutilities
            .findByBuildingIds(buildingIds)
            .then(data => (monthlyUtilityData = data))
        );
        Promise.all(promises).then(() => {
          const years = (options && options.years) || getDefaultYears();
          const update = (options && options.update) || false;
          for (let building of buildings) {
            const buildingId = building && building._id;
            console.log(
              "Monthly utilities generate -> Processing utilities for building",
              buildingId
            );
            const utilityIds = (building && building.utilityIds) || [];
            repository.utilities
              .findByIdsAndExistingData(utilityIds)
              .then(utilities => {
                if (!utilities || !utilities.length) {
                  console.log(
                    "Monthly utilities generate -> No utility data found for building",
                    buildingId,
                    "Building won't be processed"
                  );
                  return;
                }
                for (let year of years) {
                  let deletePromise;
                  console.log(
                    "Monthly utilities generate -> Processing year",
                    year,
                    "for building",
                    buildingId
                  );
                  const docsToSave = [];
                  const yearRange = getYearRange(year);
                  let monthlyRangeDates = getMonthlyDateRanges(yearRange);
                  if (update) {
                    deletePromise = repository.monthlyutilities
                      .deleteManyByBuildingIdAndYear(buildingId, year)
                      .then(deleted => {
                        console.log(
                          "Monthly utilities generate -> Deleted",
                          deleted.n,
                          "monthly utilities for building",
                          buildingId,
                          "and year",
                          year
                        );
                      });
                    monthlyUtilityData = monthlyUtilityData.filter(utilData => {
                      const found =
                        utilData.building.equals(buildingId) &&
                        utilData.year == year;
                      return !found;
                    });
                  } else {
                    deletePromise = Promise.resolve();
                  }
                  deletePromise.then(() => {
                    let availableDataForYear = monthlyUtilityData.filter(
                      mudata =>
                        mudata.building.equals(buildingId) &&
                        mudata.year == year
                    );
                    let lastDate = null;
                    if (availableDataForYear && availableDataForYear.length) {
                      console.log(
                        "Monthly utilities generate -> Found utilities for building",
                        buildingId,
                        "and year",
                        year
                      );
                      availableDataForYear = _.orderBy(
                        availableDataForYear,
                        ["date"],
                        ["desc"]
                      );
                      lastDate = availableDataForYear[0].date;
                      lastDate = lastDate && moment(lastDate);
                      const dates = availableDataForYear.map(ady =>
                        moment(ady.date).toISOString()
                      );
                      monthlyRangeDates = monthlyRangeDates.filter(
                        mrdate => !dates.includes(mrdate.start)
                      );
                    }
                    for (let monthRange of monthlyRangeDates) {
                      const startDate = moment(monthRange.start);
                      const endDate = moment(monthRange.end);
                      const currentDate = moment().utc();
                      // if (currentDate.isBetween(startDate, endDate)) break;
                      if (lastDate && lastDate.isBetween(startDate, endDate))
                        continue;
                      const month = moment(startDate).format("MMM");
                      const year = moment(startDate).format("YYYY");
                      const monthlyData = getMonthlyDataByUtilType(
                        utilities,
                        startDate,
                        endDate,
                        building
                      );
                      if (!monthlyData) continue;
                      let monthlyUtilityToBeSaved = {
                        building: buildingId,
                        date: startDate.toISOString(),
                        created: moment().toISOString(),
                        month,
                        year,
                        ...monthlyData
                      };
                      monthlyUtilityToBeSaved = getCalculations(
                        monthlyUtilityToBeSaved,
                        building
                      );
                      docsToSave.push(monthlyUtilityToBeSaved);
                      console.log(
                        "Monthly utilities generate -> Added utility for building",
                        buildingId,
                        "month",
                        startDate.month() + 1,
                        "of",
                        startDate.year()
                      );
                    }
                    if (docsToSave && docsToSave.length > 0) {
                      console.log(
                        "Monthly utilities generate -> Saving for building",
                        buildingId,
                        "and year",
                        year
                      );
                      repository.monthlyutilities
                        .insertMany(docsToSave)
                        .then(() => {
                          console.log(
                            "Monthly utilities generate -> Saved",
                            docsToSave.length,
                            "total months for building",
                            buildingId,
                            "and year",
                            year
                          );
                        });
                    } else {
                      console.log(
                        "Monthly utilities generate -> No monthly utilities to save for building",
                        buildingId,
                        "and year",
                        year
                      );
                    }
                  });
                }
              });
          }
        });
      });
  } catch (error) {
    console.error("Monthly utilities generate -> ", error);
  } finally {
  }
};

const getDefaultYears = date => {
  const startDate = date || STARTDATE || "2015-01-01";
  const currentYear = moment().year();
  let defaultYear = moment(startDate).year();
  const years = [];
  while (defaultYear <= currentYear) {
    years.push(defaultYear);
    defaultYear++;
  }
  return years;
};

const getYearRange = year => {
  year = year || moment().format("YYYY");
  const obj = {};
  if (year) {
    obj.start = moment()
      .utc()
      .set({ year })
      .startOf("year")
      .toISOString();
    obj.end = moment()
      .utc()
      .set({ year })
      .endOf("year")
      .toISOString();
  }
  return obj;
};

const getMonthlyDateRanges = ({ start, end }) => {
  start =
    moment(start) ||
    moment()
      .utc()
      .startOf("year");
  end =
    moment(end) ||
    moment()
      .utc()
      .endOf("year");

  const startAndEndDates = [];
  while (start.isSameOrBefore(end)) {
    const obj = {
      start: start
        .utc()
        .startOf("month")
        .toISOString(),
      end: start
        .utc()
        .endOf("month")
        .toISOString()
    };
    startAndEndDates.push(obj);
    start = start.add(1, "month");
  }
  return startAndEndDates;
};

const getSelectedUnitByUtilType = (unit, building) => {
  if(building && building.commoditySettings && building.commoditySettings[unit]) {
    return building.commoditySettings[unit].unit;
  }
  return UNIT_DETAILS[unit]?.defaultUnit || ''
}

const getMonthlyDataByUtilType = (utilities, start, end, building) => {
  try {
    const startDate = start && moment(start);
    const endDate = end && moment(end);
    const groupedUtilities = _.groupBy(utilities, "utilType");
    const buildingId = building && building._id;
    const keys = Object.values(UTILITY_TYPES);
    const returnObject = { daysInPeriod: 0 };
    const meterDates = [];
    let dataFound = false;
    for (let key of keys) {
      const units = getSelectedUnitByUtilType(key, building)
      const monthlyUtilityData = {
        totalUsage: 0,
        totalCost: 0,
        ghg: 0,
        units
      };
      if (key === "electric") {
        monthlyUtilityData["demand"] = 0;
        monthlyUtilityData["demandCost"] = 0;
      }
      const utils = groupedUtilities[key];
      const meterData = _.flatten(
        (utils && utils.map(util => util.meterData)) || []
      ).filter(
        data =>
          data &&
          (moment(data.startDate)
            .add(1, "millisecond")
            .isBetween(startDate, endDate) ||
            moment(data.endDate)
              .subtract(1, "millisecond")
              .isBetween(startDate, endDate))
      );
      const deliveryData = _.flatten(
        (utils && utils.map(util => util.deliveryData)) || []
      ).filter(
        data => data && moment(data.deliveryDate).isSame(startDate, "month")
      );
      for (let mdata of meterData) {
        const mStartDate = moment(mdata.startDate);
        const mEndDate = moment(mdata.endDate).subtract(1, "millisecond"); // due to some end dates being 00:00:00:0000 of the next day and shouldn't be counted as a day with values
        // All following logic is due to meterData entries that start in a month and end in a different one
        const startEndDaysDiff = mEndDate.diff(mStartDate, "day") + 1; // 1 day added since with this diff the first day is "ignored". logic applied for the following diffs
        if (startEndDaysDiff >= 1) {
          let daysCorrespondingToCurrentMonth;
          if (
            mStartDate.isBetween(startDate, endDate) &&
            !mEndDate.isBetween(startDate, endDate)
          ) {
            daysCorrespondingToCurrentMonth =
              endDate.diff(mStartDate, "day") + 1;
            meterDates.push({ start: mStartDate, end: endDate });
          } else if (
            mEndDate.isBetween(startDate, endDate) &&
            !mStartDate.isBetween(startDate, endDate)
          ) {
            daysCorrespondingToCurrentMonth =
              mEndDate.diff(startDate, "day") + 1;
            meterDates.push({ start: startDate, end: mEndDate });
          } else {
            console.log(
              startDate.isBetween(mStartDate, mEndDate),
              endDate.isBetween(mStartDate, mEndDate)
            );
            if (
              endDate.isBetween(mStartDate, mEndDate) &&
              mEndDate.isAfter(endDate)
            ) {
              daysCorrespondingToCurrentMonth =
                endDate.diff(startDate, "day") + 1;
              meterDates.push({ start: startDate, end: endDate });
            } else {
              meterDates.push({ start: mStartDate, end: mEndDate });
            }
          }
          let totalCost = Number(mdata["totalCost"] || 0),
            totalUsage = Number(mdata["totalUsage"] || 0),
            demand = Number(mdata["demand"] || 0),
            demandCost = Number(mdata["demandCost"] || 0);

          if (daysCorrespondingToCurrentMonth) {
            totalCost =
              (totalCost / startEndDaysDiff) * daysCorrespondingToCurrentMonth;
            totalUsage =
              (totalUsage / startEndDaysDiff) * daysCorrespondingToCurrentMonth;
          }
          dataFound = true;
          if (key === "electric") {
            if (daysCorrespondingToCurrentMonth) {
              demand =
                (demand / startEndDaysDiff) * daysCorrespondingToCurrentMonth;
              demandCost =
                (demandCost / startEndDaysDiff) *
                daysCorrespondingToCurrentMonth;
            }
            // totalCost += demandCost;
            monthlyUtilityData["demand"] += demand;
            monthlyUtilityData["demandCost"] += demandCost;
          }
          monthlyUtilityData["totalCost"] += totalCost;
          monthlyUtilityData["totalUsage"] += totalUsage;
        } else {
          console.error(
            "meterData with erratic dates",
            "start",
            mStartDate.toISOString(),
            "end",
            mEndDate.toISOString(),
            "buildingId",
            buildingId,
            "meterDataId",
            mdata._id
          );
        }
      }
      for (let ddata of deliveryData) {
        dataFound = true;
        meterDates.push({ start: startDate, end: endDate });
        monthlyUtilityData["totalCost"] += Number(ddata["totalCost"] || 0);
        monthlyUtilityData["totalUsage"] += Number(ddata["quantity"] || 0);
      }
      monthlyUtilityData["rate"] = monthlyUtilityData["totalUsage"]
        ? monthlyUtilityData["totalCost"] / monthlyUtilityData["totalUsage"]
        : 0;
      returnObject[key] = monthlyUtilityData;
    }
    returnObject["daysInPeriod"] = getDaysCovered(meterDates);
    return (dataFound && returnObject) || null;
  } catch (error) {
    console.log(error);
    return null;
  }
};

const getGHGFactors = building => {
  const ghgFactorObj = {};
  ghgFactorObj["electric"] =
    (building.rates &&
      building.rates.electricGHG &&
      building.rates.electricGHG) ||
    0.000744;
  ghgFactorObj["naturalgas"] =
    (building.rates && building.rates.gasGHG && building.rates.gasGHG) ||
    0.0053;
  ghgFactorObj["steam"] =
    (building.rates && building.rates.steamGHG && building.rates.steamGHG) || 0;
  ghgFactorObj["fueloil2"] =
    (building.rates &&
      building.rates.fuelOil2GHG &&
      building.rates.fuelOil2GHG) ||
    0.01021;
  ghgFactorObj["fueloil4"] =
    (building.rates &&
      building.rates.fuelOil4GHG &&
      building.rates.fuelOil4GHG) ||
    0.01096;
  ghgFactorObj["fueloil56"] =
    (building.rates &&
      building.rates.fuelOil56GHG &&
      building.rates.fuelOil56GHG) ||
    0.01021;
  ghgFactorObj["diesel"] =
    (building.rates && building.rates.dieselGHG && building.rates.dieselGHG) ||
    0.01021;
  return ghgFactorObj;
};

const getConversionFactorsTokBtu = () => {
  const cFactors = {
    electric: 3.412,
    naturalgas: 100,
    fueloil2: 139.6,
    fueloil4: 145.1,
    fueloil56: (148.8 + 152.4) / 2,
    diesel: 139
  };
  return cFactors;
};

const getCalculations = (monthDataObject, building) => {
  try {
    if (!monthDataObject || !building) throw "error";
    const data = monthDataObject;
    const GHGFactor = getGHGFactors(building);
    const cFactors = getConversionFactorsTokBtu();
    let totalCost = 0;
    let totalEnergy = 0;
    for (let key of Object.keys(GHGFactor)) {
      if (!data || !data[key]) {
        continue;
      }
      const factor = cFactors[key] || null;
      const gFactor = GHGFactor[key] || null;
      if (factor) {
        data[key]["kbtu"] = factor * _.round(data[key]["totalUsage"], 2);
        totalEnergy = _.round(totalEnergy, 2) + _.round(data[key]["kbtu"], 2);
      }
      if (gFactor) {
        data[key]["ghg"] = gFactor * _.round(data[key]["totalUsage"], 2);
      }
      totalCost =
        totalCost +
        ((key === "electric" &&
          data[key]["totalCost"] + data[key]["demandCost"]) ||
          data[key]["totalCost"]);
    }
    data["totalCost"] = _.round(totalCost, 2);
    data["totalEnergyCost"] =
      _.round(totalCost, 2) - _.round(data["water"]["totalCost"], 2);
    data["totalEnergy"] = {
      value: totalEnergy,
      units: "kBtu"
    };
    return data;
  } catch (error) {
    console.log("error", error);
    return monthDataObject;
  }
};

const getDatesInRange = dateRange => {
  try {
    if (!dateRange || !dateRange["start"] || !dateRange["end"]) throw "error";
    const startDate = moment(dateRange.start);
    const endDate = moment(dateRange.end);
    const dates = [];
    while (startDate.isSameOrBefore(endDate)) {
      dates.push(startDate.format("L"));
      startDate.add(1, "days");
    }
    return dates;
  } catch (error) {
    return [];
  }
};

const getDaysCovered = dates => {
  try {
    if (!dates || !dates.length) throw "error";
    dates = _.uniq(_.flatten(dates.map(date => getDatesInRange(date))));
    return dates.length;
  } catch (error) {
    return 0;
  }
};
