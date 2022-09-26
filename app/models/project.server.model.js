"use strict";

/**
 * Module dependencies.
 */
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

/**
 * Salesforce Connected Accounts Schema
 */
const SFConnectedAccountsSchema = new Schema({
  username: {
    type: String,
    required: 'Field "username" is required.'
  },
  sObjectId: {
    type: String,
    required: 'Field "sObjectId" is required.'
  }
});

/**
 * Project Schema
 */
const ProjectSchema = new Schema(
  {
    name: {
      type: String,
      trim: true,
      required: 'Field "name" is required.'
    },
    displayName: {
      type: String,
      trim: true,
      required: 'Field "displayName" is required.'
    },
    status: {
      type: String
    },
    originalDisplayName: {
      type: String,
      trim: true,
      required: 'Field "originalDisplayName" is required.'
    },
    source: {
      type: String,
      trim: true,
      default: ""
    },
    eaDisplayName: {
      type: String,
      trim: true
    },
    eaSavedToLibrary: {
      type: Boolean
    },
    eaAttachedTo: {
      type: Array
    },
    location: {
      type: Array
    },
    locations: [
      {
        type: Schema.Types.ObjectId,
        ref: "Location"
      }
    ],
    description: {
      type: String,
      trim: true
    },
    fuel: {
      type: String,
      trim: true
    },
    created: {
      type: Date,
      default: Date.now
    },
    project_category: {
      type: String
    },
    project_application: {
      type: String
    },
    project_technology: {
      type: String
    },
    applicable_building_types: {
      type: Array
    },
    category: {
      type: String,
      trim: true
    },
    fields: {
      type: Schema.Types.Mixed
    },
    initialValues: {
      type: Schema.Types.Mixed
    },
    incentive: {
      type: Schema.Types.Mixed
    },
    runResults: {
      type: Schema.Types.Mixed
    },
    runResultsWithRate: {
      type: Schema.Types.Mixed
    },
    imagesInReports: {
      type: Schema.Types.Mixed
    },
    imageUrls: {
      type: [
        {
          type: String
        }
      ]
    },
    organizationFirebaseId: {
      type: String,
      trim: true
    },
    isComplete: {
      type: Boolean
    },
    createdByUserId: {
      type: Schema.Types.ObjectId,
      ref: "User"
    },
    updated: {
      type: Date
    },
    analysisType: {
      type: String,
      enum: ["simulation", "prescriptive"],
      default: "prescriptive"
    },
    package: {
      type: Schema.Types.ObjectId,
      ref: "ProjectPackage"
    },
    type: {
      type: String,
      default: ""
    },
    measureLife: {
      type: String,
      default: "0"
    },
    budgetType: {
      type: String,
      default: ""
    },
    metric: {
      type: Object,
      default: {}
    },
    formulas: {
      electric: {
        type: Schema.Types.ObjectId
      },
      gas: {
        type: Schema.Types.ObjectId
      }
    },
    config: {
      type: Object,
      default: {}
    },
    salesforce: {
      connectedObjects: {
        type: [SFConnectedAccountsSchema],
        default: []
      }
    },
    rates: {
      type: Object,
      default: {}
    },
    projects: [
      {
        type: Schema.Types.ObjectId,
        ref: "Project"
      }
    ],
    groups: {
      type: Array,
      default: []
    },
    equipmentToGroupMap: {
      type: Object,
      default: {}
    },
    equipmentToProjectMap: {
      type: Object,
      default: {}
    },
    equipmentToEquipmentNameMap: {
      type: Object,
      default: {}
    },
    equipments: {
      type: Array,
      default: []
    },
    cashFlowData: {
      type: Object,
      default: {}
    }
  },
  { usePushEach: true }
);

ProjectSchema.virtual("author", {
  justOne: true,
  localField: "createdByUserId",
  foreignField: "_id",
  ref: "User"
});

ProjectSchema.set("toObject", { virtuals: true });
ProjectSchema.set("toJSON", { virtuals: true });

mongoose.model("Project", ProjectSchema);

module.exports.ProjectSchema = ProjectSchema;
module.exports.Project = mongoose.model("Project", ProjectSchema);
