"use strict";

/**
 * Module dependencies.
 */
const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  category: {
    displayName: String,
    value: String
  },
  application: {
    displayName: String,
    value: String
  },
  technology: {
    displayName: String,
    value: String
  }
});

module.exports.MeasureCategorization = mongoose.model(
  "MeasureCategorization",
  schema
);
