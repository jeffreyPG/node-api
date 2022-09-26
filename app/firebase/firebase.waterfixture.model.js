"use strict";

var mongoose = require("mongoose"),
  Schema = mongoose.Schema;

var baseFieldMapper = require("./firebase.csvbase.model").csvMap;

var csvWaterfixture = {
  fieldCount: baseFieldMapper.fieldCount + 5,
  config: {
    type: "waterfixture",
    typeplural: "waterfixtures",
  },

  3:    { fbPath: "component.mixingType", type: String, maxLength: 20 },
  4:    { fbPath: "component.fixtureType", type: String, maxLength: 20 },
  5:    { fbPath: "component.ratedFlowRateUnits", type: String, maxLength: 5 },
  6:    { fbPath: "component.ratedFlowRate", type: Number, maxLength: 15 },
  7:    { fbPath: "component.mixedHotWaterTemp", type: Number, maxLength: 15 }
};

var ObjectSchema = {};
// mongoose.model('ComponentWaterfixture', new Schema(ObjectSchema));

var Configuration = [];

var FirebaseFields = {};

module.exports = {
  fields: FirebaseFields,
  configuration: Configuration,
  csvMap: csvWaterfixture,
  objectSchema: ObjectSchema
};
