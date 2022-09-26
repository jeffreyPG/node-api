"use strict";

const fs = require("fs");
const path = require("path");

const _ = require("lodash");
const moment = require("moment");
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;

const { Chart } = require("../models/chart.server.model");
const { Template } = require("../models/template.server.model");

const { horizontalLine } = require("./utils/log.utils");

const logFilePath = path.join(__dirname, "/logs/chart.logs");

const updateChart = async option => {
  const successfullIds = [];
  const failedIds = [];
  const ipAddress = option.ipAddress;
  try {
    fs.appendFileSync(
      logFilePath,
      `\n${horizontalLine(120, "-")}\n${moment()
        .utc()
        .toLocaleString()} Script Started\n${horizontalLine(120, "-")}\n`
    );
    const charts = await getCharts();
    for (let chart of charts) {
      let chartBody = _.extend({}, chart);
      let urls = chartBody.urls || [];
      fs.appendFileSync(
        logFilePath,
        `Updating the Chart Details of ChartId ${chart._id}\n`
      );
      urls = urls.map(url => {
        let value = url.value;
        value = value.replace(
          /^(http:\/\/)(?:[0-9]{1,3}\.){3}[0-9]{1,3}/g,
          `http://${ipAddress}`
        );
        return {
          ...url,
          value
        };
      });
      chartBody.urls = urls;
      const updatedDoc = await updateChartDocument(chart._id, chartBody);
      fs.appendFileSync(
        logFilePath,
        `Updated Doc for ${chart._id} - ${JSON.stringify(updatedDoc["urls"])}\n`
      );
      if (updatedDoc) {
        successfullIds.push(chart._id);
      } else {
        failedIds.push(chart._id);
      }
    }
  } catch (error) {
    console.error(error);
    console.log(error);
  } finally {
    fs.appendFileSync(
      logFilePath,
      `Successfully updated charts for Ids: ${successfullIds}\n`
    );
    fs.appendFileSync(
      logFilePath,
      `Failed update charts for Ids: ${failedIds}\n`
    );
    fs.appendFileSync(logFilePath, `Script Ended...\n`);
  }
};

const updateTemplate = async option => {
  const successfullIds = [];
  const failedIds = [];
  const ipAddress = option.ipAddress;
  try {
    fs.appendFileSync(
      logFilePath,
      `\n${horizontalLine(120, "-")}\n${moment()
        .utc()
        .toLocaleString()} Script Started\n${horizontalLine(120, "-")}\n`
    );
    const templates = await getTemplates();
    for (let template of templates) {
      let templateBody = _.extend({}, template);
      let body = templateBody.body || [];
      body = body.map(widget => {
        if (widget.type === "chart" && widget.target === "charts") {
          let newWidget = _.extend({}, widget);
          let fields = newWidget.fields || [];
          fields = fields.map(field => {
            if (field.includes("Url")) {
              let newfield = field.replace(
                /^(http:\/\/)(?:[0-9]{1,3}\.){3}[0-9]{1,3}/g,
                `http://${ipAddress}`
              );
              return newfield;
            }
            return field;
          });
          return newWidget;
        }
        return widget;
      });
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

const updateTemplateV2 = async option => {
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
        if (widget.type === "chart" && widget.target === "charts") {
          let newWidget = _.extend({}, widget);
          if (!newWidget.layoutOption) {
            newWidget.layoutOption = "One Column";
            newWidget.options = [
              {
                metaData: newWidget.metaData,
                fields: newWidget.fields
              }
            ];
            isUpdatedNeeded = true;
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

const getCharts = async () => {
  try {
    fs.appendFileSync(logFilePath, `Getting Chart Data...\n`);
    const filter = {};
    const charts = await Chart.find(filter).exec();
    return Promise.resolve(charts);
  } catch (error) {
    fs.appendFileSync(logFilePath, `Error: ${error}\n`);
    return Promise.resolve([]);
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

const updateChartDocument = async (chartID, chart) => {
  try {
    const filter = {};
    if (chartID) {
      filter["_id"] = ObjectId(chartID);
      const updatedDoc = await Chart.findOneAndUpdate(filter, chart, {
        upsert: true,
        new: true
      });
      return Promise.resolve(updatedDoc);
    } else {
      throw "Error: Invalid ChartID";
    }
  } catch (error) {
    fs.appendFileSync(logFilePath, `Error: ${error}\n`);
    return Promise.resolve({});
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
  updateChart,
  updateTemplate,
  updateTemplateV2
};
