"use strict";

/**
 * Module dependencies.
 */
const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const utils = require("../controllers/api/utils/api.utils");

/**
 * Public Measure Schema
 */
const PublicMeasureSchema = new Schema({
  name: {
    type: String,
    trim: true,
    unique: true,
    required: "Field \"name\" is required.",
  },
  config: {
    projectType: {
      type: String,
      trim: true,
      required: "Field \"config.projectType\" is required.",
    },
  },
  measure: Schema.Types.Mixed,
  created: {
    type: Date,
    default: Date.now,
  },
});

/**
 * Hook a pre save method to cleanup empty property values in the measure
 */
PublicMeasureSchema.pre("save", function (next) {
  if (this.measure) {
    this.measure = utils.cleanEmptyProps(this.measure);
  }

  next();
});

const PublicMeasure = mongoose.model("PublicMeasure", PublicMeasureSchema);

module.exports = PublicMeasureSchema;
module.exports.PublicMeasure = PublicMeasure;
