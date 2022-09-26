"use strict";

/**
 * Module dependencies.
 */
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const WeatherSchema = new Schema(
    {
        location: {
            type: String,
        },
        month: {
            type: String,
        },
        year: {
            type: String,
        },
        date: {
            type: Date,
        },
        celsius: {
            type: Number,
        },
        fahrenheit: {
            type: Number,
        },
        cdd: {
            type: Number,
        },
        hdd: {
            type: Number,
        },
    },
    {
        timestamps: true
    }
);

module.exports.Weather = mongoose.model("Weather", WeatherSchema);