"use strict";

/**
 * Module dependencies.
 */
const fs = require("fs");
const jwt = require("jsonwebtoken");
const moment = require("moment");
const mongoose = require("mongoose");
const path = require("path");
const util = require("./utils/api.utils");
const config = require("../../../config/config");
const Session = mongoose.model("Session");
const Organization = mongoose.model("Organization");

const privateKey = fs.readFileSync(
  path.join(__dirname, "../../../privatekey.pem")
);

// Take the difference between the dates and divide by milliseconds per day.
// Round to nearest whole number to deal with DST.
const _datediff = (first, second) => {
  return Math.abs(Math.round((second - first) / (1000 * 60 * 60 * 24)));
};

/**
 * Checks when they last reset a password
 * compared to the # of days each of their org requires
 */
const _checkLastResetPassword = user => {
  return new Promise((resolve, reject) => {
    const promises = [];
    const orgIds = [];
    let expiryTimes = [];
    const newUserObj = {
      newUser: user,
      resetPasswordOrgRequired: false,
    };

    // get all org ids that the user is a part of
    user.orgIds.map(org => {
      orgIds.push(org);
    });

    Organization.find({ _id: { $in: orgIds } }, function(err, organizations) {
      var findAllOrgs = organizations.map(organization => {
        var findOrgExpiryTimes = new Promise((resolve, reject) => {
          // find the user in this organization
          var orgUserObj = organization.users.find(obj => {
            return obj.userId.toString() === newUserObj.newUser._id.toString();
          });
          // if the user's role in the org is in the array of password expiry enabled roles
          if (
            organization.passwordExpiry.enabledRoles.includes(
              orgUserObj.userRole
            )
          ) {
            // add the password expiry days to an array
            expiryTimes.push(organization.passwordExpiry.days);
          }
          resolve();
        });
        promises.push(findOrgExpiryTimes);
      });

      Promise.all(findAllOrgs)
        .then(() => {
          return Promise.all(promises)
            .then(() => {
              // if there are any password reset restrictions for this user
              if (expiryTimes && expiryTimes.length > 0) {
                // remove zeros from the array
                expiryTimes = expiryTimes.filter(function(val) {
                  return val !== 0;
                });
                // sort array from smallest to largest. small number = short expiry dates
                expiryTimes.sort();
                // get number of days since last password reset
                const timeElapsed = _datediff(
                  new Date(newUserObj.newUser.lastPasswordReset),
                  new Date(Date.now())
                );

                // check if time elapsed is greater than the smallest number from the array
                if (timeElapsed >= expiryTimes[0]) {
                  // set the reset password flag on the user so they go into the new reset password flow
                  newUserObj.newUser.resetPassword = true;
                  newUserObj.resetPasswordOrgRequired = expiryTimes[0];
                  resolve(newUserObj);
                } else {
                  resolve(newUserObj);
                }
              } else {
                resolve(newUserObj);
              }
            })
            .catch(err => {
              reject(err);
            });
        })
        .catch(err => {
          reject(err);
        });
    });
  });
};

/**
 * Generate a secret for the app to use
 * This token will be used by the device for further authentication purposes
 * This is the user "log in" process
 */
exports.tokenCreateSecret = async function(req, res, next) {
  // Set token expiration
  var expiry = moment()
    .add(config.hmac.loginHours, "hours")
    .valueOf();
  var secret = util.generateRandomString(24);

  // Session hash + token stored in sessions
  let session = {
    secret: secret,
    username: req.user.id,
    web: req.isWeb,
    expires: expiry,
  };

  // Remove any old sessions from this secret + username
  Session.remove(
    { username: req.user.id, secret: secret, web: req.isWeb },
    function(err) {
      if (err) {
        return util.sendError(err, 400, req, res, next);
      }

      // Save this session for validating all future requests
      session = new Session(session);
      session.save(function(err) {
        if (err) {
          return util.sendError(err, 400, req, res, next);
        }

        _checkLastResetPassword(req.user)
          .then(newUserObj => {
            var response = {
              status: "Success",
              message: "Secret Created",
              eaKey: Buffer.from(process.env.FIREBASE_ADMIN_TOKEN).toString(
                "base64"
              ),
              secret: secret,
              expiry: expiry,
              user: util.cleanUserForResponse(newUserObj.newUser),
              resetPasswordOrgRequired: newUserObj.resetPasswordOrgRequired
            };

            // Attach session data to request if in dev mode, for helpful debugging
            if (process.env.NODE_ENV === "development") {
              response.session = session;
            }

            // Send generated token
            res.sendResult = response;
            return next();
          })
          .catch(err => {
            console.log(err);
          });
      });
    }
  );
};

/**
 * Generate a signed jwt token for the mobile app to use
 */
exports.tokenCreateSignedJwt = function(req, res, next) {
  const user = util.cleanUserForResponse(req.user);
  const payload = {
    aud: process.env.REALM_APP_ID,
    sub: user._id,
    userData: {
      userId: user._id,
      email: user.email,
      name: user.name
    },
    isAdmin: true,
    userId: user._id.toString()
  };

  const jwtToken = jwt.sign(payload, privateKey, {
    algorithm: "RS256",
    expiresIn: 3600
  });

  _checkLastResetPassword(req.user)
    .then(newUserObj => {
      var response = {
        status: "Success",
        jwtToken,
        user: util.cleanUserForResponse(newUserObj.newUser),
        resetPasswordOrgRequired: newUserObj.resetPasswordOrgRequired
      };
      res.sendResult = response;
      return next();
    })
    .catch(err => {
      console.log(err);
    });
};

/**
 * Remove the session information from the db
 * This is the user "log out" process
 */
exports.tokenRemoveSecret = function(req, res, next) {
  Session.remove(
    { username: req.user.id, secret: req.secret, web: req.isWeb },
    function(err) {
      if (err) {
        return util.sendError(err, 400, req, res, next);
      }

      res.sendResult = {
        status: "Success",
        message: "Logged out User"
      };
      return next();
    }
  );
};
