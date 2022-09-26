"use strict";

const _ = require("lodash");
const { promisify } = require("util");
const querystring = require("querystring");
const request = require("request");

const util = require("./api.utils");
const config = require("../../../../config/config");

const { runPrescriptiveMeasureEndpoint } = config.analysisApi;

const ANALYSIS_TYPE_MAP = {
  general: "total-energy-estimate",
  heating: "heating-energy-estimate",
  cooling: "cooling-energy-estimate",
  lighting: "lighting-energy-estimate",
  dhw: "dhw-energy-estimate",
  water: "water-estimate"
};
exports.getAnalysisTypeMap = function() {
  return ANALYSIS_TYPE_MAP;
};

const ENDPOINT_TYPE_MAP = {
  general: "energy-benchmark",
  heating: "heating-benchmark",
  cooling: "cooling-benchmark",
  lighting: "lighting-benchmark",
  dhw: "dhw-benchmark",
  water: "water-benchmark"
};

const totalConsumptionArray = [
  21.3,
  36.4,
  14.5,
  9.84,
  12.2,
  20.3,
  19.6,
  17.01,
  10.98
];
const baseloadArray = [
  0.04239543,
  0.01468749,
  0.02567445,
  0.00767495,
  0.00383567
];
const coolingCPArray = [61.47343, 56.47343, 47.09765, 40.54921, 35.64062];
const heatingCPArray = [61.47343, 56.47343, 47.09765, 40.54921, 35.64062];
const coolingSArray = [
  0.0008927178,
  0.0003427178,
  0.0002927178,
  null,
  0.0004527178,
  0.0006727178,
  0.0002746081,
  0.0000895526
];
const heatingSArray = [
  0.0008927178,
  0.0003427178,
  0.0002927178,
  null,
  0.0004527178,
  0.0006727178,
  0.0002746081,
  0.0000895526
];
const randTotalConsumption =
  totalConsumptionArray[
    Math.floor(Math.random() * totalConsumptionArray.length)
  ];
const randBaseload =
  baseloadArray[Math.floor(Math.random() * baseloadArray.length)];
const randCoolingCP =
  coolingCPArray[Math.floor(Math.random() * coolingCPArray.length)];
const randHeatingCP =
  heatingCPArray[Math.floor(Math.random() * heatingCPArray.length)];
const randHeatingS =
  heatingSArray[Math.floor(Math.random() * heatingSArray.length)];
const randCoolingS =
  coolingSArray[Math.floor(Math.random() * coolingSArray.length)];

const MOCK_RESPONSE = {
  createProjectResponse: {
    mocked: true,
    id: 1,
    name: "Mocked Building",
    location: 80219,
    osm: "JbmFXGXfBqwGYSOYstsRkUcWpsFyxyrgnicSmQTTHYKqfjNWHc.osm",
    meter: null,
    created_at: "2017-11-21T17:10:44.144Z",
    updated_at: "2017-11-21T17:10:44.705Z",
    size: 2000,
    orgid: "-Jaxvl8B05fubPQLMPuQ",
    userid: "-K1g-iP9eBvNbpK8rcXY",
    buildingid: "-K1g0IMQCrpOFt3DACuK",
    auditid: "-KUMhS-OZmZzLW0gfEcg"
  },
  startCalibrationResponse: {
    mocked: true,
    id: 1,
    osm: null,
    weather_id: null,
    project_id: 27,
    gas:
      '[{"_id":"5a208d7e4f41ec034340757e","created":"2017-11-30T23:00:14.803Z","totalConsumption":1066,"endDate":"2015-07-28T00:00:00.000Z","startDate":"2015-06-26T00:00:00.000Z"}]',
    electric:
      '[{"totalDemand":333.22,"_id":"5a208d784f41ec0343407564","created":"2017-11-30T23:00:08.626Z","totalConsumption":1326400,"endDate":"2015-07-28T00:00:00.000Z","startDate":"2015-06-26T00:00:00.000Z"}]',
    created_at: "2017-11-30T23:00:20.101Z",
    updated_at: "2017-11-30T23:00:20.130Z",
    weather: "UjcMoVrgUrQzXLKaSrLThpJZuedeMLEmQjeQGncmnqYxzgzeyp",
    fit: null,
    perturbations: null,

    reportUri: "http://model.analysis.com/mock-url-to-report-for-development"
  },
  reportAvailabilityResponse: {
    mocked: true,
    report: {
      result: "data"
    }
  },
  runMeasureResponse: {
    mocked: true,
    result: { data: "value" }
  },
  runPrescriptiveMeasureResponse: {
    mocked: true,
    result: { data: "value" }
  },
  getBenchmarkResponse: {
    mocked: true,
    "total-energy-estimate": -1.0017469766326406
  },
  getFullBenchmarkResponse: {
    mocked: true,
    "water-estimate": 0.5909090909090909,
    "lighting-energy-estimate": 0.21739130434782608,
    "total-energy-estimate": 0.6086956521739131,
    "dhw-energy-estimate": 0.391304347826087,
    "heating-energy-estimate": 0.5217391304347826,
    "cooling-energy-estimate": 0.5652173913043478
  },
  changePointResponse: {
    mocked: true,
    results: [
      {
        percent_heating: 0,
        heat_load: 0,
        average_heat_val: 0,
        bdbid: 999,
        period: 0,
        cooling_change_point: randCoolingCP,
        average_baseload_val: 42174.809774416084,
        sitename: "",
        heating_change_point: randHeatingCP,
        energy_type: "Elec",
        percent_baseload: 0.7957511278191715,
        model_type: "3PC",
        baseload: randBaseload,
        total_consumption: randTotalConsumption,
        cooling_sensitivity: randCoolingS,
        cool_load: 10825.190225583914,
        heating_sensitivity: randHeatingS,
        percent_cooling: 0.20424887218082857,
        fiscal_year: 0,
        average_use: 53000,
        average_cool_val: 10825.190225583914
      }
    ],
    fit: [
      {
        rs: 5.040349181493404,
        ycp: 110.73266181747874,
        period: 0,
        tmax: 80.35390625,
        tmin: 54.8075,
        cv_rmse: 9.634246565841487,
        sitename: "",
        rs_t: 4.993484188889225,
        energy_type: "Elec",
        main_test: "Pass",
        n: 12,
        shape_test: "Pass",
        fiscal_year: 0,
        xcp2: null,
        heat_months: null,
        rmse: 13.95090342537536,
        bdbid: 999,
        prepost: 1,
        nac: 1588.9268730792155,
        model_type: "3PC",
        ls: null,
        t_stat_test: "Pass",
        ls_t: 0,
        cool_months: 7,
        xcp1: 61.4734375,
        r2: 0.7873858629592455,
        data_pop_test: "Pass"
      }
    ],
    data: [
      {
        end_date: "2012-01-01",
        usage: 0.014032258064516127,
        OAT: 30.9078125
      },
      {
        end_date: "2012-02-29",
        usage: 0.016724137931034482,
        OAT: 35.82
      },
      {
        end_date: "2012-03-31",
        usage: 0.014516129032258063,
        OAT: 53.571875000000006
      },
      {
        end_date: "2012-04-30",
        usage: 0.016333333333333335,
        OAT: 54.071774193548386
      },
      {
        end_date: "2012-05-31",
        usage: 0.017580645161290324,
        OAT: 67.81484375
      },
      {
        end_date: "2012-06-30",
        usage: 0.022333333333333334,
        OAT: 75.3258064516129
      },
      {
        end_date: "2012-07-31",
        usage: 0.024516129032258065,
        OAT: 83.4640625
      },
      {
        end_date: "2012-08-31",
        usage: 0.02306451612903226,
        OAT: 75.15546875000001
      },
      {
        end_date: "2012-09-30",
        usage: 0.022666666666666665,
        OAT: 63.46370967741936
      },
      {
        end_date: "2012-10-31",
        usage: 0.017096774193548388,
        OAT: 51.78828125
      },
      {
        end_date: "2012-11-30",
        usage: 0.013666666666666666,
        OAT: 41.23467741935484
      },
      {
        end_date: "2012-12-31",
        usage: 0.014677419354838711,
        OAT: 37.09765625
      }
    ]
  }
};

// Param Name (key) / Location of item in analyis api result (value)
const MAPPERS = {
  createProject: {
    name: "buildingId.buildingName",
    location: "buildingId.location.zip",
    size: "buildingId.floorArea",
    orgid: "firebaseRefs.orgId",
    buildingid: "firebaseRefs.buildingId",
    userid: "firebaseRefs.userId",
    auditid: "firebaseRefs.auditId"
  },
  startCalibration: {
    gas: "gas",
    electric: "electric"
  },
  runMeasure: {
    name: "name",
    data: "data"
  },
  getBenchmark: {
    occupancy: "occupancy",
    size: "size",
    zipcode: "zipcode",
    open24: "open24",
    stories: "stories",
    vintage: "vintage",
    wwr: "wwr"
  },
  getFullBenchmark: {
    occupancy: "occupancy",
    size: "size",
    zipcode: "zipcode",
    open24: "open24",
    stories: "stories",
    vintage: "vintage",
    wwr: "wwr"
  },
  getFullBenchmarkUtil: {
    electric: "electric",
    gas: "gas",
    occupancy: "occupancy",
    open24: "open24",
    size: "size",
    stories: "stories",
    "total-cost": "total-cost",
    vintage: "vintage",
    zipcode: "zipcode",
    wwr: "wwr"
  },
  getWeather: {
    location: "location",
    start_date: "start_date",
    stop_date: "stop_date"
  }
};

const _getQueryStringPerMap = function(obj, mapper) {
  let queryStringParams = {};
  Object.keys(MAPPERS[mapper]).map(function(key) {
    queryStringParams = util.createObjPerPath.call(
      queryStringParams,
      key,
      util.getValueFromObjPerPath.call(obj, MAPPERS[mapper][key])
    );
  });
  return "?" + querystring.stringify(queryStringParams);
};

/**
 * Client used to perform actions against the Analysis/Modeling API
 */
const _httpRequest = function(options, done) {
  if (options.mock && MOCK_RESPONSE[options.mock]) {
    return done(null, MOCK_RESPONSE[options.mock]);
  }

  const opts = {
    method: options.method || "GET",
    headers: options.headers || {},
    uri: options.url || "",
    timeout: 120000,
    json: options && (options.json || options.body)
  };

  console.log("SENDING ANALYSIS API REQUEST");
  console.log(opts.uri);
  request(opts, function(error, response, body) {
    if (error) {
      console.error("error calling analysis api:", error);
      console.error("ANALYSIS API REQUEST Error - request body");
      console.error(JSON.stringify(opts.json));
      return done(error, null);
    }
    if (body && body.error) {
      console.error(
        "error response from calling analysis api:",
        response.body.error
      );
      console.error("ANALYSIS API REQUEST Error - request body");
      console.error(JSON.stringify(opts.json));
      return done(response.body.error, null);
    }
    if ((response.statusCode === 200 || response.statusCode === 201) && body) {
      try {
        return done(null, JSON.parse(JSON.stringify(body)));
      } catch (err) {
        console.error(err);
        return done(null, body);
      }
    }
    console.error("ANALYSIS API REQUEST Error - request body");
    console.error(JSON.stringify(opts.json));
    if (body) {
      console.error("ANALYSIS API REQUEST Error - response body");
      console.error(JSON.stringify(body).substring(0, 200));
    }
    return done("Issues contacting Analysis/Modeling API server.", null);
  });
};

const httpRequestAsync = promisify(_httpRequest);

/**
 * Create project in the Analysis/Modeling API system
 */
exports.createProject = function(analysisObj, done) {
  const opts = {
    method: "POST",
    url:
      config.analysisApi && config.analysisApi.createProjectEndpoint
        ? config.analysisApi.createProjectEndpoint
        : ""
  };

  if (
    process.env.NODE_ENV === "test" ||
    (process.env.NODE_ENV === "development" && config.analysisApi.mockResponse)
  ) {
    opts.mock = "createProjectResponse";
  }

  // Create the query string params object per mapper
  opts.url += _getQueryStringPerMap(analysisObj, "createProject");

  // Perform the request against the api
  _httpRequest(opts, function(err, response) {
    if (err) {
      return done(err, null);
    }

    return done(null, response);
  });
};

/**
 * Run for weather data
 */
exports.getWeather = function(request, done) {
  const opts = {
    method: "POST",
    url:
      config.analysisApi && config.analysisApi.weatherEndpoint
        ? config.analysisApi.weatherEndpoint
        : ""
  };

  // Create the query string params object per mapper
  opts.url += _getQueryStringPerMap(request, "getWeather");
  // Perform the request against the api
  _httpRequest(opts, function(err, response) {
    if (err) {
      return done(err, null);
    }
    return done(null, response);
  });
};

/**
 * Run for change point data
 */
exports.getChangePoint = function(request, done) {
  // console.log(JSON.stringify(request, null, 4));
  const opts = {
    // mock: 'changePointResponse',
    method: "POST",
    body: JSON.stringify(request),
    url:
      config.analysisApi && config.analysisApi.bemaEndpoint
        ? config.analysisApi.bemaEndpoint
        : ""
  };

  // Perform the request against the api
  _httpRequest(opts, function(err, response) {
    console.log("------------BEMA-----------");
    console.log(opts);
    if (err) {
      return done(err, null);
    }

    return done(null, response);
  });
};

/**
 * Run a building benchmark
 */
exports.getBenchmark = function(building, type, done) {
  const opts = {
    method: "GET",
    url:
      config.analysisApi && config.analysisApi.energyBenchmarkEndpoint
        ? config.analysisApi.energyBenchmarkEndpoint
        : ""
  };

  if (
    process.env.NODE_ENV === "test" ||
    (process.env.NODE_ENV === "development" && config.analysisApi.mockResponse)
  ) {
    opts.mock = "getBenchmarkResponse";
  }

  opts.url += ENDPOINT_TYPE_MAP[type || "general"];

  // Create the query string params object per mapper
  opts.url += _getQueryStringPerMap(building, "getBenchmark");
  // Perform the request against the api
  _httpRequest(opts, function(err, response) {
    if (err) {
      return done(err, null);
    }

    return done(null, response);
  });
};

/**
 * Run a full building benchmark (get all scores)
 */
exports.getFullBenchmark = function(building, done) {
  const opts = {
    method: "GET",
    url:
      config.analysisApi && config.analysisApi.energyBenchmarkEndpoint
        ? config.analysisApi.energyBenchmarkEndpoint
        : ""
  };

  if (
    process.env.NODE_ENV === "test" ||
    (process.env.NODE_ENV === "development" && config.analysisApi.mockResponse)
  ) {
    opts.mock = "getFullBenchmarkResponse";
  }

  opts.url += "end-use";

  // Create the query string params object per mapper
  opts.url += _getQueryStringPerMap(building, "getFullBenchmark");

  // Perform the request against the api
  _httpRequest(opts, function(err, response) {
    if (err) {
      return done(err, null);
    }

    return done(null, response);
  });
};

/**
 * Run a full building benchmark with util data (get all scores)
 */
exports.getFullBenchmarkUtil = function(building, done) {
  const opts = {
    method: "GET",
    url:
      config.analysisApi && config.analysisApi.energyBenchmarkEndpoint
        ? config.analysisApi.energyBenchmarkEndpoint
        : ""
  };

  // opts.url += "simple-cbecs";
  opts.url += "benchmark-eui";

  // Create the query string params object per mapper
  opts.url += _getQueryStringPerMap(building, "getFullBenchmarkUtil");

  // Perform the request against the api
  _httpRequest(opts, function(err, response) {
    if (err) {
      return done(err, null);
    }

    return done(null, response);
  });
};

/**
 * Run a full building benchmark (get all scores)
 */
exports.getEndUse = function(building, done) {
  //todo changing end-use-breakdown to simple-cbecs
  const opts = {
    method: "GET",
    url:
      config.analysisApi && config.analysisApi.endUseEndpoint
        ? config.analysisApi.endUseEndpoint
        : ""
  };

  // Create the query string params object per mapper
  opts.url += _getQueryStringPerMap(building, "getFullBenchmark");
  console.log("getEndUse");
  console.log(opts);

  // Perform the request against the api
  _httpRequest(opts, function(err, response) {
    if (err) {
      console.error(err);
      return done(err, null);
    }
    return done(null, response);
  });
};

exports.getEndUseUtil = function(request, params, done) {
  const opts = {
    method: "POST",
    body: request,
    url:
      config.analysisApi && config.analysisApi.endUseUtilEndpoint
        ? config.analysisApi.endUseUtilEndpoint
        : ""
  };
  console.log(JSON.stringify(request));
  // Create the query string params object per mapper
  opts.url += _getQueryStringPerMap(params, "getFullBenchmarkUtil");
  console.log(JSON.stringify(opts));

  // Perform the request against the api
  _httpRequest(opts, function(err, response) {
    if (err) {
      return done(err, null);
    }
    return done(null, response);
  });
};

exports.getEubResult = function(request, done) {
  const opts = {
    method: "POST",
    body: request,
    url:
      config.analysisApi && config.analysisApi.endUseActualUtilEndpoint
        ? config.analysisApi.endUseActualUtilEndpoint
        : ""
  };

  // Create the query string params object per mapper
  // opts.url += _getQueryStringPerMap(request, "getFullBenchmarkUtil");

  // Perform the request against the api
  _httpRequest(opts, function(err, response) {
    if (err) {
      console.error(err);
      return done(err, null);
    }
    return done(null, response);
  });
};

exports.getEndUseActualUtilV2 = function({
  electric,
  gas,
  squareFeet,
  zipCode,
  equipment,
  rates,
  projects
}) {
  const request = {
    utilityData: [{ electric }, { gas }],
    sqFoot: squareFeet,
    zipcode: zipCode,
    equipment,
    rates,
    projects
  };
  const opts = {
    method: "POST",
    body: request,
    json: true,
    url:
      config.analysisApi && config.analysisApi.endUseActualUtilEndpoint
        ? config.analysisApi.endUseActualUtilEndpoint
        : ""
  };

  console.log("getEndUseActualUtilV2");
  console.log(request);
  console.log("getEndUseActualUtilV2.request.utilityData");
  console.log(JSON.stringify(request.utilityData));
  return httpRequestAsync(opts);
};

exports.getProjects = function(done) {
  const opts = {
    method: "GET",
    url:
      config.analysisApi && config.analysisApi.prescriptiveEndpoint
        ? config.analysisApi.prescriptiveEndpoint
        : ""
  };

  // Perform the request against the api
  _httpRequest(opts, function(err, response) {
    if (err) {
      return done(err, null);
    }

    return done(null, response);
  });
};

/**
 * Start the time-based calibration process in the Analysis/Modeling API system
 */
exports.startCalibration = function(analysisObj, done) {
  const opts = {
    method: "POST",
    url:
      config.analysisApi && config.analysisApi.startCalibrationEndpoint
        ? config.analysisApi.startCalibrationEndpoint
        : ""
  };

  if (
    process.env.NODE_ENV === "test" ||
    (process.env.NODE_ENV === "development" && config.analysisApi.mockResponse)
  ) {
    opts.mock = "startCalibrationResponse";
  }

  // Replace the project id in the path (:PROJECT_ID)
  const projectId = util.getValueFromObjPerPath.call(
    analysisObj,
    "meta.project.id"
  );
  if (!projectId) {
    return done("Issues locating project ID for calibration.", null);
  }
  opts.url = opts.url.replace(":PROJECT_ID", projectId);

  // Ensure there is utility data
  if (
    !analysisObj.utilityIds ||
    (analysisObj.utilityIds && !analysisObj.utilityIds.length)
  ) {
    return done("Utility data not found for calibration.", null);
  }

  const runQueryParam = false;
  const tmpParamObj = {};

  if (runQueryParam) {
    analysisObj.utilityIds.map(function(util) {
      if (!tmpParamObj[util.utilType]) tmpParamObj[util.utilType] = [];
      tmpParamObj[util.utilType].push(JSON.stringify(util.meterData));
    });

    // Create the query string params object per mapper
    opts.url += _getQueryStringPerMap(tmpParamObj, "startCalibration");
  } else {
    analysisObj.utilityIds.map(function(util) {
      if (!tmpParamObj[util.utilType]) tmpParamObj[util.utilType] = [];
      tmpParamObj[util.utilType].push(util.meterData);
    });
    opts.body = tmpParamObj;
  }

  // Perform the request against the api
  _httpRequest(opts, function(err, response) {
    if (err) {
      return done(err, null);
    }

    return done(null, response);
  });
};

/**
 * Check to see if the time-based calibration and report generation has finished in the Analysis/Modeling API system
 */
exports.checkReportUri = function(options, done) {
  const opts = {
    method: "POST",
    url:
      config.analysisApi && config.analysisApi.reportAvailabilityEndpoint
        ? config.analysisApi.reportAvailabilityEndpoint
        : "",
    body: options.body || {}
  };

  // if (process.env.NODE_ENV === 'test' || (process.env.NODE_ENV === 'development' && config.analysisApi.mockResponse)) {
  opts.mock = "reportAvailabilityResponse";
  // }

  // Perform the request against the api
  _httpRequest(opts, function(err, response) {
    if (err) {
      return done(err, null);
    }

    return done(null, response);
  });
};

/**
 * Run a measure against a project in the Analysis/Modeling API system
 */
exports.runMeasure = function(analysisObj, measure, done) {
  const opts = {
    method: "POST",
    url:
      config.analysisApi && config.analysisApi.runMeasureEndpoint
        ? config.analysisApi.runMeasureEndpoint
        : ""
  };

  if (
    process.env.NODE_ENV === "test" ||
    (process.env.NODE_ENV === "development" && config.analysisApi.mockResponse)
  ) {
    opts.mock = "runMeasureResponse";
  }

  // Replace the project id/calibration id in the path (:PROJECT_ID / :CALIBRATION_ID)
  const projectId = util.getValueFromObjPerPath.call(
    analysisObj,
    "meta.project.id"
  );
  const calibrationId = util.getValueFromObjPerPath.call(
    analysisObj,
    "meta.calibration.id"
  );
  if (!projectId) {
    return done("Issues locating project ID to apply measure.", null);
  }
  if (!calibrationId) {
    return done("Issues locating calibration ID to apply measure.", null);
  }

  opts.url = opts.url.replace(":PROJECT_ID", projectId);
  opts.url = opts.url.replace(":CALIBRATION_ID", calibrationId);

  const runQueryParam = false;

  if (runQueryParam) {
    // Create the query string params
    opts.url += "?" + querystring.stringify({ name: measure.name });
    opts.url += "&" + querystring.stringify(measure.data);
  } else {
    opts.body = measure;
  }

  // Perform the request against the api
  _httpRequest(opts, function(err, response) {
    if (err) {
      return done(err, null);
    }

    return done(null, response);
  });
};

/**
 * Run a prescriptive measure against a project in the Analysis/Modeling API system
 */
const runPrescriptiveMeasure = function(measure, done) {
  const opts = {
    method: "POST",
    url: runPrescriptiveMeasureEndpoint
  };

  if (
    process.env.NODE_ENV === "test" ||
    (process.env.NODE_ENV === "development" && config.analysisApi.mockResponse)
  ) {
    opts.mock = "runPrescriptiveMeasureResponse";
  }

  const request = {
    measure: { name: "none" },
    incentive: { incentiveType: "none" },
    finance: {}
  };
  // Append the data provided to the request
  if (measure) {
    if (measure.measure) request.measure = measure.measure;
    if (measure.incentive) request.incentive = measure.incentive;
    if (measure.finance) request.finance = measure.finance;
    if (measure.utility) request.utility = measure.utility;
    if (measure.name) request.measure.name = measure.name;
  }

  delete request.measure.new_location;

  opts.body = request;

  //! Temp including data within the headers
  opts.headers = { inputs: JSON.stringify(request) };

  // Perform the request against the api
  console.log(opts);
  console.log(opts, JSON.stringify(opts));
  _httpRequest(opts, function(err, response) {
    if (err) {
      return done(err, null);
    }

    return done(null, response);
  });
};

/**
 * Run a prescriptive measure against a project in the Analysis/Modeling API system
 */
const runPrescriptiveMeasureV2 = function({
  project = {},
  building,
  parameters = {}
}) {
  const utility = _.pick(building.rate, [
    "electric",
    "gas",
    "steam",
    "water",
    "fuelOil2",
    "fuelOil4",
    "fuelOil56",
    "diesel",
    "other"
  ]);
  const incentive = {
    input: 0,
    incentive_type: "none",
    ..._.omit(project.incentive, [
      "design_requirements",
      "existing_requirements"
    ])
  };

  const finance = {
    discount_rate: building.rates.discountRate,
    finance_rate: building.rates.financeRate,
    inflation_rate: building.rates.inflationRate,
    reinvestment_rate: building.rates.reinvestmentRate,
    investment_period: building.rates.investmentPeriod,
    project_cost: parseFloat(parameters.project_cost) || 0,
    maintenance_savings: parseFloat(parameters.maintenance_savings) || 0
  };

  // remove the fields that may contain special characters
  // so the analysis API doesn't choke on these
  const measure = _.omit({ name: project.name, ...parameters }, [
    "description",
    "displayName",
    "new_location"
  ]);

  const opts = {
    method: "POST",
    url: runPrescriptiveMeasureEndpoint,
    body: {
      measure,
      incentive,
      finance,
      utility
    }
  };

  // Perform the request against the api
  //! Temp including data within the headers
  opts.headers = { inputs: JSON.stringify(opts.body) };
  return httpRequestAsync(opts);
};

const getCashFlow = async (requestBody, done) => {
  const opts = {
    method: "GET",
    url: process.env.ANALYSIS_API_IP + ":3000/cashflow",
    headers: {
      inputs: JSON.stringify(requestBody)
    },
    body: request
  };
  _httpRequest(opts, function(err, response) {
    if (err) {
      return done(err, null);
    }

    return done(null, response);
  });
};

exports.runPrescriptiveMeasure = runPrescriptiveMeasure;
exports.runPrescriptiveMeasureV2 = runPrescriptiveMeasureV2;
exports.getCashFlow = getCashFlow;
