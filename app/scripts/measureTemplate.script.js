"use strict";

const fs = require("fs");
const path = require("path");
const _ = require("lodash");
const moment = require("moment");
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;

const { Template } = require("../models/template.server.model");

const { horizontalLine } = require("./utils/log.utils");

const logFilePath = path.join(__dirname, "/logs/measureTemplate.logs");

const updateTemplate = async option => {
  const successfullIds = [];
  const failedIds = [];
  try {
    fs.appendFileSync(
      logFilePath,
      `\n${horizontalLine(120, "-")}\n${moment()
        .utc()
        .toLocaleString()} Script Started\n${horizontalLine(120, "-")}\n`
    );
    const templates = await getTemplates(option.templateIds || []);
    for (let template of templates) {
      let templateBody = _.extend({}, template);
      let body = templateBody.body || [];
      let isUpdatedNeeded = false;
      body = body.map(widget => {
        if (widget.type === "measures" && widget.target === "measure") {
          let newWidget = _.extend({}, widget);
          let projectConfig = (newWidget && newWidget.projectConfig) || null;
          if (!projectConfig) {
            newWidget.projectConfig = {
              type: "measure"
            };
            isUpdatedNeeded = true;
          } else {
            let { type } = projectConfig;
            if (type === undefined) {
              newWidget.projectConfig = {
                ...projectConfig,
                type: "measure"
              };
              isUpdatedNeeded = true;
            }
          }
          return newWidget;
        }
        return widget;
      });
      if (!isUpdatedNeeded) continue;
      templateBody.body = body;
      fs.appendFileSync(
        logFilePath,
        `Updating the Template Details of TemplateID ${template._id}\n`
      );
      const updatedDoc = await updateTemplateDocument(
        template._id,
        templateBody
      );
      fs.appendFileSync(logFilePath, `Updated Doc for ${template._id}\n`);
      if (updatedDoc) {
        successfullIds.push(template._id);
      } else {
        failedIds.push(template._id);
      }
    }
  } catch (error) {
    console.error(error);
    console.log(error);
  } finally {
    fs.appendFileSync(
      logFilePath,
      `Successfully updated templates for Ids: ${successfullIds}\n`
    );
    fs.appendFileSync(
      logFilePath,
      `Failed update templates for Ids: ${failedIds}\n`
    );
    fs.appendFileSync(logFilePath, `Script Ended...\n`);
  }
};

const getTemplates = async templateIds => {
  try {
    fs.appendFileSync(logFilePath, `Getting Template Data...\n`);
    const filter = {};
    if (templateIds && templateIds.length) {
      templateIds = templateIds.map(tID => ObjectId(tID));
      filter["_id"] = {
        $in: templateIds
      };
    }
    const templates = await Template.find(filter).exec();
    return Promise.resolve(templates);
  } catch (error) {
    fs.appendFileSync(logFilePath, `Error: ${error}\n`);
    return Promise.resolve([]);
  }
};

const updateTemplateDocument = async (templateID, templateDoc) => {
  try {
    if (templateID) {
      let template = await Template.findById(templateID);
      Object.assign(template.body, templateDoc.body);
      template.markModified("body");
      await template.save();
      return Promise.resolve(templateDoc);
    } else {
      throw "Error: Invalid TemplateID";
    }
  } catch (error) {
    fs.appendFileSync(logFilePath, `Error: ${error}\n`);
    return Promise.resolve({});
  }
};

module.exports = {
  updateTemplate
};
