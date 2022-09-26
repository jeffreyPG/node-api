"use strict";

const fs = require("fs");
const path = require("path");

const _ = require("lodash");
const moment = require("moment");
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;

const Organization = mongoose.model('Organization');
const Building = mongoose.model('Building');
const Project = mongoose.model('Project');
const ProjectPackage = mongoose.model('ProjectPackage');

const { horizontalLine } = require("./utils/log.utils");
const projectghgScript = require('./projectghg.script');
const { getPackageProjectRunResult } = require('../controllers/api/utils/api.scenario.util');
const { calculateProjectPackageTotal, calculateMetric } = require('../controllers/api/utils/api.project.util');

const logFilePath = path.join(__dirname, '/logs/packageMetric.logs');

const calculate = async (options = null) => {
    let successfullIds = [];
    let failedIds = [];
    try {
        fs.appendFileSync(logFilePath, `\n${horizontalLine(120, "-")}\n${moment().utc().toLocaleString()} Script Started\n${horizontalLine(120, "-")}\n`);
        const organizationIds = options && options.organizationIds || [];
        const organizations = await getOrganizations(organizationIds);
        for (let organization of organizations) {
            let buildingIds;
            if(options && options.buildingIds)
                buildingIds = options.buildingIds
            else 
                buildingIds = organization && organization.buildingIds || [];
            const buildings = await getBuildings(buildingIds);
            for (let building of buildings) {
                let buildingId = building && building._id || '';
                let projectIds = building && building.projectIds || [];
                let projects = await getProjects(projectIds);
                for(let project of projects) {
                    let projectId = project && project._id || '';
                    let runObj = project.runResults || {};
                    let result = await getPackageProjectRunResult(project, buildingId);
                    runObj[buildingId] = result
                    project.runResults = runObj;
                    const updatedDoc = await updateProject(projectId, project);
                    fs.appendFileSync(logFilePath, `Updated Doc for ${projectId} - ${JSON.stringify(updatedDoc['runResults'][buildingId])}\n`);
                    if (updatedDoc) {
                        successfullIds.push(projectId);
                    } else {
                        failedIds.push(projectId);
                    }
                }
                const projectPackages = await getProjectPackages(buildingId);
                for(let projectPackage of projectPackages) {
                    let projects = projectPackage.projects || []
                    for (let project of projects) {
                        let runObj = project.runResultsWithRate || {};
                        let result = await getPackageProjectRunResult(project, buildingId, projectPackage.rates || {});
                        runObj[buildingId] = result
                        project.runResultsWithRate = runObj;
                        project.markModified('runResultsWithRate');
                        await project.save();
                    }
                }
                await projectghgScript.calculate({ buildingIds: [buildingId]});
                projects = await getProjects(projectIds);
                for(let project of projects) {
                    project.metric = calculateMetric(project, buildingId);
                    if (project.metric.eul)
                      project.measureLife = project.metric.eul;
                    await updateProject(project._id, project);
                }
                for(let projectPackage of projectPackages) {
                    await calculateProjectPackageTotal(buildingId, projectPackage._id);
                }
            }
        }

    } catch (error) {
        console.error(error);
        console.log(error);
    } finally {
        successfullIds = [... new Set(successfullIds)];
        failedIds = [... new Set(failedIds)];
        fs.appendFileSync(logFilePath, `Successfully updated projects for Ids: ${successfullIds}\n`);
        fs.appendFileSync(logFilePath, `Failed update projects for Ids: ${failedIds}\n`);
        fs.appendFileSync(logFilePath, `Script Ended...\n`);
    }
};

const getOrganizations = async (organizationIds = []) => {
    try {
        fs.appendFileSync(logFilePath, `Getting Organization Data...\n`);
        const filter = {
            "buildingIds.0": {
                "$exists": true
            }
        };
        if (organizationIds && organizationIds.length) {
            organizationIds = organizationIds.map(bid => ObjectId(bid));
            filter["_id"] = {
                "$in": organizationIds
            }
        }
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

const getProjectPackages = async (buildingId) => {
    try {
        fs.appendFileSync(logFilePath, `Getting Project Packages Data...\n`);
        const filter = {
            "buildingId": buildingId
        };
        const projectPackages = await ProjectPackage.find(filter).populate('projects').exec();
        return Promise.resolve(projectPackages);
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