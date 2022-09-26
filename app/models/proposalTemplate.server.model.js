"use strict";

/**
 * Module dependencies.
 */
const mongoose = require("mongoose");
const Schema = mongoose.Schema;
/**
 * ProposalTemplate Schema
 */
const ProposalTemplateSchema = new Schema(
  {
    name: {
      type: String,
      trim: true,
      required: 'Field "name" is required.'
    },
    fields: {
      type: Array
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
    organization: {
      type: Schema.Types.ObjectId,
      ref: "Organization"
    }
  },
  { usePushEach: true }
);
mongoose.model("ProposalTemplate", ProposalTemplateSchema);

module.exports.ProposalTemplateSchema = ProposalTemplateSchema;
module.exports.ProposalTemplate = mongoose.model(
  "ProposalTemplate",
  ProposalTemplateSchema
);
