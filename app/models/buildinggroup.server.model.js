"use strict";

/**
 * Module dependencies.
 */
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const BuildingGroupSchema = new Schema(
    {
        name: {
            type: String
        },
        buildingIds: [
            {
              type: Schema.Types.ObjectId,
              ref: "Building"
            }
        ],
        createdByUserId: {
            type: Schema.Types.ObjectId
        },
        orgIds: [
            {
              type: Schema.Types.ObjectId,
              ref: "Organization"
            }
        ]
    }, { usePushEach: true }
);

module.exports.BuildingGroupSchema = mongoose.model("BuildingGroup", BuildingGroupSchema);