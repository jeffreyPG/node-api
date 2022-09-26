"use strict";

var mongoose = require("mongoose"),
  Schema = mongoose.Schema;

var baseFieldMapper = require("./firebase.csvbase.model").csvMap;

var csvWindow = {
  fieldCount: baseFieldMapper.fieldCount + 22,
  config: {
    type: "window",
    typeplural: "windows",
  },

  3:    { fbPath: "component.configuration.orientation", type: String, maxLength: 15 },
  4:    { fbPath: "component.configuration.shadeControl", type: String, maxLength: 15 },
  5:    { fbPath: "component.configuration.shadeType", type: String, maxLength: 25 },
  6:    { fbPath: "component.configuration.angle", type: Number, maxLength: 15 },
  7:    { fbPath: "component.configuration.gapWidth", type: Number, maxLength: 15 },
  8:    { fbPath: "component.configuration.gapLength", type: Number, maxLength: 15 },
  9:    { fbPath: "component.configuration.shadeOverhang", type: Number, maxLength: 15 },

  10:   { fbPath: "component.data.manufacturer", type: String, maxLength: 50 },
  11:   { fbPath: "component.data.model", type: String, maxLength: 50 },
  12:   { fbPath: "component.data.frameType", type: String, maxLength: 25 },
  13:   { fbPath: "component.data.gasFill", type: String, maxLength: 15 },
  14:   { fbPath: "component.data.numberOfPanes", type: String, maxLength: 25 },
  15:   { fbPath: "component.data.operability", type: String, maxLength: 15 },
  16:   { fbPath: "component.data.skylight", type: String, maxLength: 15 },
  17:   { fbPath: "component.data.style", type: String, maxLength: 15 },
  18:   { fbPath: "component.data.tint", type: String, maxLength: 15 },
  19:   { fbPath: "component.data.frameWidth", type: Number, maxLength: 15 },
  20:   { fbPath: "component.data.shgc", type: Number, maxLength: 25 },
  21:   { fbPath: "component.data.frameDepth", type: Number, maxLength: 25 },
  22:   { fbPath: "component.data.uFactor", type: Number, maxLength: 25 },
  23:   { fbPath: "component.data.vt", type: Number, maxLength: 25 },
  24:   { fbPath: "component.data.yearBuilt", type: Number, maxLength: 5 }
};

var ObjectSchema = {};
// mongoose.model('ComponentWindow', new Schema(ObjectSchema));

var Configuration = [];

var FirebaseFields = {};

module.exports = {
  fields: FirebaseFields,
  configuration: Configuration,
  csvMap: csvWindow,
  objectSchema: ObjectSchema
};
