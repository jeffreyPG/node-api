"use strict";

const mongoose = require("mongoose");
const ApiKey = mongoose.model("ApiKey");
const util = require("./utils/api.utils");

/**
 * Generate api key to access the system
 */
exports.apiKey = async function (req, res, next) {
  try {
    const apiKey = await ApiKey.create({ appName: req.body.appName });
    res.sendResult = {
      status: "Success",
      message: "Generated API Key",
      apiKey,
    };
    return next();
  } catch (error) {
    console.error(error);
    return util.sendError(error, 500, req, res, next);
  }
};
