"use strict";

const mongoose = require("mongoose");
const util = require("./utils/api.utils");
const simulationClient = require("./utils/api.simulation.client");
const Poller = require("./utils/poller");
const { Project } = require("../../models/project.server.model");
const { Building } = require("../../models/building.server.model");
const { ProjectSimulation } = require("../../models/projectSimulation");

exports.createProjectSimulation = async function (req, res, next) {
  const { buildingId } = req.params;
  const { body } = req;

  try {
    if (!mongoose.Types.ObjectId.isValid(buildingId)) {
      return util.sendError("Invalid Building Id", 400, req, res, next);
    }

    const building = await Building.findById(buildingId);

    if (!building) {
      return util.sendError("Building not found", 404, req, res, next);
    }

    console.log("CREATE PROJECT SIMULATION");
    console.log(body);

    const projectIds = body.projects ? body.projects.map(p => p._id) : [];
    const projectRequests = await Promise.all(
      projectIds.map(async projectId => {
        const project = await Project.findById(projectId);
        if (!project) {
          return util.sendError("Project not found", 404, req, res, next);
        }
        return project;
      })
    );

    console.log("PROJECT REQUESTS", projectRequests);

    const projects = projectRequests.filter(
      project => project.analysisType === "simulation"
    );

    console.log("SIMULATION PROJECTS", projects);

    const { baseline, measures } = await simulationClient.createSimulation({
      projects,
      parameters: body.parameters,
    });

    const projectSimulationRequests = await Promise.all(
      measures.map(async measure => {
        const measureResponse = await simulationClient.getMeasure({
          baselineId: baseline._id,
          measureId: measure._id,
        });
        return {
          measureId: measure._id,
          projectId: measure.projectId,
          ...measureResponse,
        };
      })
    );

    const projectSimulations = await Promise.all(
      projectSimulationRequests.map(async projectSimulationRequest => {
        const projectSimulation = await ProjectSimulation.create({
          baseline: baseline._id,
          building: building._id,
          measure: projectSimulationRequest.measureId,
          project: projectSimulationRequest.projectId,
          result: projectSimulationRequest,
        });
        const project = await Project.findById(
          projectSimulationRequest.projectId
        );
        if (project) {
          console.log(
            "SAVING INITIAL PROJECT RUN RESULTS",
            projectSimulationRequest
          );
          await Project.findByIdAndUpdate(project._id, {
            runResults: {
              ...project.runResults,
              [building._id]: projectSimulationRequest,
            },
          });
        }
        return projectSimulation;
      })
    );

    res.send(projectSimulations);

    projectSimulations.forEach(async projectSimulation => {
      try {
        const result = await waitForResponseComplete(() => {
          return simulationClient.getMeasure({
            baselineId: projectSimulation.baseline,
            measureId: projectSimulation.measure,
          });
        });
        await ProjectSimulation.update(
          { _id: projectSimulation._id },
          { $set: { result } }
        );
        const project = await Project.findById(projectSimulation.project);
        if (project) {
          console.log("SAVING COMPLETED PROJECT RUN RESULTS", result);
          await Project.findByIdAndUpdate(project._id, {
            runResults: {
              ...project.runResults,
              [building._id]: result,
            },
          });
        }
      } catch (error) {
        console.error(error);
      }
    });
  } catch (error) {
    console.error(error);
    return util.sendError(error, 500, req, res, next);
  }
};

exports.getProjectSimulation = async function (req, res, next) {
  const { buildingId, projectSimulationId } = req.params;

  try {
    if (!mongoose.Types.ObjectId.isValid(buildingId)) {
      return util.sendError("Invalid Building Id", 400, req, res, next);
    }

    if (!mongoose.Types.ObjectId.isValid(projectSimulationId)) {
      return util.sendError(
        "Invalid Project Simulation Id",
        400,
        req,
        res,
        next
      );
    }

    const building = await Building.findById(buildingId);

    if (!building) {
      return util.sendError("Building not found", 404, req, res, next);
    }

    const projectSimulation = await ProjectSimulation.findById(
      projectSimulationId
    );

    if (!projectSimulation) {
      return util.sendError(
        "Project Simulation not found",
        404,
        req,
        res,
        next
      );
    }

    res.send(projectSimulation);
  } catch (error) {
    console.error(error);
    return util.sendError(error, 500, req, res, next);
  }
};

const waitForResponseComplete = (fn, timeout = 10000) => {
  return new Promise(function (resolve, reject) {
    let attempts = 0;
    const maxTimeoutMillis = 1200000; // 10 minutes
    const maxAttempts = maxTimeoutMillis / timeout;
    const poller = new Poller(timeout);

    poller.onPoll(async function () {
      attempts++;
      console.log(`Polling attempts: ${attempts}, maxAttempts: ${maxAttempts}`);
      const response = await fn();
      console.log("response");
      console.log(response);
      if (response.complete) {
        resolve(response);
      } else if (attempts > maxAttempts) {
        reject(
          new Error(
            `Max attempts exceeded. attempts: ${attempts}, maxAttempts: ${maxAttempts}`
          )
        );
      } else {
        poller.poll();
      }
    });

    poller.poll();
  });
};
