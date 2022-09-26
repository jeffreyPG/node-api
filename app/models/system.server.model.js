"use strict";

/**
 * Module dependencies.
 */
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const SystemSchema = new Schema({
  name: {
    type: String,
    trim: true,
    required: "Field \"name\" is required.",
  },
  building: {
    type: Schema.Types.ObjectId,
    ref: "Building",
    required: "Field \"building\" is required.",
  },
  template: {
    type: Schema.Types.ObjectId,
    ref: "SystemType",
  },
  projects: {
    type: [
      {
        type: Schema.Types.ObjectId,
        ref: "Project",
      },
    ],
  },
  sections: {
    type: [
      {
        name: {
          type: String,
        },
        category: {
          type: String,
        },
        application: {
          type: String,
        },
        technology: {
          type: String,
        },
        info: {
          type: [
            {
              name: {
                type: String,
              },
              label: {
                type: String,
              },
            },
          ],
        },
        buildingEquipment: {
          type: [
            {
              _id: Schema.Types.ObjectId,
            },
          ],
        },
      },
    ],
  },
  images: {
    type: [
      {
        type: String,
      },
    ],
  },
  comments: {
    type: String,
    trim: true,
  },
  createdByUserId: {
    type: Schema.Types.ObjectId,
    ref: "User",
  }
}, { timestamps: true });

module.exports.System = mongoose.model("System", SystemSchema);
