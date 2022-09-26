"use strict";

/**
 * Module dependencies.
 */
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

/**
 * Project DatawareHouse Schema
 */
const ProjectDatawareHouseSchema = new Schema(
  {
    name: {
      type: String,
      trim: true,
      required: "Field \"name\" is required.",
    },
    displayName: {
      type: String,
      trim: true,
      required: "Field \"displayName\" is required.",
    },
    status: {
      type: String,
      default: 'Identified',
    },
    originalDisplayName: {
      type: String,
      trim: true,
      required: "Field \"originalDisplayName\" is required.",
    },
    source: {
      type: String,
      trim: true,
      default: "",
    },
    eaDisplayName: {
      type: String,
      trim: true,
    },
    eaSavedToLibrary: {
      type: Boolean,
    },
    location: {
      type: Array,
    },
    locations: [
      {
        type: Schema.Types.ObjectId,
        ref: "Location",
      },
    ],
    description: {
      type: String,
      trim: true,
    },
    fuel: {
      type: String,
      trim: true,
    },
    created: {
      type: Date,
      default: Date.now,
    },
    project_category: {
      type: String,
    },
    project_application: {
      type: String,
    },
    project_technology: {
      type: String,
    },
    applicable_building_types: {
      type: Array,
    },
    category: {
      type: String,
      trim: true,
    },
    imagesInReports: {
      type: Schema.Types.Mixed,
    },
    imageUrls: {
      type: [
        {
          type: String,
        },
      ],
    },
    organizationFirebaseId: {
      type: String,
      trim: true,
    },
    createdByUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    updated: {
      type: Date,
    },
    analysisType: {
      type: String,
      enum: ["simulation", "prescriptive"],
      default: "prescriptive",
    },
    package:{
      type: Schema.Types.ObjectId,
      ref: "ProjectPackage"
    },
    type: {
      type:String,
      default: ''
    },
    measureLife:{
      type: String,
      default: '0'
    },
    budgetType: {
      type: String,
      default: 'Low Cost/No Cost'
    },
    metric: {
      type: Object,
      default: {}
    }
  },
  { usePushEach: true }
);

mongoose.model("ProjectDatawareHouse", ProjectDatawareHouseSchema);

module.exports.ProjectDatawareHouseSchema = ProjectDatawareHouseSchema;
module.exports.ProjectDatawareHouse = mongoose.model("ProjectDatawareHouse", ProjectDatawareHouseSchema);
