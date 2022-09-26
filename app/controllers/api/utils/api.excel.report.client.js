"use strict";

var _ = require("lodash"),
  util = require("./api.utils"),
  http = require("http"),
  unirest = require("unirest"),
  config = require("../../../../config/config");
const request = require("request");

var MOCK_RESPONSE = {
  NYCReportJSON: {
    SubmittalInfo: {
      SubmittedBy: "Doe John", // last name then first name, separated by a space, not a comma
      Company: "simuwatt",
      Phone: "(303) 555-5555", // (area code) XXX-XXXX
      Email: "testing@simuwatt.com",
      Borough: "Bronx",
      Block: "00001", // Must be entered as 5-digits without any commas, dashes or spaces. For example, enter 00001 for Block 1.
      Lot: "0010", // Must be entered as 4-digits without any commas, dashes or spaces. For example, enter 0010 for Lot 10.
      BinNumber: "HDY468B", // Unique 7-digit Building Identification Number
      Address: "3000 Lawrence Street",
      Zip: "80210",
    },
    TeamInfo: {
      ProfessionalName: "Doe John", // last name then first name, separated by a space, not a comma
      License: "Name of License here",
      LicenseNo: "8758GFDJ763",
      Company: "simuwatt",
      Address: "3000 Lawrence Street",
      Phone: "(303) 555-5555", // (area code) XXX-XXXX
      CommissioningAgent: "Doe John", // last name then first name, separated by a space, not a comma
      YearsExperience: 6,
      CertType: "Certification Type here",
      CertExpirationDate: "09/12/2020", // MM/DD/YYYY
    },
    BuildingInfo: {
      Owner: "Doe John",
      OwnerRepresentative: "Representative name here",
      ManagementCompany: "simuwatt",
      ManagementContact: "Contact Here", // last name then first name, separated by a space, not a comma
      Phone: "(303) 555-5555", // (area code) XXX-XXXX
      OperatorName: "Doe John", // last name then first name, separated by a space, not a comma
      OperatorCert: "Certification here",
      OperatorLicenseNo: "JKHDU3849HD",
      State: "Colorado",
    },
    Projects: [
      {
        Name: "HVAC sensors are properly calibrated.",
        Compliant: "Yes",
        Notes: "notes here about the project", // If Yes is selected under Compliant column, enter "No deficiency observed" OR "Deficiency observed and corrected". If N/A is selected under Compliant column then provide reasons.
        DeficiencyCorrected: "", // Enter N/A if "No deficiency is observed or if "N/A" is selected under "Compliant" and reasons are provided under "Notes".
        ApproachToCompliance: "Summary of correction methodology adopted.",
        ImplementationCost: "2346",
        Electricity: "92374",
        Gas: "634",
        Oil: "78965",
        Steam: "234",
        Other: "698",
        AnnualEnergySavings: "82456",
        AnnualCostSavings: "7645",
      },
      {
        Name: "Loads are distributed equally across equipment when appropriate (i.e. fans, boilers, pumps, etc. that run in parallel). ",
        Compliant: "N/A",
        Notes: "some other kind of notes here",
        DeficiencyCorrected: "N/A",
        ApproachToCompliance: "Summary of correction methodology adopted.",
        ImplementationCost: "3457",
        Electricity: "78",
        Gas: "2456",
        Oil: "34675",
        Steam: "24",
        Other: "4357",
        AnnualEnergySavings: "924567",
        AnnualCostSavings: "2345",
      },
    ],
  },
};

/**
 * Client used to perform actions against the Reporting API
 */
const _httpRequest = function (opts, done) {
  let jsonBody = opts.body;
  if (opts.mock && MOCK_RESPONSE[opts.mock]) {
    jsonBody = MOCK_RESPONSE[opts.mock];
  }

  const options = {
    hostname: opts.url,
    port: 80,
    path: opts.path || "/api/excel",
    method: opts.method || "GET",
    body: jsonBody,
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(JSON.stringify(jsonBody)),
    },
  };
  var request = http.request(options, function(response) {
    var data = [];
    response.on("error", function(err) {
      done(err, null);
    });
    response.on("data", function (chunk) {
      data.push(chunk);
    });
    response.on("end", function () {
      done(null, Buffer.concat(data));
    });
  });

  request.on("error", function (err) {
    done(err, null);
  });

  // Write data to the req stream
  request.write(JSON.stringify(jsonBody));
  request.end();
};

/**
 * Generate an excel report from the windows server that serves up the Reports API
 */
exports.getNYCExcelReport = function (request, done) {
  const opts = {
    mock: false,
    method: "POST",
    path: "/api/nycExcel",
    body: request.body,
    url: (config.reportsAPI && config.reportsAPI.reportEndpoint) ? config.reportsAPI.reportEndpoint : "",
  };

  if (process.env.NODE_ENV === "test" || (process.env.NODE_ENV === "development" && config.analysisApi.mockResponse)) {
  //  opts.mock = 'excelReportJson';
  }

  if (!request.filename) request.filename = Date.now();
  if (!opts.body) return done("No json body present in request.", null);

  // Perform the request against the service
  _httpRequest(opts, function (err, buffer) {
    if (err) {
      return done(err, null);
    }

    const ret = {
      buffer: buffer,
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      filename: request.filename || Date.now(),
      fileExtension: "xls",
    };

    return done(null, ret);
  });
};

/**
 * Generate an excel report from the windows server that serves up the Reports API
 */
exports.getExcelReport = async function(request, done) {
  const opts = {
    mock: false,
    method: "POST",
    path: "/api/report/" + request.reportType,
    body: request.body,
    url: config.reportsAPI && config.reportsAPI.reportEndpoint
  };

  if (!request.filename) request.filename = Date.now();
  if (!opts.body) return done("No json body present in request.", null);

  _httpRequest(opts, function(err, buffer) {
    if (err) {
      return done(err, null);
    }

    const ret = {
      buffer: buffer,
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      filename: request.filename || Date.now(),
      fileExtension: "xls"
    };

    return done(null, ret);
  });
};
