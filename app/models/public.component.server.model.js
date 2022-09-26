"use strict";

/**
 * Module dependencies.
 */
const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const utils = require("../controllers/api/utils/api.utils");

/**
 * Public Component Schema
 */
const PublicComponentSchema = new Schema({
  name: {
    type: String,
    trim: true,
    unique: true,
    required: "Field \"name\" is required.",
  },
  config: {
    type: {
      type: String,
      trim: true,
      required: "Field \"config.type\" is required.",
    },
    typeplural: {
      type: String,
      trim: true,
      required: "Field \"config.typeplural\" is required.",
    },
  },
  component: Schema.Types.Mixed,
  created: {
    type: Date,
    default: Date.now,
  },
});

/**
 * Hook a pre save method to cleanup empty property values in the component
 */
PublicComponentSchema.pre("save", function (next) {
  if (this.component) {
    this.component = utils.cleanEmptyProps(this.component);
  }

  next();
});

const PublicComponent = mongoose.model(
  "PublicComponent",
  PublicComponentSchema
);

module.exports = PublicComponentSchema;
module.exports.PublicComponent = PublicComponent;
