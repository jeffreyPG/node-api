"use strict";

const _ = require("lodash");
const fs = require("fs");
const path = require("path");
const config = require("../../config/config");
const errorHandler = require("./errors.server.controller");
const mongoose = require("mongoose");
let Log = mongoose.model("Log");

const testTemplateDir = path.join(__dirname, "..", "views");
const logDir = path.join(__dirname, "..", "logs");

// Setup new db connection if running in development mode
const db = (process.env.NODE_ENV === "development")
  ? mongoose.createConnection(config.logging.uri) : null;
Log = (db) ? db.model("Log", Log.Schema) : null;

exports.index = function (req, res) {
  const viewVars = {};
  if (process.env.NODE_ENV === "development" && Log) {
    Log.find().sort({ $natural: -1 }).limit(100).lean(true).exec(function (err, logs) {
      if (err) {
        return res.status(400).send({
          message: errorHandler.getErrorMessage(err),
        });
      }
      viewVars.logs = logs;
      res.render("index", viewVars);
    });
  } else {
    res.render("index", viewVars);
  }
};

exports.notFound = function (req, res) {
  const viewVars = {};
  // If 404 logging is on, grab contents of log for the view
  if (process.env.NODE_ENV === "development" && config.logging.enable404Log) {
    fs.readFile(logDir + "/404.log", "utf8", function (err, notFound) {
      if (!err) {
        // Put contents of file into array
        const tmp = notFound.split("\n");
        // Remove last element if it is empty
        if (!tmp[tmp.length - 1]) tmp.pop();
        // Reverse order of the elements in the array
        viewVars.notFound = _(tmp.map(JSON.parse)).reverse().value();
      }
      res.render("404-summary", viewVars);
    });
  } else {
    res.status(404).jsonp({
      status: "404",
      error: "Not Found",
    });
  }
};

exports.testSummary = function (req, res) {
  fs.stat(testTemplateDir + "/test-summary.server.view.html", function (err, file) {
    if (process.env.NODE_ENV === "development" && !err) {
      res.render("test-summary", { file: file });
    } else {
      res.status(404).jsonp({
        status: "404",
        error: "Not Found",
      });
    }
  });
};
