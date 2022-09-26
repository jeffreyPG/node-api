"use strict";

/**
 * Module dependencies.
 */
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

/**
 * Field Schema
 */
const SubFieldSchema = new Schema(
  {
    type: {
      type: String,
    },
    label: {
      type: String,
    },
    name: {
      type: String,
    },
    description: {
      type: String,
    },
    existing: {
      type: Boolean,
    },
    replacement: {
      type: Boolean,
    },
    options: [
      {
        label: { type: String },
        value: { type: String },
        _id: false,
      },
    ],
    firebase_input: {
      type: String,
      default: "",
    },
    default: Schema.Types.Mixed,
  },
  { versionKey: false, _id: false }
);

/**
 * Measure Schema
 */
const MeasureSchema = new Schema(
  {
    category: {
      type: String,
      trim: true,
      required: "Field \"category\" is required.",
    },
    project_category: {
      type: String,
      // required: 'Field "project_category" is required.',
    },
    project_application: {
      type: String,
      // required: 'Field "project_application" is required.',
    },
    project_technology: {
      type: String,
      // required: 'Field "project_technology" is required.',
    },
    applicable_building_types: {
      type: Array,
      // required: 'Field "applicable_building_types" is required.',
    },
    name: {
      type: String,
      trim: true,
      required: "Field \"name\" is required.",
    },
    displayName: {
      type: String,
      trim: true,
      required: "Field \"displayName\" is required.",
    },
    description: {
      type: String,
      trim: true,
      required: "Field \"description\" is required.",
    },
    fuel: {
      type: String,
      trim: true,
    },
    source: {
      type: String,
      trim: true,
      default: "",
    },
    fields: [SubFieldSchema],
    incentive: {
      type: Object,
    },
    eaAttachedTo: {
      type: Array,
    },
    created: {
      type: Date,
      default: Date.now,
    },
    analysisType: {
      type: String,
      enum: ["simulation", "prescriptive"],
      default: "prescriptive",
    },
    formulas: {
      electric: {
        type: Schema.Types.ObjectId
      },
      gas: {
        type: Schema.Types.ObjectId
      }
    },
    config: {
      type: Object,
      default: {}
    },
    type: {
      type: String,
      enum: ["abatement", "retrofit", "incentive", "rcx", "o&m", "Portfolio"],
      default: "retrofit",
    },
  },
  { usePushEach: true }
);

module.exports.MeasureSchema = MeasureSchema;
module.exports.Measure = mongoose.model("Measure", MeasureSchema);
