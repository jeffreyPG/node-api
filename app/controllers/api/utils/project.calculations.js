// Get Run Results for Tables

const _ = require("lodash");

const calculateEnergySavings = (
  project,
  buildingId,
  fuelType,
  sort,
  key = "runResults"
) => {
  if (project.fuel === "" || !project.fuel) {
    project.fuel = "electric";
  }

  if (project.fuel.includes(fuelType)) {
    if (
      project[key] &&
      project[key][buildingId] &&
      project[key][buildingId]["energy-savings"] &&
      (project[key][buildingId]["energy-savings"] >= 0 ||
        Object.entries(project[key][buildingId]["energy-savings"]).length > 0)
    ) {
      if (project[key][buildingId]["calculation-type"] === "savings-range") {
        if (sort === "sort") {
          return Math.ceil(
            project[key][buildingId]["energy-savings"]["min-savings"]
          );
        } else {
          return (
            Math.ceil(
              project[key][buildingId]["energy-savings"]["min-savings"]
            ) +
            " - " +
            Math.ceil(project[key][buildingId]["energy-savings"]["max-savings"])
          );
        }
      } else {
        const energySavings = project[key][buildingId]["energy-savings"];
        if (typeof energySavings === "object" && fuelType in energySavings) {
          return Math.ceil(energySavings[fuelType]);
        }
        return Math.ceil(energySavings);
      }
    } else {
      return null;
    }
  } else {
    return null;
  }
};

/**
 * @param {Object} initialValues
 * Returns the Project"s Cost or null
 */
const getProjectCost = initialValues => {
  return initialValues &&
    initialValues.project_cost !== undefined &&
    initialValues.project_cost !== null
    ? Math.ceil(initialValues.project_cost)
    : null;
};

/**
 * @param {Object} initialValues
 * Returns the maintenance savings or null
 */
const getMaintenanceSavings = initialValues => {
  return initialValues &&
    initialValues.maintenance_savings !== undefined &&
    initialValues.maintenance_savings !== null
    ? Math.ceil(initialValues.maintenance_savings)
    : null;
};

/**
 * @param {Object} run
 * returns the incentive or null
 */
const getIncentive = run => {
  return run &&
    run["utility-incentive"] !== undefined &&
    run["utility-incentive"] !== null
    ? Math.ceil(run["utility-incentive"])
    : null;
};

/**
 * @param {Object} run
 * returns the annual savings or null
 */
const getAnnualSavings = run => {
  if (run && run["calculation-type"] === "savings-range") {
    const minSavings =
      run["annual-savings"]["electric-charge"]["min-savings"] +
      run["annual-savings"]["gas-charge"]["min-savings"];
    const maxSavings =
      run["annual-savings"]["electric-charge"]["max-savings"] +
      run["annual-savings"]["gas-charge"]["max-savings"];
    return Math.ceil(minSavings) + " - " + Math.ceil(maxSavings);
  } else {
    return run &&
      run["annual-savings"] !== undefined &&
      run["annual-savings"] !== null
      ? Math.ceil(
          (run["annual-savings"]["electric-charge"] || 0) +
            (run["annual-savings"]["gas-charge"] || 0)
        )
      : null;
  }
};

/**
 *
 * @param {Array} projects
 * @param {String} buildingId
 * returns the annual savings ranges or 0-0
 */
const getAnnualSavingsRanges = (projects, buildingId) => {
  const getTotalValue = (project, buildingId, key, minKey) => {
    return (
      (project &&
        project.runResults &&
        project.runResults[buildingId] &&
        project.runResults[buildingId]["annual-savings"] &&
        project.runResults[buildingId]["annual-savings"][key] &&
        project.runResults[buildingId]["annual-savings"][key][minKey]) ||
      0
    );
  };
  const electricMinSavings = projects.reduce((prev, curr) => {
    const isSubMeasure = hasSubMeasure(curr);
    if (isSubMeasure)
      return (
        prev + getTotalValue(curr, buildingId, "electric-charge", "min-savings")
      );
    return (
      prev +
      curr.runResults[buildingId]["annual-savings"]["electric-charge"][
        "min-savings"
      ]
    );
  }, 0);
  const electricMaxSavings = projects.reduce((prev, curr) => {
    const isSubMeasure = hasSubMeasure(curr);
    if (isSubMeasure)
      return (
        prev + getTotalValue(curr, buildingId, "electric-charge", "max-savings")
      );
    return (
      prev +
      curr.runResults[buildingId]["annual-savings"]["electric-charge"][
        "max-savings"
      ]
    );
  }, 0);
  const gasMinSavings = projects.reduce((prev, curr) => {
    const isSubMeasure = (curr.projects || []).length > 0;
    if (isSubMeasure)
      return (
        prev + getTotalValue(curr, buildingId, "gas-charge", "min-savings")
      );
    return (
      prev +
      curr.runResults[buildingId]["annual-savings"]["gas-charge"]["min-savings"]
    );
  }, 0);
  const gasMaxSavings = projects.reduce((prev, curr) => {
    const isSubMeasure = hasSubMeasure(curr);
    if (isSubMeasure)
      return (
        prev + getTotalValue(curr, buildingId, "gas-charge", "max-savings")
      );
    return (
      prev +
      curr.runResults[buildingId]["annual-savings"]["gas-charge"]["max-savings"]
    );
  }, 0);
  return (
    Math.ceil(electricMinSavings + gasMinSavings) +
    " - " +
    Math.ceil(electricMaxSavings + gasMaxSavings)
  );
};

/**
 *
 * @param {Object} run
 * returns the simplePayBack or null
 */
const getSimplePayback = run => {
  const annualSavings = getAnnualSavings(run) || 0;
  let value =
    run &&
    run["cash-flows"] &&
    run["cash-flows"].simple_payback !== undefined &&
    run["cash-flows"].simple_payback !== null
      ? run["cash-flows"].simple_payback.toFixed(2)
      : null;
  if (annualSavings <= 0) return 0;
  if (value && value == +value) {
    value = +value;
    value = _.round(value, 2);
    if (value < 0) value = 0;
  }
  return value;
};

/**
 *
 * @param {Object} run
 * returns the SIR or null
 */
const getSIR = run => {
  const annualSavings = getAnnualSavings(run) || 0;
  const cashFlows = run && run["cash-flows"];
  if (annualSavings <= 0) return 0;
  return cashFlows &&
    cashFlows.cash_flows !== undefined &&
    cashFlows.cash_flows !== null &&
    cashFlows.cash_flows.slice(-1)[0].SIR !== undefined &&
    cashFlows.cash_flows.slice(-1)[0].SIR !== null
    ? cashFlows.cash_flows.slice(-1)[0].SIR.toFixed(2)
    : null;
};

/**
 *
 * @param {Object} run
 * returns the NPV or null
 */
const getNPV = run => {
  const annualSavings = getAnnualSavings(run) || 0;
  if (annualSavings <= 0) return 0;
  return run &&
    run["cash-flows"] &&
    run["cash-flows"].cash_flows !== undefined &&
    run["cash-flows"].cash_flows !== null
    ? Math.ceil(run["cash-flows"].cash_flows.slice(-1)[0].NPV)
    : null;
};

/**
 *
 * @param {Object} run
 * returns the energy savings or null
 */
const getEnergySavings = run => {
  if (run && run["calculation-type"] === "savings-range") {
    return (
      Math.ceil(run["energy-savings"]["min-savings"]) +
      " - " +
      Math.ceil(run["energy-savings"]["max-savings"])
    );
  } else {
    return run &&
      run["energy-savings"] !== undefined &&
      run["energy-savings"] !== null
      ? Math.ceil(run["energy-savings"])
      : null;
  }
};

const getEnergySavingsByFuel = (project, fuelOption, buildingId) => {
  const run =
    (project && project.runResults && project.runResults[buildingId]) || null;
  const fuel = (project && project.fuel) || "";
  const energySavings = (run && run["energy-savings"]) || null;
  if (typeof energySavings === "object") {
    return (energySavings && energySavings[fuelOption]) || null;
  } else {
    if (fuelOption == fuel && typeof energySavings !== "object") {
      return (energySavings && Math.ceil(Number(energySavings))) || null;
    }
  }
};

/**
 * @param {Array} projects
 * @param {String} buildingId
 * returns the energy saving ranges
 */
const getEnergySavingsRanges = (projects, buildingId) => {
  const getTotalValue = (project, buildingId, key) => {
    return (
      (project &&
        project.runResults &&
        project.runResults[buildingId] &&
        project.runResults[buildingId]["energy-savings"] &&
        project.runResults[buildingId]["energy-savings"][key]) ||
      0
    );
  };
  const minSavings = projects.reduce((prev, curr) => {
    const isSubMeasure = hasSubMeasure(curr);
    if (isSubMeasure)
      return prev + getTotalValue(curr, buildingId, "min-savings");
    return prev + curr.runResults[buildingId]["energy-savings"]["min-savings"];
  }, 0);
  const maxSavings = projects.reduce((prev, curr) => {
    const isSubMeasure = hasSubMeasure(curr);
    if (isSubMeasure)
      return prev + getTotalValue(curr, buildingId, "max-savings");
    return prev + curr.runResults[buildingId]["energy-savings"]["max-savings"];
  }, 0);
  return Math.ceil(minSavings) + " - " + Math.ceil(maxSavings);
};

/**
 * @param {Object} initialValues
 * @param {Object} run
 * returns first year cost or 0
 */
const getFirstYearCost = (initialValues, run) => {
  if (
    initialValues &&
    initialValues.project_cost &&
    run &&
    run["utility-incentive"] !== undefined &&
    run["utility-incentive"] !== null &&
    run["annual-savings"] !== undefined &&
    run["annual-savings"] !== null
  ) {
    if (
      Math.ceil(
        initialValues.project_cost -
          run["utility-incentive"] -
          (run["annual-savings"]["electric-charge"] +
            run["annual-savings"]["gas-charge"])
      ) <= 0
    ) {
      return 0;
    } else {
      return Math.ceil(
        initialValues.project_cost -
          run["utility-incentive"] -
          (run["annual-savings"]["electric-charge"] +
            run["annual-savings"]["gas-charge"])
      );
    }
  } else {
    return 0;
  }
};

/**
 *
 * @param {Object} initialValues
 * @param {Object} run
 * returns ROI or null
 */
const getROI = (initialValues, run) => {
  // for all the values that we let the user input, any of these could be undefined
  const projectCost = (initialValues && initialValues.project_cost) || 0;
  const incentiveInput = (run && run["utility-incentive"]) || 0;
  const maintenanceSavings =
    (initialValues && initialValues.maintenance_savings) || 0;
  const annualSavings = getAnnualSavings(run) || 0;
  if (annualSavings <= 0) return 0;
  const roi =
    (+annualSavings + +maintenanceSavings) / (+projectCost - +incentiveInput);
  if (isNaN(roi) || !isFinite(roi)) {
    // if NaN or infinity
    return null;
  }
  return (roi * 100).toFixed(0);
};

/**
 * Picked up from UI side
 * @param {Object} project
 * @param {String} buildingId
 * @param {String} [sort] should give "sort" as input for sorting.
 */
const calculateAnnualSavings = (project, buildingId, sort) => {
  if (
    project.runResults &&
    project.runResults[buildingId] &&
    project.runResults[buildingId]["annual-savings"]
  ) {
    if (
      project.runResults[buildingId]["calculation-type"] === "savings-range"
    ) {
      let elecrticCharge =
        project.runResults[buildingId]["annual-savings"]["electric-charge"];
      let gasCharge =
        project.runResults[buildingId]["annual-savings"]["gas-charge"];
      let minSavings = elecrticCharge["min-savings"] + gasCharge["min-savings"];
      let maxSavings = elecrticCharge["max-savings"] + gasCharge["max-savings"];
      if (sort === "sort") {
        return Math.ceil(minSavings);
      } else {
        return Math.ceil(minSavings) + " - $" + Math.ceil(maxSavings);
      }
    } else {
      return Math.ceil(
        project.runResults[buildingId]["annual-savings"]["electric-charge"] +
          project.runResults[buildingId]["annual-savings"]["gas-charge"]
      );
    }
  } else {
    return null;
  }
};
/**
 * Picked up from UI side, to calculate ROI
 * @param {Object} project
 * @param {String} buildingId
 */
const calculateROI = (project, buildingId) => {
  if (
    project.runResults &&
    project.runResults[buildingId] &&
    project.runResults[buildingId]["calculation-type"] !== "savings-range" &&
    project.initialValues &&
    project.initialValues.project_cost > 0 &&
    calculateAnnualSavings(project, buildingId) > 0
  ) {
    let roi = (
      ((calculateAnnualSavings(project, buildingId) +
        +(project.initialValues.maintenance_savings || 0)) /
        (+(project.initialValues.project_cost || 0) -
          +(project.runResults[buildingId]["utility-incentive"] || 0))) *
      100
    ).toFixed(0);
    return isFinite(roi) ? Number(roi) : null;
  } else {
    return null;
  }
};

/**
 *
 * @param {Object} run
 * returns NPVLast or 0
 */
const getNPVLast = run => {
  if (
    run &&
    run["cash-flows"] &&
    run["cash-flows"].cash_flows.slice(-1)[0].NPV !== undefined &&
    run["cash-flows"].cash_flows.slice(-1)[0].NPV !== null
  ) {
    return Math.ceil(run["cash-flows"].cash_flows.slice(-1)[0].NPV);
  } else {
    return 0;
  }
};

/**
 * Returns the GHG Savings
 * @param {Object} run
 */
const getGHGSavings = run => {
  return run && run["ghg"] !== undefined && run["ghg"] !== null
    ? _.round(run["ghg"], 2)
    : null;
};

/**
 *
 * @param {Object} run
 * returns the ghg cost or null
 */
const getGHGCost = run => {
  return run &&
    run["energy-savings"] !== undefined &&
    run["energy-savings"] !== null
    ? _.round(run["ghg-cost"], 2)
    : null;
};

function formatEditorText(content = "") {
  content = content.replace(/&lt;/g, "<");
  content = content.replace(/&gt;/g, ">");
  return content;
}

const linebreak = value => {
  let content = value || "";
  content = content
    ? formatEditorText(replaceHTMLEntities(content))
        .split("&#10;")
        .join("<br/>")
        .split("\n")
        .join("<br/>")
    : "";
  content = content.replace(/<p><br><\/p>/g, "<p> </p>");
  return content;
};

const removeHTMLTags = value => {
  if (!value) return "";
  return value.replace(/(<([^>]+)>)/gi, "");
};

const replaceHTMLEntities = str => {
  if (str) {
    return str.replace(/&#(\d+);/g, function(match, dec) {
      return String.fromCharCode(dec);
    });
  }
  return "";
};

const getEUL = run => {
  return run && run["energy-savings"]
    ? _.round(run["energy-savings"]["eul"], 2)
    : null;
};

const _numberWithCommas = (x, calcType) => {
  if (x === 0) return 0;
  if (!x) {
    return "";
  }
  if (calcType === "savings-range") {
    const ranges = x.toString().split(" - ");
    return ranges
      .map(range => {
        const parts = range.toString().split(".");
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        return parts.join(".");
      })
      .join(" - ");
  }
  if (isNaN(x)) {
    return x;
  }
  const num = `${_.round(parseFloat(x), 4)}`;
  const parts = num.toString().split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.join(".");
};

const getTotalEnergySavings = (electric, gas) => {
  const electricSavings = +electric || 0;
  const gasSavings = +gas || 0;
  const total = electricSavings * 3.412 + gasSavings * 99.9761;
  return _.round(total, 2);
};

const getTotalProjectCost = project => {
  let projects = project.projects || [];
  let result = 0;
  for (let item of projects) {
    let initialValues = item.initialValues || {};
    let value = getProjectCost(initialValues) || 0;
    if (!value) value = 0;
    result += +value;
  }
  return result;
};

const getTotalAnnualSavings = (project, buildingId) => {
  let projects = project.projects || [];
  let result = 0;
  for (let item of projects) {
    const runResults = item.runResults && item.runResults[buildingId];
    let value = getAnnualSavings(runResults) || 0;
    if (value === "-") value = 0;
    if (!value) value = 0;
    result += +value;
  }
  return result;
};

const getTotalIncentive = (project, buildingId) => {
  let projects = project.projects || [];
  let result = 0;
  for (let item of projects) {
    const runResults = item.runResults && item.runResults[buildingId];
    let value = getIncentive(runResults) || 0;
    if (!value) value = 0;
    result += +value;
  }
  return result;
};

const getTotalTotalEnergySavings = (project, buildingId) => {
  let projects = project.projects || [];
  let result = 0;
  for (let item of projects) {
    const electricSavings =
      calculateEnergySavings(item, buildingId, "electric") || 0;
    const gasSavings = calculateEnergySavings(item, buildingId, "gas") || 0;
    let value = getTotalEnergySavings(electricSavings, gasSavings) || 0;
    if (!value) value = 0;
    result += +value;
  }
  return result;
};

const calculateTotalEnergySavings = (project, buildingId, key) => {
  let projects = project.projects || [];
  let result = 0;
  for (let item of projects) {
    let value = calculateEnergySavings(item, buildingId, key) || 0;
    if (!value) value = 0;
    result += +value;
  }
  return result;
};

const calculateTotalROI = (project, buildingId) => {
  let projects = project.projects || [];
  let result = 0;
  for (let item of projects) {
    let value = calculateROI(item, buildingId) || 0;
    if (!value) value = 0;
    result += +value;
  }
  if (result < 0) return 0;
  return result;
};

const getTotalNPV = (project, buildingId) => {
  let projects = project.projects || [];
  let result = 0;
  for (let item of projects) {
    let runResults = (item.runResults && item.runResults[buildingId]) || {};
    if (Object.keys(runResults).length === 0) {
      runResults =
        (item.runResultsWithRate && item.runResultsWithRate[buildingId]) || {};
    }
    let value = getNPV(runResults) || 0;
    if (!value) value = 0;
    result += +value;
  }
  if (result < 0) return 0;
  return result;
};

const getTotalSIR = (project, buildingId) => {
  let projects = project.projects || [];
  let result = 0;
  for (let item of projects) {
    let runResults = (item.runResults && item.runResults[buildingId]) || {};
    if (Object.keys(runResults).length === 0) {
      runResults =
        (item.runResultsWithRate && item.runResultsWithRate[buildingId]) || {};
    }
    let value = getSIR(runResults) || 0;
    if (!value) value = 0;
    result += +value;
  }
  if (result < 0) return 0;
  return result;
};

const getTotalGHGSavings = (project, buildingId) => {
  let projects = project.projects || [];
  let result = 0;
  for (let item of projects) {
    let runResults = (item.runResults && item.runResults[buildingId]) || {};
    if (Object.keys(runResults).length === 0) {
      runResults =
        (item.runResultsWithRate && item.runResultsWithRate[buildingId]) || {};
    }
    let value = getGHGSavings(runResults) || 0;
    if (!value) value = 0;
    result += +value;
  }
  return result;
};

const getTotalGHGCost = (project, buildingId) => {
  let projects = project.projects || [];
  let result = 0;
  for (let item of projects) {
    let runResults = (item.runResults && item.runResults[buildingId]) || {};
    if (Object.keys(runResults).length === 0) {
      runResults =
        (item.runResultsWithRate && item.runResultsWithRate[buildingId]) || {};
    }
    let value = getGHGCost(runResults) || 0;
    if (!value) value = 0;
    result += +value;
  }
  return result;
};

const getTotalEUL = (project, buildingId) => {
  let initialValues = (project && project.initialValues) || {};
  let value = initialValues["measureLife"] || 0;
  return value;
};

const getTotalFinancialFunding = project => {
  let projects = project.projects || [];
  let result = 0;
  for (let item of projects) {
    let value =
      (item &&
        item.initialValues &&
        item.initialValues.project_total_financing_funding) ||
      0;
    if (!value) value = 0;
    result += +value;
  }
  return result;
};

const getMedianValue = (values = []) => {
  if (values.length === 0) return null;
  values.sort((a, b) => a - b);
  let lowMiddle = Math.floor((values.length - 1) / 2);
  let highMiddle = Math.ceil((values.length - 1) / 2);
  let median = (values[lowMiddle] + values[highMiddle]) / 2;
  return median;
};

const getTotalSimplePayback = (project, buildingId) => {
  let projects = project.projects || [];
  let values = [];
  for (let item of projects) {
    let runResults = (item.runResults && item.runResults[buildingId]) || {};
    if (Object.keys(runResults).length === 0) {
      runResults =
        (item.runResultsWithRate && item.runResultsWithRate[buildingId]) || {};
    }
    let itemValue = getSimplePayback(runResults) || 0;
    if (itemValue == +itemValue) itemValue = +itemValue;
    if (itemValue) values.push(itemValue);
  }
  return getMedianValue(values) || 0;
};

const getDemandSavings = (project, buildingId, key = "runResults") => {
  if (project[key] && project[key][buildingId]) {
    if (
      !project[key][buildingId]["energy-savings"] ||
      typeof project[key][buildingId]["energy-savings"] !== "object"
    ) {
      return null;
    }

    return project[key][buildingId]["energy-savings"]["demand"];
  }
  return null;
};

const getTotalDemandSavings = (project, buildingId) => {
  let projects = project.projects || [];
  let result = 0;
  for (let item of projects) {
    let value = getDemandSavings(item, buildingId);
    if (!value) value = 0;
    result += +value;
  }
  return result;
};

const getTotalROI = (project, buildingId) => {
  let projects = project.projects || [];
  let result = 0;
  for (let item of projects) {
    const initialValues = item.initialValues || {};
    let run = (item.runResults && item.runResults[buildingId]) || {};
    if (Object.keys(run).length === 0) {
      run =
        (item.runResultsWithRate && item.runResultsWithRate[buildingId]) || {};
    }
    let value = getROI(initialValues, run);
    console.log("item", item._id, value);
    if (!value) value = 0;
    result += +value;
  }
  return result;
};

const getTotalMaintenanceSavings = (project, buildingId) => {
  let projects = project.projects || [];
  let result = 0;
  for (let item of projects) {
    const initialValues = item.initialValues || {};
    let value = getMaintenanceSavings(initialValues) || 0;
    if (!value) value = 0;
    result += +value;
  }
  return result;
};

const hasSubMeasure = project => {
  return (project && project.projects && project.projects.length > 0) || false;
};

const getProjectFinancialValues = (project, key) => {
  let projects = (project && project.projects) || [];
  let values = [];
  for (let project of projects) {
    let initialValues = (project && project.initialValues) || {};
    let value = (initialValues && initialValues[key]) || 0;
    values.push(value);
  }
  values = [...new Set(values)];
  if (values.length === 0) return 0;
  if (values.length > 1) return "Varies";
  return values[0];
};

module.exports = {
  getProjectCost,
  getMaintenanceSavings,
  getIncentive,
  getAnnualSavings,
  getAnnualSavingsRanges,
  getSimplePayback,
  getSIR,
  getNPV,
  getEnergySavings,
  getEnergySavingsRanges,
  getFirstYearCost,
  getGHGSavings,
  getGHGCost,
  getROI,
  calculateROI,
  getNPVLast,
  getEnergySavingsByFuel,
  linebreak,
  getEUL,
  _numberWithCommas,
  getTotalEnergySavings,
  removeHTMLTags,
  getTotalProjectCost,
  getTotalAnnualSavings,
  getTotalTotalEnergySavings,
  getTotalIncentive,
  calculateTotalROI,
  getTotalFinancialFunding,
  calculateTotalEnergySavings,
  getTotalNPV,
  getTotalSIR,
  getTotalGHGSavings,
  getTotalGHGCost,
  getTotalEUL,
  getTotalSimplePayback,
  getDemandSavings,
  getTotalDemandSavings,
  getTotalROI,
  getTotalMaintenanceSavings,
  hasSubMeasure,
  getProjectFinancialValues
};
