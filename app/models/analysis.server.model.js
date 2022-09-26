"use strict";

/**
 * Module dependencies.
 */
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const SubMeasureResultSchema = new Schema({
  params: {
    type: Schema.Types.Mixed,
    required: "Field \"meta.measures.params\" is required.",
  },
  result: {
    type: Schema.Types.Mixed,
    required: "Field \"meta.measures.result\" is required.",
  },
});

/**
 * Analysis Schema
 */
const AnalysisSchema = new Schema(
  {
    meta: {
      status: {
        type: String,
        default: "pending",
        enum: {
          values: ["pending", "complete"],
          message: "Field \"meta.status\" is invalid.",
        },
      },
      processResultUri: {
        type: String,
        trim: true,
        default: "",
      },
      project: Schema.Types.Mixed,
      calibration: Schema.Types.Mixed,
      measures: [SubMeasureResultSchema],
    },

    results: Schema.Types.Mixed,

    buildingId: {
      type: Schema.Types.ObjectId,
      ref: "Building",
      required: "Field \"buildingId\" is required.",
    },

    utilityIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "Utility",
      },
    ],

    createdByUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: "Field \"createdByUserId\" is required.",
    },

    updated: {
      type: Date,
    },
    created: {
      type: Date,
      default: Date.now,
    },
  },
  { usePushEach: true }
);

/**
 * Hook a pre save method
 */
// AnalysisSchema.pre('save', function(next) {
//   var self = this;

//   next();
// });

module.exports.Analysis = mongoose.model("Analysis", AnalysisSchema);
