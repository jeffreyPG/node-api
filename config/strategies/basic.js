"use strict";

/**
 * Module dependencies.
 */
var passport = require("passport"),
  BasicStrategy = require("passport-http").BasicStrategy,
  User = require("mongoose").model("User");

module.exports = function() {
  // Use basic auth strategy
  passport.use(
    new BasicStrategy({}, function(email, password, done) {
      User.findOne(
        {
          email: email
        },
        function(err, user) {
          if (err) {
            return done(err);
          }
          if (user === null || !user) {
            return done(null, false, {
              message: "Unknown user"
            });
          }
          if (!user.authenticate(password)) {
            return done(null, false, {
              message: "Invalid password"
            });
          }

          return done(null, user);
        }
      );
    })
  );
};
