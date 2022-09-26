"use strict";

/**
 * Module dependencies.
 */
const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const validate = require("../controllers/api/utils/api.validation");

/**
 * Scenario Schema
 */
const ScenarioSchema = new Schema(
  {
    name: {
      type: String,
      trim: true,
      default: "",
      required: "Field \"ScenarioName\" is required.",
      validate: [
        validate.maxLengthValidation(200),
        "Field \"ScenarioName\" cannot exceed 200 characters in length.",
      ],
    },
    description: {
      type: String,
      trim: true,
    },
    buildingIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "Building",
      },
    ],
    projectIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "Project",
      },
    ],
    measurePackageIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "MeasurePackage",
      },
    ],
    organizations: [],
    createdByUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: "Field \"createdByUserId\" is required.",
    },
    updated: {
      type: Date,
      default: Date.now
    },
    created: {
      type: Date,
      default: Date.now,
    },
    filters: [],
    estimatedStartDate:{
      type: Date,
      default: Date.now
    },
    estimatedCompletionDate:{
      type: Date,
      default: Date.now
    },
    metric: {
      type: Object,
      default: {}
    }
  },
  { usePushEach: true, minimize: false }
);

module.exports.Scenario = mongoose.model("Scenario", ScenarioSchema);
