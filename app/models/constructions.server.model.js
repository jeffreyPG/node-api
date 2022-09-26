"use strict";

/**
 * Module dependencies.
 */
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ConstructionsSchema = new Schema(
  {
    name: {
      type: String,
      trim: true
    },
    type: {
      type: String
    },
    application: {
      type: String
    },
    category: {
      type: String
    },
    technology: {
      type: String
    },
    configs: {
      type: Array
    },
    fields: {
      type: Object
    },
    fieldsArray: {
      type: Array
    },
    archived: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

module.exports.Construction = mongoose.model(
  "Constructions",
  ConstructionsSchema
);
