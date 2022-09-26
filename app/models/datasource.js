"use strict";

/**
 * Module dependencies.
 */
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const DatasourceSchema = new Schema({
  name: {
    type: String,
    trim: true,
    required: "Field \"name\" is required.",
  },
});

module.exports.Datasource = mongoose.model("Datasource", DatasourceSchema);
