"use strict";

var fs = require("fs"),
  path = require("path");

var testDir = path.join(__dirname, "app", "tests");

module.exports = function(grunt) {
  // Unified Watch Object
  var watchFiles = {
    serverViews: ["app/views/**/*.*"],
    serverJS: [
      "gruntfile.js",
      "server.js",
      "config/**/*.js",
      "app/controllers/*.js",
      "app/controllers/**/*.js",
      "app/models/*.js",
      "app/models/**/*.js",
      "app/types/**/*.js",
      "app/types/**/*.gql",
      "app/routes/*.js",
      "app/firebase/*.js"
    ],
    clientViews: ["public/modules/**/views/**/*.html"],
    clientJS: ["public/js/*.js", "public/modules/**/*.js"],
    clientCSS: ["public/modules/**/*.css"],
    mochaTests: [
      "app/tests/unit/*.js",
      "app/tests/model/*.js",
      "app/tests/api/*.js"
    ]
  };

  // Project Configuration
  grunt.initConfig({
    pkg: grunt.file.readJSON("package.json"),
    watch: {
      serverJS: {
        files: watchFiles.serverJS,
        tasks: [],
        options: {
          // livereload: true
        }
      },
      mochaTests: {
        files: watchFiles.mochaTests,
        tasks: ["test:server"]
      }
    },
    nodemon: {
      nodebug: {
        script: "server.js",
        options: {
          ext: "js,html,gql",
          watch: watchFiles.serverViews.concat(watchFiles.serverJS)
        }
      },
      debug: {
        script: "server.js",
        options: {
          nodeArgs: ["--debug-brk"],
          ext: "js,html,gql",
          watch: watchFiles.serverViews.concat(watchFiles.serverJS)
        }
      }
    },
    concurrent: {
      default: ["nodemon:nodebug", "watch"],
      debug: ["nodemon:debug", "watch"],
      options: {
        logConcurrentOutput: true,
        limit: 10
      }
    },
    env: {
      test: {
        NODE_ENV: "test"
      },
      secure: {
        NODE_ENV: "secure"
      }
    },
    mochaTest: {
      test: {
        src: watchFiles.mochaTests,
        options: {
          require: ["blanket.js", "server.js"],
          quiet: true
        }
      },
      summary: {
        src: watchFiles.mochaTests,
        options: {
          require: ["server.js"],
          reporter: testDir + "/mocha.reporter.summary.js",
          captureFile: "app/views/test-summary.server.view.html"
        }
      },
      console: {
        src: watchFiles.mochaTests,
        options: {
          require: ["server.js"],
          reporter: "spec"
        }
      },
      coverage: {
        src: watchFiles.serverJS,
        options: {
          reporter: "html-cov",
          quiet: true,
          captureFile: "app/views/test-coverage.server.view.html"
        }
      }
    },
    karma: {
      unit: {
        configFile: "karma.conf.js"
      }
    },
    copy: {
      localConfig: {
        src: "config/env/local.example.js",
        dest: "config/env/local.js",
        filter: function() {
          return !fs.existsSync("config/env/local.js");
        }
      }
    }
  });

  // Load NPM tasks
  require("load-grunt-tasks")(grunt);

  // Making grunt default to force in order not to break the project.
  grunt.option("force", true);

  // A Task for loading the configuration object
  grunt.task.registerTask(
    "loadConfig",
    "Task that loads the config into a grunt option.",
    function() {
      var init = require("./config/init")();
      var config = require("./config/config");

      grunt.config.set("applicationJavaScriptFiles", config.assets.js);
      grunt.config.set("applicationCSSFiles", config.assets.css);
    }
  );

  // Default task(s).
  grunt.registerTask("default", [
    "lint",
    "copy:localConfig",
    "concurrent:default"
  ]);

  // Debug task.
  grunt.registerTask("debug", ["lint", "copy:localConfig", "concurrent:debug"]);

  // Secure task(s).
  grunt.registerTask("secure", [
    "env:secure",
    "lint",
    "copy:localConfig",
    "concurrent:default"
  ]);

  // Lint task(s).
  grunt.registerTask("lint", []);

  // Build task(s).
  grunt.registerTask("build", ["lint", "loadConfig", "uglify"]);

  // Test task.
  grunt.registerTask("test", ["env:test", "copy:localConfig", "test:console"]);
  grunt.registerTask("test:summary", ["env:test", "mochaTest:summary"]);
  grunt.registerTask("test:console", ["env:test", "mochaTest:console"]);
  grunt.registerTask("test:coverage", [
    "env:test",
    "mochaTest:test",
    "mochaTest:coverage"
  ]);
};
