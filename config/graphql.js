"use strict";

const { ApolloServer, gql } = require("apollo-server-express");
const { merge } = require("lodash");

const { loadTypeSchema } = require("../utils/schema");

const action = require("../app/types/action/action.resolvers");
const application = require("../app/types/application/application.resolvers");
const building = require("../app/types/building/building.resolvers");
const buildingequipment = require("../app/types/buildingequipment/buildingequipment.resolvers");
const construction = require("../app/types/construction/construction.resolvers");
const equipment = require("../app/types/equipment/equipment.resolvers");
const feature = require("../app/types/feature/feature.resolvers");
const measure = require("../app/types/measure/measure.resolvers");
const project = require("../app/types/project/project.resolvers");
const schedule = require("../app/types/operation/operation.resolvers");
const system = require("../app/types/system/system.resolvers");
const systemType = require("../app/types/systemtype/systemtype.resolvers");
const locations = require("../app/types/location/location.resolvers");

const types = [
  "action",
  "application",
  "building",
  "buildingequipment",
  "construction",
  "equipment",
  "feature",
  "measure",
  "operation",
  "project",
  "system",
  "systemtype",
  "location"
];

const defaultContext = async ({ req }) => {
  if(!req.user) return {isLoggedIn: false}
  return { user: req.user, isLoggedIn: true };
};

const constructServer = async ({ context = defaultContext } = {}) => {
  const rootSchema = `
      schema {
        query: Query
        mutation: Mutation
      }
    `;

  const schemas = await Promise.all(types.map(loadTypeSchema));

  const apolloServer = new ApolloServer({
    typeDefs: [rootSchema].concat(schemas),
    resolvers: merge(
      {},
      action,
      application,
      building,
      buildingequipment,
      construction,
      equipment,
      feature,
      measure,
      project,
      schedule,
      system,
      systemType,
      locations
    ),
    playground: false,
    introspection: false,
    context,
    formatError: error => {
      console.log(error);

      return error;
    },
    formatResponse: response => {
      console.log(response);
      return response;
    }
  });

  return apolloServer;
};

const server = async ({ app }) => {
  const apolloServer = await constructServer();
  apolloServer.applyMiddleware({ app });
};

module.exports.constructServer = constructServer;
module.exports.server = server;
