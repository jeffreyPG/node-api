"use strict";
const mongoose = require("mongoose");
const cluster = require("cluster");
const { constructServer } = require("../../../config/graphql");
const config = require("../../../config/config");
const { express } = require("../../../server");

const constructTestServer = async ({ context }) => {
  const database = mongoose.connect(config.db.uri, config.db.options, function (
    err
  ) {
    if (err) {
      console.error("Could not connect to MongoDB!");
      console.log(err);
    }
  });
  mongoose.connection.on("error", function (err) {
    console.error("MongoDB connection error: " + err);
    process.exit(-1);
  });

  const app = await express();

  return constructServer({ context }).then(server => {
    return { server, database };
  });
};

module.exports.constructTestServer = constructTestServer;
