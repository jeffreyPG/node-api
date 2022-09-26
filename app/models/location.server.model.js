"use strict";

/**
 * Module dependencies.
 */
const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const floorNames = require("../static/location-floors");
const useTypes = require("../static/building-use-types");
const { getSpaceTypes } = require("../static/building-space-types");

const LocationsSchema = new Schema(
  {
    name: {
      type: String,
      trim: true,
      required: 'Field "name" is required.'
    },
    floor: {
      type: Number
    },
    usetype: {
      type: String,
      required: 'Field "use type" is required.'
    },
    spaceType: {
      type: String
    },
    conditioning: {
      type: String
    },
    user: {
      type: String
    },
    area: {
      type: Number
    },
    length: {
      type: Number
    },
    width: {
      type: Number
    },
    height: {
      type: Number
    },
    building: {
      type: Schema.Types.ObjectId,
      ref: "Building"
    },
    _partition: {
      type: String
    },
    createdByUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

LocationsSchema.statics.floorValueByName = function(name) {
  const floorName = floorNames.find(floorName => name === floorName.name);
  if (!floorName) {
    return null;
  }
  return floorName.value;
};

LocationsSchema.statics.floorNameByValue = function(value) {
  const floorName = floorNames.find(floorName => value == floorName.value);
  if (!floorName) {
    return null;
  }
  return floorName.name;
};

LocationsSchema.statics.displayName = function(location) {
  let useTypeDisplayName;
  if (location.spaceType) {
    const type = getSpaceTypes(location.usetype).find(
      typeItem => typeItem.value === location.spaceType,
    );
    useTypeDisplayName = type ? type.name : location.useType;
  } else {
    const type = useTypes.find(useType => useType.value === location.usetype);
    useTypeDisplayName = type ? type.name : location.useType;
  }
  return `${useTypeDisplayName} ${location.name}`;
};

module.exports.Location = mongoose.model("Location", LocationsSchema);
