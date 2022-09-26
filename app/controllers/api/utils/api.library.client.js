"use strict";

const _ = require("lodash");
const unirest = require("unirest");
const moment = require("moment");
const config = require("../../../../config/config");

const PROTO_PATH = "http://" + config.library.endpoint;

const _session = {
  validTimestamp: moment().add({
    days: config.library.resetSessionAfterDays || 0,
    minutes: config.library.resetSessionAfterMins || 0,
  }).valueOf(),

  token: "",

  id: "",
  name: "",
  loginToken: "",

  user: {},
};

const _getSession = function () {
  return _session;
};
const _resetSession = function () {
  _session.token = "";
  _session.id = "";
  _session.name = "";
  _session.loginToken = "";
  _session.user = {};
};
const _updateSessionValidTimestamp = function () {
  _session.validTimestamp = moment().add({
    days: config.library.resetSessionAfterDays || 0,
    minutes: config.library.resetSessionAfterMins || 0,
  }).valueOf();
};

const _getDefaultRequestOptions = function () {
  const currentSession = _getSession();
  return {
    method: "GET",
    url: "http://" + config.library.endpoint + "/api/node.json",
    headers: {
      "content-type": "application/json",
      "x-csrf-token": currentSession.loginToken,
      cookie: (currentSession.name && currentSession.id) ? currentSession.name + "=" + currentSession.id : "",
    },
    body: {},
  };
};

const REQUEST_OPTIONS = {
  // Auth endpoints
  token: {
    method: "GET",
    url: PROTO_PATH + "/services/session/token",
  },
  login: {
    method: "POST",
    url: PROTO_PATH + "/api/user/login.json",
    headers: {},
    body: {
      username: config.library.user,
      password: config.library.pass,
    },
  },
  logout: {
    method: "POST",
    url: PROTO_PATH + "/api/user/logout.json",
  },
  // CRUD endpoints
  list: {
    method: "GET",
  },
  view: {
    method: "GET",
  },
  create: {
    method: "POST",
  },
  update: {
    method: "PUT",
  },
  delete: {
    method: "DELETE",
  },
  // Multipost endpoints
  // - Create component with sub-components
  multipost: {
    method: "POST",
    url: PROTO_PATH + "/api/multipost.json",
  },
};

const _getRequestOptions = function (profile) {
  if (!REQUEST_OPTIONS[profile]) {
    return _getDefaultRequestOptions();
  }

  const ret = _.cloneDeep(REQUEST_OPTIONS[profile]);

  // Only for login do we change which token to use for auth
  if (profile === "login") {
    ret.headers = {
      "x-csrf-token": _getSession().token,
    };
  }
  // If logout profile, reset setting info
  if (profile === "logout") {
    _resetSession();
  }

  return ret;
};

const _getHttpClient = function (profile) {
  // Merge defaults with the profile specific options
  // If an http options object is passed, then use that instead of profile
  const options = (typeof profile === "string" && REQUEST_OPTIONS[profile]) ? _.extend(_getDefaultRequestOptions(), _getRequestOptions(profile)) : _.extend(_getDefaultRequestOptions(), profile);

  // Setup the Request object
  const Request = unirest(options.method, options.url);

  // Setup the defaults for the Request object
  Request.strictSSL(Boolean(config.library.strictSsl));
  Request.timeout(config.library.timeoutSeconds * 1000);
  // Request.query(query || '');

  // Modify the Request object per the options
  if (options) {
    if (options.body) {
      Request.type("json");
      Request.send(options.body);
    }
    if (options.headers) {
      Request.headers(options.headers);
    }
  }

  return Request;
};

const _getAuthClient = function (options, done) {
  // - Force a new authentication and session setup on library server
  // - Generally used when a auth fails against server and a new session must be created
  //   because it has expired on library server
  const forceReAuth = Boolean(options.forceReAuth) || false;
  const expiredAuth = Boolean((_session.validTimestamp - Date.now()) <= 0);

  // If session has been stored previously and not expired, then setup and return an http client
  // else reset session stored session info and re-auth against the library server
  if (!expiredAuth && !forceReAuth && _session.token && _session.loginToken) {
    return done(null, _getHttpClient(options));
  } else {
    _resetSession();
    _updateSessionValidTimestamp();
  }

  // Clean up before sending http request
  delete options.forceReAuth;

  // A force re-auth was requested, or need to establish a new session on library server
  // Run token request, then login request
  _getHttpClient("token").end(function (response) {
    // Store token in buffer
    _session.token = (response.ok && response.body) ? response.body : "";

    _getHttpClient("login").end(function (loginResponse) {
      // Store user and token info in buffer
      if (loginResponse.ok && loginResponse.body) {
        _session.user = (loginResponse.body.user) ? loginResponse.body.user : {};
        _session.id = (loginResponse.body.sessid) ? loginResponse.body.sessid : "";
        _session.loginToken = (loginResponse.body.token) ? loginResponse.body.token : "";
        _session.name = (loginResponse.body.session_name) ? loginResponse.body.session_name : "";
      }

      // Setup and return an http client with the original options
      return done(null, _getHttpClient(options));
    });
  });
};

exports.libraryTesting = function (done) {
  // Setup and store authentication information for requests
  _getAuthClient("list", function (err, Request) {
    Request.end(function (response) {
      // console.log('the response', response);
      done(null, response.body || {});
    });
  });
};

exports.libraryTestingLogout = function (done) {
  const httpOptions = _.extend(_getDefaultRequestOptions(), _getRequestOptions("createComponent"));
  httpOptions.body = {
    type: "component",
    title: "A new component test 4",
    field_description: { und: [{ value: "Long description of this component" }] },
    field_modeler_description: { und: [{ value: "Long Modular Description of this component" }] },
    field_attributes:
       {
         und:
          [{ tid: "ANSI Lamp Designation", value: "7" },
            { tid: "Basin Heater", value: "77" },
            { tid: "ANSI Lamp Designation", value: "777" }],
       },
    field_comment: { und: [{ value: "Comment for this component" }] },
    field_component_tags: { und: "Building Board and Siding,Floor Above Crawlspace" },
    field_source_organization: { und: [{ value: "NREL" }] },
    field_source_listing_date: { und: [{ value: "2011-01-11" }] },
    field_source_url: { und: [{ value: "https://bcl.nrel.gov" }] },
  };

  // Setup and store authentication information for requests
  _getAuthClient("logout", function (err, Request) {
  // _getAuthClient(httpOptions, function(err, Request) {

    Request.end(function (response) {
      console.log(response);
      done(null, response.body || {});
    });
  });
};

exports.libraryTestingCreateComponent = function (done) {
  const Request = _getHttpClient();

  // Setup and store authentication information for requests
  _getAuthClient(Request, function (err, RequestAuth) {
    RequestAuth.end(function (response) {
      done(null, response.body || {});
    });
  });
};

exports.libraryTestingComponentList = function (done) {
  const Request = _getHttpClient();

  // Setup and store authentication information for requests
  _getAuthClient(Request, function (err, RequestAuth) {
    RequestAuth.end(function (response) {
      done(null, response.body || {});
    });
  });
};
