"use strict";

const fs = require("fs");
const path = require("path");

const _ = require("lodash");
const moment = require("moment");
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;

const { Scenario } = require("../models/Scenario.server.model");
const { Project } = require("../models/project.server.model");
const { MeasurePackage } = require("../models/measure.package.server.model");

const { horizontalLine } = require("./utils/log.utils");
const { calculateMetricForScenario } = require("../controllers/api/utils/api.project.util");
const scenarioghgScript = require("./scenarioghg.script");
const projectSyncScript = require("./projectsync.script")

const logFilePath = path.join(__dirname, '/logs/scenarioMetric.logs');

const calculate = async (options = null) => {
    const successfullIds = [];
    const failedIds = [];
    try {
        fs.appendFileSync(logFilePath, `\n${horizontalLine(120, "-")}\n${moment().utc().toLocaleString()} Script Started\n${horizontalLine(120, "-")}\n`);
        const scenarioIds = options && options.scenarioIds || [];
        const scenarios = await getScenarios(scenarioIds);
        for (let scenario of scenarios) {
            let buildingIds = scenario && scenario.buildingIds || [];
            let projectIds = scenario && scenario.projectIds || [];
            let measurePackageIds = scenario && scenario.measurePackageIds || [];
            let measurePackages = await MeasurePackage.find({ _id: { $in: measurePackageIds }})
            for (let measurePackage of measurePackages) {
                let measureIds = measurePackage.projects || []
                measureIds = measureIds.map(id=>id.toString())
                projectIds = [...projectIds, ...measureIds]
            }
            projectIds = projectIds.map(id=>id.toString())
            projectIds = [... new Set(projectIds)]

            scenario.metric = {};
            scenario.metricOrg = {};

            if(projectIds.length && buildingIds.length) {
                await scenarioghgScript.calculate({ buildingIds, projectIds});
                await projectSyncScript.calculate({ projectIds });
                let projects = await getProjects(projectIds);
                scenario.metric = calculateMetricForScenario(buildingIds, projects);
            }
            fs.appendFileSync(logFilePath, `Updating the Scenario Details of ScenarioId ${scenario._id}\n`);
            const updatedDoc = await updateScenario(scenario._id, scenario);
            fs.appendFileSync(logFilePath, `Updated Doc for ${scenario._id} - ${JSON.stringify(updatedDoc["metric"])}\n`);
            if (updatedDoc) {
                successfullIds.push(scenario._id);
            } else {
                failedIds.push(scenario._id);
            }
        }

    } catch (error) {
        console.error(error);
        console.log(error);
    } finally {
        fs.appendFileSync(logFilePath, `Successfully updated scenarios for Ids: ${successfullIds}\n`);
        fs.appendFileSync(logFilePath, `Failed update scenarios for Ids: ${failedIds}\n`);
        fs.appendFileSync(logFilePath, `Script Ended...\n`);
    }
};

const getScenarios = async (scenarioIds = []) => {
    try {
        fs.appendFileSync(logFilePath, `Getting Scenarios Data...\n`);
        const filter = {};
        if (scenarioIds && scenarioIds.length) {
            scenarioIds = scenarioIds.map(bid => ObjectId(bid));
            filter["_id"] = {
                "$in": scenarioIds
            }
        }
        const scenarios = await Scenario.find(filter).exec();
        return Promise.resolve(scenarios);
    } catch (error) {
        fs.appendFileSync(logFilePath, `Error: ${error}\n`);
        return Promise.resolve([]);
    }
};

const getProjects = async (projectIds = []) => {
    try {
        fs.appendFileSync(logFilePath, `Getting Projects Data...\n`);
        const filter = {};
        if (projectIds && projectIds.length) {
            projectIds = _.uniq(projectIds);
            projectIds = projectIds.map(pid => ObjectId(pid));
            filter["_id"] = {
                "$in": projectIds
            }
        }
        const projects = await Project.find(filter).exec();
        return Promise.resolve(projects);
    } catch (error) {
        fs.appendFileSync(logFilePath, `Error: ${error}\n`);
        return Promise.resolve([]);
    }
};

const updateScenario = async (scenarioId, scenario) => {
    try {
        const filter = {};
        if (scenarioId) {
            filter["_id"] = ObjectId(scenarioId);
            const updatedDoc = await Scenario.findOneAndUpdate(filter, scenario, { upsert: true, new: true });
            return Promise.resolve(updatedDoc);
        } else {
            throw "Error: Invalid ScenarioId";
        }
    } catch (error) {
        fs.appendFileSync(logFilePath, `Error: ${error}\n`);
        return Promise.resolve({});
    }
};

module.exports = {
    calculate
};