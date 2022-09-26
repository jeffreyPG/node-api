"use strict";

const util = require("./utils/api.utils");
const { Datasource } = require("../../models/datasource");

/**
 * Get Datasources
 */
exports.getDatasources = async (req, res, next) => {
  try {
    const datasources = await Datasource.find();
    res.sendResult = {
      status: "Success",
      message: "Retrieved Data Sources",
      spreadsheetTemplate: datasources,
    };
    return next();
  } catch (error) {
    console.error(error);
    return util.sendError(error, 500, req, res, next);
  };
};
