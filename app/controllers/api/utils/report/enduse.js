const dateUtils = require("./date");
const fieldUtils = require("./field");
const tableUtils = require("./table");
const { getEndUseBreakdown } = require("../api.report.eub.client");
const _ = require("lodash");

const getEndUseHandleBars = async ({ building, customDate }) => {
  if (!customDate) {
    return {};
  }
  const { customStartDate, customEndDate } = customDate;
  let actualEndUse;
  try {
    actualEndUse = await getEndUseBreakdown(
      customStartDate,
      customEndDate,
      building
    );
  } catch (error) {
    console.log("utils.report.enduse -> getTable - error", error);
    return {};
  }
  if (!actualEndUse) {
    return {};
  }
  const baselineUsage = actualEndUse.eub_results;
  const baselineEnergy = actualEndUse.total_energy;

  const actualElectricityEnergyUse = () => {
    const label = "Electric Usage (kWh)";
    let value = 0;
    if (baselineUsage.fuel_uses.electric[label]) {
      value = baselineUsage.fuel_uses.electric[label].estimated_consumption;
    } else {
      value = baselineEnergy.total_kwh;
    }
    return _formatNumbersWithCommas(value);
  };

  const actualNaturalGasEnergyUse = () => {
    const label = "Natural Gas Usage(therms)";
    let value = 0;
    if (baselineUsage.fuel_uses.gas[label]) {
      value = baselineUsage.fuel_uses.gas[label].estimated_consumption;
    } else {
      value = baselineEnergy.total_therm;
    }
    return _formatNumbersWithCommas(value);
  };

  const actualTotalUse = () => {
    const label = "Total Use (kBtu)";
    let value = 0;
    if (baselineUsage.end_uses[label]) {
      value = baselineUsage.end_uses[label].estimated_consumption;
    } else {
      value = baselineEnergy.total_kbtu;
    }
    return _formatNumbersWithCommas(value);
  };

  const actualTotalCost = () => {
    const label = "Percentages";
    if (baselineUsage.end_uses[label]) {
      value = baselineUsage.end_uses[label].percentage;
      return `${value}%`;
    }
  };

  const estimatedEndUsePercentage = () => {
    const label = "kBtu/sq.ft.";
    let value = 0;
    if (baselineUsage.end_uses[label]) {
      value += baselineUsage.end_uses[label].percentage;
      return `${value}%`;
    }
  };

  return {
    actualEndUseBreakdown: {
      electricity: {
        energyUse: actualElectricityEnergyUse()
      },
      naturalGas: {
        energyUse: actualNaturalGasEnergyUse()
      },
      totalUse: actualTotalUse(),
      totalCost: actualTotalCost()
    },
    estimatedEndUseBreakdown: {
      percentage: estimatedEndUsePercentage()
    }
  };
};

const getTable = async ({
  metaData,
  building,
  projectConfig,
  customLabels,
  customDate
}) => {
  const squareFeet = (building && building.squareFeet) || 1000;
  const { start, end } = dateUtils.getYearRangeDates(metaData, customDate);
  let actualEndUse;
  try {
    actualEndUse = await getEndUseBreakdown(start, end, building);
  } catch (error) {
    console.log("utils.report.enduse -> getTable - error", error);
    return "";
  }
  if (!actualEndUse) {
    return "";
  }
  switch (projectConfig.format) {
    case "energyTable":
      return setEnergyImpact(
        actualEndUse,
        squareFeet,
        projectConfig,
        customLabels
      );
    case "endUseTable":
    default:
      return setEndUse(actualEndUse, squareFeet, projectConfig, customLabels);
  }
};

const setEndUse = (
  actualEndUse,
  squareFeet,
  projectConfig,
  customLabels = []
) => {
  try {
    const baselineUsage = actualEndUse.eub_results;
    const baselineEnergy = actualEndUse.total_energy;
    const savingsUsage = actualEndUse.eub_results_savings;
    const proposedUsage = actualEndUse.eub_results_proposed;
    const proposedEnergy = actualEndUse.total_energy_proposed;
    const avgConsumption = actualEndUse.utility_regression_model;
    const tableHeading = [];
    let contentArray = [];
    let headingArr = [],
      isActualEUB = false,
      energyExists = false,
      reductionExists = false;
    const defaultFieldsArray = [
      "endUse",
      "baseline.electricity",
      "baseline.natural_gas",
      "proposed.electricity",
      "proposed.natural_gas",
      "baseline.total_energy_consumption",
      "proposed.total_energy_consumption",
      "reduction"
    ];
    const fields = (projectConfig.data && projectConfig.data.fields) || [];

    // custom label updates

    customLabels = customLabels.map(item => {
      let field = item.field;
      if (field.indexOf("data.") === 0)
        field = field.replace("data.", "baseline.");
      if (field !== "endUse") {
        let target = field.split(".");
        if (target.length == 2) {
          if (target[1] === "electric_use") target[1] = "electricity";
          else if (target[1] === "total_energy")
            target[1] = "total_energy_consumption";
          else if (target[1] === "total_energy_reduction")
            target[1] = "reduction";
          else if (target[1] === "natural_usage") target[1] = "natural_gas";
          field = target.join(".");
        }
      }
      return {
        field,
        value: item.value
      };
    });
    if (fields.length) {
      headingArr[0] = "endUse";
      fields.map(field => {
        if (field == "electric_use") {
          headingArr.push("baseline.electricity");
          headingArr.push("proposed.electricity");
        } else if (field == "natural_usage") {
          headingArr.push("baseline.natural_gas");
          headingArr.push("proposed.natural_gas");
        } else if (field == "total_energy") {
          energyExists = true;
        } else if (field == "total_energy_reduction") {
          reductionExists = true;
        } else {
          headingArr.push(field);
        }

        if (field.indexOf("actualEndUseBreakdown.") !== -1) {
          isActualEUB = true;
        }
      });
      if (energyExists) {
        headingArr.push("baseline.total_energy_consumption");
        headingArr.push("proposed.total_energy_consumption");
      }

      // HACK: this is due to the fact that total use is being set as first column in template, which doesn't make sense
      if (isActualEUB) {
        const totalIndex = headingArr.indexOf("actualEndUseBreakdown.totalUse");
        if (totalIndex >= 0) {
          headingArr.splice(totalIndex, 1);
        }
        const percentageIndex = headingArr.indexOf(
          "actualEndUseBreakdown.totalCost"
        );
        if (percentageIndex >= 0) {
          headingArr.splice(percentageIndex, 1);
        }
        if (fields.includes("actualEndUseBreakdown.totalUse"))
          headingArr.push("actualEndUseBreakdown.totalUse");
        if (fields.includes("actualEndUseBreakdown.totalCost"))
          headingArr.push("actualEndUseBreakdown.totalCost");
      }
      if (reductionExists) headingArr.push("reduction");
      headingArr.forEach(heading => {
        let label;
        if (heading === "energy_savings" || heading === "reduction") {
          // custom label for energy savings and reduction
          let findLabel = _.find(customLabels, {
            field: `baseline.${heading}`
          });
          if (!findLabel) {
            findLabel = _.find(customLabels, {
              field: `proposed.${heading}`
            });
          }
          if (findLabel) {
            label = findLabel.value;
          } else {
            label = tableUtils.getHeading(heading, "", customLabels);
          }
        } else {
          label = tableUtils.getHeading(heading, "", customLabels);
        }
        tableHeading.push({ label, field: heading });
      });
    } else {
      defaultFieldsArray.forEach(field => {
        const label = tableUtils.getHeading(field, "", customLabels);
        tableHeading.push({ label, field });
      });
    }

    const endUseArr = [
      "heating",
      "cooling",
      "airdistribution",
      "waterheat",
      "kitchen",
      "lighting",
      "plugload",
      "processload",
      "wather-distribution",
      "conveyance",
      "refrigeration",
      "it",
      "other",
      "ventilation",
      "total"
    ];

    // BUIL-4369 - doesn't make sense to have this right now
    if (isActualEUB) {
      endUseArr.push("historical");
      endUseArr.push("actual");
    }
    if (!headingArr.find(entry => entry.indexOf("estimatedEndUseBreakdown."))) {
      endUseArr.push("eui");
    }
    let totalEstimatedPercentage = 0;
    let totalAcutalPercentage = 0;
    endUseArr.forEach(field => {
      const content = {};
      let label = fieldUtils.getHeading(field, customLabels);
      content["End Use"] = fieldUtils.getHeading(field, customLabels);
      if (content["End Use"] == "Space Heating") label = "Space heating";
      if (content["End Use"] == "Space Cooling") label = "Space cooling";
      if (content["End Use"] == "Air Distribution")
        label = "Air distribution (fans)";
      if (content["End Use"] == "Plug Load") label = "Plug loads";
      if (content["End Use"] == "Process Load") label = "Process loads";

      tableHeading.forEach(heading => {
        if (heading.field === "endUse") return;
        let valueToCalc, value;
        const warningIcon = "!";
        switch (heading.field) {
          case "baseline.electricity": {
            if (field == "total" || field == "avg") {
              valueToCalc = baselineEnergy.total_kwh;
            } else if (baselineUsage.fuel_uses.electric[label]) {
              valueToCalc =
                baselineUsage.fuel_uses.electric[label].estimated_consumption;
            }
            break;
          }
          case "baseline.natural_gas": {
            if (field == "total" || field == "avg") {
              valueToCalc = baselineEnergy.total_therm;
            } else if (baselineUsage.fuel_uses.gas[label]) {
              valueToCalc =
                baselineUsage.fuel_uses.gas[label].estimated_consumption;
            }
            break;
          }
          case "proposed.electricity": {
            if (field == "total" || field == "avg") {
              valueToCalc = actualEndUse.total_energy_savings.electric;
            } else if (savingsUsage.fuel_uses.electric[label]) {
              valueToCalc = savingsUsage.fuel_uses.electric[label].savings;
            }
            break;
          }
          case "proposed.natural_gas": {
            if (field == "total" || field == "avg") {
              valueToCalc = actualEndUse.total_energy_savings.gas;
            } else if (savingsUsage.fuel_uses.gas[label]) {
              valueToCalc = savingsUsage.fuel_uses.gas[label].savings;
            }
            break;
          }
          case "baseline.total_energy_consumption": {
            if (field == "total" || field == "avg") {
              valueToCalc = baselineEnergy.total_kbtu;
            } else if (field == "eui") {
              valueToCalc = actualEndUse.eui;
            } else if (baselineUsage.end_uses[label]) {
              valueToCalc = baselineUsage.end_uses[label].estimated_consumption;
            }
            break;
          }
          case "proposed.total_energy_consumption": {
            if (field == "total" || field == "avg") {
              valueToCalc = proposedEnergy.total_kbtu_proposed;
            } else if (field == "eui") {
              valueToCalc = actualEndUse.eui_proposed;
            } else if (proposedUsage.end_uses[label]) {
              valueToCalc = proposedUsage.end_uses[label].estimated_consumption;
            }
            break;
          }
          case "reduction": {
            if (field == "total" || field == "avg") {
              if (
                _.isNumber(baselineEnergy.total_kbtu) &&
                _.isNumber(proposedEnergy.total_kbtu_proposed)
              ) {
                valueToCalc =
                  ((baselineEnergy.total_kbtu -
                    proposedEnergy.total_kbtu_proposed) *
                    100) /
                  baselineEnergy.total_kbtu;
              }
            } else if (field == "eui") {
              if (
                _.isNumber(actualEndUse.eui) &&
                _.isNumber(actualEndUse.eui_proposed)
              ) {
                valueToCalc =
                  ((actualEndUse.eui - actualEndUse.eui_proposed) * 100) /
                  actualEndUse.eui;
              }
            } else {
              const baseline =
                baselineUsage.end_uses[label].estimated_consumption;
              const proposed =
                proposedUsage.end_uses[label].estimated_consumption;
              if (baseline === 0 && savingsUsage.end_uses[label].savings > 0) {
                value = warningIcon;
              } else if (
                _.isNumber(baseline) &&
                baseline > 0 &&
                _.isNumber(proposed) &&
                proposed > 0
              ) {
                valueToCalc = ((baseline - proposed) * 100) / baseline;
              }
            }
            break;
          }
          case "energy_savings": {
            if (field == "total" || field == "avg") {
              valueToCalc =
                baselineEnergy.total_kbtu - proposedEnergy.total_kbtu_proposed;
            } else if (field == "eui") {
              valueToCalc = actualEndUse.eui - actualEndUse.eui_proposed;
            } else if (baselineUsage.end_uses[label]) {
              valueToCalc =
                baselineUsage.end_uses[label].estimated_consumption -
                proposedUsage.end_uses[label].estimated_consumption;
            }
            break;
          }
          case "actualEndUseBreakdown.electricity.energyUse": {
            if (baselineUsage.fuel_uses.electric[label]) {
              valueToCalc =
                baselineUsage.fuel_uses.electric[label].estimated_consumption;
            } else if (field == "total" || field == "avg") {
              valueToCalc = baselineEnergy.total_kwh;
            } else if (
              field == "historical" &&
              avgConsumption.electric.average_consumption
            ) {
              valueToCalc = _.sum(avgConsumption.electric.average_consumption);
            } else if (
              field == "actual" &&
              _.isNumber(baselineEnergy.total_kwh) &&
              avgConsumption.electric.average_consumption
            ) {
              valueToCalc =
                (baselineEnergy.total_kwh /
                  _.sum(avgConsumption.electric.average_consumption)) *
                100;
            }
            break;
          }
          case "actualEndUseBreakdown.naturalGas.energyUse": {
            if (baselineUsage.fuel_uses.gas[label]) {
              valueToCalc =
                baselineUsage.fuel_uses.gas[label].estimated_consumption;
            } else if (field == "total" || field == "avg") {
              valueToCalc = baselineEnergy.total_therm;
            } else if (
              field == "historical" &&
              avgConsumption.gas.average_consumption
            ) {
              valueToCalc = _.sum(avgConsumption.gas.average_consumption);
            } else if (
              field == "actual" &&
              _.isNumber(baselineEnergy.total_therm) &&
              avgConsumption.gas.average_consumption
            ) {
              valueToCalc =
                (baselineEnergy.total_therm /
                  _.sum(avgConsumption.gas.average_consumption)) *
                100;
            }
            break;
          }
          case "actualEndUseBreakdown.totalUse": {
            if (baselineUsage.end_uses[label]) {
              valueToCalc = baselineUsage.end_uses[label].estimated_consumption;
            } else if (field == "eui") {
              valueToCalc = actualEndUse.eui;
            } else if (field == "total" || field == "avg") {
              valueToCalc = baselineEnergy.total_kbtu;
            } else if (
              (field == "historical" || field == "actual") &&
              avgConsumption.electric.average_consumption &&
              avgConsumption.gas.average_consumption
            ) {
              const electricTokBtu = avgConsumption.electric.average_consumption.map(
                value => (value >= 0 ? value * 3.412 : 0)
              );
              const gasTokBtu = avgConsumption.gas.average_consumption.map(
                value => (value >= 0 ? value * 100 : 0)
              );
              const totalAvgkBtu = [];
              if (electricTokBtu && gasTokBtu) {
                for (let index = 0; index < electricTokBtu.length; index++) {
                  const monthTotal = electricTokBtu[index] + gasTokBtu[index];
                  totalAvgkBtu.push(monthTotal);
                }
              }
              if (field == "historical") {
                valueToCalc = _.sum(totalAvgkBtu);
              } else if (field == "actual") {
                valueToCalc =
                  (baselineEnergy.total_kbtu / _.sum(totalAvgkBtu)) * 100;
              }
            }
            break;
          }
          case "actualEndUseBreakdown.totalCost": {
            if (baselineUsage.end_uses[label]) {
              valueToCalc = baselineUsage.end_uses[label].percentage;
              totalAcutalPercentage += baselineUsage.end_uses[label].percentage;
            } else if (field == "total") {
              valueToCalc = Math.min(totalAcutalPercentage, 100);
            }
            break;
          }
          case "estimatedEndUseBreakdown.percentage": {
            if (baselineUsage.end_uses[label]) {
              valueToCalc = baselineUsage.end_uses[label].percentage;
              totalEstimatedPercentage +=
                baselineUsage.end_uses[label].percentage;
            } else if (field == "total") {
              valueToCalc = totalEstimatedPercentage;
            }
            break;
          }
        }

        if (_.isNumber(valueToCalc)) {
          if (field === "avg") {
            value = _formatNumbersWithCommas(valueToCalc / squareFeet);
          } else if (valueToCalc === 0) {
            value = valueToCalc;
          } else {
            value = _formatNumbersWithCommas(valueToCalc);
          }
        }

        if (value === warningIcon) {
          content[heading.label] = value;
        } else if (value !== 0 && !value) {
          content[heading.label] = "-";
        } else {
          content[heading.label] = value;
          if (
            heading.field === "reduction" ||
            heading.label === "Percentages" ||
            field === "actual" ||
            heading.label.indexOf("Percentage") >= 0
          ) {
            content[heading.label] += "%";
          }
        }
      });
      contentArray.push(content);
    });
    if (projectConfig && projectConfig.data) {
      if (projectConfig.data.orderBy == "electric_use") {
        projectConfig.data.orderBy = tableUtils.getHeading(
          "baseline.electricity"
        );
      }
      if (projectConfig.data.orderBy == "natural_usage") {
        projectConfig.data.orderBy = tableUtils.getHeading(
          "baseline.natural_gas"
        );
      }
      if (projectConfig.data.orderBy == "total_energy") {
        projectConfig.data.orderBy = tableUtils.getHeading(
          "baseline.total_energy_consumption"
        );
      }
      if (projectConfig.data.orderBy == "total_energy_reduction") {
        projectConfig.data.orderBy = tableUtils.getHeading("reduction");
      }
      if (projectConfig.data.orderBy == "energy_savings") {
        projectConfig.data.orderBy = tableUtils.getHeading("energy_savings");
      }
    }
    // contentArray = tableUtils.sort(contentArray, projectConfig);
    return tableUtils.generateTable(
      "horizontal",
      tableHeading,
      contentArray,
      ""
    );
  } catch (error) {
    console.error(error);
    return "";
  }
};

const setEnergyImpact = (
  actualEndUse,
  squareFeet,
  projectConfig,
  customLabels = []
) => {
  try {
    const baselineEnergy = actualEndUse.total_energy;
    const proposedEnergy = actualEndUse.total_energy_proposed;
    const tableHeading = [];
    let contentArray = [],
      headingArr = [];
    const defaultFieldsArray = [
      "energy",
      "baseline.electricity",
      "baseline.natural_gas",
      "baseline.total_energy_consumption",
      "energy.eui",
      "energy.ghg_emission"
    ];
    const fields = (projectConfig.data && projectConfig.data.fields) || [];
    if (fields.length) {
      headingArr[0] = "energy";
      fields.map(field => {
        if (field == "electric_use") {
          headingArr.push("baseline.electricity");
        } else if (field == "natural_usage") {
          headingArr.push("baseline.natural_gas");
        } else if (field == "total_energy") {
          headingArr.push("baseline.total_energy_consumption");
        } else {
          headingArr.push(field);
        }
      });
      headingArr.forEach(heading => {
        const label = tableUtils.getHeading(heading, "", customLabels);
        tableHeading.push({ label, field: heading });
      });
    } else {
      defaultFieldsArray.forEach(field => {
        const label = tableUtils.getHeading(field, "", customLabels);
        tableHeading.push({ label, field });
      });
    }

    const energyImpactArr = ["baseline", "proposed", "reduction"];
    energyImpactArr.forEach(field => {
      const content = {};
      content["Energy"] = fieldUtils.getHeading(field, customLabels);
      tableHeading.forEach(heading => {
        if (heading.label === "Energy") return;
        let value, baseline, proposed;
        switch (heading.field) {
          case "baseline.electricity":
            baseline = baselineEnergy.total_kwh;
            proposed = proposedEnergy.total_kwh_proposed;
            break;
          case "baseline.natural_gas":
            baseline = baselineEnergy.total_therm;
            proposed = proposedEnergy.total_therm_proposed;
            break;
          case "baseline.total_energy_consumption":
            baseline = baselineEnergy.total_kbtu;
            proposed = proposedEnergy.total_kbtu_proposed;
            break;
          case "energy.eui":
            baseline = actualEndUse.eui;
            proposed = actualEndUse.eui_proposed;
            break;
          case "energy.ghg":
            const eubBaseline = actualEndUse.ghg_intensity;
            const eubProposed = actualEndUse.ghg_intensity_proposed;
            baseline =
              eubBaseline &&
              _.isNumber(eubBaseline.electric) &&
              _.isNumber(eubBaseline.gas)
                ? eubBaseline.electric + eubBaseline.gas
                : 0;
            proposed =
              eubProposed &&
              _.isNumber(eubProposed.electric) &&
              _.isNumber(eubProposed.gas)
                ? eubProposed.electric + eubProposed.gas
                : 0;
            break;
          case "energy.ghg_emission":
            baseline = actualEndUse.total_ghg
              ? actualEndUse.total_ghg.gas + actualEndUse.total_ghg.electric
              : 0;
            proposed = actualEndUse.total_ghg_proposed
              ? actualEndUse.total_ghg_proposed.gas +
                actualEndUse.total_ghg_proposed.electric
              : 0;
            break;
        }
        if (field === "baseline") value = baseline;
        else if (field === "proposed") value = proposed;
        else if (field === "reduction")
          value = ((baseline - proposed) * 100) / baseline;

        content[heading.label] = _.isNumber(value)
          ? _formatNumbersWithCommas(value)
          : "-";
        if (field === "reduction" && content[heading.label] !== "-") {
          if (value === 0) {
            content[heading.label] = "0%";
          } else {
            content[heading.label] += "%";
          }
        }
      });
      contentArray.push(content);
    });

    // contentArray = tableUtils.sort(contentArray, projectConfig);
    return tableUtils.generateTable(
      "horizontal",
      tableHeading,
      contentArray,
      ""
    );
  } catch (error) {
    console.error(error);
    return "";
  }
};

/**
 * Add commas to numbers
 */
const _formatNumbersWithCommas = x => {
  if (!x) {
    return "";
  }
  if (!_.isNumber(x)) {
    return x;
  }

  x = _.round(parseFloat(x), 2);

  const parts = x.toString().split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  if (parts[parts.length - 1] === "00") {
    return parts[0];
  }
  return parts.join(".");
};

module.exports = { getTable, getEndUseHandleBars, _formatNumbersWithCommas };
