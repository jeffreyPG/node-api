"use strict";

/**
 * Module dependencies.
 */
var passport = require("passport"),
  config = require("../config"),
  util = require("../../app/controllers/api/utils/api.utils"),
  User = require("mongoose").model("User"),
  Session = require("mongoose").model("Session"),
  moment = require("moment"),
  crypto = require("crypto"),
  jsutil = require("util");
const { promisify } = require("util");

/**
 * Include the strategy here, we don't need a whole Node Module for this
 */
function Strategy(options, verify) {
  if (typeof options === "function") {
    verify = options;
    options = {};
  }
  if (!verify) {
    throw new TypeError("HmacStrategy requires a verify callback");
  }

  passport.Strategy.call(this);
  this.name = "hmac";
  this._verify = verify;

  // check options for validity time
  this._deviation = options.deviationMinutes || 10;

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
 * Authenticate request based on the contents of a HTTP HMAC Authorization
 *
 * @param {Object} req
 * @api protected
 */
Strategy.prototype.authenticate = function authenticate(req) {
  var digest, user, date, nonce;
  var self = this;

  var ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;

  function verified(err, user, info, status) {
    if (err) {
      return self.error(err);
    }
    if (!user) {
      if (typeof info === "string") {
        info = { message: info };
      }
      info = info || {};
      return self.fail(
        self._challenge("invalid_hmac", info.message),
        status || 401
      );
    }
    self.success(user, info);
  }

  if (!req.headers) {
    return this.fail("Missing Headers", 500);
  }

  date = req.headers.x_date || req.headers.date;
  if (!date) {
    return this.fail("Missing Date Header", 402);
  }

  // Verify the date is within our configurable time
  if (/^[0-9]+$/.test(date)) {
    date = moment.unix(parseInt(date, 10)).unix();
  } else {
    date = moment(date).unix();
  }

  var lowerBound = moment()
    .subtract(this._deviation, "Minutes")
    .unix();
  var upperBound = moment()
    .add(this._deviation, "Minutes")
    .unix();
  if (date < lowerBound || date > upperBound) {
    return this.fail("Date header out of range", 403);
  }

  if (!req.headers || !req.headers.authorization) {
    return this.fail("Missing Authorization header", 404);
  }
  var parts = req.headers.authorization.split(" ");
  if (parts.length !== 2) {
    return this.fail("Authorization Header formatted incorrectly", 405);
  }
  var scheme = parts[0],
    credentials = parts[1];
  if (!/^hmac$/i.test(scheme)) {
    return this.fail("Authorization Header not set to hmac", 406);
  }

  // Credentials should look like this: username:nonce:digest
  // Split the credentials on ":"
  var credentialParts = credentials.split(":");
  if (credentialParts.length !== 3) {
    return this.fail(
      "Missing parts of hmac authentication. Expects USERID:NONCE:DIGEST",
      407
    );
  }
  user = credentialParts[0].trim();
  nonce = credentialParts[1].trim();
  digest = credentialParts[2].trim();

  if (self._passReqToCallback) {
    this._verify(req, user, nonce, digest, date, verified);
  } else {
    this._verify(user, nonce, digest, date, verified);
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

function getUser(req, username, nonce, digest, date, done) {
  Session.find(
    {
      username,
      web: req.isWeb,
      expires: { $gt: Date.now() },
      nonces: { $ne: nonce }
    },
    function(err, sessions) {
      if (err || !sessions || !sessions.length) {
        return done(
          null,
          false,
          "Session does not exist, or Nonce is already used",
          408
        );
      }
      // A session was found for this user, cycle through them and find the right one
      var urlToCompare = req.url.split("?");
      var toDigest = [req.method, urlToCompare[0], date, nonce].join("+");
      var iterators = [];
      // Start trying to match digests
      sessions.forEach(function(session, index) {
        iterators.push(index);
        // Create the digest
        var toCompare = crypto
          .createHmac("sha1", session.secret)
          .update(toDigest)
          .digest("hex");
        if (toCompare === digest) {
          User.findById(username, function(err, user) {
            if (err) {
              return done(null, false, "User not found", 409);
            }
            // If we have no user, and no more sessions to check, return out
            if (!user && iterators.length === sessions.length) {
              return done(null, false);
            }
            // Reset nonces, saving the last nonce used to prevent re-use
            if (session.nonces.length > 20) {
              session.nonces = [session.nonces[session.nonces.length - 1]];
            }
            // Store the nonce, so that a second request will fail
            session.nonces.push(nonce);
            // Ensure mongoose is aware of the modification
            session.markModified("nonces");
            session.update({ multi: false }, function(err) {
              if (err) {
                return done(null, false, "Session failed to save nonce", 410);
              }
              // Return successful auth
              req.user = user;
              req.secret = session.secret; // Save this for a logout if needed
              return done(null, user);
            });
          });
        } else if (iterators.length === sessions.length) {
          // If there are no sessions that generate the same digest, return out with error
          var devMessage = "";
          if (process.env.NODE_ENV === "development") {
            devMessage = ". Expected: " + toCompare;
          }
          return done(null, false, "No matching digest" + devMessage, 411);
        }
      });
    }
  );
}

/**
 * Use the HMAC Strategy
 */
module.exports = function() {
  // Use HMAC strategy
  passport.use(
    new Strategy(
      {
        passReqToCallback: true
      },
      getUser
    )
  );
};

module.exports.getUserAsync = promisify(getUser);
