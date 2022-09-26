"use strict";

/**
 * Module dependencies.
 */
const winston = require("winston");
const config = require("../../../../config/config");

/**
 * Logger middleware and response handler
 */
exports.log = function (req, res, next) {
  // Ensure we have a result to send
  if (typeof res.sendResult === "undefined") {
    return res.status(404).end();
  }

  const status = res.httpStatus || 200;
  const user =
    typeof req.user !== "undefined" && typeof req.user._id !== "undefined"
      ? req.user._id.toString()
      : null;

  if (!config.logging.skipConsole) {
    winston.log("info", {
      request: {
        method: req.method,
        type: req.get("Content-Type") || null,
        url: req.originalUrl || req.url,
        // referrer: req.headers.referer || req.headers.referrer,
        ip: req.ips || req.ip || req._remoteAddress || req.connection,
        user: user,
        useragent: req.headers["user-agent"] || null,
        body: req.body || null,
        params: req.params || null,
        query: req.query || null,
      },
      response: {
        status: status.toString(),
        errorCode: res.sendResult.code || null,
        message: res.sendResult.message || null,
        fileLocation: res.sendResult.fileLocation || null,
      },
    });
  }

  // Issue a browser redirect if needed
  if (res.issueRedirect && res.issueRedirectUrl) {
    return res.redirect(res.issueRedirectUrl);
  }

  return res.status(status).send(res.sendResult);
};
