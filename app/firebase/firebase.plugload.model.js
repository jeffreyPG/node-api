"use strict";

var mongoose = require("mongoose"),
  Schema = mongoose.Schema;

var baseFieldMapper = require("./firebase.csvbase.model").csvMap;

var csvPlugload = {
  fieldCount: baseFieldMapper.fieldCount + 7,
  config: {
    type: "plugload",
    typeplural: "plugloads",
  },

  3:    { fbPath: "component.plugLoadData.manufacturer", type: String, maxLength: 50 },
  4:    { fbPath: "component.plugLoadData.model", type: String, maxLength: 50 },
  5:    { fbPath: "component.plugLoadData.type", type: String, maxLength: 50 },
  6:    { fbPath: "component.plugLoadData.energyStarRated", type: String, maxLength: 5 },
  7:    { fbPath: "component.plugLoadData.standbyPower", type: Number, maxLength: 15 },
  8:    { fbPath: "component.plugLoadData.peakPower", type: Number, maxLength: 15 },
  9:    { fbPath: "component.plugLoadData.yearBuilt", type: Number, maxLength: 5 }
};

var ObjectSchema = {};
// mongoose.model('ComponentPlugload', new Schema(ObjectSchema));

var Configuration = [];

var FirebaseFields = {};

module.exports = {
  fields: FirebaseFields,
  configuration: Configuration,
  csvMap: csvPlugload,
  objectSchema: ObjectSchema
};
