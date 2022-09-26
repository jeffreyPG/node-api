"use strict";

var mongoose = require("mongoose"),
  Schema = mongoose.Schema;

var baseFieldMapper = require("./firebase.csvbase.model").csvMap;

var csvDoor = {
  fieldCount: baseFieldMapper.fieldCount + 10,
  config: {
    type: "door",
    typeplural: "doors",
  },

  3:    { fbPath: "component.configuration.exposure", type: String, maxLength: 2 },
  4:    { fbPath: "component.configuration.vestibule", type: String, maxLength: 3 },
  5:    { fbPath: "component.configuration.gapWidth", type: Number, maxLength: 15 },
  6:    { fbPath: "component.configuration.gapLength", type: Number, maxLength: 15 },

  7:    { fbPath: "component.data.manufacturer", type: String, maxLength: 50 },
  8:    { fbPath: "component.data.model", type: String, maxLength: 50 },
  9:    { fbPath: "component.data.doorType", type: String, maxLength: 15 },
  10:   { fbPath: "component.data.frameType", type: String, maxLength: 25 },
  11:   { fbPath: "component.data.glazingType", type: String, maxLength: 25 },
  12:   { fbPath: "component.data.yearBuilt", type: Number, maxLength: 5 }
};

var ObjectSchema = {};
// mongoose.model('ComponentDoor', new Schema(ObjectSchema));

var Configuration = [];

var FirebaseFields = {};

module.exports = {
  fields: FirebaseFields,
  configuration: Configuration,
  csvMap: csvDoor,
  objectSchema: ObjectSchema
};
