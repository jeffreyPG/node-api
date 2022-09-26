"use strict";

const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ModelSchema = new Schema(
  {
    _partition: {
      type: String,
    },
    deviceId: {
      type: String
    },
    filePath: {
      type: String
    },
    sourceIdentity: {
        type: Schema.Types.ObjectId,
    },
    sourceObject: {
      type: String
    },
    sourcePartition: {
      type: String
    },
    uri: {
      type: String
    },
    createdByUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    }
  },
  { timestamps: true, collection: 'imagesync' }
);

const ImageSync = mongoose.model("ImageSync", ModelSchema);

module.exports.ImageSync = ImageSync;