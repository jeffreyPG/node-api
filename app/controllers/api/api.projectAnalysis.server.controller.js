"use strict";

const mongoose = require("mongoose");
const util = require("./utils/api.utils");
const analysisClient = require("./utils/api.analysis.client");
const simulationClient = require("./utils/api.simulation.client");
const { Project } = require("../../models/project.server.model");
const { Building } = require("../../models/building.server.model");

exports.createProjectAnalysis = async function (req, res, next) {
  try {
    const { buildingId, projectId } = req.params;
    const body = req.body;

    if (!mongoose.Types.ObjectId.isValid(buildingId)) {
      return util.sendError("Invalid Building Id", 400, req, res, next);
    }

    const building = await Building.findById(buildingId);

    if (!building) {
      return util.sendError("Building not found", 404, req, res, next);
    }

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return util.sendError("Invalid Project Id", 400, req, res, next);
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return util.sendError("Project not found", 404, req, res, next);
    }

    const parameters = { ...project.initialValues, ...body.parameters };

    let result = {};
    if (project.analysisType === "prescriptive") {
      result = await analysisClient.runPrescriptiveMeasureV2({
        project,
        building,
        parameters,
      });
    }

    if (project.analysisType === "simulation") {
      result = await simulationClient.runSimulation({
        project,
        building,
        parameters,
      });
    }

    await Project.findByIdAndUpdate(project._id, {
      runResults: {
        ...project.runResults,
        [building._id]: result,
      },
    });

    res.sendResult = {
      status: "Success",
      message: "Created Analysis",
      analysis: result,
    };
  } catch (error) {
    console.error(error);
    return util.sendError(error, 500, req, res, next);
  }

  return next();
};
