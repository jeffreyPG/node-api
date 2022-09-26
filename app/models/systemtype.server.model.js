"use strict";

/**
 * Module dependencies.
 */
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const SystemTypeSchema = new Schema({
  name: {
    type: String,
    trim: true,
    required: "Field \"name\" is required.",
  },
  order: Number,
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
        order: Number,
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
        equipment: {
          type: [
            {
              type: Schema.Types.ObjectId,
            },
          ],
        },
      },
    ],
  },
  imageUrls: {
    type: [
      {
        type: String,
      },
    ],
  },
});

module.exports.SystemType = mongoose.model("SystemType", SystemTypeSchema);
