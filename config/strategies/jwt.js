"use strict";

/**
 * Module dependencies.
 */
const passport = require("passport");
const JwtStrategy = require("passport-jwt").Strategy,
  ExtractJwt = require("passport-jwt").ExtractJwt;
const jwksRsa = require('jwks-rsa');
const User = require("mongoose").model("User");

const opts = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKeyProvider: jwksRsa.passportJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`
  }),
  // Validate the audience and the issuer.
  aud: `urn:${process.env.AUTH0_DOMAIN}`,
  issuer: `https://${process.env.AUTH0_DOMAIN}/`,
  algorithms: ['RS256'],
  passReqToCallback: true
};

module.exports = function() {
  passport.use(
    new JwtStrategy(opts, function(req, jwt_payload, done) {
        if (jwt_payload && jwt_payload.sub) {
            const [_, userId] = jwt_payload.sub.split("|");
            User.findById(userId, function(err, user) {
              if (err || !user) {
                return done(null, false, "User not found", 409);
              }
              req.user = user;
              return done(null, user);
            });
        } else {
          return done(
              "Invalid JWT",
              401
          )
        }
       
    })
  );
};
