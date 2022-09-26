"use strict";

/**
 * Module dependencies.
 */
const _ = require("lodash");
const mongoose = require("mongoose");
const util = require("./utils/api.utils");
const Project = mongoose.model("Project");
const Building = mongoose.model("Building");
const Template = mongoose.model("Template");
const Utility = mongoose.model("Utility");
const Organization = mongoose.model("Organization");
const User = mongoose.model("User");
const ManagementClient = require('auth0').ManagementClient;

// Auth0 Management client
const auth0ManagementClient = new ManagementClient({
  domain: process.env.AUTH0_DOMAIN,
  clientId: process.env.AUTH0_CLIENT_ID,
  clientSecret: process.env.AUTH0_CLIENT_SECRET,
  scope: 'read:users update:users'
});

/**
 * Passwords must be 6 characters long and contain at least at least one uppercase letter, one lowercase letter, one number and one special character.
 * passwordRegex.test(pass)
 */
const passwordRegex = new RegExp(
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*_=+-]).{8,30}$/
);

const _removeUserReferencesOnOrgs = (userId, orgsArray) => {
  return new Promise((resolve, reject) => {
    const promises = [];
    const orgIds = [];
    // get all user ids from the org user array
    orgsArray.map(org => {
      orgIds.push(org._id);
    });

    Organization.find({ _id: { $in: orgIds } }, function(err, orgs) {
      const findAllOrganizations = orgs.map(org => {
        const saveOrgs = new Promise(function(resolve, reject) {
          // find the user in the org user list, and remove
          const foundIndex = org.users.findIndex(
            user => user.userId.toString() === userId.toString()
          );
          if (foundIndex >= 0) {
            org.users.splice(foundIndex, 1);
          }

          // save org without extra user object
          org.save(function(err) {
            if (err) {
              reject(err);
            }
            resolve();
          });
        });
        promises.push(saveOrgs);
      });

      Promise.all(findAllOrganizations)
        .then(() => {
          return Promise.all(promises)
            .then(() => {
              resolve();
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

const __removeOrgReferencesOnUsers = org => {
  return new Promise((resolve, reject) => {
    const promises = [];
    const userIds = [];
    // get all user ids from the org user array
    org.users.map(user => {
      userIds.push(user.userId);
    });

    User.find({ _id: { $in: userIds } }, function(err, users) {
      const findAllUsers = users.map(function(user) {
        const saveUsers = new Promise(function(resolve, reject) {
          // remove org id from the user object
          const tempOrgIds = user.orgIds;
          const foundIndex = tempOrgIds.findIndex(
            orgId => orgId.toString() === org._id.toString()
          );
          if (foundIndex > 0) {
            tempOrgIds.splice(foundIndex, 1);
          }

          user = _.extend(user, {
            orgIds: tempOrgIds
          });
          // save user without extra org id
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
            .then(() => {
              resolve();
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

const __removeOrgProjects = org => {
  return new Promise((resolve, reject) => {
    const promises = [];

    Project.find({ _id: { $in: org.projectIds } }, function(err, projects) {
      const findAllProjects = projects.map(project => {
        const removeProjects = new Promise((resolve, reject) => {
          // remove project from the database
          project.remove(err => {
            if (err) {
              reject();
            }
            resolve();
          });
        });
        promises.push(removeProjects);
      });

      Promise.all(findAllProjects)
        .then(() => {
          return Promise.all(promises)
            .then(() => {
              resolve();
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

const __removeOrgTemplates = org => {
  return new Promise((resolve, reject) => {
    const promises = [];

    Template.find({ _id: { $in: org.templateIds } }, function(err, templates) {
      const findAllTemplates = templates.map(template => {
        const removeTemplates = new Promise((resolve, reject) => {
          // remove template from the database
          template.remove(err => {
            if (err) {
              reject();
            }
            resolve();
          });
        });
        promises.push(removeTemplates);
      });

      Promise.all(findAllTemplates)
        .then(() => {
          return Promise.all(promises)
            .then(() => {
              resolve();
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

const ___removeBuildingUtilities = building => {
  return new Promise((resolve, reject) => {
    const promises = [];

    Utility.find({ _id: { $in: building.utilityIds } }, function(
      err,
      utilities
    ) {
      const findAllUtilities = utilities.map(utility => {
        const removeUtilities = new Promise((resolve, reject) => {
          // remove utility from the database
          utility.remove(err => {
            if (err) {
              reject();
            }
            resolve();
          });
        });
        promises.push(removeUtilities);
      });

      Promise.all(findAllUtilities)
        .then(() => {
          return Promise.all(promises)
            .then(() => {
              resolve();
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

const ___removeBuildingProjects = building => {
  return new Promise((resolve, reject) => {
    const promises = [];

    Project.find({ _id: { $in: building.projectIds } }, function(
      err,
      projects
    ) {
      const findAllProjects = projects.map(project => {
        const removeProjects = new Promise((resolve, reject) => {
          // remove project from the database
          project.remove(err => {
            if (err) {
              reject();
            }
            resolve();
          });
        });
        promises.push(removeProjects);
      });

      Promise.all(findAllProjects)
        .then(() => {
          return Promise.all(promises)
            .then(() => {
              resolve();
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

const __removeOrgBuildings = org => {
  return new Promise((resolve, reject) => {
    const promises = [];

    Building.find({ _id: { $in: org.buildingIds } }, function(err, buildings) {
      const findAllBuildings = buildings.map(building => {
        const removeBuildings = new Promise((resolve, reject) => {
          // remove all utilities that are tied to that building
          ___removeBuildingUtilities(building)
            .then(() => {
              // remove all projects that are tied to that building
              ___removeBuildingProjects(building)
                .then(() => {
                  // remove building from the database
                  building.remove(err => {
                    if (err) {
                      reject();
                    }
                    resolve();
                  });
                })
                .catch(() => {});
            })
            .catch(() => {});
        });
        promises.push(removeBuildings);
      });

      Promise.all(findAllBuildings)
        .then(() => {
          return Promise.all(promises)
            .then(() => {
              resolve();
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

const _removeOrganization = org => {
  return new Promise((resolve, reject) => {
    // find all users in the org and remove the org reference from the user
    __removeOrgReferencesOnUsers(org)
      .then(() => {
        // remove all projects that are tied to that org
        __removeOrgProjects(org)
          .then(() => {
            // remove all templates that are tied to that org
            __removeOrgTemplates(org)
              .then(() => {
                // remove all buildings that are tied to that org
                __removeOrgBuildings(org)
                  .then(() => {
                    // find and remove org from the database
                    Organization.findOne({ _id: org._id }, function(err, org) {
                      if (err) {
                        reject();
                      }

                      org.remove(err => {
                        if (err) {
                          reject();
                        }
                        resolve();
                      });
                    });
                  })
                  .catch(() => {});
              })
              .catch(() => {});
          })
          .catch(() => {});
      })
      .catch(() => {});
  });
};

const _findAllUserOrgs = orgsArray => {
  return new Promise((resolve, reject) => {
    const promises = [];
    const orgObjects = [];

    Organization.find({ _id: { $in: orgsArray } }, function(err, orgs) {
      const findAllOrgs = orgs.map(org => {
        const pushOrgObject = new Promise(resolve => {
          // push org object into array
          orgObjects.push(org);
          resolve();
        });
        promises.push(pushOrgObject);
      });

      Promise.all(findAllOrgs)
        .then(() => {
          return Promise.all(promises)
            .then(() => {
              resolve(orgObjects);
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
 * Get user objects from emails
 */
exports.adminGetUsers = function(req, res, next) {
  const body = req.body;
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

  if (!body.userEmails) {
    return util.sendError(
      "Please enter emails for each user you want to view in the database",
      401,
      req,
      res,
      next
    );
  }

  User.find({ email: body.userEmails }, function(err, users) {
    if (err) {
      return util.sendError(err, 400, req, res, next);
    }

    // Return the user object(s)
    res.sendResult = {
      status: "Success",
      message: "Retrieved Users",
      users: users
    };
    return next();
  });
};

/**
 * Get user objects
 */
exports.adminGetUsersV2 = async function(req, res, next) {
  const user = req.user;
  const range = req.params.range || [0, 100];
  const filter = req.query.filter ? JSON.parse(req.query.filter) : {};

  // check for admin users
  if (!user.isAdmin === true) {
    return util.sendError("Invalid Administrator Access.", 401, req, res, next);
  }

  try {
    const users = await User.find(filter)
      .skip(range[0])
      .limit(range[1])
      .exec();

    // Return the user object(s)
    res.set("X-Total-Count", users.length);
    res.sendResult = users;
    return next();
  } catch (err) {
    console.error(err);
    return util.sendError(err, 400, req, res, next);
  }
};

/**
 * Get user obj by ID
 */
exports.getUserV2 = function(req, res, next) {
  const userId = req.params.userId;

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

    cleanUser(user);

    res.sendResult = user;
    return next();
  });
};

/**
 * Get organization objects from names
 */
exports.adminGetOrganizations = function(req, res, next) {
  const body = req.body;
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

  if (!body.organizationNames) {
    return util.sendError(
      "Please enter emails for each user you want to view in the database",
      401,
      req,
      res,
      next
    );
  }

  Organization.find({ name: body.organizationNames }, function(
    err,
    organizations
  ) {
    if (err) {
      return util.sendError(err, 400, req, res, next);
    }

    // Return the user object(s)
    res.sendResult = {
      status: "Success",
      message: "Retrieved organizations",
      organizations: organizations
    };
    return next();
  });
};

exports.adminGetUsersOrganizations = function(req, res, next) {
  const userId = req.body.userId;

  User.findOne({ _id: userId }, function(err, user) {
    if (err) {
      return util.sendError(err, 400, req, res, next);
    }

    if (user.orgIds && user.orgIds.length > 0) {
      Organization.find({ _id: { $in: user.orgIds } }, function(
        err,
        organizations
      ) {
        if (err) {
          return util.sendError(err, 400, req, res, next);
        }

        const cleanedOrganizations = [];

        // clean buildings list to only include what is need on building list view
        const cleanOrganizationForList = function(organizations) {
          organizations.map(organization => {
            const cleanedOrganization = {};

            cleanedOrganization._id = organization._id;
            cleanedOrganization.name = organization.name;
            cleanedOrganization.users = organization.users;
            cleanedOrganization.orgType = organization.orgType;
            cleanedOrganization.buildingCount = organization.buildingIds.length;
            cleanedOrganization.projectCount = organization.projectIds.length;
            // to account for new naming convention
            cleanedOrganization.wordReportCount = organization.wordIds
              ? organization.wordIds.length
              : organization.templateIds.length;

            cleanedOrganizations.push(cleanedOrganization);
          });
        };

        cleanOrganizationForList(organizations);

        // Return organizations list
        res.sendResult = {
          status: "Success",
          message: "Retrieved User Organizations",
          organizations: cleanedOrganizations
        };
        return next();
      });
    } else {
      // Return organizations list
      res.sendResult = {
        status: "Success",
        message: "No Organizations found for this user"
      };
      return next();
    }
  });
};

const formatAuth0Profile = (user) => {
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
  }
  if(user.image && user.image!= "") {
    profile.picture = user.image
  }
  return profile
}

/**
 * Update any details on the user object
 */
exports.adminUpdateUser = function(req, res, next) {
  const body = req.body;
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

  if (!body.userId) {
    return util.sendError(
      "Please enter the ID of the user you want to update",
      401,
      req,
      res,
      next
    );
  }

  // Never allow anyone to modify these fields so remove from the req body
  const deletedFields = [];
  const deleteFields = [
    "orgIds",
    "portfolio",
    "expert",
    "roles",
    "salt",
    "created",
    "updated",
    "resetPassword",
    "resetPasswordExpires",
    "apiKeyId",
    "__v",
    "_id",
    ""
  ];
  deleteFields.map(field => {
    if (body[field]) {
      deletedFields.push(field);
      delete body[field];
    }
  });

  if (deletedFields.length > 0) {
    return util.sendError(
      "You are not allowed to edit these fields - " +
        deletedFields.join(", ") +
        ".",
      400,
      req,
      res,
      next
    );
  }

  // check types for validation
  if (
    body.hasOwnProperty("firebaseRefs") &&
    typeof body.firebaseRefs !== "object"
  ) {
    return util.sendError(
      'Field "firebaseRefs" must be an object with "userId" and "orgId" inside.',
      400,
      req,
      res,
      next
    );
  }
  if (body.hasOwnProperty("settings") && typeof body.settings !== "object") {
    return util.sendError(
      'Field "settings" must be an object with appropriate key/value pairs inside.',
      400,
      req,
      res,
      next
    );
  }

  // validate password requirements
  if (body.hasOwnProperty("password") && !passwordRegex.test(body.password)) {
    return util.sendError(
      "Passwords must be 8 characters long and contain at least at least one uppercase letter, one lowercase letter, one number and one special character.",
      400,
      req,
      res,
      next
    );
  }

  User.findOne({ _id: body.userId }, function(err, user) {
    if (err) {
      return util.sendError(err, 400, req, res, next);
    }
    let requirePasswordUpdate = false;
    // update the user for all easy key value pairs
    Object.keys(body).forEach(field => {
      if (field === "password") {
        // update a few more things when requesting a new password
        user.password = body[field];
        user.salt = undefined; // Clear the salt so the presave hook fires
        user.resetPassword = "";
        user.resetPasswordExpires = new Date();
        user.updated = Date.now();
        user.lastPasswordReset = Date.now();
        requirePasswordUpdate = true;
      } else {
        user = _.extend(user, {
          [field]: body[field]
        });
      }
    });

    user.save(function(err, user) {
      if (err) {
        return util.sendError(err, 400, req, res, next);
      }

      const updatedProfile = formatAuth0Profile(user);
      if (requirePasswordUpdate && body.password) {
        updatedProfile.password = body.password;
      }
      auth0ManagementClient.updateUser({
        id: `auth0|${body.userId}`
      }, updatedProfile, function (err, user) {
        if (err) {
          console.log(err);
          // Handle error.
        }
        // Return the user object
        res.sendResult = {
          status: "Success",
          message: "Updated User",
          updatedUser: user
        };
        return next();
      });
    });
  });
};

/**
 * Change a user's role on the organization object
 */

exports.adminUpdateUsersRoles = function(req, res, next) {
  const body = req.body;
  const org = req.organization;
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

  if (!org) {
    return util.sendError(
      "Please enter the organization you want to update.",
      401,
      req,
      res,
      next
    );
  }

  if (!body.userId) {
    return util.sendError(
      "Please enter the ID of the user you want to update.",
      401,
      req,
      res,
      next
    );
  }

  if (!body.role) {
    return util.sendError(
      "Please enter the role for the user you want to update.",
      401,
      req,
      res,
      next
    );
  }

  // find the user in the org user list, and change the role
  const foundIndex = org.users.findIndex(
    user => user.userId.toString() === body.userId.toString()
  );
  org.users[foundIndex].userRole = body.role;

  // save the org
  org.save(function(err, organization) {
    if (err) {
      return util.sendError(err.message, 400, req, res, next);
    }

    // Return the organization object
    res.sendResult = {
      status: "Success",
      message: "Updated User's role",
      organization: organization
    };
    return next();
  });
};

/**
 * Remove a user from the organization object
 * - remove reference to the organization on the user object
 */

exports.adminRemoveUserFromOrg = function(req, res, next) {
  const body = req.body;
  const org = req.organization;
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

  if (!org) {
    return util.sendError(
      "Please enter the organization you want to update.",
      401,
      req,
      res,
      next
    );
  }

  if (!body.userId) {
    return util.sendError(
      "Please enter the ID of the user you want to remove.",
      401,
      req,
      res,
      next
    );
  }

  // find the user in the org user list, and remove
  const foundIndex = org.users.findIndex(
    user => user.userId.toString() === body.userId.toString()
  );
  if (foundIndex >= 0) {
    org.users.splice(foundIndex, 1);
  } else {
    return util.sendError(
      "User does not exist in this organization",
      400,
      req,
      res,
      next
    );
  }

  // save the org
  org.save(function(err, organization) {
    if (err) {
      return util.sendError(err.message, 400, req, res, next);
    }

    // find the user
    User.findOne({ _id: body.userId }, function(err, user) {
      if (err) {
        return util.sendError(
          err || "User does not exist",
          400,
          req,
          res,
          next
        );
      }

      // remove org id from the user object
      const foundIndex = user.orgIds.findIndex(
        orgId => orgId.toString() === org._id.toString()
      );
      if (foundIndex > 0) {
        user.orgIds.splice(foundIndex, 1);
      } else {
        return util.sendError(
          "Organization not exist on this user",
          400,
          req,
          res,
          next
        );
      }

      user.save(function(err) {
        if (err) {
          return util.sendError(err.message, 400, req, res, next);
        }

        // Return the organization object
        res.sendResult = {
          status: "Success",
          message: "Removed User from Organization",
          organization: organization
        };
        return next();
      });
    });
  });
};

/**
 * Add an existing user to an existing organization
 * - add the organization reference on the user object
 */
exports.adminAddUserToOrg = function(req, res, next) {
  const body = req.body;
  const org = req.organization;
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

  if (!org) {
    return util.sendError(
      "Please enter the organization you want to update.",
      401,
      req,
      res,
      next
    );
  }

  if (!body.userId) {
    return util.sendError(
      "Please enter the ID of the user you want to add.",
      401,
      req,
      res,
      next
    );
  }

  // make sure the user doesn't already exist on the organization object
  const foundIndex = org.users.findIndex(
    user => user.userId.toString() === body.userId.toString()
  );
  if (foundIndex >= 0) {
    return util.sendError(
      "User already exists in this organization",
      400,
      req,
      res,
      next
    );
  }

  // push new user object to user array on org
  org.users.push({
    userId: body.userId,
    userRole: body.role || "editor", // default of editor role if none is given in request body
    buildingIds: ["all"],
    templateIds: ["all"]
  });

  // save the org
  org.save(function(err, organization) {
    if (err) {
      return util.sendError(err.message, 400, req, res, next);
    }

    // find the user
    User.findOne({ _id: body.userId }, function(err, user) {
      if (err) {
        return util.sendError(
          err || "User does not exist",
          400,
          req,
          res,
          next
        );
      }

      // add org id to the user object org ids array
      user.orgIds.push(org._id);

      user.save(function(err) {
        if (err) {
          return util.sendError(err.message, 400, req, res, next);
        }

        // Return the organization object
        res.sendResult = {
          status: "Success",
          message: "Added User to Organization",
          organization: organization
        };
        return next();
      });
    });
  });
};

exports.adminGetOrganizationsV2 = async function(req, res, next) {
  const user = req.user;
  const range = req.params.range || [0, 100];
  const filter = req.query.filter ? JSON.parse(req.query.filter) : {};

  // check for admin users
  if (!user.isAdmin === true) {
    return util.sendError("Invalid Administrator Access.", 401, req, res, next);
  }

  try {
    let organizations = await Organization.find(filter)
      .skip(range[0])
      .limit(range[1])
      .lean()
      .exec();
    organizations = organizations.map(organization => ({
      ...organization,
      userIds: organization.users.map(user => user.userId)
    }));

    res.set("X-Total-Count", organizations.length);
    res.sendResult = organizations;
    return next();
  } catch (err) {
    console.error(err);
    return util.sendError(err, 400, req, res, next);
  }
};

/**
 * Add an existing user to an existing organization
 * - add the organization reference on the user object
 */
exports.adminAddUserToOrgV2 = async function(req, res, next) {
  const body = req.body;
  const organizationId = req.params.organizationId;
  const userId = req.params.userId;

  // check for admin users
  if (!user.isAdmin === true) {
    return util.sendError("Invalid Administrator Access.", 401, req, res, next);
  }

  const organization = await Organization.findOne({ _id: organizationId });
  if (!organization) {
    return util.sendError("Organization not found", 404, req, res, next);
  }

  // make sure the user doesn't already exist on the organization object
  if (organization.users.some(user => user.userId.toString() === userId)) {
    return util.sendError(
      "User already exists in this organization",
      400,
      req,
      res,
      next
    );
  }

  const user = await User.findOne({ _id: userId });
  if (!user) {
    return util.sendError("User not found", 400, req, res, next);
  }

  // push new user object to user array on org
  organization.users.push({
    userId,
    userRole: body.role || "editor", // default of editor role if none is given in request body
    buildingIds: ["all"],
    templateIds: ["all"]
  });

  try {
    const updated = await organization.save();
    // find the user
    user.orgIds.push(organization._id);

    await user.save();

    // Return the organization object
    res.sendResult = updated;
    return next();
  } catch (err) {
    return util.sendError(err.message, 400, req, res, next);
  }
};

/**
 * Remove a user from the database
 * - remove the user's personal organization
 * - remove the user object in the user array on each organization object they are a part of
 */

exports.adminRemoveUserFromDB = function(req, res, next) {
  const body = req.body;
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

  if (!body.userId) {
    return util.sendError(
      "Please enter the ID of the user you want to remove.",
      401,
      req,
      res,
      next
    );
  }

  // find the user
  User.findOne({ _id: body.userId }, function(err, user) {
    if (err) {
      return util.sendError(err || "User does not exist", 400, req, res, next);
    }

    _findAllUserOrgs(user.orgIds).then(orgsArray => {
      let rootOrg = {};
      orgsArray.map((org, index) => {
        // make sure it's a type of root org
        // make sure there is only one user
        // make sure the user you are deleting is the only user in the group
        if (
          org.orgType === "root" &&
          org.users.length === 1 &&
          org.users[0].userId.toString() === body.userId.toString()
        ) {
          // set it as the root org
          rootOrg = org;
          // remove from the orgsArray and use this later
          orgsArray.splice(index, 1);
        }
      });

      // delete the org
      _removeOrganization(rootOrg).then(() => {
        // delete all references to this user on all other orgs they are a part of
        _removeUserReferencesOnOrgs(body.userId, orgsArray).then(() => {
          // remove user from the database
          user.remove(err => {
            if (err) {
              return util.sendError(err.message, 400, req, res, next);
            }

            // Return the object
            res.sendResult = {
              status: "Success",
              message: "Removed User from database"
            };
            return next();
          });
        });
      });
    });
  });
};

/**
 * Remove an organization
 * - remove all org references on all user object's who were a part of the organization
 * - remove all projects that belongs to that organization
 * - remove all templates that belongs to that organization
 * - remove all buildings that belonged to that organization
 *    - remove all project that belongs to each of the deleted buildings
 *    - remove all utilities that belongs to each of the deleted buildings
 */
exports.adminRemoveOrg = function(req, res, next) {
  const org = req.organization;
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

  if (!org) {
    return util.sendError(
      "Please enter the organization you want to update.",
      401,
      req,
      res,
      next
    );
  }

  _removeOrganization(org)
    .then(() => {
      // Return the object
      res.sendResult = {
        status: "Success",
        message: "Removed Organization"
      };
      return next();
    })
    .catch(() => {});
};
