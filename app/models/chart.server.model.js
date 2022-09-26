"use strict";

/**
 * Module dependencies.
 */
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

/**
 * Chart Schema
 */
const ChartSchema = new Schema({
    previewBuildingId: {
        type: Schema.Types.ObjectId,
        ref: "Building"
    },
    reportName: String,
    urls: [{
        viewId: String,
        key: String,
        value: String
    }],
    chartTypes: {
        type: Schema.Types.Mixed,
        default: {}
    }
});

module.exports.Chart = mongoose.model("Chart", ChartSchema);