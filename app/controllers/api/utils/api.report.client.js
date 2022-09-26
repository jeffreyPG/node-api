/* eslint-disable no-undef */
"use strict";

const _ = require("lodash");
const http = require("http");
const mongoose = require("mongoose");
const Project = mongoose.model("Project");
const Operation = mongoose.model("Schedule");
const Construction = mongoose.model("Constructions");
const Location = mongoose.model("Location");
const User = mongoose.model("User");
const FormData = require("form-data");
const consolidate = require("consolidate");

const util = require("./api.utils");
const config = require("../../../../config/config");
const reportOptions = require("../../../static/report-options");

const BuildingEquipment = mongoose.model("BuildingEquipment");
const ImageSync = mongoose.model("ImageSync");
const EquipmentCategorization = mongoose.model("EquipmentCategorization");
const EquipmentSchema = mongoose.model("EquipmentSchema");
const ActualEndUse = mongoose.model("ActualEndUse");

const HTMLELEMENTS = [
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "p",
  "header",
  "footer",
  "table",
  "div",
  "ol",
  "ul",
  "img",
  "line"
];
const TARGETSARR = [
  "building",
  "utility",
  "benchmark",
  "analysis",
  "audit",
  "project",
  "measure",
  "user",
  "operation",
  "construction",
  "location",
  "equipment",
  "contact",
  "equipmentBlock",
  "divider",
  "overview",
  "endusebreakdown"
];
const TARGETFIELDSARR = ["table", "div", "ol", "ul"];
const HTMLTYPEMAP = {
  title: "h1",
  text: "p",
  table: "table",
  header: "header",
  footer: "footer",
  div: "div",
  "ordered-list": "ol",
  "unordered-list": "ul",
  "ordered-list-text": "ol",
  "unordered-list-text": "ul",
  address: "img",
  projects: "table",
  measures: "table",
  divider: "line"
};

/* const MOCK_RESPONSE = {
  getReport: '<html><p>Generated Report</p></html>',
  getHtmlReport: '<html><p>Generated HTML Report</p></html>',
}; */

const FILE_EXTENSIONS = {
  docx: "docx",
  html: "html",
  html5: "html",
  markdown: "md",
  markdown_github: "md",
  markdown_mmd: "md",
  markdown_strict: "md"
};

/*
 * Convert a camel string to title case with spaces.
 */
const _formatCamelCaseNotation = function(field) {
  if (typeof field !== "string") return field;
  const tmp = field.replace(/([A-Z]|[0-9])/g, " $1");
  const ret = tmp.charAt(0).toUpperCase() + tmp.slice(1);
  return ret;
};

/*
 * Convert a dot notation and camel string to title case with spaces and hyphens.
 */
const _formatDotCamelCaseNotation = field => {
  const parts = field.split(".");
  return parts
    .map((part, index) => {
      if (index === 0) {
        return _formatCamelCaseNotation(part) + " – ";
      } else {
        return _formatCamelCaseNotation(part) + " ";
      }
    })
    .join("");
};

/*
 * Use SWIG templating engine to return blob of HTML with the passed template and view variables
 */
const _getHtmlBlob = function(opts, done) {
  if (!opts.templateFile) {
    return done("Must specify an HTML template to use report generator.", null);
  }

  const template = opts.templateFile;
  const viewVariables = opts.viewVars || {};

  consolidate.swig(template, viewVariables, function(err, html) {
    if (err) return done(err, null);
    return done(null, html);
  });
};

/**
 * Client used to perform actions against the Pandoc Micro-service or Windows Micro-service via streams
 */
const _nodeHttpRequest = function(opts, done) {
  const options = {
    hostname: opts.host,
    port: 80,
    path: opts.path,
    method: opts.method,
    timeout: 120000,
    headers: {}
  };

  options.headers = opts.headers;
  options.headers["Content-Length"] = Buffer.byteLength(opts.body);

  const request = http.request(options, function(response) {
    const data = [];

    response.on("error", function(err) {
      done(err, null);
    });
    response.on("data", function(chunk) {
      data.push(chunk);
    });
    response.on("end", function() {
      done(null, Buffer.concat(data));
    });
  });

  request.on("error", function(err) {
    done(err, null);
  });

  // Write data to the req stream
  request.write(opts.body);
  request.end();
};

/**
 * Client used to perform actions against the Pandoc Micro-service or Windows Micro-service via streams
 */

const _nodeFormDataHttpRequest = function(opts, done) {
  const options = {
    hostname: opts.host,
    port: 80,
    path: opts.path,
    method: opts.method,
    timeout: 120000,
    headers: opts.headers
  };

  const request = http.request(options, function(response) {
    const data = [];

    response.on("error", function(err) {
      console.error(err);
      done(err, null);
    });
    response.on("data", function(chunk) {
      data.push(chunk);
    });
    response.on("end", function() {
      done(null, Buffer.concat(data));
    });
  });

  request.on("error", function(err) {
    done(err, null);
  });

  // Format data and send request
  const form = new FormData();
  form.append("generatedReport", opts.buffer, {
    filename: opts.fileName,
    contentType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  });
  form.append("options", JSON.stringify(opts.body));
  form.append("storedStyledReport", opts.storedStyles);
  form.append("reportStyles", opts.reportStyles);
  request.setHeader(
    "Content-Type",
    "multipart/form-data; boundary=" + form._boundary
  );
  form.pipe(request);
};

/**
 * Client used to perform actions against the Pandoc Micro-service or Windows Micro-service via streams
 */

const _mergeFormDataHttpRequest = function(opts, done) {
  const options = {
    hostname: opts.host,
    port: 80,
    path: opts.path,
    method: opts.method,
    timeout: 120000,
    headers: opts.headers
  };
  const request = http.request(options, function(response) {
    const data = [];

    response.on("error", function(err) {
      console.error(err);
      done(err, null);
    });
    response.on("data", function(chunk) {
      data.push(chunk);
    });
    response.on("end", function() {
      done(null, Buffer.concat(data));
    });
  });

  request.on("error", function(err) {
    done(err, null);
  });

  // Format data and send request
  const form = new FormData();
  form.append("generatedReport", opts.buffer, {
    filename: opts.fileName,
    contentType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  });
  form.append("options", JSON.stringify(opts.body));
  request.setHeader(
    "Content-Type",
    "multipart/form-data; boundary=" + form._boundary
  );
  form.pipe(request);
};

const getHtmlData = function(opts, tocOption) {
  const headerC = {
    Content: tocOption.headerText,
    Image: tocOption.headerImage,
    Position: tocOption.headerPosition,
    Divider: tocOption.headerDivider
  };
  const footerC = {
    Content: tocOption.footerText,
    Image: tocOption.footerImage,
    Position: tocOption.footerPosition,
    Divider: tocOption.footerDivider
  };
  return {
    HtmlString: opts.body || "",
    isIncludeTOC: tocOption.tableOfContent,
    isShowPageNumber: tocOption.pageNumbers,
    TOCDept: tocOption.tableOfContentsDepth,
    isPageNumberDisplayOnHeader: tocOption.PageNumberDisplayOnHeader,
    pageNumberPosition: tocOption.numberPosition,
    HeaderContent: headerC,
    FooterContent: footerC,
    ReportStyles: tocOption.reportStyles
  };
};

/**
 * Client used to perform actions against the Reporting API
 */
const _httpRequest = function(opts, tocOpts, done) {
  const jsonBody = getHtmlData(opts, tocOpts);
  const options = {
    hostname: opts.url,
    port: 80,
    path: opts.path || "/api/word/createDocument",
    method: opts.method || "POST",
    timeout: 120000,
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(JSON.stringify(jsonBody))
    }
  };

  console.log("options", options);
  const jsonRequestString = JSON.stringify(jsonBody);
  console.log("===api.report.client._httpRequest===");
  console.log("options");
  console.log(options);
  console.log("jsonRequestString");
  console.log(jsonRequestString);

  const request = http.request(options, function(response) {
    const data = [];
    response.on("error", function(err) {
      done(err, null);
    });
    response.on("data", function(chunk) {
      data.push(chunk);
    });
    response.on("end", function() {
      done(null, Buffer.concat(data));
    });
  });
  // Write data to the req stream
  request.write(jsonRequestString);
  request.end();
};

/**
 * Generate a report from the Pandoc Micro-Service
 */
exports.getReport = function(options, done) {
  let ret = {};
  const opts = {
    headers: {
      "Content-Type": options.docType || "text/html",
      Accept: options.docToType || "text/markdown"
    },
    body: "",
    host: "pandoc-micro",
    method: "POST",
    path: ""
  };

  if (
    process.env.NODE_ENV === "test" ||
    (process.env.NODE_ENV === "development" &&
      config.pandocService.mockResponse)
  ) {
    opts.mock = "getReport";
  }

  const currentdate = new Date();
  const datetime =
    currentdate.getMonth() +
    1 +
    "_" +
    currentdate.getDate() +
    "_" +
    currentdate.getFullYear() +
    "-" +
    currentdate.getHours() +
    "_" +
    currentdate.getMinutes() +
    "_" +
    currentdate.getSeconds();

  if (!options.filename) options.filename = datetime;

  _getHtmlBlob(
    { templateFile: options.templateFile, viewVars: options.viewVars },
    function(err, htmlBlob) {
      if (err) {
        return done("Issues generating html from request.", null);
      }
      opts.body = htmlBlob;

      // Perform the request against the service
      _nodeHttpRequest(opts, function(err, buffer) {
        if (err) {
          return done(err, null);
        }
        ret = {
          buffer: buffer,
          contentType: options.docToType || "text/html",
          filename: options.filename,
          fileExtension: FILE_EXTENSIONS[options.docToType || "text/html"]
        };

        return done(null, ret);
      });
    }
  );
};

/**
 * Generate a report from the Pandoc Micro-Service per html string
 */
exports.getHtmlReport = function(options, done) {
  let ret = {};
  const opts = {
    headers: {
      "Content-Type": "html",
      Accept: options.docToType || "text/markdown"
    },
    body: options.body || "",
    host: "pandoc-micro",
    method: "POST",
    path: ""
  };

  if (
    process.env.NODE_ENV === "test" ||
    (process.env.NODE_ENV === "development" &&
      config.pandocService.mockResponse)
  ) {
    opts.mock = "getHtmlReport";
  }

  const currentdate = new Date();
  const datetime =
    currentdate.getMonth() +
    1 +
    "_" +
    currentdate.getDate() +
    "_" +
    currentdate.getFullYear() +
    "-" +
    currentdate.getHours() +
    "_" +
    currentdate.getMinutes() +
    "_" +
    currentdate.getSeconds();

  if (!options.filename) options.filename = datetime;
  if (!opts.body) return done("No html body present in request.", null);

  // Perform the request against the service
  _nodeHttpRequest(opts, function(err, buffer) {
    if (err) {
      return done(err, null);
    }

    ret = {
      buffer: buffer,
      contentType: options.docToType || "text/markdown",
      filename: options.filename,
      fileExtension: FILE_EXTENSIONS[options.docToType || "text/html"]
    };

    return done(null, ret);
  });
};

/**
 * Generate an word report from the windows server that serves up the Reports API
 */
exports.getWordReport = function(options, tocOptions, done) {
  const opts = {
    mock: false,
    method: "POST",
    path: `/api/word/createDocument?IsPdf=${tocOptions.format == "pdf"}`,
    body: options.body,
    url:
      config.reportsAPI && config.reportsAPI.reportEndpoint
        ? config.reportsAPI.reportEndpoint
        : ""
  };

  if (!opts.body) return done("No json body present in the request.", null);
  console.log("opts", opts);

  // Perform the request against the service
  _httpRequest(opts, tocOptions, function(err, buffer) {
    if (err) {
      return done(err, null);
    }
    const ret = {
      buffer: buffer,
      contentType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      filename: options.filename || Date.now(),
      fileExtension: "docx"
    };
    return done(null, ret);
  });
};

/**
 * Change the styling between two word documents
 */
exports.getWordReportStyles = function(request, tocOpts, done) {
  const jsonBody = getHtmlData({}, tocOpts);
  const isPdf = tocOpts.format == "pdf";
  const opts = {
    method: "POST",
    path: `/api/word/replaceStyles?IsPdf=${isPdf}`,
    headers: {
      "Content-Type": "multipart/form-data",
      Accept: "docx, application/pdf"
    },
    body: jsonBody,
    buffer: request.buffer,
    fileName: request.filename,
    storedStyles: request.styledDoc,
    reportStyles: request.reportStyles,
    host:
      config.reportsAPI && config.reportsAPI.reportEndpoint
        ? config.reportsAPI.reportEndpoint
        : ""
  };
  if (!request.filename) request.filename = Date.now();
  if (!opts.buffer) return done("No buffer present in request.", null);
  // Perform the request against the service
  _nodeFormDataHttpRequest(opts, function(err, buffer) {
    if (err) {
      return done(err, null);
    }
    const ret = {
      buffer: buffer,
      contentType: isPdf
        ? "application/pdf"
        : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      filename: request.filename || Date.now(),
      fileExtension: isPdf ? "pdf" : "docx"
    };

    return done(null, ret);
  });
};

/**
 * Change the styling between two word documents
 */
exports.mergeWordPdf = function(request, tocOpts, styledReport, done) {
  const jsonBody = getHtmlData({}, tocOpts);
  const params = request.attachments
    .map(function(i) {
      return i.BucketName;
    })
    .toString();
  const opts = {
    method: "POST",
    path: `/api/word/mergePdf?attachment_list=${params}`,
    headers: {
      "Content-Type": "multipart/form-data",
      Accept: "application/pdf"
    },
    body: jsonBody,
    buffer: styledReport.buffer,
    fileName: styledReport.filename,
    host:
      config.reportsAPI && config.reportsAPI.reportEndpoint
        ? config.reportsAPI.reportEndpoint
        : ""
  };

  // if (!request.filename) request.filename = Date.now();
  if (!opts.buffer) return done("No buffer present in request.", null);
  // Perform the request against the service
  _mergeFormDataHttpRequest(opts, function(err, buffer) {
    if (err) {
      return done(err, null);
    }
    const ret = {
      buffer: buffer,
      contentType: "application/pdf",
      filename: request.filename || Date.now(),
      fileExtension: "pdf"
    };

    return done(null, ret);
  });
};

/*
 * Get project data for a building
 */
exports.getProject = function(projectIds) {
  if (!projectIds) return {};

  const query = { _id: { $in: projectIds }, category: { $ne: 'description' } };

  return Project.find(query)
    .populate("locations")
    .populate("projects")
    .lean(true)
    .exec();
};

/*
 * Get user data
 */
exports.getUser = function(userId) {
  if (!userId) return {};
  return User.findById(userId).exec();
};

/*
 * Get operation data
 */
exports.getOperation = function(building) {
  if (!building) return {};

  const scheduleIds = [];
  building.operations.map(function(opr) {
    scheduleIds.push(opr.schedule);
  });
  const query = { _id: { $in: scheduleIds } };
  return Operation.find(query).exec();
};

/*
 * Get construction data
 */
exports.getConstruction = function(building) {
  if (!building) return {};
  const ids = [];
  building.constructions.map(function(con) {
    ids.push(con.construction);
  });
  const query = { _id: { $in: ids } };
  return Construction.find(query).exec();
};

/*
 * Get building equipment data
 */
exports.getBuildingEquipment = async function(building) {
  if (!building) return [];
  const buildingEquipment = await BuildingEquipment.find({
    building: building._id,
    isArchived: { $ne: true }
  })
    .populate("libraryEquipment")
    .populate("location");
  return buildingEquipment.filter(be => be.libraryEquipment !== null);
};

/**
 *  Get the equipment categorization
 */
exports.getEquipmentCategorization = async function() {
  const equipmentCategories = await EquipmentCategorization.find({}).exec();
  const equipmentSchemas = await EquipmentSchema.find({}).exec();
  return { equipmentCategories, equipmentSchemas };
};

/*
 * Get building equipment image data
 */
exports.getBuildingEquipmentImageData = async function(buildingEquipmentId) {
  if (!buildingEquipmentId) return [];
  return await ImageSync.find({
    sourceIdentity: buildingEquipmentId
  });
};

/*
 * Get project image data
 */
exports.getProjectImageData = async function(projectId) {
  if (!projectId) return [];
  return await ImageSync.find({
    sourceIdentity: projectId
  });
};

/*
 * Get location data
 */
exports.getLocation = function(building) {
  if (!building) return {};

  const locationIds = [];
  building.locations.map(function(opr) {
    locationIds.push(opr.location);
  });
  const query = { _id: { $in: locationIds } };
  return Location.find(query).exec();
};

exports.getActualEndUse = function(building, done) {
  if (!building) return done(null, {});

  ActualEndUse.find().exec(function(err, location) {
    if (err) return done(err, null);

    return done(null, location);
  });
};

/*
 * Get benchmark info from building
 */
function getBenchmark(building) {
  if (!building) return {};

  try {
    let costText, costPercent, costPercentMedian;
    let usageText, usagePercent, usagePercentMedian;
    const buildingBenchmark = building.benchmark;
    const benchmark = {
      general: {},
      annualCost: {},
      annualUsage: {},
      systemsUsage: {}
    };

    // Benchmark numbers
    if (
      Object.keys(building.benchmark).length !== 0 ||
      building.benchmark.constructor !== Object
    ) {
      const pmScore = buildingBenchmark.portfolioManager
        ? buildingBenchmark.portfolioManager
        : Math.round(buildingBenchmark.general.quantile * 100);

      // set numbers in benchmark object for return
      benchmark.general.pmScore = pmScore;
      benchmark.systemsUsage.general = buildingBenchmark.general.quantile
        ? Math.round(buildingBenchmark.general.quantile * 100)
        : "-";
      benchmark.systemsUsage.lighting = buildingBenchmark.lighting.quantile
        ? Math.round(buildingBenchmark.lighting.quantile * 100)
        : "-";
      benchmark.systemsUsage.heating = buildingBenchmark.heating.quantile
        ? Math.round(buildingBenchmark.heating.quantile * 100)
        : "-";
      benchmark.systemsUsage.cooling = buildingBenchmark.cooling.quantile
        ? Math.round(buildingBenchmark.cooling.quantile * 100)
        : "-";
      benchmark.systemsUsage.dhw = buildingBenchmark.dhw.quantile
        ? Math.round(buildingBenchmark.dhw.quantile * 100)
        : "-";
    }

    // End use numbers
    if (
      Object.keys(building.endUse).length !== 0 ||
      building.endUse.constructor !== Object
    ) {
      const buildingCost = building.endUse["cost-estimate"];
      const buildingUsage = building.endUse["total-energy-estimate"];
      const squareFeet = building.squareFeet;
      let EUI =
        buildingUsage.estimated_eui ||
        buildingUsage.estimated_consumption / squareFeet;
      if (EUI && EUI.length) EUI = EUI[0];

      // get cost details percentage
      const costYou = Math.round(buildingCost.estimated_consumption);
      const costMedian = Math.round(buildingCost["quantile-50"]);
      const cost75 = Math.round(buildingCost["quantile-75"]);
      const cost90 = Math.round(buildingCost["quantile-90"]);

      const costDiff = costMedian - costYou;
      costPercent = Math.abs(
        Math.round((Number(costDiff) / Number(costMedian)) * 100)
      );
      costText = costDiff > 0 ? "lower" : "higher";
      costPercentMedian = costPercent + "% " + costText + " than median";

      // get usage details percentage
      const usageYou = Math.round(buildingUsage.estimated_consumption);
      const usageMedian = Math.round(buildingUsage["quantile-50"]);
      const usage75 = Math.round(buildingUsage["quantile-75"]);
      const usage90 = Math.round(buildingUsage["quantile-90"]);

      const usageDiff = usageMedian - usageYou;
      usagePercent = Math.abs(
        Math.round((Number(usageDiff) / Number(usageMedian)) * 100)
      );
      usageText = usageDiff > 0 ? "lower" : "higher";
      usagePercentMedian = usagePercent + "% " + usageText + " than median";

      // set numbers in benchmark object for return
      benchmark.general.siteEUI = EUI.toFixed(2) + "kBtu/ft\u00b2";

      benchmark.annualCost.percentMedian = costPercentMedian;
      benchmark.annualCost.you = costYou
        ? "$" +
          util.formatNumbersWithCommas(costYou) +
          " ($" +
          Number(costYou / squareFeet).toFixed(2) +
          "/ft\u00B2)"
        : "-";
      benchmark.annualCost.median = costMedian
        ? "$" +
          util.formatNumbersWithCommas(costMedian) +
          " ($" +
          Number(costMedian / squareFeet).toFixed(2) +
          "/ft\u00B2)"
        : "-";
      benchmark.annualCost.percentile75 = cost75
        ? "$" +
          util.formatNumbersWithCommas(cost75) +
          " ($" +
          Number(cost75 / squareFeet).toFixed(2) +
          "/ft\u00B2)"
        : "-";
      benchmark.annualCost.percentile90 = cost90
        ? "$" +
          util.formatNumbersWithCommas(cost90) +
          " ($" +
          Number(cost90 / squareFeet).toFixed(2) +
          "/ft\u00B2)"
        : "-";

      benchmark.annualUsage.percentMedian = usagePercentMedian;
      benchmark.annualUsage.you = usageYou
        ? util.formatNumbersWithCommas(usageYou) +
          "kBtu (" +
          Number(usageYou / squareFeet).toFixed(2) +
          "kBtu/ft\u00b2)"
        : "-";
      benchmark.annualUsage.median = usageMedian
        ? util.formatNumbersWithCommas(usageMedian) +
          "kBtu (" +
          Number(usageMedian / squareFeet).toFixed(2) +
          "kBtu/ft\u00b2)"
        : "-";
      benchmark.annualUsage.percentile75 = usage75
        ? util.formatNumbersWithCommas(usage75) +
          "kBtu (" +
          Number(usage75 / squareFeet).toFixed(2) +
          "kBtu/ft\u00b2)"
        : "-";
      benchmark.annualUsage.percentile90 = usage90
        ? util.formatNumbersWithCommas(usage90) +
          "kBtu (" +
          Number(usage90 / squareFeet).toFixed(2) +
          "kBtu/ft\u00b2)"
        : "-";
    }

    return benchmark;
  } catch (err) {
    console.error(err);
    return {};
  }
}

const getSummary = function({ utilities }) {
  let summary = {};
  const values = {
    ...utilities
  };

  for (let option of reportOptions.fields) {
    _.set(summary, option.value, _.get(values, option.value, null));
  }

  delete summary.annualCostBenchmark;
  delete summary.annualUsageBenchmark;

  return summary;
};

const getOverview = function({ building, utilities = {} }) {
  const benchmark = getBenchmark(building);

  return {
    annualCostBenchmark: benchmark.annualCost,
    annualUsageBenchmark: benchmark.annualUsage,
    utility: {
      ...utilities,
      annualCostBenchmark: benchmark.annualCost,
      annualUsageBenchmark: benchmark.annualUsage
    },
    ...getSummary({ utilities })
  };
};

/*
 * Format Benchmarking fields
 */
exports.formatBenchmarkFields = (field, customLabels = []) => {
  if (customLabels.length > 0) {
    const customLabel = _.find(customLabels, { field });
    if (customLabel) return customLabel.value;
  }
  let label;
  switch (field) {
    case "general.siteEUI":
      label = "Site EUI";
      break;
    case "general.pmScore":
      label = "Energy Star Portfolio Manager Score";
      break;
    case "annualCost.percentMedian":
      label = "Annual Cost - % vs Median";
      break;
    case "annualCost.you":
      label = "Annual Cost - You";
      break;
    case "annualCost.median":
      label = "Annual Cost - Median";
      break;
    case "annualCost.percentile75":
      label = "Annual Cost - 75th Percentile";
      break;
    case "annualCost.percentile90":
      label = "Annual Cost - 90th Percentile";
      break;
    case "annualUsage.percentMedian":
      label = "Annual Usage - % vs Median";
      break;
    case "annualUsage.you":
      label = "Annual Usage - You";
      break;
    case "annualUsage.median":
      label = "Annual Usage - Median";
      break;
    case "annualUsage.percentile75":
      label = "Annual Usage - 75th Percentile";
      break;
    case "annualUsage.percentile90":
      label = "Annual Usage - 90th Percentile";
      break;
    case "systemsUsage.general":
      label = "Systems Usage - General";
      break;
    case "systemsUsage.lighting":
      label = "Systems Usage - Lighting";
      break;
    case "systemsUsage.heating":
      label = "Systems Usage - Heating";
      break;
    case "systemsUsage.cooling":
      label = "Systems Usage - Cooling";
      break;
    case "systemsUsage.dhw":
      label = "Systems Usage - Water Heating";
      break;
  }
  return label;
};

/*
 * Format Benchmarking fields in a Table
 */
exports.formatBenchmarkFieldsTable = field => {
  let label;
  switch (field) {
    case "siteEUI":
      label = "Site EUI";
      break;
    case "pmScore":
      label = "Energy Star Portfolio Manager Score";
      break;
    case "percentMedian":
      label = "% vs Median";
      break;
    case "you":
      label = "You";
      break;
    case "median":
      label = "Median";
      break;
    case "percentile75":
      label = "75th Percentile";
      break;
    case "percentile90":
      label = "90th Percentile";
      break;
    case "general":
      label = "General";
      break;
    case "lighting":
      label = "Lighting";
      break;
    case "heating":
      label = "Heating";
      break;
    case "cooling":
      label = "Cooling";
      break;
    case "dhw":
      label = "Water Heating";
      break;
  }
  return label;
};

/*
 * Format Utility fields
 */
exports.formatUtilityFields = (field, customLabels = []) => {
  if (customLabels.length > 0) {
    const customLabel = _.find(customLabels, { field });
    if (customLabel) return customLabel.value;
  }
  let label;
  switch (field) {
    case "ghgEmissions.totalEmissions":
      label = "GHG Emissions - Total Emissions";
      break;
    case "ghgEmissions.ghgIntensity":
      label = "GHG Emissions - GHG Intensity";
      break;
    case "ghgEmissions.vehiclesDriven":
      label = "GHG Emissions - Vehicles Driven in a Year";
      break;
    case "ghgEmissions.oilBarrelsConsumed":
      label = "GHG Emissions - Barrels of Oil Consumed";
      break;
    case "ghgEmissions.coalRailcarsBurned":
      label = "GHG Emissions - Railcars of Coal Burned";
      break;
    case "fuelOil2Meters.totalUsage":
      label = "Fuel Oil 2 Meter – Total Delivered";
      break;
    case "fuelOil2Meters.totalUsagePercent":
      label = "Fuel Oil 2 Meter – Total Delivered Percent";
      break;
    case "fuelOil2Meters.totalUsageCost":
      label = "Fuel Oil 2 Meter – Total Delivered Cost";
      break;
    case "fuelOil2Meters.totalUsageCostPercent":
      label = "Fuel Oil 2 Meter – Total Delivered Cost Percent";
      break;
    case "rates.fuelOil2":
      label = "Rates – Fuel Oil 2";
      break;
    case "fuelOil4Meters.totalUsage":
      label = "Fuel Oil 4 Meter – Total Delivered";
      break;
    case "fuelOil4Meters.totalUsagePercent":
      label = "Fuel Oil 4 Meter – Total Delivered Percent";
      break;
    case "fuelOil4Meters.totalUsageCost":
      label = "Fuel Oil 4 Meter – Total Delivered Cost";
      break;
    case "fuelOil4Meters.totalUsageCostPercent":
      label = "Fuel Oil 4 Meter – Total Delivered Cost Percent";
      break;
    case "rates.fuelOil4":
      label = "Rates – Fuel Oil 4";
      break;
    case "fuelOil56Meters.totalUsage":
      label = "Fuel Oil 5 & 6 Meter – Total Delivered";
      break;
    case "fuelOil56Meters.totalUsagePercent":
      label = "Fuel Oil 5 & 6 Meter – Total Delivered Percent";
      break;
    case "fuelOil56Meters.totalUsageCost":
      label = "Fuel Oil 5 & 6 Meter – Total Delivered Cost";
      break;
    case "fuelOil56Meters.totalUsageCostPercent":
      label = "Fuel Oil 5 & 6 Meter – Total Delivered Cost Percent";
      break;
    case "rates.fuelOil56":
      label = "Rates – Fuel Oil 5 & 6";
      break;
    default:
      label = _formatDotCamelCaseNotation(field);
      break;
  }
  return label;
};

/*
 * Format Utility fields in a Table, for headings
 */
exports.formatUtilityTableHeadings = field => {
  let label;
  switch (field) {
    case "fuelOil56Meters":
      label = "Fuel Oil 5 & 6 Deliveries";
      break;
    case "fuelOil56":
      label = "Fuel Oil 5 & 6";
      break;
    case "ghgEmissions":
      label = "GHG Emissions";
      break;
    default:
      label = _formatCamelCaseNotation(field);
      break;
  }
  return label;
};

/*
 * Format Utility fields in a Table, for keys
 */
exports.formatUtilityTableKeys = field => {
  let label;
  switch (field) {
    case "totalFuelOil56":
      label = "Total Fuel Oil 5 & 6";
      break;
    case "fuelOil56":
      label = "Fuel Oil 5 & 6";
      break;
    case "lighting.percentage":
      label = "Lighting Percentage";
      break;
    case "lighting.energyUse":
      label = "Lighting Energy Use";
      break;
    case "heating.percentage":
      label = "Heating Percentage";
      break;
    case "heating.energyUse":
      label = "Heating Energy Use";
      break;
    case "cooling.percentage":
      label = "Cooling Percentage";
      break;
    case "cooling.energyUse":
      label = "Cooling Energy Use";
      break;
    case "ventilation.percentage":
      label = "Ventilation Percentage";
      break;
    case "ventilation.energyUse":
      label = "Ventilation Energy Use";
      break;
    case "waterHeating.percentage":
      label = "Water Heating Percentage";
      break;
    case "waterHeating.energyUse":
      label = "Water Heating Energy Use";
      break;
    case "other.percentage":
      label = "Other Percentage";
      break;
    case "other.energyUse":
      label = "Other Energy Use";
      break;
    case "ghgIntensity":
      label = "GHG Intensity";
      break;
    case "vehiclesDriven":
      label = "Vehicles Driven in a Year";
      break;
    case "oilBarrelsConsumed":
      label = "Barrels of Oil Consumed";
      break;
    case "coalRailcarsBurned":
      label = "Railcars of Coal Burned";
      break;
    default:
      label = _formatCamelCaseNotation(field);
      break;
  }
  return label;
};

exports.htmlElementsArr = HTMLELEMENTS;
exports.targetsArr = TARGETSARR;
exports.targetFieldsArr = TARGETFIELDSARR;
exports.htmlTypeMapper = HTMLTYPEMAP;
exports.getBenchmark = getBenchmark;
exports.getSummary = getSummary;
exports.getOverview = getOverview;
