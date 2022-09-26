const benchmarkAnnualCostFields = [
  { name: "% vs Median", value: "annualCostBenchmark.percentMedian" },
  { name: "You", value: "annualCostBenchmark.you" },
  { name: "Median", value: "annualCostBenchmark.median" },
  { name: "75th Percentile", value: "annualCostBenchmark.percentile75" },
  { name: "90th Percentile", value: "annualCostBenchmark.percentile90" }
];

const benchmarkAnnualUsageFields = [
  { name: "% vs Median", value: "annualUsageBenchmark.percentMedian" },
  { name: "You", value: "annualUsageBenchmark.you" },
  { name: "Median", value: "annualUsageBenchmark.median" },
  { name: "75th Percentile", value: "annualUsageBenchmark.percentile75" },
  { name: "90th Percentile", value: "annualUsageBenchmark.percentile90" }
];

const degreeDayFields = [
  { name: "HDD", value: "degree.Hdd" },
  { name: "CDD", value: "degree.Cdd" }
];

const summaryFields = [
  { name: "Total Cost", value: "summary.totalCost" },
  {
    name: "Total Cost per square foot",
    value: "summary.totalCostPerSquareFoot"
  },
  { name: "Total Energy Use", value: "summary.totalEnergyUse" },
  { name: "Site EUI (kBtu/sq.ft)", value: "summary.siteEui" },
  { name: "Total Water Use", value: "summary.totalWaterUse" },
  { name: "Water WUI ([units]/sq.ft)", value: "summary.waterWui" },
  {
    name: 'CBECs Median Electricity EUI (kWh/SqFt)',
    value: 'summary.CBECs Median Electricity EUI (kWh/SqFt)'
  },
  {
    name: 'CBECs Median Electricity EUI (kWh/SqFt)',
    value: 'summary.cbecsMedianEUIAllSources'
  },
  {
    name: 'CBECs Median Natural Gas EUI (Therms/SqFt)',
    value: 'summary.CBECs Median Natural Gas EUI (Therms/SqFt)'
  },
  {
    name: 'CBECs Median Natural Gas EUI (Therms/SqFt)',
    value: 'summary.cbecsMedianNaturalGasEUI'
  },
  {
    name: 'CBECs Median EUI - All Sources (kBtu/SqFt)',
    value: 'summary.CBECs Median EUI - All Sources (kBtu/SqFt)'
  },
  {
    name: 'CBECs Median EUI - All Sources (kBtu/SqFt)',
    value: 'summary.cbecsMedianElectricityEUI'
  }
];

const dieselFields = [
  { name: "Diesel EUI ([units]/sq.ft.)", value: "diesel.waterWUI" },
  { name: "Total Usage", value: "diesel.totalUsage" },
  { name: "Total Usage Percent", value: "diesel.totalUsagePercent" },
  { name: "Total Usage Cost", value: "diesel.totalUsageCost" },
  {
    name: "Total Usage Cost Percent",
    value: "diesel.totalUsageCostPercent"
  },
  { name: "GHG Emissions", value: "diesel.ghgEmissions" }
];

const electricityFields = [
  { name: "Electricity EUI", value: "electricity.electricityEui" },
  { name: "Total Usage", value: "electricity.totalUsage" },
  { name: "Total Usage Percent", value: "electricity.totalUsagePercent" },
  { name: "Total Cost", value: "electricity.totalCost" },
  {
    name: "Total Cost per Square Foot",
    value: "electricity.costPerSquareFoot"
  },
  {
    name: "Total Usage Cost",
    value: "electricity.totalUsageCost"
  },
  {
    name: "Total Usage Cost Percent",
    value: "electricity.totalUsageCostPercent"
  },
  { name: "Total Demand", value: "electricity.totalDemand" },
  { name: "Total Demand Cost", value: "electricity.totalDemandCost" },
  { name: "GHG Emissions", value: "electricity.ghgEmissions" }
];
const naturalGasFields = [
  { name: "Natural Gas EUI", value: "naturalGas.naturalGasEui" },
  { name: "Total Usage", value: "naturalGas.totalUsage" },
  { name: "Total Usage Percent", value: "naturalGas.totalUsagePercent" },
  { name: "Total Usage Cost", value: "naturalGas.totalUsageCost" },
  {
    name: "Total Usage Cost Percent",
    value: "naturalGas.totalUsageCostPercent"
  },
  { name: "GHG Emissions", value: "naturalGas.ghgEmissions" }
];

const waterFields = [
  { name: "Water WUI ([units]/sq.ft.)", value: "water.waterWUI" },
  { name: "Total Usage", value: "water.totalUsage" },
  { name: "Total Usage Cost", value: "water.totalUsageCost" },
  {
    name: "Total Usage Cost Percent",
    value: "water.totalUsageCostPercent"
  }
];

const steamFields = [
  { name: "Steam EUI ([units]/sq.ft.)", value: "steam.waterWUI" },
  { name: "Total Usage", value: "steam.totalUsage" },
  { name: "Total Usage Percent", value: "steam.totalUsagePercent" },
  { name: "Total Usage Cost", value: "steam.totalUsageCost" },
  {
    name: "Total Usage Cost Percent",
    value: "steam.totalUsageCostPercent"
  },
  { name: "GHG Emissions", value: "steam.ghgEmissions" }
];

const fuelOil2Fields = [
  { name: "Fuel Oil 2 EUI ([units]/sq.ft.)", value: "fuelOil2.waterWUI" },
  { name: "Total Usage", value: "fuelOil2.totalUsage" },
  { name: "Total Usage Percent", value: "fuelOil2.totalUsagePercent" },
  { name: "Total Usage Cost", value: "fuelOil2.totalUsageCost" },
  {
    name: "Total Usage Cost Percent",
    value: "fuelOil2.totalUsageCostPercent"
  },
  { name: "GHG Emissions", value: "fuelOil2.ghgEmissions" }
];

const fuelOil4Fields = [
  { name: "Fuel Oil 4 EUI ([units]/sq.ft.)", value: "fuelOil4.waterWUI" },
  { name: "Total Usage", value: "fuelOil4.totalUsage" },
  { name: "Total Usage Percent", value: "fuelOil4.totalUsagePercent" },
  { name: "Total Usage Cost", value: "fuelOil4.totalUsageCost" },
  {
    name: "Total Usage Cost Percent",
    value: "fuelOil4.totalUsageCostPercent"
  },
  { name: "GHG Emissions", value: "fuelOil4.ghgEmissions" }
];

const fuelOil56Fields = [
  {
    name: "Fuel Oil 5 & 6 EUI ([units]/sq.ft.)",
    value: "fuelOil56.waterWUI"
  },
  { name: "Total Usage", value: "fuelOil56.totalUsage" },
  { name: "Total Usage Percent", value: "fuelOil56.totalUsagePercent" },
  { name: "Total Usage Cost", value: "fuelOil56.totalUsageCost" },
  {
    name: "Total Usage Cost Percent",
    value: "fuelOil56.totalUsageCostPercent"
  },
  { name: "GHG Emissions", value: "fuelOil56.ghgEmissions" }
];

const otherFuelFields = [
  { name: "Other EUI ([units]/sq.ft.)", value: "otherFuel.waterWUI" },
  { name: "Total Usage", value: "otherFuel.totalUsage" },
  { name: "Total Usage Percent", value: "otherFuel.totalUsagePercent" },
  { name: "Total Usage Cost", value: "otherFuel.totalUsageCost" },
  {
    name: "Total Usage Cost Percent",
    value: "otherFuel.totalUsageCostPercent"
  }
];

const ghgEmissionsFields = [
  {
    name: "Total Emissions (mtCO2e)",
    value: "ghgEmissions.totalEmissions"
  },
  {
    name: "GHG Intensity (kgCO2e/sq.ft.)",
    value: "ghgEmissions.ghgIntensity"
  },
  {
    name: "Vehicles Driven in a Year",
    value: "ghgEmissions.vehiclesDriven"
  },
  {
    name: "Barrels of Oil Consumed",
    value: "ghgEmissions.oilBarrelsConsumed"
  },
  {
    name: "Railcars of Coal Burned",
    value: "ghgEmissions.coalRailcarsBurned"
  }
];

const portfolioManagerFields = [
  {
    name: "Energy Star Portfolio Manager Score",
    value: "portfolioManager.score"
  },
  { name: "Site EUI", value: "portfolioManager.siteEui" },
  { name: "Source EUI", value: "portfolioManager.sourceEui" },
  { name: "National Median", value: "portfolioManager.siteEui" }
];

const rateFields = [
  { name: "Electricity rate", value: "rates.electricity" },
  { name: "Natural Gas rate", value: "rates.gas" },
  { name: "Water rate", value: "rates.water" },
  { name: "Steam rate", value: "rates.steam" },
  { name: "Fuel Oil 2 rate", value: "rates.fuelOil2" },
  { name: "Fuel Oil 4 rate", value: "rates.fuelOil4" },
  { name: "Fuel Oil 5 & 6 rate", value: "rates.fuelOil56" },
  { name: "Diesel rate", value: "rates.diesel" },
  { name: "Other rate", value: "rates.other" }
];

const fields = [
  ...benchmarkAnnualCostFields,
  ...benchmarkAnnualUsageFields,
  ...degreeDayFields,
  ...electricityFields,
  ...dieselFields,
  ...fuelOil2Fields,
  ...fuelOil4Fields,
  ...fuelOil56Fields,
  ...ghgEmissionsFields,
  ...naturalGasFields,
  ...otherFuelFields,
  ...portfolioManagerFields,
  ...steamFields,
  ...waterFields,
  ...rateFields,
  ...summaryFields
];

module.exports = { fields, summaryFields };
