const _ = require("lodash");
const moment = require("moment");
const mongoose = require("mongoose");
const utils = require("util");
const Utility = mongoose.model("Utility");
const Building = mongoose.model("Building");
const BuildingEquipment = mongoose.model("BuildingEquipment");
const { getBuildingUse } = require("../utils/api.portfolio.util");
const analysisClient = require("../utils/api.analysis.client");

const chunkArray = (array, chunk_size) => {
  let orgArray = [...array];
  var newArray = [];
  while (orgArray.length) {
    newArray.push(orgArray.splice(0, chunk_size));
  }
  return newArray;
};

const calculateUtilitySummaries = (utilities, building) => {
  return new Promise(resolve => {
    let totalUtilityCosts = 0;
    let totalElectricDemand = 0;
    let totalUtilUsages = {};

    if (Object.keys(utilities).length !== 0) {
      Object.keys(utilities).forEach(utilType => {
        let utilUsage = 0;

        utilities[utilType].forEach(utility => {
          utility.meterData.forEach(dataPoint => {
            utilUsage += dataPoint.totalUsage;
            if (utility.utilType === "electric") {
              totalUtilityCosts += dataPoint.totalCost + dataPoint.demandCost;
              totalElectricDemand += dataPoint.demand;
            } else {
              totalUtilityCosts += dataPoint.totalCost;
            }
          });
          totalUtilUsages[utilType] = utilUsage;
        });
      });
      let utilityMetrics = {
        totalCost: Math.round(totalUtilityCosts),
        costPerSqFoot:
          Math.round((totalUtilityCosts / building.squareFeet) * 100) / 100,
        totalUtilUsages: totalUtilUsages,
        totalElectricDemand: totalElectricDemand
      };
      resolve(utilityMetrics);
    } else {
      resolve();
    }
  });
};

const getUtilities = async utilityIds => {
  try {
    if (!utilityIds && utilityIds.length === 0) return Promise.resolve([]);
    const filter = {
      _id: {
        $in: utilityIds.map(utilityId => mongoose.Types.ObjectId(utilityId))
      },
      $or: [
        {
          "meterData.0": {
            $exists: true
          }
        },
        {
          "deliveryData.0": {
            $exists: true
          }
        }
      ]
    };
    return Promise.resolve(await Utility.find(filter).exec());
  } catch (error) {
    return Promise.resolve([]);
  }
};

const getScenarioProjectRunResult = async (projectBody, buildingId) => {
  try {
    let result = {};
    const building = await Building.findById(buildingId);
    if (building) {
      projectBody.initialValues.locations = null;
      const projectFinance = {
        discount_rate: building.rates.discountRate,
        finance_rate: building.rates.financeRate,
        inflation_rate: building.rates.inflationRate,
        reinvestment_rate: building.rates.reinvestmentRate,
        investment_period: building.rates.investmentPeriod,
        project_cost: parseFloat(projectBody.initialValues.project_cost) || 0,
        maintenance_savings:
          parseFloat(projectBody.initialValues.maintenance_savings) || 0
      };
      const utilityObj = {};

      if (building.rates) {
        if (building.rates.electric) {
          utilityObj.electric = building.rates.electric;
        }
        if (building.rates.gas) {
          utilityObj.gas = building.rates.gas;
        }
        if (building.rates.steam) {
          utilityObj.steam = building.rates.steam;
        }
        if (building.rates.water) {
          utilityObj.water = building.rates.water;
        }
        if (building.rates.fuelOil2) {
          utilityObj.fuelOil2 = building.rates.fuelOil2;
        }
        if (building.rates.fuelOil4) {
          utilityObj.fuelOil4 = building.rates.fuelOil4;
        }
        if (building.rates.fuelOil56) {
          utilityObj.fuelOil56 = building.rates.fuelOil56;
        }
        if (building.rates.diesel) {
          utilityObj.diesel = building.rates.diesel;
        }
        if (building.rates.other) {
          utilityObj.other = building.rates.other;
        }
      }
      let request = {
        measure: JSON.parse(JSON.stringify(projectBody.initialValues)),
        finance: {
          project_cost: 15000.0,
          incentive: 0,
          annual_savings: 0,
          maintenance_savings: 0.0,
          discount_rate: 0.0,
          finance_rate: 0.0,
          inflation_rate: 1.0,
          reinvestment_rate: 0.0,
          investment_period: 10
        }
      };
      request.incentive = {
        incentive_type: "unitIncentive",
        input_label: "things",
        unit_rate: 0,
        input: 0
      };
      request.utility = {
        electric:
          (building.rates &&
            building.rates.electric &&
            building.rates.electric) ||
          0.11,
        gas: (building.rates && building.rates.gas && building.rates.gas) || 1,
        rate_type: "blended-rate"
      };
      const building_type = getBuildingUse(
        "buildee",
        "pm",
        building.buildingUse
      );
      if (projectBody.name === "boilerTuneUpNY") {
        let square_footage =
          building.squareFeet || projectBody.initialValues.square_footage || 0;
        let city =
          (building.locations && building.locations.city) ||
          projectBody.initialValues.city ||
          "nyc";
        let units = projectBody.initialValues.units || 1;
        let sum_total_of_maxOutputCapacity =
          projectBody.initialValues.sum_total_of_maxOutputCapacity || 0;
        let percentage_natural_gas =
          projectBody.initialValues.percentage_natural_gas || 0;
        let percentage_2_oil = projectBody.initialValues.percentage_2_oil || 0;
        let percentage_4_oil = projectBody.initialValues.percentage_4_oil || 0;

        const utilityIds = (building && building.utilityIds) || [];
        let utilities = await getUtilities(utilityIds);
        if (utilities && Object.keys(utilities).length > 0) {
          let tempUtilState = {};
          utilities.map(utility => {
            if (!tempUtilState[utility.utilType]) {
              tempUtilState[utility.utilType] = [];
            }
            tempUtilState[utility.utilType].push(utility);
          });
          utilities = tempUtilState;
          let utilityMetrics = await calculateUtilitySummaries(
            utilities,
            building
          );
          const { totalUtilUsages } = utilityMetrics;
          let natural_gas =
            (totalUtilUsages && totalUtilUsages["natural-gas"]) || 0;
          let fuelOil2 =
            (totalUtilUsages && totalUtilUsages["fuel-oil-2"]) || 0;
          let fuelOil4 =
            (totalUtilUsages && totalUtilUsages["fuel-oil-4"]) || 0;
          let total = natural_gas + fuelOil2 + fuelOil4;
          if (!total) {
            total = 1;
            natural_gas = 1;
          }
          percentage_natural_gas = +((natural_gas / total) * 100).toFixed(0);
          percentage_2_oil = +((fuelOil2 / total) * 100).toFixed(0);
          percentage_4_oil = +((fuelOil4 / total) * 100).toFixed(0);

          let buildingEquipment = await BuildingEquipment.find({
            building: building._id,
            isArchived: { $in: [null, false] }
          }).populate("libraryEquipment");
          buildingEquipment = buildingEquipment.filter(item => {
            let category =
              (item.libraryEquipment && item.libraryEquipment.category) || "";
            let application =
              (item.libraryEquipment && item.libraryEquipment.application) ||
              "";
            let technology =
              (item.libraryEquipment && item.libraryEquipment.technology) || "";
            if (
              category == "HEATING" &&
              application == "BOILER" &&
              (technology == "STEAM_BOILER" || technology == "HOT_WATER_BOILER")
            )
              return true;
            return false;
          });
          let sum = 0;
          buildingEquipment.map(item => {
            let maxOutputCapacity =
              (item.libraryEquipment &&
                item.libraryEquipment.fields &&
                item.libraryEquipment.fields.maxOutputCapacity &&
                item.libraryEquipment.fields.maxOutputCapacity.value) ||
              0;
            sum += maxOutputCapacity;
          });
          let length = buildingEquipment.length;
          let project_cost = 1600 * length;
          if (length == 0) {
            project_cost = 1600;
            sum = ((100788 / 1910) * building.squareFeet) / 1000;
          }
          sum_total_of_maxOutputCapacity = sum;
          units = length || 1;
        }
        request.measure = {
          name: projectBody.name,
          building_type,
          baseline_efficiency: projectBody.initialValues.baseline_efficiency,
          load_factor: projectBody.initialValues.load_factor,
          square_footage,
          city,
          units,
          sum_total_of_maxOutputCapacity: +sum_total_of_maxOutputCapacity,
          percentage_natural_gas,
          percentage_2_oil,
          percentage_4_oil
        };
        request.utility = {
          electric: 0,
          gas: 0,
          rate_type: "blended-rate"
        };
      } else {
        request.utility = {
          electric: 0,
          gas: 0,
          rate_type: "blended-rate"
        };
        let endUse = building.endUse || {};
        if (
          endUse &&
          endUse["lighting-energy-estimate"] &&
          endUse["lighting-energy-estimate"].estimated_consumption
        ) {
          let lighting =
            endUse["lighting-energy-estimate"].estimated_consumption;
          request.measure = {
            building_type: building_type,
            square_footage:
              building.squareFeet ||
              projectBody.initialValues.square_footage ||
              0,
            baseline_eub_lighting: lighting,
            name: projectBody.name
          };
        } else {
          return {};
        }
      }
      const asyncFuc = utils.promisify(analysisClient.runPrescriptiveMeasure);
      result = await asyncFuc(request);
    }
    return result;
  } catch (err) {
    console.log("err", err);
    return {};
  }
};

const getPackageProjectRunResult = async (
  projectBody,
  buildingId,
  ratesBody = {}
) => {
  try {
    let result = {};
    const building = await Building.findById(buildingId);
    let rates = ratesBody;
    if (Object.keys(rates).length === 0 && rates.constructor === Object)
      rates = building.rates;
    if (building) {
      projectBody.initialValues.locations = null;
      let projectFinance = {
        discount_rate: parseFloat(rates.discountRate) || 0,
        finance_rate: parseFloat(rates.financeRate) || 0,
        inflation_rate: parseFloat(rates.inflationRate) || 0,
        reinvestment_rate: parseFloat(rates.reinvestmentRate) || 0,
        investment_period: parseFloat(rates.investmentPeriod) || 0,
        project_cost: parseFloat(projectBody.initialValues.project_cost) || 0,
        maintenance_savings:
          parseFloat(projectBody.initialValues.maintenance_savings) || 0
      };
      const utilityObj = {};

      if (building.rates) {
        if (building.rates.electric) {
          utilityObj.electric = building.rates.electric;
        }
        if (building.rates.gas) {
          utilityObj.gas = building.rates.gas;
        }
        if (building.rates.steam) {
          utilityObj.steam = building.rates.steam;
        }
        if (building.rates.water) {
          utilityObj.water = building.rates.water;
        }
        if (building.rates.fuelOil2) {
          utilityObj.fuelOil2 = building.rates.fuelOil2;
        }
        if (building.rates.fuelOil4) {
          utilityObj.fuelOil4 = building.rates.fuelOil4;
        }
        if (building.rates.fuelOil56) {
          utilityObj.fuelOil56 = building.rates.fuelOil56;
        }
        if (building.rates.diesel) {
          utilityObj.diesel = building.rates.diesel;
        }
        if (building.rates.other) {
          utilityObj.other = building.rates.other;
        }
      }
      let request = {
        measure: JSON.parse(JSON.stringify(projectBody.initialValues)),
        incentive: JSON.parse(JSON.stringify(projectBody.incentive)),
        finance: projectFinance,
        utility: utilityObj
      };

      if (projectBody.type && projectBody.type.toLowerCase() === "portfolio") {
        const building_type = getBuildingUse(
          "buildee",
          "pm",
          building.buildingUse
        );
        request.finance = {
          project_cost: 15000.0,
          incentive: 0,
          annual_savings: 0,
          maintenance_savings: 0.0,
          discount_rate: 0.0,
          finance_rate: 0.0,
          inflation_rate: 1.0,
          reinvestment_rate: 0.0,
          investment_period: 10
        };
        request.incentive = {
          incentive_type: "unitIncentive",
          input_label: "things",
          unit_rate: 0.0,
          input: 0.0
        };
        request.utility = {
          electric:
            (building.rates &&
              building.rates.electric &&
              building.rates.electric) ||
            0.11,
          gas:
            (building.rates && building.rates.gas && building.rates.gas) || 1,
          rate_type: "blended-rate"
        };
        if (projectBody.name === "boilerTuneUpNY") {
          let square_footage =
            building.squareFeet ||
            projectBody.initialValues.square_footage ||
            0;
          let city =
            (building.locations && building.locations.city) ||
            projectBody.initialValues.city ||
            "nyc";
          let units = projectBody.initialValues.units || 1;
          let sum_total_of_maxOutputCapacity =
            projectBody.initialValues.sum_total_of_maxOutputCapacity || 0;
          let percentage_natural_gas =
            projectBody.initialValues.percentage_natural_gas || 0;
          let percentage_2_oil =
            projectBody.initialValues.percentage_2_oil || 0;
          let percentage_4_oil =
            projectBody.initialValues.percentage_4_oil || 0;

          const utilityIds = (building && building.utilityIds) || [];
          let utilities = await getUtilities(utilityIds);
          if (utilities && Object.keys(utilities).length > 0) {
            let tempUtilState = {};
            utilities.map(utility => {
              if (!tempUtilState[utility.utilType]) {
                tempUtilState[utility.utilType] = [];
              }
              tempUtilState[utility.utilType].push(utility);
            });
            utilities = tempUtilState;
            let utilityMetrics = await calculateUtilitySummaries(
              utilities,
              building
            );
            const { totalUtilUsages } = utilityMetrics;
            let natural_gas =
              (totalUtilUsages && totalUtilUsages["natural-gas"]) || 0;
            let fuelOil2 =
              (totalUtilUsages && totalUtilUsages["fuel-oil-2"]) || 0;
            let fuelOil4 =
              (totalUtilUsages && totalUtilUsages["fuel-oil-4"]) || 0;
            let total = natural_gas + fuelOil2 + fuelOil4;
            if (!total) {
              total = 1;
              natural_gas = 1;
            }
            percentage_natural_gas = +((natural_gas / total) * 100).toFixed(0);
            percentage_2_oil = +((fuelOil2 / total) * 100).toFixed(0);
            percentage_4_oil = +((fuelOil4 / total) * 100).toFixed(0);

            let buildingEquipment = await BuildingEquipment.find({
              building: building._id,
              isArchived: { $in: [null, false] }
            }).populate("libraryEquipment");
            buildingEquipment = buildingEquipment.filter(item => {
              let category =
                (item.libraryEquipment && item.libraryEquipment.category) || "";
              let application =
                (item.libraryEquipment && item.libraryEquipment.application) ||
                "";
              let technology =
                (item.libraryEquipment && item.libraryEquipment.technology) ||
                "";
              if (
                category == "HEATING" &&
                application == "BOILER" &&
                (technology == "STEAM_BOILER" ||
                  technology == "HOT_WATER_BOILER")
              )
                return true;
              return false;
            });
            let sum = 0;
            buildingEquipment.map(item => {
              let maxOutputCapacity =
                (item.libraryEquipment &&
                  item.libraryEquipment.fields &&
                  item.libraryEquipment.fields.maxOutputCapacity &&
                  item.libraryEquipment.fields.maxOutputCapacity.value) ||
                0;
              sum += maxOutputCapacity;
            });
            let length = buildingEquipment.length;
            let project_cost = 1600 * length;
            if (length == 0) {
              project_cost = 1600;
              sum = ((100788 / 1910) * building.squareFeet) / 1000;
            }
            sum_total_of_maxOutputCapacity = sum;
            units = length;
          }

          request.measure = {
            name: projectBody.name,
            building_type,
            baseline_efficiency: projectBody.initialValues.baseline_efficiency,
            load_factor: projectBody.initialValues.load_factor,
            square_footage,
            city,
            units,
            sum_total_of_maxOutputCapacity: +sum_total_of_maxOutputCapacity,
            percentage_natural_gas,
            percentage_2_oil,
            percentage_4_oil
          };
        } else {
          let endUse = (building && building.endUse) || {};
          if (
            Object.keys(endUse).length === 0 &&
            endUse.constructor === Object &&
            building
          ) {
            const utilityIds = (building && building.utilityIds) || [];
            let utilities = await getUtilities(utilityIds);
            if (utilities && Object.keys(utilities).length > 0) {
              let tempUtilState = {};
              utilities.map(utility => {
                if (!tempUtilState[utility.utilType]) {
                  tempUtilState[utility.utilType] = [];
                }
                tempUtilState[utility.utilType].push(utility);
              });
              utilities = tempUtilState;
              let utilityMetrics = await calculateUtilitySummaries(
                utilities,
                building
              );
              if (
                utilityMetrics.totalUtilUsages &&
                utilityMetrics.totalUtilUsages.electric >= 0 &&
                utilityMetrics.totalUtilUsages["natural-gas"] >= 0 &&
                building._id
              ) {
                const endUtilRequest = {
                  occupancy: building.buildingUse || "office",
                  size: building.squareFeet || 30000,
                  zipcode: building.location.zipCode || "47918",
                  open24: building.open247 || "no",
                  stories: building.floorCount || "2",
                  vintage: building.buildYear || "2001",
                  wwr: 0.3,
                  electric: utilityMetrics.totalUtilUsages.electric,
                  gas: utilityMetrics.totalUtilUsages["natural-gas"] || 0,
                  "total-cost": utilityMetrics.totalCost || 0
                };
                const asyncFuc = utils.promisify(analysisClient.getEndUseUtil);
                try {
                  endUse = await asyncFuc(endUtilRequest);
                } catch (error) {
                  endUse = {};
                }
              } else {
                const endRequest = {
                  occupancy: building.buildingUse || "office",
                  size: building.squareFeet || 30000,
                  zipcode:
                    (building.location && building.location.zipCode) || "47918",
                  open24: building.open247 || "no",
                  stories: building.floorCount || "2",
                  vintage: building.buildYear || "2001",
                  wwr: 0.3
                };
                const asyncFuc = utils.promisify(analysisClient.getEndUse);
                try {
                  endUse = await asyncFuc(endRequest);
                } catch (error) {
                  endUse = {};
                }
              }
            } else {
              const endRequest = {
                occupancy: building.buildingUse || "office",
                size: building.squareFeet || 30000,
                zipcode:
                  (building.location && building.location.zipCode) || "47918",
                open24: building.open247 || "no",
                stories: building.floorCount || "2",
                vintage: building.buildYear || "2001",
                wwr: 0.3
              };
              const asyncFuc = utils.promisify(analysisClient.getEndUse);
              try {
                endUse = await asyncFuc(endRequest);
              } catch (error) {
                endUse = {};
              }
            }
          }
          if (
            endUse &&
            endUse["lighting-energy-estimate"] &&
            endUse["lighting-energy-estimate"].estimated_consumption
          ) {
            let lighting =
              endUse["lighting-energy-estimate"].estimated_consumption;
            request.measure = {
              building_type: building_type,
              square_footage:
                building.squareFeet ||
                projectBody.initialValues.square_footage ||
                0,
              baseline_eub_lighting: lighting,
              name: projectBody.name
            };
          } else {
            return {};
          }
        }
      } else {
        delete request.measure.displayName;
        delete request.measure.description;
        delete request.incentive.design_requirements;
        delete request.incentive.existing_requirements;
        request.measure.name = projectBody.name;
      }
      const asyncFuc = utils.promisify(analysisClient.runPrescriptiveMeasure);
      result = await asyncFuc(request);
    }
    return result;
  } catch (err) {
    console.log("err", err);
    return {};
  }
};

const buildingAttributes = [
  "_id",
  "archived",
  "buildingimage",
  "buildingname",
  "buildinguse",
  "buildyear",
  "clientname",
  "created",
  "createdbyuserid",
  "energystar",
  "floorcount",
  "belowgradefloorcount",
  "location_address",
  "location_city",
  "location_state",
  "location_zipcode",
  "nycfields_bin",
  "nycfields_borough",
  // "nycfields_energy_sys_multiple_lots",
  // "nycfields_energy_sys_single_lotst",
  "nycfields_historicbuilding",
  "nycfields_multitenant",
  "nycfields_percentleased",
  "nycfields_percentowned",
  "nycfields_taxlot",
  "nycfields_block",
  "open247",
  "rates_diesel",
  "rates_dieselghg",
  "rates_discountrate",
  "rates_electric",
  "rates_electricghg",
  "rates_financerate",
  "rates_fuel",
  "rates_fueloil2",
  "rates_fueloil2ghg",
  "rates_fueloil4",
  "rates_fueloil4ghg",
  "rates_fueloil56",
  "rates_fueloil56ghg",
  "rates_gas",
  "rates_gasghg",
  "rates_inflationrate",
  "rates_other",
  "rates_reinvestmentrate",
  "rates_steam",
  "rates_steamghg",
  "rates_water",
  "sitename",
  "squarefeet",
  "updated"
];

const monthlyUtilityAttributes = [
  "year",
  "annual_energy_use",
  "energy_use_intensity",
  "annual_energy_cost",
  "energy_cost_intensity",
  "annual_ghg_emissions",
  "ghg_intensity",
  "annual_electricity_use",
  "annual_electricity_cost",
  "annual_electricity_demand_use",
  "annual_electricity_demand_cost",
  "annual_natural_gas_use",
  "annual_natural_gas_cost",
  "annual_water_use",
  "annual_water_cost",
  "water_use_intensity",
  "annual_fuel_oil2_use",
  "annual_fuel_oil2_cost",
  "annual_fuel_oil4_use",
  "annual_fuel_oil4_cost",
  "annual_fuel_oil56_use",
  "annual_fuel_oil56_cost",
  "annual_steam_use",
  "annual_steam_cost",
  "annual_diesel_use",
  "annual_diesel_cost",
  "year_type"
];

const projectAttributes = [
  "_id",
  "building_id",
  "created",
  "createdbyuserid",
  "updated",
  "displayname",
  // "incentive_rebate_code",
  "metric_annualsavings",
  "metric_electricsavings",
  "metric_energysavings",
  "metric_gassavings",
  "metric_ghgsavingscost",
  "metric_ghgsavings",
  "metric_projectcost",
  "metric_incentive",
  "initialvalues_maintenance_savings",
  "metric_simple_payback",
  "project_application",
  "project_category",
  "project_technology",
  "metric_demandsavings",
  "status",
  "type",
  "project_name",
  "metric_eul"
];

const projectPackageAttributes = [
  "_id",
  "buildingid",
  "organization_id",
  "status",
  "constructionstatus",
  "name",
  "description",
  "estimatedstartdate",
  "estimatedcompletiondate",
  "actualstartdate",
  "actualcompletiondate",
  "created",
  "updated",
  "createdbyuserid",
  "total_projectcost",
  "total_incentive",
  "total_annualsavings",
  "total_electric",
  "total_gassavings",
  "total_ghgsavings",
  "total_ghgsavingscost",
  "total_watersavings",
  "total_simplepayback",
  "total_npv",
  "total_sir",
  "total_roi",
  "total_energysavings",
  "total_calculationtype",
  "total_eul",
  "total_demandsavings",
  "total_maintenancesavings"
];

module.exports = {
  chunkArray,
  calculateUtilitySummaries,
  getUtilities,
  getScenarioProjectRunResult,
  getPackageProjectRunResult,
  buildingAttributes,
  monthlyUtilityAttributes,
  projectAttributes,
  projectPackageAttributes
};
