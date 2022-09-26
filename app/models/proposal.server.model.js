"use strict";

/**
 * Module dependencies.
 */
const mongoose = require("mongoose");
const Schema = mongoose.Schema;
/**
 * Proposal Schema
 */
const ProposalSchema = new Schema(
  {
    name: {
      type: String,
      trim: true,
      required: 'Field "name" is required.'
    },
    template: {
      type: Schema.Types.ObjectId,
      ref: "ProposalTemplate"
    },
    organization: {
      type: Schema.Types.ObjectId,
      ref: "Organization"
    },
    buildingIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "Building"
      }
    ],
    measures: [
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
    projectPackages: [
      {
        type: Schema.Types.ObjectId,
        ref: "ProjectPackage"
      }
    ],
    rates: {
      type: Object
    },
    total: {
      type: Object
    },
    comments: {
      type: String,
      default: ""
    },
    images: [],
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
    fields: {
      type: Array
    },
    fieldValues: {
      type: Schema.Types.Mixed,
      default: {}
    },
    mode: {
      type: String,
      default: "Measure"
    },
    convertedProjectPackage: {
      type: Schema.Types.ObjectId,
      ref: "ProjectPackage"
    },
    isDefault: {
      type: Boolean,
      defualt: false
    }
  },
  { usePushEach: true }
);

ProposalSchema.virtual("author", {
  justOne: true,
  localField: "createdByUserId",
  foreignField: "_id",
  ref: "User"
});

ProposalSchema.set("toObject", { virtuals: true });
ProposalSchema.set("toJSON", { virtuals: true });

mongoose.model("Proposal", ProposalSchema);

module.exports.ProposalSchema = ProposalSchema;
module.exports.Proposal = mongoose.model("Proposal", ProposalSchema);
