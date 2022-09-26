"use strict";

module.exports = {
  app: {
    title: "Simuwatt Library",
    description: "Simuwatt Library",
    keywords: "library"
  },
  port: process.env.PORT || 3001,
  cors: {
    baseUrl: process.env.HOST,
    origin: [
      "*.simuwatt.com",
      "*.buildee.com",
      process.env.HOST,
      "http://localhost:3000"
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization", "x_date", "xkey"],
    exposedHeaders: ["X-Total-Count"]
  },
  bcl: {
    strictSsl: false,
    bclEndpoint: "https://bcl.nrel.gov/api/",
    endpoint: "https://library.simuwatt.com/api/",
    timeoutSeconds: 3
  },
  library: {
    strictSsl: false,
    endpoint: "simuwattgydaa6krmf.devcloud.acquia-sites.com",
    timeoutSeconds: 3,

    user: "usertwo",
    pass: "User2!",

    resetSessionAfterMins: 1,
    resetSessionAfterDays: 2
  },
  uploadCsv: {
    writeFile: true
  },
  templateEngine: "swig",
  // The secret should be set to a non-guessable string that
  // is used to compute a session hash
  sessionSecret: "MEAN",
  // The name of the MongoDB collection to store sessions in
  sessionCollection: "sessions",
  forgotPassword: {
    units: 24,
    measure: "Hours"
  },
  // JSON web token settings
  hmac: {
    secret: "542df203793e646149d3c6998beae42",
    loginHours: 12,
    requestDevianceMinutes: 10 // this is how long between the date header and server time a request is valid
  },
  aws: {
    accessKeyId: "",
    secretAccessKey: "",
    bucket: "",
    region: ""
  },
  googleMap: {
    uri: "https://maps.googleapis.com/maps/api/staticmap",
    apiKey: process.env.GOOGLE_MAPS_API_KEY || ""
  },
  smtp: {
    host: "email-smtp.us-west-2.amazonaws.com",
    region: "us-west-2",
    port: 465,
    secure: true,
    from: "buildee Support<support@buildee.com>",
    auth: {
      user: "",
      pass: ""
    }
  },
  log: {
    // Can specify one of 'combined', 'common', 'dev', 'short', 'tiny'
    format: "combined",
    // Stream defaults to process.stdout
    // Uncomment to enable logging to a log on the file system
    options: {
      stream: "access.log"
    }
  },
  assets: {
    lib: {},
    css: [],
    js: [],
    tests: []
  },
  analysisApi: {}
};
