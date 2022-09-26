"use strict";

/**
 * Module dependencies.
 */
const mongoose = require("mongoose");
const utils = require("../controllers/api/utils/api.utils");
const Schema = mongoose.Schema;

const ApiKeySchema = new Schema({
  apiKey: {
    type: String,
    default: utils.generateRandomStringFunction(25),
  },
  appId: {
    type: String,
    default: utils.generateRandomStringFunction(12),
  },
  appName: {
    type: String,
    required: true,
  },
  deactivated: {
    type: Boolean,
    default: false,
  },
  updated: {
    type: Date,
  },
  created: {
    type: Date,
    default: Date.now,
  },
});

ApiKeySchema.index({ apiKey: 1, apiId: 1 }, { unique: true });

const ApiKey = mongoose.model("ApiKey", ApiKeySchema);

ApiKey.createIndexes();

module.exports = ApiKey;
