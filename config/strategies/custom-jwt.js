"use strict";

/**
 * Module dependencies.
 */
const passport = require("passport");
const JwtStrategy = require("passport-jwt").Strategy,
  ExtractJwt = require("passport-jwt").ExtractJwt;
const ApiKey = require("mongoose").model("ApiKey");
const opts = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET_KEY
};

module.exports = function() {
  passport.use("custom-jwt",
    new JwtStrategy(opts, function(jwt_payload, done) {
      ApiKey.findOne({ apiKey: jwt_payload.apiKey }, function(err, key) {
        if (err) {
          return done(err, false);
        }
        if (!key) {
          return done(null, false);
        }
        if (key.deactivated) {
          return done(null, false);
        }

        return done(null, key);
      });
    })
  );
};
