"use strict";

/**
 * Module dependencies.
 */
const mongoose = require("mongoose");
const { UNIT_DETAILS } = require("../static/utility-units");
const Schema = mongoose.Schema;

const utilitySchema = function () {
    const schema = Object.entries(UNIT_DETAILS).reduce((agg, [commodity, details]) => {
        agg[commodity] = {
            ghg: Number,
            totalCost: Number,
            totalUsage: Number,
            kbtu: Number,
            demand: Number,
            demandCost: Number,
            rate:Number,
            units: {
                type: String,
                default: "kWh"
            },
        }
        return agg;
    }, {})
    schema.other = {
        ghg: Number,
        totalCost: Number,
        totalUsage: Number,
        rate:Number,
        units: {
            type: String,
            default: ""
        } 
    }
    return schema;
}();


const MonthlyUtilitySchema = new Schema(
    {
        building: {
            type: Schema.Types.ObjectId,
            ref: "Building"
        },
        month: String,
        year: String,
        date: Date,
        ...utilitySchema,
        daysInPeriod: Number,
        totalEnergy: {
            value: Number, // sum of all fueltype usages - water
            units: {
                type: String,
                default: "kBtu"
            }
        },
        totalEnergyCost: Number, // totalCost - water cost
        totalCost: Number // sum of all fuel costs
    },
    {
        timestamps: true
    }
);

module.exports.MonthlyUtility = mongoose.model("MonthlyUtility", MonthlyUtilitySchema);
