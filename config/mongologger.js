"use strict";

var winston = require("winston");
var config = require("./config");
require("winston-mongodb");

/*
 * Get logging configs
 */
function _getLogConfigs() {
  // Set defaults
  var retConfigs = {
    env: process.env.NODE_ENV,
    file: {
      enabled: false
    },
    db: {
      enabled: false,
      name: "library-log",
      collection: "dev_logs"
    }
  };
  if (config.logging.uri) {
    retConfigs.db.uri = config.logging.uri;
  }
  if (config.logging.dbCollection) {
    retConfigs.db.collection = config.logging.dbCollection;
  }
  if (config.logging.fileLevel) {
    retConfigs.file.enabled = true;
    retConfigs.file.level = config.logging.fileLevel;
  }
  if (config.logging.dbLevel) {
    retConfigs.db.enabled = true;
    retConfigs.db.level = config.logging.dbLevel;
  }

  return retConfigs;
}

/**
 * Set logger configs
 */
module.exports = function() {
  var logConfigs = _getLogConfigs();

  // Setup the error logger for both prod and dev
  winston.loggers.add("errorFileLog", {
    file: {
      level: "error",
      filename: "./app/logs/error.log",
      silent: false,
      exitOnError: false,
      handleExceptions: true,
      maxsize: 25000000,
      maxFiles: 50
    }
  });

  // Setup the 404 logger for both prod and dev
  winston.loggers.add("notFoundFileLog", {
    file: {
      level: "info",
      filename: "./app/logs/404.log",
      silent: false,
      exitOnError: false,
      handleExceptions: false,
      maxsize: 25000000,
      maxFiles: 50
    }
  });

  if (logConfigs.env === "test") {
    //winston.remove(winston.transports.Console);
  } else if (logConfigs.env === "production") {
    // Remove console output in prod
    winston.remove(winston.transports.Console);
    // File logger prod config
    if (logConfigs.file.enabled) {
      winston.add(new winston.transports.File({
        level: logConfigs.file.level,
        filename: "./app/logs/log.log",
        silent: false,
        exitOnError: false,
        handleExceptions: true,
        maxsize: 25000000,
        maxFiles: 50
      }));
    }
    // Mongodb logger prod config
    if (logConfigs.db.enabled) {
      winston.add(new winston.transports.MongoDB({
        silent: false,
        level: logConfigs.db.level,
        label: "prod",
        db: logConfigs.db.uri,
        collection: logConfigs.db.collection,
        safe: false,
        exitOnError: false,
        handleExceptions: false
      }));
    }
  } else {
    // Remove the default Console transport and add the custom
    winston.remove(winston.transports.Console);
    winston.add(new winston.transports.Console({
      level: "debug",
      timestamp: false,
      colorize: true,
      label: "Dev Console",
      exitOnError: true
    }));
    // File logger config
    if (logConfigs.file.enabled) {
      // Console and File logger config
      winston.add(new winston.transports.File({
        level: logConfigs.file.level,
        filename: "./app/logs/debug.log",
        exitOnError: false,
        handleExceptions: true
      }));
    }
    // Mongodb logger config
    if (logConfigs.db.enabled) {
      winston.add(new winston.transports.MongoDB({
        silent: false,
        level: logConfigs.db.level,
        label: "debug",
        db: logConfigs.db.uri,
        collection: logConfigs.db.collection,
        safe: false,
        exitOnError: false,
        handleExceptions: false
      }));
    }
  }
};
