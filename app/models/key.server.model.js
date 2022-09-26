"use strict";

/**
 * Module dependencies.
 */
const mongoose = require("mongoose");
const utils = require("../controllers/api/utils/api.utils");
const Schema = mongoose.Schema;

/**
 * Key Schema
 */
const KeySchema = new Schema({
  organizationFirebaseId: {
    type: String,
    trim: true,
    default: "",
    required: "Field \"orgId\" is required.",
  },
  userFirebaseId: {
    type: String,
    trim: true,
    default: "",
    required: "Field \"userId\" is required.",
  },
  eaUsername: {
    type: String,
    trim: true,
  },
  eaAuthorName: {
    type: String,
    trim: true,
  },
  apiKey: {
    type: String,
    default: utils.generateRandomStringFunction(25),
  },
  initialLoginToken: {
    type: String,
    default: utils.generateRandomStringFunction(8),
  },
  deactivated: {
    type: Boolean,
    default: false,
  },
  updated: {
    type: Date,
  },
  created: {
    type: Date,
    default: Date.now,
  },
});

KeySchema.index(
  { userFirebaseId: 1, organizationFirebaseId: 1 },
  { unique: true }
);

const Key = mongoose.model("Key", KeySchema);

Key.createIndexes();

module.exports = Key;
