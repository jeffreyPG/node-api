"use strict";

const fs = require("fs");
const path = require("path");

const _ = require("lodash");
const moment = require("moment");
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;

const Organization = mongoose.model('Organization');
const { Building } = require("../models/building.server.model");
const { Project } = require("../models/project.server.model");

const { horizontalLine } = require("./utils/log.utils");
const { calculateMetric } = require("../controllers/api/utils/api.project.util")

const logFilePath = path.join(__dirname, '/logs/projectMetric.logs');

const calculate = async () => {
    const successfullIds = [];
    const failedIds = [];
    try {
        fs.appendFileSync(logFilePath, `\n${horizontalLine(120, "-")}\n${moment().utc().toLocaleString()} Script Started\n${horizontalLine(120, "-")}\n`);
        const organizations = await getOrganizations();
        for (let organization of organizations) {
            const buildingIds = organization && organization.buildingIds || [];
            const buildings = await getBuildings(buildingIds);
            for (let building of buildings) {
                const buildingId = building && building._id;
                const projectIds = building && building.projectIds || [];
                const projects = await getProjects(projectIds);
                for (let project of projects) {
                    const projectId = project && project._id;
                    project.metric = calculateMetric(project, building._id);
                    if (project.metric.eul)
                       project.measureLife = project.metric.eul
                    if(!project.status)
                        project.status = 'Identified'
                    if(!project.budgetType)
                        project.budgetType = 'Low Cost/No Cost'
                    fs.appendFileSync(logFilePath, `Updating the Project Details of ProjectId ${projectId} for Building ${buildingId}\n`);
                    const updatedDoc = await updateProject(projectId, project);
                    fs.appendFileSync(logFilePath, `Updated Doc for ${projectId} - ${JSON.stringify(updatedDoc["metric"])}\n`);
                    if (updatedDoc) {
                        successfullIds.push(projectId);
                    } else {
                        failedIds.push(projectId);
                    }
                }
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

const getOrganizations = async () => {
    try {
        fs.appendFileSync(logFilePath, `Getting Organization Data...\n`);
        const filter = {
            "buildingIds.0": {
                "$exists": true
            }
        };
        const organizations = await Organization.find(filter).exec();
        return Promise.resolve(organizations);
    } catch (error) {
        fs.appendFileSync(logFilePath, `Error: ${error}\n`);
        return Promise.resolve([]);
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