"use strict";

const mongoose = require("mongoose");
const { PARTITION_KEYS } = require("../../../config/realm");
const Schema = mongoose.Schema;

/**
 * Salesforce Connected Accounts Schema
 */
const SFConnectedAccountsSchema = new Schema(
    {
        username: {
            type: String,
            required: "Field \"username\" is required."
        },
        sObjectId: {
            type: String,
            required: "Field \"sObjectId\" is required."
        }
    }
);

const ModelSchema = new Schema(
  {
    building: {
      type: Schema.Types.ObjectId,
      ref: "Building"
    },
    libraryEquipment: {
      type: Schema.Types.ObjectId,
      ref: "Equipment"
    },
    quantity: {
      type: Number
    },
    images: [
      {
        type: String
      }
    ],
    comments: {
      type: String
    },
    location: {
      type: Schema.Types.ObjectId,
      ref: "Location"
    },
    projects: [
      {
        type: Schema.Types.ObjectId,
        ref: "Project"
      }
    ],
    operations: [
      {
        type: Schema.Types.ObjectId,
        ref: "Schedule"
      }
    ],
    configs: [
      {
        field: String,
        value: String
      }
    ],
    maintenances: [
      {
        field: String,
        value: String
      }
    ],
    operation: {
      id: String,
      name: String
    },
    isArchived: {
      type: Boolean,
      default: false
    },
    salesforce: {
      connectedObjects: {
        type: [SFConnectedAccountsSchema],
        default: []
      }
    },
    createdByUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    _partition: {
      type: String
    },
  },
  { usePushEach: true, timestamps: true }
);

ModelSchema.statics.clone = async function (
  buildingEquipmentId,
  { removeKeys = [], replaceKeys = {} }
) {
  let buildingEquipment = await this.findById(buildingEquipmentId).lean();
  delete buildingEquipment._id;

  for (const key of removeKeys) {
    delete buildingEquipment[key];
  }

  for (const property in replaceKeys) {
    buildingEquipment[property] = replaceKeys[property];
  }

  return this.create({
    _id: new mongoose.Types.ObjectId(),
    ...buildingEquipment
  });
};

ModelSchema.pre("save", function (next) {
  if (this.building) {
    this._partition = `${PARTITION_KEYS.BUILDING_EQUIPMENT_LIST}=${this.building.toString()}`
  }
  next();
});

const BuildingEquipment = mongoose.model("BuildingEquipment", ModelSchema);

module.exports.BuildingEquipment = BuildingEquipment;