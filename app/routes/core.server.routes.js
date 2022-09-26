"use strict";

const mongoose = require("mongoose");
const Sequelize = require('sequelize');
const fs = require('fs');

// Define sequelize connection

const sequelize = new Sequelize(
    process.env.POSTGRES_DATABASE,
    process.env.POSTGRES_USER,
    process.env.POSTGRES_PASSWORD,
{
    host: process.env.POSTGRES_HOST,
    dialect: 'postgres'
});

module.exports = function (app) {
  const core = require("../../app/controllers/core.server.controller");
  app.route("/").get(core.index);

  app.route("/404-summary").get(core.notFound);

  app.route("/test-summary").get(core.testSummary);

  app.get("/healthcheck", async function (req, res) {
    res.connection.setTimeout(15000);
    try {
      if (mongoose.connection && mongoose.connection.readyState === 1) {
        await sequelize.authenticate();
        res.send("Server Is Healthy\n");
      } else {
        res.status(500).send("Server Is Not Healthy\n");
      }
    } catch (err){
      res.status(500).send("Server Is Not Healthy\n");
    }
  });
};
