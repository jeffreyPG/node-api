"use strict";

/**
 * Module dependencies.
 */
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

/**
 * Session Schema
 */
const BlacklistSchema = new Schema({
  email: {
    type: String,
    trim: true,
    unique: true,
  },
  permanent: {
    type: Boolean,
  },
  created: {
    type: Date,
    default: Date.now,
  },
});

mongoose.model("Blacklist", BlacklistSchema);
