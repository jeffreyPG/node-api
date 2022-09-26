"use strict";

/**
 * Module dependencies.
 */
const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const validate = require("../controllers/api/utils/api.validation");

const SpreadsheetTemplateSchema = new Schema(
  {
    name: {
      type: String,
      trim: true,
      required: "Field \"name\" is required.",
    },

    type: {
      type: String,
      trim: true,
      enum: {
        values: validate.getSpreadSheetTypes()
      },
      required: "Field \"type\" is required."
    },

    sheets: [{
      order: {
        type: String,
        required: "Field \"sheets order\" is required.",
      },
      name: {
        type: String,
        required: "Field \"sheets name\" is required.",
      },
      datasource: {
        type: String,
        enum: {
          values: validate.getDataSources(),
        },
        required: "Field \"sheets datasource\" is required.",
      },
      metaData: {},
      columnHeadings: [{
        name: {
          type: String,
          required: "Field \"sheets column heading name\" is required.",
        },
      }],
    }],

    config: {},

    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: "Field \"organizationId\" is required.",
    },

    createdByUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: "Field \"createdByUserId\" is required.",
    },
  },
  { timestamps: true, versionKey: false }
);

module.exports.SpreadsheetTemplate = mongoose.model("SpreadsheetTemplate", SpreadsheetTemplateSchema);
