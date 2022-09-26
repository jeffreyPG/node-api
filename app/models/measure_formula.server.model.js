"use strict";

/**
 * Module dependencies.
 */
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const MeasureFormula = new Schema({
    calcName: {
        type: String,
        required: 'Field "calcName" is required.',
    },
    formula: {
        type: String,
        required: 'Field "formula" is required.',
    },
    fuel: {
        type: String,
        required: 'Field "fuel" is required.',
    }
}, {collection: 'measure_formulas'});

module.exports.Building = mongoose.model("MeasureFormula", MeasureFormula);
