const mongoose = require("mongoose");
const utils = require("util");
const _ = require("lodash");
const Project = mongoose.model("Project");
const ProjectPackage = mongoose.model("ProjectPackage");
const MeasurePackage = mongoose.model("MeasurePackage");
const analysisClient = require("./api.analysis.client");
const { getTotalEnergySavings } = require("./project.calculations");
const { getPackageProjectRunResult } = require("./api.scenario.util");
const projectGhgSync = require("../../../scripts/projectghg.script");
const { isEmpty } = require("lodash");

const calculateAnnualSavings = (
  project,
  buildingId,
  sort,
  key = "runResults"
) => {
  if (
    project[key] &&
    project[key][buildingId] &&
    project[key][buildingId]["annual-savings"]
  ) {
    if (project[key][buildingId]["calculation-type"] === "savings-range") {
      let elecrticCharge =
        project[key][buildingId]["annual-savings"]["electric-charge"];
      let gasCharge = project[key][buildingId]["annual-savings"]["gas-charge"];
      let minSavings = elecrticCharge["min-savings"] + gasCharge["min-savings"];
      let maxSavings = elecrticCharge["max-savings"] + gasCharge["max-savings"];
      if (sort === "sort") {
        return Math.ceil(minSavings);
      } else {
        return Math.ceil(minSavings) + " - $" + Math.ceil(maxSavings);
      }
    } else {
      return Math.ceil(
        project[key][buildingId]["annual-savings"]["electric-charge"] +
          project[key][buildingId]["annual-savings"]["gas-charge"]
      );
    }
  } else {
    return null;
  }
};

const calculateAnnualSavingsBreakdown = (
  project,
  buildingId,
  sort,
  key = "runResults"
) => {
  if (
    project[key] &&
    project[key][buildingId] &&
    project[key][buildingId]["annual-savings"]
  ) {
    if (project[key][buildingId]["calculation-type"] === "savings-range") {
      let elecrticCharge =
        project[key][buildingId]["annual-savings"]["electric-charge"];
      let gasCharge = project[key][buildingId]["annual-savings"]["gas-charge"];
      if (sort === "sort") {
        return {annualElectricSavings: elecrticCharge["min-savings"], annualGasSavings: gasCharge["min-savings"]};
      } else {
        return {annualElectricSavings: elecrticCharge["max-savings"], annualGasSavings: gasCharge["max-savings"]};
      }
    } else {
      return {annualElectricSavings: 
        project[key][buildingId]["annual-savings"]["electric-charge"], 
        annualGasSavings: project[key][buildingId]["annual-savings"]["gas-charge"]
      };
    }
  } else {
    return {};
  }
};

const calculateProjectCost = project => {
  if (project.initialValues && project.initialValues["project_cost"]) {
    return Math.ceil(project.initialValues["project_cost"]);
  } else {
    return null;
  }
};

const calculateIncentive = (project, buildingId, key = "runResults") => {
  if (
    project[key] &&
    project[key][buildingId] &&
    project[key][buildingId]["utility-incentive"]
  ) {
    return Math.ceil(project[key][buildingId]["utility-incentive"]);
  } else {
    return null;
  }
};

const calculateGasSavingsCost = (
  project,
  buildingId,
  option,
  sort,
  key = "runResults"
) => {
  if (option === "gas") {
    if (project[key] && project[key][buildingId]) {
      if (
        project[key][buildingId]["energy-savings"] &&
        project[key][buildingId]["energy-savings"][option]
      ) {
        return (
          Math.round(
            (project[key][buildingId]["energy-savings"][option] +
              Number.EPSILON) *
              100
          ) / 100
        );
      } else if (
        project.fuel === option &&
        project[key][buildingId]["energy-savings"]
      ) {
        return (
          Math.round(
            (project[key][buildingId]["energy-savings"] + Number.EPSILON) * 100
          ) / 100
        );
      }
    }
    return null;
  }
};

const calculateGHGSavingsCost = (
  project,
  buildingId,
  option,
  key = "runResults"
) => {
  if (project.fuel === "") {
    project.fuel = "electric";
  }
  if (
    option === "ghg" ||
    option === "ghg-cost" ||
    option === "ghg-electric" ||
    option === "ghg-gas"
  ) {
    if (
      project[key] &&
      project[key][buildingId] &&
      project[key][buildingId][option] &&
      (project[key][buildingId][option] >= 0 ||
        Object.entries(project[key][buildingId][option]).length > 0)
    ) {
      return parseFloat(project[key][buildingId][option]);
    }
  }
};

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

const calculateDemandSavings = (project, buildingId, key = "runResults") => {
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

const calculateEUL = (project, buildingId, key = "runResults") => {
  if (project[key] && project[key][buildingId]) {
    if (
      !project[key][buildingId]["energy-savings"] ||
      typeof project[key][buildingId]["energy-savings"] !== "object"
    ) {
      return null;
    }

    return project[key][buildingId]["energy-savings"]["eul"];
  }
  return null;
};

const calculateROI = (project, buildingId, key = "runResults") => {
  if (
    project[key] &&
    project[key][buildingId] &&
    project[key][buildingId]["calculation-type"] !== "savings-range" &&
    project.initialValues &&
    project.initialValues.project_cost > 0 &&
    calculateAnnualSavings(project, buildingId, "sort", key) > 0
  ) {
    let roi = _.round(
      ((calculateAnnualSavings(project, buildingId, "sort", key) +
        +(project.initialValues.maintenance_savings || 0)) /
        (+(project.initialValues.project_cost || 0) -
          +(project[key][buildingId]["utility-incentive"] || 0))) *
        100
    );
    return isFinite(roi) ? Number(roi) : null;
  } else {
    return null;
  }
};

const getCashFlowsForAnalysisResults = (
  project,
  buildingId,
  key = "runResults"
) => {
  return (
    project[key] &&
    project[key][buildingId] &&
    project[key][buildingId]["calculation-type"] !== "savings-range" &&
    project[key][buildingId]["cash-flows"]
  );
};

const calculateSIR = (project, buildingId) => {
  const cashFlows = getCashFlowsForAnalysisResults(project, buildingId);
  if (
    cashFlows &&
    cashFlows["cash_flows"][0].SIR &&
    calculateAnnualSavings(project, buildingId) > 0
  ) {
    return _.round(Number(cashFlows["cash_flows"].slice(-1)[0].SIR), 2);
  } else {
    return null;
  }
};

const calculateNPV = (project, buildingId) => {
  const cashFlows = getCashFlowsForAnalysisResults(project, buildingId);
  if (
    cashFlows &&
    calculateAnnualSavings(project, buildingId) > 0 &&
    project.initialValues &&
    project.initialValues.project_cost > 0
  ) {
    return Math.ceil(cashFlows["cash_flows"].slice(-1)[0].NPV);
  } else {
    return null;
  }
};

const calculateSimplePayback = (project, buildingId) => {
  const cashFlows = getCashFlowsForAnalysisResults(project, buildingId);
  if (
    cashFlows &&
    cashFlows["simple_payback"] &&
    calculateAnnualSavings(project, buildingId) > 0
  ) {
    return _.round(Number(cashFlows["simple_payback"]), 2);
  } else {
    return null;
  }
};

const calculateProjectPackageTotal = async (buildingId, projectPackageId) => {
  try {
    if (projectPackageId == "") return;
    let projectPackage = await ProjectPackage.findById(projectPackageId)
      .populate({
        path: "projects",
        populate: {
          path: "projects"
        }
      })
      .populate({
        path: "measurePackages",
        populate: { path: "projects" }
      })
      .lean();
    let projectCost = 0,
      incentive = 0,
      annualSavings = 0,
      annualElectricSavings = 0,
      annualGasSavings = 0,
      electric = 0,
      roi = 0,
      simplePayBack = 0,
      npv = 0,
      sir = 0,
      ghgSavings = 0,
      ghgElectric = 0,
      ghgGas = 0,
      ghgSavingsCost = 0,
      waterSavings = 0,
      gasSavings = 0,
      maintenanceSavings = 0,
      calculationType = "",
      demandSavings = 0,
      eul = 0,
      energySavings = 0;

    let projects = mockData(projectPackage) || [];
    for (let project of projects) {
      const key = "runResultsWithRate";
      let calculatedProjectCost = getProjectCost(project) || 0;
      let calculatedIncentive = getIncentive(project, buildingId, key) || 0;
      let calculatedAnnualSavings =
        getAnnualSavings(project, buildingId, "sort", key) || 0;
      let {annualElectricSavings: calculatedAnnualElectricSavings = 0, annualGasSavings: calculatedAnnualGasSavings = 0} =
        getAnnualSavingsBreakdown(project, buildingId, "sort", key) || {};
      let calculatedElectric =
        getEnergySavings(project, buildingId, "electric", "sort", key) || 0;
      let calculatedGHGSavings =
        getGHGSavingsCost(project, buildingId, "ghg", key) || 0;
      calculatedGHGSavings = isFinite(calculatedGHGSavings)
        ? calculatedGHGSavings
        : 0;
      let calculatedGHGElectric =
        getGHGSavingsCost(project, buildingId, "ghg-electric", key) || 0;
      calculatedGHGElectric = isFinite(calculatedGHGElectric)
        ? calculatedGHGElectric
        : 0;
      let calculatedGHGGas =
        getGHGSavingsCost(project, buildingId, "ghg-gas", key) || 0;
      calculatedGHGGas = isFinite(calculatedGHGGas) ? calculatedGHGGas : 0;
      let calculatedGHGSavingsCost =
        getGHGSavingsCost(project, buildingId, "ghg-cost", key) || 0;
      calculatedGHGSavingsCost = isFinite(calculatedGHGSavingsCost)
        ? calculatedGHGSavingsCost
        : 0;
      let calculatedWaterSavings =
        getEnergySavings(project, buildingId, "water", "sort", key) || 0;
      let calculatedGasSavingsCost =
        getGasSavingsCost(project, buildingId, "gas", key) || 0;
      let calculatedEnergySavings = getTotalEnergySavingsValue(
        project,
        buildingId,
        key
      );
      let calculatedDemandSavings =
        getDemandSavings(project, buildingId, key) || 0;
      let calculatedEUL = getEUL(project, buildingId, key) || 0;
      if (calculationType === "")
        calculationType = getCalculationType(project, buildingId, key) || "";
      projectCost += calculatedProjectCost;
      incentive += calculatedIncentive;
      annualSavings += calculatedAnnualSavings;
      annualElectricSavings += calculatedAnnualElectricSavings;
      annualGasSavings += calculatedAnnualGasSavings;
      electric += calculatedElectric;
      ghgSavingsCost += calculatedGHGSavingsCost;
      ghgSavings += calculatedGHGSavings;
      ghgElectric += calculatedGHGElectric;
      ghgGas += calculatedGHGGas;
      gasSavings += calculatedGasSavingsCost;
      waterSavings += calculatedWaterSavings;
      demandSavings += calculatedDemandSavings;
      eul += Number(calculatedEUL);
      maintenanceSavings += getMaintenanceSavings(project, key) || 0;
      energySavings = Number(energySavings) + Number(calculatedEnergySavings);
    }
    if (projects.length == 1) {
      let projectData = projects[0];
      if (projectData.projects && projectData.projects.length > 0) {
        roi = getROI(projectData, buildingId, "runResultsWithRate");
        simplePayBack = getSimplePayback(
          projectData,
          buildingId,
          "runResultsWithRate"
        );
        npv = getNPV(projectData, buildingId, "runResultsWithRate");
        sir = getSIR(projectData, buildingId, "runResultsWithRate");
      } else {
        roi = calculateROI(projects[0], buildingId, "runResultsWithRate");
        simplePayBack = calculateSimplePayback(
          projects[0],
          buildingId,
          "runResultsWithRate"
        );
        npv = calculateNPV(projects[0], buildingId, "runResultsWithRate");
        sir = calculateSIR(projects[0], buildingId, "runResultsWithRate");
      }
    } else if (projects.length > 1) {
      roi = _.round(
        ((annualSavings + maintenanceSavings) / (projectCost - incentive)) * 100
      );
      roi = isFinite(roi) ? Number(roi) : 0;
      const requestBody = {
        project_cost: projectCost,
        incentive: incentive,
        annual_savings: annualSavings,
        maintenance_savings: maintenanceSavings,
        discount_rate:
          ((projectPackage &&
            projectPackage.rates &&
            projectPackage.rates.financeRate) ||
            0) / 100,
        finance_rate:
          ((projectPackage &&
            projectPackage.rates &&
            projectPackage.rates.discountRate) ||
            0) / 100,
        inflation_rate:
          ((projectPackage &&
            projectPackage.rates &&
            projectPackage.rates.inflationRate) ||
            0) / 100,
        reinvestment_rate:
          ((projectPackage &&
            projectPackage.rates &&
            projectPackage.rates.reinvestmentRate) ||
            0) / 100,
        investment_period:
          (projectPackage &&
            projectPackage.rates &&
            projectPackage.rates.investmentPeriod) ||
          0
      };
      const asyncFuc = utils.promisify(analysisClient.getCashFlow);
      let data = await asyncFuc(requestBody);
      data = JSON.parse(data);
      simplePayBack = data.simple_payback || 0;
      let cashFlows = data.cash_flows || [];
      if (cashFlows && cashFlows[0] && cashFlows[0].SIR && annualSavings > 0) {
        sir = _.round(Number(cashFlows.slice(-1)[0].SIR), 2);
      } else sir = 0;
      if (cashFlows && annualSavings > 0) {
        npv = Math.ceil(
          (cashFlows.slice(-1)[0] && cashFlows.slice(-1)[0].NPV) || 0
        );
      } else npv = 0;
    }
    let updateProjectPackage = await ProjectPackage.findById(
      projectPackage._id
    );
    updateProjectPackage.total = {
      projectCost,
      incentive,
      annualSavings,
      annualElectricSavings,
      annualGasSavings,
      electric,
      gasSavings,
      ghgSavings,
      ghgSavingsCost,
      waterSavings,
      roi,
      simplePayBack,
      npv,
      sir,
      demandSavings,
      eul,
      calculationType,
      energySavings,
      maintenanceSavings,
      ghgElectric,
      ghgGas
    };
    updateProjectPackage.markModified("total");
    updateProjectPackage = await updateProjectPackage.save();
    return;
  } catch (error) {
    console.log(error);
    return;
  }
};

const calculateAllProjectPackageTotal = async buildingId => {
  try {
    let projectPackages = await ProjectPackage.find({
      buildingId: buildingId
    }).lean();
    for (let projectPackage of projectPackages) {
      await calculateProjectPackageTotal(buildingId, projectPackage._id);
    }
    return;
  } catch (err) {
    return;
  }
};

const removeProjectFromProjectPackage = async (
  buildingId,
  projectPackageId,
  projectId,
  type = "project"
) => {
  try {
    if (!projectPackageId || !projectId) return;
    const projectPackage = await ProjectPackage.findById(projectPackageId);
    if (projectPackage) {
      if (type === "project") {
        let projectIds = (projectPackage && projectPackage.projects) || [];
        projectIds = projectIds
          .map(id => id.toString())
          .filter(id => id != projectId);
        projectPackage.projects = projectIds;
        projectPackage.markModified("projects");
      } else {
        let measurePackageIds =
          (projectPackage && projectPackage.measurePackages) || [];
        measurePackageIds = measurePackageIds
          .map(id => id.toString())
          .filter(id => id != projectId);
        projectPackage.measurePackages = measurePackageIds;
        projectPackage.markModified("measurePackages");
      }
      await projectPackage.save();
      await calculateProjectPackageTotal(buildingId, projectPackageId);
    }
    return;
  } catch (error) {
    console.log(error);
    return;
  }
};

const addProjectToProjectPackage = async (
  buildingId,
  projectPackageId,
  projectId,
  type = "project"
) => {
  try {
    if (!projectPackageId || !projectId) return;
    const projectPackage = await ProjectPackage.findById(projectPackageId);
    if (projectPackage) {
      if (type === "project") {
        let projectIds = (projectPackage && projectPackage.projects) || [];
        projectIds = projectIds
          .map(id => id.toString())
          .filter(id => id != projectId);
        projectIds = [...projectIds, projectId];
        projectPackage.projects = projectIds;
        projectPackage.markModified("projects");
      } else {
        let measurePackageIds =
          (projectPackage && projectPackage.measurePackages) || [];
        measurePackageIds = measurePackageIds
          .map(id => id.toString())
          .filter(id => id != projectId);
        measurePackageIds = [...measurePackageIds, projectId];
        projectPackage.measurePackages = measurePackageIds;
        projectPackage.markModified("measurePackages");
      }
      await projectPackage.save();
      await calculateProjectPackageTotal(buildingId, projectPackageId);
    }
    return;
  } catch (error) {
    console.log(error);
    return;
  }
};

const runProjectWithRates = async (projectId, buildingId) => {
  try {
    let project = await Project.findById(projectId)
      .populate("package")
      .exec();
    if (!project || !project.package) return {};
    let result = await getPackageProjectRunResult(
      project,
      buildingId,
      project.package.rates
    );
    return result;
  } catch (error) {
    console.log(error);
    return {};
  }
};

const calculateMetric = (project, buildingId, key = "runResults") => {
  let {annualElectricSavings = 0, annualGasSavings = 0} =
        calculateAnnualSavingsBreakdown(project, buildingId, "sort", key) || {};
  let metric = {
    projectCost: calculateProjectCost(project) || 0,
    annualSavings:
      calculateAnnualSavings(project, buildingId, "sort", key) || 0,
    annualElectricSavings,
    annualGasSavings,
    electricSavings:
      calculateEnergySavings(project, buildingId, "electric", "sort", key) || 0,
    gasSavings: calculateGasSavingsCost(project, buildingId, "gas", key) || 0,
    ghgSavings: calculateGHGSavingsCost(project, buildingId, "ghg", key) || 0,
    ghgElectric:
      calculateGHGSavingsCost(project, buildingId, "ghg-electric", key) || 0,
    ghgGas: calculateGHGSavingsCost(project, buildingId, "ghg-gas", key) || 0,
    ghgSavingsCost:
      calculateGHGSavingsCost(project, buildingId, "ghg-cost", key) || 0,
    energySavings: getTotalEnergySavings(
      calculateEnergySavings(project, buildingId, "electric", "sort", key) || 0,
      calculateGasSavingsCost(project, buildingId, "gas", key) || 0
    ),
    waterSavings:
      calculateEnergySavings(project, buildingId, "water", "sort", key) || 0,
    incentive: calculateIncentive(project, buildingId) || 0,
    roi: calculateROI(project, buildingId) || 0,
    simple_payback:
      (calculateSimplePayback(project, buildingId) > 0 &&
        calculateSimplePayback(project, buildingId)) ||
      0,
    npv: calculateNPV(project, buildingId) || 0,
    sir: calculateSIR(project, buildingId) || 0,
    demandSavings: calculateDemandSavings(project, buildingId) || 0,
    eul: calculateEUL(project, buildingId) || project.measureLife || 0,
    calculationType:
      (project &&
        project[key] &&
        project[key][buildingId] &&
        project[key][buildingId]["calculation-type"]) ||
      "",
    maintenanceSavings:
      (project &&
        project.initialValues &&
        project.initialValues.maintenance_savings) ||
      0
  };
  return metric;
};

const getSimplePaybackFromCashFlow = data => {
  return data?.simple_payback || 0;
};

const getNPVFromCashFlow = (data, annualSavings) => {
  let npv;
  let cashFlows = data.cash_flows || [];
  if (!isEmpty(cashFlows) && annualSavings > 0) {
    npv = Math.ceil(cashFlows.slice(-1)[0].NPV);
  } else npv = 0;
  return npv;
};

const getSIRFromCashFlow = (data, annualSavings) => {
  let cashFlows = data.cash_flows || [];
  let sir;
  if (
    !isEmpty(cashFlows) &&
    cashFlows[0] &&
    cashFlows[0].SIR &&
    annualSavings > 0
  ) {
    sir = Number(cashFlows.slice(-1)[0].SIR.toFixed(2));
  } else sir = 0;
  return sir;
};

const calculateMetricForProjectWithSubProject = async (
  projectId,
  buildingId,
  cashFlowData = {},
  length,
  key = "runResults"
) => {
  try {
    if (projectId == "") return {};
    let allProject = await Project.findById(projectId)
      .populate("projects")
      .lean();
    let projectCost = 0,
      incentive = 0,
      annualSavings = 0,
      annualElectricSavings = 0,
      annualGasSavings = 0,
      electric = 0,
      roi = 0,
      simplePayBack = 0,
      npv = 0,
      sir = 0,
      ghgSavings = 0,
      ghgSavingsCost = 0,
      waterSavings = 0,
      gasSavings = 0,
      maintenanceSavings = 0,
      calculationType = "",
      demandSavings = 0,
      eul = 0,
      energySavings = 0,
      ghgElectric = 0,
      ghgGas = 0;

    let projects = allProject.projects || [];
    for (let project of projects) {
      let metric = calculateMetric(project, buildingId, key);
      let calculatedProjectCost = metric.projectCost || 0;
      let calculatedIncentive = metric.incentive || 0;
      let calculatedAnnualSavings = metric.annualSavings || 0;
      let calculatedAnnualElectricSavings = metric.annualElectricSavings || 0;
      let calculatedAnnualGasSavings = metric.annualGasSavings || 0;
      let calculatedElectric = metric.electricSavings || 0;
      let calculatedGHGSavings = metric.ghgSavings || 0;
      let calculatedGHGElectric = metric.ghgElectric || 0;
      let calculatedGHGGas = metric.ghgGas || 0;
      calculatedGHGSavings = isFinite(calculatedGHGSavings)
        ? calculatedGHGSavings
        : 0;
      let calculatedGHGSavingsCost = metric.ghgSavingsCost;
      calculatedGHGSavingsCost = isFinite(calculatedGHGSavingsCost)
        ? calculatedGHGSavingsCost
        : 0;
      let calculatedWaterSavings = metric.waterSavings || 0;
      let calculatedGasSavingsCost = metric.gasSavings || 0;
      let calculatedEnergySavings = metric.energySavings || 0;
      let calculatedDemandSavings = metric.demandSavings || 0;
      let calculatedEUL = metric.eul || project.measureLife || 0;
      let simple_payback = metric.simple_payback || 0;
      if (calculationType === "")
        calculationType = metric.calculationType || "";
      projectCost += calculatedProjectCost;
      incentive += calculatedIncentive;
      annualSavings += calculatedAnnualSavings;
      annualElectricSavings += calculatedAnnualElectricSavings;
      annualGasSavings += calculatedAnnualGasSavings;
      electric += calculatedElectric;
      ghgSavingsCost += calculatedGHGSavingsCost;
      ghgSavings += calculatedGHGSavings;
      ghgElectric += calculatedGHGElectric;
      ghgGas += calculatedGHGGas;
      gasSavings += calculatedGasSavingsCost;
      waterSavings += calculatedWaterSavings;
      demandSavings += calculatedDemandSavings;
      eul = Math.max(eul, Number(calculatedEUL));
      simplePayBack = Math.max(simplePayBack, simple_payback);
      maintenanceSavings +=
        (project &&
          project.initialValues &&
          project.initialValues.maintenance_savings) ||
        0;
      energySavings = Number(energySavings) + Number(calculatedEnergySavings);
    }
    total = {
      projectCost,
      incentive,
      annualSavings,
      annualElectricSavings,
      annualGasSavings,
      electric,
      gasSavings,
      ghgSavings,
      ghgSavingsCost,
      waterSavings,
      roi,
      simplePayBack:
        length > 1 ? getSimplePaybackFromCashFlow(cashFlowData) : simplePayBack,
      npv: length > 1 ? getNPVFromCashFlow(cashFlowData, annualSavings) : npv,
      sir: length > 1 ? getSIRFromCashFlow(cashFlowData, annualSavings) : sir,
      demandSavings,
      eul,
      calculationType,
      energySavings,
      maintenanceSavings,
      ghgElectric,
      ghgGas
    };
    return total;
  } catch (error) {
    console.log(error);
    return {};
  }
};

const calculateMetricForScenario = (buildingIds, projects) => {
  let totalProjectCost = 0,
    totalAnnualSavings = 0,
    totalElectricSavings = 0,
    totalGasSavings = 0,
    totalGhgSavings = 0,
    totalGhgSavingsCost = 0,
    totalEnergySavings = 0,
    totalWaterSavings = 0,
    totalIncentive = 0,
    totalROI = 0,
    totalSimplePayBack = 0,
    totalNPV = 0,
    totalSIR = 0,
    totalDemandSavings = 0,
    totalEUL = 0,
    totalMaintenanceSavings = 0,
    totalGhgElectric = 0,
    totalGhgGas = 0;
  for (let buildingId of buildingIds) {
    for (let project of projects) {
      let projectCost = calculateProjectCost(project) || 0;
      let annualSavings =
        calculateAnnualSavings(project, buildingId, "sort") || 0;
      let electricSavings =
        calculateEnergySavings(project, buildingId, "electric", "sort") || 0;
      let gasSavings = calculateGasSavingsCost(project, buildingId, "gas") || 0;
      let ghgSavings = calculateGHGSavingsCost(project, buildingId, "ghg") || 0;
      let ghgelectric =
        calculateGHGSavingsCost(project, buildingId, "ghg-electric") || 0;
      let ghgGas = calculateGHGSavingsCost(project, buildingId, "ghg-gas") || 0;
      let ghgSavingsCost =
        calculateGHGSavingsCost(project, buildingId, "ghg-cost") || 0;
      let energySavings = getTotalEnergySavings(
        calculateEnergySavings(project, buildingId, "electric", "sort") || 0,
        calculateGasSavingsCost(project, buildingId, "gas") || 0
      );
      let waterSavings =
        calculateEnergySavings(project, buildingId, "water", "sort") || 0;
      let incentive = calculateIncentive(project, buildingId) || 0;
      let roi = calculateROI(project, buildingId) || 0;
      let simple_payback = calculateSimplePayback(project, buildingId) || 0;
      let npv = calculateNPV(project, buildingId) || 0;
      let sir = calculateSIR(project, buildingId) || 0;
      let demandSavings = calculateDemandSavings(project, buildingId) || 0;
      let eul = calculateEUL(project, buildingId) || 0;
      let maintenanceSavings =
        (project &&
          project.initialValues &&
          project.initialValues.maintenance_savings) ||
        0;
      totalProjectCost = totalProjectCost + projectCost;
      totalAnnualSavings = totalAnnualSavings + annualSavings;
      totalElectricSavings = totalElectricSavings + electricSavings;
      totalGasSavings = totalGasSavings + gasSavings;
      totalGhgSavings = totalGhgSavings + ghgSavings;
      totalGhgSavingsCost = totalGhgSavingsCost + ghgSavingsCost;
      totalEnergySavings = totalEnergySavings + energySavings;
      totalWaterSavings = totalWaterSavings + waterSavings;
      totalIncentive = totalIncentive + incentive;
      totalROI = totalROI + roi;
      totalSimplePayBack = totalSimplePayBack + simple_payback;
      totalNPV = totalNPV + npv;
      totalSIR = totalSIR + sir;
      totalDemandSavings = totalDemandSavings + demandSavings;
      totalEUL = totalEUL + eul;
      totalMaintenanceSavings = totalMaintenanceSavings + maintenanceSavings;
      totalGhgElectric = totalGhgElectric + ghgelectric;
      totalGhgGas = totalGhgGas + ghgGas;
    }
  }
  return {
    projectCost: totalProjectCost,
    annualSavings: totalAnnualSavings,
    electricSavings: totalElectricSavings,
    gasSavings: totalGasSavings,
    ghgSavings: totalGhgSavings,
    ghgSavingsCost: totalGhgSavingsCost,
    energySavings: totalEnergySavings,
    waterSavings: totalWaterSavings,
    incentive: totalIncentive,
    roi: totalROI,
    simple_payback: totalSimplePayBack,
    npv: totalNPV,
    sir: totalSIR,
    demandSavings: totalDemandSavings,
    eul: totalEUL,
    maintenanceSavings: totalMaintenanceSavings,
    ghgElectric: totalGhgElectric,
    ghgGas: totalGhgGas
  };
};

const calculateMeasurePackageTotal = async (
  buildingId,
  measurePackageId,
  key = "runResults"
) => {
  try {
    if (measurePackageId == "") return {};
    let measurePackage = await MeasurePackage.findById(measurePackageId)
      .populate("projects")
      .lean();
    let projectCost = 0,
      incentive = 0,
      annualSavings = 0,
      annualElectricSavings = 0,
      annualGasSavings = 0,
      electric = 0,
      roi = 0,
      simplePayBack = 0,
      npv = 0,
      sir = 0,
      ghgSavings = 0,
      ghgSavingsCost = 0,
      waterSavings = 0,
      gasSavings = 0,
      maintenanceSavings = 0,
      calculationType = "",
      demandSavings = 0,
      eul = 0,
      energySavings = 0,
      ghgElectric = 0,
      ghgGas = 0;

    let projects = measurePackage.projects || [];
    for (let project of projects) {
      let metric = calculateMetric(project, buildingId, key);
      let calculatedProjectCost = metric.projectCost || 0;
      let calculatedIncentive = metric.incentive || 0;
      let calculatedAnnualSavings = metric.annualSavings || 0;
      let calculatedAnnualElectricSavings = metric.annualElectricSavings || 0;
      let calculatedAnnualGasSavings = metric.annualGasSavings || 0;
      let calculatedElectric = metric.electricSavings || 0;
      let calculatedGHGSavings = metric.ghgSavings || 0;
      let calculatedGHGElectric = metric.ghgElectric || 0;
      let calculatedGHGGas = metric.ghgGas || 0;
      calculatedGHGSavings = isFinite(calculatedGHGSavings)
        ? calculatedGHGSavings
        : 0;
      let calculatedGHGSavingsCost = metric.ghgSavingsCost;
      calculatedGHGSavingsCost = isFinite(calculatedGHGSavingsCost)
        ? calculatedGHGSavingsCost
        : 0;
      let calculatedWaterSavings = metric.waterSavings || 0;
      let calculatedGasSavingsCost = metric.gasSavings || 0;
      let calculatedEnergySavings = metric.energySavings || 0;
      let calculatedDemandSavings = metric.demandSavings || 0;
      let calculatedEUL = metric.eul || project.measureLife || 0;
      let simple_payback = metric.simple_payback || 0;
      if (calculationType === "")
        calculationType = metric.calculationType || "";
      projectCost += calculatedProjectCost;
      incentive += calculatedIncentive;
      annualSavings += calculatedAnnualSavings;
      annualElectricSavings += calculatedAnnualElectricSavings;
      annualGasSavings += calculatedAnnualGasSavings;
      electric += calculatedElectric;
      ghgSavingsCost += calculatedGHGSavingsCost;
      ghgSavings += calculatedGHGSavings;
      ghgElectric += calculatedGHGElectric;
      ghgGas += calculatedGHGGas;
      gasSavings += calculatedGasSavingsCost;
      waterSavings += calculatedWaterSavings;
      demandSavings += calculatedDemandSavings;
      eul = Math.max(eul, Number(calculatedEUL));
      simplePayBack = Math.max(simplePayBack, simple_payback);
      maintenanceSavings +=
        (project &&
          project.initialValues &&
          project.initialValues.maintenance_savings) ||
        0;
      energySavings = Number(energySavings) + Number(calculatedEnergySavings);
    }
    total = {
      projectCost,
      incentive,
      annualSavings,
      annualElectricSavings,
      annualGasSavings,
      electric,
      gasSavings,
      ghgSavings,
      ghgSavingsCost,
      waterSavings,
      roi,
      simplePayBack,
      npv,
      sir,
      demandSavings,
      eul,
      calculationType,
      energySavings,
      maintenanceSavings,
      ghgElectric,
      ghgGas
    };
    return total;
  } catch (error) {
    console.log(error);
    return {};
  }
};

const mockData = data => {
  let projects = data.projects || data.measures || [];
  let measurePackages = data.measurePackages || [];
  projects = projects.map(project => {
    return {
      ...project,
      collectionTarget: "measure"
    };
  });
  measurePackages = measurePackages.map(measurePackage => {
    let projects = measurePackage.projects || [];
    projects = projects.map(project => {
      return {
        ...project,
        collectionTarget: "measure"
      };
    });
    return {
      ...measurePackage,
      projects,
      collectionTarget: "measurePackage"
    };
  });
  return [...projects, ...measurePackages];
};

const getProjectCost = project => {
  if (!project) return null;
  let collectionTarget = project.collectionTarget || "measure";
  if (collectionTarget === "measure") {
    if (project && project.projects && project.projects.length) {
      let value = 0;
      for (let item of project.projects) {
        let itemValue = calculateProjectCost(item) || 0;
        if (itemValue == +itemValue) itemValue = +itemValue;
        value += itemValue;
      }
      return value;
    }
    return calculateProjectCost(project) || 0;
  } else {
    return (project.total && project.total.projectCost) || 0;
  }
};

const getIncentive = (project, buildingId, key = "runResults") => {
  if (!project) return null;
  let collectionTarget = project.collectionTarget || "measure";
  if (collectionTarget === "measure") {
    if (project && project.projects && project.projects.length) {
      let value = 0;
      for (let item of project.projects) {
        let itemValue = calculateIncentive(item, buildingId, key) || 0;
        if (itemValue == +itemValue) itemValue = +itemValue;
        value += itemValue;
      }
      return value;
    }
    return calculateIncentive(project, buildingId, key);
  } else {
    let total = {};
    if (key === "runResults") total = project.total || {};
    else total = project.totalWithRates || {};
    return total && total.incentive;
  }
};

const getAnnualSavings = (
  project,
  buildingId,
  sort = "sort",
  key = "runResults"
) => {
  if (!project) return null;
  let collectionTarget = project.collectionTarget || "measure";
  if (collectionTarget === "measure") {
    if (project && project.projects && project.projects.length) {
      let value = 0;
      for (let item of project.projects) {
        let itemValue =
          calculateAnnualSavings(item, buildingId, sort, key) || 0;
        if (itemValue == +itemValue) itemValue = +itemValue;
        value += +itemValue;
      }
      return value;
    }
    return calculateAnnualSavings(project, buildingId, sort, key);
  } else {
    let total = {};
    if (key === "runResults") total = project.total || {};
    else total = project.totalWithRates || {};
    return total && total.annualSavings;
  }
};

const getAnnualSavingsBreakdown = (
  project,
  buildingId,
  sort = "sort",
  key = "runResults"
) => {
  if (!project) return null;
  let collectionTarget = project.collectionTarget || "measure";
  if (collectionTarget === "measure") {
    return calculateAnnualSavingsBreakdown(project, buildingId, sort, key);
  } else {
    let total = {};
    if (key === "runResults") total = project.total || {};
    else total = project.totalWithRates || {};
    return total && {annualElectricSavings: total.annualElectricSavings, annualGasSavings: total.annualGasSavings };
  }
};

const getROI = (project, buildingId, key = "runResults") => {
  if (!project) return null;
  let collectionTarget = project.collectionTarget || "measure";
  if (collectionTarget === "measure") {
    if (project && project.projects && project.projects.length) {
      let value = 0;
      for (let item of project.projects) {
        let itemValue = calculateROI(item, buildingId, key) || 0;
        if (itemValue == +itemValue) itemValue = +itemValue;
        value += itemValue;
      }
      return value;
    }
    return calculateROI(project, buildingId, key);
  } else {
    let total = {};
    if (key === "runResults") total = project.total || {};
    else total = project.totalWithRates || {};
    return total && total.roi;
  }
};

const getMedianValue = (values = []) => {
  if (values.length === 0) return null;
  values.sort((a, b) => a - b);
  let lowMiddle = Math.floor((values.length - 1) / 2);
  let highMiddle = Math.ceil((values.length - 1) / 2);
  let median = (values[lowMiddle] + values[highMiddle]) / 2;
  return median;
};

const getSimplePayback = (project, buildingId, key = "runResults") => {
  if (!project) return null;
  let collectionTarget = project.collectionTarget || "measure";
  if (collectionTarget === "measure") {
    if (project && project.projects && project.projects.length) {
      let values = [];
      let { cashFlowData = {} } = project;
      if (!_.isEmpty(cashFlowData) && project.projects.length > 1) {
        return getSimplePaybackFromCashFlow(cashFlowData);
      }
      for (let item of project.projects) {
        let itemValue = calculateSimplePayback(item, buildingId, key) || 0;
        if (itemValue == +itemValue) itemValue = +itemValue;
        if (itemValue) values.push(itemValue);
      }
      return getMedianValue(values) || 0;
    }
    return calculateROI(project, buildingId, key);
  } else {
    let total = {};
    if (key === "runResults") total = project.total || {};
    else total = project.totalWithRates || {};
    return total && total.simplePayBack;
  }
};

const getNPV = (project, buildingId, key = "runResults") => {
  if (!project) return null;
  let collectionTarget = project.collectionTarget || "measure";
  if (collectionTarget === "measure") {
    if (project && project.projects && project.projects.length) {
      let value = 0;
      let { cashFlowData = {} } = project;
      if (!_.isEmpty(cashFlowData) && project && project.projects.length > 1) {
        const annualSavings = getAnnualSavings(project, buildingId);
        return getNPVFromCashFlow(cashFlowData, annualSavings);
      }
      for (let item of project.projects) {
        let itemValue = calculateNPV(item, buildingId, key) || 0;
        if (itemValue == +itemValue) itemValue = +itemValue;
        value += itemValue;
      }
      return value;
    }
    return calculateNPV(project, buildingId, key);
  } else {
    let total = {};
    if (key === "runResults") total = project.total || {};
    else total = project.totalWithRates || {};
    return total && total.npv;
  }
};

const getSIR = (project, buildingId, key = "runResults") => {
  if (!project) return null;
  let collectionTarget = project.collectionTarget || "measure";
  if (collectionTarget === "measure") {
    if (project && project.projects && project.projects.length) {
      let value = 0;
      let { cashFlowData } = project;
      if (!_.isEmpty(cashFlowData) && project.projects.length > 1) {
        const annualSavings = getAnnualSavings(project, buildingId);
        return getSIRFromCashFlow(cashFlowData, annualSavings);
      }
      for (let item of project.projects) {
        let itemValue = calculateSIR(item, buildingId, key);
        if (itemValue == +itemValue) itemValue = +itemValue;
        value += itemValue;
      }
      return value;
    }
    return calculateSIR(project, buildingId, key);
  } else {
    let total = {};
    if (key === "runResults") total = project.total || {};
    else total = project.totalWithRates || {};
    return total && total.sir;
  }
};

const getDemandSavings = (project, buildingId, key = "runResults") => {
  if (!project) return null;
  let collectionTarget = project.collectionTarget || "measure";
  if (collectionTarget === "measure") {
    if (project && project.projects && project.projects.length) {
      let value = 0;
      for (let item of project.projects) {
        let itemValue = calculateDemandSavings(item, buildingId, key) || 0;
        if (itemValue == +itemValue) itemValue = +itemValue;
        if (!isFinite(itemValue)) itemValue = 0;
        value += itemValue;
      }
      return value;
    }
    return calculateDemandSavings(project, buildingId, key);
  } else {
    let total = {};
    if (key === "runResults") total = project.total || {};
    else total = project.totalWithRates || {};
    return total && total.demandSavings;
  }
};

const getEUL = (project, buildingId, key = "runResults") => {
  if (!project) return null;
  let collectionTarget = project.collectionTarget || "measure";
  if (collectionTarget === "measure") {
    if (project && project.projects && project.projects.length) {
      let value = 0;
      for (let item of project.projects) {
        let itemValue =
          calculateEUL(item, buildingId, key) || item.measureLife || 0;
        value = Math.max(value, Number(itemValue));
      }
      return value;
    }
    return calculateEUL(project, buildingId, key) || project.measureLife;
  } else {
    let total = {};
    if (key === "runResults") total = project.total || {};
    else total = project.totalWithRates || {};
    return total && total.eul;
  }
};

const getMaintenanceSavings = (project, key = "runResults") => {
  if (!project) return null;
  let collectionTarget = project.collectionTarget || "measure";
  if (collectionTarget === "measure") {
    if (project && project.projects && project.projects.length) {
      let value = 0;
      for (let item of project.projects) {
        let itemValue =
          (item.initialValues && item.initialValues.maintenance_savings) || 0;
        if (itemValue == +itemValue) itemValue = +itemValue;
        if (isNaN(itemValue)) itemValue = 0;
        value += itemValue;
      }
      return value;
    }
    return (
      +(project.initialValues && project.initialValues.maintenance_savings) || 0
    );
  } else {
    let total = {};
    if (key === "runResults") total = project.total || {};
    else total = project.totalWithRates || {};
    return total && +total.maintenanceSavings;
  }
};

const getEnergySavings = (
  project,
  buildingId,
  fuel,
  sort = "sort",
  key = "runResults"
) => {
  if (!project) return null;
  let collectionTarget = project.collectionTarget || "measure";
  if (collectionTarget === "measure") {
    if (project && project.projects && project.projects.length) {
      let value = 0;
      for (let item of project.projects) {
        let itemValue =
          calculateEnergySavings(item, buildingId, fuel, sort, key) || 0;
        if (itemValue == +itemValue) itemValue = +itemValue;
        if (!isFinite(itemValue)) itemValue = 0;
        value += itemValue;
      }
      return value;
    }
    return calculateEnergySavings(project, buildingId, fuel, sort, key);
  } else {
    let total = {};
    if (key === "runResults") total = project.total || {};
    else total = project.totalWithRates || {};
    switch (fuel) {
      case "electric":
        return total && total.electric;
      case "water":
        return total && total.waterSavings;
      default:
        return null;
    }
  }
};

const getGHGSavingsCost = (project, buildingId, option, key = "runResults") => {
  if (!project) return null;
  let collectionTarget = project.collectionTarget || "measure";
  if (collectionTarget === "measure") {
    if (project && project.projects && project.projects.length) {
      let value = 0;
      for (let item of project.projects) {
        let itemValue =
          calculateGHGSavingsCost(item, buildingId, option, key) || 0;
        if (itemValue == +itemValue) itemValue = +itemValue;
        if (!isFinite(itemValue)) itemValue = 0;
        value += itemValue;
      }
      return value;
    }
    return calculateGHGSavingsCost(project, buildingId, option, key);
  } else {
    let total = {};
    if (key === "runResults") total = project.total || {};
    else total = project.totalWithRates || {};
    switch (option) {
      case "ghg":
        return total && total.ghgSavings;
      case "ghg-cost":
        return total && total.ghgSavingsCost;
      case "ghg-electric":
        return total && total.ghgElectric;
      case "ghg-gas":
        return total && total.ghgGas;
      default:
        return null;
    }
  }
};

const getGasSavingsCost = (project, buildingId, data, key = "runResults") => {
  if (!project) return null;
  let collectionTarget = project.collectionTarget || "measure";
  if (collectionTarget === "measure") {
    return calculateGasSavingsCost(project, buildingId, data, key);
  } else {
    let total = {};
    if (key === "runResults") total = project.total || {};
    else total = project.totalWithRates || {};
    switch (data) {
      case "gas":
        return total && total.gasSavings;
      default:
        return null;
    }
  }
};

const getTotalEnergySavingsValue = (
  project,
  buildingId,
  key = "runResults"
) => {
  if (!project) return null;
  let collectionTarget = project.collectionTarget || "measure";
  if (collectionTarget === "measure") {
    if (project && project.projects && project.projects.length) {
      let totalValue = 0;
      for (let item of project.projects) {
        let electric =
          calculateEnergySavings(item, buildingId, "electric", "sort", key) ||
          0;
        let gas = calculateGasSavingsCost(item, buildingId, "gas", key) || 0;
        let itemValue = getTotalEnergySavings(electric, gas) || 0;
        if (itemValue == +itemValue) itemValue = +itemValue;
        totalValue += itemValue;
      }
      return totalValue;
    }
    let electric =
      calculateEnergySavings(project, buildingId, "electric", "sort", key) || 0;
    let gas = calculateGasSavingsCost(project, buildingId, "gas", key) || 0;
    return getTotalEnergySavings(electric, gas) || 0;
  } else {
    let total = {};
    if (key === "runResults") total = project.total || {};
    else total = project.totalWithRates || {};
    return total && total.energySavings;
  }
};

const getCalculationType = (project, buildingId, key = "runResults") => {
  if (!project) return null;
  let collectionTarget = project.collectionTarget || "measure";
  if (collectionTarget === "measure") {
    return (
      project &&
      project[key] &&
      project[key][buildingId] &&
      project[key][buildingId]["calculation-type"]
    );
  } else {
    let total = {};
    if (key === "runResults") total = project.total || {};
    else total = project.totalWithRates || {};
    return total && total.calculationType;
  }
};

const getCategory = project => {
  if (!project) return null;
  let collectionTarget = project.collectionTarget || "measure";
  if (collectionTarget === "measure") return project.project_category;
  return project.category && project.category.displayName;
};

const getApplication = project => {
  if (!project) return null;
  let collectionTarget = project.collectionTarget || "measure";
  if (collectionTarget === "measure") return project.project_application;
  return project.application && project.application.displayName;
};

const getTechnology = project => {
  if (!project) return null;
  let collectionTarget = project.collectionTarget || "measure";
  if (collectionTarget === "measure") return project.project_technology;
  return project.technology && project.technology.displayName;
};

const getProposalProjectTotal = async projectId => {
  try {
    let total = {};
    let projectPackage = await ProjectPackage.findById(projectId)
      .lean()
      .exec();
    if (!projectPackage) return total;
    total = projectPackage.total || {};
    return total;
  } catch (error) {
    console.log("error", error);
  }
};

const getProposalMeasureTotal = async measureId => {
  try {
    let total = {};
    let project = await Project.findById(measureId)
      .lean()
      .exec();
    if (!project) return total;
    total = project.metric || {};
    return total;
  } catch (error) {
    console.log("error", error);
  }
};

const getProposalMeasurePackageTotal = async measurePackageId => {
  try {
    let total = {};
    let measurePackage = await MeasurePackage.findById(measurePackageId)
      .lean()
      .exec();
    if (!measurePackage) return total;
    total = measurePackage.total || {};
    return total;
  } catch (error) {
    console.log("error", error);
  }
};

const calculateProposalTotal = async (
  measureIds,
  measurePackageIds,
  projectIds
) => {
  try {
    let projectCost = 0,
      incentive = 0,
      annualSavings = 0,
      electric = 0,
      roi = 0,
      simplePayBack = 0,
      npv = 0,
      sir = 0,
      ghgSavings = 0,
      ghgElectric = 0,
      ghgGas = 0,
      ghgSavingsCost = 0,
      waterSavings = 0,
      gasSavings = 0,
      maintenanceSavings = 0,
      calculationType = "",
      demandSavings = 0,
      eul = 0,
      energySavings = 0;
    let allPromises = [];
    for (let measureId of measureIds) {
      allPromises.push(getProposalMeasureTotal(measureId));
    }
    for (let measurePackageId of measurePackageIds) {
      allPromises.push(getProposalMeasurePackageTotal(measurePackageId));
    }
    for (let projectId of projectIds) {
      allPromises.push(getProposalProjectTotal(projectId));
    }
    let allTotals = [];
    try {
      allTotals = await Promise.all(allPromises);
    } catch (error) {
      console.log("error", error);
    }
    for (let item of allTotals) {
      let calculatedProjectCost = item.projectCost || 0;
      let calculatedIncentive = item.incentive || 0;
      let calculatedAnnualSavings = item.annualSavings || 0;
      let calculatedElectric = item.electricSavings || 0;
      let calculatedGHGSavings = item.ghgSavings || 0;
      let calculatedGHGElectric = item.ghgElectric || 0;
      let calculatedGHGGas = item.ghgGas || 0;
      calculatedGHGSavings = isFinite(calculatedGHGSavings)
        ? calculatedGHGSavings
        : 0;
      let calculatedGHGSavingsCost = item.ghgSavingsCost;
      calculatedGHGSavingsCost = isFinite(calculatedGHGSavingsCost)
        ? calculatedGHGSavingsCost
        : 0;
      let calculatedWaterSavings = item.waterSavings || 0;
      let calculatedGasSavingsCost = item.gasSavings || 0;
      let calculatedEnergySavings = item.energySavings || 0;
      let calculatedDemandSavings = item.demandSavings || 0;
      let calculatedEUL = item.eul || item.measureLife || 0;
      let simple_payback = item.simple_payback || 0;
      if (calculationType === "") calculationType = item.calculationType || "";
      projectCost += +calculatedProjectCost;
      incentive += +calculatedIncentive;
      annualSavings += +calculatedAnnualSavings;
      electric += +calculatedElectric;
      ghgSavingsCost += +calculatedGHGSavingsCost;
      ghgSavings += +calculatedGHGSavings;
      ghgElectric += +calculatedGHGElectric;
      ghgGas += +calculatedGHGGas;
      gasSavings += +calculatedGasSavingsCost;
      waterSavings += +calculatedWaterSavings;
      demandSavings += +calculatedDemandSavings;
      eul = Math.max(eul, Number(calculatedEUL));
      simplePayBack = Math.max(simplePayBack, simple_payback);
      maintenanceSavings += item.maintenanceSavings || 0;
      energySavings = Number(energySavings) + Number(calculatedEnergySavings);
    }
    return {
      projectCost,
      incentive,
      annualSavings,
      electric,
      gasSavings,
      ghgSavings,
      ghgSavingsCost,
      waterSavings,
      roi,
      simplePayBack,
      npv,
      sir,
      demandSavings,
      eul,
      calculationType,
      energySavings,
      maintenanceSavings
    };
  } catch (error) {
    console.log("error", error);
    return {
      projectCost,
      incentive,
      annualSavings,
      electric,
      gasSavings,
      ghgSavings,
      ghgSavingsCost,
      waterSavings,
      roi,
      simplePayBack,
      npv,
      sir,
      demandSavings,
      eul,
      calculationType,
      energySavings,
      maintenanceSavings
    };
  }
};

const getProjectIdsFromProposal = async proposal => {
  try {
    if (!proposal) return [];
    let proposalProjectIds = (proposal && proposal.measures) || [];
    let measurePackageIds = (proposal && proposal.measurePackages) || [];
    let projectPackageIds = (proposal && proposal.projectPackages) || [];
    let allProjectPackages = await ProjectPackage.find({
      _id: { $in: projectPackageIds }
    }).lean();
    for (let project of allProjectPackages) {
      let measures = (project && project.projects) || [];
      let measurePackages = (project && project.measurePackages) || [];
      proposalProjectIds = [...proposalProjectIds, ...measures];
      measurePackageIds = [...measurePackageIds, ...measurePackages];
    }
    let allMeasurePackages = await MeasurePackage.find({
      _id: { $in: measurePackageIds }
    }).lean();
    for (let measurePackage of allMeasurePackages) {
      let measures = (measurePackage && measurePackage.projects) || [];
      proposalProjectIds = [...proposalProjectIds, ...measures];
    }
    return [...new Set(proposalProjectIds)];
  } catch (error) {
    console.log("error", error);
  }
};

const createSubProject = async options => {
  const {
    group,
    equipment,
    mainFormValues,
    rates,
    projectValues,
    user,
    building
  } = options;
  try {
    const financialValues = (group && group["financialValues"]) || {};
    let equipmentValues = (group && group.equipmentValues) || {};
    let equipmentValue = (equipmentValues && equipmentValues[equipment]) || {};
    let initialValues = {
      ...projectValues.initialValues,
      ...group.formValues,
      ...((financialValues && financialValues[equipment]) || {}),
      ...equipmentValue
    };
    delete initialValues["rates"];
    let incentive = { ...projectValues.incentive, ...group.incentive };
    let project = new Project({
      name: projectValues.name,
      displayName: mainFormValues.displayName,
      originalDisplayName:
        projectValues.originalDisplayName || projectValues.name || "",
      source: projectValues.source || "",
      fuel: projectValues.fuel || "",
      description: mainFormValues.description || "",
      project_category: projectValues.project_category,
      project_application: projectValues.project_application,
      project_technology: projectValues.project_technology,
      implementation_strategy: projectValues.implementation_strategy,
      incentive: incentive,
      fields: projectValues.fields,
      category: mainFormValues.category,
      initialValues: initialValues,
      locations: [],
      analysisType: mainFormValues.analysisType || "prescriptive",
      type: mainFormValues.type,
      runResults: {},
      createdByUserId: user._id,
      imageUrls: [],
      isComplete: false,
      status: mainFormValues.status || "",
      type: mainFormValues.type || "",
      measureLife: mainFormValues.measureLife || "",
      budgetType: mainFormValues.budgetType || "Low Cost/No Cost",
      package: mainFormValues.package || null,
      metric: {},
      imagesInReports: [],
      formulas: projectValues.formulas || {},
      config: projectValues.config || {},
      rates: rates,
      projects: []
    });
    await project.save();
    let projectId = project._id;

    // making request body

    const projectFinance = {
      discount_rate: parseFloat(rates.discountRate) || 0,
      finance_rate: parseFloat(rates.financeRate) || 0,
      inflation_rate: parseFloat(rates.inflationRate) || 0,
      reinvestment_rate: parseFloat(rates.reinvestmentRate) || 0,
      investment_period: parseFloat(rates.investmentPeriod) || 0,
      project_cost: parseFloat(initialValues.project_cost) || 0,
      maintenance_savings: parseFloat(initialValues.maintenance_savings) || 0
    };

    const utilityObj = {};

    if (rates) {
      if (rates.electric) {
        utilityObj.electric = rates.electric;
      }
      if (rates.gas) {
        utilityObj.gas = rates.gas;
      }
      if (rates.steam) {
        utilityObj.steam = rates.steam;
      }
      if (rates.water) {
        utilityObj.water = rates.water;
      }
      if (rates.fuelOil2) {
        utilityObj.fuelOil2 = rates.fuelOil2;
      }
      if (rates.fuelOil4) {
        utilityObj.fuelOil4 = rates.fuelOil4;
      }
      if (rates.fuelOil56) {
        utilityObj.fuelOil56 = rates.fuelOil56;
      }
      if (rates.diesel) {
        utilityObj.diesel = rates.diesel;
      }
      if (rates.other) {
        utilityObj.other = rates.other;
      }
    }

    const updatedInitialValues = {};
    for (let key of Object.keys(initialValues)) {
      let value = initialValues[key];
      if (value && value == +value) value = +value;
      updatedInitialValues[key] = value;
    }

    const updatedIncentive = {};
    for (let key of Object.keys(incentive)) {
      let value = incentive[key];
      if (value && value == +value) value = +value;
      updatedIncentive[key] = value;
    }

    const updatedProjectFinance = {};
    for (let key of Object.keys(projectFinance)) {
      let value = projectFinance[key];
      if (value && value == +value) value = +value;
      updatedProjectFinance[key] = value;
    }

    const updatedUtilityObj = {};
    for (let key of Object.keys(utilityObj)) {
      let value = utilityObj[key];
      if (value && value == +value) value = +value;
      updatedUtilityObj[key] = value;
    }

    let request = {
      measure: JSON.parse(JSON.stringify(updatedInitialValues)),
      incentive: JSON.parse(JSON.stringify(updatedIncentive)),
      finance: updatedProjectFinance,
      utility: updatedUtilityObj
    };

    delete request.measure.displayName;
    delete request.measure.description;
    delete request.incentive.design_requirements;
    delete request.incentive.existing_requirements;

    request.measure.name = projectValues.name;

    console.log("request", JSON.stringify(request));

    try {
      const asyncFuc = utils.promisify(analysisClient.runPrescriptiveMeasure);
      result = await asyncFuc(request);
    } catch (error) {
      console.log("error", error);
      result = {};
    }
    project = await Project.findById(projectId);
    project.runResults = {
      [building._id]: result
    };
    project.runResultsWithRate = {
      [building._id]: result
    };
    project.markModified("runResults");
    await project.save();
    await projectGhgSync.calculate({
      notIncludingBuildingProjects: true,
      buildingIds: [building._id],
      projectIds: [projectId]
    });
    return projectId.toString();
  } catch (error) {
    console.log("error", error);
    return null;
  }
};
/**
 *
 * @param {*} originalProjectIds current projectIds for building
 * @param {*} newProjectIds new projectIds
 * @param {*} isRemove false: add, true: remove
 */
const updateProjectIdsForBuilding = (
  originalProjectIds = [],
  newProjectIds = [],
  isRemove = false
) => {
  let finalProjectIds = [];
  let currentProjectIdArray = originalProjectIds.map(id => id.toString());
  let newProjectIdArray = newProjectIds.map(id => id.toString());
  finalProjectIds = [
    ...new Set([...currentProjectIdArray, ...newProjectIdArray])
  ];
  if (isRemove) {
    finalProjectIds = finalProjectIds.filter(
      id => !newProjectIdArray.includes(id)
    );
  }
  return finalProjectIds;
};

const getCashFlowData = async (projects, buildingId, rates) => {
  let cashFlowData = {};
  try {
    let projectCost = 0,
      incentive = 0,
      annualSavings = 0,
      maintenanceSavings = 0;
    projects.forEach(project => {
      const key = "runResultsWithRate";
      let calculatedProjectCost = getProjectCost(project) || 0;
      let calculatedIncentive = getIncentive(project, buildingId, key) || 0;
      let calculatedAnnualSavings =
        getAnnualSavings(project, buildingId, "sort", key) || 0;
      projectCost += +calculatedProjectCost;
      incentive += +calculatedIncentive;
      annualSavings += +calculatedAnnualSavings;
      maintenanceSavings += +getMaintenanceSavings(project, key) || 0;
    });
    const asyncFuc = utils.promisify(analysisClient.getCashFlow);
    const requestBody = {
      project_cost: projectCost,
      incentive: incentive,
      annual_savings: annualSavings,
      maintenance_savings: maintenanceSavings,
      discount_rate: ((rates && rates.financeRate) || 0) / 100,
      finance_rate: ((rates && rates.discountRate) || 0) / 100,
      inflation_rate: ((rates && rates.inflationRate) || 0) / 100,
      reinvestment_rate: ((rates && rates.reinvestmentRate) || 0) / 100,
      investment_period: (rates && rates.investmentPeriod) || 0
    };
    cashFlowData = await asyncFuc(requestBody);
    if (typeof cashFlowData === "string")
      cashFlowData = JSON.parse(cashFlowData);
  } catch (error) {
    console.log("error", error);
  } finally {
    return cashFlowData;
  }
};

module.exports = {
  calculateAnnualSavings,
  calculateProjectCost,
  calculateIncentive,
  calculateGasSavingsCost,
  calculateGHGSavingsCost,
  calculateEnergySavings,
  calculateDemandSavings,
  calculateEUL,
  calculateProjectPackageTotal,
  calculateAllProjectPackageTotal,
  addProjectToProjectPackage,
  removeProjectFromProjectPackage,
  runProjectWithRates,
  calculateMetric,
  calculateMetricForScenario,
  calculateMeasurePackageTotal,
  mockData,
  calculateProposalTotal,
  getProjectIdsFromProposal,
  createSubProject,
  calculateMetricForProjectWithSubProject,
  updateProjectIdsForBuilding,
  getCashFlowData
};
