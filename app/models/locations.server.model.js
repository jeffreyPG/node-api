"use strict";

/**
 * Module dependencies.
 */
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const SpacesSchema = new Schema({
  name: {
    type: String,
    trim: true,
    required: 'Field "name" is required.'
  },
  floor: {
    type: String,
    trim: true
  },
  useType: {
    type: String,
    required: 'Field "use type" is required.'
  },
  size: {
    type: Number,
    required: 'Field "floor area" is required.'
  },
  conditioned: {
    type: Number,
    required: 'Field "percent floor area conditioned" is required.'
  },
  equipmentIds: [
    {
      type: Schema.Types.ObjectId,
      ref: "Equipment"
    }
  ]
});

const FloorsSchema = new Schema({
  name: {
    type: String,
    trim: true,
    required: 'Field "name" is required.'
  },
  spaceIds: [
    {
      type: Schema.Types.ObjectId,
      ref: "Spaces"
    }
  ]
});

mongoose.model("Spaces", SpacesSchema);
mongoose.model("Floors", FloorsSchema);
