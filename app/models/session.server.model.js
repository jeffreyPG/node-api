"use strict";

/**
 * Module dependencies.
 */
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

/**
 * Session Schema
 */
const SessionSchema = new Schema(
  {
    secret: {
      type: String,
      trim: true,
      unique: true,
    },
    username: {
      type: String,
      trim: true,
    },
    expires: {
      type: Date,
      expires: 900,
    },
    web: {
      type: Boolean,
      default: false,
    },
    nonces: [
      {
        type: String,
      },
    ],
    created: {
      type: Date,
      default: Date.now,
    },
  },
  { usePushEach: true }
);

const Session = mongoose.model("Session", SessionSchema);
module.exports = Session;
