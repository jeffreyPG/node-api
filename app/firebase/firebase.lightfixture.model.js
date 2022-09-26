"use strict";

var mongoose = require("mongoose"),
  Schema = mongoose.Schema;

var baseFieldMapper = require("./firebase.csvbase.model").csvMap;

var csvLightfixture = {
  fieldCount: baseFieldMapper.fieldCount + 23,
  config: {
    type: "lightfixture",
    typeplural: "lightfixtures",
  },

  3:    { fbPath: "component.configuration.controlType", type: String, maxLength: 50 },
  4:    { fbPath: "component.configuration.mounting", type: String, maxLength: 50 },
  5:    { fbPath: "component.configuration.purpose", type: String, maxLength: 25 },
  6:    { fbPath: "component.configuration.fixHeight", type: Number, maxLength: 25 },
  7:    { fbPath: "component.configuration.lampPerFixture", type: Number, maxLength: 15 },
  8:    { fbPath: "component.configuration.ballastPerFixture", type: Number, maxLength: 15 },

  9:    { fbPath: "component.dataBallast.ballastType", type: String, maxLength: 50 },
  10:   { fbPath: "component.dataBallast.inputVoltage", type: String, maxLength: 15 },
  11:   { fbPath: "component.dataBallast.manufacturer", type: String, maxLength: 50 },
  12:   { fbPath: "component.dataBallast.model", type: String, maxLength: 50 },
  13:   { fbPath: "component.dataBallast.startingMethod", type: String, maxLength: 25 },
  14:   { fbPath: "component.dataBallast.ballastPower", type: Number, maxLength: 25 },
  15:   { fbPath: "component.dataBallast.ballastFactor", type: Number, maxLength: 25 },

  16:   { fbPath: "component.dataLamp.ansiLampDesignation", type: String, maxLength: 15 },
  17:   { fbPath: "component.dataLamp.lightSourceType", type: String, maxLength: 50 },
  18:   { fbPath: "component.dataLamp.manufacturer", type: String, maxLength: 50 },
  19:   { fbPath: "component.dataLamp.model", type: String, maxLength: 50 },
  20:   { fbPath: "component.dataLamp.inputPower", type: String, maxLength: 15 },
  21:   { fbPath: "component.dataLamp.cct", type: Number, maxLength: 25 },
  22:   { fbPath: "component.dataLamp.cri", type: Number, maxLength: 25 },
  23:   { fbPath: "component.dataLamp.illuminance", type: Number, maxLength: 25 },
  24:   { fbPath: "component.dataLamp.length", type: Number, maxLength: 25 },
  25:   { fbPath: "component.dataLamp.luminousFlux", type: Number, maxLength: 25 }
};

var ObjectSchema = {
  name: {
    type: String,
    trim: true
  },
  comment: {
    type: String,
    trim: true
  },
  conditionRating: {
    type: String,
    trim: true
  },

  configuration: {
    controlType: {
      type: String,
      trim: true
    },
    mounting: {
      type: String,
      trim: true
    },
    fixHeight: {
      type: Number
    },
    lampPerFixture: {
      type: Number
    },
    ballastPerFixture: {
      type: Number
    },
    purpose: {
      type: String,
      trim: true
    }
  },

  dataBallast: {
    ballastType: {
      type: String,
      trim: true
    },
    inputVoltage: {
      type: String,
      trim: true
    },
    manufacturer: {
      type: String,
      trim: true
    },
    model: {
      type: String,
      trim: true
    },
    startingMethod: {
      type: String,
      trim: true
    },
    ballastPower: {
      type: Number
    },
    ballastFactor: {
      type: Number
    }
  },

  dataLamp: {
    ansiLampDesignation: {
      type: String,
      trim: true
    },
    lightSourceType: {
      type: String,
      trim: true
    },
    manufacturer: {
      type: String,
      trim: true
    },
    model: {
      type: String,
      trim: true
    },
    inputPower: {
      type: String,
      trim: true
    },
    cct: {
      type: Number
    },
    cri: {
      type: Number
    },
    illuminance: {
      type: Number
    },
    length: {
      type: Number
    },
    luminousFlux: {
      type: Number
    }
  }
};
mongoose.model("ComponentLightfixture", new Schema(ObjectSchema));

var Configuration = [
  { type: String, fbPath: "purpose" },
  { type: String, fbPath: "controlType" },
  { type: String, fbPath: "mounting" },
  { type: String, fbPath: "fixHeight" },
  { type: String, fbPath: "lampPerFixture" },
  { type: String, fbPath: "ballastPerFixture" }
];

var FirebaseFields = {
  "Manufacturer": {
    fbPath: "dataLamp.manufacturer",
    type: String
  },
  "Model": {
    fbPath: "dataLamp.model",
    type: String
  },
  "Corrected Color Temperature": {
    fbPath: "dataLamp.cct",
    type: String
  },
  "Brand": {
    fbPath: "dataBallast.model",
    type: String
  },
  "Lamp Category": {
    fbPath: "dataBallast.ballastType",
    type: String
  },
  "Rated Voltage": {
    fbPath: "dataBallast.inputVoltage",
    type: String
  },
  "Light Source Type": {
    fbPath: "dataLamp.lightSourceType",
    type: String
  }
};

module.exports = {
  fields: FirebaseFields,
  configuration: Configuration,
  csvMap: csvLightfixture,
  objectSchema: ObjectSchema
};
