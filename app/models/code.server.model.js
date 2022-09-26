"use strict";

/**
 * Module dependencies.
 */
const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const utils = require("../controllers/api/utils/api.utils");
const validate = require("../controllers/api/utils/api.validation");

/**
 * Verify Code Schema
 */
const CodeSchema = new Schema({
  code: {
    type: String,
    default: utils.generateRandomStringFunction(30)
  },
  userEmail: {
    type: String,
    trim: true,
    lowercase: true,
    required: 'Field "userEmail" is required.',
    validate: [
      validate.valEmailAddress,
      "Please provide a valid email address."
    ]
  },
  role: {
    type: String,
    default: "editor"
  },
  updated: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 172800
  }
});

const Code = mongoose.model("Code", CodeSchema);

module.exports.Code = Code;
module.exports = CodeSchema;
