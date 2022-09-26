"use strict";

/**
 * Module dependencies.
 */
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

/**
 * Salesforce Connected Accounts Schema
 */
const SFConnectedAccountsSchema = new Schema({
  username: {
    type: String,
    required: 'Field "username" is required.'
  },
  sObjectId: {
    type: String,
    required: 'Field "sObjectId" is required.'
  }
});

/**
 * Project Schema
 */
const ProjectPackageSchema = new Schema(
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
    buildingId: {
      type: Schema.Types.ObjectId,
      ref: "Building"
    },
    projects: [
      {
        type: Schema.Types.ObjectId,
        ref: "Project"
      }
    ],
    measurePackages: [
      {
        type: Schema.Types.ObjectId,
        ref: "MeasurePackage"
      }
    ],
    estimatedStartDate: {
      type: Date,
      default: Date.now
    },
    estimatedCompletionDate: {
      type: Date,
      default: Date.now
    },
    actualStartDate: {
      type: Date,
      default: Date.now
    },
    actualCompletionDate: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      default: "Identified"
    },
    constructionStatus: {
      type: String,
      default: "Conceptual design"
    },
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
    totalWithRate: {
      type: Object
    },
    rates: {
      type: Object
    },
    salesforce: {
      connectedObjects: {
        type: [SFConnectedAccountsSchema],
        default: []
      }
    },
    previousStatus: {
      type: String,
      default: "Identified"
    },
    fields: {
      type: Array,
      default: []
    },
    fieldValues: {
      type: Schema.Types.Mixed,
      default: {}
    }
  },
  { usePushEach: true }
);

ProjectPackageSchema.virtual("author", {
  justOne: true,
  localField: "createdByUserId",
  foreignField: "_id",
  ref: "User"
});

ProjectPackageSchema.set("toObject", { virtuals: true });
ProjectPackageSchema.set("toJSON", { virtuals: true });

mongoose.model("ProjectPackage", ProjectPackageSchema);

module.exports.ProjectPackageSchema = ProjectPackageSchema;
module.exports.ProjectPackage = mongoose.model(
  "ProjectPackage",
  ProjectPackageSchema
);
