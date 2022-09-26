"use strict";

/**
 * Module dependencies.
 */
const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const validate = require("../controllers/api/utils/api.validation");

/**
 * Public Asset Schema
 */
const PublicAssetSchema = new Schema({
  type: {
    type: String,
    trim: true,
    default: "",
    // required: 'Field "type" is required.',
    // enum: {
    //   values: validate.getTypes(),
    //   message: 'Field "type" is invalid.'
    // }
  },
  category: {
    type: String,
    trim: true,
    default: "",
  },
  displayName: {
    type: String,
    trim: true,
    default: "",
    required: "Field \"name\" is required.",
    validate: [validate.maxLengthValidation(200), "Field \"name\" cannot exceed 200 characters in length."],
  },
  formFields: [{
    _id: false,
    default: {},
  }],
}, { usePushEach: true, minimize: false });

mongoose.model("PublicAsset", PublicAssetSchema);
