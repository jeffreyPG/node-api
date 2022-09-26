"use strict";

module.exports = {
  db: {
    uri: "mongodb://mongo-middleware/library-test",
    options: {}
    // If mongoose >= 4.11.0 or the uri provided above is formatted for the new version
    // http://mongoosejs.com/docs/connections.html#use-mongo-client
    // The formatter will format the uri to use this new version
    // skipFormatter: true
  },
  energyAuditor: {
    cdnUri: "https://test.simuwatt.com/energy-auditor/cdn/uploads/"
  },
  firebase: {
    disable: true,
    debug: false,
    parentPath: "organizations",
    uri: "https://test.firebaseio.com"
  },
  analysisApi: {
    createProjectEndpoint: process.env.ANALYSIS_API_IP + ":3000/projects",
    startCalibrationEndpoint:
      process.env.ANALYSIS_API_IP + ":3000/projects/:PROJECT_ID/calibrations",
    reportAvailabilityEndpoint: "http://analysis-api.com/report",
    runMeasureEndpoint:
      process.env.ANALYSIS_API_IP +
      ":3000/projects/:PROJECT_ID/calibrations/:CALIBRATION_ID/measures",
    runPrescriptiveMeasureEndpoint:
      process.env.ANALYSIS_API_IP + ":3000/prescriptive",
    weatherEndpoint: process.env.ANALYSIS_API_IP + ":3000/weathers",
    energyBenchmarkEndpoint: process.env.ANALYSIS_API_IP + "/",
    endUseEndpoint: process.env.ANALYSIS_API_IP + "/end-use-breakdown",
    endUseUtilEndpoint: process.env.ANALYSIS_API_IP + "/end-use-eui",
    prescriptiveEndpoint: process.env.ANALYSIS_API_IP + ":3000/prescriptive",
    bemaEndpoint: process.env.ANALYSIS_API_IP + "/bema/"
  },
  reportsAPI: {
    reportEndpoint: process.env.REPORTS_API_IP
  },
  pandocService: {
    uri: "http://pandoc-micro-test"
  },
  portfolioManager: {
    uri: "https://portfoliomanager.energystar.gov/wstest"
  },
  aws: {
    // Access Key and Secret set in .env
    bucket: "bucket-test",
    region: "us-west-2"
  },
  s3Disable: {
    upload: true,
    delete: true
  },
  port: 2999,
  log: {
    // Can specify one of 'combined', 'common', 'dev', 'short', 'tiny'
    format: "tiny",
    // Stream defaults to process.stdout
    // Uncomment to enable logging to a log on the file system
    options: {
      //skip: true
      //stream: 'access.log'
    }
  },
  logging: {
    uri: "mongodb://mongo-middleware/library-test-log",
    dbCollection: "test_dev_logs",
    fileLevel: "debug",
    dbLevel: "debug",
    skipConsole: true
  },
  app: {
    title: "Simuwatt Library - Test Environment"
  },
  mailer: {
    from: process.env.MAILER_FROM || "MAILER_FROM",
    options: {
      service: process.env.MAILER_SERVICE_PROVIDER || "MAILER_SERVICE_PROVIDER",
      auth: {
        user: process.env.MAILER_EMAIL_ID || "MAILER_EMAIL_ID",
        pass: process.env.MAILER_PASSWORD || "MAILER_PASSWORD"
      }
    }
  }
};
