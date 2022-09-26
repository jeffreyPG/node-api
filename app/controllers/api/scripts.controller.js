"use strict";

const mongoose = require("mongoose");
const Scenario = mongoose.model("Scenario");

const util = require("./utils/api.utils");
const enduseScript = require("../../scripts/enduse.script");
const projectghgScript = require("../../scripts/projectghg.script");
const projectSyncScript = require("../../scripts/projectsync.script");
const projectMetricScript = require("../../scripts/projectMetric.script.js");
const scenarioghgScript = require("../../scripts/scenarioghg.script");
const scenarioMetricScript = require("../../scripts/scenarioMetric.script");
const featureScript = require("../../scripts/featureSync.script");
const chartScript = require("../../scripts/chart.script");
const measureScript = require("../../scripts/measureTemplate.script");
const buildingSyncScript = require("../../scripts/buildingSync.script");
const organizationScript = require("../../scripts/organization.script");
const organizationSharedScript = require("../../scripts/organizationShared.script");
const projectV2Script = require("../../scripts/projectV2.script");

const syncEndUse = async (req, res, next) => {
  try {
    const building = req.building;
    const endUseOptions = {
      buildingIds: [building._id.toString()]
    };
    enduseScript.endUse(endUseOptions);
    return next();
  } catch (error) {
    return util.sendError(error, 500, req, res, next);
  }
};

const enduse = async (req, res, next) => {
  try {
    const options = req.body;
    enduseScript.endUse(options);
    res.setHeader("Content-Type", "application/json");
    res.sendResult = {
      status: "Success",
      message: "started enduse script"
    };
    return next();
  } catch (error) {
    return util.sendError(error, 500, req, res, next);
  }
};

const projectghg = async (req, res, next) => {
  try {
    const options = req.body;
    projectghgScript.calculate(options);
    res.setHeader("Content-Type", "application/json");
    res.sendResult = {
      status: "Success",
      message: "started projectghg script"
    };
    return next();
  } catch (error) {
    return util.sendError(error, 500, req, res, next);
  }
};

const projectV2 = async (req, res, next) => {
  try {
    const options = req.body;
    projectV2Script.calculate(options);
    res.setHeader("Content-Type", "application/json");
    res.sendResult = {
      status: "Success",
      message: "started projectV2 script"
    };
    return next();
  } catch (error) {
    return util.sendError(error, 500, req, res, next);
  }
};

const projectSync = async (req, res, next) => {
  try {
    const options = req.body;
    projectSyncScript.calculate(options);
    res.setHeader("Content-Type", "application/json");
    res.sendResult = {
      status: "Success",
      message: "started project sync script"
    };
    return next();
  } catch (error) {
    return util.sendError(error, 500, req, res, next);
  }
};

const projectMetric = async (req, res, next) => {
  try {
    projectMetricScript.calculate();
    res.setHeader("Content-Type", "application/json");
    res.sendResult = {
      status: "Success",
      message: "started projectMetric script"
    };
    return next();
  } catch (error) {
    return util.sendError(error, 500, req, res, next);
  }
};

const scenarioGhg = async (req, res, next) => {
  try {
    const options = req.body;
    scenarioghgScript.calculate(options);
    res.setHeader("Content-Type", "application/json");
    res.sendResult = {
      status: "Success",
      message: "started scenarioGhg script"
    };
    return next();
  } catch (error) {
    return util.sendError(error, 500, req, res, next);
  }
};

const scenarioMetric = async (req, res, next) => {
  try {
    let scenarios = await Scenario.find();
    let scenarioIds = scenarios.map(scenario => scenario._id) || [];
    scenarioMetricScript.calculate(scenarioIds);
    res.setHeader("Content-Type", "application/json");
    res.sendResult = {
      status: "Success",
      message: "started scenarioMetric script"
    };
    return next();
  } catch (error) {
    return util.sendError(error, 500, req, res, next);
  }
};

const packageMetric = async (req, res, next) => {
  try {
    const options = req.body;
    packageMetricScript.calculate(options);
    res.setHeader("Content-Type", "application/json");
    res.sendResult = {
      status: "Success",
      message: "started packageMetric script"
    };
    return next();
  } catch (error) {
    return util.sendError(error, 500, req, res, next);
  }
};

const featureSync = async (req, res, next) => {
  try {
    const options = req.body;
    featureScript.sync(options);
    res.setHeader("Content-Type", "application/json");
    res.sendResult = {
      status: "Success",
      message: "started featureSync script"
    };
    return next();
  } catch (error) {
    return util.sendError(error, 500, req, res, next);
  }
};

const featureUpdate = async (req, res, next) => {
  try {
    const options = req.body;
    featureScript.update(options);
    res.setHeader("Content-Type", "application/json");
    res.sendResult = {
      status: "Success",
      message: "started featureUpdate script"
    };
    return next();
  } catch (error) {
    return util.sendError(error, 500, req, res, next);
  }
};

const chartUpdate = async (req, res, next) => {
  try {
    chartScript.updateChart(req.body);
    chartScript.updateTemplate(req.body);
    res.setHeader("Content-Type", "application/json");
    res.sendResult = {
      status: "Success",
      message: "started chart and template script"
    };
    return next();
  } catch (error) {
    return util.sendError(error, 500, req, res, next);
  }
};

const chartUpdateV2 = async (req, res, next) => {
  try {
    chartScript.updateTemplateV2(req.body);
    res.setHeader("Content-Type", "application/json");
    res.sendResult = {
      status: "Success",
      message: "started chart V2 script"
    };
    return next();
  } catch (error) {
    return util.sendError(error, 500, req, res, next);
  }
};

const buildingSync = async (req, res, next) => {
  try {
    buildingSyncScript.sync(req.body);
    res.setHeader("Content-Type", "application/json");
    res.sendResult = {
      status: "Success",
      message: "started building and organization sync script"
    };
    return next();
  } catch (error) {
    return util.sendError(error, 500, req, res, next);
  }
};

const measureTemplateUpdate = async (req, res, next) => {
  try {
    measureScript.updateTemplate(req.body);
    res.setHeader("Content-Type", "application/json");
    res.sendResult = {
      status: "Success",
      message: "Started Measure Template Update"
    };
    return next();
  } catch (error) {
    return util.sendError(error, 500, req, res, next);
  }
};

const organizationUserTemplateSync = async (req, res, next) => {
  try {
    organizationScript.updateUserTemplateIds(req.body);
    res.setHeader("Content-Type", "application/json");
    res.sendResult = {
      status: "Success",
      message: "Started Measure Template Update"
    };
    return next();
  } catch (error) {
    return util.sendError(error, 500, req, res, next);
  }
};

const organizationSharedSync = async (req, res, next) => {
  try {
    organizationSharedScript.updateSharedOptions(req.body);
    res.setHeader("Content-Type", "application/json");
    res.sendResult = {
      status: "Success",
      message: "Started Measure Template Update"
    };
    return next();
  } catch (error) {
    return util.sendError(error, 500, req, res, next);
  }
};

module.exports = {
  enduse,
  syncEndUse,
  projectghg,
  projectV2,
  projectSync,
  projectMetric,
  scenarioMetric,
  packageMetric,
  scenarioGhg,
  featureSync,
  chartUpdate,
  chartUpdateV2,
  buildingSync,
  measureTemplateUpdate,
  featureUpdate,
  organizationUserTemplateSync,
  organizationSharedSync
};
