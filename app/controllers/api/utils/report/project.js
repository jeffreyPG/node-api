const {
  getProjectCost,
  getMaintenanceSavings,
  getIncentive,
  getAnnualSavings,
  getAnnualSavingsRanges,
  getSimplePayback,
  getSIR,
  getNPV,
  getEnergySavingsByFuel,
  getEnergySavingsRanges,
  getFirstYearCost,
  getGHGSavings,
  getGHGCost,
  calculateROI,
  getNPVLast,
  linebreak,
  getTotalEnergySavings,
  _numberWithCommas,
  getTotalProjectCost,
  getTotalAnnualSavings,
  getTotalTotalEnergySavings,
  getTotalIncentive,
  calculateTotalROI,
  calculateTotalEnergySavings,
  getTotalNPV,
  getTotalSIR,
  getTotalGHGSavings,
  getTotalGHGCost,
  getTotalEUL,
  getTotalSimplePayback,
  getTotalDemandSavings,
  getTotalROI,
  getTotalMaintenanceSavings,
  hasSubMeasure
} = require("../project.calculations");

const { capitalize } = require("../string.helpers");
const _ = require("lodash");
const moment = require("moment-timezone");
const fieldUtils = require("./field");
const tableUtils = require("./table");
const util = require("../api.utils");
const ledLightingUtils = require("./ledlighting");
const reportClient = require("../api.report.client");
const industryNetMargins = require("../../../../static/building-industry-net-margin");
const { isEmpty } = require("lodash");
const IMAGE_WIDTH = 200;

const defaultCategoryOrder = [
  "Agriculture",
  "Air Distribution",
  "Controls",
  "Cooling",
  "Custom",
  "Distributed Generation",
  "Energy Distribution",
  "Electrification",
  "Envelope",
  "Heating",
  "Heating & Cooling",
  "Kitchen",
  "Laundry",
  "LEED",
  "Lighting",
  "Plug Load",
  "Pool",
  "Process",
  "Refrigeration",
  "Service Optimization",
  "Storage",
  "Ventilation",
  "Water Heating",
  "Water Use"
];

const getProjectBulletedList = async (
  projects,
  projectConfig,
  building,
  timeZone
) => {
  try {
    let projectsArray = JSON.parse(JSON.stringify(projects));
    let allBuildingEquipments = await reportClient.getBuildingEquipment(
      building
    );
    const htmlListTag = projectConfig.style === "ordered-list" ? "ol" : "ul";
    let format = projectConfig.styleFormat;
    const showimage = projectConfig.showimage;
    const buildingId = (building && building._id) || "";
    const showTimestamp = projectConfig.showTimestamp;
    if (htmlListTag === "ul") {
      format = format || "disc";
    }
    if (htmlListTag === "ol") {
      format = format || "decimal";
    }
    const htmlListFormat = ' style="list-style-type:' + format + ';"';
    /**
     * filter out projects based on projectConfig
     */

    projectsArray = _filterProjects(projectsArray, projectConfig.filter);

    let groupedProjects = [];
    if (projectConfig.projectGrouping === "groupCategoryLocation") {
      groupedProjects = _groupProjectsByCategoryAndLocation({
        projects: projectsArray,
        categories: projectConfig.filter.category
      });
    } else {
      groupedProjects = _groupProjectsByCategory({
        projects: projectsArray,
        categories: projectConfig.filter.category
      });
    }
    const customLabels = projectConfig.data.customLabels || [];
    // Build html with large categories array
    let resultHtml = "";
    for (let i = 0; i < groupedProjects.length; i++) {
      const categoryGroup = groupedProjects[i];
      let imageHtml = "";
      for (let j = 0; j < categoryGroup.projects.length; j++) {
        const project = categoryGroup.projects[j];
        if (!showimage) {
          project.imagesInReports = [];
        } else {
          let imagesInReports = project.imagesInReports || [];
          let equipmentIds = project.equipments || [];
          for (let equipmentId of equipmentIds) {
            if (isEmpty(allBuildingEquipments)) continue;
            let equipment = allBuildingEquipments.find(
              item => item._id.toString() === equipmentId.toString()
            );
            if (equipment) {
              imagesInReports = [...imagesInReports, ...equipment.images];
            }
          }
          project.imagesInReports = [...imagesInReports];
        }
        let parentItem = "";
        const firstFieldName = projectConfig.data.fields[0];
        const firstField = convertFieldName(projectConfig.data.fields[0]);
        if (firstField === "name") {
          parentItem = project.displayName;
        } else if (firstField === "description") {
          parentItem = linebreak(project.description);
        } else if (firstField === "implementation_strategy") {
          parentItem = project.initialValues.implementationStrategy || "N/A";
        } else {
          if (project.incentive.incentive_type !== "none") {
            if (firstField === "incentive") {
              let label = fieldUtils.getHeading(firstFieldName, customLabels);
              parentItem =
                `${label}` +
                project.incentive.unit_rate +
                " per " +
                project.incentive.input_label;
              if (project.initialValues.xcelLEDLighting_rebate) {
                let {
                  incentiveValue,
                  unit
                } = ledLightingUtils.getValueFromQualifiedOption(
                  project.initialValues.xcelLEDLighting_rebate,
                  project.initialValues.dlc_qualified,
                  project.initialValues.energy_star_qualified
                );
                parentItem = `${label}` + incentiveValue + " per " + unit;
              }
            } else {
              if (["ghg", "ghg-cost"].includes(firstField)) {
                parentItem = `${fieldUtils.getHeading(
                  firstFieldName,
                  customLabels
                )} : ${_getFieldValue(firstField, project, buildingId)}`;
              } else {
                parentItem = `${fieldUtils.getHeading(
                  firstFieldName,
                  customLabels
                )} : ${_getFieldValue(firstField, project, buildingId)}`;
                // not sure why not passing heading
                /*
                  parentItem = _getFieldValue(
                    firstField,
                    project,
                    buildingId
                  );
                  */
              }
            }
          } else {
            parentItem = "-";
          }
        }
        let imageData = [];
        if (showTimestamp && timeZone) {
          imageData = await reportClient.getProjectImageData(project._id);
        }
        imageHtml +=
          "<li>" +
          parentItem +
          "<" +
          htmlListTag +
          " " +
          htmlListFormat +
          ">" +
          projectConfig.data.fields
            .map((fieldName, index) => {
              let field = convertFieldName(fieldName);
              if (index === 0) return "";
              if (field === "name") {
                return "<li>" + project.displayName + "</li>";
              }
              if (field === "description") {
                return "<li>" + linebreak(project.description) + "</li>";
              }
              if (field === "implementation_strategy") {
                return (
                  "<li>Implementation Strategy: " +
                  (project.initialValues.implementationStrategy || "N/A") +
                  "</li>"
                );
              }
              // check if the project is even an incentive or not
              if (project.incentive.incentive_type !== "none") {
                if (field === "incentive") {
                  return (
                    "<li>Incentive: $" +
                    _getFieldValue("incentive", project, buildingId) +
                    " per " +
                    (project.incentive.input_label || "-") +
                    "</li>"
                  );
                } else {
                  let heading = fieldUtils.getHeading(fieldName, customLabels);
                  let value = _getFieldValue(field, project, buildingId);
                  if (value !== "-" && value == +value)
                    value = _.round(value, 2);
                  return `<li>${heading} : ${value}</li>`;
                }
                // print dash if the project is not an incentive
              } else {
                let heading = fieldUtils.getHeading(fieldName, customLabels);
                let value = _getFieldValue(field, project, buildingId);
                if (value !== "-" && value === +value)
                  value = _.round(value, 2);
                return `<li>${heading} : ${value}</li>`;
              }
            })
            .join("") +
          (project.imagesInReports.length > 0 ? "<br /><br />" : "") +
          project.imagesInReports
            .map(url => {
              if (!url) return "";
              let timeZoneStr = "";
              if (showTimestamp) {
                const syncedData = imageData.find(image => image.uri === url);
                let timestamp = null;
                if (syncedData) {
                  timestamp = syncedData.createdAt;
                } else {
                  timestamp = project.created;
                }
                if (timestamp) {
                  timeZoneStr = `data-timestamp="${moment(timestamp)
                    .tz(timeZone)
                    .format("MM/DD/YYYY h:mm a")}"`;
                }
              }
              return `<img src="${url}" ${timeZoneStr} width="${IMAGE_WIDTH}" />`;
            })
            .join("") +
          `</${htmlListTag}>` +
          "</li>";
      }
      resultHtml +=
        (projectConfig.projectGrouping === "groupCategory"
          ? "<h3>" + (categoryGroup.category || "No Category") + "</h3>"
          : "") +
        (projectConfig.projectGrouping === "groupCategoryLocation"
          ? "<h3>" +
            (categoryGroup.category || "No Category") +
            (categoryGroup.location.length > 0
              ? " in " + categoryGroup.location.join(", ")
              : "") +
            "</h3>"
          : "") +
        (projectConfig.projectGrouping !== "individual" &&
        categoryGroup.description
          ? "<p>" + (categoryGroup.description || "") + "</p>"
          : "") +
        "<" +
        htmlListTag +
        " " +
        htmlListFormat +
        ">" +
        imageHtml +
        "</" +
        htmlListTag +
        ">";
    }
    return resultHtml;
  } catch (error) {
    console.error(error);
  }
};

const getMeasuresData = (projects, building) => {
  const measure = {
    project_cost: 0,
    annual_savings: 0,
    electric_savings: 0,
    gas_savings: 0,
    water_savings: 0,
    ghg: 0,
    ghg_cost: 0,
    demand: 0,
    simple_payback: 0,
    incentive: 0,
    energy_savings: 0
  };
  let simplePaybacks = [];
  const projectsArray = JSON.parse(JSON.stringify(projects));
  const industryNetMargin =
    building.clientIndustry && industryNetMargins[building.clientIndustry];
  projectsArray.forEach(project => {
    const isSubMeasure = hasSubMeasure(project);
    const runResults = project.runResults && project.runResults[building._id];
    measure.project_cost +=
      (isSubMeasure
        ? getTotalProjectCost(project)
        : getProjectCost(project.initialValues)) || 0;
    measure.annual_savings += isSubMeasure
      ? getTotalAnnualSavings(project, building._id)
      : (runResults && getAnnualSavings(runResults)) || 0;
    const electicSavings = isSubMeasure
      ? calculateTotalEnergySavings(project, building._id, "electric")
      : (runResults &&
          parseFloat(
            getEnergySavingsByFuel(project, "electric", building._id) || 0
          )) ||
        0;
    measure.electric_savings += _.round(electicSavings, 2);
    const gasSavings = isSubMeasure
      ? calculateTotalEnergySavings(project, building._id, "gas")
      : (runResults &&
          parseFloat(
            getEnergySavingsByFuel(project, "gas", building._id) || 0
          )) ||
        0;
    measure.gas_savings += _.round(gasSavings, 2);
    measure.energy_savings += isSubMeasure
      ? getTotalTotalEnergySavings(project, building._id)
      : getTotalEnergySavings(measure.electric_savings, measure.gas_savings);
    const waterSavings = isSubMeasure
      ? calculateTotalEnergySavings(project, building._id, "water")
      : (runResults &&
          parseFloat(
            getEnergySavingsByFuel(project, "water", building._id) || 0
          )) ||
        0;
    measure.water_savings += _.round(waterSavings, 2);
    const ghgSavings = isSubMeasure
      ? getTotalGHGSavings(project, building._id)
      : (runResults &&
          runResults["ghg"] &&
          _.round(parseFloat(runResults["ghg"]), 2)) ||
        0;
    measure.ghg += ghgSavings;
    const ghgCost = isSubMeasure
      ? getTotalGHGCost(project, building._id)
      : (runResults &&
          runResults["ghg-cost"] &&
          _.round(parseFloat(runResults["ghg-cost"]), 2)) ||
        0;
    measure.ghg_cost += ghgCost;
    const demandSavings = isSubMeasure
      ? getTotalDemandSavings(project, building._id)
      : (runResults &&
          runResults["energy-savings"] &&
          _.round(runResults["energy-savings"]["demand"], 2)) ||
        0;
    measure.demand += demandSavings;
    let simplePayback = isSubMeasure
      ? getTotalSimplePayback(project, building._id)
      : runResults && getSimplePayback(runResults);
    if (simplePayback != null && simplePayback != undefined)
      simplePaybacks.push(_.round(simplePayback ? simplePayback : 0, 2));
    simplePayback =
      measure.simple_payback > simplePayback
        ? measure.simple_payback
        : simplePayback;
    measure.simple_payback = parseInt(simplePayback);
    measure.incentive += isSubMeasure
      ? getTotalIncentive(project, building._id)
      : (runResults && getIncentive(runResults)) || 0;
  });
  let totalGhgSavings = measure.ghg || 0;
  let vehiclesDriven = totalGhgSavings / 4.67;
  let oilBarrelsConsumed = totalGhgSavings / 0.43;
  let coalRailcarsBurned = totalGhgSavings / 183.22;
  let minSimplePayback, maxSimplePayBack;
  let simplePaybackRange = null;
  if (simplePaybacks.length > 0) {
    simplePaybacks = simplePaybacks.sort(function(a, b) {
      return a - b;
    });
    minSimplePayback = simplePaybacks[0];
    maxSimplePayBack = simplePaybacks[simplePaybacks.length - 1];
    simplePaybackRange = `${
      minSimplePayback ? util.formatNumbersWithCommas(minSimplePayback) : "0"
    } - ${
      maxSimplePayBack ? util.formatNumbersWithCommas(maxSimplePayBack) : "0"
    } years`;
  }
  return {
    project_cost:
      measure.project_cost != 0
        ? `$${util.formatNumbersWithCommas(measure.project_cost.toFixed(2))}`
        : null,
    annual_savings:
      measure.annual_savings != 0
        ? `$${util.formatNumbersWithCommas(measure.annual_savings.toFixed(2))}`
        : null,
    electric_savings:
      measure.electric_savings != 0
        ? `${util.formatNumbersWithCommas(
            measure.electric_savings.toFixed(2)
          )} kWh`
        : null,
    gas_savings:
      measure.gas_savings != 0
        ? `${util.formatNumbersWithCommas(
            measure.gas_savings.toFixed(2)
          )} therms`
        : null,
    water_savings:
      measure.water_savings != 0
        ? `${util.formatNumbersWithCommas(
            measure.water_savings.toFixed(2)
          )} kGal`
        : null,
    ghg:
      measure.ghg != 0
        ? `${util.formatNumbersWithCommas(_.round(measure.ghg, 2))} mtCO2e`
        : null,
    ghg_cost:
      measure.ghg_cost != 0
        ? `${util.formatNumbersWithCommas(
            _.round(measure.ghg_cost, 2)
          )} $/mtCO2e`
        : null,
    demand:
      measure.demand != 0
        ? `${util.formatNumbersWithCommas(measure.demand.toFixed(2))} kW`
        : null,
    simple_payback:
      measure.simple_payback != 0
        ? `${util.formatNumbersWithCommas(
            measure.simple_payback.toFixed(2)
          )} yrs`
        : null,
    incentive:
      measure.incentive != 0
        ? `$${util.formatNumbersWithCommas(measure.incentive.toFixed(2))}`
        : null,
    energy_savings:
      measure.energy_savings != 0
        ? `${util.formatNumbersWithCommas(
            measure.energy_savings.toFixed(2)
          )} kBtu`
        : null,
    sales_margin:
      measure.annual_savings != 0 && industryNetMargin
        ? `$${util.formatNumbersWithCommas(
            Math.round((measure.annual_savings / industryNetMargin) * 100)
          )}`
        : null,
    vehiclesDriven:
      vehiclesDriven != 0
        ? `${util.formatNumbersWithCommas(vehiclesDriven)}`
        : null,
    oilBarrelsConsumed:
      oilBarrelsConsumed != 0
        ? `${util.formatNumbersWithCommas(oilBarrelsConsumed)}`
        : null,
    coalRailcarsBurned:
      coalRailcarsBurned != 0
        ? `${util.formatNumbersWithCommas(coalRailcarsBurned)}`
        : null,
    simple_payback_range: simplePaybackRange
  };
};

const getProjectSummaryTable = (
  projects,
  projectConfig,
  building,
  tableLayout
) => {
  try {
    let counter = 0;
    let projectsArray = JSON.parse(JSON.stringify(projects));
    const finance = building.rates;
    const tableArray = { headings: [], projects: [] };
    const defaultFieldsArray = [
      "name",
      "description",
      "project_cost",
      "annual_savings",
      "electric_savings",
      "roi",
      "simple_payback",
      "npv",
      "sir"
    ];
    // HACK: To make it work for custom labels as the measures
    // logic has hardcoded heading for calculating values
    const defaultHeadings = [];
    const tableFieldsMap = {};
    // create heading array
    if (
      projectConfig.data &&
      projectConfig.data.fields &&
      projectConfig.data.fields.length > 0
    ) {
      projectConfig.data.fields.forEach(field => {
        const headingName = tableUtils.getHeading(
          field,
          finance.investmentPeriod,
          projectConfig.data.customLabels
        );
        defaultHeadings.push(
          tableUtils.getHeading(field, finance.investmentPeriod)
        );
        tableArray.headings.push(headingName);
        tableFieldsMap[headingName] = field;
      });
      tableFields = [...projectConfig.data.fields];
    } else {
      defaultFieldsArray.forEach(field => {
        const headingName = tableUtils.getHeading(
          field,
          finance.investmentPeriod,
          projectConfig.data.customLabels
        );
        defaultHeadings.push(
          tableUtils.getHeading(field, finance.investmentPeriod)
        );
        tableArray.headings.push(headingName);
        tableFieldsMap[headingName] = field;
      });
    }

    // filter based on options in projectConfig
    projectsArray = _filterProjects(projectsArray, projectConfig.filter);

    // update all projects in array for location to hold string in place of array
    projectsArray.map(project => {
      project.location =
        project.location && project.location.length > 0
          ? project.location.join(", ")
          : "No Location";
    });

    // group projects by project calc (name key), or calc and location, based on the projectConfig options
    if (projectConfig.projectGrouping !== "individual") {
      projectsArray = _groupByCalcs(projectsArray, function(project) {
        return projectConfig.projectGrouping === "groupProjectLocation"
          ? [project.name, project.location]
          : [project.name];
      });
    }

    // push into table array in correct order and merge if grouped
    if (projectConfig.projectGrouping === "individual") {
      projectsArray.forEach(project => {
        const contentObject = {};
        const isSubMeasure = hasSubMeasure(project);
        const run = project.runResults && project.runResults[building._id];
        const calcType = run && run["calculation-type"];

        defaultHeadings.forEach((heading, index) => {
          let content = "";
          switch (heading) {
            case "Proposed Measure":
              content = project.displayName || "-";
              break;
            case "Description":
              content = project.description || "-";
              break;
            case "Estimated Incentive ($)":
              content =
                (isSubMeasure
                  ? getTotalIncentive(project, building._id)
                  : run && getIncentive(run)) || "-";
              break;
            case "Utility Company":
              content = project.incentive.utility_company || "-";
              break;
            case "Rebate Code":
              content = project.incentive.rebate_code || "-";
              break;
            case "Existing Requirements":
              content = project.incentive.existing_requirements || "-";
              break;
            case "Design Requirements":
              content = project.incentive.design_requirements || "-";
              break;
            case "Implementation Strategy":
              content = project.initialValues.implementationStrategy || "-";
              break;
            case "Estimated Measure Cost ($)":
              content = isSubMeasure
                ? getTotalProjectCost(project)
                : getProjectCost(project.initialValues) || "-";
              break;
            case "Annual Cost Savings ($)":
              content = isSubMeasure
                ? getTotalAnnualSavings(project, building._id)
                : (run && getAnnualSavings(run)) || "-";
              break;
            case "Estimated Energy Savings (kBtu)":
              value = isSubMeasure
                ? getTotalTotalEnergySavings(project, building._id)
                : (run &&
                    parseFloat(
                      getTotalEnergySavings(
                        getEnergySavingsByFuel(
                          project,
                          "electric",
                          building._id
                        ) || 0,
                        getEnergySavingsByFuel(project, "gas", building._id) ||
                          0
                      )
                    )) ||
                  0;
              content = _.round(value, 2) || "-";
              break;
            case "Estimated Electric Savings (kWh)": {
              // content =
              //   (run &&
              //     run["annual-savings"] &&
              //     _.round(run["annual-savings"]["electric-charge"], 2)) ||
              //   "-";
              const value = isSubMeasure
                ? parseFloat(
                    calculateTotalEnergySavings(
                      project,
                      building._id,
                      "electric"
                    ) || 0
                  )
                : (run &&
                    parseFloat(
                      getEnergySavingsByFuel(
                        project,
                        "electric",
                        building._id
                      ) || 0
                    )) ||
                  0;
              content = _.round(value, 2) || "-";
              break;
            }
            case "Estimated Gas Savings (therms)": {
              // content =
              //   (run &&
              //     run["annual-savings"] &&
              //     _.round(run["annual-savings"]["gas-charge"], 2)) ||
              //   "-";
              const value = isSubMeasure
                ? parseFloat(
                    calculateTotalEnergySavings(project, building._id, "gas") ||
                      0
                  )
                : (run &&
                    parseFloat(
                      getEnergySavingsByFuel(project, "gas", building._id) || 0
                    )) ||
                  0;
              content = _.round(value, 2) || "-";
              break;
            }
            case "Estimated Water Savings (kGal)": {
              // content =
              //   (run &&
              //     run["annual-savings"] &&
              //     _.round(run["annual-savings"]["water-charge"], 2)) ||
              //   "-";
              const value = isSubMeasure
                ? parseFloat(
                    calculateTotalEnergySavings(
                      project,
                      building._id,
                      "water"
                    ) || 0
                  )
                : (run &&
                    parseFloat(
                      getEnergySavingsByFuel(project, "water", building._id) ||
                        0
                    )) ||
                  0;
              content = _.round(value, 2) || "-";
              break;
            }
            case "Estimated GHG Cost ($/mtCO2e)":
              content = isSubMeasure
                ? _.round(parseFloat(getTotalGHGCost(project, building._id), 2))
                : (run &&
                    run["ghg-cost"] &&
                    _.round(parseFloat(run["ghg-cost"]), 2)) ||
                  "-";
              break;
            case "Estimated GHG Savings (mtCO2e)":
              content = isSubMeasure
                ? getTotalGHGSavings(project, building._id)
                : (run && run["ghg"] && _.round(parseFloat(run["ghg"]), 2)) ||
                  "-";
              break;
            case "ROI (%)": {
              if (calcType === "savings-range") {
                content = "-";
              } else {
                const roi = isSubMeasure
                  ? getTotalROI(project, building._id)
                  : (run &&
                      (
                        ((getAnnualSavings(run) +
                          project.initialValues.maintenance_savings) /
                          (project.initialValues.project_cost -
                            run["utility-incentive"])) *
                        100
                      ).toFixed(0)) ||
                    "-";
                content = roi > 0 ? roi : "-";
              }
              break;
            }
            case "Simple Payback (yrs)": {
              if (calcType === "savings-range") {
                content = "-";
              } else {
                const simplePayback = isSubMeasure
                  ? getTotalSimplePayback(project, building._id)
                  : run && getSimplePayback(run);
                content = simplePayback > 0 ? simplePayback : "-";
              }
              break;
            }
            case "Demand Savings (kW)":
              content = isSubMeasure
                ? (getTotalDemandSavings(project, building._id) &&
                    _.round(getTotalDemandSavings(project, building._id), 2)) ||
                  "-"
                : (run &&
                    run["energy-savings"] &&
                    _.round(run["energy-savings"]["demand"], 2)) ||
                  "-";
              break;
            case "Effective Useful Life (years)":
              content = isSubMeasure
                ? (getTotalEUL(project, building._id) &&
                    _.round(getTotalEUL(project, building._id), 2)) ||
                  "-"
                : (run &&
                    run["energy-savings"] &&
                    _.round(run["energy-savings"]["eul"], 2)) ||
                  "-";
              break;
            case "Exisiting Fixture Type":
              content =
                (project.initialValues &&
                  project.initialValues.existing_equipment_name) ||
                "-";
              break;
            case "Exisiting Fixture Wattage (Watts)":
              content =
                (project.initialValues &&
                  project.initialValues.existing_equipment_wattage) ||
                "-";
              break;
            case "Proposed Fixture Type":
              content =
                (project.initialValues &&
                  project.initialValues.xcelLEDLighting_replace_name) ||
                "-";
              break;
            case "Proposed Fixture Wattage (Watts)":
              content =
                (project.initialValues &&
                  project.initialValues.xcelLEDLighting_replace_wattage) ||
                "-";
              break;
            case "Fixture Quantity":
              content =
                (project.initialValues &&
                  project.initialValues.qty_existing_equip) ||
                "-";
              break;
            case "Annual Op. Hours":
              content = ledLightingUtils.calculateAnnualHours(project) || "-";
              break;
            default: {
              if (heading.includes("year NPV ($)")) {
                if (calcType === "savings-range") {
                  content = "-";
                } else {
                  content = isSubMeasure
                    ? getTotalNPV(project, building._id)
                    : (run && getNPV(run)) || "-";
                }
              } else if (heading.includes("year SIR")) {
                if (calcType === "savings-range") {
                  content = "-";
                } else {
                  content = isSubMeasure
                    ? getTotalSIR(project, building._id)
                    : (run && getSIR(run)) || "-";
                }
              } else {
                content = _getFieldValue(
                  projectConfig.data.fields[index],
                  project,
                  building._id
                );
              }
            }
          }
          const actualHeadings = tableArray.headings[index];
          contentObject[actualHeadings] = content;
        });

        // add calculation type to the object
        if (calcType) {
          contentObject["calculation-type"] = run && run["calculation-type"];
        }

        tableArray.projects.push(contentObject);
      });
    } else {
      projectsArray.forEach(group => {
        const contentObject = {};
        defaultHeadings.forEach((heading, index) => {
          let content;
          let annualSavings;
          let energySavings;
          const projectCost = group.projects.reduce((prev, curr) => {
            const isSubMeasure = hasSubMeasure(curr);
            return prev + isSubMeasure
              ? getTotalProjectCost(cur)
              : getProjectCost(curr.initialValues);
          }, 0);
          const incentive = group.projects.reduce((prev, curr) => {
            const isSubMeasure = hasSubMeasure(curr);
            return (
              prev +
              parseFloat(
                isSubMeasure
                  ? getTotalIncentive(project, building._id)
                  : getIncentive(curr.runResults[building._id])
              )
            );
          }, 0);
          const calcType =
            group.projects[0].runResults[building._id]["calculation-type"];
          if (calcType === "savings-range") {
            annualSavings = getAnnualSavingsRanges(
              group.projects,
              building._id
            );
            energySavings = getEnergySavingsRanges(
              group.projects,
              building._id
            );
          } else {
            annualSavings = group.projects.reduce((prev, curr) => {
              const isSubMeasure = hasSubMeasure(curr);
              if (isSubMeasure)
                return (
                  prev +
                  parseFloat(getTotalAnnualSavings(project, building._id))
                );
              return (
                prev +
                parseFloat(getAnnualSavings(curr.runResults[building._id]))
              );
            }, 0);
            energySavings =
              group.projects.reduce((prev, curr) => {
                let value = 0;
                const isSubMeasure = hasSubMeasure(curr);
                let run = curr.runResults[building._id];
                switch (heading) {
                  case "Estimated Energy Savings (kBtu)":
                    value = isSubMeasure
                      ? getTotalTotalEnergySavings(curr, building._id)
                      : (run &&
                          parseFloat(
                            getTotalEnergySavings(
                              getEnergySavingsByFuel(
                                curr,
                                "electric",
                                building._id
                              ) || 0,
                              getEnergySavingsByFuel(
                                curr,
                                "gas",
                                building._id
                              ) || 0
                            )
                          )) ||
                        0;
                    break;
                  case "Estimated Electric Savings (kWh)":
                    value = isSubMeasure
                      ? calculateTotalEnergySavings(
                          curr,
                          building._id,
                          "electric"
                        )
                      : (run &&
                          parseFloat(
                            getEnergySavingsByFuel(
                              curr,
                              "electric",
                              building._id
                            ) || 0
                          )) ||
                        0;
                    break;
                  case "Estimated Gas Savings (therms)":
                    value = isSubMeasure
                      ? calculateTotalEnergySavings(curr, building._id, "gas")
                      : (run &&
                          parseFloat(
                            getEnergySavingsByFuel(curr, "gas", building._id) ||
                              0
                          )) ||
                        0;
                    break;
                  case "Estimated Water Savings (kGal)":
                    value = isSubMeasure
                      ? calculateTotalEnergySavings(curr, building._id, "water")
                      : (run &&
                          parseFloat(
                            getEnergySavingsByFuel(
                              curr,
                              "water",
                              building._id
                            ) || 0
                          )) ||
                        0;
                    break;
                  case "Estimated GHG Cost ($/mtCO2e)":
                    value = isSubMeasure
                      ? getTotalGHGCost(curr, building._id)
                      : (run &&
                          run["ghg-cost"] &&
                          _.round(run["ghg-cost"], 2)) ||
                        0;
                    break;
                  case "Estimated GHG Savings (mtCO2e)":
                    value = isSubMeasure
                      ? getTotalGHGSavings(curr, building._id)
                      : (run && run["ghg"] && _.round(run["ghg"], 2)) || 0;
                    break;
                  case "Demand Savings (kW)":
                    value = isSubMeasure
                      ? getTotalDemandSavings(curr, building._id)
                      : (run &&
                          parseFloat(
                            getEnergySavingsByFuel(
                              curr,
                              "demand",
                              building._id
                            ) || 0
                          )) ||
                        0;
                    break;
                  case "Effective Useful Life (years)":
                    value = isSubMeasure
                      ? getTotalEUL(project, building._id)
                      : (run &&
                          parseFloat(
                            getEnergySavingsByFuel(curr, "eul", building._id) ||
                              0
                          )) ||
                        0;
                    break;
                }
                value = isFinite(value) ? value : 0;
                return prev + value;
              }, 0) || "-";
          }

          if (heading === "Proposed Measure") {
            // if a description-only project in a group
            if (
              group.projects &&
              group.projects.length === 1 &&
              group.projects[0].category === "description"
            ) {
              content = group.projects[0].displayName;
            } else {
              content =
                (group.location && typeof group.location === "string"
                  ? group.location + " - "
                  : "") +
                (group.projects[0].project_application ||
                  group.projects[0].project_category ||
                  "No Application");
            }
          } else if (heading === "Description") {
            const descriptions = group.projects
              .map(project => project.description)
              .filter(el => {
                return el !== null && el !== "" && el !== undefined;
              })
              .join(", ");
            content = group.projects.some(project => project.description)
              ? descriptions
              : "-";
          } else if (heading === "Implementation Strategy") {
            const implementationStrategies = group.projects
              .map(project => project.initialValues.implementationStrategy)
              .filter(el => {
                return el !== null && el !== "" && el !== undefined;
              })
              .join(", ");
            content = group.projects.some(
              project => project.initialValues.implementationStrategy
            )
              ? implementationStrategies
              : "-";
          } else if (heading === "Estimated Incentive ($)") {
            content = incentive || "-";
          } else if (heading === "Utility Company") {
            const companies = group.projects
              .map(project => project.incentive.utility_company)
              .filter(el => {
                return el !== null && el !== "" && el !== undefined;
              })
              .join(", ");
            content = group.projects.some(
              project => project.incentive.utility_company
            )
              ? companies
              : "-";
          } else if (heading === "Rebate Code") {
            const codes = group.projects
              .map(project => project.incentive.rebate_code)
              .filter(el => {
                return el !== null && el !== "" && el !== undefined;
              })
              .join(", ");
            content = group.projects.some(
              project => project.incentive.rebate_code
            )
              ? codes
              : "-";
          } else if (heading === "Existing Requirements") {
            const existingReqs = group.projects
              .map(project => project.incentive.existing_requirements)
              .filter(el => {
                return el !== null && el !== "" && el !== undefined;
              })
              .join(", ");
            content = group.projects.some(
              project => project.incentive.existing_requirements
            )
              ? existingReqs
              : "-";
          } else if (heading === "Design Requirements") {
            const designReqs = group.projects
              .map(project => project.incentive.design_requirements)
              .filter(el => {
                return el !== null && el !== "" && el !== undefined;
              })
              .join(", ");
            content = group.projects.some(
              project => project.incentive.design_requirements
            )
              ? designReqs
              : "-";
          } else if (heading === "Estimated Measure Cost ($)") {
            content = projectCost || "-";
          } else if (heading === "Annual Cost Savings ($)") {
            content = annualSavings || "-";
          } else if (
            heading === "Estimated Energy Savings (kBtu)" ||
            heading === "Estimated Electric Savings (kWh)" ||
            heading === "Estimated Gas Savings (therms)" ||
            heading === "Estimated GHG Savings (mtCO2e)" ||
            heading === "Estimated Water Savings (kGal)" ||
            heading === "Demand Savings (kW)" ||
            heading === "Estimated GHG Cost ($/mtCO2e)" ||
            heading === "Effective Useful Life (years)"
          ) {
            content = energySavings;
          } else if (heading === "ROI (%)") {
            if (calcType === "savings-range") {
              content = "-";
            } else {
              const maintenanceSavings = group.projects.reduce((prev, curr) => {
                const isSubMeasure = hasSubMeasure(curr);
                return prev + isSubMeasure
                  ? getTotalMaintenanceSavings(curr, building._id)
                  : getMaintenanceSavings(curr.initialValues);
              }, 0);
              let roi = (
                ((annualSavings + maintenanceSavings) /
                  (projectCost - incentive)) *
                100
              ).toFixed(0);
              roi = isFinite(roi) ? Number(roi) : 0;
              // if (isSubMeasure) roi = getTotalROI(curr, buiding._id);
              content = roi > 0 ? roi : "-";
            }
          } else if (heading === "Simple Payback (yrs)") {
            if (calcType === "savings-range") {
              content = "-";
            } else {
              const maintenanceSavings = group.projects.reduce((prev, curr) => {
                const isSubMeasure = hasSubMeasure(curr);
                return prev + isSubMeasure
                  ? getTotalMaintenanceSavings(curr, building._id)
                  : getMaintenanceSavings(curr.initialValues);
              }, 0);
              let simplePayback =
                annualSavings > 0
                  ? (
                      (projectCost - incentive) /
                      (annualSavings + maintenanceSavings)
                    ).toFixed(2)
                  : 0;
              simplePayback = isFinite(simplePayback)
                ? Number(simplePayback)
                : 0;
              // if (isSubMeasure)
              //   simplePayback = getTotalSimplePayback(curr, building._id);
              content = simplePayback > 0 ? simplePayback : "-";
            }
          } else if (heading.includes("year NPV ($)")) {
            if (calcType === "savings-range") {
              content = "-";
            } else {
              const npvLast = [];
              group.projects.forEach(project => {
                const run = project.runResults[building._id];
                const isSubMeasure = hasSubMeasure(project);
                if (isSubMeasure) {
                  let value = getTotalNPV(project, building._id);
                  npvLast.push(value);
                }
                if (
                  run &&
                  run["cash-flows"] &&
                  run["cash-flows"].cash_flows.slice(-1)[0].NPV !== undefined &&
                  run["cash-flows"].cash_flows.slice(-1)[0].NPV !== null
                ) {
                  npvLast.push(
                    run &&
                      parseFloat(
                        Math.ceil(run["cash-flows"].cash_flows.slice(-1)[0].NPV)
                      )
                  );
                }
              });
              content =
                npvLast.reduce((prev, curr) => {
                  return prev + curr;
                }, 0) || "-";
            }
          } else if (heading.includes("year SIR")) {
            if (calcType === "savings-range") {
              content = "-";
            } else {
              const pvAll = [];
              group.projects.forEach(project => {
                const run = project.runResults[building._id];
                if (
                  run &&
                  run["cash-flows"] &&
                  run["cash-flows"].cash_flows !== undefined &&
                  run["cash-flows"].cash_flows !== null &&
                  run["cash-flows"].cash_flows.length > 0
                ) {
                  run["cash-flows"].cash_flows.map(cashFlowObj => {
                    pvAll.push(cashFlowObj.PV);
                  });
                }
              });
              content =
                projectCost > 0
                  ? (pvAll.reduce((a, b) => a + b, 0) / projectCost).toFixed(2)
                  : "-";
            }
          } else if (heading === "Fixture Quantity") {
            const quantities = group.projects
              .map(
                project =>
                  project.initialValues &&
                  project.initialValues.qty_existing_equip
              )
              .filter(el => {
                return el !== null && el !== "" && el !== undefined;
              })
              .join(", ");
            content = group.projects.some(
              project =>
                project.initialValues &&
                project.initialValues.qty_existing_equip
            )
              ? quantities
              : "-";
          } else if (heading === "Annual Op. Hours") {
            const annualHours = group.projects
              .map(project => ledLightingUtils.calculateAnnualHours(project))
              .filter(el => {
                return el !== null && el !== "" && el !== undefined;
              })
              .join(", ");
            content = group.projects.some(project =>
              ledLightingUtils.calculateAnnualHours(project)
            )
              ? annualHours
              : "-";
          } else if (heading === "Exisiting Fixture Type") {
            const annualHours = group.projects
              .map(
                project =>
                  project.initialValues &&
                  project.initialValues.existing_equipment_name
              )
              .filter(el => {
                return el !== null && el !== "" && el !== undefined;
              })
              .join(", ");
            content = group.projects.some(
              project =>
                project.initialValues &&
                project.initialValues.existing_equipment_name
            )
              ? annualHours
              : "-";
          } else if (heading === "Exisiting Fixture Wattage (Watts)") {
            const wattages = group.projects
              .map(
                project =>
                  project.initialValues &&
                  project.initialValues.existing_equipment_wattage
              )
              .filter(el => {
                return el !== null && el !== "" && el !== undefined;
              })
              .join(", ");
            content = group.projects.some(
              project =>
                project.initialValues &&
                project.initialValues.existing_equipment_wattage
            )
              ? wattages
              : "-";
          } else if (heading === "Proposed Fixture Type") {
            const types = group.projects
              .map(
                project =>
                  project.initialValues &&
                  project.initialValues.xcelLEDLighting_replace_name
              )
              .filter(el => {
                return el !== null && el !== "" && el !== undefined;
              })
              .join(", ");
            content = group.projects.some(
              project =>
                project.initialValues &&
                project.initialValues.xcelLEDLighting_replace_name
            )
              ? types
              : "-";
          } else if (heading === "Proposed Fixture Wattage (Watts)") {
            const wattages = group.projects
              .map(
                project =>
                  project.initialValues &&
                  project.initialValues.xcelLEDLighting_replace_wattage
              )
              .filter(el => {
                return el !== null && el !== "" && el !== undefined;
              })
              .join(", ");
            content = group.projects.some(
              project =>
                project.initialValues &&
                project.initialValues.xcelLEDLighting_replace_wattage
            )
              ? wattages
              : "-";
          } else {
            let field = tableFieldsMap[heading];
            if (field.includes("project.")) {
              field = field.replace("project.", "");
            }
            let values = group.projects
              .map(project => _getFieldValue(field, project, building._id))
              .filter(item => item && item !== "-");
            let isNumber = false;
            isNumber = values.every(item => item == +item);
            if (isNumber) content = _.sum(values);
            else content = values.join(", ");
          }
          content = content || "-";
          const actualHeadings = tableArray.headings[index];
          contentObject[actualHeadings] = content;
        });

        // add calculation type to the object
        contentObject["calculation-type"] =
          group.projects[0].runResults[building._id]["calculation-type"];

        tableArray.projects.push(contentObject);
      });
    }

    // Sort projects array by projectConfig settings
    const order =
      projectConfig.data && projectConfig.data.order
        ? projectConfig.data.order
        : "ascending";
    const orderBy =
      projectConfig.data && projectConfig.data.orderBy
        ? projectConfig.data.orderBy
        : "Estimated Measure Cost ($)";
    const totalRowInclude =
      projectConfig.data && projectConfig.data.totalRow
        ? projectConfig.data.totalRow
        : "notInclude";
    const projectOrder = (array, key, direction) => {
      array.sort((a, b) => {
        let aKey = isNaN(a[key]) ? a[key] : Number(a[key]);
        let bKey = isNaN(b[key]) ? b[key] : Number(b[key]);
        if (
          key === "Annual Cost Savings ($)" ||
          key === "Estimated Energy Savings (kBtu)" ||
          key === "Estimated Electric Savings (kWh)" ||
          key === "Estimated Gas Savings (therms)" ||
          key === "Estimated Water Savings (kGal)" ||
          key === "Estimated GHG Savings (mtCO2e)" ||
          key === "Estimated GHG Cost ($/mtCO2e)"
        ) {
          if (a["calculation-type"] === "savings-range") {
            aKey = Number(a[key].toString().split(" - ")[0]);
          }
          if (b["calculation-type"] === "savings-range") {
            bKey = Number(b[key].toString().split(" - ")[0]);
          }
        }
        if (key === "Annual Op. Hours") {
          aKey = ledLightingUtils.calculateAnnualHours(a);
          bKey = ledLightingUtils.calculateAnnualHours(b);
        }
        if (key === "Fixture Quantity") {
          aKey = (a.initialValues && a.initialValues.qty_existing_equip) || "-";
          bKey = (b.initialValues && b.initialValues.qty_existing_equip) || "-";
        }
        if (key === "Exisiting Fixture Type") {
          aKey =
            (a.initialValues && a.initialValues.existing_equipment_name) || "-";
          bKey =
            (b.initialValues && b.initialValues.existing_equipment_name) || "-";
        }
        if (key === "Exisiting Fixture Wattage (Watts)") {
          aKey =
            (a.initialValues && a.initialValues.existing_equipment_wattage) ||
            "-";
          bKey =
            (b.initialValues && b.initialValues.existing_equipment_wattage) ||
            "-";
        }
        if (key === "Proposed Fixture Type") {
          aKey =
            (a.initialValues && a.initialValues.xcelLEDLighting_replace_name) ||
            "-";
          bKey =
            (b.initialValues && b.initialValues.xcelLEDLighting_replace_name) ||
            "-";
        }
        if (key === "Proposed Fixture Wattage (Watts)") {
          aKey =
            (a.initialValues &&
              a.initialValues.xcelLEDLighting_replace_wattage) ||
            "-";
          bKey =
            (b.initialValues &&
              b.initialValues.xcelLEDLighting_replace_wattage) ||
            "-";
        }
        if (direction === "ascending") return aKey > bKey ? 1 : -1;
        if (direction === "descending") return aKey < bKey ? 1 : -1;
      });
      return array;
    };
    // HACK: Passing default headings to make it work for custom labels
    tableArray.projects = projectOrder(
      tableArray.projects,
      tableUtils.getHeading(orderBy, finance.investmentPeriod),
      order
    );
    counter = 0;

    // totals columns
    const totalsColumns = [
      "Estimated Measure Cost ($)",
      "Annual Cost Savings ($)",
      "Estimated Electric Savings (kWh)",
      "Estimated Electric Savings (kWh)",
      "Estimated Gas Savings (therms)",
      "Estimated Water Savings (kGal)",
      "Estimated Incentive ($)",
      "Estimated GHG Cost ($/mtCO2e)",
      "Estimated GHG Savings (mtCO2e)"
    ];

    const fieldHeadings = [];
    const data = [];
    tableArray.headings.forEach(heading => {
      fieldHeadings.push({ name: heading, label: heading });
    });
    tableArray.projects.forEach(project => {
      const obj = {};
      fieldHeadings.forEach((fheading, index) => {
        const heading = fheading.label;
        const defaultHeading = defaultHeadings[index];
        if (
          project["calculation-type"] === "savings-range" &&
          (defaultHeading === "Annual Cost Savings ($)" ||
            defaultHeading === "Estimated Electric Savings (kWh)" ||
            defaultHeading === "Estimated Gas Savings (therms)" ||
            defaultHeading === "Estimated Water Savings (kGal)")
        ) {
          obj[heading] = _numberWithCommas(
            project[heading],
            project["calculation-type"]
          );
        } else if (defaultHeading === "Description") {
          obj[heading] = linebreak(project[heading]);
        } else {
          obj[heading] = _numberWithCommas(project[heading]);
        }
      });
      data.push(obj);
    });

    if (totalRowInclude === "include") {
      const obj = {};
      fieldHeadings.forEach((fheading, index) => {
        const heading = fheading.label;
        const defaultHeading = defaultHeadings[index];
        if (defaultHeading === "Proposed Measure") {
          obj[heading] = "Total";
        } else if (
          (defaultHeading === "Annual Cost Savings ($)" ||
            defaultHeading === "Estimated Electric Savings (kWh)" ||
            defaultHeading === "Estimated Gas Savings (therms)" ||
            defaultHeading === "Estimated Water Savings (kGal)") &&
          tableArray.projects.some(
            el => el["calculation-type"] === "savings-range"
          )
        ) {
          obj[heading] =
            _numberWithCommas(
              _getRangeTotals(tableArray.projects, heading, "low")
            ) +
            " - " +
            _numberWithCommas(
              _getRangeTotals(tableArray.projects, heading, "high")
            );
        } else if (
          defaultHeading === "Total Measure Cost ($)" ||
          defaultHeading === "Estimated Measure Cost ($)" ||
          defaultHeading === "Annual Cost Savings ($)" ||
          defaultHeading === "Estimated Energy Savings (kBtu)" ||
          defaultHeading === "Estimated Electric Savings (kWh)" ||
          defaultHeading === "Estimated Gas Savings (therms)" ||
          defaultHeading === "Estimated Water Savings (kGal)" ||
          defaultHeading === "Estimated Incentive ($)" ||
          defaultHeading === "Estimated GHG Savings (mtCO2e)" ||
          defaultHeading === "Estimated GHG Cost ($/mtCO2e)" ||
          defaultHeading === "Annual Op. Hours" ||
          defaultHeading === "Fixture Quantity" ||
          defaultHeading === "Exisiting Fixture Wattage (Watts)" ||
          defaultHeading === "Proposed Fixture Wattage (Watts)" ||
          defaultHeading === "Demand Savings (kW)" ||
          defaultHeading === "Effective Useful Life (years)" ||
          defaultHeading === "ROI (%)" ||
          defaultHeading === "Simple Payback (yrs)" ||
          defaultHeading === "Material Quantity" ||
          defaultHeading === "Total Materials Cost ($)" ||
          defaultHeading === "Total Financing/Funding ($)" ||
          defaultHeading === "Total Soft Costs ($)" ||
          defaultHeading === "Total Hard Costs ($)" ||
          defaultHeading === "Total Measure Cost ($)" ||
          defaultHeading === "Net Measure Cost ($)" ||
          defaultHeading === "First Year Cost ($)" ||
          defaultHeading === "Materials Unit Cost ($/unit)"
        ) {
          const sumValue =
            _numberWithCommas(
              tableArray.projects
                .filter(el => {
                  return el[heading] !== "-";
                })
                .reduce((prev, cur) => {
                  let text = cur[heading] || "";
                  let value =
                    typeof text === "string" && text.includes(",")
                      ? text.replace(",", "")
                      : text;
                  value = value ? +value : 0;
                  return prev + value;
                }, 0)
            ) || "-";
          obj[heading] = sumValue;
        } else {
          obj[heading] = "-";
        }
      });
      data.push(obj);
    }

    console.log("fieldHeadings", fieldHeadings);
    console.log("data", data);

    return tableUtils.generateTable(tableLayout, fieldHeadings, data, null);
  } catch (error) {
    console.error(error);
    return null;
  }
};

const getFullProjectDetails = async (
  projects,
  projectConfig,
  building,
  tableLayout,
  timeZone
) => {
  try {
    let projectsArray = JSON.parse(JSON.stringify(projects));
    let allBuildingEquipments = await reportClient.getBuildingEquipment(
      building
    );
    const styles = (projectConfig && projectConfig.styles) || {
      chs: "h1",
      phs: "h2",
      layout: "oneColumn"
    };
    let contents = (projectConfig && projectConfig.content) || [];
    contents = _.orderBy(contents, ["order"], ["asc"]);
    const includeDescription = !contents.some(item => item.key === "projectDesignTable" || item.key === "businessCaseTable")
    const projectGrouping =
      (projectConfig && projectConfig.projectGrouping) || "individual";
    const filters = (projectConfig && projectConfig.filter) || {
      type: [],
      category: [],
      application: [],
      technology: []
    };

    const defaultCategoryOrder = [
      "Agriculture",
      "Air Distribution",
      "Controls",
      "Cooling",
      "Custom",
      "Distributed Generation",
      "Energy Distribution",
      "Electrification",
      "Envelope",
      "Heating",
      "Heating & Cooling",
      "Kitchen",
      "Laundry",
      "LEED",
      "Lighting",
      "Plug Load",
      "Pool",
      "Process",
      "Refrigeration",
      "Service Optimization",
      "Storage",
      "Ventilation",
      "Water Heating",
      "Water Use"
    ];

    let categories = (filters && filters.category) || [];
    categories = _.orderBy(categories, ["order"], ["asc"]) || [];
    const filteredCategories =
      (categories.length > 0 && categories) ||
      defaultCategoryOrder.map(dcat => ({ name: dcat })); // in filter no categories selected in UI
    categories =
      (categories.length > 0 && categories.map(category => category.name)) ||
      defaultCategoryOrder;
    // filter the projects
    projectsArray = _filterProjects(projectsArray, filters, includeDescription);
    if (projectGrouping === "individual") {
      const config = { contents, styles, categories, tableLayout };
      return await _getProjectsData(
        true,
        config,
        projectsArray,
        building,
        timeZone
      );
    } else {
      // update all projects in array for location to hold string in place of array
      projectsArray.map(project => {
        project.location =
          project.location && project.location.length > 0
            ? project.location.join(", ")
            : "No Location";
      });
      // group the projects by category and location keys.
      const projectsGroupedBy = _.mapValues(
        _.groupBy(projectsArray, "project_category"),
        (projects, category) => _.groupBy(projects, "location")
      );
      // create a groupedArray
      const groupedProjects = {};
      for (let category of filteredCategories) {
        const categoryName = category.name || "";
        let categoryDescription = category.description || "";
        groupedProjects[categoryName] = [];
        const projectsGroupedByLocation =
          (projectsGroupedBy && projectsGroupedBy[categoryName]) || {};
        const locationKeys = Object.keys(projectsGroupedByLocation);
        switch (projectGrouping || "groupProject") {
          case "groupProject": {
            const projects =
              _.flatten(Object.values(projectsGroupedByLocation)) || [];
            const project = projects.find(
              project => project["project_application"]
            );
            const projectHeading =
              (project &&
                (project["project_application"] || "No Application")) ||
              "";
            let calcType = null;
            if (projects && projects.length > 0) {
              const run = projects[0].runResults[building._id];
              if (run && run["calculation-type"] === "savings-range") {
                calcType = "savings-range";
              }
            }
            if (projects.length > 0) {
              let groupedDescription = projects.map(project =>
                linebreak(project.description)
              );
              groupedDescription =
                groupedDescription && _.uniq(groupedDescription);
              groupedDescription =
                groupedDescription && groupedDescription.join("\n");
              categoryDescription = categoryDescription || groupedDescription;
              groupedProjects[categoryName].push({
                projectHeading: projectHeading,
                projects: projects,
                description: categoryDescription,
                imagesInReports: _.flatten(
                  projects.map(project => {
                    let imagesInReports = project.imagesInReports || [];
                    let equipmentIds = project.equipments || [];
                    for (let equipmentId of equipmentIds) {
                      if (isEmpty(allBuildingEquipments)) continue;
                      let equipment = allBuildingEquipments.find(
                        item => item._id.toString() === equipmentId.toString()
                      );
                      if (equipment) {
                        imagesInReports = [
                          ...imagesInReports,
                          ...equipment.images
                        ];
                      }
                    }
                    return imagesInReports;
                  })
                ),
                calcType: calcType
              });
            }
            break;
          }
          case "groupProjectLocation": {
            for (let lkey of locationKeys) {
              let calcType = null;
              const projects = projectsGroupedByLocation[lkey];
              const project = projects.find(
                project => project["project_application"]
              );
              if (projects && projects.length > 0) {
                let groupedDescription = projects.map(project =>
                  linebreak(project.description)
                );
                groupedDescription =
                  groupedDescription && _.uniq(groupedDescription);
                groupedDescription =
                  groupedDescription && groupedDescription.join("\n");
                categoryDescription = categoryDescription || groupedDescription;
                const run = projects[0].runResults[building._id];
                if (run && run["calculation-type"] === "savings-range") {
                  calcType = "savings-range";
                }
                groupedProjects[categoryName].push({
                  projectHeading: `${lkey} - ${(project &&
                    project["project_application"]) ||
                    "No Application"}`,
                  projects: projects || [],
                  description: categoryDescription,
                  imagesInReports: _.flatten(
                    projects.map(project => {
                      let imagesInReports = project.imagesInReports || [];
                      let equipmentIds = project.equipments || [];
                      for (let equipmentId of equipmentIds) {
                        if (isEmpty(allBuildingEquipments)) continue;
                        let equipment = allBuildingEquipments.find(
                          item => item._id.toString() === equipmentId.toString()
                        );
                        if (equipment) {
                          imagesInReports = [
                            ...imagesInReports,
                            ...equipment.images
                          ];
                        }
                      }
                      return imagesInReports;
                    })
                  ),
                  calcType: calcType
                });
              }
            }
            break;
          }
        }
      }
      const config = { contents, styles, categories, tableLayout };
      return await _getProjectsData(
        false,
        config,
        groupedProjects,
        building,
        timeZone
      );
    }
  } catch (error) {
    console.log(error);
    console.error(error);
  }
};

const _getProjectGroupResults = (calcType, projects, building, fields = []) => {
  try {
    const groupResults = {};
    if (calcType === "savings-range") {
      groupResults.annualSavings =
        getAnnualSavingsRanges(projects, building._id) || 0;
    } else {
      groupResults.annualSavings =
        projects.reduce((prev, curr) => {
          const isSubMeasure = hasSubMeasure(curr);
          return prev + isSubMeasure
            ? parseFloat(getTotalAnnualSavings(curr, building._id) || 0)
            : parseFloat(getAnnualSavings(curr.runResults[building._id]) || 0);
        }, 0) || 0;
    }
    groupResults.ghg = [];
    groupResults.ghgCost = [];
    projects.forEach(project => {
      const isSubMeasure = hasSubMeasure(project);
      const run = project["runResults"];
      const obj = run && run[building._id];
      const ghg = isSubMeasure
        ? getTotalGHGSavings(project, building._id)
        : (obj && obj.ghg) || 0;
      const ghgCost = isSubMeasure
        ? getTotalGHGCost(project, building._id)
        : (obj && obj["ghg-cost"]) || 0;
      groupResults.ghg.push(ghg);
      groupResults.ghgCost.push(ghgCost);
    });
    groupResults.projectCost =
      projects.reduce((prev, curr) => {
        const isSubMeasure = hasSubMeasure(curr);
        return prev + isSubMeasure
          ? getTotalProjectCost(curr)
          : parseFloat(getProjectCost(curr.initialValues) || 0);
      }, 0) || 0;
    groupResults.firstYearCost =
      projects.reduce((prev, curr) => {
        return (
          prev +
          parseFloat(
            getFirstYearCost(
              curr.initialValues,
              curr.runResults && curr.runResults[building._id]
            ) || 0
          )
        );
      }, 0) || 0;
    groupResults.incentive =
      projects.reduce((prev, curr) => {
        const isSubMeasure = hasSubMeasure(curr);
        return (
          prev +
          parseFloat(
            isSubMeasure
              ? getTotalIncentive(curr, building._id)
              : getIncentive(
                  curr.runResults && curr.runResults[building._id]
                ) || 0
          )
        );
      }, 0) || 0;
    groupResults.maintenanceSavings =
      projects.reduce((prev, curr) => {
        const isSubMeasure = hasSubMeasure(curr);
        return (
          prev +
          parseFloat(
            isSubMeasure
              ? getTotalMaintenanceSavings(curr)
              : getMaintenanceSavings(curr.initialValues) || 0
          )
        );
      }, 0) || 0;
    groupResults.simplePayback =
      groupResults.annualSavings > 0
        ? (
            (groupResults.projectCost - groupResults.incentive) /
            (groupResults.annualSavings + groupResults.maintenanceSavings)
          ).toFixed(2)
        : "-";

    groupResults.netProjectCost =
      groupResults.projectCost - groupResults.incentive;
    groupResults.roi =
      (
        (((groupResults.annualSavings || 0) + groupResults.maintenanceSavings) /
          (groupResults.projectCost - (groupResults.incentive || 0))) *
        100
      ).toFixed(0) || 0;
    groupResults.npvLast = projects.reduce((prev, curr) => {
      const isSubMeasure = hasSubMeasure(curr);
      return (
        prev +
        parseFloat(
          isSubMeasure
            ? getTotalNPV(curr, building._id)
            : getNPVLast(
                curr && curr.runResults && curr.runResults[building._id]
              ) || 0
        )
      );
    }, 0);

    const pvAll = [];
    projects.map(project => {
      const isSubMeasure = hasSubMeasure(project);
      if (isSubMeasure) {
        project.projects.map(item => {
          const run = item && item.runResults && item.runResults[building._id];
          if (
            run &&
            run["cash-flows"] &&
            run["cash-flows"].cash_flows !== undefined &&
            run["cash-flows"].cash_flows !== null &&
            run["cash-flows"].cash_flows.length > 0
          ) {
            run["cash-flows"].cash_flows.map(cashFlowObj => {
              pvAll.push(cashFlowObj.PV);
            });
          }
        });
      } else {
        const run =
          project && project.runResults && project.runResults[building._id];
        if (
          run &&
          run["cash-flows"] &&
          run["cash-flows"].cash_flows !== undefined &&
          run["cash-flows"].cash_flows !== null &&
          run["cash-flows"].cash_flows.length > 0
        ) {
          run["cash-flows"].cash_flows.map(cashFlowObj => {
            pvAll.push(cashFlowObj.PV);
          });
        }
      }
    });
    groupResults.pvAll = pvAll.reduce((prev, curr) => {
      return prev + curr;
    }, 0);
    groupResults.sir =
      groupResults.projectCost > 0
        ? (groupResults.pvAll / groupResults.projectCost).toFixed(2)
        : "-";
    groupResults.fuelSavings = {};

    // account for grouped projects with savings ranges
    if (calcType === "savings-range") {
      groupResults.energySavings = getEnergySavingsRanges(
        projects,
        building._id
      );
    } else {
      projects.map(project => {
        const isSubMeasure = hasSubMeasure(project);
        if (!groupResults.fuelSavings.gas) {
          groupResults.fuelSavings.gas = [];
        }
        groupResults.fuelSavings.gas.push(
          parseFloat(
            isSubMeasure
              ? calculateTotalEnergySavings(project, building._id, "gas")
              : getEnergySavingsByFuel(project, "gas", building._id) || 0
          )
        );
        if (!groupResults.fuelSavings.water) {
          groupResults.fuelSavings.water = [];
        }
        groupResults.fuelSavings.water.push(
          parseFloat(
            isSubMeasure
              ? calculateTotalEnergySavings(project, building._id, "water")
              : getEnergySavingsByFuel(project, "water", building._id) || 0
          )
        );
        // default is electic
        if (!groupResults.fuelSavings.electric) {
          groupResults.fuelSavings.electric = [];
        }
        groupResults.fuelSavings.electric.push(
          parseFloat(
            isSubMeasure
              ? calculateTotalEnergySavings(project, building._id, "electric")
              : getEnergySavingsByFuel(project, "electric", building._id) || 0
          )
        );
      });
    }

    const electricSavings =
      (groupResults.fuelSavings.electric || []).reduce(
        (prev, current) => prev + Number(current),
        0
      ) || 0;
    const gasSavings = (groupResults.fuelSavings.gas || []).reduce(
      (prev, current) => prev + Number(current),
      0
    );
    const waterSavings = (groupResults.fuelSavings.water || []).reduce(
      (prev, current) => prev + Number(current),
      0
    );
    const ghgSavings = (groupResults.ghg || []).reduce(
      (prev, current) => prev + Number(current),
      0
    );
    const ghgCost = (groupResults.ghgCost || []).reduce(
      (prev, current) => prev + Number(current),
      0
    );

    groupResults.demand = [];
    groupResults.eul = [];
    projects.forEach(project => {
      const isSubMeasure = hasSubMeasure(project);
      const run = project["runResults"];
      const obj = run && run[building._id];
      const demand = isSubMeasure
        ? getTotalDemandSavings(project, building._id)
        : (obj && getEnergySavingsByFuel(project, "demand", building._id)) || 0;
      const eul = isSubMeasure
        ? getTotalEUL(project, building._id)
        : (obj && getEnergySavingsByFuel(project, "eul", building._id)) || 0;
      groupResults.demand.push(demand);
      groupResults.eul.push(eul);
    });

    const demandSavings = (groupResults.demand || []).reduce(
      (prev, current) => prev + Number(current),
      0
    );
    const eul = (groupResults.eul || []).reduce(
      (prev, current) => prev + Number(current),
      0
    );

    if (projects.length === 1) {
      let project = projects[0];
      const isSubMeasure = hasSubMeasure(project);
      const run =
        (project && project.runResults && project.runResults[building._id]) ||
        null;
      groupResults.simplePayback = isSubMeasure
        ? getTotalSimplePayback(project, building._id)
        : (run && getSimplePayback(run)) || "-";
      groupResults.roi = isSubMeasure
        ? calculateTotalROI(project, building._id)
        : (run && calculateROI(project, building._id)) || "-";
      groupResults.sir = isSubMeasure
        ? getTotalSIR(project, building._id)
        : (run && getSIR(run)) || "-";
    }

    const annual_energy_savings = _.round(
      getTotalEnergySavings(electricSavings, gasSavings),
      2
    );

    const returnObject = {
      estimated_incentive: groupResults.incentive,
      total_project_cost: groupResults.projectCost,
      net_project_cost: groupResults.netProjectCost,
      annual_savings: groupResults.annualSavings,
      first_year_cost: groupResults.firstYearCost,
      annual_electric_savings:
        electricSavings && Number(electricSavings).toLocaleString(),
      annual_gas_savings: gasSavings && Number(gasSavings).toLocaleString(),
      water_savings: waterSavings && Number(waterSavings).toLocaleString(),
      annual_energy_savings:
        annual_energy_savings && Number(annual_energy_savings).toLocaleString(),
      roi:
        calcType !== "savings-range"
          ? isNaN(groupResults.roi)
            ? "-"
            : _numberWithCommas(groupResults.roi) || "-"
          : "-",
      simple_payback: groupResults.simplePayback,
      npv: groupResults.npvLast,
      sir: groupResults.sir,
      ghg: Number(ghgSavings).toLocaleString(),
      "ghg-cost": Number(ghgCost).toLocaleString(),
      demand_savings: Number(demandSavings).toLocaleString(),
      eul: Number(eul).toLocaleString()
    };

    for (let fieldName of fields) {
      let field = convertFieldName(fieldName);
      let isNumber = false,
        value = "-";
      let values = projects
        .map(project => _getFieldValue(field, project, building._id))
        .filter(item => item && item !== "-");
      isNumber = values.every(item => item == +item);
      if (isNumber) value = _.sum(values);
      else value = values.join(", ");
      value = value || "-";
      if (!returnObject[fieldName]) returnObject[fieldName] = value;
    }

    return returnObject;
  } catch (error) {
    console.error(error);
    console.log(error);
  }
};

/**
 * returns the html string for Full Project Details
 * @param {Boolean} individual - projectGrouping is individual or not
 * @param {Object} config - {contents: projectConfig.filter.contents, styles: projectConfig.filter.styles, categories: []}
 * @param {Array} projects - Array of projects (individual === true) | Array of GroupedBy Projects (individual === false) based on "individual" value
 * @param {Object} building - Building Object
 */
const _getProjectsData = async (
  individual = true,
  config,
  projects,
  building,
  timeZone
) => {
  try {
    const projectsGroupedByCategory =
      (individual && _.groupBy(projects, "project_category")) || projects;
    const { contents, styles, categories, tableLayout } = config; // contents and categories are already in order given by the client.
    const chs = (styles && styles.chs) || "h1";
    const phs = (styles && styles.phs) || "h2";
    const layout = (styles && styles.layout) || "oneColumn";
    let resultString = "";

    for (let category of categories) {
      const projects =
        (projectsGroupedByCategory && projectsGroupedByCategory[category]) ||
        [];
      if (!projects || projects.length === 0) continue;
      resultString += `<p><${chs}>${capitalize(category)}</${chs}></p>`;
      for (let project of projects) {
        let imageData = [];
        if (timeZone) {
          imageData = await reportClient.getProjectImageData(project._id);
        }
        if (individual) {
          const projectHeading =
            (project && project["displayName"]) || "No Application";
          resultString += `<p><${phs}>${projectHeading}</${phs}></p>`;
          switch (layout) {
            case "oneColumn": {
              for (let content of contents) {
                resultString += _getContentData(
                  true,
                  content,
                  [project],
                  building,
                  null,
                  tableLayout,
                  imageData,
                  timeZone
                );
              }
              break;
            }
            case "twoColumn": {
              const leftContent = contents.find(
                content => content.key === "description"
              );
              let rightContents = contents.filter(content =>
                ["photoCaption", "images"].includes(content.key)
              );
              rightContents =
                rightContents && _.orderBy(rightContents, ["order"], ["asc"]);
              const bottomContents = contents.filter(
                content =>
                  !["description", "photoCaption", "images"].includes(
                    content.key
                  )
              );
              let leftHtml = _getContentData(
                true,
                leftContent,
                [project],
                building,
                null,
                tableLayout,
                imageData,
                timeZone
              );
              leftHtml = (leftHtml && `<td>${leftHtml}</td>`) || "";
              let rightHtml =
                (rightContents &&
                  rightContents
                    .map(rcontent =>
                      _getContentData(
                        true,
                        rcontent,
                        [project],
                        building,
                        null,
                        tableLayout,
                        imageData,
                        timeZone
                      )
                    )
                    .join("")) ||
                "";
              rightHtml = (rightHtml && `<td>${rightHtml}</td>`) || "";
              let bottomHtml =
                (bottomContents &&
                  bottomContents
                    .map(bcontent =>
                      _getContentData(
                        true,
                        bcontent,
                        [project],
                        building,
                        null,
                        tableLayout,
                        imageData,
                        timeZone
                      )
                    )
                    .join("")) ||
                "";
              bottomHtml = (bottomHtml && `<p>${bottomHtml}</p><br/>`) || "";
              resultString += `<p><table border="0" valign="top" id="twoColumn"><tr>${leftHtml}${rightHtml}</tr></table></p>`;
              resultString += (bottomHtml && `<br/>${bottomHtml}`) || "";
              break;
            }
          }
        } else {
          const projectHeading = (project && project.projectHeading) || "";
          resultString += `<p><${phs}>${projectHeading}</${phs}></p>`;
          switch (layout) {
            case "oneColumn": {
              for (let content of contents) {
                resultString += _getContentData(
                  false,
                  content,
                  null,
                  building,
                  project,
                  tableLayout,
                  imageData,
                  timeZone
                );
              }
              break;
            }
            case "twoColumn": {
              const leftContent = contents.find(
                content => content.key === "description"
              );
              let rightContents = contents.filter(content =>
                ["photoCaption", "images"].includes(content.key)
              );
              rightContents =
                rightContents && _.orderBy(rightContents, ["order"], ["asc"]);
              const bottomContents = contents.filter(
                content =>
                  !["description", "photoCaption", "images"].includes(
                    content.key
                  )
              );
              let leftHtml = _getContentData(
                false,
                leftContent,
                null,
                building,
                project,
                tableLayout,
                imageData,
                timeZone
              );
              leftHtml = (leftHtml && `<td>${leftHtml}</td>`) || "";
              let rightHtml =
                (rightContents &&
                  rightContents
                    .map(rcontent =>
                      _getContentData(
                        false,
                        rcontent,
                        null,
                        building,
                        project,
                        tableLayout,
                        imageData,
                        timeZone
                      )
                    )
                    .join("")) ||
                "";
              rightHtml = (rightHtml && `<td>${rightHtml}</td>`) || "";
              let bottomHtml =
                (bottomContents &&
                  bottomContents
                    .map(bcontent =>
                      _getContentData(
                        false,
                        bcontent,
                        null,
                        building,
                        project,
                        tableLayout,
                        imageData,
                        timeZone
                      )
                    )
                    .join("")) ||
                "";
              bottomHtml = (bottomHtml && `<p>${bottomHtml}</p><br/>`) || "";
              resultString += `<p><table id="twoColumn" border="0" valign="top"><tr>${leftHtml}${rightHtml}</tr></table></p>`;
              resultString += (bottomHtml && `<br/>${bottomHtml}`) || "";
              break;
            }
          }
        }
      }
    }
    resultString = (resultString && `${resultString}<br/>`) || "";
    return resultString;
  } catch (error) {
    console.log(error);
    console.error(error);
  }
};

const _filterProjects = (projects, filters, includeDescription = true) => {
  try {
    const types = [];
    const categories = [];
    const applications = [];
    const technologies = [];

    // create/format simple arrays to work with later on when filtering out projects
    if (filters) {
      Object.keys(filters).map(filter => {
        filters[filter]
          .filter(option => !!option.name)
          .map(option => {
            switch (filter) {
              case "type":
                return types.push(
                  (option.name && option.name.toLowerCase()) || ""
                );
              case "category":
                return categories.push(
                  (option.name && option.name.toLowerCase()) || ""
                );
              case "application":
                return applications.push(
                  (option.name && option.name.toLowerCase()) || ""
                );
              case "technology":
                return technologies.push(
                  (option.name && option.name.toLowerCase()) || ""
                );
            }
          });
      });
    }

    // if the project type matches any of the given types from the report
    projects = projects.filter(project => {
      let projectType;
      if (project.type) {
        projectType = project.type.toLowerCase();
      } else {
        projectType =
          project.incentive && project.incentive.incentive_type === "none"
            ? "retrofit"
            : "incentive";
      }
      projectType = (projectType && projectType.toLowerCase()) || "";
      return types.length > 0 ? types.indexOf(projectType) !== -1 : true;
    });

    // if the project categories array contains one or more items from the categories array from the report.
    projects = projects.filter(project => {
      return categories.length > 0
        ? categories.includes(project.project_category.toLowerCase())
        : true;
    });
    // if the project applciation is the same as any of the applications array from the report
    projects = projects.filter(project => {
      let application;
      if (project.project_application === "Air Conditioner")
        application = "air_conditioner";
      else application = project.project_application;
      return applications.length > 0
        ? applications.includes(application.toLowerCase())
        : true;
    });
    // if the project technology is the same as any of the technologies array from the report
    projects = projects.filter(project => {
      let technology;
      if (
        project.project_technology ===
        "Packaged Terminal Air Conditioner (PTAC)"
      )
        technology = "PACKAGED_TERMINAL_AIR_CONDITIONER_PTAC";
      else technology = project.project_technology;
      return technologies.length > 0
        ? technologies.includes(technology.toLowerCase())
        : true;
    });

    if(!includeDescription) {
      projects = projects.filter(project => project.category !== 'description');
    }

    return projects;
  } catch (error) {
    console.error(error);
  }
};

const _getRangeTotals = (array, key, range) => {
  try {
    let total = 0;
    const bounds = range === "low" ? 0 : 1;
    array.forEach(project => {
      if (project["calculation-type"] === "savings-range") {
        if (!isNaN(project[key].toString().split(" - ")[bounds])) {
          total = Number(project[key].toString().split(" - ")[bounds]) + total;
        }
      } else {
        if (!isNaN(project[key])) {
          total = project[key] + total;
        }
      }
    });
    return total;
  } catch (error) {
    console.error(error);
  }
};

const _groupByCalcs = (array, f) => {
  try {
    const calcs = [];
    array.forEach(o => {
      const calc = f(o)[0];
      const location = f(o)[1];
      let calcObject;

      if (f(o).length === 2) {
        // group by calc and location
        calcObject = calcs.find(
          item => item.calc === calc && item.location === location
        );
      } else if (f(o).length === 1) {
        // group by calc
        calcObject = calcs.find(item => item.calc === calc);
      }

      // if calc object exists, push project into projects array that should already exist
      if (calcObject && calcObject.calc !== "none") {
        // create new calc object if there are description-only projects
        calcObject.projects.push(o);
        // if not, create object, name it with calcs(and maybe location
        // depending on the projectConfiguration), and add projects
      } else {
        calcObject = {};
        calcObject.calc = calc;
        calcObject.projects = [o];
        // add location if you're grouping by it
        if (f(o).length === 2) {
          calcObject.location = location;
        }
        calcs.push(calcObject);
      }
    });
    return calcs;
  } catch (error) {
    console.error(error);
  }
};

const _getContentData = (
  isIndividual,
  content,
  projects,
  building,
  groupedProjects = null,
  tableLayout,
  imageData = [],
  timeZone
) => {
  try {
    const fields = (content && content.fields) || [];
    const customLabels = (content && content.customLabels) || [];
    projects =
      (isIndividual && projects) ||
      (groupedProjects && groupedProjects.projects) ||
      [];
    const project = (isIndividual && projects[0]) || null;
    switch (content.key) {
      case "photoCaption":
        const photoCaption = "";
        return (photoCaption && `<p>${photoCaption}</p>`) || "";
      case "description":
        const description =
          (project && project.description) ||
          (groupedProjects && groupedProjects.description) ||
          "";
        return (
          (description && `<p>${linebreak(description)}</p><p> </p>`) || ""
        );
      case "images":
        const images =
          (project && project.imagesInReports) ||
          (groupedProjects && groupedProjects.imagesInReports) ||
          [];
        let htmlString = "";
        const showTimestamp = content.timestamp;
        images.forEach(img => {
          let timeZoneStr = "";
          if (showTimestamp && timeZone) {
            const syncedData = imageData.find(image => image.uri === url);
            let timestamp = null;
            if (syncedData) {
              timestamp = syncedData.createdAt;
            } else {
              timestamp = project.created;
            }
            if (timestamp) {
              timeZoneStr = `data-timestamp="${moment(timestamp)
                .tz(timeZone)
                .format("MM/DD/YYYY h:mm a")}"`;
            }
          }
          htmlString +=
            (img &&
              `<img src="${img}" ${timeZoneStr} width="${IMAGE_WIDTH}"/>`) ||
            "";
        });
        return htmlString;
      case "projectDesignTable": {
        let fieldHeadings = []; // {name:"", label: ""}
        const data = []; // [{ label1: value1 , label2: value2, ...}, ...]
        const hideOptions = [
          "hvac_type",
          "xcelLEDLighting_rebate_type",
          "dlc_qualified",
          "energy_star_qualified",
          "xcelLEDLighting_rebate",
          "localOverrideDefaultBlendedElectricRate",
          "localBlendedElectricRate",
          "localOverrideDefaultElectricDemandRate",
          "localElectricDemandRate",
          "localOverrideDefaultElectricUsage",
          "localElectricUsageRate"
        ];
        for (let field of fields) {
          if (field === "design_fields" || field === "project.design_fields") {
            projects.forEach(project => {
              let designFields = (project && project.fields) || [];
              if (
                project.name === "xcelLEDLighting" &&
                project.originalDisplayName === "Exterior LED Lighting"
              ) {
                designFields = [
                  ...designFields,
                  {
                    name: "Incentive Cost",
                    label: "Incentive Cost"
                  },
                  {
                    name: "Measure Cost",
                    label: "Measure Cost"
                  }
                ];
              }
              designFields.forEach(dfield => {
                const { name, label } = convertNameLabelForXcelMeasure(dfield);
                if (
                  !fieldHeadings.find(fheading => fheading.name === name) &&
                  hideOptions.indexOf(name) === -1 &&
                  dfield !== `${project.name}RebateType`
                ) {
                  fieldHeadings.push({
                    name: name,
                    label: label,
                    customLabel: label
                  });
                }
              });
            });
          } else {
            if (!fieldHeadings.find(fheading => fheading.name === field)) {
              fieldHeadings.push({
                name: field,
                label: fieldUtils.getHeading(field),
                customLabel: fieldUtils.getHeading(field, customLabels)
              });
            }
          }
        }
        fieldHeadings = sortFieldByOrder(fieldHeadings, project);
        projects.forEach(project => {
          const innerObject = {};
          for (let fieldHeading of fieldHeadings) {
            const { name, label, customLabel = "" } = fieldHeading || {
              name: "",
              label: ""
            };
            const realName = convertFieldName(name);
            const realLabel = customLabel || label;
            innerObject[realLabel] =
              _getFieldValue(realName, project, building._id) || "-";
            if (label === "Annual Op. Hours") {
              innerObject[realLabel] =
                ledLightingUtils.calculateAnnualHours(project) || "-";
            } else if (label === "Fixture Quantity") {
              innerObject[realLabel] =
                (project.initialValues &&
                  project.initialValues.qty_existing_equip) ||
                "-";
            } else if (label === "Existing Fixture Type") {
              innerObject[realLabel] =
                (project.initialValues &&
                  project.initialValues.existing_equipment_name) ||
                "-";
            } else if (label === "Existing Fixture Wattage (Watts)") {
              innerObject[realLabel] =
                (project.initialValues &&
                  project.initialValues.existing_equipment_wattage) ||
                "-";
            } else if (label === "Proposed Fixture Type") {
              innerObject[realLabel] =
                (project.initialValues &&
                  project.initialValues.xcelLEDLighting_replace_name) ||
                "-";
            } else if (label === "Proposed Fixture Wattage (Watts)") {
              innerObject[realLabel] =
                (project.initialValues &&
                  project.initialValues.xcelLEDLighting_replace_wattage) ||
                "-";
            } else if (label === "Incentive Cost") {
              innerObject[realLabel] =
                (project.initialValues && project.initialValues.input) || "-";
            } else if (label === "Measure Cost") {
              innerObject[realLabel] =
                (project.initialValues && project.initialValues.project_cost) ||
                "-";
            }
          }
          data.push(innerObject);
        });
        let customFieldHeadings = fieldHeadings.map(item => ({
          name: item.name,
          label: item.customLabel || item.label
        }));
        return (
          tableUtils.generateTable(
            tableLayout || "horizontal",
            customFieldHeadings,
            data
          ) + "<br/>"
        );
      }
      case "businessCaseTable": {
        const fieldHeadings = []; // { name: "", label: ""}
        const data = []; // [{ label1: value1 , label2: value2, ...}, ...]
        const prjct =
          (isIndividual && project) ||
          (groupedProjects && groupedProjects.projects[0]);
        const run = prjct.runResults && prjct.runResults[building._id];
        let calcType = null;
        if (run && run["calculation-type"] === "savings-range") {
          calcType = "savings-range";
        }
        const groupResults = _getProjectGroupResults(
          calcType,
          projects,
          building,
          fields
        );

        fields.forEach(field => {
          const found = fieldHeadings.find(fheading => fheading.name === field);
          if (!found)
            fieldHeadings.push({
              name: field,
              label: fieldUtils.getHeading(field, customLabels)
            });
        });
        const obj = {};
        fieldHeadings.forEach(fHeading => {
          const name = fHeading.name;
          const label = fHeading.label;
          obj[label] = (groupResults && groupResults[name]) || "-";
        });
        data.push(obj);
        const headings = ["Cost Benefit Analysis"];
        return (
          tableUtils.generateTable("split", fieldHeadings, data, headings) +
          "<br/>"
        );
      }
      default:
        return "";
    }
  } catch (error) {
    console.log(error);
    console.error(error);
  }
};

const convertFieldName = (fieldName = "") => {
  return fieldName.includes(".") ? fieldName.split(".")[1] : fieldName;
};

/*
 * Measure Financial Field value
 */

const _getFinanceValue = (initialValues, fieldName) => {
  let field = fieldName;
  if (field === "total_financing_funding") {
    field = "project_total_financing_funding";
  }
  let returnValue = (initialValues && initialValues[field]) || "-";
  return returnValue;
};

const _getFieldValue = (fieldName, project, buildingId) => {
  const initialValues = (project && project.initialValues) || null;
  const isSubMeasure = hasSubMeasure(project);
  const run =
    (project && project.runResults && project.runResults[buildingId]) || null;
  const incentiveObject = (project && project.incentive) || null;
  let field = convertFieldName(fieldName);
  let financeFields = [
    "total_financing_funding",
    "total_hard_cost",
    "total_soft_cost",
    "material_unit_cost",
    "material_quantity",
    "material_cost",
    "labor_rate",
    "labor_unit_cost",
    "labor_quantity",
    "total_labor_cost",
    "installation_factors",
    "utility_service_upgrades",
    "temporary_services",
    "environment_unit_cost",
    "environment_quantity",
    "total_environment_unit_cost",
    "contingency",
    "profit",
    "taxes",
    "other_hard_cost",
    "pre_design",
    "design_fees",
    "permits",
    "construction_management",
    "material_handling",
    "test_and_balancing",
    "commissioning",
    "program_fees",
    "overhead",
    "other_soft_cost",
    "total_soft_cost",
    "finance_cost_share",
    "finance_cost_share_rate",
    "finance_finance",
    "finance_finance_rate",
    "fund_cost_share",
    "fund_cost_share_rate",
    "fund_finance",
    "fund_finance_rate",
    "hours"
  ];

  switch (field) {
    case "estimated_incentive":
      const eincentive = isSubMeasure
        ? getTotalIncentive(project, buildingId)
        : (run && getIncentive(run)) || "-";
      return (eincentive !== "-" && Number(eincentive).toLocaleString()) || "-";
    case "total_project_cost":
    case "total_cost":
      const totalProjectCost = isSubMeasure
        ? getTotalProjectCost(project, buildingId)
        : (initialValues && getProjectCost(initialValues)) || "-";
      return (
        (totalProjectCost !== "-" &&
          Number(totalProjectCost).toLocaleString()) ||
        "-"
      );
    case "net_project_cost":
      const netProjectCost = isSubMeasure
        ? getTotalProjectCost(project, buildingId) -
          getTotalIncentive(project, buildingId)
        : (initialValues &&
            run &&
            getProjectCost(initialValues) - getIncentive(run)) ||
          "-";
      return (
        (netProjectCost !== "-" && Number(netProjectCost).toLocaleString()) ||
        "-"
      );
    case "first_year_cost":
      const firstYearCost =
        (initialValues && run && getFirstYearCost(initialValues, run)) || "-";
      return (
        (firstYearCost !== "-" && Number(firstYearCost).toLocaleString()) || "-"
      );
    case "annual_electric_savings":
      return isSubMeasure
        ? calculateTotalEnergySavings(project, buildingId, "electric")
        : (run && getEnergySavingsByFuel(project, "electric", buildingId)) ||
            "-";
    case "annual_gas_savings":
      return isSubMeasure
        ? calculateTotalEnergySavings(project, buildingId, "gas")
        : (run && getEnergySavingsByFuel(project, "gas", buildingId)) || "-";

    case "annual_savings":
      const annualSavings = isSubMeasure
        ? getTotalAnnualSavings(project, buildingId)
        : (run && getAnnualSavings(run)) || "-";
      return (
        (annualSavings !== "-" && Number(annualSavings).toLocaleString()) || "-"
      );
    case "annual_energy_savings":
      const annualEnergySavings = isSubMeasure
        ? getTotalTotalEnergySavings(project, buildingId)
        : (run &&
            getTotalEnergySavings(
              getEnergySavingsByFuel(project, "electric", buildingId),
              getEnergySavingsByFuel(project, "gas", buildingId)
            )) ||
          "-";
      return (
        (annualEnergySavings !== "-" &&
          Number(annualEnergySavings).toLocaleString()) ||
        "-"
      );
    case "water_savings":
      return isSubMeasure
        ? calculateTotalEnergySavings(project, buildingId, "water")
        : (run && getEnergySavingsByFuel(project, "water", buildingId)) || "-";
    case "roi":
      return isSubMeasure
        ? calculateTotalROI(project, buildingId)
        : calculateROI(project, buildingId) || "-";
    case "simple_payback":
      return isSubMeasure
        ? getTotalSimplePayback(project, buildingId)
        : (run && getSimplePayback(run)) || "-";
    case "npv":
      return isSubMeasure
        ? getTotalNPV(project, buildingId)
        : (run && getNPV(run)) || "-";
    case "sir":
      return isSubMeasure
        ? getTotalSIR(project, buildingId)
        : (run && getSIR(run)) || "-";

    case "name":
      return (project && project.displayName) || "-";
    case "description":
      return (project && project.description) || "-";
    case "implementation_strategy":
      return (initialValues && initialValues.implementationStrategy) || "N/A";
    case "incentive":
      const incentive = isSubMeasure
        ? getTotalIncentive(project, buildingId)
        : (run && getIncentive(run)) || "-";
      return (incentive !== "-" && Number(incentive).toLocaleString()) || "-";
    case "utility_company":
      return (incentiveObject && incentiveObject.utility_company) || "-";
    case "rebate_code":
      return (incentiveObject && incentiveObject.rebate_code) || "-";
    case "existing_requirements":
      return (incentiveObject && incentiveObject.existing_requirements) || "-";
    case "design_requirements":
      return (incentiveObject && incentiveObject.design_requirements) || "-";
    case "project_cost":
      const projectCost = isSubMeasure
        ? getTotalProjectCost(project, buildingId)
        : (initialValues && getProjectCost(initialValues)) || "-";
      return (
        (projectCost !== "-" && Number(projectCost).toLocaleString()) || "-"
      );
    case "energy_savings":
      const energySavings = isSubMeasure
        ? _.round(getTotalTotalEnergySavings(project, buildingId), 2)
        : (run &&
            _.round(
              getTotalEnergySavings(
                getEnergySavingsByFuel(project, "electric", buildingId),
                getEnergySavingsByFuel(project, "gas", buildingId)
              ),
              2
            )) ||
          "-";
      return (
        (energySavings !== "-" && Number(energySavings).toLocaleString()) || "-"
      );
    case "electric_savings":
      return isSubMeasure
        ? calculateTotalEnergySavings(project, buildingId, "electric")
        : (run && getEnergySavingsByFuel(project, "electric", buildingId)) ||
            "-";
    case "demand":
    case "demand_savings":
      return isSubMeasure
        ? getTotalDemandSavings(project, buildingId)
        : (run && getEnergySavingsByFuel(project, "demand", buildingId)) || "-";
    case "eul":
      return isSubMeasure
        ? getTotalEUL(project, buildingId)
        : (run && getEnergySavingsByFuel(project, "eul", buildingId)) || "-";
    case "gas_savings":
      return isSubMeasure
        ? calculateTotalEnergySavings(project, buildingId, "gas")
        : (run && getEnergySavingsByFuel(project, "gas", buildingId)) || "-";
    case "ghg":
      const ghg = isSubMeasure
        ? getTotalGHGSavings(project, buildingId)
        : run && getGHGSavings(run);
      return (ghg && Number(ghg).toLocaleString()) || "-";
    case "ghg-cost":
      const ghgcost = isSubMeasure
        ? getTotalGHGCost(project, buildingId)
        : run && getGHGCost(run);
      return (ghgcost && Number(ghgcost).toLocaleString()) || "-";
    case "existing_equipment":
      return project.initialValues.existing_equipment_name || "-";
    case "xcelLEDlighting_annual_lighting_hours":
      let annualHours = ledLightingUtils.calculateAnnualHours(project);
      return annualHours;
    case "project_total_financing_funding":
      return (
        (initialValues && initialValues.project_total_financing_funding) || 0
      );
    case "material_unit_cost":
      return (initialValues && initialValues.material_unit_cost) || 0;
    case "material_quantity":
      return (initialValues && initialValues.material_quantity) || 0;
    case "material_cost":
      return (initialValues && initialValues.material_cost) || 0;
    case "hours":
      return (initialValues && initialValues.hours) || 0;
    case "total_labor_cost":
      return (initialValues && initialValues.total_labor_cost) || 0;
    case "installation_factors":
      return (initialValues && initialValues.installation_factors) || 0;
    case "utility_service_upgrades":
      return (initialValues && initialValues.utility_service_upgrades) || 0;
    case "temporary_services":
      return (initialValues && initialValues.temporary_services) || 0;
    case "environment_unit_cost":
      return (initialValues && initialValues.environment_unit_cost) || 0;
    case "environment_quantity":
      return (initialValues && initialValues.environment_quantity) || 0;
    case "total_environment_unit_cost":
      return (initialValues && initialValues.total_environment_unit_cost) || 0;
    case "contingency":
      return (initialValues && initialValues.contingency) || 0;
    case "profit":
      return (initialValues && initialValues.profit) || 0;
    case "taxes":
      return (initialValues && initialValues.taxes) || 0;
    case "other_hard_cost":
      return (initialValues && initialValues.other_hard_cost) || 0;
    case "total_hard_cost":
      return (initialValues && initialValues.total_hard_cost) || 0;
    case "pre_design":
      return (initialValues && initialValues.pre_design) || 0;
    case "permits":
      return (initialValues && initialValues.permits) || 0;
    case "material_handling":
      return (initialValues && initialValues.material_handling) || 0;
    case "test_and_balancing":
      return (initialValues && initialValues.test_and_balancing) || 0;
    case "commissioning":
      return (initialValues && initialValues.commissioning) || 0;
    case "program_fees":
      return (initialValues && initialValues.program_fees) || 0;
    case "overhead":
      return (initialValues && initialValues.overhead) || 0;
    case "other_soft_cost":
      return (initialValues && initialValues.other_soft_cost) || 0;
    case "total_soft_cost":
      return (initialValues && initialValues.total_soft_cost) || 0;
    case "finance_cost_share":
      return (initialValues && initialValues.finance_cost_share) || 0;
    case "finance_cost_share_rate":
      return (initialValues && initialValues.finance_cost_share_rate) || 0;
    case "finance_finance":
      return (initialValues && initialValues.finance_finance) || 0;
    case "finance_finance_rate":
      return (initialValues && initialValues.finance_finance_rate) || 0;
    case "fund_cost_share":
      return (initialValues && initialValues.fund_cost_share) || 0;
    case "fund_cost_share_rate":
      return (initialValues && initialValues.fund_cost_share_rate) || 0;
    case "fund_finance":
      return (initialValues && initialValues.fund_finance) || 0;
    case "fund_finance_rate":
      return (initialValues && initialValues.fund_finance_rate) || 0;
    default:
      let returnValue = "-";
      if (financeFields.includes(field)) {
        returnValue = _getFinanceValue(initialValues, field);
      } else {
        const designFields = (project && project.fields) || [];
        const found = designFields.find(dfield => dfield.name === field);
        if (found) {
          returnValue = (initialValues && initialValues[field]) || "-";
        }
      }
      return returnValue;
  }
};

/*
 * Print section title for images, if there are images
 */

const _groupProjectsByCategory = ({ projects, categories }) => {
  const projectCategories = [];
  projects.forEach(o => {
    let categoryObject;
    const category = o.project_category;

    categoryObject = projectCategories.find(item => item.category === category);

    if (categoryObject) {
      categoryObject.projects.push(o);
    } else {
      categoryObject = {};
      categoryObject.category = category;
      categoryObject.projects = [o];
      if (category && categories) {
        let categoryDescription = "";
        const categoryFound = categories.find(item => item.name === category);
        if (categoryFound) {
          categoryDescription = categoryFound.description;
          categoryObject.description = categoryDescription;
        }
      }
      projectCategories.push(categoryObject);
    }
  });
  return _mapOrder(projectCategories, categories);
};

const _groupProjectsByCategoryAndLocation = ({ projects, categories }) => {
  const projectCategories = [];
  projects.forEach(o => {
    let categoryObject;
    const category = o.project_category;
    let location;

    // project location is a deprecated way to save project locations as a list of strings
    if (o.location && o.location.length > 0) {
      location = o.location.sort();
    } else {
      const projectLocations = o.locations.map(l => l.name).sort();
      location = projectLocations;
    }

    categoryObject = projectCategories.find(
      projectCategory =>
        projectCategory.category === category &&
        JSON.stringify(projectCategory.location) === JSON.stringify(location)
    );

    if (categoryObject) {
      categoryObject.projects.push(o);
    } else {
      categoryObject = {};
      categoryObject.category = category;
      categoryObject.projects = [o];
      categoryObject.location = location;
      if (category && categories) {
        let categoryDescription = "";
        const categoryFound = categories.find(item => item.name === category);
        if (categoryFound) {
          categoryDescription = categoryFound.description;
          categoryObject.description = categoryDescription;
        }
      }
      projectCategories.push(categoryObject);
    }
  });
  return _mapOrder(projectCategories, categories);
};

const _mapOrder = (array, categories) => {
  categories = categories.map(category => category.name);
  const order = categories.length > 0 ? categories : defaultCategoryOrder;
  array.sort((a, b) => {
    const A = a.category;
    const B = b.category;
    return order.indexOf(A) > order.indexOf(B) ? 1 : -1;
  });
  return array;
};

const convertNameLabelForXcelMeasure = field => {
  let { name, label } = field;
  switch (label) {
    case "Existing Equipment Name":
      name = "Existing Fixture Type";
      label = "Existing Fixture Type";
      break;
    case "Existing Equipment Wattage":
      name = "Existing Fixture Wattage (Watts)";
      label = "Existing Fixture Wattage (Watts)";
      break;
    case "Existing Equipment Quantity":
      name = "Fixture Quantity";
      label = "Fixture Quantity";
      break;
    case "Replacement Name":
      name = "Proposed Fixture Type";
      label = "Proposed Fixture Type";
      break;
    case "Replacement Wattage":
    case "Replacement Fixture Wattage":
      name = "Proposed Fixture Wattage (Watts)";
      label = "Proposed Fixture Wattage (Watts)";
      break;
    case "Annual Lighting Hours":
      name = "Annual Op. Hours";
      label = "Annual Op. Hours";
      break;
    default:
      break;
  }
  return { name, label };
};

const sortFieldByOrder = (fieldHeadings, project) => {
  let sortedHeading = [];
  if (!project || project.name !== "xcelLEDLighting") return fieldHeadings;
  let order = [
    "Existing Fixture Type",
    "Existing Fixture Wattage (Watts)",
    "Fixture Quantity",
    "Proposed Fixture Type",
    "Proposed Fixture Wattage (Watts)",
    "Annual Op. Hours"
  ];
  order.forEach(item => {
    let originHeading = fieldHeadings.filter(heading => heading.name == item);
    if (originHeading.length) {
      sortedHeading = [
        ...sortedHeading,
        {
          ...originHeading[0]
        }
      ];
    }
  });
  sortedHeading = [
    ...sortedHeading,
    ...fieldHeadings.filter(heading => order.indexOf(heading.name) === -1)
  ];
  return sortedHeading;
};

const getProjectCardTable = (projects = [], projectConfig, building) => {
  try {
    let projectsArray = JSON.parse(JSON.stringify(projects));
    const projectGrouping =
      (projectConfig && projectConfig.projectGrouping) || "individual";
    const filters = (projectConfig && projectConfig.filter) || {
      type: [],
      category: [],
      application: [],
      technology: []
    };
    let categories = (filters && filters.category) || [];
    categories = _.orderBy(categories, ["order"], ["asc"]) || [];
    const filteredCategories =
      (categories.length > 0 && categories) ||
      defaultCategoryOrder.map(dcat => ({ name: dcat })); // in filter no categories selected in UI
    categories =
      (categories.length > 0 && categories.map(category => category.name)) ||
      defaultCategoryOrder;
    projectsArray = _filterProjects(projectsArray, filters);
    let projectConfigData = (projectConfig && projectConfig.data) || {};
    let { fields = [], customLabels = [] } = projectConfigData;
    let index = 0;
    let fieldObj = [];
    let tables = [];

    if (projectGrouping === "individual") {
      for (let project of projectsArray) {
        let layout = {};
        let filterObj =
          _.find(filteredCategories, { name: project.project_category }) ||
          null;
        if (filterObj) {
          layout = { ...filterObj };
        }
        let {
          image = "",
          textColor = "#000000",
          backgroundColor = "#595959",
          borderColor = "#7d7d7d"
        } = layout;
        fieldObj[index] = {};
        fieldObj[index]["name"] = (project && project.displayName) || "";
        fieldObj[index]["image"] = image;
        fieldObj[index]["textColor"] = textColor;
        fieldObj[index]["backgroundColor"] = backgroundColor;
        fieldObj[index]["borderColor"] = borderColor;

        const prjct = project;
        const run = prjct && prjct.runResults && prjct.runResults[building._id];
        let calcType = null;
        if (run && run["calculation-type"] === "savings-range") {
          calcType = "savings-range";
        }
        const groupResults = _getProjectGroupResults(
          calcType,
          [project],
          building,
          fields
        );
        for (let field of fields) {
          let label = field.replace("business.", "");
          let text = "";
          if (customLabels.length > 0 && _.find(customLabels, { field })) {
            text = fieldUtils.getHeading(field, customLabels);
          } else {
            text = fieldUtils.getHeading(label);
          }
          let value = (groupResults && groupResults[label]) || "";
          value = _numberWithCommas(value);
          fieldObj[index][text] = value;
        }
        index++;
      }

      for (let i = 0; i < index; ) {
        let firstIndex = i;
        let lastIndex = Math.min(i + 2, index - 1);
        let trs = [];
        let tds = [];
        for (let key = firstIndex; key <= lastIndex; key++) {
          tds.push(
            `<td style='width: 200px; border-left: 0.5px ${fieldObj[key]["borderColor"]};border-top: 0.5px ${fieldObj[key]["borderColor"]};border-bottom: 0.5px ${fieldObj[key]["borderColor"]};background-color:${fieldObj[key]["backgroundColor"]};'><p style='color:${fieldObj[key]["textColor"]};padding-left: 2px;'>${fieldObj[key]["name"]}</p></td><td style='border-right: 0.5px ${fieldObj[key]["borderColor"]};border-top: 0.5px ${fieldObj[key]["borderColor"]};border-bottom: 0.5px ${fieldObj[key]["borderColor"]};border-color:${fieldObj[key]["borderColor"]};width:20px;background-color:${fieldObj[key]["backgroundColor"]};'><img src='${fieldObj[key]["image"]}' width='20' height='20' alt='Avatar'></td>`
          );
        }
        trs.push(`<tr>${tds.join(`<td style='width: 10px'></td>`)}</tr>`);

        for (field of fields) {
          let fieldTds = [];
          let label = field.replace("business.", "");
          let text = "";
          if (customLabels.length > 0 && _.find(customLabels, { field })) {
            text = fieldUtils.getHeading(field, customLabels);
          } else {
            text = fieldUtils.getHeading(label);
          }
          for (let key = firstIndex; key <= lastIndex; key++) {
            fieldTds.push(`<td colspan='2'><p style='padding-left: 2px;'>${text} ${fieldObj[key][text]}</p></td>
            `);
          }
          let newTr = `<tr>${fieldTds.join("<td><p></p></td>")}</tr>` || "";
          newTr = newTr.replace(/\n/g, "");
          newTr = newTr.replace(/\s+\<td/g, "<td");
          trs.push(newTr);
        }
        i = lastIndex;
        i++;
        let newTable = `<table border='0' id='twoColumn' style='margin-top: 5px; margin-bottom: 5px;'>${trs.join(
          ""
        )}</table>`;
        if (firstIndex === lastIndex)
          newTable = `<table border='0' style='width:30%' id='twoColumn' style='margin-top: 5px; margin-bottom: 5px;'>${trs.join(
            ""
          )}</table>`;
        else if (firstIndex === lastIndex - 1)
          newTable = `<table border='0' style='width:60%' id='twoColumn' style='margin-top: 5px; margin-bottom: 5px;'>${trs.join(
            ""
          )}</table>`;
        newTable = newTable.replace(/\n/g, "");
        newTable = newTable.replace(/\s+\<\/tr/g, "</tr");
        tables.push(newTable);
      }
    } else {
      let groupedProjects = [];
      if (projectConfig.projectGrouping === "groupCategoryLocation") {
        groupedProjects = _groupProjectsByCategoryAndLocation({
          projects: projectsArray,
          categories: projectConfig.filter.category
        });
      } else {
        groupedProjects = _groupProjectsByCategory({
          projects: projectsArray,
          categories: projectConfig.filter.category
        });
      }
      for (let group of groupedProjects) {
        index = 0;
        fieldObj = [];
        let projects = group.projects || [];
        projects = projects.sort((a, b) => {
          let valueA = a.name || "";
          let valueB = b.name || "";
          return valueA.toLowerCase() < valueB.toLowerCase()
            ? -1
            : valueB.toLowerCase() < valueA.toLowerCase()
            ? 1
            : 0;
        });
        for (let project of projects) {
          let layout = {};
          let filterObj = null;
          filterObj =
            _.find(filteredCategories, {
              name: project.project_category
            }) || null;
          if (filterObj) {
            layout = { ...filterObj };
          }
          let {
            image = "",
            textColor = "#000000",
            backgroundColor = "#595959",
            borderColor = "#7d7d7d"
          } = layout;
          fieldObj[index] = {};
          fieldObj[index]["name"] = (project && project.displayName) || "";
          fieldObj[index]["image"] = image;
          fieldObj[index]["textColor"] = textColor;
          fieldObj[index]["backgroundColor"] = backgroundColor;
          fieldObj[index]["borderColor"] = borderColor;
          const prjct = project;
          const run =
            prjct && prjct.runResults && prjct.runResults[building._id];
          let calcType = null;
          if (run && run["calculation-type"] === "savings-range") {
            calcType = "savings-range";
          }
          const groupResults = _getProjectGroupResults(
            calcType,
            [project],
            building
          );

          for (let field of fields) {
            let label = field.replace("business.", "");
            let text = "";
            if (customLabels.length > 0 && _.find(customLabels, { field })) {
              text = fieldUtils.getHeading(field, customLabels);
            } else {
              text = fieldUtils.getHeading(label);
            }
            let value = (groupResults && groupResults[label]) || "";
            value = _numberWithCommas(value);
            fieldObj[index][text] = value;
          }
          index++;
        }

        for (let i = 0; i < index; ) {
          let firstIndex = i;
          let lastIndex = Math.min(i + 2, index - 1);
          let tds = [];
          let trs = [];
          for (let key = firstIndex; key <= lastIndex; key++) {
            tds.push(
              `<td style='width: 200px; border-left: 0.5px ${fieldObj[key]["borderColor"]};border-top: 0.5px ${fieldObj[key]["borderColor"]};border-bottom: 0.5px ${fieldObj[key]["borderColor"]};background-color:${fieldObj[key]["backgroundColor"]};'><p style='color:${fieldObj[key]["textColor"]};padding-left: 2px;'>${fieldObj[key]["name"]}</p></td><td style='border-right: 0.5px ${fieldObj[key]["borderColor"]};border-top: 0.5px ${fieldObj[key]["borderColor"]};border-bottom: 0.5px ${fieldObj[key]["borderColor"]};border-color:${fieldObj[key]["borderColor"]};width:20px;background-color:${fieldObj[key]["backgroundColor"]};'><img src='${fieldObj[key]["image"]}' width='20' height='20' alt="Avatar"></td>`
            );
          }
          trs.push(`<tr>${tds.join(`<td style='width: 10px'></td>`)}</tr>`);

          for (field of fields) {
            let fieldTds = [];
            let label = field.replace("business.", "");
            let text = "";
            if (customLabels.length > 0 && _.find(customLabels, { field })) {
              text = fieldUtils.getHeading(field, customLabels);
            } else {
              text = fieldUtils.getHeading(label);
            }
            for (let key = firstIndex; key <= lastIndex; key++) {
              fieldTds.push(
                `<td colspan='2'><p style='padding-left: 2px;'>${text} ${fieldObj[key][text]}</p></td>`
              );
            }
            let newTr = `<tr>${fieldTds.join("<td><p></p></td>")}</tr>` || "";
            newTr = newTr.replace(/\n/g, "");
            newTr = newTr.replace(/\s+\/<td/g, "<td");
            trs.push(newTr);
          }
          i = lastIndex;
          i++;
          let newTable = `<table border='0' id='twoColumn' style='margin-top: 5px; margin-bottom: 5px;'>${trs.join(
            ""
          )}</table>`;
          if (firstIndex === lastIndex)
            newTable = `<table border='0' style='width:30%' id='twoColumn' style='margin-top: 5px; margin-bottom: 5px;'>${trs.join(
              ""
            )}</table>`;
          else if (firstIndex === lastIndex - 1)
            newTable = `<table border='0' style='width:60%' id='twoColumn' style='margin-top: 5px; margin-bottom: 5px;'>${trs.join(
              ""
            )}</table>`;
          newTable = newTable.replace(/\n/g, "");
          newTable = newTable.replace(/\s+\<\/tr/g, "</tr");
          tables.push(newTable);
        }
      }
    }
    let data = `${tables.join("")}`;
    console.log("data", data);
    return data;
  } catch (error) {
    console.log(error);
    console.log(error);
  }
};

module.exports = {
  getProjectBulletedList,
  getProjectSummaryTable,
  getFullProjectDetails,
  convertNameLabelForXcelMeasure,
  sortFieldByOrder,
  getProjectCardTable,
  getMeasuresData
};
