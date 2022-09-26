"use strict";

const request = require("request-promise");

const baseUrl = process.env.MODELING_API_URL;

const createModel = ({ parameters }) => {
  return request.post({
    baseUrl,
    uri: "/baseline",
    body: parameters,
    json: true,
  });
};

const createMeasure = ({ baselineId, name }) => {
  return request.post({
    baseUrl,
    uri: `/baseline/${baselineId}/measure`,
    body: { name },
    json: true,
  });
};

const getMeasure = ({ baselineId, body, measureId }) => {
  return request.get({
    baseUrl,
    uri: `/baseline/${baselineId}/measure/${measureId}`,
    body,
    json: true,
  });
};

const createSimulation = async ({ projects, parameters }) => {
  console.log("CREATE SIMULATION");
  console.log("parameters", parameters);
  console.log("projects", projects);
  const baseline = await createModel({ parameters });
  const measures = await Promise.all(
    projects.map(async project => {
      const measure = await createMeasure({
        baselineId: baseline._id,
        name: project.name,
      });
      return { ...measure, projectId: project._id };
    })
  );
  return { baseline, measures };
};

const runSimulation = async ({ project, building, parameters }) => {
  const baseline = await createModel({ parameters });
  const measure = await createMeasure({
    baselineId: baseline._id,
    name: project.name,
  });
  return { ...measure, baseline, projectId: project._id };
};

module.exports = {
  createSimulation,
  getMeasure,
  runSimulation,
};
