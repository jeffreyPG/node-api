"use strict";

/**
 * Module dependencies.
 */
const config = require("../../config/config");
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Setup db connection info per config settings
const dbCollection = (typeof config.logging !== "undefined" && typeof config.logging.dbCollection !== "undefined") ? config.logging.dbCollection : "dev_logs";

/**
 * Log Schema
 */
const LogSchema = new Schema({
  message: {
    type: String,
  },
  timestamp: {
    type: Date,
  },
  level: {
    type: String,
  },
  meta: {
    type: Schema.Types.Mixed,
  },
  label: {
    type: String,
  },
}, { collection: dbCollection });

mongoose.model("Log", LogSchema);
