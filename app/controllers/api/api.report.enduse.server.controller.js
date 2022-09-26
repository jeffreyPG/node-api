"use strict";

const _ = require("lodash");
const moment = require("moment");

const util = require("./utils/api.utils");
const { Building } = require("../../models/building.server.model");
const { Template } = require("../../models/template.server.model");
const { ActualEndUse } = require("../../models/actualenduse.server.model");
const { createActualEndUse } = require("../../dao/actualEndUse.server.dao");
const { getEndUseBreakdown } = require("./utils/api.report.eub.client");

// const fieldRegex = new RegExp(
//   /.*actualEndUseBreakdown.*|.*End Use Breakdown.*|.*GHG Impact.*|.*EUI Impact.*|.*Energy Saving by End Use.*/i
// );

const addReportEndUse = async (req, res, next) => {
  try {
    const { buildingId, templateId } = req.params;
    const { customStartDate, customEndDate } = req.query;
    let customDate = null;
    if (customStartDate && customEndDate) {
      customDate = {
        customStartDate: moment(customStartDate).startOf("month"),
        customEndDate: moment(customEndDate).endOf("month")
      };
    }
    const template = await Template.findById(templateId);
    if (!template) {
      console.log("Template not found");
      return util.sendError("template not found", 404, req, res, next);
    }

    const building = await Building.findById(buildingId)
      .lean()
      .exec();
    if (!building) {
      console.log("Building not found");
      return util.sendError("building not found", 404, req, res, next);
    }

    const actualEndUseTemplateBlocks = template.body.filter(
      block =>
        // block.fields.some(field => fieldRegex.test(field)) &&
        block.type === "chart"
    );
    if (actualEndUseTemplateBlocks.length === 0) {
      res.setHeader("Content-Type", "application/json");
      res.sendResult = {
        status: "Success"
      };
      return next();
    }
    const processedMetaData = [];
    const processedMetaDataObj = {};
    const promises = [];
    for (const template of actualEndUseTemplateBlocks) {
      const {
        yearRange,
        selectedStartMonth,
        selectedStartYear,
        selectedEndMonth,
        selectedEndYear
      } = template.metaData;

      console.log(
        "Getting actual end use data for template block",
        JSON.stringify(template.metaData)
      );
      let startDate = moment();
      let endDate = moment().subtract(1, "month");
      if (customDate) {
        startDate = customDate.customStartDate;
        endDate = customDate.customEndDate;
      } else if (yearRange === "Custom") {
        startDate
          .month(selectedStartMonth)
          .year(selectedStartYear)
          .startOf("month");
        endDate
          .month(selectedEndMonth)
          .year(selectedEndYear)
          .endOf("month");
      } else if (yearRange && yearRange.toLowerCase().indexOf("last") !== -1) {
        const lastXMonths = yearRange
          .toLowerCase()
          .replace("last", "")
          .replace("months", "");
        startDate.subtract(lastXMonths, "months").startOf("month");
        endDate.endOf("month");
      }

      const metaDataToAdd = {
        buildingId,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      };
      const key = JSON.stringify(metaDataToAdd);
      if (processedMetaDataObj[key]) continue;
      processedMetaDataObj[key] = true;
      processedMetaData.push(metaDataToAdd);
      const deletionReponse = await ActualEndUse.deleteMany({
        building: building._id,
        startDate,
        endDate
      });
      console.log(
        "Removed ActualEndUse documents:",
        JSON.stringify(deletionReponse)
      );

      console.log(
        "addReportEndUse - Requesting: ",
        JSON.stringify(metaDataToAdd)
      );
      promises.push(
        getEndUseBreakdown(startDate, endDate, building)
          .then(result => {
            const response = result || {};
            const actualEndUse = {
              building: building._id,
              buildingId: building._id.toString(),
              startDate,
              endDate,
              baseline: {
                eubResults: response.eub_results,
                eui: response.eui,
                totalCost: response.total_cost,
                totalEnergy: response.total_energy,
                totalGhg: response.total_ghg
              },
              proposed: {
                eubResults: response.eub_results_proposed,
                eui: response.eui_proposed,
                totalCost: response.total_cost_proposed,
                totalEnergy: response.total_energy_proposed,
                totalGhg: response.total_ghg_proposed
              }
            };
            console.log(
              "addReportEndUse - writing actual end use to db: ",
              JSON.stringify(metaDataToAdd)
            );
            return createActualEndUse(actualEndUse);
          })
          .catch(err => {
            console.error(err);
          })
      );
    }
    Promise.all(promises).then(() => {
      res.setHeader("Content-Type", "application/json");
      res.sendResult = {
        status: "Success"
      };
      next();
    });
  } catch (error) {
    console.error(error);
    return util.sendError(error, 500, req, res, next);
  }
};

const addReportEndUseUtil = async ({ buildingId, templateId, customDate }) => {
  try {
    const template = await Template.findById(templateId);
    if (!template) {
      console.log("Template not found");
      return util.sendError("template not found", 404, req, res, next);
    }

    const building = await Building.findById(buildingId)
      .lean()
      .exec();
    if (!building) {
      console.log("Building not found");
      return;
    }

    console.log("end use script started");

    const actualEndUseTemplateBlocks = template.body.filter(
      block =>
        // block.fields.some(field => fieldRegex.test(field)) &&
        block.type === "chart"
    );
    if (actualEndUseTemplateBlocks.length === 0) {
      return;
    }
    const processedMetaData = [];
    const processedMetaDataObj = {};
    for (const template of actualEndUseTemplateBlocks) {
      const {
        yearRange,
        selectedStartMonth,
        selectedStartYear,
        selectedEndMonth,
        selectedEndYear
      } = template.metaData;

      console.log(
        "Getting actual end use data for template block",
        JSON.stringify(template.metaData)
      );
      let startDate = moment();
      let endDate = moment().subtract(1, "month");
      if (customDate) {
        startDate = customDate.customStartDate;
        endDate = customDate.customEndDate;
      } else if (yearRange === "Custom") {
        startDate
          .month(selectedStartMonth)
          .year(selectedStartYear)
          .startOf("month");
        endDate
          .month(selectedEndMonth)
          .year(selectedEndYear)
          .endOf("month");
      } else if (yearRange && yearRange.toLowerCase().indexOf("last") !== -1) {
        const lastXMonths = yearRange
          .toLowerCase()
          .replace("last", "")
          .replace("months", "");
        startDate.subtract(lastXMonths, "months").startOf("month");
        endDate.endOf("month");
      }

      const metaDataToAdd = {
        buildingId,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      };
      const key = JSON.stringify(metaDataToAdd);
      if (processedMetaDataObj[key]) continue;
      processedMetaDataObj[key] = true;
      processedMetaData.push(metaDataToAdd);
      const deletionReponse = await ActualEndUse.deleteMany({
        building: building._id,
        startDate,
        endDate
      });
      console.log(
        "Removed ActualEndUse documents:",
        JSON.stringify(deletionReponse)
      );

      console.log(
        "addReportEndUse - Requesting: ",
        JSON.stringify(metaDataToAdd)
      );
      try {
        const result = await getEndUseBreakdown(startDate, endDate, building);
        const response = result || {};
        const actualEndUse = {
          building: building._id,
          buildingId: building._id.toString(),
          startDate,
          endDate,
          baseline: {
            eubResults: response.eub_results,
            eui: response.eui,
            totalCost: response.total_cost,
            totalEnergy: response.total_energy,
            totalGhg: response.total_ghg
          },
          proposed: {
            eubResults: response.eub_results_proposed,
            eui: response.eui_proposed,
            totalCost: response.total_cost_proposed,
            totalEnergy: response.total_energy_proposed,
            totalGhg: response.total_ghg_proposed
          }
        };
        await createActualEndUse(actualEndUse);
      } catch (error) {
        console.error(error);
      }
    }
  } catch (error) {
    console.error(error);
  }
};

const getEndUseActualUtil = async function(req, res, next) {
  const buildingId = req.building;
  const threeYearsAgo = moment()
    .add(-3, "years")
    .toDate();
  const startDate = req.query.startDate
    ? new Date(req.query.startDate)
    : threeYearsAgo;
  const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();
  const building = await Building.findById(buildingId);
  if (!building) {
    console.log("Building not found");
    return util.sendError("building not found", 404, req, res, next);
  }

  try {
    const result = await getEndUseBreakdown(
      moment(startDate),
      moment(endDate),
      building
    );
    const response = result || {};

    response.actual = true;

    const actualEndUse = {
      building: building._id,
      buildingId: building._id.toString(),
      startDate,
      endDate,
      baseline: {
        eubResults: response.eub_results,
        eui: response.eui,
        totalCost: response.total_cost,
        totalEnergy: response.total_energy,
        totalGhg: response.total_ghg
      },
      proposed: {
        eubResults: response.eub_results_proposed,
        eui: response.eui_proposed,
        totalCost: response.total_cost_proposed,
        totalEnergy: response.total_energy_proposed,
        totalGhg: response.total_ghg_proposed
      }
    };
    building.endUseActual = response;

    await createActualEndUse(actualEndUse);
    await building.save();

    res.sendResult = {
      status: "Success",
      message: "Actual End Use",
      actualEndUse: response
    };
    return next();
  } catch (err) {
    console.error(err);
    return util.sendError(err, 500, req, res, next);
  }
};

module.exports = {
  addReportEndUse,
  getEndUseActualUtil,
  addReportEndUseUtil
};
