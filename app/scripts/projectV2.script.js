"use strict";

const fs = require("fs");
const path = require("path");

const _ = require("lodash");
const moment = require("moment");
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;

const { Building } = require("../models/building.server.model");
const { Project } = require("../models/project.server.model");
const projectGHGScript = require("./projectghg.script");
const projectSyncScript = require("./projectsync.script");

const { horizontalLine } = require("./utils/log.utils");

const logFilePath = path.join(__dirname, "/logs/projectV2.logs");

const calculate = async () => {
  const successfullIds = [];
  const failedIds = [];
  try {
    fs.appendFileSync(
      logFilePath,
      `\n${horizontalLine(120, "-")}\n${moment()
        .utc()
        .toLocaleString()} Script Started\n${horizontalLine(120, "-")}\n`
    );
    let projects = await getProjects();
    for (let project of projects) {
      try {
        let building = await Building.findOne({
          projectIds: { $in: [project.id.toString()] }
        }).exec();
        if (!building) continue;
        let buildingId = building._id.toString();
        let subProjects = project.projects || [];
        for (let subProject of subProjects) {
          if (!subProject.fuel) {
            let subMeasure = await Project.findById(subProject._id).exec();
            subMeasure.fuel = project.fuel;
            subMeasure.markModified("fuel");
            await subMeasure.save();
          }
        }
        await projectGHGScript.calculate({
          notIncludingBuildingProjects: true,
          buildingIds: [buildingId],
          projectIds: subProjects.map(project => project._id.toString()) || []
        });
        await projectSyncScript.calculate({
          projectIds: subProjects.map(project => project._id.toString()) || []
        });
        successfullIds.push(project._id.toString());
      } catch (error) {
        console.error(error);
        console.log(error);
        failedIds.push(project._id.toString());
      }
    }
  } catch (error) {
    console.error(error);
    console.log(error);
  } finally {
    fs.appendFileSync(
      logFilePath,
      `Successfully updated projects for Ids: ${successfullIds}\n`
    );
    fs.appendFileSync(
      logFilePath,
      `Failed update projects for Ids: ${failedIds}\n`
    );
    fs.appendFileSync(logFilePath, `Script Ended...\n`);
  }
};

const getProjects = async () => {
  try {
    fs.appendFileSync(logFilePath, `Getting Projects Data...\n`);
    const filter = { "projects.0": { $exists: true } };
    const projects = await Project.find(filter)
      .populate("projects")
      .exec();
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
      const updatedDoc = await Project.findOneAndUpdate(filter, project, {
        upsert: true,
        new: true
      });
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
