"use strict";

/**
 * Module dependencies.
 */
var passport = require("passport"),
  config = require("../config"),
  util = require("../../app/controllers/api/utils/api.utils"),
  Key = require("mongoose").model("Key"),
  jsutil = require("util");

/**
 * Custom key passport strategy
 */
function Strategy(options, verify) {
  if (typeof options === "function") {
    verify = options;
    options = {};
  }
  if (!verify) {
    throw new TypeError("Key requires a verify callback");
  }

  passport.Strategy.call(this);
  this.name = "key";
  this._verify = verify;

  if (options.scope) {
    this._scope = Array.isArray(options.scope)
      ? options.scope
      : [options.scope];
  }
  this._passReqToCallback = options.passReqToCallback;
}

/**
 * Inherit from `passport.Strategy`.
 */
jsutil.inherits(Strategy, passport.Strategy);

/**
 * Authenticate request based on the contents of a HTTP custom key header
 *
 * @param {Object} req
 * @api protected
 */
Strategy.prototype.authenticate = function(req) {
  var key;
  var self = this;

  var ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;

  function verified(err, key, info, status) {
    if (err) {
      return self.error(err);
    }
    if (!key) {
      if (typeof info === "string") {
        info = { message: info };
      }
      info = info || {};
      return self.fail(
        self._challenge("invalid_key", info.message),
        status || 401
      );
    }
    self.success(key, info);
  }

  if (!req.headers) {
    return this.fail("Missing Headers", 500);
  }

  if (!req.headers.xkey) {
    return this.fail("Missing Key header", 498);
  }

  key = req.headers.xkey;

  if (self._passReqToCallback) {
    this._verify(req, key, verified);
  } else {
    this._verify(key, verified);
  }
};

/**
 * Build authentication challenge.
 *
 * @api private
 */
Strategy.prototype._challenge = function(code, desc, uri) {
  var challenge = "";
  if (desc && desc.length) {
    challenge = desc;
  }
  return challenge;
};

/**
 * Use the key strategy
 */
module.exports = function() {
  // Use token strategy
  passport.use(
    new Strategy(
      {
        passReqToCallback: true
      },
      function(req, key, done) {
        Key.findOne({ apiKey: key }, function(err, apiKey) {
          // Send back any errors
          if (err) {
            return done(null, false, "Key was not found", 497);
          }
          if (!apiKey) {
            return done(null, false, "Key does not exist", 496);
          }
          if (apiKey.deactivated) {
            return done(null, false, "Key has been deactivated", 495);
          }

          // Set key information on request object
          req.apiKey = apiKey;

          return done(null, apiKey);
        });
      }
    )
  );
};
