"use strict";
/**
 * Module dependencies.
 */
var cluster = require("cluster"),
  init = require("./config/init")(),
  config = require("./config/config"),
  mongoose = require("mongoose"),
  monthlyUtilities = require("./app/monthlyutilities"),
  weather = require("./app/weather"),
  utilities = require("./app/utilities"),
  newrelic = require('newrelic');
const express = require("./config/express");
const nodeCache = require("node-cache");

// Setup the db connection object
var database = (function(dbConfig) {
  if (dbConfig.skipFormatter) return dbConfig;

  var ret = {
    uri: dbConfig.uri || "",
    options: dbConfig.options || {}
  };

  // If there is an auth present, then parse and format the uri string
  if (dbConfig.auth && dbConfig.auth.user && dbConfig.auth.pass) {
    if (dbConfig.uri.startsWith("mongodb://")) {
      ret.uri = [
        "mongodb://",
        encodeURIComponent(dbConfig.auth.user),
        ":",
        encodeURIComponent(dbConfig.auth.pass),
        "@",
        dbConfig.uri.substring(10),
        "?authMechanism=",
        dbConfig.auth.authMechanism || "DEFAULT"
      ].join("");
    }
  }

  return ret;
})(config.db);

// (async function startServer() {
//   console.log('Postgres: Connection established...');
// })();

var _logAppDetails = function() {
  var now = new Date();

  var _formatDate = function() {
    return (
      String(now.getMonth() + 1) +
      "/" +
      String(now.getDate()) +
      "/" +
      String(now.getFullYear())
    );
  };
  var _formatTime = function() {
    return (
      String(now.getHours()) +
      ":" +
      String(now.getMinutes()) +
      ":" +
      String(now.getSeconds())
    );
  };
  var _colorize = function(string) {
    return "\x1B[32m" + string + "\x1b[0m";
  };

  console.log("\n\r");
  console.log("--------------------------------");
  console.log(_colorize(config.app.title));
  console.log("--------------------------------");
  console.log(_colorize("Node:\t\t" + process.version));
  console.log(
    _colorize(
      "Mem Total:\t\t" +
        (process.memoryUsage().heapTotal / 1000000).toFixed(2) +
        " MB"
    )
  );
  console.log(
    _colorize(
      "Mem Used:\t\t" +
        (process.memoryUsage().heapUsed / 1000000).toFixed(2) +
        " MB"
    )
  );
  console.log(_colorize("PID:\t\t" + process.pid));
  console.log(_colorize("CWD:\t\t" + process.cwd()));
  console.log("\t\t--");
  console.log(_colorize("Environment:\t\t" + process.env.NODE_ENV));
  console.log(_colorize("Port:\t\t\t" + config.port));
  console.log(_colorize("Database:\t\t\t" + config.db.uri));
  if (process.env.NODE_ENV === "secure") {
    console.log(_colorize("HTTPs:\t\t\t\ton"));
  }
  console.log("\t\t--");
  console.log(_colorize("Date:\t\t\t" + _formatDate()));
  console.log(_colorize("Time:\t\t\t" + _formatTime()));
  console.log("\n\r");

  return;
};

/**
 * Main application entry file.
 * Please note that the order of loading is important.
 */
// Set native promises for mongoose
mongoose.Promise = global.Promise;
mongoose.set("useFindAndModify", false);
// Bootstrap db connection

mongoose.connect(database.uri, database.options, function(err) {
  if (err) {
    console.error("Could not connect to MongoDB!");
    console.log(err);
  } else {
    console.log("MongoDB connection successful");
    utilities.init();
    monthlyUtilities.init();
    weather.init();
  }
});
mongoose.connection.on("error", function(err) {
  console.error("MongoDB connection error: " + err);
  process.exit(-1);
});

module.exports.express = express;

// setup cache
const memCache = new nodeCache();
module.exports.memCache = memCache;

if (process.env.NODE_ENV === "test") {
  return true;
}

express().then(app => {
  require("./config/passport")();
  // Enable multi worker processes to serve the app
  if (cluster.isMaster && process.env.NODE_ENV === "production") {
    // Find the --debug option in the command, and remove
    // Keeping the --debug option for child processes causes node-inspector issues
    var debugArgIdx = process.execArgv.indexOf("--debug");
    if (debugArgIdx !== -1) {
      // Remove --debug from forked processes
      process.execArgv.splice(debugArgIdx, 1);
    }

    var cpu = 4;
    // var cpu = require('os').cpus().length;
    // Create worker processes per cpus on system
    for (var i = 0; i < cpu; i += 1) {
      cluster.fork();
    }

    // If a child process happens to die, replace it
    cluster.on("exit", function(worker) {
      cluster.fork();
    });

    // Logging initialization
    _logAppDetails();
  } else {
    // Start the app by listening on <port>
    let server = app.listen(config.port);

    // increase the timeout to 10 minutes
    server.timeout = 600000;

    // Logging initialization for dev env
    if (process.env.NODE_ENV === "development") {
      _logAppDetails();
    }
  }

  return app;
});
