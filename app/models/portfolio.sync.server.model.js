"use strict";

/**
 * Module dependencies.
 */
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

/**
 * Portfolio History Schema
 */
const PortfolioSyncSchema = new Schema({
  accountId: {
    type: Number,
    default: "",
    required: "Field \"accountId\" is required.",
  },
  username: {
    type: String,
    trim: true,
    default: "",
    required: "Field \"username\" is required.",
  },
  email: {
    type: String,
    trim: true,
    default: "",
    required: "Field \"email\" is required.",
  },
  account: {
    type: Schema.Types.Mixed,
    default: {},
  },
  orgsWithAccess: [String],
  updated: {
    type: Date,
  },
  created: {
    type: Date,
    default: Date.now,
  },
});

PortfolioSyncSchema.index(
  { accountId: 1, username: 1, email: 1 },
  { unique: true }
);

const PortfolioSync = (module.exports = mongoose.model(
  "PortfolioSync",
  PortfolioSyncSchema
));

PortfolioSync.createIndexes();
