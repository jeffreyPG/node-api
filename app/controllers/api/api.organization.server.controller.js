"use strict";

/**
 * Module dependencies.
 */
const _ = require("lodash");
const mongoose = require("mongoose");
const url = require("url");
const Organization = mongoose.model("Organization");
const User = mongoose.model("User");
const Code = mongoose.model("Code");
const util = require("./utils/api.utils");
const validate = require("./utils/api.validation");
const emailClient = require("./utils/api.smtp.client");
const targetSyncScript = require("../../scripts/organization.targets.script");
const { PARTITION_KEYS } = require("../../../config/realm");
const { addUserFeatureFlagByName } = require("./utils/api.featureflag.util");

/**
 * Get an individual organization details
 */
exports.getOrganization = function(req, res, next) {
  const org = req.organization;

  // Return the organization object
  res.sendResult = {
    status: "Success",
    message: "Retrieved Organization",
    organization: org
  };
  return next();
};

/**
 * Update organization
 */
exports.updateOrganization = function(req, res, next) {
  const user = req.user;
  let org = req.organization;
  const orgUserObj = org.users.find(obj => {
    return obj.userId.toString() === user._id.toString();
  });

  if (!req.body) {
    return util.sendError("Invalid request.", 400, req, res, next);
  }

  // Ensure a user can only update organizations if they are a part of the organization
  if (user.orgIds.indexOf(org._id) === -1) {
    return util.sendError("Permission denied.", 400, req, res, next);
  }

  // Ensure a user can only update organizations if they are an owner of the organization
  if (orgUserObj.userRole !== "owner" && orgUserObj.userRole !== "admin") {
    return util.sendError(
      "Only owners of the organization can perform this action.",
      400,
      req,
      res,
      next
    );
  }

  // Never allow client to modify these fields so remove from the req body
  const deleteFields = ["orgType", "updated", "created"];
  deleteFields.map(function(field) {
    delete req.body[field];
  });

  org = _.extend(org, req.body);
  org.updated = Date.now();

  org.save(function(err) {
    if (err) {
      return util.sendError(err, 400, req, res, next);
    }
    targetSyncScript
      .sync({
        organizationIds: [org._id.toString()]
      })
      .then(() => {
        // Return the updated organization object
        res.sendResult = {
          status: "Success",
          message: "Updated Organization",
          organization: org
        };
        return next();
      });
  });
};

/**
 * archiveOrganization
 */
exports.archiveOrganization = async (req, res, next) => {
  const user = req.user;
  let org = req.organization;
  const orgUserObj = org.users.find(obj => {
    return obj.userId.toString() === user._id.toString();
  });
  // Ensure a user can only update organizations if they are a part of the organization
  if (user.orgIds.indexOf(org._id) === -1) {
    return util.sendError("Permission denied.", 400, req, res, next);
  }

  // Ensure a user can only update organizations if they are an owner of the organization
  if (orgUserObj.userRole !== "owner") {
    return util.sendError(
      "Only owners of the organization can perform this action.",
      400,
      req,
      res,
      next
    );
  }
  try {
    org.isArchived = true;
    await org.save();
    res.sendResult = {
      status: "Success",
      message: "Removed Organization",
      organization: org
    };
    return next();
  } catch (error) {
    console.log("error", error);
    return util.sendError("Issues Removing Organization", 400, req, res, next);
  }
};
/**
 * Create organization
 */

exports.createOrganization = async (req, res, next) => {
  try {
    const user = req.user;
    const reqOrganization = req.body;

    if (!reqOrganization) {
      return util.sendError("Invalid request.", 400, req, res, next);
    }

    if (!reqOrganization.name) {
      return util.sendError('Field "name" is required.', 400, req, res, next);
    }

    if (typeof reqOrganization.name !== "string") {
      return util.sendError(
        'Field "name" must be a string.',
        400,
        req,
        res,
        next
      );
    }

    const org = new Organization({
      name: reqOrganization.name,
      orgType: "group",
      users: []
    });

    org.users.push({
      userId: user._id,
      userRole: "owner",
      buildingIds: ["all"],
      templateIds: ["all"]
    });

    let newOrg = await org.save();

    user.orgIds.push(newOrg._id);
    user.markModified("orgIds");

    await user.save();

    let newOrgId = newOrg._id;
    newOrg = await Organization.findById(newOrgId);
    newOrg.sharedMeasureOrgs = [newOrgId];
    newOrg.sharedTemplateOrgs = [newOrgId];
    newOrg.markModified("sharedMeasureOrgs");
    newOrg.markModified("sharedTemplateOrgs");
    newOrg = await newOrg.save();

    // Return the organization object
    res.sendResult = {
      status: "Success",
      message: "Created Organization",
      organization: newOrg,
      user: util.cleanUserForResponse(user)
    };
    return next();
  } catch (error) {
    console.log("error", error);
    return util.sendError(error, 400, req, res, next);
  }
};

/**
 * Get an individual organization's users
 */
exports.getOrganizationUsers = function(req, res, next) {
  const org = req.organization;
  const user = req.user;

  const users = org.users.map(user => user.userId);
  const orgIds = (org && [org._id]) || [];

  User.find(
    {
      _id: { $in: users },
      archived: { $ne: true },
      orgIds: { $in: [req.organization._id.toString()] }
    },
    function(err, users) {
      if (err || !users) {
        return util.sendError("No users found.", 400, req, res, next);
      }

      // only return certain fields
      // we don't want the client to handle any personal user data
      const usersResult = [];
      users.map(user => {
        const orgUserObj = org.users.find(obj => {
          return obj.userId.toString() === user._id.toString();
        });

        usersResult.push({
          id: user._id,
          name: user.name,
          email: user.email,
          role: {
            [org._id]: orgUserObj.userRole
          },
          simuwattRole: user.simuwattRole,
          license: user.license || "",
          created: user.created
        });
      });
      // Return the users
      res.sendResult = {
        status: "Success",
        message: "Retrieved Organization users",
        users: usersResult
      };
      return next();
    }
  );
};

exports.getAllOrganizationUsers = function(req, res, next) {
  const user = req.user;
  Organization.find({ _id: { $in: user.orgIds } }, function(err, orgs) {
    if (err || !orgs) {
      return util.sendError("No users found.", 400, req, res, next);
    }
    const users = orgs.reduce((agg, org) => {
      const userIds = org.users.map(user => user.userId);
      agg = agg.concat(userIds);
      return agg;
    }, []);

    User.find(
      {
        _id: { $in: users },
        archived: { $ne: true },
        license: { $ne: "DEACTIVATED" }
      },
      function(err, users) {
        if (err || !user) {
          return util.sendError("No users found.", 400, req, res, next);
        }

        // only return certain fields
        // we don't want the client to handle any personal user data
        const usersResult = [];
        users.map(user => {
          const userOrgDetails = orgs.reduce(
            (agg, org) => {
              const orgUserObj = org.users.find(obj => {
                return obj.userId.toString() === user._id.toString();
              });
              if (orgUserObj) {
                agg.orgIds.push(org._id);
                agg.role[org._id] = orgUserObj.userRole;
              }
              return agg;
            },
            {
              orgIds: [],
              role: {}
            }
          );

          usersResult.push({
            id: user._id,
            name: user.name,
            email: user.email,
            orgIds: userOrgDetails.orgIds,
            role: userOrgDetails.role,
            created: user.created
          });
        });
        // Return the users
        res.sendResult = {
          status: "Success",
          message: "Retrieved Organization users",
          users: usersResult
        };
        return next();
      }
    );
  });
};

/**
 * Add a user to an organization by email
 */
exports.addOrganizationUser = function(req, res, next) {
  const org = req.organization;
  const requestingUser = req.user;
  const email = req.body.email;
  const uri =
    process.env.HOST +
    "/" +
    res.app.locals.prefix +
    "organization/" +
    org._id +
    "/confirmUser/";
  const orgUserObj = org.users.find(obj => {
    return obj.userId.toString() === requestingUser._id.toString();
  });

  // validate email address
  if (!validate.valEmailAddress(email)) {
    return util.sendError("Invalid email address.", 400, req, res, next);
  }

  // don't allow anyone else besides admin users to add other users
  if (orgUserObj.userRole !== "owner" && orgUserObj.userRole !== "admin") {
    return util.sendError(
      "Only owners and admins of the organization can perform this action.",
      400,
      req,
      res,
      next
    );
  }

  // check to see if the user already exists
  User.find({ email: email })
    .limit(1)
    .lean(true)
    .exec(function(err, user) {
      // if an actual error occurs
      if (err) {
        return util.sendError(err, 400, req, res, next);
      }

      // if the user already exists and is a part of that organization
      if (
        user &&
        user[0] &&
        user[0].orgIds.length > 0 &&
        user[0].orgIds.indexOf(org._id) >= 0
      ) {
        return util.sendError(
          "A user with that email already exists in this organization. Please enter another email.",
          400,
          req,
          res,
          next
        );
      }

      const code = new Code({
        userEmail: email
      });

      code.save(function(err) {
        if (err) {
          return util.sendError(err, 400, req, res, next);
        }

        let message;
        const options = {
          to: [email],
          subject:
            requestingUser.name + " wants to add you to a buildee organization"
        };

        const buildeeLogo =
          "https://s3-us-west-2.amazonaws.com/buildee-test/buildee-logo.png";

        // send different messages with different links based on if they are existing users or not
        // if the user doesn't exist (send email with buildee sign up link)
        if (user.length === 0) {
          /*
          For the meantime... if the user doesn't exist, don't send any email
        */
          // Return the success object, email was sent
          res.sendResult = {
            status: "Error",
            message:
              "Please enter an email for an existing buildee user. You are not allowed to invite new buildee users to your organization."
          };
          return next();

          // message = {
          //   text: 'Your organization confirmation link : ' + uri + code.code,
          //   html:
          //     '<div style="background-color:#F9FAFB;padding:30px">' +
          //     '<div style="padding:10px;max-width:300px;margin:auto;"><img style="display:block;max-width:100%;margin:auto;" src="' + buildeeLogo + '" /></div>' +
          //     '<div style="background-color:#fff;padding:30px;max-width:400px;margin:auto;border: 1px solid #f3f3f3;border-radius: 4px;"><h2 style=”font-family:\'Muli\', Helvetica, sans-serif; font-size:24px;”>Looks like you\'re new to the buildee app!</p>' +
          //     '<p style=”font-family:\'Open Sans\', Helvetica, sans-serif;”>Please click the following link to sign up for buildee, and you will automatically be added to the ' + org.name + ' organization.</h2>' +
          //     '<p style=”font-family:\'Open Sans\', Helvetica, sans-serif;”><a href="' + uri + code.code + '?newUser=true&email=' + email + '">Sign up for buildee</a></p>' +
          //     '<p style=”font-family:\'Open Sans\', Helvetica, sans-serif;”>This link will expire in <span style="color:red">30 minutes</span>!</p>' +
          //     '<p style=”font-family:\'Open Sans\', Helvetica, sans-serif;”>- the buildee team</p></div></div>'
          // };

          // if the user already exists (send normal email)
        } else {
          message = {
            text: "Your organization confirmation link : " + uri + code.code,
            html:
              '<div style="background-color:#F9FAFB;padding:30px">' +
              '<div style="padding:10px;max-width:300px;margin:auto;"><img style="display:block;max-width:100%;margin:auto;" src="' +
              buildeeLogo +
              '" /></div>' +
              "<div style=\"background-color:#fff;padding:30px;max-width:400px;margin:auto;border: 1px solid #f3f3f3;border-radius: 4px;\"><h2 style=”font-family:'Muli', Helvetica, sans-serif; font-size:24px;”>Please join my buildee organization: " +
              org.name +
              "</h2>" +
              "<p style=”font-family:'Open Sans', Helvetica, sans-serif;”>Please click the following link to join:</p>" +
              "<p style=”font-family:'Open Sans', Helvetica, sans-serif;”><a href=\"" +
              uri +
              code.code +
              "?userId=" +
              user[0]._id +
              '">Join Organization</a></p>' +
              "<p style=”font-family:'Open Sans', Helvetica, sans-serif;”>This link will expire in <span style=\"color:red\">48 hours</span>!</p>" +
              "<p style=”font-family:'Open Sans', Helvetica, sans-serif;”>- the buildee team</p></div></div>"
          };
        }

        emailClient.sendEmail(options, message, function(err) {
          if (err) {
            return util.sendError(err, 400, req, res, next);
          }

          let resMessage = "Confirmation email sent to: " + email;

          if (
            process.env.NODE_ENV === "development" ||
            process.env.NODE_ENV === "test"
          ) {
            resMessage = "Confirmation email sent : " + code.code;
          }
          // Return the success object, email was sent
          res.sendResult = {
            status: "Success",
            message: resMessage
          };
          return next();
        });
      });
    });
};

/**
 * Update a single user's role for an organization
 */
exports.updateOrganizationUser = async (req, res, next) => {
  const org = req.organization;
  const user = req.user;
  const userToBeUpdatedId = req.body.userToBeUpdated;
  const newRole = req.body.newRole;

  const orgUserObj = org.users.find(obj => {
    return obj.userId.toString() === user._id.toString();
  });

  if (!req.body) {
    return util.sendError("Invalid request.", 400, req, res, next);
  }

  // don't allow anyone else besides admin users to add other users
  if (orgUserObj.userRole !== "owner" && orgUserObj.userRole !== "admin") {
    return util.sendError(
      "Only owners and admins of the organization can perform this action.",
      400,
      req,
      res,
      next
    );
  }

  // find the user in the org user list, and change the role
  const foundIndex = org.users.findIndex(
    user => user.userId.toString() === userToBeUpdatedId.toString()
  );
  org.users[foundIndex].userRole = newRole;

  await addUserFeatureFlagByName(
    userToBeUpdatedId,
    "Admin",
    newRole === "admin" || newRole === "owner"
  );

  org.markModified("users");

  // save the org
  org.save(function(err, organization) {
    if (err) {
      return util.sendError(err.message, 400, req, res, next);
    }

    // Return the organization object
    res.sendResult = {
      status: "Success",
      message: "Updated Organization user",
      organization: organization
    };
    return next();
  });
};

/**
 * Remove a user from a single organization
 */
exports.deleteOrganizationUser = function(req, res, next) {
  const org = req.organization;
  const user = req.user;
  const userToBeRemovedId = req.body.userToBeRemoved;

  const orgUserObj = org.users.find(obj => {
    return obj.userId.toString() === user._id.toString();
  });

  // don't allow anyone else besides admin users to add other users
  if (orgUserObj.userRole !== "owner" && orgUserObj.userRole !== "admin") {
    return util.sendError(
      "Only owners and admins of the organization can perform this action.",
      400,
      req,
      res,
      next
    );
  }

  // remove the user id from the org
  for (let i = org.users.length - 1; i >= 0; i--) {
    if (org.users[i].userId.toString() === userToBeRemovedId.toString()) {
      org.users.splice(i, 1);
    }
  }
  org.markModified("users");

  // save the org
  org.save(function(err, organization) {
    if (err) {
      return util.sendError(err.message, 400, req, res, next);
    }

    // find the user id that should be removed
    User.findOne({ _id: userToBeRemovedId }).exec(function(err, user) {
      if (err || !user) {
        return util.sendError(err || "Invalid account.", 400, req, res, next);
      }

      // remove the org id from the user
      for (let i = user.orgIds.length - 1; i >= 0; i--) {
        if (user.orgIds[i].toString() === org._id.toString()) {
          user.orgIds.splice(i, 1);
        }
      }
      user.markModified("orgIds");

      // save the user
      user.save(function(err) {
        if (err) {
          return util.sendError(err.message, 400, req, res, next);
        }

        // Return the organization object
        res.sendResult = {
          status: "Success",
          message: "Deleted User from Organization",
          organization: organization
        };
        return next();
      });
    });
  });
};

/**
 * Confirm user add to organization from email link
 */
exports.confirmUser = function(req, res, next) {
  const org = req.organization;
  const confirmationCode = req.params.confirmationCode;
  const newUserRedirect = req.query.newUser;
  const newUserEmail = req.query.email;
  const userId = req.query.userId;

  const urlParse = url.parse(res.locals.url);
  res.issueRedirectUrl = process.env.HOST;
  // If this is dev, then add the dev port to url
  if (urlParse.host === "localhost" || urlParse.host === "127.0.0.1") {
    res.issueRedirectUrl += ":3000";
  }

  if (!validate.valVerificationCode(confirmationCode)) {
    return util.sendError(
      "Invalid confirmation code request.",
      400,
      req,
      res,
      next
    );
  }

  Code.findOne({ code: confirmationCode })
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

      // if the confirmation code came from a user that already exists
      if (userId) {
        // find the user and add the org's id to their user obj and their id to the org obj
        User.findOne({ email: code.userEmail }).exec(function(err, user) {
          if (err || !user) {
            return util.sendError(
              err || "Invalid account.",
              400,
              req,
              res,
              next
            );
          }

          // save new org ids to the user model, if not already in there
          if (user.orgIds.indexOf(org._id) === -1) {
            user.orgIds.push(org._id);
          }

          user.save(function(err, user) {
            if (err) {
              return util.sendError(
                err || "Issues saving user.",
                400,
                req,
                res,
                next
              );
            }

            // save user id to the org model, if not already in there
            const orgUserObj = org.users.find(obj => {
              return obj.userId.toString() === user._id.toString();
            });
            if (!orgUserObj) {
              org.users.push({
                userId: user._id,
                userRole: code.role || "editor",
                buildingIds: ["all"],
                templateIds: ["all"]
              });
            }

            // Return the organization object
            org.save(function(err, org) {
              if (err) {
                return util.sendError(
                  err || "Issues saving organization.",
                  400,
                  req,
                  res,
                  next
                );
              }

              res.sendResult = {
                status: "Success",
                message: "Added user to organization"
              };
              res.issueRedirect = true;
              res.issueRedirectUrl =
                res.issueRedirectUrl + "/organization/" + org._id + "/building";
              return next();
            });
          });
        });
      }

      // if the confirmation code came from an email who is new to buildee
      if (newUserRedirect) {
        res.sendResult = {
          status: "Success",
          message: "Redirect user to signup"
        };
        res.issueRedirect = true;
        res.issueRedirectUrl =
          res.issueRedirectUrl +
          "/signup?orgId=" +
          org._id +
          "&email=" +
          newUserEmail;
        return next();
      }
    });
};

/**
 * Organization param middleware
 */
exports.organizationById = function(req, res, next, id) {
  if (!validate.valMongoObjId(id)) {
    return next(new Error("Invalid ID present in request."));
  }

  Organization.findById(id).exec(function(err, org) {
    if (err) return next(err);
    if (!org) return next(new Error("Failed to load Organization " + id));
    req.organization = org;
    return next();
  });
};

exports.addOrganizationExistingUser = async (req, res, next) => {
  try {
    const organizaiton = await Organization.findById(req.organization._id);
    const payload = req.body;
    const { id, role } = payload;
    const user = await User.findById(id);
    let orgIds = (user.orgIds || []).map(id => id.toString());
    if (orgIds.indexOf(organizaiton._id.toString()) === -1) {
      orgIds.push(organizaiton._id.toString());
    }
    user.orgIds = orgIds;
    user.markModified("orgIds");
    await user.save();
    const orgUserObj = organizaiton.users.find(obj => {
      return obj.userId.toString() === id;
    });
    if (!orgUserObj) {
      organizaiton.users.push({
        userId: id,
        userRole: role || "editor",
        buildingIds: ["all"],
        templateIds: ["all"]
      });
      await addUserFeatureFlagByName(
        id,
        "Admin",
        role === "admin" || role === "owner"
      );
    }
    organizaiton.markModified("users");
    await organizaiton.save();
    res.sendResult = {
      status: "Success",
      message: "Adding Existing User"
    };
    return next();
  } catch (error) {
    console.log(error);
    return util.sendError(
      "Issues adding existing user to organization",
      500,
      req,
      res,
      next
    );
  }
};
