const _ = require("lodash");
const { fields } = require("../../../../static/report-options");

/**
 * Return the values separated by commas for each key as an json object; from the dot-notation key.value/s
 * @param {Array} fields
 * @returns {Object} {key: 'value,value,value'}
 */
const getParsedKeyValues = fields => {
  const obj = {};
  if (!fields) return obj;
  fields.forEach(field => {
    let key = field.substring(0, field.indexOf("."));
    let value = field.substring(field.indexOf(".") + 1);
    obj[key] = key in obj ? obj[key] + "," + value : value;
  });
  return obj;
};

const getLabel = (field, customLabels = []) => {
  if (customLabels.length > 0) {
    const customLabel = _.find(customLabels, { field });
    if (customLabel) return customLabel.value;
  }
  const match = fields.find(({ value }) => value === field);
  if (!match) return "";
  return match.name;
};

const getHtml = function({ target, fields, dataLabelsOption, customLabels }) {
  return (
    "<div>" +
    fields
      .map(field => {
        console.log("FIELD", field);
        const label = getLabel(field, customLabels);
        const value = _.get(target, field, "-") || "-";
        return `<p>${getLabelIfShown({
          label,
          option: dataLabelsOption
        })}${value}</p>`;
      })
      .join("") +
    "</div>"
  );
};

const getLabelIfShown = function({ label, option }) {
  if (option === "show") {
    return `${label}: `;
  }
  return "";
};

const getHeading = (fieldName, customLabels = []) => {
  if (customLabels.length > 0) {
    const customLabel = _.find(customLabels, { field: fieldName });
    if (customLabel) return customLabel.value;
  }
  let field = fieldName.includes(".") ? fieldName.split(".")[1] : fieldName;

  switch (field) {
    case "estimated_incentive":
      return "Estimated Incentive ($)";
    case "total_project_cost":
    case "total_cost":
      return "Total Measure Cost ($)";
    case "net_project_cost":
      return "Net Measure Cost ($)";
    case "first_year_cost":
      return "First Year Cost ($)";
    case "annual_electric_savings":
      return "Annual Electric Savings (kWh)";
    case "annual_gas_savings":
      return "Annual Natural Gas Savings (therms)";

    case "annual_savings":
      return "Annual Cost Savings ($)";
    case "annual_energy_savings":
      return "Annual Energy Savings (kBtu)";
    case "water_savings":
      return "Water Savings (kGal)";
    case "roi":
      return "ROI (%)";
    case "simple_payback":
      return "Simple Payback (yrs)";
    case "npv":
      return "NPV ($)";
    case "sir":
      return "SIR";
    case "name":
      return "Name";
    case "description":
      return "Description";
    case "implementation_strategy":
      return "Implementation Strategy";
    case "incentive":
      return "Incentive ($)";
    case "utility_company":
      return "Utility Company";
    case "rebate_code":
      return "Rebate Code";
    case "existing_requirements":
      return "Existing Requirements";
    case "design_requirements":
      return "Design Requirements";
    case "project_cost":
      return "Measure Cost ($)";
    case "electric_savings":
      return "Electric Savings (kWh)";
    case "gas_savings":
      return "Natural Gas Savings (therms)";
    case "energy_savings":
      return "Energy Savings (kBtu)";
    case "heating":
      return "Space Heating";
    case "cooling":
      return "Space Cooling";
    case "airdistribution":
      return "Air Distribution";
    case "waterheat":
      return "SHW/DHW";
    case "kitchen":
      return "Cooking";
    case "lighting":
      return "Lighting";
    case "plugload":
      return "Plug Load";
    case "processload":
      return "Process Load";
    case "wather-distribution":
      return "Water Distribution";
    case "conveyance":
      return "Conveyance";
    case "refrigeration":
      return "Refrigeration";
    case "it":
      return "IT";
    case "other":
      return "Other";
    case "ventilation":
      return "Ventilation";
    case "total":
      return "Total";
    case "eui":
    case "avg":
      return "kBtu/sq.ft.";
    case "ghg":
      return "Estimated GHG Savings (mtCO2e)";
    case "ghg-cost":
      return "Estimated GHG Cost ($/mtCO2e)";
    case "reduction":
      return "Reduction (%)";
    case "historical":
      return "Historical Billing";
    case "historical":
      return "% Actual";
    case "demand":
      return "Demand Savings (kW)";
    case "eul":
      return "Effective Useful Life (years)";
    case "exisitingFixtureType":
      return "Exisiting Fixture Type";
    case "exisitingFixtureWattage":
      return "Exisiting Fixture Wattage (Watts)";
    case "fixtureQuantity":
      return "Fixture Quantity";
    case "proposedFixtureType":
      return "Proposed Fixture Type";
    case "proposedFixtureWattage":
      return "Proposed Fixture Wattage (Watts)";
    case "annualOpHours":
      return "Annual Op. Hours";
    case "Measure Cost":
      return "Measure Cost ($)";
    case "total_financing_funding":
      return "Total Financing/Funding ($)";
    case "hours":
      return "Hours (hrs)";
    case "labor_rate":
      return "Labor Rate ($/hr)";
    case "labor_unit_cost":
      return "Labor/Unit Cost ($/unit)";
    case "labor_quantity":
      return "Labor Quantity";
    case "total_labor_cost":
      return "Total Labor Cost ($)";
    case "project_total_financing_funding":
      return "Total Financing/Funding ($)";
    case "material_unit_cost":
      return "Materials Unit Cost ($/unit)";
    case "material_quantity":
      return "Material Quantity";
    case "material_cost":
      return "Total Materials Cost ($)";
    case "installation_factors":
      return "Site-Specific Installation Factors ($)";
    case "utility_service_upgrades":
      return "Utility Service Upgrades ($)";
    case "temporary_services":
      return "Temporary Services ($)";
    case "environment_unit_cost":
      return "Environment Unit Cost ($)";
    case "environment_quantity":
      return "Environment Quantity";
    case "total_environment_unit_cost":
      return "Total Environment Unit Cost ($)";
    case "contingency":
      return "Contingency ($)";
    case "profit":
      return "Profit ($)";
    case "taxes":
      return "Taxes ($)";
    case "other_hard_cost":
      return "Other Hard Costs ($)";
    case "total_hard_cost":
      return "Total Hard Costs ($)";
    case "permits":
      return "Permits & Inspections ($)";
    case "material_handling":
      return "Material Handling ($)";
    case "test_and_balancing":
      return "Test and Balancing ($)";
    case "commissioning":
      return "Commissioning ($)";
    case "program_fees":
      return "Program Fees ($)";
    case "overhead":
      return "Overhead ($)";
    case "other_soft_cost":
      return "Other Soft Costs ($)";
    case "total_soft_cost":
      return "Total Soft Costs ($)";
    case "finance_cost_share":
      return "Financing Cost Share ($)";
    case "finance_cost_share_rate":
      return "Financing Cost Share Rate (%)";
    case "finance_finance":
      return "Financing ($)";
    case "finance_finance_rate":
      return "Financing Rate (%)";
    case "fund_cost_share":
      return "Fund Cost Share ($)";
    case "fund_cost_share_rate":
      return "Fund Cost Share Rate (%)";
    case "fund_finance":
      return "Fund Finance ($)";
    case "fund_finance_rate":
      return "Fund Finance Rate (%)";
    case "design_fees":
      return "Design Fees ($)";
    case "construction_management":
      return "Construction Management";
    case "Total Soft Costs":
      return "Total Soft Costs ($)";
    default:
      return _.startCase(field);
  }
};

/*
 * Convert a underscore string to title case with spaces.
 */
const formatHeading = function(field) {
  const ret = [];
  let tmp;
  if (!field) {
    return;
  }
  field.split("_").map(function(ele) {
    tmp = ele.replace(/([A-Z])/g, " $1");
    ret.push(tmp.charAt(0).toUpperCase() + tmp.slice(1));
  });
  return ret.join(" ");
};

const sortArray = function(array, direction, key) {
  if (!key) {
    return array;
  }
  if (array.length < 2) {
    return array;
  }
  if (key.includes(".") && key.split(".")[1]) {
    key = key.split(".")[1];
  }
  array.sort((a, b) => {
    const aKey = isNaN(a[key]) ? a[key] : Number(a[key]);
    const bKey = isNaN(b[key]) ? b[key] : Number(b[key]);

    if (direction === "ascending") return aKey > bKey ? 1 : -1;
    if (direction === "descending") return aKey < bKey ? 1 : -1;
  });
  return array;
};

module.exports = {
  getParsedKeyValues,
  getLabel,
  getLabelIfShown,
  getHtml,
  getHeading,
  formatHeading,
  sortArray
};
