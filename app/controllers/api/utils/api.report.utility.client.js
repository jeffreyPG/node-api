const mongoose = require("mongoose");
const moment = require("moment");
const Utility = mongoose.model("Utility");
const MonthlyUtility = mongoose.model("MonthlyUtility");
const util = require("./api.utils");
const { calculateAverageRate } = require("./api.building.util");
const { Weather } = require("../../../models/weather.script.model");
const { Building } = require("../../../models/building.server.model");

/*
 * Find utilities only within a certain date
 */
const _applyUtilityDates = (fullUtilities, start, end) => {
  const utilInfo = {
    finalUtilities: fullUtilities,
    datedUtils: false
  };

  // make sure both start and end dates exist
  if (start && end) {
    fullUtilities.forEach(utility => {
      const newMeterData = [];
      if (utility.meterData) {
        utility.meterData.forEach(meter => {
          const meterStartDate = new Date(meter.startDate);
          const meterEndDate = new Date(meter.endDate);
          const median = new Date(
            (meterStartDate.getTime() + meterEndDate.getTime()) / 2
          );
          if (median > start && median < end) {
            newMeterData.push(meter);
          }
        });
      }
      utility.meterData = newMeterData;
      const newDeliveryData = [];
      if (utility.deliveryData) {
        utility.deliveryData.forEach(delivery => {
          const deliveryDate = new Date(delivery.deliveryDate);
          if (deliveryDate >= start && deliveryDate <= end) {
            newDeliveryData.push(delivery);
          }
        });
      }
      utility.deliveryData = newDeliveryData;
    });
    utilInfo.finalUtilities = fullUtilities;
    utilInfo.datedUtils = true;
  }
  return utilInfo;
};

/*
 * Group Utilities by month
 */
const _getMedianUtilityDates = utilities => {
  const allMeters = {};

  utilities.forEach(utility => {
    if (!allMeters[utility.utilType]) {
      allMeters[utility.utilType] = [];
    }
    if (utility.meterData) {
      utility.meterData.forEach(meter => {
        if (meter.startDate && meter.endDate) {
          const startDate = new Date(meter.startDate);
          const endDate = new Date(meter.endDate);
          const medianDate = new Date(
            (startDate.getTime() + endDate.getTime()) / 2
          );
          meter.month = medianDate.getMonth() + 1;
          meter.year = medianDate.getFullYear();
          delete meter._id;
          delete meter.estimation;
          delete meter.created;
          allMeters[utility.utilType].push(meter);
        }
      });
    } else if (utility.deliveryData) {
      utility.deliveryData.forEach(delivery => {
        if (delivery.startDate && delivery.endDate) {
          delivery.month = delivery.deliveryDate.getMonth() + 1;
          delivery.year = delivery.deliveryDate.getFullYear();
          delete delivery._id;
          delete delivery.estimation;
          delete delivery.created;
          allMeters[utility.utilType].push(delivery);
        }
      });
    }
  });
  return allMeters;
};

const _resolveDuplicateMonths = meters => {
  const uniqueMeters = {};

  let lastMonth = "";
  let lastYear = "";
  const monthMap = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December"
  ];

  Object.keys(meters).forEach(type => {
    if (!uniqueMeters[type]) {
      uniqueMeters[type] = [];
    }
    meters[type].map(meter => {
      const medianDateMonth = meter.month;
      const medianDateYear = meter.year;

      if (medianDateMonth === lastMonth && medianDateYear === lastYear) {
        const lastMeter = uniqueMeters[type][uniqueMeters[type].length - 1];
        if (lastMeter) {
          lastMeter.totalUsage =
            (lastMeter.totalUsage + (meter.totalUsage || meter.delivery)) / 2;
          lastMeter.totalCost = (lastMeter.totalCost + meter.totalCost) / 2;
          lastMeter.demand = (lastMeter.demand + meter.demand) / 2;
          lastMeter.demandCost = (lastMeter.demandCost + meter.demandCost) / 2;
        }
      } else {
        lastMonth = medianDateMonth;
        lastYear = medianDateYear;
        meter.name = monthMap[meter.month - 1] + " " + meter.year;
        uniqueMeters[type].push(meter);
      }
    });
  });

  return uniqueMeters;
};

const calculateHDDAndCDD = async (zipcode, startDate, uniqueMeters) => {
  let Hdd = 0,
    Cdd = 0;
  let weatherData = await Weather.find({
    location: zipcode,
    year: startDate
  }).lean();
  let months = [];
  let data = [];
  for (let key in uniqueMeters) {
    data = [...uniqueMeters[key]];
  }
  const monthMap = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December"
  ];

  data.forEach(item => {
    let flag = months.indexOf(monthMap[item.month - 1]);
    if (flag === -1) months.push(monthMap[item.month - 1]);
  });

  weatherData = weatherData.filter(item => months.indexOf(item.month) !== -1);
  weatherData.forEach(item => {
    Hdd += item.hdd;
    Cdd += item.cdd;
  });
  return { Hdd, Cdd };
};
/*
 * Get utility data for a buildingπ
 */
exports.getUtilities = async function(
  building,
  startDate,
  endDate,
  customStartDate,
  customEndDate
) {
  if (!building.utilityIds) return {};
  let buildingRates = await calculateAverageRate(
    building._id,
    startDate,
    endDate
  );

  const utilitiesObject = {
    datedUtils: false,
    summary: {},
    rates: {},
    estimatedEndUseBreakdown: {
      lighting: {},
      heating: {},
      cooling: {},
      ventilation: {},
      waterHeating: {},
      other: {}
    },
    ghgEmissions: {},
    electricity: {},
    naturalGas: {},
    water: {},
    steam: {},
    fuelOil2: {},
    fuelOil4: {},
    fuelOil56: {},
    diesel: {},
    otherFuel: {},
    monthlyData: [],
    degree: {},
    portfolioManager: {}
  };
  const noOfMonths = endDate.diff(startDate, "months") + 1;
  const noOfYears = noOfMonths / 12;
  const query = { _id: { $in: building.utilityIds } };

  const fullUtilities = await Utility.find(query)
    .lean(true)
    .exec();

  const buildingId = building && building._id;

  const monthlyUtilities =
    (buildingId &&
      (await MonthlyUtility.find({ building: buildingId }).exec())) ||
    [];

  const utilInfo = _applyUtilityDates(fullUtilities, startDate, endDate);
  const monthlyData = _getMedianUtilityDates(utilInfo.finalUtilities);
  const uniqueMeters = _resolveDuplicateMonths(monthlyData);
  let totalUsageCostWithoutDemand = 0;
  let totalUsageWithoutWater = 0;
  const utilities = utilInfo.finalUtilities;
  utilitiesObject.datedUtils = utilInfo.datedUtils;
  utilitiesObject.monthlyData = uniqueMeters;

  const filteredMonthlyUtilities = monthlyUtilities.filter(utility => {
    const date = moment(utility.date);
    return (
      date.isSameOrAfter(moment(startDate)) && date.isSameOrBefore(endDate)
    );
  });

  filteredMonthlyUtilities.forEach(utility => {
    totalUsageWithoutWater += utility.totalEnergy?.value || 0;
    totalUsageCostWithoutDemand +=
      utility.totalCost || 0 - utility?.electric?.demandCost || 0;
  });

  const utilityTypeField = utilityType => {
    switch (utilityType) {
      case "natural-gas":
        return "naturalgas";
      case "fuel-oil-2":
        return "fueloil2";
      case "fuel-oil-4":
        return "fueloil4";
      case "fuel-oil-5-6":
        return "fueloil56";
      default:
        return utilityType;
    }
  };

  const _getMeterTotals = (utilType, targetField) => {
    let value = 0;
    const utilityType = utilityTypeField(utilType);
    filteredMonthlyUtilities.forEach(util => {
      const itemValue = util?.[utilityType]?.[targetField] || 0;
      value += itemValue;
    });
    return value;
  };

  const _getMonthCount = (utilType, targetField) => {
    let count = 0;
    const utilityType = utilityTypeField(utilType);
    filteredMonthlyUtilities.forEach(util => {
      const itemValue = util?.[utilityType]?.[targetField] || 0;
      if (itemValue) count++;
    });
    return count > 0 ? count : 1;
  };

  const _getMaxMeterValue = (utilType, targetField) => {
    let value = -1;
    const utilityType = utilityTypeField(utilType);
    filteredMonthlyUtilities.forEach(util => {
      const itemValue = util?.[utilityType]?.[targetField] || 0;
      if (value < itemValue) value = itemValue;
    });
    return value;
  };

  // todo need to update fuel days

  const _getFuelDays = (utilType, key) => {
    let days = 0;
    const utilityType = utilityTypeField(utilType);
    const target = "totalUsage";
    filteredMonthlyUtilities.forEach(util => {
      const itemValue = util?.[utilityType]?.[target] || 0;
      if (itemValue > 0) {
        days += util?.daysInPeriod || 0;
      }
    });
    return days;
  };

  const _getDeliveryTotals = (utilType, targetField) => {
    let value = 0;
    const utilityType = utilityTypeField(utilType);
    const target = targetField === "quantity" ? "totalUsage" : targetField;
    filteredMonthlyUtilities.forEach(util => {
      const itemValue = util?.[utilityType]?.[target] || 0;
      value += itemValue;
    });
    return value;
  };

  const _totalUtilityCosts = () => {
    let cost = 0;
    filteredMonthlyUtilities.forEach(util => {
      const itemValue = util?.totalCost || 0;
      cost += itemValue;
    });
    return cost;
  };

  const calculatePortfolioManager = async (id, startDate) => {
    let building = await Building.findById(id);
    let pmScore = 0;
    if (building) {
      let pmScores = (building.benchmark && building.benchmark.pmScores) || [];
      pmScores = pmScores.filter(item => item.year === startDate);
      pmScore = pmScores.reduce((total, item) => {
        return total + item.score;
      }, 0);
      if (pmScores.length) pmScore = pmScore / pmScores.length;
    }
    return pmScore;
  };

  const totalElectricityUsage =
    _getMeterTotals("electric", "totalUsage") / noOfYears;
  const totalNaturalGasUsage =
    _getMeterTotals("natural-gas", "totalUsage") / noOfYears;
  const totalWaterUsage = _getMeterTotals("water", "totalUsage") / noOfYears;
  const totalSteamUsage = _getMeterTotals("steam", "totalUsage") / noOfYears;
  const totalFuelOil2Delivery =
    _getDeliveryTotals("fuel-oil-2", "quantity") / noOfYears;
  const totalFuelOil4Delivery =
    _getDeliveryTotals("fuel-oil-4", "quantity") / noOfYears;
  const totalFuelOil56Delivery =
    _getDeliveryTotals("fuel-oil-5-6", "quantity") / noOfYears;
  const totalDieselDelivery =
    _getDeliveryTotals("diesel", "quantity") / noOfYears;
  const totalOtherUsage =
    _getMeterTotals("other", "totalUsage") / (noOfYears * 1000);
  const totalElectricityDemand =
    _getMeterTotals("electric", "demand") / noOfYears;
  const totalMonthlyElectricityDemand =
    (totalElectricityDemand * noOfYears) / _getMonthCount("electric", "demand");
  const totalElectricityDemandCost =
    _getMeterTotals("electric", "demandCost") / noOfYears;
  const maxElectricityDemand = _getMaxMeterValue("electric", "demand");
  const totalElectricityCost =
    _getMeterTotals("electric", "totalCost") / noOfYears;
  const totalNaturalGasCost =
    _getMeterTotals("natural-gas", "totalCost") / noOfYears;
  const totalWaterCost = _getMeterTotals("water", "totalCost") / noOfYears;
  const totalSteamCost = _getMeterTotals("steam", "totalCost") / noOfYears;
  const totalFuelOil2Cost =
    _getDeliveryTotals("fuel-oil-2", "totalCost") / noOfYears;
  const totalFuelOil4Cost =
    _getDeliveryTotals("fuel-oil-4", "totalCost") / noOfYears;
  const totalFuelOil56Cost =
    _getDeliveryTotals("fuel-oil-5-6", "totalCost") / noOfYears;
  const totalDieselCost = _getDeliveryTotals("diesel", "totalCost") / noOfYears;
  const totalOtherCost = _getMeterTotals("other", "totalCost") / noOfYears;

  const totalElectricityDays =
    _getFuelDays("electric", "meterData") / noOfYears;
  const totalNaturalGasDays =
    _getFuelDays("natural-gas", "meterData") / noOfYears;
  const totalWaterDays = _getFuelDays("water", "meterData") / noOfYears;
  const totalSteamDays = _getFuelDays("steam", "meterData") / noOfYears;
  const totalFuelOil2Days =
    _getFuelDays("fuel-oil-2", "deliveryData") / noOfYears;
  const totalFuelOil4Days =
    _getFuelDays("fuel-oil-4", "deliveryData") / noOfYears;
  const totalFuelOil56Days =
    _getFuelDays("fuel-oil-5-6", "deliveryData") / noOfYears;
  const totalDieselDays = _getFuelDays("diesel", "deliveryData") / noOfYears;
  const totalOtherDays = _getFuelDays("other", "meterData") / noOfYears;

  //Converting to kBtu and calculating the total energy use
  const totalEnergyUse = filteredMonthlyUtilities.reduce((total, curr) => {
    return total + (curr?.totalEnergy?.value || 0);
  }, 0);
  const totalElectricityUsageText = util.formatNumberWithUnits(
    util.formatNumbersWithCommas(totalElectricityUsage),
    "kWh"
  );
  const totalNaturalGasUsageText = util.formatNumberWithUnits(
    util.formatNumbersWithCommas(totalNaturalGasUsage),
    "therms"
  );
  const totalWaterUsageText = util.formatNumberWithUnits(
    util.formatNumbersWithCommas(totalWaterUsage),
    "ccf"
  );
  const totalSteamUsageText = util.formatNumberWithUnits(
    util.formatNumbersWithCommas(totalSteamUsage),
    "Mlb"
  );
  const totalFuelOil2DeliveryText = util.formatNumberWithUnits(
    util.formatNumbersWithCommas(totalFuelOil2Delivery),
    "gallons"
  );
  const totalFuelOil4DeliveryText = util.formatNumberWithUnits(
    util.formatNumbersWithCommas(totalFuelOil4Delivery),
    "gallons"
  );
  const totalFuelOil56DeliveryText = util.formatNumberWithUnits(
    util.formatNumbersWithCommas(totalFuelOil56Delivery),
    "gallons"
  );
  const totalDieselDeliveryText = util.formatNumberWithUnits(
    util.formatNumbersWithCommas(totalDieselDelivery),
    "gallons"
  );
  const totalOtherUsageText = util.formatNumberWithUnits(
    util.formatNumbersWithCommas(totalOtherUsage),
    "Kbtu"
  );

  const electricGHGFactor =
    building.rates && building.rates.electricGHG
      ? building.rates.electricGHG
      : 0.000744;
  const gasGHGFactor =
    building.rates && building.rates.gasGHG ? building.rates.gasGHG : 0.0053;
  const steamGHGFactor =
    building.rates && building.rates.steamGHG ? building.rates.steamGHG : 0;
  const fuelOil2GHGFactor =
    building.rates && building.rates.fuelOil2GHG
      ? building.rates.fuelOil2GHG
      : 0.01021;
  const fuelOil4GHGFactor =
    building.rates && building.rates.fuelOil4GHG
      ? building.rates.fuelOil4GHG
      : 0.01096;
  const fuelOil56GHGFactor =
    building.rates && building.rates.fuelOil56GHG
      ? building.rates.fuelOil56GHG
      : 0.01021;
  const dieselGHGFactor =
    building.rates && building.rates.dieselGHG
      ? building.rates.dieselGHG
      : 0.01021;

  const electricityEmissions = totalElectricityUsage * electricGHGFactor;
  const naturalGasEmissions = totalNaturalGasUsage * gasGHGFactor;
  const steamEmissions = totalSteamUsage * steamGHGFactor;
  const fuelOil2Emissions = totalFuelOil2Delivery * fuelOil2GHGFactor;
  const fuelOil4Emissions = totalFuelOil4Delivery * fuelOil4GHGFactor;
  const fuelOil56Emissions = totalFuelOil56Delivery * fuelOil56GHGFactor;
  const dieselEmissions = totalDieselDelivery * dieselGHGFactor;

  const totalEmissions =
    electricityEmissions +
    naturalGasEmissions +
    steamEmissions +
    fuelOil2Emissions +
    fuelOil4Emissions +
    fuelOil56Emissions +
    dieselEmissions;

  // get summary numbers
  utilitiesObject.summary.totalCost = util.formatNumberWithUnits(
    util.formatNumbersWithCommas(Math.round(_totalUtilityCosts() / noOfYears)),
    "",
    true
  );
  utilitiesObject.summary.totalCostPerSquareFoot = util.formatNumberWithUnits(
    util.formatNumbersWithCommas(
      ((_totalUtilityCosts() / building.squareFeet) * 100) / (noOfYears * 100)
    ),
    "/sf",
    true
  );
  utilitiesObject.summary.totalEnergyUse = util.formatNumberWithUnits(
    util.formatNumbersWithCommas(totalEnergyUse.toFixed(2)),
    "kBtu"
  );
  utilitiesObject.summary.siteEui = util.formatNumberWithUnits(
    util.formatNumbersWithCommas(
      (totalEnergyUse / building.squareFeet).toFixed(2)
    ),
    "kBtu/ft²"
  );
  utilitiesObject.summary.waterWui = util.formatNumberWithUnits(
    util.formatNumbersWithCommas(
      (totalWaterUsage / building.squareFeet).toFixed(2)
    ),
    "ccf/ft²"
  );
  utilitiesObject.summary.totalElectricity = totalElectricityUsageText;
  utilitiesObject.summary.totalGas = totalNaturalGasUsageText;
  utilitiesObject.summary.totalWater = totalWaterUsageText;
  utilitiesObject.summary.totalWaterUse = totalWaterUsageText;
  utilitiesObject.summary.totalSteam = totalSteamUsageText;
  utilitiesObject.summary.totalFuelOil2 = totalFuelOil2DeliveryText;
  utilitiesObject.summary.totalFuelOil4 = totalFuelOil4DeliveryText;
  utilitiesObject.summary.totalFuelOil56 = totalFuelOil56DeliveryText;
  utilitiesObject.summary.totalDiesel = totalDieselDeliveryText;
  utilitiesObject.summary["CBECs Median EUI - All Sources (kBtu/SqFt)"] =
    building &&
    building.endUse &&
    util.formatNumbersWithCommas(
      building.endUse["CBECs Median EUI - All Sources (kBtu/SqFt)"] || 0
    );
  utilitiesObject.summary[
    "cbecsMedianEUIAllSources"
  ] = util.formatNumberWithUnits(
    utilitiesObject.summary["CBECs Median EUI - All Sources (kBtu/SqFt)"],
    "kBtu/ft²"
  );
  utilitiesObject.summary["CBECs Median Natural Gas EUI (Therms/SqFt)"] =
    building &&
    building.endUse &&
    util.formatNumbersWithCommas(
      building.endUse["CBECs Median Natural Gas EUI (Therms/SqFt)"] || 0
    );
  utilitiesObject.summary[
    "cbecsMedianNaturalGasEUI"
  ] = util.formatNumberWithUnits(
    utilitiesObject.summary["CBECs Median Natural Gas EUI (Therms/SqFt)"],
    "therms/ft²"
  );
  utilitiesObject.summary["CBECs Median Electricity EUI (kWh/SqFt)"] =
    building &&
    building.endUse &&
    util.formatNumbersWithCommas(
      building.endUse["CBECs Median Electricity EUI (kWh/SqFt)"] || 0
    );
  utilitiesObject.summary[
    "cbecsMedianElectricityEUI"
  ] = util.formatNumberWithUnits(
    utilitiesObject.summary["CBECs Median Electricity EUI (kWh/SqFt)"],
    "kWh/ft²"
  );
  // get rates
  utilitiesObject.rates.electricity = util.formatNumberWithUnits(
    buildingRates.electric,
    "/kWh",
    true
  );
  utilitiesObject.rates.gas = util.formatNumberWithUnits(
    buildingRates.gas,
    "/therm",
    true
  );
  utilitiesObject.rates.water = util.formatNumberWithUnits(
    buildingRates.water,
    "/ccf",
    true
  );
  utilitiesObject.rates.steam = util.formatNumberWithUnits(
    buildingRates.steam,
    "/Mlb",
    true
  );
  utilitiesObject.rates.fuelOil2 = util.formatNumberWithUnits(
    buildingRates.fuelOil2,
    "/gal",
    true
  );
  utilitiesObject.rates.fuelOil4 = util.formatNumberWithUnits(
    buildingRates.fuelOil4,
    "/gal",
    true
  );
  utilitiesObject.rates.fuelOil56 = util.formatNumberWithUnits(
    buildingRates.fuelOil56,
    "/gal",
    true
  );
  utilitiesObject.rates.diesel = util.formatNumberWithUnits(
    buildingRates.diesel,
    "/kWh",
    true
  );
  utilitiesObject.rates.other = util.formatNumberWithUnits(
    buildingRates.other,
    "/kWh",
    true
  );
  /*
  // get estimated end use breakdown numbers
  if (
    Object.keys(building.endUse).length !== 0 ||
    building.endUse.constructor !== Object
  ) {
    utilitiesObject.estimatedEndUseBreakdown.lighting.percentage =
      building.endUse["lighting-energy-estimate"].percentage.toFixed(0) + "%";
    utilitiesObject.estimatedEndUseBreakdown.lighting.energyUse =
      util.formatNumbersWithCommas(
        building.endUse[
          "lighting-energy-estimate"
        ].estimated_consumption.toFixed(2)
      ) + "kBtu";

    utilitiesObject.estimatedEndUseBreakdown.heating.percentage =
      building.endUse["heating-energy-estimate"].percentage.toFixed(0) + "%";
    utilitiesObject.estimatedEndUseBreakdown.heating.energyUse =
      util.formatNumbersWithCommas(
        building.endUse[
          "heating-energy-estimate"
        ].estimated_consumption.toFixed(2)
      ) + "kBtu";

    utilitiesObject.estimatedEndUseBreakdown.cooling.percentage =
      building.endUse["cooling-energy-estimate"].percentage.toFixed(0) + "%";
    utilitiesObject.estimatedEndUseBreakdown.cooling.energyUse =
      util.formatNumbersWithCommas(
        building.endUse[
          "cooling-energy-estimate"
        ].estimated_consumption.toFixed(2)
      ) + "kBtu";

    utilitiesObject.estimatedEndUseBreakdown.ventilation.percentage =
      building.endUse["ventilation-estimate"].percentage.toFixed(0) + "%";
    utilitiesObject.estimatedEndUseBreakdown.ventilation.energyUse =
      util.formatNumbersWithCommas(
        building.endUse["ventilation-estimate"].estimated_consumption.toFixed(2)
      ) + "kBtu";

    utilitiesObject.estimatedEndUseBreakdown.waterHeating.percentage =
      building.endUse["dhw-energy-estimate"].percentage.toFixed(0) + "%";
    utilitiesObject.estimatedEndUseBreakdown.waterHeating.energyUse =
      util.formatNumbersWithCommas(
        building.endUse["dhw-energy-estimate"].estimated_consumption.toFixed(2)
      ) + "kBtu";

    const buildingEndUseOtherEstimate = building.endUse["other-estimate"] || building.endUse["other-energy-estimate"];
    utilitiesObject.estimatedEndUseBreakdown.other.percentage =
      buildingEndUseOtherEstimate.percentage.toFixed(0) + "%";
    utilitiesObject.estimatedEndUseBreakdown.other.energyUse =
      util.formatNumbersWithCommas(
        buildingEndUseOtherEstimate.estimated_consumption.toFixed(2)
      ) + "kBtu";
  }
*/
  // get GHG emissions meters
  utilitiesObject.ghgEmissions.totalEmissions = util.formatNumberWithUnits(
    util.formatNumbersWithCommas(totalEmissions.toFixed(1)),
    "Metric tons of CO2e"
  );
  utilitiesObject.ghgEmissions.ghgIntensity = util.formatNumberWithUnits(
    util.formatNumbersWithCommas(
      ((totalEmissions * 1000) / building.squareFeet).toFixed(1)
    ),
    "kgCO2e/ft²"
  );
  utilitiesObject.ghgEmissions.vehiclesDriven = util.formatNumberWithUnits(
    util.formatNumbersWithCommas((totalEmissions / 4.67).toFixed(1)),
    "vehicles driven in a year"
  );
  utilitiesObject.ghgEmissions.oilBarrelsConsumed = util.formatNumberWithUnits(
    util.formatNumbersWithCommas((totalEmissions / 0.43).toFixed(1)),
    "barrels of oil consumed"
  );
  utilitiesObject.ghgEmissions.coalRailcarsBurned = util.formatNumberWithUnits(
    util.formatNumbersWithCommas((totalEmissions / 183.22).toFixed(1)),
    "railcars of coal burned"
  );

  // get electricity meters
  utilitiesObject.electricity.totalUsage = totalElectricityUsageText;
  utilitiesObject.electricity.totalUsagePercent = util.formatNumberWithUnits(
    Math.round((totalElectricityUsage / totalUsageWithoutWater) * 100),
    "%"
  );
  utilitiesObject.electricity.totalUsageCost = util.formatNumberWithUnits(
    util.formatNumbersWithCommas(totalElectricityCost),
    "",
    true
  );
  utilitiesObject.electricity.totalUsageCostPercent = util.formatNumberWithUnits(
    Math.round((totalElectricityCost / totalUsageCostWithoutDemand) * 100),
    "%"
  );
  utilitiesObject.electricity.totalDemand = util.formatNumberWithUnits(
    util.formatNumbersWithCommas(totalElectricityDemand),
    "kW"
  );
  utilitiesObject.electricity.totalDemandMonthly = util.formatNumberWithUnits(
    util.formatNumbersWithCommas(totalMonthlyElectricityDemand),
    "kW"
  );
  utilitiesObject.electricity.totalDemandCost = util.formatNumberWithUnits(
    util.formatNumbersWithCommas(totalElectricityDemandCost),
    "",
    true
  );
  utilitiesObject.electricity.totalCost = util.formatNumberWithUnits(
    util.formatNumbersWithCommas(
      totalElectricityDemandCost + totalElectricityCost
    ),
    "",
    true
  );
  utilitiesObject.electricity.costPerSquareFoot = util.formatNumberWithUnits(
    util.formatNumbersWithCommas(
      (totalElectricityDemandCost + totalElectricityCost) / building.squareFeet
    ),
    "",
    true
  );
  utilitiesObject.electricity.ghgEmissions = util.formatNumberWithUnits(
    util.formatNumbersWithCommas(electricityEmissions.toFixed(1)),
    "Metric tons of CO2e"
  );
  utilitiesObject.electricity.electricityEui = util.formatNumberWithUnits(
    util.formatNumbersWithCommas(
      (totalElectricityUsage / building.squareFeet).toFixed(1)
    ),
    "kWh/ft²"
  );
  utilitiesObject.electricity.maximumDemandValue = util.formatNumberWithUnits(
    util.formatNumbersWithCommas(maxElectricityDemand),
    "kW"
  );
  utilitiesObject.electricity.daysInPeriod = totalElectricityDays;
  utilitiesObject.electricity.avgDaily = totalElectricityDays
    ? util.formatNumberWithUnits(
        util.formatNumbersWithCommas(
          totalElectricityUsage / totalElectricityDays
        ),
        "kWh"
      )
    : 0;

  // get natural gas meters
  utilitiesObject.naturalGas.totalUsage = totalNaturalGasUsageText;
  utilitiesObject.naturalGas.totalUsagePercent = util.formatNumberWithUnits(
    Math.round((totalNaturalGasUsage / totalUsageWithoutWater) * 100),
    "%"
  );
  utilitiesObject.naturalGas.totalUsageCost = util.formatNumberWithUnits(
    util.formatNumbersWithCommas(totalNaturalGasCost),
    "",
    true
  );
  utilitiesObject.naturalGas.totalCost = util.formatNumberWithUnits(
    util.formatNumbersWithCommas(totalNaturalGasCost),
    "",
    true
  );
  utilitiesObject.naturalGas.totalUsageCostPercent = util.formatNumberWithUnits(
    Math.round((totalNaturalGasCost / totalUsageCostWithoutDemand) * 100),
    "%"
  );
  utilitiesObject.naturalGas.costPerSquareFoot =
    "$" +
    util.formatNumbersWithCommas(totalNaturalGasCost / building.squareFeet);
  utilitiesObject.naturalGas.ghgEmissions = util.formatNumberWithUnits(
    util.formatNumbersWithCommas(naturalGasEmissions.toFixed(1)),
    "Metric tons of CO2e"
  );
  utilitiesObject.naturalGas.naturalGasEui = util.formatNumberWithUnits(
    util.formatNumbersWithCommas(
      (totalNaturalGasUsage / building.squareFeet).toFixed(1)
    ),
    "therms/ft²"
  );
  utilitiesObject.naturalGas.daysInPeriod = totalNaturalGasDays;
  utilitiesObject.naturalGas.avgDaily = totalNaturalGasDays
    ? util.formatNumberWithUnits(
        util.formatNumbersWithCommas(
          totalNaturalGasUsage / totalNaturalGasDays
        ),
        "therms"
      )
    : 0;

  // get water meters
  utilitiesObject.water.totalUsage = totalWaterUsageText;
  utilitiesObject.water.totalUsageCost = util.formatNumberWithUnits(
    util.formatNumbersWithCommas(totalWaterCost),
    "",
    true
  );
  utilitiesObject.water.totalCost = util.formatNumberWithUnits(
    util.formatNumbersWithCommas(totalWaterCost),
    "",
    true
  );
  utilitiesObject.water.totalUsageCostPercent = util.formatNumberWithUnits(
    Math.round((totalWaterCost / totalUsageCostWithoutDemand) * 100),
    "%"
  );
  utilitiesObject.water.costPerSquareFoot = util.formatNumberWithUnits(
    util.formatNumbersWithCommas(totalWaterCost / building.squareFeet),
    "",
    true
  );
  utilitiesObject.water.waterWUI = util.formatNumberWithUnits(
    util.formatNumbersWithCommas(
      (totalWaterUsage / building.squareFeet).toFixed(1)
    ),
    "ccf/ft²"
  );
  utilitiesObject.water.daysInPeriod = totalWaterDays;
  utilitiesObject.water.avgDaily = totalWaterDays
    ? util.formatNumberWithUnits(
        util.formatNumbersWithCommas(totalWaterUsage / totalWaterDays),
        "ccf"
      )
    : 0;

  // get steam meters
  utilitiesObject.steam.totalUsage = totalSteamUsageText;
  utilitiesObject.steam.totalUsagePercent = util.formatNumberWithUnits(
    Math.round((totalSteamUsage / totalUsageWithoutWater) * 100),
    "%"
  );
  utilitiesObject.steam.totalUsageCost = util.formatNumberWithUnits(
    util.formatNumbersWithCommas(totalSteamCost),
    "",
    true
  );
  utilitiesObject.steam.totalCost = util.formatNumberWithUnits(
    util.formatNumbersWithCommas(totalSteamCost),
    "",
    true
  );
  utilitiesObject.steam.totalUsageCostPercent = util.formatNumberWithUnits(
    Math.round((totalSteamCost / totalUsageCostWithoutDemand) * 100),
    "%"
  );
  utilitiesObject.steam.costPerSquareFoot = util.formatNumberWithUnits(
    util.formatNumbersWithCommas(totalSteamCost / building.squareFeet),
    "",
    true
  );
  utilitiesObject.steam.ghgEmissions = util.formatNumberWithUnits(
    util.formatNumbersWithCommas(steamEmissions.toFixed(1)),
    "Metric tons of CO2e"
  );
  utilitiesObject.steam.waterWUI = util.formatNumberWithUnits(
    util.formatNumbersWithCommas(
      (totalNaturalGasUsage / building.squareFeet).toFixed(1)
    ),
    "Mlb/ft²"
  );
  utilitiesObject.steam.daysInPeriod = totalSteamDays;
  utilitiesObject.steam.avgDaily = totalSteamDays
    ? util.formatNumberWithUnits(
        util.formatNumbersWithCommas(totalSteamUsage / totalSteamDays),
        "cubic ft."
      )
    : 0;

  // get fuel oil 2 deliveries
  utilitiesObject.fuelOil2.totalUsage = totalFuelOil2DeliveryText;
  utilitiesObject.fuelOil2.totalUsagePercent = util.formatNumberWithUnits(
    Math.round((totalFuelOil2Delivery / totalUsageWithoutWater) * 100),
    "%"
  );
  utilitiesObject.fuelOil2.totalUsageCost = util.formatNumberWithUnits(
    util.formatNumbersWithCommas(totalFuelOil2Cost),
    "",
    true
  );
  utilitiesObject.fuelOil2.totalCost = util.formatNumberWithUnits(
    util.formatNumbersWithCommas(totalFuelOil2Cost),
    "",
    true
  );
  utilitiesObject.fuelOil2.totalUsageCostPercent = util.formatNumberWithUnits(
    Math.round((totalFuelOil2Cost / totalUsageCostWithoutDemand) * 100),
    "%"
  );
  utilitiesObject.fuelOil2.costPerSquareFoot = util.formatNumberWithUnits(
    util.formatNumbersWithCommas(totalFuelOil2Cost / building.squareFeet),
    "",
    true
  );
  utilitiesObject.fuelOil2.ghgEmissions = util.formatNumberWithUnits(
    util.formatNumbersWithCommas(fuelOil2Emissions.toFixed(1)),
    "Metric tons of CO2e"
  );
  utilitiesObject.fuelOil2.waterWUI = util.formatNumberWithUnits(
    util.formatNumbersWithCommas(
      (totalFuelOil2Delivery / building.squareFeet).toFixed(1)
    ),
    "gallons/ft²"
  );
  utilitiesObject.fuelOil2.daysInPeriod = totalFuelOil2Days;
  utilitiesObject.fuelOil2.avgDaily = totalFuelOil2Days
    ? util.formatNumberWithUnits(
        util.formatNumbersWithCommas(totalFuelOil2Delivery / totalFuelOil2Days),
        "gallons"
      )
    : 0;

  // get fuel oil 4 deliveries
  utilitiesObject.fuelOil4.totalUsage = totalFuelOil4DeliveryText;
  utilitiesObject.fuelOil4.totalUsagePercent = util.formatNumberWithUnits(
    Math.round((totalFuelOil4Delivery / totalUsageWithoutWater) * 100),
    "%"
  );
  utilitiesObject.fuelOil4.totalUsageCost = util.formatNumberWithUnits(
    util.formatNumbersWithCommas(totalFuelOil4Cost),
    "",
    true
  );
  utilitiesObject.fuelOil4.totalCost = util.formatNumberWithUnits(
    util.formatNumbersWithCommas(totalFuelOil4Cost),
    "",
    true
  );
  utilitiesObject.fuelOil4.totalUsageCostPercent = util.formatNumberWithUnits(
    Math.round((totalFuelOil4Cost / totalUsageCostWithoutDemand) * 100),
    "%"
  );
  utilitiesObject.fuelOil4.costPerSquareFoot = util.formatNumberWithUnits(
    util.formatNumbersWithCommas(totalFuelOil4Cost / building.squareFeet),
    "",
    true
  );
  utilitiesObject.fuelOil4.ghgEmissions = util.formatNumberWithUnits(
    util.formatNumbersWithCommas(fuelOil4Emissions.toFixed(1)),
    "Metric tons of CO2e"
  );
  utilitiesObject.fuelOil4.waterWUI = util.formatNumberWithUnits(
    util.formatNumbersWithCommas(
      (totalFuelOil4Delivery / building.squareFeet).toFixed(1)
    ),
    "gallons/ft²"
  );
  utilitiesObject.fuelOil4.daysInPeriod = totalFuelOil4Days;
  utilitiesObject.fuelOil4.avgDaily = totalFuelOil4Days
    ? util.formatNumberWithUnits(
        util.formatNumbersWithCommas(totalFuelOil4Delivery / totalFuelOil4Days),
        "gallons"
      )
    : 0;

  // get fuel oil 5 & 6 deliveries
  utilitiesObject.fuelOil56.totalUsage = totalFuelOil56DeliveryText;
  utilitiesObject.fuelOil56.totalUsagePercent = util.formatNumberWithUnits(
    Math.round((totalFuelOil56Delivery / totalUsageWithoutWater) * 100),
    "%"
  );
  utilitiesObject.fuelOil56.totalUsageCost = util.formatNumberWithUnits(
    util.formatNumbersWithCommas(totalFuelOil56Cost),
    "",
    true
  );
  utilitiesObject.fuelOil56.totalCost = util.formatNumberWithUnits(
    util.formatNumbersWithCommas(totalFuelOil56Cost),
    "",
    true
  );
  utilitiesObject.fuelOil56.totalUsageCostPercent = util.formatNumberWithUnits(
    Math.round((totalFuelOil56Cost / totalUsageCostWithoutDemand) * 100),
    "%"
  );
  utilitiesObject.fuelOil56.costPerSquareFoot =
    "$" +
    util.formatNumbersWithCommas(totalFuelOil56Cost / building.squareFeet);
  utilitiesObject.fuelOil56.ghgEmissions = util.formatNumberWithUnits(
    util.formatNumbersWithCommas(fuelOil56Emissions.toFixed(1)),
    "Metric tons of CO2e"
  );
  utilitiesObject.fuelOil56.waterWUI = util.formatNumberWithUnits(
    util.formatNumbersWithCommas(
      (totalFuelOil56Delivery / building.squareFeet).toFixed(1)
    ),
    "gal/ft²"
  );
  utilitiesObject.fuelOil56.daysInPeriod = totalFuelOil56Days;
  utilitiesObject.fuelOil56.avgDaily = totalFuelOil56Days
    ? util.formatNumberWithUnits(
        util.formatNumbersWithCommas(
          totalFuelOil56Delivery / totalFuelOil56Days
        ),
        "gallons"
      )
    : 0;

  // get diesel deliveries
  utilitiesObject.diesel.totalUsage = totalDieselDeliveryText;
  utilitiesObject.diesel.totalUsagePercent = util.formatNumberWithUnits(
    Math.round((totalDieselDelivery / totalUsageWithoutWater) * 100),
    "%"
  );
  utilitiesObject.diesel.totalUsageCost = util.formatNumberWithUnits(
    util.formatNumbersWithCommas(totalDieselCost),
    "",
    true
  );
  utilitiesObject.diesel.totalCost = util.formatNumberWithUnits(
    util.formatNumbersWithCommas(totalDieselCost),
    "",
    true
  );
  utilitiesObject.diesel.totalUsageCostPercent = util.formatNumberWithUnits(
    Math.round((totalDieselCost / totalUsageCostWithoutDemand) * 100),
    "%"
  );
  utilitiesObject.diesel.costPerSquareFoot = util.formatNumberWithUnits(
    util.formatNumbersWithCommas(totalDieselCost / building.squareFeet),
    "",
    true
  );
  utilitiesObject.diesel.ghgEmissions = util.formatNumberWithUnits(
    util.formatNumbersWithCommas(dieselEmissions.toFixed(1)),
    "Metric tons of CO2e"
  );
  utilitiesObject.diesel.waterWUI = util.formatNumberWithUnits(
    util.formatNumbersWithCommas(
      (totalDieselDelivery / building.squareFeet).toFixed(1)
    ),
    "gallons/ft²"
  );
  utilitiesObject.diesel.daysInPeriod = totalDieselDays;
  utilitiesObject.diesel.avgDaily = totalDieselDays
    ? util.formatNumberWithUnits(
        util.formatNumbersWithCommas(totalDieselDelivery / totalDieselDays),
        "gallons"
      )
    : 0;

  const { Hdd = 0, Cdd = 0 } = await calculateHDDAndCDD(
    building.location.zipCode,
    startDate,
    uniqueMeters
  );
  utilitiesObject.degree.Hdd = Hdd;
  utilitiesObject.degree.Cdd = Cdd;

  utilitiesObject.otherFuel.totalUsage = totalOtherUsageText;
  utilitiesObject.otherFuel.totalUsagePercent = util.formatNumberWithUnits(
    Math.round((totalOtherUsage * 100) / totalUsageWithoutWater),
    "%"
  );
  utilitiesObject.otherFuel.totalCost = util.formatNumberWithUnits(
    util.formatNumbersWithCommas(totalOtherCost),
    "",
    true
  );
  utilitiesObject.otherFuel.totalUsageCost = util.formatNumberWithUnits(
    util.formatNumbersWithCommas(totalOtherCost),
    "",
    true
  );
  utilitiesObject.otherFuel.totalUsageCostPercent = util.formatNumberWithUnits(
    util.formatNumbersWithCommas(totalOtherCost / building.squareFeet),
    "",
    true
  );
  utilitiesObject.otherFuel.costPerSquareFoot = util.formatNumberWithUnits(
    util.formatNumbersWithCommas(totalOtherCost / building.squareFeet),
    "",
    true
  );
  utilitiesObject.otherFuel.waterWUI = util.formatNumberWithUnits(
    util.formatNumbersWithCommas(
      (totalOtherUsage / building.squareFeet).toFixed(1)
    ),
    "kWh/ft²"
  );
  utilitiesObject.otherFuel.daysInPeriod = totalOtherDays;
  utilitiesObject.otherFuel.avgDaily = totalOtherDays
    ? util.formatNumberWithUnits(
        util.formatNumbersWithCommas(totalOtherUsage / totalOtherDays),
        "kBtu"
      )
    : 0;

  const portfolioManagerScore = await calculatePortfolioManager(
    buildingId,
    startDate
  );
  utilitiesObject.portfolioManager.score = portfolioManagerScore;
  return {
    utilities: utilitiesObject,
    monthlyUtilities: filteredMonthlyUtilities
  };
};
