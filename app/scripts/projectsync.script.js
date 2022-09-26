"use strict";

const fs = require("fs");
const path = require("path");

const _ = require("lodash");
const moment = require("moment");
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;

const { Project } = require("../models/project.server.model");
const {
  ProjectDatawareHouse
} = require("../models/project.datawarehouse.server.model");
const { horizontalLine } = require("./utils/log.utils");

const logFilePath = path.join(__dirname, "/logs/projectsync.logs");

const calculate = async (options = null) => {
  const successfullIds = [];
  const failedIds = [];
  try {
    fs.appendFileSync(
      logFilePath,
      `\n${horizontalLine(120, "-")}\n${moment()
        .utc()
        .toLocaleString()} Script Started\n${horizontalLine(120, "-")}\n`
    );
    if (
      options &&
      options.removeProjectIds &&
      options.removeProjectIds.length
    ) {
      await ProjectDatawareHouse.deleteMany({
        _id: { $in: options.removeProjectIds }
      });
    }

    const projects = await getProjects(options);

    fs.appendFileSync(
      logFilePath,
      `\n${moment()
        .utc()
        .toLocaleString()}--Project is loaded--\n`
    );
    for (let project of projects) {
      try {
        await ProjectDatawareHouse.deleteMany({ _id: project._id });
        let projectBody = _.extend({}, project);
        delete projectBody.eaAttachedTo;
        delete projectBody.description;
        delete projectBody.fields;
        delete projectBody.initialValues;
        delete projectBody.incentive;
        delete projectBody.runResults;
        delete projectBody.runResultsWithRate;
        let newProject = new ProjectDatawareHouse(projectBody);
        await newProject.save();
        fs.appendFileSync(
          logFilePath,
          `\n${moment()
            .utc()
            .toLocaleString()}--${project._id.toString()} is converted\n`
        );
        successfullIds.push(project._id.toString());
      } catch (error) {
        failedIds.push(project._id.toString());
      }
    }
  } catch (error) {
    console.error(error);
    console.log(error);
  } finally {
    fs.appendFileSync(
      logFilePath,
      `Successfully converted projects for Ids: ${successfullIds}\n`
    );
    fs.appendFileSync(
      logFilePath,
      `Failed convert projects for Ids: ${failedIds}\n`
    );
    fs.appendFileSync(logFilePath, `Script Ended...\n`);
  }
};

const getProjects = async (options = {}) => {
  try {
    fs.appendFileSync(logFilePath, `Getting Projects Data...\n`);
    let projectIds = options.projectIds || [];
    const filter = {};
    if (projectIds && projectIds.length) {
      projectIds = _.uniq(projectIds);
      projectIds = projectIds.map(pid => ObjectId(pid));
      filter["_id"] = {
        $in: projectIds
      };
    }
    const projects = await Project.find(filter)
      .lean()
      .exec();
    return Promise.resolve(projects);
  } catch (error) {
    fs.appendFileSync(logFilePath, `Error: ${error}\n`);
    return Promise.resolve([]);
  }
};

module.exports = {
  calculate
};
