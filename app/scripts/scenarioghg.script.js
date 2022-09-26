"use strict";

const fs = require("fs");
const path = require("path");

const _ = require("lodash");
const moment = require("moment");
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;

const { Building } = require("../models/building.server.model");
const { Project } = require("../models/project.server.model");
const { horizontalLine } = require("./utils/log.utils");

const logFilePath = path.join(__dirname, '/logs/scenarioghg.logs');
const DEFAULT_FUELS_ARR = ["gas", "electric"];

const calculate = async (options = null) => {
    const successfullIds = [];
    const failedIds = [];
    try {
        fs.appendFileSync(logFilePath, `\n${horizontalLine(120, "-")}\n${moment().utc().toLocaleString()} Script Started\n${horizontalLine(120, "-")}\n`);
        const buildingIds = options && options.buildingIds || [];
        const projectIds = options && options.projectIds || [];
        let projects = await getProjects(projectIds);
        let buildings = await getBuildings(buildingIds);
        for (let project of projects) {
          const run = project && project.runResults || null;
          if(!run) continue;
          const initialValues = project && project.initialValues;
          const projectCost = initialValues && getProjectCost(initialValues) || 0;
          for (let building of buildings) {
            const ghgs = [];
            if(!run[building._id]) run[building._id] = {};
            for (let fuelOption of DEFAULT_FUELS_ARR) {
              const ghgValue = getGHGFactor(building, fuelOption) * getEnergySavingsByFuel(project, fuelOption, building._id);
              run[building._id][`ghg-${fuelOption}`] = Number(ghgValue).toFixed(2);
              ghgs.push(ghgValue);
            }
            const ghg = ghgs.reduce((prev, curr) => prev + curr, 0) || 0;
            const ghgCost = (projectCost / ghg) || 0;
            run[building._id]["ghg"] = Number(ghg).toFixed(2);
            run[building._id]["ghg-cost"] = Number(ghgCost).toFixed(2);
            run[building._id]["ghg-units"] = "tCO2e";
            run[building._id]["ghg-cost-units"] = "$/tCO2e";
          }
          let projectId = project && project._id
          fs.appendFileSync(logFilePath, `Updating the Project Details of ProjectId ${projectId}\n`);
          project.runResults = run;
          const updatedDoc = await updateProject(projectId, project);
          fs.appendFileSync(logFilePath, `Updated Doc for ${projectId} - ${JSON.stringify(updatedDoc['runResults'])}\n`);
          if (updatedDoc) {
              successfullIds.push(projectId);
          } else {
              failedIds.push(projectId);
          }
        }
    } catch (error) {
        console.error(error);
        console.log(error);
    } finally {
        fs.appendFileSync(logFilePath, `Successfully updated projects for Ids: ${successfullIds}\n`);
        fs.appendFileSync(logFilePath, `Failed update projects for Ids: ${failedIds}\n`);
        fs.appendFileSync(logFilePath, `Script Ended...\n`);
    }
};

const getBuildings = async (buildingIds = []) => {
    try {
        fs.appendFileSync(logFilePath, `Getting Buildings Data...\n`);
        const filter = {
            // "projectIds.0": {
            //     "$exists": true
            // }
        };
        if (buildingIds && buildingIds.length) {
            buildingIds = buildingIds.map(bid => ObjectId(bid));
            filter["_id"] = {
                "$in": buildingIds
            }
        }
        const buildings = await Building.find(filter, "projectIds rates").exec();
        return Promise.resolve(buildings);
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

const getGHGFactor = (building, fuel) => {
    switch (fuel) {
        case "electric": return (building.rates && building.rates.electricGHG) ? building.rates.electricGHG : 0.000744;
        case "gas": return (building.rates && building.rates.gasGHG) ? building.rates.gasGHG : 0.0053;
        default: return 0;
    }
};

const getEnergySavingsByFuel = (project, fuelOption, buildingId) => {
    const run = project && project.runResults && project.runResults[buildingId] || null;
    const fuel = project && project.fuel || "";
    const energySavings = run && run["energy-savings"] || null;
    if (typeof energySavings == "object") {
        return energySavings && energySavings[fuelOption] || 0;
    } else {
        if (fuelOption == fuel && typeof energySavings !== "object") {
            return energySavings && Math.ceil(Number(energySavings)) || 0;
        } else {
            return 0;
        }
    }
};

const getProjectCost = initialValues => {
    return initialValues &&
        initialValues.project_cost !== undefined &&
        initialValues.project_cost !== null
        ? Math.ceil(initialValues.project_cost)
        : 0;
};

const updateProject = async (projectId, project) => {
    try {
        const filter = {};
        if (projectId) {
            filter["_id"] = ObjectId(projectId);
            const updatedDoc = await Project.findOneAndUpdate(filter, project, { upsert: true, new: true });
            return Promise.resolve(updatedDoc);
        } else {
            throw "Error: Invalid ProjectId";
        }
    } catch (error) {
        fs.appendFileSync(logFilePath, `Error: ${error}\n`);
        return Promise.resolve({});
    }
};

module.exports = {
    calculate
};