"use strict";

/**
 * Module dependencies.
 */
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

/**
 * Measure Package Schema
 */
const MeasurePackageSchema = new Schema(
  {
    name: {
      type: String,
      trim: true,
      required: 'Field "name" is required.'
    },
    description: {
      type: String,
      trim: true
    },
    category: {
      type: Object
    },
    application: {
      type: Object
    },
    technology: {
      type: Object
    },
    package: {
      type: Schema.Types.ObjectId,
      ref: "ProjectPackage"
    },
    projects: [
      {
        type: Schema.Types.ObjectId,
        ref: "Project"
      }
    ],
    updated: {
      type: Date,
      default: Date.now
    },
    created: {
      type: Date,
      default: Date.now
    },
    createdByUserId: {
      type: Schema.Types.ObjectId,
      ref: "User"
    },
    total: {
      type: Object
    },
    totalWithRates: {
      type: Object
    },
    status: {
      type: String,
      default: "Identified"
    },
    type: {
      type: String,
      default: ""
    },
    budgetType: {
      type: String,
      default: "Low Cost/No Cost"
    },
    comments: {
      type: String,
      default: ""
    },
    images: []
  },
  { usePushEach: true }
);

MeasurePackageSchema.virtual("author", {
  justOne: true,
  localField: "createdByUserId",
  foreignField: "_id",
  ref: "User"
});

MeasurePackageSchema.set("toObject", { virtuals: true });
MeasurePackageSchema.set("toJSON", { virtuals: true });

mongoose.model("MeasurePackage", MeasurePackageSchema);

module.exports.MeasurePackageSchema = MeasurePackageSchema;
module.exports.MeasurePackage = mongoose.model(
  "MeasurePackage",
  MeasurePackageSchema
);
