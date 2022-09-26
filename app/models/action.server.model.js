"use strict";

const types = [
  "BENCHMARKING",
  "BUILDING_USE_CHANGE",
  "LEVEL1_ENERGY_AUDIT",
  "LEVEL2_ENERGY_AUDIT",
  "LEVEL3_ENERGY_AUDIT",
  "LL84_BENCHMARKING",
  "LL87_ENERGY_AUDIT",
  "LL87_RCX",
  "O_M",
  "RETROCOMMISSIONING",
  "RETROFIT",
];

/**
 * Module dependencies.
 */
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ActionTemplateSchema = new Schema({
  name: {
    type: String,
    trim: true,
    required: "Field \"name\" is required.",
  },
  description: {
    type: String,
    required: "Field \"description\" is required.",
  },
  type: {
    type: String,
    enum: types,
    index: true,
  },
  date: {
    type: Date,
    default: Date.now(),
  },
  fields: {
    type: Schema.Types.Mixed,
  },
  contacts: {
    type: Schema.Types.Mixed,
  },
  measures: [
    {
      _id: {
        type: Schema.Types.ObjectId,
        ref: "Measure",
      },
    },
  ],
  updated: {
    type: Date,
    default: Date.now(),
  },
});

const ActionSchema = new Schema({
  name: {
    type: String,
    trim: true,
    required: "Field \"name\" is required.",
  },
  description: {
    type: String,
    required: "Field \"description\" is required.",
  },
  type: {
    type: String,
    enum: types,
    index: true,
  },
  date: {
    type: Date,
    default: Date.now(),
  },
  fields: {
    type: Schema.Types.Mixed,
  },
  contacts: {
    type: Schema.Types.Mixed,
  },
  projects: [
    {
      _id: {
        type: Schema.Types.ObjectId,
        ref: "Project",
      },
      displayName: {
        type: String,
      },
      status: {
        type: String,
      },
      measureId: {
        type: Schema.Types.ObjectId,
        ref: "Measure",
      },
    },
  ],
  comments: {
    type: String,
  },
  buildingId: {
    type: Schema.Types.ObjectId,
    ref: "Building",
  },
  templateId: {
    type: Schema.Types.ObjectId,
    ref: "ActionTemplate",
  },
  createdByUserId: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
  updated: {
    type: Date,
    default: Date.now(),
  },
});

module.exports.ActionTemplate = mongoose.model(
  "ActionTemplate",
  ActionTemplateSchema
);
module.exports.Action = mongoose.model("Action", ActionSchema);
