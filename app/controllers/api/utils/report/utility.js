const _ = require("lodash");
const moment = require("moment");

const dateUtils = require("./date");
const endUtil = require("./enduse");

const groupUtilityData = (utilities, organizeBy) => {
  switch (organizeBy) {
    case "CY":
      utilities = _.groupBy(utilities, "year");
      utilities.monthsOrder = dateUtils.getMonthOrder("CY");
      return utilities;
    case "FY":
      utilities = _.map(utilities, function(element) {
        element.organize = dateUtils.getFiscalYear(element.date);
        return element;
      });
      utilities = _.groupBy(utilities, "organize");
      utilities.monthsOrder = dateUtils.getMonthOrder("FY");
      return utilities;
    case "12":
      utilities = _.map(utilities, function(element) {
        element.organize = dateUtils.get12Year(element.date);
        return element;
      });
      utilities = _.groupBy(utilities, "organize");
      utilities.monthsOrder = dateUtils.getMonthOrder("12");
      return utilities;
    default:
      utilities = _.groupBy(utilities, "year");
      utilities.monthsOrder = dateUtils.getMonthOrder("CY");
      return utilities;
  }
};

/**
 *
 * @param {*} utilities
 * @param {*} options
 */
const getData = ({
  utilities = [],
  organize = "CY",
  metaData = { yearRange: "12" },
  customDate
}) => {
  try {
    if (!utilities || (Array.isArray(utilities) && utilities.length === 0))
      return [];
    const { start, end } = dateUtils.getYearRangeDates(metaData, customDate);
    utilities = utilities.filter(utility => {
      const date = moment(utility.date);
      if (date.isSameOrAfter(start) && date.isSameOrBefore(end)) return true;
    });
    utilities = groupUtilityData(utilities, organize);
    let auxStartDate =
      organize !== "FY" ? moment(start).startOf("year") : moment(start);

    while (auxStartDate.isSameOrBefore(end)) {
      if (organize !== "FY") {
        if (!utilities[auxStartDate.year().toString()])
          utilities[auxStartDate.year().toString()] = [];
        auxStartDate.add(1, "year");
      } else {
        if (!utilities[dateUtils.getFiscalYear(auxStartDate)])
          utilities[dateUtils.getFiscalYear(auxStartDate)] = [];
        auxStartDate.add(1, "year");
      }
    }
    if (organize === "MonthYear") {
      let newUtilities = {
        monthsOrder: utilities.monthsOrder
      };
      for (let key in utilities) {
        if (key === "monthsOrder") continue;
        const { start, end } = getDateRange(key, utilities[key]);
        newUtilities[`${start} - ${end}`] = utilities[key];
      }
      return newUtilities;
    }

    // sort utilities order
    const orderedUtility = Object.keys(utilities)
      .sort()
      .reduce((obj, key) => {
        obj[key] = utilities[key];
        return obj;
      }, {});
    return orderedUtility;
  } catch (error) {
    console.log(error);
    console.error(error);
  }
};

const getDateRange = (year, utilities) => {
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec"
  ];
  let start = moment()
    .year(year)
    .startOf("year")
    .format("MMM YYYY");
  let end = moment()
    .year(year)
    .endOf("year")
    .format("MMM YYYY");
  let monthList = [];
  utilities.forEach(utility => {
    monthList.push(utility.month);
  });
  monthList = _.uniq(monthList).sort((a, b) => {
    const indexA = months.indexOf(a);
    const indexB = months.indexOf(b);
    return indexA < indexB ? -1 : indexB < indexA ? 1 : 0;
  });
  if (monthList.length > 1) {
    start = moment()
      .year(year)
      .month(monthList[0])
      .startOf("month")
      .format("MMM YYYY");
    end = moment()
      .year(year)
      .month(monthList[monthList.length - 1])
      .endOf("month")
      .format("MMM YYYY");
  } else if (monthList.length === 1) {
    start = moment()
      .year(year)
      .month("Jan")
      .startOf("month")
      .format("MMM YYYY");
    end = moment()
      .year(year)
      .month(monthList[0])
      .endOf("month")
      .format("MMM YYYY");
  }
  return { start, end };
};

const getHeadings = (field, customLabels = []) => {
  if (customLabels.length > 0) {
    const customLabel = _.find(customLabels, { field });
    if (customLabel) return customLabel.value;
  }
  switch (field) {
    case "electricity.totalUsage":
      return "Electric Usage (kWh)";
    case "electricity.totalUsageCost":
      return "Electric Usage Cost ($)";
    case "electricity.totalCost":
      return "Electric Total Cost ($)";
    case "electricity.maximumDemandValue":
      return "Maximum Demand (kW)";
    case "electricity.totalDemand":
      return "Electric Demand (kW)";
    case "electricity.totalDemandCost":
      return "Electric Demand Cost ($)";
    case "electricity.electricityEui":
      return "Electricity EUI (kWh/SqFt)";
    case "electricity.costPerSquareFoot":
      return "Electric Cost Per SqFt ($/SqFt)";
    case "electricity.daysInPeriod":
    case "naturalGas.daysInPeriod":
    case "water.daysInPeriod":
    case "steam.daysInPeriod":
    case "fuelOil2.daysInPeriod":
    case "fuelOil4.daysInPeriod":
    case "fuelOil56.daysInPeriod":
    case "diesel.daysInPeriod":
    case "other.daysInPeriod":
      return "Days In Period";
    case "electricity.avgDaily":
    case "naturalGas.avgDaily":
    case "water.avgDaily":
    case "steam.avgDaily":
    case "fuelOil2.avgDaily":
    case "fuelOil4.avgDaily":
    case "fuelOil56.avgDaily":
    case "diesel.avgDaily":
    case "other.avgDaily":
      return "Average Daily";
    case "naturalGas.totalUsage":
      return "Natural Gas Usage (therms)";
    case "naturalGas.totalUsageCost":
      return "Natural Gas Usage Cost ($)";
    case "naturalGas.costPerSquareFoot":
      return "Natural Gas Cost Per SqFt ($/SqFt)";
    case "naturalGas.naturalGasEui":
      return "Natural Gas EUI (Therms/SqFt)";
    case "water.waterWUI":
      return "Water Wui (ccf/SqFt)";
    case "water.totalUsage":
      return "Water Usage (ccf)";
    case "water.totalUsageCost":
      return "Water Usage Cost ($)";
    case "water.totalUsageCostPercent":
      return "Total Usage Cost Percent";
    case "water.costPerSquareFoot":
      return "Water Cost Per SqFt ($/SqFt)";
    case "steam.totalUsage":
      return "Steam Usage (ft3)";
    case "steam.totalUsageCost":
      return "Steam Usage Cost ($)";
    case "steam.costPerSquareFoot":
      return "Steam Cost Per SqFt ($/SqFt)";
    case "fuelOil2.totalUsage":
      return "FuelOil2 Usage (gal)";
    case "fuelOil2.totalUsageCost":
      return "FuelOil2 Usage Cost ($)";
    case "fuelOil2.costPerSquareFoot":
      return "FuelOil2 Cost Per SqFt ($/SqFt)";
    case "fuelOil4.totalUsage":
      return "FuelOil4 Usage (gal)";
    case "fuelOil4.totalUsageCost":
      return "FuelOil4 Usage Cost ($)";
    case "fuelOil4.costPerSquareFoot":
      return "FuelOil4 Cost Per SqFt ($/SqFt)";
    case "fuelOil56.totalUsage":
      return "FuelOil56 Usage (gal)";
    case "fuelOil56.totalUsageCost":
      return "FuelOil56 Usage Cost ($)";
    case "fuelOil56.costPerSquareFoot":
      return "FuelOil56 Cost Per SqFt ($/SqFt)";
    case "diesel.totalUsage":
      return "Diesel Usage (gal)";
    case "diesel.totalUsageCost":
      return "Diesel Usage Cost ($)";
    case "diesel.costPerSquareFoot":
      return "Diesel Cost Per SqFt ($/SqFt)";
    case "other.totalUsage":
      return "Other Usage";
    case "other.totalUsageCost":
      return "Other Usage Cost ($)";
    case "other.costPerSquareFoot":
      return "Other Cost Per SqFt ($/SqFt)";
    case "summary.totalCost":
      return "Total Cost ($)";
    case "summary.totalWaterUse":
      return "Total Water Use (kgal)";
    case "summary.waterWui":
      return "Water Wui (ccf/SqFt)";
    case "summary.totalCostPerSquareFoot":
      return "Total Cost Per Square Foot ($/SqFt)";
    case "summary.siteEui":
      return "Site EUI (kBtu/SqFt)";
    case "summary.totalEnergyUse":
      return "Total Energy Use (kBtu)";
    case "ghgEmissions.totalEmissions":
      return "Total Emissions (mtCO2e)";
    case "ghgEmissions.coalRailcarsBurned":
      return "Railcars of Coal Burned";
    case "ghgEmissions.ghgIntensity":
      return "GHG Intensity (kgCO2e/SqFt)";
    case "ghgEmissions.vehiclesDriven":
      return "Vehicles Driven";
    case "ghgEmissions.oilBarrelsConsumed":
      return "Barrels of oil consumed";
    case "annualCostBenchmark.median":
    case "annualCostBenchmark.percentile75":
    case "annualCostBenchmark.percentile90":
      return _.startCase(field);
    case "annualCostBenchmark.percentMedian":
      return "Annual Cost Benchmark Your Building Vs. Median (%)";
    case "annualCostBenchmark.you":
      return "Annual Cost Benchmark Your Building";
    case "annualUsageBenchmark.median":
    case "annualUsageBenchmark.percentile75":
    case "annualUsageBenchmark.percentile90":
      return _.startCase(field);
    case "annualUsageBenchmark.percentMedian":
      return "Annual Usage Benchmark Your Building Vs. Median (%)";
    case "annualUsageBenchmark.you":
      return "Annual Usage Benchmark Your Building";
    case "portfolioManager.score":
      return "Energy Star Portfolio Manager Score";
    case "summary.CBECs Median Electricity EUI (kWh/SqFt)":
      return "CBECs Median Electricity EUI (kWh/SqFt)";
    case "summary.CBECs Median Natural Gas EUI (Therms/SqFt)":
      return "CBECs Median Natural Gas EUI (Therms/SqFt)";
    case "summary.CBECs Median EUI - All Sources (kBtu/SqFt)":
      return "CBECs Median EUI - All Sources (kBtu/SqFt)";
    case "rates.electricity":
      return "Electricity Average Blended Rate";
    case "rates.gas":
      return "Natural Gas Average Blended Rate";
    case "rates.water":
      return "Water Average Blended Rate";
    case "rates.fuelOil2":
      return "Fuel Oil 2 Average Blended Rate";
    case "rates.fuelOil4":
      return "Fuel Oil 4 Average Blended Rate";
    case "rates.fuelOil56":
      return "Fuel Oil 5 & 6 Average Blended Rate";
    case "rates.diesel":
      return "Diesel Average Blended Rate";
    case "rates.other":
      return "Other Average Blended Rate";
    case "rates.steam":
      return "Steam Average Blended Rate";
    default:
      return _.startCase(field);
  }
};

const getValues = (field, utilities, buildingSqFt, building) => {
  switch (field) {
    case "summary.totalCost":
      return (
        getValue(utilities, "electric", "totalCost") +
        getValue(utilities, "naturalgas", "totalCost") +
        getValue(utilities, "electric", "demandCost")
      );
    case "summary.totalWaterUse":
      return getValue(utilities, "water", "totalUsage");
    case "summary.waterWui":
      return getValue(utilities, "water", "totalUsage") / buildingSqFt;
    case "summary.totalCostPerSquareFoot":
      return (
        (getValue(utilities, null, "totalCost") +
          getValue(utilities, "electric", "demandCost")) /
        buildingSqFt
      );
    case "summary.siteEui":
      return calculateSiteEUI(utilities) / buildingSqFt;
    // return getValue(utilities, "totalEnergy", "value") / buildingSqFt;
    case "summary.totalEnergyUse":
      const electricUsage = getValue(utilities, "electric", "totalUsage");
      const naturalGasUsage = getValue(utilities, "naturalgas", "totalUsage");
      return electricUsage * 3.412 + naturalGasUsage * 100;
    case "summary.CBECs Median Electricity EUI (kWh/SqFt)":
      if (
        building &&
        building.endUse &&
        building.endUse["CBECs Median Electricity EUI (kWh/SqFt)"]
      )
        return building.endUse["CBECs Median Electricity EUI (kWh/SqFt)"];
      return 0;
    case "summary.CBECs Median Natural Gas EUI (Therms/SqFt)":
      if (
        building &&
        building.endUse &&
        building.endUse["CBECs Median Natural Gas EUI (Therms/SqFt)"]
      )
        return building.endUse["CBECs Median Natural Gas EUI (Therms/SqFt)"];
      return 0;
    case "summary.CBECs Median EUI - All Sources (kBtu/SqFt)":
      if (
        building &&
        building.endUse &&
        building.endUse["CBECs Median EUI - All Sources (kBtu/SqFt)"]
      )
        return building.endUse["CBECs Median EUI - All Sources (kBtu/SqFt)"];
      return 0;
    case "ghgEmissions.totalEmissions":
      return getGHGTotal(utilities);
    case "ghgEmissions.coalRailcarsBurned":
      return getGHGTotal(utilities) / 183.22;
    case "ghgEmissions.ghgIntensity":
      return (getGHGTotal(utilities) * 1000) / buildingSqFt;
    case "ghgEmissions.vehiclesDriven":
      return getGHGTotal(utilities) / 4.67;
    case "ghgEmissions.oilBarrelsConsumed":
      return getGHGTotal(utilities) / 0.43;
    case "electricity.totalUsage":
      return getValue(utilities, "electric", "totalUsage");
    case "electricity.totalUsageCost":
      return getValue(utilities, "electric", "totalCost");
    case "electricity.totalCost":
      return (
        getValue(utilities, "electric", "totalCost") +
        getValue(utilities, "electric", "demandCost")
      );
    case "electricity.totalDemand":
      return getValue(utilities, "electric", "demand");
    case "electricity.maximumDemandValue":
      return utilities.reduce((max, utility) => {
        const demand = utility.electric.demand;
        if (max < demand) {
          return demand;
        } else {
          return max;
        }
      }, 0);
    case "electricity.totalDemandCost":
      return getValue(utilities, "electric", "demandCost");
    case "electricity.costPerSquareFoot": {
      let totalCost = getValue(utilities, "electric", "totalCost");
      console.log(
        "values",
        getValue(utilities, "electric", "totalCost"),
        buildingSqFt
      );
      return getValue(utilities, "electric", "totalCost") / buildingSqFt;
    }
    case "electricity.daysInPeriod":
      return 365;
    case "electricity.avgDaily":
      return getValue(utilities, "electric", "totalUsage") / 365;
    case "electricity.electricityEui":
      return getValue(utilities, "electric", "totalUsage") / buildingSqFt;
    case "naturalGas.totalUsage":
      return getValue(utilities, "naturalgas", "totalUsage");
    case "naturalGas.totalUsageCost":
      return getValue(utilities, "naturalgas", "totalCost");
    case "naturalGas.costPerSquareFoot":
      return getValue(utilities, "naturalgas", "totalCost") / buildingSqFt;
    case "naturalGas.daysInPeriod":
      return 365;
    case "naturalGas.avgDaily":
      return getValue(utilities, "naturalgas", "totalUsage") / 365;
    case "naturalGas.naturalGasEui":
      return getValue(utilities, "naturalgas", "totalUsage") / buildingSqFt;
    case "water.waterWUI":
      return getValue(utilities, "water", "totalUsage") / buildingSqFt;
    case "water.totalUsage":
      return getValue(utilities, "water", "totalUsage");
    case "water.totalUsageCost":
      return getValue(utilities, "water", "totalCost");
    case "water.totalUsageCostPercent":
      return (
        (getValue(utilities, "water", "totalCost") /
          utilities.reduce((total, utility) => total + utility.totalCost, 0)) *
        100
      ).toFixed(2);
    case "water.costPerSquareFoot":
      return getValue(utilities, "water", "totalCost") / buildingSqFt;
    case "water.daysInPeriod":
      return 365;
    case "water.avgDaily":
      return getValue(utilities, "water", "totalUsage") / 365;
    case "steam.totalUsage":
      return getValue(utilities, "steam", "totalUsage");
    case "steam.totalUsageCost":
      return getValue(utilities, "steam", "totalCost");
    case "steam.costPerSquareFoot":
      return getValue(utilities, "steam", "totalCost") / buildingSqFt;
    case "steam.daysInPeriod":
      return 365;
    case "steam.avgDaily":
      return getValue(utilities, "steam", "totalUsage") / 365;
    case "fuelOil2.totalUsage":
      return getValue(utilities, "fueloil2", "totalUsage");
    case "fuelOil2.totalUsageCost":
      return getValue(utilities, "fueloil2", "totalCost");
    case "fuelOil2.costPerSquareFoot":
      return getValue(utilities, "fueloil2", "totalCost") / buildingSqFt;
    case "fuelOil2.daysInPeriod":
      return 365;
    case "fuelOil2.avgDaily":
      return getValue(utilities, "fueloil2", "totalUsage") / 365;
    case "fuelOil4.totalUsage":
      return getValue(utilities, "fueloil4", "totalUsage");
    case "fuelOil4.totalUsageCost":
      return getValue(utilities, "fueloil4", "totalCost");
    case "fuelOil4.costPerSquareFoot":
      return getValue(utilities, "fueloil4", "totalCost") / buildingSqFt;
    case "fuelOil4.daysInPeriod":
      return 365;
    case "fuelOil4.avgDaily":
      return getValue(utilities, "fueloil4", "totalUsage") / 365;
    case "fuelOil56.totalUsage":
      return getValue(utilities, "fueloil56", "totalUsage");
    case "fuelOil56.totalUsageCost":
      return getValue(utilities, "fueloil56", "totalCost");
    case "fuelOil56.costPerSquareFoot":
      return getValue(utilities, "fueloil56", "totalCost") / buildingSqFt;
    case "fuelOil56.daysInPeriod":
      return 365;
    case "fuelOil56.avgDaily":
      return getValue(utilities, "fueloil56", "totalUsage") / 365;
    case "diesel.totalUsage":
      return getValue(utilities, "diesel", "totalUsage");
    case "diesel.totalUsageCost":
      return getValue(utilities, "diesel", "totalCost");
    case "diesel.costPerSquareFoot":
      return getValue(utilities, "diesel", "totalCost") / buildingSqFt;
    case "diesel.daysInPeriod":
      return 365;
    case "diesel.avgDaily":
      return getValue(utilities, "diesel", "totalUsage") / 365;
    case "other.totalUsage":
      return getValue(utilities, "other", "totalUsage");
    case "other.totalUsageCost":
      return getValue(utilities, "other", "totalCost");
    case "other.costPerSquareFoot":
      return getValue(utilities, "other", "totalCost") / buildingSqFt;
    case "other.daysInPeriod":
      return 365;
    case "other.avgDaily":
      return getValue(utilities, "other", "totalUsage") / 365;
    case "annualCostBenchmark.percentMedian":
      if (
        utilities &&
        utilities.length > 0 &&
        building &&
        building.endUse &&
        building.endUse["cost-estimate"] &&
        building.endUse["cost-estimate"]["quantile-50"] > 0
      ) {
        let percentMedian =
          (1 -
            (_.mean(utilities.map(utility => utility.totalCost)) -
              building.endUse["cost-estimate"]["quantile-50"])) /
          building.endUse["cost-estimate"]["quantile-50"];
        return (percentMedian * 100).toFixed(2) + "%";
      }
    case "annualCostBenchmark.you":
      if (utilities && utilities.length > 0)
        return _.mean(utilities.map(utility => utility.totalCost));
    case "annualCostBenchmark.median":
      if (
        building &&
        building.endUse &&
        building.endUse["cost-estimate"] &&
        building.endUse["cost-estimate"]["quantile-50"] > 0
      )
        return building.endUse["cost-estimate"]["quantile-50"];
    case "annualCostBenchmark.percentile75":
      if (
        building &&
        building.endUse &&
        building.endUse["cost-estimate"] &&
        building.endUse["cost-estimate"]["quantile-50"] > 0
      )
        return building.endUse["cost-estimate"]["quantile-75"];
    case "annualCostBenchmark.percentile90":
      if (
        building &&
        building.endUse &&
        building.endUse["cost-estimate"] &&
        building.endUse["cost-estimate"]["quantile-50"] > 0
      )
        return building.endUse["cost-estimate"]["quantile-90"];
    case "annualUsageBenchmark.percentMedian":
      if (
        utilities &&
        utilities.length > 0 &&
        building &&
        building.endUse &&
        building.endUse["total-energy-estimate"] &&
        building.endUse["total-energy-estimate"]["quantile-50"] > 0
      ) {
        let percentMedian =
          (1 -
            (_.mean(
              utilities.map(
                utility => utility.totalEnergy && utility.totalEnergy.value
              )
            ) -
              building.endUse["total-energy-estimate"]["quantile-50"])) /
          building.endUse["total-energy-estimate"]["quantile-50"];
        return (percentMedian * 100).toFixed(2) + "%";
      }
    case "annualUsageBenchmark.you":
      if (utilities && utilities.length > 0) {
        return _.mean(
          utilities.map(
            utility => utility.totalEnergy && utility.totalEnergy.value
          )
        );
      }
      return 0;
    case "annualUsageBenchmark.median":
      if (
        building &&
        building.endUse &&
        building.endUse["total-energy-estimate"] &&
        building.endUse["total-energy-estimate"]["quantile-50"] > 0
      )
        return building.endUse["total-energy-estimate"]["quantile-50"];

      return 0;
    case "annualUsageBenchmark.percentile75":
      if (
        building &&
        building.endUse &&
        building.endUse["total-energy-estimate"] &&
        building.endUse["total-energy-estimate"]["quantile-50"] > 0
      )
        return building.endUse["total-energy-estimate"]["quantile-75"];

      return 0;
    case "annualUsageBenchmark.percentile90":
      if (
        building &&
        building.endUse &&
        building.endUse["total-energy-estimate"] &&
        building.endUse["total-energy-estimate"]["quantile-50"] > 0
      )
        return building.endUse["total-energy-estimate"]["quantile-90"];

      return 0;
    default:
      return "-";
  }
};

const getGHGTotal = array => {
  return [
    "electric",
    "water",
    "naturalgas",
    "steam",
    "fueloil2",
    "fueloil4",
    "fueloil56",
    "diesel",
    "other"
  ].reduce((prev, curr) => {
    return prev + getValue(array, curr, "ghg") || 0;
  }, 0);
};

const getValue = (array, fuel, field) => {
  return array.reduce((prev, curr) => {
    return prev + Math.round(((fuel && curr[fuel][field]) || (!fuel && curr[field]) || 0) * 100)/100;
  }, 0);
};

const calculateSiteEUI = utilities => {
  let electric = 0;
  let gas = 0;
  let utilitiesGroupByMonth = _.groupBy(utilities, "month");
  for (let key in utilitiesGroupByMonth) {
    const utilitiesMonth = utilitiesGroupByMonth[key];
    if (utilitiesMonth.length) {
      let electricLength = 0;
      let gasLength = 0;
      const totalElectric = utilitiesMonth.reduce((total, curr) => {
        let value = (curr["electric"] && curr["electric"].totalUsage) || 0;
        if (value) electricLength++;
        return total + value;
      }, 0);
      const totalGas = utilitiesMonth.reduce((total, curr) => {
        let value = (curr["naturalgas"] && curr["naturalgas"].totalUsage) || 0;
        if (value) gasLength++;
        return total + value;
      }, 0);
      const electricValue =
        totalElectric / (electricLength ? electricLength : 1);
      const gasValue = totalGas / (gasLength ? gasLength : 1);
      electric += electricValue;
      gas += gasValue;
    }
  }
  return gas * 100.0 + electric * 3.412;
};

const getTable = ({ utilities, fields, type, building, customLabels }) => {
  const sqft = building.squareFeet || 0;
  try {
    switch (type) {
      case "monthlyTotals": {
        // theading start
        const rows = [];
        let ths = [];
        let totalValues = {};
        ths.push('<th rowspan="2"></th>');
        const keys = Object.keys(utilities);
        const colspan = keys.length;
        for (let field of fields) {
          const label = getHeadings(field, customLabels);
          ths.push(`<th colspan="${colspan}">${label}</th>`);
          totalValues[field] = {};
        }
        rows.push(`<tr style="background-color:#4F81BC;">${ths.join("")}</tr>`);
        ths = [];
        for (let _field of fields) {
          for (let ky of keys) {
            if (ky !== "monthsOrder") ths.push(`<th>${ky}</th>`);
          }
          ths.push("<th>Average</th>");
        }
        rows.push(`<tr style="background-color:#4F81BC;">${ths.join("")}</tr>`);
        const thead = `<thead>${rows.join("")}</thead>`;
        // theading end
        // tbody start
        const brows = [];
        const months = utilities.monthsOrder || [];
        for (let month of months) {
          const tds = [];
          tds.push(`<td style="background-color:#D7E3BD;">${month}</td>`);
          for (let field of fields) {
            const values = [];
            for (let ky of keys) {
              if (ky !== "monthsOrder") {
                const utils = utilities[ky] || [];
                const util =
                  (utils && utils.find(ut => ut.month == month)) || null;
                let value =
                  (util && getValues(field, [util], sqft, building)) || 0;
                value =
                  (value && Number(value) && Number(value).toFixed(2)) || 0;
                values.push(value);
                if (totalValues[field][ky] === undefined)
                  totalValues[field][ky] = [];
                totalValues[field][ky].push(value);
                value = _.round(value, 4);
                tds.push(`<td>${endUtil._formatNumbersWithCommas(value)}</td>`);
              } else {
                // calculating the average
                const filteredValues = values.filter(item => !!item);
                let avg =
                  filteredValues.reduce(
                    (prev, curr) => prev + (Number(curr) || 0),
                    0
                  ) || 0;
                avg = Number(
                  filteredValues.length > 0 ? avg / filteredValues.length : 0
                ).toFixed(2);
                if (totalValues[field]["average"] === undefined)
                  totalValues[field]["average"] = [];
                totalValues[field]["average"].push(avg);
                avg = _.round(avg, 4);
                tds.push(
                  `<td style="background-color:#D7E3BD;">${endUtil._formatNumbersWithCommas(
                    avg
                  )}</td>`
                );
              }
            }
          }
          brows.push(`<tr>${tds.join("")}</tr>`);
        }
        // total
        let totalTds = [];
        totalTds.push(`<td style="background-color:#D7E3BD;">Total</td>`);
        for (let field of fields) {
          for (let ky of keys) {
            if (ky !== "monthsOrder") {
              let values = totalValues[field][ky] || [];
              let value =
                values.reduce((prev, curr) => prev + (Number(curr) || 0), 0) ||
                0;
              value = _.round(value, 4);
              totalTds.push(
                `<td>${endUtil._formatNumbersWithCommas(value)}</td>`
              );
            } else {
              let values = totalValues[field]["average"] || [];
              let value =
                values.reduce((prev, curr) => prev + (Number(curr) || 0), 0) ||
                0;
              value = _.round(value, 4);
              totalTds.push(
                `<td>${endUtil._formatNumbersWithCommas(value)}</td>`
              );
            }
          }
        }
        brows.push(`<tr>${totalTds.join("")}</tr>`);
        const tbody = `<tbody>${brows.join("")}</tbody>`;
        // tbody end
        const obj = {
          fieldHeadings: [],
          data: [],
          utilityTable: `<table>${thead}${tbody}</table>`
        };
        return obj;
      }
      default: {
        const fieldHeadings = [];
        const data = [];
        fieldHeadings.push({ name: "#empty", label: "#empty" });
        for (let field of fields) {
          fieldHeadings.push({
            name: field,
            label: getHeadings(field, customLabels)
          });
        }
        const keys = Object.keys(utilities);
        for (let ky of keys) {
          if (ky === "monthsOrder") continue;
          const obj = {};
          const utils = utilities[ky] || [];
          fieldHeadings.forEach(fh => {
            const { name, label } = fh;
            switch (label) {
              case "#empty":
                obj[label] = ky;
                break;
              default:
                let value = getValues(name, utils, sqft, building);
                if (_.isNumber(value)) value = _.round(value, 2);
                obj[label] = value;
                break;
            }
          });
          data.push(obj);
        }
        // calculating the averages.
        const obj = {};
        fieldHeadings.forEach(fh => {
          const { label } = fh;
          switch (label) {
            case "#empty":
              obj[label] = "Average";
              break;
            default: {
              const values = data
                .map(item => item[label] || 0)
                .filter(item => !!item);
              const average =
                values.length > 0
                  ? values.reduce((prev, curr) => prev + curr) / values.length
                  : 0;
              obj[label] = Number(average || 0).toFixed(2);
            }
          }
        });
        data.push(obj);
        return { fieldHeadings, data };
      }
    }
  } catch (error) {
    console.error(error);
    console.log(error);
  }
};

module.exports = { getData, getHeadings, getValues, getTable };
