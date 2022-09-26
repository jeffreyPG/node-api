"use strict";

/**
 * Module dependencies.
 */
const passport = require("passport");
const logger = require("./api.logger");

/**
 * Require Basic Access Authentication via Basic Access Passport Strategy
 */
const authRequireBasic = function(req, res, next) {
  passport.authenticate("basic", function(err, user, info) {
    // Check for required auth items
    if (!err && user) {
      // Add user obj to request if auth success
      req.user = user;
      req.isAuthorized = true;
      return next();
    } else {
      // Auth failed, set status, message, and log error
      // Throw custom http status or 401 Unauthorized
      res.httpStatus = 401;
      res.sendResult = {
        status: "Error",
        code: "201",
        message: "Invalid Email / Password Combination"
      };
      // Remove user obj from request if auth failed
      req.isAuthorized = false;
      delete req.user;
      return next();
    }
  })(req, res, next);
};

/**
 * Require Auth0 Access Authentication
 */
const authRequireAuth0 = function(req, res, next) {
  passport.authenticate("jwt", { session: false }, function(err, user, info, status) {
    req.isAuthorized = false;
    if (!err && user) {
      // Add user obj to request if auth success
      req.user = user;
      req.isAuthorized = true;
      return next();
    } else {
      const result = {
        status: "Error",
        code: status || 401,
        message: "Auth0 Authentication failed"
      };

      if (process.env.NODE_ENV === "development") {
        result.reason = info;
      }
      // Auth failed, set status, message, and log error
      // Throw custom http status or 401 Unauthorized
      res.httpStatus = 401;
      res.sendResult = result;
      // Remove user obj from request if auth failed
      delete req.user;
      return next();
    }
  })(req, res, next);
};

const authRequireJwt = function(req, res, next) {
  passport.authenticate("custom-jwt", { session: false }, function(err, apiKey) {
    req.isAuthorized = false;
    if (!err && apiKey && apiKey.appId === req.headers["x-app-id"]) {
      req.apiKey = apiKey;
      req.isAuthorized = true;
      return next();
    } else {
      const result = {
        status: "Error",
        code: 401,
        message: "Jwt Authentication failed"
      };
      res.httpStatus = 401;
      res.sendResult = result;
      return next();
    }
  })(req, res, next);
};

const authenticate = function(req, res, next) {
  let authenticate;
  if (Object.keys(req.headers).includes("x-app-id")) {
    authenticate = authRequireJwt;
  } else {
    authenticate = authRequireAuth0;
  }
  authenticate(req, res, next);
};

/**
 * Require Key Access Authentication via Custom Key Access Passport Strategy
 */
const authRequireKey = function(req, res, next) {
  passport.authenticate("key", function(err, apiKey, info, status) {
    req.hasVerifiedKey = false;
    if (!err && apiKey) {
      // Add user obj to request if auth success
      req.apiKey = apiKey;
      req.hasVerifiedKey = true;
      return next();
    } else {
      const result = {
        status: "Error",
        code: status || 401,
        message: "Key Authentication failed"
      };

      if (process.env.NODE_ENV === "development") {
        console.log(info);
        result.reason = info;
      }
      // Auth failed, set status, message, and log error
      // Throw custom http status or 401 Unauthorized
      res.httpStatus = 401;
      res.sendResult = result;
      // Remove user obj from request if auth failed
      delete req.user;
      return next();
    }
  })(req, res, next);
};

/**
 * Authorized User check middleware
 */
const authUserCheck = function(req, res, next) {
  // Send authorized user to next middleware in chain
  const result = {
    status: "Error",
    code: 403,
    message: "User is not authorized to make this request"
  };
  if (req.isAuthorized) {

    // Bypass authorization check in case the header contains admin api key
    const headers = req.headers;
    if (
      headers.admin &&
      typeof headers.admin === "string" &&
      headers.admin === process.env.ADMIN_ENDPOINTS
    ) {
      return next();
    }

    // Check if user has proper authorization access
    if(req.requestedUserProfile && req.requestedUserProfile._id.toString() !== req.user._id.toString()) {
      return res.status(403).send(result);
    }
    if(req.organization) {
      if(!req.user.orgIds.includes(req.organization._id)) {
        return res.status(403).send(result);
      }
      if(req.building && !req.organization.buildingIds.includes(req.building._id)) {
        return res.status(403).send(result);
      }
    }
    return next();
  }

  // Log the request even when users make non-authorized calls
  // Logger sends response back to client
  logger.log(req, res, next);
};

/**
 * Verified Key check middleware
 */
const authAdminTokenCheck = function(req, res, next) {
  // check for admin API key for every admin endpoint
  if (
    !req.headers.admin ||
    typeof req.headers.admin !== "string" ||
    req.headers.admin !== process.env.ADMIN_ENDPOINTS
  ) {
    res.httpStatus = 401;
    res.sendResult = {
      status: "Error",
      code: "401",
      message:
        "Must enter the appropriate API key in the admin header of this request."
    };
    // Remove user obj from request if auth failed
    req.isAuthorized = false;
    delete req.user;
    return next();
  }

  return next();

  // Log the request even when users make non-key-verified calls
  // Logger sends response back to client
  // logger.log(req, res, next);
};

/**
 * Verified Key check middleware
 */
const authKeyCheck = function(req, res, next) {
  // Send key-verified user to next middleware in chain
  if (req.hasVerifiedKey) {
    return next();
  }

  // Log the request even when users make non-key-verified calls
  // Logger sends response back to client
  logger.log(req, res, next);
};

module.exports = {
  authenticate,
  authRequireBasic,
  authRequireAuth0,
  authRequireJwt,
  authRequireKey,
  authUserCheck,
  authKeyCheck,
  authAdminTokenCheck
};
