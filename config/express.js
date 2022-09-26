"use strict";

/**
 * Module dependencies.
 */
var fs = require("fs"),
  http = require("http"),
  https = require("https"),
  express = require("express"),
  cors = require("cors"),
  morgan = require("morgan"),
  logger = require("./logger"),
  bodyParser = require("body-parser"),
  methodOverride = require("method-override"),
  helmet = require("helmet"),
  passport = require("passport"),
  config = require("./config"),
  consolidate = require("consolidate"),
  mongoLogger = require("./mongologger"),
  path = require("path"),
  compression = require('compression'),
  mongoSanitize = require('express-mongo-sanitize');
const graphql = require("./graphql");
const swaggerUi = require("swagger-ui-express");
const swaggerDocument = require("./swagger.json");
const features = require("./features/index.json");

var userAgentRegex = new RegExp("^((?!uniqueMobileUserAgent).)*$", "i");

module.exports = async function() {
  // Initialize express app
  var app = express();

  // Globbing model files
  config.getGlobbedFiles("./app/models/**/*.js").forEach(function(modelPath) {
    require(path.resolve(modelPath));
  });

  // Setting application local variables
  app.locals.title = config.app.title;
  app.locals.description = config.app.description;
  app.locals.keywords = config.app.keywords;

  app.locals.appRoot = path.join(__dirname, "..");
  app.locals.appReportsViewsPath = path.resolve("app/views/report");

  app.locals.prefix = process.env.ROUTE_PREFIX || "";

  // Passing the request url to environment locals
  app.use(function(req, res, next) {
    if (req.url.indexOf(process.env.ROUTE_PREFIX) !== 0) {
      req.url = req.url.replace(process.env.ROUTE_PREFIX, "");
    }
    res.locals.url = req.protocol + "://" + req.headers.host + req.url;
    req.isWeb = userAgentRegex.test(req.headers["user-agent"]);
    next();
  });

  // Add headers
  app.use(cors(config.cors));

  // Showing stack errors
  app.set("showStackError", true);

  // Set swig as the template engine
  app.engine("server.view.html", consolidate[config.templateEngine]);

  // Set views path and view engine
  app.set("view engine", "server.view.html");
  app.set("views", "./app/views");

  // Enable the winston mongo-logger
  mongoLogger();

  // Enable logger (morgan)
  app.use(morgan(logger.getLogFormat(), logger.getLogOptions()));

  // Enable Mongo Sanatise
  app.use(mongoSanitize());

  // compress all responses
  app.use(compression());

  // Environment dependent middleware
  if (process.env.NODE_ENV === "development") {
    // Disable views cache
    app.set("view cache", false);
  } else if (process.env.NODE_ENV === "production") {
    app.locals.cache = "memory";
    app.set("trust proxy", true);
  }

  // Request body parsing middleware should be above methodOverride
  app.use(
    bodyParser.urlencoded({
      extended: true
    })
  );
  app.use(bodyParser.json({ limit: "50mb" }));
  app.use(bodyParser.text());
  app.use(methodOverride());

  // Use helmet to secure Express headers
  app.use(helmet());

  // Add swagger api documentation
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

  //GraphQL
  app.use('/graphql', passport.authenticate('jwt', { session: false }));

  // Set the public static directory
  app.use(express.static(path.resolve("./public")));

  // Set any generated tests to be static
  var coveragePath = path.join(
    app.locals.appRoot,
    "/app/tests/output/coverage"
  );
  if (process.env.NODE_ENV === "development" && fs.existsSync(coveragePath)) {
    app.use("/test-coverage", express.static(coveragePath));
  }

  // Globbing routing files
  config.getGlobbedFiles("./app/routes/**/*.js").forEach(function(routePath) {
    require(path.resolve(routePath))(app);
  });

  if (features.graphql === true) {
    await graphql.server({ app });
  }

  // Assume 'not found' in the error msgs is a 404
  app.use(function(err, req, res, next) {
    // Skip if no error
    if (!err) return next();
    // Log to console if dev mode
    if (process.env.NODE_ENV === "development") {
      console.error(err.stack);
    }
    // Error page
    return res.status(500).jsonp({
      status: "500",
      error: "Server Error"
    });
  });

  // Assume 404 since no middleware responded
  app.use(function(req, res) {
    // Log the 404 to file if enabled
    if (config.logging && config.logging.enable404Log) {
      var notFoundFileLog = require("winston").loggers.get("notFoundFileLog");
      notFoundFileLog.log("info", {
        reqPath: req.originalUrl || req.url,
        reqIp: req.ip || req._remoteAddress || req.connection,
        reqIps: req.ips
      });
    }
    // Respond with 404 to client
    return res.status(404).jsonp({
      status: "404",
      error: "Not Found"
    });
  });

  if (process.env.NODE_ENV === "secure") {
    // Load SSL key and certificate
    var privateKey = fs.readFileSync("./config/sslcerts/key.pem", "utf8");
    var certificate = fs.readFileSync("./config/sslcerts/cert.pem", "utf8");

    // Create HTTPS Server
    var httpsServer = https.createServer(
      {
        key: privateKey,
        cert: certificate
      },
      app
    );

    // Return HTTPS server instance
    return httpsServer;
  }

  // Return Express server instance
  return app;
};
