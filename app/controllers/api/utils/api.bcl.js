"use strict";

const unirest = require("unirest");
const util = require("./api.utils");
const querystring = require("querystring");
const config = require("../../../../config/config");

const _getClient = function (pathResouce, query) {
  // var RequestGet = unirest.get(config.bcl.endpoint + pathResouce);
  const RequestGet = unirest.get(config.bcl.bclEndpoint + pathResouce);
  // var RequestGet = unirest.get(config.library.bclEndpoint + pathResouce);

  RequestGet.strictSSL(Boolean(config.bcl.strictSsl));
  RequestGet.timeout(config.bcl.timeoutSeconds * 1000);
  RequestGet.query(query || "");

  return RequestGet;
};

exports.searchComponent = function (options, done) {
  if (options.mock) {
    return done(null, [{ mock: true }]);
  }

  const opts = {
    componentType: options.componentType || "",
  };

  let query = "api_version=2.0&fq[]=bundle:nrel_component&show_rows=2&solrsort=sort_label%20asc&";
  if (opts.componentType) {
    query += "fq[]=" + querystring.stringify({ sm_vid_Component_Tags: util.getComponentMapValue(opts.componentType) }, "&", ":");
  }

  const client = _getClient("search.json", query);

  client.end(function (response, err) {
    if (err) {
      return done(err, null);
    }

    return done(null, util.parseFormatLibraryComponents((response.body && response.body.result) ? response.body.result : {}));
  });
};

exports.searchMeasure = function (options, done) {
  if (options.mock) {
    return done(null, [{ mock: true }]);
  }

  const query = "api_version=2.0&fq[]=bundle:nrel_measure&show_rows=100&solrsort=sort_label%20asc&";

  const client = _getClient("search.json", query);

  client.end(function (response, err) {
    if (err) {
      return done(err, null);
    }

    return done(null, util.parseFormatLibraryPublicMeasure((response.body && response.body.result) ? response.body.result : {}));
  });
};

exports.queryProxy = function (options, done) {
  if (!options.querystring) {
    return done("Field \"querystring\" is required request.", null);
  }

  // Only split string after first occurrence
  const splitString = options.querystring.split("?", 2);
  const pathResouce = splitString[0] || null;
  const query = splitString[1] || null;

  if (!pathResouce || !query) {
    return done("Issues parsing query request.", null);
  }
  // Ensure the query string begins with "search/", has valid characters in between, and ends in ".json"
  if (!(/^(search\/)[a-zA-Z0-9 \*\-]+(.json)$/.test(pathResouce))) {
    return done("Invalid \"querystring\" used in request.", null);
  }

  // Run all validations regardless so they can be tested
  if (options.mock) {
    return done(null, [{ mock: true }]);
  }

  const client = _getClient(pathResouce, query);

  client.end(function (response, err) {
    if (err) {
      return done(err, null);
    }

    return done(null, util.parseFormatLibraryQuery((response.body && response.body.result) ? response.body.result : []));
  });
};
