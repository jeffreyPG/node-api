"use strict";

/**
 * Module dependencies.
 */
const _ = require("lodash");
const url = require("url");
const mongoose = require("mongoose");
const User = mongoose.model("User");
const BuildingGroup = mongoose.model("BuildingGroup");
const Organization = mongoose.model("Organization");
const Code = mongoose.model("Code");
const Key = mongoose.model("Key");
const Feature = mongoose.model("Feature");
const util = require("./utils/api.utils");
const validate = require("./utils/api.validation");
const moment = require("moment");
const config = require("../../../config/config");
const emailClient = require("./utils/api.smtp.client");
const featureScript = require("../../scripts/featureSync.script");
const ManagementClient = require("auth0").ManagementClient;
const sfUsers = require("../../salesforce/salesforce.user");
const sfOrganizations = require("../../salesforce/salesforce.organization");
const ObjectId = mongoose.Types.ObjectId;

/**
 * Passwords must be 6 characters long and contain at least at least one uppercase letter, one lowercase letter, one number and one special character.
 * passwordRegex.test(pass)
 */
const passwordRegex = new RegExp(
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*_=+-]).{8,30}$/
);

// Auth0 Management client
const auth0ManagementClient = new ManagementClient({
  domain: process.env.AUTH0_DOMAIN,
  clientId: process.env.AUTH0_CLIENT_ID,
  clientSecret: process.env.AUTH0_CLIENT_SECRET,
  scope: "read:users update:users"
});

exports.auth0ManagementClient = auth0ManagementClient;

/**
 * Create a user
 */
exports.createUser = function(req, res, next) {
  let key;
  const reqOrgId = req.body.orgId;
  const reqUserId = req.body.userId;
  const reqUsername = req.body.username;
  const reqEmail = req.body.email;
  const reqPassword = req.body.password;
  const reqRole = req.body.role;
  const urlQueryOrgId = req.query.orgId;

  // Remove the apiKeyId field to be safe
  delete req.body.apiKeyId;

  // Set username if it is not present, and email is
  if (!reqUsername && reqEmail) {
    req.body.username = reqEmail;
  }

  // validate password requirements
  if (!passwordRegex.test(reqPassword)) {
    return util.sendError(
      "Passwords must be 8 characters long and contain at least at least one uppercase letter, one lowercase letter, one number and one special character.",
      400,
      req,
      res,
      next
    );
  }

  // If the user is signing up as an expert, then check the required fields for an exper
  if (reqRole && reqRole === "expert") {
    req.body.roles = ["user", "expert"];

    if (!req.body.expert) {
      return util.sendError('Field "expert" is required.', 400, req, res, next);
    }
    if (!req.body.expert.radius) {
      return util.sendError(
        'Field "expert.radius" is required.',
        400,
        req,
        res,
        next
      );
    }
    if (!req.body.expert.serviceZipCode) {
      return util.sendError(
        'Field "expert.serviceZipCode" is required.',
        400,
        req,
        res,
        next
      );
    }
  }

  // Create user obj to validate/save
  var user = new User(req.body);

  user.validate(function(err) {
    if (err) {
      return util.sendError(err, 400, req, res, next);
    }

    // Create org obj to save
    var newOrg = new Organization({
      name: req.body.name + "'s Organization",
      orgType: "root"
    });

    // Check if we need to create an apiKey
    if (reqOrgId && reqUserId) {
      key = new Key({
        organizationFirebaseId: reqOrgId,
        userFirebaseId: reqUserId,
        eaUsername: reqUsername || ""
      });

      key.save(function(err) {
        if (err) {
          return util.sendError(err, 400, req, res, next);
        }

        user.apiKeyId = key._id;

        // Save the already validated user account with the apiKey id
        user.save(function(err, user) {
          if (err) {
            return util.sendError(err, 400, req, res, next);
          }

          newOrg.users.push({
            userId: user._id,
            userRole: "owner",
            buildingIds: ["all"],
            templateIds: ["all"]
          });

          newOrg.save(function(err, org) {
            if (err) {
              user.remove();
              return util.sendError(err, 400, req, res, next);
            }

            const tempOrgIds = user.orgIds;
            tempOrgIds.push(org._id);

            // if the user is signing up with a query orgId attached to the url
            if (urlQueryOrgId) {
              tempOrgIds.push(urlQueryOrgId);

              Organization.findOne({ _id: urlQueryOrgId }).exec(function(
                err,
                existingOrg
              ) {
                if (err || !existingOrg) {
                  return util.sendError(
                    err || "Invalid organization.",
                    400,
                    req,
                    res,
                    next
                  );
                }

                // save new user ids to the existingOrg model
                existingOrg.users.push({
                  userId: user._id,
                  userRole: "editor",
                  buildingIds: ["all"],
                  templateIds: ["all"]
                });

                existingOrg.save(function(err) {
                  if (err) {
                    return util.sendError(err, 400, req, res, next);
                  }
                });
              });
            }

            user = _.extend(user, {
              orgIds: tempOrgIds
            });

            user.save(function(err, user) {
              if (err) {
                return util.sendError(err, 400, req, res, next);
              }

              // Return the user object
              res.sendResult = {
                status: "Success",
                message: "Created User with API Key Generation",
                user: util.cleanUserForResponse(user),
                apiKey: key.apiKey
              };
              return next();
            });
          });
        });
      });
    } else {
      // Request didn't include apiKey info, so just create the already validated user account
      user.save(function(err, user) {
        if (err) {
          return util.sendError(err, 400, req, res, next);
        }

        newOrg.users.push({
          userId: user._id,
          userRole: "owner",
          buildingIds: ["all"],
          templateIds: ["all"]
        });

        newOrg.save(function(err, org) {
          if (err) {
            user.remove();
            return util.sendError(err, 400, req, res, next);
          }

          var tempOrgIds = user.orgIds;
          tempOrgIds.push(org._id);

          // if the user is signing up with a query orgId attached to the url
          if (urlQueryOrgId) {
            tempOrgIds.push(urlQueryOrgId);

            Organization.findOne({ _id: urlQueryOrgId }).exec(function(
              err,
              existingOrg
            ) {
              if (err || !existingOrg) {
                return util.sendError(
                  err || "Invalid organization.",
                  400,
                  req,
                  res,
                  next
                );
              }

              // save new user ids to the existingOrg model
              existingOrg.users.push({
                userId: user._id,
                userRole: "editor",
                buildingIds: ["all"],
                templateIds: ["all"]
              });

              existingOrg.save(function(err) {
                if (err) {
                  return util.sendError(err, 400, req, res, next);
                }
              });
            });
          }

          user = _.extend(user, {
            orgIds: tempOrgIds
          });

          user.save(function(err, user) {
            if (err) {
              return util.sendError(err, 400, req, res, next);
            }

            // Return the user object
            res.sendResult = {
              status: "Success",
              message: "Created User",
              user: util.cleanUserForResponse(user)
            };
            return next();
          });
        });
      });
    }
  });
};

/**
 * Get current user profile information
 */
exports.getUser = function(req, res, next) {
  // Return the user object
  res.sendResult = {
    status: "Success",
    message: "Retrieved User Profile",
    user: util.cleanUserForResponse(req.user)
  };
  return next();
};

/**
 * Get user obj by ID
 */
exports.getUserById = function(req, res, next) {
  const userId = req.query.userId;

  User.findOne({ _id: userId }, function(err, user) {
    if (err) {
      return util.sendError(err, 400, req, res, next);
    }

    const cleanedUser = {};

    // clean user list to only include what is needed
    const cleanUser = user => {
      cleanedUser.company = user.company;
      cleanedUser.email = user.email;
      cleanedUser.name = user.name;
      cleanedUser.type = user.type;
      cleanedUser.username = user.username;
    };

    if (user) cleanUser(user);

    // Return the user object
    res.sendResult = {
      status: "Success",
      message: "Retrieved User Profile",
      user: cleanedUser || {}
    };
    return next();
  });
};

/**
 * Update a user profile
 */
exports.updateUser = function(req, res, next) {
  let user = req.user;
  // Never allow client to modify these fields so remove from the req body
  const deleteFields = [
    "organizationId",
    "portfolio",
    "expert",
    "email",
    "roles",
    "salt",
    "password",
    "created",
    "updated",
    "resetPassword",
    "resetPasswordExpires",
    "apiKeyId",
    "username"
  ];
  deleteFields.map(function(field) {
    delete req.body[field];
  });

  user = _.extend(user, req.body);
  user.updated = Date.now();

  user.save(function(err) {
    if (err) {
      return util.sendError(err, 400, req, res, next);
    }

    // Return the updated user object
    res.sendResult = {
      status: "Success",
      message: "Updated User",
      user: util.cleanUserForResponse(user)
    };
    return next();
  });
};

/**
 * Update a user profile v2
 */
exports.updateProfile = async (req, res, next) => {
  try {
    let { data, userId } = req.body;
    let user = await User.findById(userId);
    if (user) {
      user = _.extend(user, data);
      user.updated = Date.now();
      let newUser = await user.save();
      const updatedProfile = formatAuth0Profile(user);
      auth0ManagementClient.updateUser(
        {
          id: `auth0|${userId}`
        },
        updatedProfile,
        function(err, user) {
          if (err) {
            console.log(err);
            // Handle error.
          }
          // Updated user.
          console.log(user);
          res.sendResult = {
            status: "Success",
            message: "Updated User",
            user: util.cleanUserForResponse(newUser)
          };
          return next();
        }
      );
    } else {
      return util.sendError("Can not find the user", 400, req, res, next);
    }
  } catch (error) {
    console.log("error", error);
    return util.sendError(error, 400, req, res, next);
  }
};

/**
 * Verify a user account per the query token
 * Mark their account as verified if the token is found
 */
exports.verifyUser = function(req, res, next) {
  const verifyCode = req.params.verifyCode;
  const redirect = req.query.redirect;

  const urlParse = url.parse(res.locals.url);
  res.issueRedirectUrl = process.env.HOST;
  // If this is dev, then add the dev port to url
  if (urlParse.host === "localhost" || urlParse.host === "127.0.0.1") {
    res.issueRedirectUrl += ":3000";
  }
  // Check to see if a redirect needs to be issued via query string
  if (redirect === "true") {
    res.issueRedirect = true;
  }

  if (!validate.valVerificationCode(verifyCode)) {
    return util.sendError("Invalid verify code request.", 400, req, res, next);
  }

  Code.findOne({ code: verifyCode })
    .lean(true)
    .exec(function(err, code) {
      if (err || !code) {
        return util.sendError(
          err || "Invalid code or code has expired.",
          400,
          req,
          res,
          next
        );
      }

      User.findOne({ email: code.userEmail }).exec(function(err, user) {
        if (err || !user) {
          return util.sendError(err || "Invalid account.", 400, req, res, next);
        }

        // Check if user has already been verified
        if (user.roles.indexOf("verified") !== -1) {
          // Return the verify object
          res.sendResult = {
            status: "Success",
            message: "User Verified"
          };
          res.issueRedirect = true;
          res.issueRedirectUrl =
            res.issueRedirectUrl + "/profile?verified=true";
          return next();
        }

        // Mark as verified
        user.roles.push("verified");
        user.markModified("roles");

        user.save(function(err) {
          if (err) {
            return util.sendError(err.message, 400, req, res, next);
          }

          // Return the verify object
          res.sendResult = {
            status: "Success",
            message: "User Account Verified"
          };
          res.issueRedirect = true;
          res.issueRedirectUrl =
            res.issueRedirectUrl + "/profile?verified=true";
          return next();
        });
      });
    });
};

/**
 * Create a verify code for the user account, and send off an email
 */
exports.createUserVerifyCode = function(req, res, next) {
  const user = req.user;

  let redirect;
  const urlParse = url.parse(res.locals.url);
  const uri =
    process.env.HOST + "/" + res.app.locals.prefix + "account/verify/";

  const code = new Code({
    userEmail: user.email
  });

  code.save(function(err) {
    if (err) {
      return util.sendError(err, 400, req, res, next);
    }

    // Check to see if a redirect need to be added via query string
    if (urlParse.host === "localhost" || urlParse.host === "127.0.0.1") {
      redirect = "?redirect=true";
    }

    var options = {
      to: [user.email],
      subject: "Verify Account"
    };
    var message = {
      text: "Your email verification link : " + uri + code.code + redirect,
      html:
        "<p>Your email verification link</p>" +
        "<p>Please click the following link to verify your account and email :</p>" +
        '<p><a href="' +
        uri +
        code.code +
        redirect +
        '">' +
        uri +
        code.code +
        "</a></p>" +
        '<p>This link will expire in <span style="color:red">30 minutes</span>!</p>'
    };

    emailClient.sendEmail(options, message, function(err) {
      if (err) {
        return util.sendError(err, 400, req, res, next);
      }

      var resMessage = "User Verify Email Sent to: " + user.email;

      if (
        process.env.NODE_ENV === "development" ||
        process.env.NODE_ENV === "test"
      ) {
        resMessage = "User Verify Email Sent : " + code.code;
      }
      // Return the verify code object
      res.sendResult = {
        status: "Success",
        message: resMessage
      };
      return next();
    });
  });
};

/**
 * Update a user password
 */
exports.updateUserPassword = function(req, res, next) {
  const fromEa = req.query.fromEa || false;

  if (!req.user && !fromEa) {
    return util.sendError("Incorrect User Credentials", 401, req, res, next);
  }

  var user = req.user;
  var newPassword = req.body.newPassword || req.body.formData;

  // validate password requirements
  if (!passwordRegex.test(newPassword)) {
    return util.sendError(
      "Passwords must be 8 characters long and contain at least at least one uppercase letter, one lowercase letter, one number and one special character.",
      400,
      req,
      res,
      next
    );
  }

  if (!newPassword) {
    res.sendResult = {
      status: "Failure",
      message: "Missing new password"
    };
    return next();
  }

  var currentPassword = req.body.currentPassword;
  // If the user is coming from a password reset, then do not require the currentPassword field
  // If the user is changing password from logged-in profile, then ensure their pass is correct
  if (!user.resetPassword && !fromEa) {
    if (!currentPassword) {
      return util.sendError(
        "Current password is required.",
        400,
        req,
        res,
        next
      );
    }
    if (!user.validatePassword(currentPassword)) {
      return util.sendError(
        "Current password is invalid.",
        400,
        req,
        res,
        next
      );
    }
  }

  user.password = newPassword;
  user.salt = undefined; // Clear the salt so the presave hook fires
  user.resetPassword = "";
  user.resetPasswordExpires = new Date();
  user.updated = Date.now();
  user.lastPasswordReset = Date.now();

  user.save(function(err) {
    if (err) {
      return util.sendError(err, 400, req, res, next);
    }
    auth0ManagementClient.updateUser(
      {
        id: `auth0|${user._id}`
      },
      {
        password: newPassword
      },
      function(err, user) {
        if (err) {
          console.log(err);
          // Handle error.
        }
        // Return the updated user object
        res.sendResult = {
          status: "Success",
          message: "Updated User",
          user: util.cleanUserForResponse(user)
        };
        return next();
      }
    );
  });
};

/**
 * Send user an email to start the forgotten password flow
 */
exports.requestForgottenPassword = function(req, res, next) {
  const email = req.query.email;

  if (!validate.valEmailAddress(email)) {
    res.sendResult = {
      status: 400
    };

    return util.sendError("Invalid email address.", 400, req, res, next);
  }

  // Ensure the user account exists
  User.findOne({ email: email }, function(err, user) {
    if (err || !user) {
      return util.sendError("Invalid User.", 400, req, res, next);
    }

    const unit =
      config.forgotPassword && config.forgotPassword.units
        ? config.forgotPassword.units
        : 24;
    const measure =
      config.forgotPassword && config.forgotPassword.measure
        ? config.forgotPassword.measure
        : "Hours";

    user.resetPasswordExpires = moment()
      .add(unit, measure)
      .valueOf();
    user.resetPassword = util.generateRandomString(8);

    user.save(function(err) {
      if (err) {
        return util.sendError(err, 400, req, res, next);
      }

      const buildeeLogo =
        "https://s3-us-west-2.amazonaws.com/buildee-test/buildee-logo.png";
      const linkText =
        '<p style=”font-family:\'Open Sans\', Helvetica, sans-serif;”>Use this to <a href="https://app.buildee.com" target="_blank">sign in</a> and update your password in your profile. Note this password will expire in <span style="color:red">' +
        unit +
        " " +
        measure +
        "</span>.</p>";

      var options = {
        to: [user.email],
        subject: "Password reset request"
      };

      var message = {
        text: "Your new password is " + user.resetPassword,
        html:
          '<div style="background-color:#F9FAFB;padding:30px">' +
          '<div style="padding:10px;max-width:300px;margin:auto;"><img style="display:block;max-width:100%;margin:auto;" src="' +
          buildeeLogo +
          '" /></div>' +
          "<div style=\"background-color:#fff;padding:30px;max-width:400px;margin:auto;border: 1px solid #f3f3f3;border-radius: 4px;\"><h2 style=”font-family:'Muli', Helvetica, sans-serif; font-size:24px;”>Password Reset</h2>" +
          "<p style=”font-family:'Open Sans', Helvetica, sans-serif;”>Need to reset your password? No problem. We have temporarily reset your password to <b>" +
          user.resetPassword +
          "</b></p>" +
          linkText +
          "<p style=”font-family:'Open Sans', Helvetica, sans-serif;”>If you didn’t mean to change your password, ignore this email and your password will not change.</p>" +
          "<p style=”font-family:'Open Sans', Helvetica, sans-serif;”>- the buildee team</p></div></div>"
      };

      emailClient.sendEmail(options, message, function(err) {
        if (err) {
          return util.sendError(err, 400, req, res, next);
        }

        let devMessage = "";
        if (
          process.env.NODE_ENV === "development" ||
          process.env.NODE_ENV === "test"
        ) {
          devMessage = " : " + user.resetPassword;
        }

        // Email success message
        res.sendResult = {
          status: "Success",
          message: "Password Reset" + devMessage
        };
        return next();
      });
    });
  });
};

const checkInternalOrg = organization => {
  const options = organization?.options || {};
  const simuwattOrg = options.simuwattOrg ?? true;
  return !simuwattOrg;
};

const checkInternalUser = user => {
  const simuwattRole = user?.simuwattRole ?? "Don't have role";
  return simuwattRole === "";
};

const getOrgUserCount = (organization, users, allUsers) => {
  let items = users.filter(user => {
    const filteredUser = allUsers.find(
      item => item._id.toString() == user.userId.toString()
    );
    if (!filteredUser) return false;
    let orgIds = filteredUser.orgIds || [];
    let orgId = organization._id.toString();
    orgIds = orgIds.map(id => id.toString());
    if (!orgIds.includes(orgId)) return false;
    if (checkInternalOrg(organization) && checkInternalUser(user)) return false;
    return true;
  });
  return items.length;
};

exports.getUsersOrganizations = async function(req, res, next) {
  let { organizationId = "all", disable } = req.query;
  disable = disable === "true";
  if (req.user.orgIds && req.user.orgIds.length > 0) {
    const orgIds =
      organizationId === "all" ? req.user.orgIds : [ObjectId(organizationId)];
    try {
      const organizations = await Organization.aggregate([
        {
          $match: {
            _id: { $in: orgIds },
            isArchived: {
              $ne: true
            }
          }
        },
        {
          $lookup: {
            from: "organizationthemes",
            localField: "themeId",
            foreignField: "_id",
            as: "theme"
          }
        }
      ]);
      // clean buildings list to only include what is need on building list view
      if (disable) {
        const allUsers = await User.find({
          license: { $ne: "DEACTIVATED" },
          archived: { $ne: true }
        });
        const cleanedOrganizations = organizations
          .filter(organization => !organization.isArchived)
          .map(organization => ({
            _id: organization._id,
            name: organization.name,
            users: organization.users,
            orgType: organization.orgType,
            theme:
              organization.theme && organization.theme.length > 0
                ? organization.theme[0]
                : null,
            salesforce: organization.salesforce,
            sharedMeasureOrgs: organization.sharedMeasureOrgs || [],
            sharedTemplateOrgs: organization.sharedTemplateOrgs || [],
            created: organization.created,
            userCount: getOrgUserCount(
              organization,
              organization.users,
              allUsers
            ),
            salesforce: organization.salesforce
          }));

        // Return building list
        res.sendResult = {
          status: "Success",
          message: "Retrieved User Organizations",
          organizations: cleanedOrganizations
        };
      } else {
        const cleanedOrganizations = organizations
          .filter(organization => !organization.isArchived)
          .map(organization => ({
            _id: organization._id,
            name: organization.name,
            users: organization.users,
            orgType: organization.orgType,
            theme:
              organization.theme && organization.theme.length > 0
                ? organization.theme[0]
                : null,
            sharedMeasureOrgs: organization.sharedMeasureOrgs || [],
            sharedTemplateOrgs: organization.sharedTemplateOrgs || [],
            created: organization.created,
            salesforce: organization.salesforce
          }));

        // Return building list
        res.sendResult = {
          status: "Success",
          message: "Retrieved User Organizations",
          organizations: cleanedOrganizations
        };
      }
      return next();
    } catch (err) {
      console.error(err);
      return util.sendError(err, 400, req, res, next);
    }
  }
};

/**
 * Batch create users for a single organization
 */

var _batchSaveOrgIdOnUsers = (users, orgId) => {
  return new Promise((resolve, reject) => {
    const promises = [];
    const userIds = [];
    let userObjs;

    users.map(user => {
      userIds.push(user.userId);
    });

    User.find({ _id: { $in: userIds } }, function(err, users) {
      userObjs = users;
      const findAllUsers = users.map(function(user) {
        const saveUsers = new Promise(function(resolve, reject) {
          // save new, single, company org id on to every user previously created
          const tempOrgIds = user.orgIds;
          tempOrgIds.push(orgId);
          user = _.extend(user, {
            orgIds: tempOrgIds
          });

          user.save(function(err) {
            if (err) {
              reject(err);
            }
            resolve();
          });
        });
        promises.push(saveUsers);
      });

      Promise.all(findAllUsers)
        .then(() => {
          return Promise.all(promises)
            .then(async () => {
              // adding buildingOverview feature flag
              let userIds = userObjs.map(user => user._id.toString());
              let feature = await Feature.find({
                name: "buildingOverview"
              });
              if (feature) {
                featureScript.sync({
                  featureId: feature[0]._id.toString(),
                  userIds: userIds
                });
              }
              try {
                let org = await Organization.findById(orgId);
                await sfUsers.updateUsers(userObjs, org);
                await sfOrganizations.updateOrganizations([org], org);
              } catch (err) {
                console.error("SalesForce was not updated:", err);
              }
              resolve(userObjs);
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

exports.formatAuth0Profile = function(user) {
  const profile = {
    name: user.name,
    blocked: false,
    app_metadata: {
      company: user.company,
      license: user.license
    },
    user_metadata: {
      enableMFA: user.enableMFA
    }
  };
  if (user.image && user.image != "") {
    profile.picture = user.image;
  }
  return profile;
};

const _batchCreateUsers = (userInfo, company) => {
  return new Promise(function(resolve, reject) {
    const promises = [];
    const userIds = [];

    if (userInfo && userInfo.length > 0) {
      // check to make sure all user passwords are valid
      const passwords = userInfo.map(user => user.password);
      const invalidPassword = passwords.some(
        password => !passwordRegex.test(password)
      );

      if (invalidPassword) {
        reject(
          "Passwords must be 8 characters long and contain at least at least one uppercase letter, one lowercase letter, one number and one special character."
        );
      } else {
        var createUsers = userInfo.map((userInput, index) => {
          var inputFirebaseRefs = {};
          if (userInput.firebaseRefs) {
            if (userInput.firebaseRefs.orgId) {
              inputFirebaseRefs.orgId = userInput.firebaseRefs.orgId;
            }
            if (userInput.firebaseRefs.userId) {
              inputFirebaseRefs.userId = userInput.firebaseRefs.userId;
            }
          }

          const saveUsers = new Promise(function(resolve, reject) {
            // Create user obj to validate/save
            const user = new User({
              name: userInput.name,
              username: userInput.username,
              email: userInput.email,
              password: userInput.password,
              company: company,
              firebaseRefs: inputFirebaseRefs,
              license: "ACTIVE",
              simuwattRole: userInput.simuwattRole || ""
            });

            user.validate(function(err) {
              if (err) {
                reject(err);
              }

              // create a root org for each user created
              // var newOrg = new Organization({
              //   name: userInput.name + "'s Organization",
              //   orgType: "root"
              // });
              const profile = exports.formatAuth0Profile(user);
              profile.password = user.password;
              profile.email = user.email;
              user.save(function(err, user) {
                if (err) {
                  reject(err);
                }

                if (!user) {
                  reject("No users found");
                  return "No users found";
                }
                profile.user_id = user._id;
                profile.connection = process.env.AUTH0_DB_CONNECTION;
                // Create user in Auth0
                auth0ManagementClient.createUser(profile, function(err) {
                  if (err) {
                    reject(err);
                  }
                  // User created.
                  // find all users ids that you just created,
                  // and push into array to use after promise
                  userIds.push({
                    name: userInput.name,
                    userId: user._id
                  });

                  // newOrg.users.push({
                  //   userId: user._id,
                  //   userRole: "owner",
                  //   buildingIds: ["all"],
                  //   templateIds: ["all"]
                  // });

                  // newOrg.save(function(err, org) {
                  //   if (err) {
                  //     user.remove();
                  //     reject(err);
                  //   }
                  //
                  //   var tempOrgIds = user.orgIds;
                  //   tempOrgIds.push(org._id);
                  //
                  //   user = _.extend(user, {
                  //     orgIds: tempOrgIds
                  //   });
                  //
                  //   user.save(function(err, user) {
                  //     if (err) {
                  //       reject(err);
                  //     }
                  //     resolve();
                  //   });
                  // });
                  user.save(function(err, user) {
                    if (err) {
                      reject(err);
                    }
                    resolve();
                  });
                });
              });
            });
          });

          promises.push(saveUsers);
        });

        Promise.all(createUsers)
          .then(() => {
            return Promise.all(promises)
              .then(() => {
                resolve(userIds);
              })
              .catch(err => {
                reject(err);
              });
          })
          .catch(err => {
            reject(err);
          });
      }
    } else {
      reject("Must add an array of user information.");
    }
  });
};

exports.batchCreateUsersInOrganization = function(req, res, next) {
  const company = req.body.company;
  const simuwattOrg = req.body.simuwattOrg;
  const users = req.body.users;
  const firebaseOrgId = req.body.firebaseOrgId;
  const headers = req.headers;

  // check for admin API key for every admin endpoint
  if (
    !headers.admin ||
    typeof headers.admin !== "string" ||
    headers.admin !== process.env.ADMIN_ENDPOINTS
  ) {
    return util.sendError(
      "Must enter the appropriate API key in the headers of this request.",
      401,
      req,
      res,
      next
    );
  }

  if (!company) {
    return util.sendError('Field "company" is required.', 400, req, res, next);
  }

  if (!users) {
    return util.sendError('Array "users" is required.', 400, req, res, next);
  }

  if (!_.isArray(users)) {
    return util.sendError(
      'Field "users" must be an array.',
      400,
      req,
      res,
      next
    );
  }

  // create new users for each item in users array (save user ids)
  _batchCreateUsers(users, company)
    .then(userIds => {
      // create new company org
      const companyOrg = new Organization({
        name: company,
        firebaseOrgId: firebaseOrgId,
        orgType: "group",
        options: {
          simuwattOrg: simuwattOrg
        }
      });

      // push all new users with those ids into the users array on the new org object
      // (make all users "editor" by default)
      userIds.map(user => {
        // find first user in req.users and make his/her role on the org "owner"
        const userRole = user.name === users[0].name ? "owner" : "editor";
        companyOrg.users.push({
          userId: user.userId,
          userRole: userRole,
          buildingIds: ["all"],
          templateIds: ["all"]
        });
      });

      // save the org
      companyOrg.save(function(err, org) {
        if (err) {
          return util.sendError(err, 400, req, res, next);
        }
        // for each of the previously created users
        // save the new company org id to their user
        _batchSaveOrgIdOnUsers(userIds, org._id)
          .then(users => {
            // Return the success message
            res.sendResult = {
              status: "Success",
              message: "Created Users in bulk for New Organization",
              newOrg: org,
              newUsers: users
            };
            return next();
          })
          .catch(err => {
            return util.sendError(err, 400, req, res, next);
          });
      });
    })
    .catch(err => {
      return util.sendError(err, 400, req, res, next);
    });
};

/**
 * Add a new user to an organization via JSON
 * (for new users and existing organizations only)
 */
exports.addNewUserToExistingOrg = function(req, res, next) {
  const org = req.organization;
  const users = req.body.users;
  const headers = req.headers;

  // check for admin API key for every admin endpoint
  if (
    !headers.admin ||
    typeof headers.admin !== "string" ||
    headers.admin !== process.env.ADMIN_ENDPOINTS
  ) {
    return util.sendError(
      "Must enter the appropriate API key in the headers of this request.",
      401,
      req,
      res,
      next
    );
  }

  if (!users) {
    return util.sendError('Array "users" is required.', 400, req, res, next);
  }

  if (!_.isArray(users)) {
    return util.sendError(
      'Field "users" must be an array.',
      400,
      req,
      res,
      next
    );
  }

  // create new users for each item in users array (save user ids)
  _batchCreateUsers(users, org.name)
    .then(userIds => {
      // push all new users with those ids into the users array on the org object
      // (make all users "editor" by default)
      userIds.map(user => {
        org.users.push({
          userId: user.userId,
          userRole: "editor",
          buildingIds: ["all"],
          templateIds: ["all"]
        });
      });

      org.markModified("users");

      // save the org
      org.save(function(err, org) {
        if (err) {
          return util.sendError(err, 400, req, res, next);
        }
        // for each of the previously created users
        // save the org id to their user
        _batchSaveOrgIdOnUsers(userIds, org._id)
          .then(users => {
            // Return the success message
            res.sendResult = {
              status: "Success",
              message: "Created Users in bulk for Existing Organization",
              newUsers: users
            };
            return next();
          })
          .catch(err => {
            return util.sendError(err, 400, req, res, next);
          });
      });
    })
    .catch(err => {
      return util.sendError(err, 400, req, res, next);
    });
};

/**
 * User param middleware
 */
exports.userById = function(req, res, next, id) {
  if (!validate.valMongoObjId(id)) {
    return next(new Error("Invalid ID present in request."));
  }

  User.findById(id).exec(function(err, user) {
    if (err) return next(err);
    if (!user) return next(new Error("Failed to load User " + id));
    req.requestedUserProfile = user;
    return next();
  });
};

exports.createBuildingGroup = function(req, res, next) {
  const user = req.user;
  const { name, buildingIds, orgIds } = req.body;
  const buildingGroup = new BuildingGroup({
    name,
    buildingIds,
    createdByUserId: user._id,
    orgIds
  });
  buildingGroup.save(function(err, group) {
    if (err) {
      return util.sendError(err, 400, req, res, next);
    }
    User.findByIdAndUpdate(user._id, {
      $push: { buildingGroupIds: group._id }
    }).exec(function(err) {
      if (err) return next(err);
      res.sendResult = {
        status: "Success",
        message: "Created Building Group",
        buildingGroup: group
      };
      return next();
    });
  });
};

exports.fetchBuildingGroup = function(req, res, next) {
  const user = req.user;
  BuildingGroup.find({ _id: { $in: user.buildingGroupIds } }, function(
    err,
    groups
  ) {
    if (err) {
      return util.sendError(err, 400, req, res, next);
    }
    res.sendResult = {
      status: "Success",
      message: "Fetched Building Group",
      buildingGroups: groups
    };
    return next();
  });
};

exports.updateBuildingGroup = function(req, res, next) {
  const { buildingGroupId } = req.params;
  const { name, buildingIds, orgIds } = req.body;
  BuildingGroup.findByIdAndUpdate(
    buildingGroupId,
    {
      $set: { name, buildingIds, orgIds }
    },
    { new: true }
  ).exec(function(err, group) {
    if (err) {
      return util.sendError(err, 400, req, res, next);
    }
    res.sendResult = {
      status: "Success",
      message: "Updated Building Group",
      buildingGroup: group
    };
    return next();
  });
};

exports.deleteBuildingGroup = function(req, res, next) {
  const user = req.user;
  const { buildingGroupId } = req.params;
  BuildingGroup.findByIdAndDelete(buildingGroupId, function(err, group) {
    if (err) {
      return util.sendError(err, 400, req, res, next);
    }
    const updatedBuildingGroupIds = user.buildingGroupIds.filter(
      id => id != buildingGroupId
    );
    User.findByIdAndUpdate(user._id, {
      $set: { buildingGroupIds: updatedBuildingGroupIds }
    }).exec(function(err) {
      if (err) return next(err);
      res.sendResult = {
        status: "Success",
        message: "Deleted Building Group"
      };
      return next();
    });
  });
};

exports.getAllUsers = async (req, res, next) => {
  try {
    const allUsers = await User.find({
      license: { $ne: "DEACTIVATED" },
      archived: { $ne: true }
    });
    res.sendResult = {
      status: "Success",
      message: "Get All User",
      users: allUsers
    };
    return next();
  } catch (error) {
    console.log(error);
    return util.sendError("Issues getting users", 500, req, res, next);
  }
};

exports.activateUser = async (req, res, next) => {
  try {
    const email = req.body.email;
    const user = await User.findOne({
      email
    });
    user.license = "ACTIVE";
    user.markModified("license");
    await user.save();
    res.sendResult = {
      status: "Success",
      message: "User license is activated"
    };
    return next();
  } catch (error) {
    console.log("error", error);
    return util.sendError("Issues activating user", 500, req, res, next);
  }
};
