"use strict";

/**
 * Module dependencies.
 */
const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const utils = require("../controllers/api/utils/api.utils");

/**
 * Component Schema
 */
const ComponentSchema = new Schema({
  organizationFirebaseId: {
    type: String,
    trim: true,
    required: "Field \"organizationId\" is required.",
    default: "",
  },
  userFirebaseId: {
    type: String,
    trim: true,
    required: "Field \"userId\" is required.",
  },
  name: {
    type: String,
    trim: true,
    // unique: true,
    required: "Field \"name\" is required.",
  },
  authorName: {
    type: String,
    trim: true,
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
  updated: {
    type: Date,
  },
  created: {
    type: Date,
    default: Date.now,
  },
});

ComponentSchema.index({ name: 1, organizationFirebaseId: 1 }, { unique: true });

/**
 * Hook a pre save method to cleanup empty property values in the component
 */
ComponentSchema.pre("save", function (next) {
  if (this.component) {
    this.component = utils.cleanEmptyProps(this.component);
  }

  next();
});

const Component = mongoose.model("Component", ComponentSchema);
Component.createIndexes();
module.exports = Component;
