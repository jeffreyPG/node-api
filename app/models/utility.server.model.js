"use strict";

/**
 * Module dependencies.
 */
const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const validate = require("../controllers/api/utils/api.validation");

/**
 * Meter Sub-document
 */
const SubMeterSchema = new Schema({
  startDate: {
    type: Date,
    default: "",
    required: 'Field "meterData[].startDate" is required.'
  },
  endDate: {
    type: Date,
    default: "",
    required: 'Field "meterData[].endDate" is required.'
  },
  totalCost: {
    type: Number,
    default: 0
  },
  totalUsage: {
    type: Number,
    default: 0
  },
  demand: {
    type: Number,
    default: 0
  },
  demandCost: {
    type: Number,
    default: 0
  },
  estimation: {
    type: Boolean,
    default: false
  },
  created: {
    type: Date,
    default: Date.now
  }
});

const DeliverySchema = new Schema({
  deliveryDate: {
    type: Date,
    default: "",
    required: "Delivery Date is required."
  },
  totalCost: {
    type: Number,
    default: 0
  },
  quantity: {
    type: Number,
    default: 0
  },
  estimation: {
    type: Boolean,
    default: false
  },
  created: {
    type: Date,
    default: Date.now
  }
});

/**
 * Utility Schema
 */
const UtilitySchema = new Schema(
  {
    name: {
      type: String,
      trim: true
    },
    meterNumber: {
      type: String,
      trim: true
    },
    accountNumber: {
      type: String,
      trim: true
    },
    meterType: {
      type: String,
      trim: true
    },
    meterPurpose: {
      type: String,
      trim: true
    },
    meterConfiguration: {
      type: String,
      trim: true
    },
    meterShared: {
      type: Boolean
    },
    source: {
      type: String,
      trim: true
    },
    units: {
      type: String,
      trim: true
    },
    utilType: {
      type: String,
      trim: true,
      enum: {
        values: validate.getUtilityTypes(),
        message: 'Field "utilType" is invalid.'
      },
      required: 'Field "utilType" is required.'
    },
    portfolioManagerMeterId: {
      type: Number,
      default: ""
    },
    meterData: [SubMeterSchema], // Meter Consumptions
    deliveryData: [DeliverySchema], // Meter Deliveries
    updated: {
      type: Date
    },
    created: {
      type: Date,
      default: Date.now
    },
    createdByUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    }
  },
  { usePushEach: true }
);

module.exports.Utility = mongoose.model("Utility", UtilitySchema);
module.exports.Meter = mongoose.model("Meter", SubMeterSchema);
