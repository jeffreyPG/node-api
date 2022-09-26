"use strict";

/**
 * Module dependencies.
 */
const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const validate = require("../controllers/api/utils/api.validation");

/**
 * Asset Schema
 */
const AssetSchema = new Schema({
  type: {
    type: String,
    trim: true,
    default: "",
    required: "Field \"type\" is required.",
    // enum: {
    //   values: validate.getTypes(),
    //   message: 'Field "type" is invalid.'
    // }
  },
  category: {
    type: String,
    trim: true,
    default: "",
    required: "Field \"category\" is required.",
  },
  displayName: {
    type: String,
    trim: true,
    default: "",
    required: "Field \"displayName\" is required.",
    validate: [validate.maxLengthValidation(200), "Field \"displayName\" cannot exceed 200 characters in length."],
  },
  count: {
    type: Number,
    trim: true,
    default: 0,
    required: "Field \"count\" is required.",
  },
  tags: {
    type: Array,
    default: [],
  },
  images: {
    type: Array,
    default: [],
  },
  formFields: {
    type: [Schema.Types.Mixed],
  },
  createdByUserId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: "Field \"createdByUserId\" is required.",
  },
  updated: {
    type: Date,
    default: Date.now,
  },
  created: {
    type: Date,
    default: Date.now,
  },
}, { usePushEach: true, minimize: false });

mongoose.model("Asset", AssetSchema);
