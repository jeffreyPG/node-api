"use strict";

const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ProjectSimulationSchema = new Schema({
  building: {
    type: Schema.Types.ObjectId,
    ref: "Building",
  },
  project: {
    type: Schema.Types.ObjectId,
    ref: "Project",
  },
  baseline: Schema.Types.String,
  measure: Schema.Types.String,
  result: Schema.Types.Object,
});

mongoose.model("ProjectSimulation", ProjectSimulationSchema);

module.exports.ProjectSimulationSchema = ProjectSimulationSchema;
module.exports.ProjectSimulation = mongoose.model(
  "ProjectSimulation",
  ProjectSimulationSchema
);
