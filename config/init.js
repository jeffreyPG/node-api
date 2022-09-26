"use strict";

/**
 * Module dependencies.
 */
var glob = require("glob");

/**
 * Module init function.
 */
module.exports = function() {
  // Set the env per passed in arguments
  if (process.argv.length > 2) {
    for (var i = 0; i < process.argv.length; i += 1) {
      if (process.argv[i] === "--env") {
        process.env.NODE_ENV = process.argv[i + 1];
        break;
      }
    }
  }

  /**
   * Before we begin, lets set the environment variable
   * We'll Look for a valid NODE_ENV variable and if one cannot be found load the development NODE_ENV
   */
  var environmentFiles = glob.sync(
    "./config/env/" + process.env.NODE_ENV + ".js",
    {}
  );
  if (!environmentFiles.length) {
    if (process.env.NODE_ENV) {
      console.error(
        'No configuration file found for "' +
          process.env.NODE_ENV +
          '" environment using development instead'
      );
    } else {
      console.error(
        "NODE_ENV is not defined! Using default development environment"
      );
    }

    process.env.NODE_ENV = "development";
  }
};
