const fieldUtils = require("./field");
const _ = require("lodash");
const { _numberWithCommas } = require("../project.calculations");

/*
 * Return new table heading
 */
const getHeading = (field, financePeriod = "", customLabels = []) => {
  if (customLabels.length > 0) {
    const customLabel = _.find(customLabels, { field });
    if (customLabel) return customLabel.value;
  }
  switch (field) {
    case "name":
      return "Proposed Measure";
    case "project_cost":
      return "Estimated Measure Cost ($)";
    case "annual_savings":
      return "Annual Cost Savings ($)";
    case "energy_savings":
      return "Estimated Energy Savings (kBtu)";
    case "electric_savings":
      return "Estimated Electric Savings (kWh)";
    case "gas_savings":
      return "Estimated Gas Savings (therms)";
    case "water_savings":
      return "Estimated Water Savings (kGal)";
    case "incentive":
      return "Estimated Incentive ($)";
    case "simple_payback":
      return "Simple Payback (yrs)";
    case "ghg":
      return "Estimated GHG Savings (mtCO2e)";
    case "ghg-cost":
      return "Estimated GHG Cost ($/mtCO2e)";
    case "npv":
      return financePeriod.toString() + " year NPV ($)";
    case "sir":
      return financePeriod.toString() + " year SIR";
    case "roi":
      return "ROI (%)";
    case "baseline.electricity":
      return "Electricity (kWh)";
    case "baseline.natural_gas":
      return "Natural Gas (therms)";
    case "proposed.electricity":
      return "Electricity Savings (kWh)";
    case "proposed.natural_gas":
      return "Natural Gas Savings (therms)";
    case "baseline.total_energy_consumption":
      return "Total Existing Energy Consumption (kBtu)";
    case "proposed.total_energy_consumption":
      return "Total Proposed Energy Consumption (kBtu)";
    case "reduction":
      return "% Reduction";
    case "enery_savings":
      return "Energy Savings (kBtu)";
    case "endUse":
      return "End Use";
    case "actualEndUseBreakdown.totalUse":
      return "Total Use (kBtu)";
    case "actualEndUseBreakdown.electricity.energyUse":
      return "Electric Usage (kWh)";
    case "actualEndUseBreakdown.naturalGas.energyUse":
      return "Natural Gas Usage(therms)";
    case "actualEndUseBreakdown.totalCost":
      return "Percentages";
    case "energy.eui":
      return "Site EUI";
    case "energy.ghg_emission":
      return "Total GHG Emissions (mtCO2e)";
    case "energy.ghg":
      return "GHG Intensity";
    case "actual":
      return "Actual %";
    case "Annual Op. Hours":
      return "Annual Op. Hours";
    case "Fixture Quantity":
      return "Fixture Quantity";
    case "Exisiting Fixture Type":
      return "Exisiting Fixture Type";
    case "Exisiting Fixture Wattage (Watts)":
      return "Exisiting Fixture Wattage (Watts)";
    case "Proposed Fixture Type":
      return "Proposed Fixture Type";
    case "Proposed Fixture Wattage (Watts)":
      return "Proposed Fixture Wattage (Watts)";
    default:
      return fieldUtils.getHeading(field);
  }
};

const generateTable = (
  layout = "horizontal",
  headings = [],
  data = [],
  tableHeadings = null
) => {
  try {
    switch (layout) {
      case "vertical": {
        let htmlTable = "";
        const rows = [];
        headings.forEach(heading => {
          const { label } = heading;
          if (label !== "##BREAK##") {
            let htd = "";
            if (label == "#empty") {
              htd = '<td style="background-color:#4F81BC;"></td>';
            } else {
              htd = `<td style="background-color:#4F81BC;">${label}</td>`;
            }
            let counter = 1; // first column is our headings so, starting from next column, indexed 1.
            let tds = data.map(dataItem => {
              let style = "";
              if (counter % 2 === 0) {
                style = 'style="background-color:#D7E3BD;"';
              }
              let value = dataItem[label];
              if (
                (_.isNumber(value) || value == +value) &&
                value !== "" &&
                heading.label !== "#empty"
              ) {
                value = +value;
                value = _numberWithCommas(value);
              } else if (!value) {
                value = "-";
              }
              counter++;
              return style ? `<td>${value}</td>` : `<td ${style}>${value}</td>`;
            });
            rows.push(`<tr>${htd}${tds.join("")}</tr>`);
          }
        });
        htmlTable = `<table><tbody>${rows.join("")}</tbody></table>`;
        return htmlTable;
        ("");
      }
      case "horizontal": {
        const ths = [];
        const rows = [];
        let htmlTable = "";
        headings.forEach(heading => {
          let { label } = heading;
          if (label == "#empty") label = "";
          if (label !== "##BREAK##") ths.push(`<th>${label}</th>`);
        });
        let counter = 0;
        data.forEach(dataItem => {
          counter++;
          const tds = [];
          headings.forEach(heading => {
            if (heading.label !== "##BREAK##") {
              let value = dataItem[heading.label];
              if (
                (_.isNumber(value) || value == +value) &&
                value !== "" &&
                heading.label !== "#empty"
              ) {
                value = +value;
                value = _numberWithCommas(value);
              } else if (!value) {
                value = "-";
              }
              tds.push(`<td>${value}</td>`);
            }
          });
          const trElement =
            (counter % 2 === 0 && '<tr style="background-color:#D7E3BD;">') ||
            "<tr>";
          const tr = `${trElement}${tds.join("")}</tr>`;
          rows.push(tr);
        });
        const tableHead =
          (ths.length > 0 &&
            `<thead><tr style="background-color:#4F81BC;">${ths.join(
              ""
            )}</tr></thead>`) ||
          "";
        const tableBody = (tableHead && rows.length > 0 && rows.join("")) || "";
        htmlTable = `<table>${tableHead}<tbody>${tableBody}</tbody></table>`;
        return htmlTable;
      }
      case "split": {
        let htmlTable = "";
        let ths =
          (tableHeadings &&
            tableHeadings.map(
              tHeading => `<th colspan="4">${tHeading}</th>`
            )) ||
          "";
        ths = (ths && ths.join("")) || "";
        const rows = [];
        const breakIndex = Math.round(headings.length / 2);
        let leftFields = headings.slice(0, breakIndex);
        let rightFields = headings.slice(breakIndex);
        const rowSize = breakIndex;
        data = data && data[0];
        for (let i = 0; i < rowSize; i++) {
          const leftLabel = (leftFields[i] && leftFields[i]["label"]) || "";
          let leftValue = (data && data[leftLabel]) || "-";
          if (
            (_.isNumber(leftValue) || leftValue == +leftValue) &&
            leftValue !== "" &&
            leftLabel !== "#empty"
          ) {
            leftValue = +leftValue;
            leftValue = _numberWithCommas(leftValue);
          }
          const ltds =
            (leftLabel !== "##BREAK##" &&
              `<td style="background-color:#D7E3BD;">${leftLabel}</td><td>${leftValue}</td>`) ||
            "";
          const rightLabel = (rightFields[i] && rightFields[i]["label"]) || "";
          let rightValue = (data && data[rightLabel]) || "-";
          if (
            (_.isNumber(rightValue) || rightValue == +rightValue) &&
            rightValue !== "" &&
            rightLabel !== "#empty"
          ) {
            rightValue = +rightValue;
            rightValue = _numberWithCommas(rightValue);
          }
          const rtds =
            (rightLabel !== "##BREAK##" &&
              `<td style="background-color:#D7E3BD;">${rightLabel}</td><td>${rightValue}</td>`) ||
            "";
          const row = `<tr>${ltds}${rtds}</tr>`;
          rows.push(row);
        }
        const tableHead =
          (ths.length > 0 &&
            `<thead><thead><tr style="background-color:#4F81BC;">${ths}</tr></thead>`) ||
          "";
        const tableBody = (rows.length > 0 && rows.join("")) || "";
        htmlTable = `<table>${tableHead}${tableBody}</table>`;
        return `${htmlTable}`;
      }
    }
  } catch (error) {
    console.log(error);
    console.error(error);
  }
};

const sort = function(array, projectConfig) {
  // Sort projects array by projectConfig settings
  const direction =
    (projectConfig && projectConfig.data && projectConfig.data.order) ||
    "ascending";
  const key =
    (projectConfig && projectConfig.data && projectConfig.data.orderBy) || "";
  array = fieldUtils.sortArray(array, direction, key);
  return array;
};

module.exports = { getHeading, generateTable, sort };
