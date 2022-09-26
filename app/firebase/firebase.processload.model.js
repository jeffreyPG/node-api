"use strict";

var mongoose = require("mongoose"),
  Schema = mongoose.Schema;

var baseFieldMapper = require("./firebase.csvbase.model").csvMap;

var csvProcessload = {
  fieldCount: baseFieldMapper.fieldCount + 12,
  config: {
    type: "processload",
    typeplural: "processloads",
  },

  3:    { fbPath: "component.processLoadData.manufacturer", type: String, maxLength: 50 },
  4:    { fbPath: "component.processLoadData.model", type: String, maxLength: 50 },
  5:    { fbPath: "component.processLoadData.fuelType", type: String, maxLength: 25 },
  6:    { fbPath: "component.processLoadData.refrigerantType", type: String, maxLength: 10 },
  7:    { fbPath: "component.processLoadData.energyStarRated", type: String, maxLength: 5 },
  8:    { fbPath: "component.processLoadData.units", type: String, maxLength: 15 },
  9:    { fbPath: "component.processLoadData.capacity", type: Number, maxLength: 15 },
  10:   { fbPath: "component.processLoadData.efficiency", type: Number, maxLength: 15 },
  11:   { fbPath: "component.processLoadData.percentRadiant", type: Number, maxLength: 3 },
  12:   { fbPath: "component.processLoadData.percentLost", type: Number, maxLength: 3 },
  13:   { fbPath: "component.processLoadData.percentLatent", type: Number, maxLength: 3 },
  14:   { fbPath: "component.processLoadData.yearBuilt", type: Number, maxLength: 5 }
};

var ObjectSchema = {};
// mongoose.model('ComponentProcessload', new Schema(ObjectSchema));

var Configuration = [];

var FirebaseFields = {};

module.exports = {
  fields: FirebaseFields,
  configuration: Configuration,
  csvMap: csvProcessload,
  objectSchema: ObjectSchema
};
