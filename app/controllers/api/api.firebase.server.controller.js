"use strict";

/**
 * Module dependencies.
 */
const mongoose = require("mongoose");
const Building = mongoose.model("Building");
const util = require("./utils/api.utils");
const validate = require("./utils/api.validation");
const firebaseClient = require("./utils/api.firebase.client");

/*
 * Check if object is already in loop
 */
const containsObject = (id, list) => {
  let i;
  for (i = 0; i < list.length; i++) {
    if (list[i].buildingId === id) {
      return true;
    }
  }
  return false;
};

/**
 * Get all energy auditor buildings in an organization
 */
exports.getFirebaseBuildings = function (req, res, next) {
  const user = req.user;
  const buildeeOrgId = req.organization;
  const reqOrgId = req.query.orgId;
  let buildingIds;

  const orgUserObj = buildeeOrgId.users.find((obj) => { return obj.userId.toString() === user._id.toString(); });

  if (!orgUserObj) {
    return util.sendError("Permission denied.", 400, req, res, next);
  }

  if (orgUserObj && orgUserObj.buildingIds && orgUserObj.buildingIds[0] === "all") {
    buildingIds = buildeeOrgId.buildingIds;
  } else {
    buildingIds = orgUserObj.buildingIds;
  }

  // Check required data
  if (!reqOrgId) {
    return util.sendError("Field \"orgId\" is required.", 400, req, res, next);
  }
  // Validate request data
  if (!validate.valFirebaseId(reqOrgId)) {
    return util.sendError("Field \"orgId\" is invalid.", 400, req, res, next);
  }
  const options = {
    path: [
      reqOrgId.trim(),
    ].join(""),
    formatter: (req.query.avoidCleanForReport) ? null : "report",
  };

  firebaseClient.getAudit(options, function (err, result) {
    if (err) {
      return util.sendError(err, 400, req, res, next);
    }

    const usersResults = JSON.parse(JSON.stringify(result.users));

    // get all buildings with all audits
    const userBuildingsWithAudits = [];
    // for every user
    for (const userId in result.users) {
      const value = result.users[userId];

      if (value.buildings) {
        const userBuildings = value.buildings;
        // for every building
        for (const buildingId in userBuildings) {
          // get client and site(project) name for building
          var siteName, clientName;
          let breakLoop = false;

          if (result.clients && !breakLoop) {
            var tempClientName, tempSiteName;
            for (const client in result.clients) {
              tempClientName = result.clients[client].name;
              if (result.clients[client].projects && !breakLoop) {
                const projects = result.clients[client].projects;
                for (const project in projects) {
                  tempSiteName = projects[project].name;
                  if (projects[project].buildings && !breakLoop) {
                    const clientBuildings = projects[project].buildings;
                    for (const clientBuilding in clientBuildings) {
                      if (buildingId === clientBuilding) {
                        breakLoop = true;
                        siteName = tempSiteName;
                        clientName = tempClientName;
                        break;
                      }
                    }
                  }
                }
              }
            }
          }

          usersResults[userId].buildings[buildingId].clientName = clientName;
          usersResults[userId].buildings[buildingId].siteName = siteName;

          const buildings = userBuildings[buildingId];

          // create object with buildingId and empty audits array
          if (userBuildings.hasOwnProperty(buildingId)) {
            // if the building id has not already been created (to avoid duplicates)
            if (!containsObject(buildingId, userBuildingsWithAudits)) {
              userBuildingsWithAudits.push({
                buildingId: buildingId,
                clientName: clientName,
                siteName: siteName,
                audits: [],
              });
            }

            if (buildings.audits) {
              const audits = buildings.audits;
              // for every audit
              for (const audit in audits) {
                for (let i = 0; i < userBuildingsWithAudits.length; i++) {
                  // if the buildingId matches up with building from new array
                  if (userBuildingsWithAudits[i].buildingId === buildingId) {
                    // save the submitted date first (if there is one)
                    userBuildingsWithAudits[i].audits.push({
                      auditId: audit,
                      date: audits[audit].submitted ? "Submitted: " + audits[audit].submitted : "Created: " + audits[audit].createdDate,
                      userId: userId,
                    });
                  }
                }
              }
            }
          }
        }
      }
    }

    Building.find({ _id: { $in: buildingIds } }, function (err, buildings) {
      if (err) {
        return util.sendError(err, 400, req, res, next);
      }

      // save firebase audits to building in mongo if the building ids match up
      userBuildingsWithAudits.map((fbBuildingAudits) => {
        if (buildings.length) {
          buildings.map((building) => {
            if (building.firebaseRefs.buildingId === fbBuildingAudits.buildingId) {
              Building.findById(building._id, function (err, foundBuilding) {
                foundBuilding.eaAuditsInfo = fbBuildingAudits.audits;
                foundBuilding.save();
              });
            }
          });
        }
      });
    });

    // Clean any empty fields present in the result
    result = util.cleanEmptyProps(result);

    // Return the audit obj
    res.sendResult = {
      status: "Success",
      message: "Retrieved All Firebase Buildings in Organization",
      users: usersResults || result.users || {},
    };
    return next();
  });
};

/**
 * Get energy auditor audit in firebase, per passed orgId/userId/buildingId/auditId
 */
exports.getFirebaseComponent = function (req, res, next) {
  const reqOrgId = req.query.orgId;
  const reqUserId = req.query.userId;
  const reqBuildingId = req.query.buildingId;
  const reqAuditId = req.query.auditId;
  const componentType = req.query.componentType;
  const componentId = req.query.componentId;

  // Check required data
  if (!reqOrgId) {
    return util.sendError("Field \"orgId\" is required.", 400, req, res, next);
  }
  if (!reqUserId) {
    return util.sendError("Field \"userId\" is required.", 400, req, res, next);
  }
  if (!reqBuildingId) {
    return util.sendError("Field \"buildingId\" is required.", 400, req, res, next);
  }
  if (!reqAuditId) {
    return util.sendError("Field \"auditId\" is required.", 400, req, res, next);
  }

  // Validate request data
  if (!validate.valFirebaseId(reqOrgId)) {
    return util.sendError("Field \"orgId\" is invalid.", 400, req, res, next);
  }
  if (!validate.valFirebaseId(reqUserId)) {
    return util.sendError("Field \"userId\" is invalid.", 400, req, res, next);
  }
  if (!validate.valFirebaseId(reqBuildingId)) {
    return util.sendError("Field \"buildingId\" is invalid.", 400, req, res, next);
  }
  if (!validate.valFirebaseId(reqAuditId)) {
    return util.sendError("Field \"auditId\" is invalid.", 400, req, res, next);
  }

  const options = {
    path: [
      reqOrgId.trim(),
      "/users/" + reqUserId.trim() +
      "/buildings/" + reqBuildingId.trim() +
      "/audits/" + reqAuditId.trim() +
      "/" + componentType + "/" + componentId.trim(),
    ].join(""),
    // formatter: (req.query.avoidCleanForReport) ? null : 'report',
  };

  firebaseClient.getAudit(options, function (err, result) {
    if (err) {
      return util.sendError(err, 400, req, res, next);
    }

    // Clean any empty fields present in the result
    result = util.cleanEmptyProps(result);

    // Return the audit obj
    res.sendResult = {
      status: "Success",
      message: "Retrieved Firebase Component",
      component: result || {},
    };
    return next();
  });
};

/**
 * Get new firebase audit and change audit in building
 */
exports.changeFirebaseAudit = function (req, res, next) {
  const reqOrgId = req.query.orgId;
  const reqUserId = req.query.userId;
  const reqBuildingId = req.query.buildingId;
  const reqAuditId = req.query.auditId;
  const reqBuildeeBuildingId = req.query.buildeeBuildingId;

  // Check required data
  if (!reqOrgId) {
    return util.sendError("Field \"orgId\" is required.", 400, req, res, next);
  }
  if (!reqUserId) {
    return util.sendError("Field \"userId\" is required.", 400, req, res, next);
  }
  if (!reqBuildingId) {
    return util.sendError("Field \"buildingId\" is required.", 400, req, res, next);
  }
  if (!reqAuditId) {
    return util.sendError("Field \"auditId\" is required.", 400, req, res, next);
  }
  if (!reqBuildeeBuildingId) {
    return util.sendError("Field \"reqBuildeeBuildingId\" is required.", 400, req, res, next);
  }

  // Validate request data
  if (!validate.valFirebaseId(reqOrgId)) {
    return util.sendError("Field \"orgId\" is invalid.", 400, req, res, next);
  }
  if (!validate.valFirebaseId(reqUserId)) {
    return util.sendError("Field \"userId\" is invalid.", 400, req, res, next);
  }
  if (!validate.valFirebaseId(reqBuildingId)) {
    return util.sendError("Field \"buildingId\" is invalid.", 400, req, res, next);
  }
  if (!validate.valFirebaseId(reqAuditId)) {
    return util.sendError("Field \"auditId\" is invalid.", 400, req, res, next);
  }

  const options = {
    path: [
      reqOrgId.trim(),
      "/users/" + reqUserId.trim() +
      "/buildings/" + reqBuildingId.trim() +
      "/audits/" + reqAuditId.trim(),
    ].join(""),
    // formatter: (req.query.avoidCleanForReport) ? null : 'report',
  };

  firebaseClient.getAudit(options, function (err, result) {
    if (err) {
      return util.sendError(err, 400, req, res, next);
    }

    // Clean any empty fields present in the result
    result = util.cleanEmptyProps(result);

    Building.findById(reqBuildeeBuildingId).exec(function (err, building) {
      if (err || !building) {
        return util.sendError(err || "Invalid account.", 400, req, res, next);
      }

      // Mark as verified
      building.eaAudit = result;
      building.markModified("eaAudit");

      building.save(function (err) {
        if (err) {
          return util.sendError(err, 400, req, res, next);
        }

        // Return the audit obj
        res.sendResult = {
          status: "Success",
          message: "Retrieved new audit",
          audit: result || {},
        };
        return next();
      });
    });
  });
};

/**
 * Get a list of images, per passed orgId/buildingId
 */
exports.getImageList = function (req, res, next) {
  let reqOrgId = req.query.orgId;
  let reqUserId = req.query.userId;
  let reqBuildingId = req.query.buildingId;
  const reqAuditId = req.query.auditId;

  // Check required data
  if (!reqOrgId) {
    return util.sendError("Field \"orgId\" is required.", 400, req, res, next);
  }
  if (!reqUserId) {
    return util.sendError("Field \"userId\" is required.", 400, req, res, next);
  }
  if (!reqBuildingId) {
    return util.sendError("Field \"buildingId\" is required.", 400, req, res, next);
  }

  // Validate request data
  if (!validate.valFirebaseId(reqOrgId)) {
    return util.sendError("Field \"orgId\" is invalid.", 400, req, res, next);
  }
  if (!validate.valFirebaseId(reqUserId)) {
    return util.sendError("Field \"userId\" is invalid.", 400, req, res, next);
  }
  if (!validate.valFirebaseId(reqBuildingId)) {
    return util.sendError("Field \"buildingId\" is invalid.", 400, req, res, next);
  }
  if (reqAuditId && !validate.valFirebaseId(reqAuditId)) {
    return util.sendError("Field \"auditId\" is invalid.", 400, req, res, next);
  }

  reqOrgId = reqOrgId.trim();
  reqUserId = reqUserId.trim();
  reqBuildingId = reqBuildingId.trim();

  let path = reqOrgId + "/users/" + reqUserId + "/buildings/" + reqBuildingId;
  if (reqAuditId) path += "/audits/" + reqAuditId.trim();

  const options = {
    path: path,
    orgId: reqOrgId,
    buildingId: reqBuildingId,
  };

  firebaseClient.getImageList(options, function (err, result) {
    if (err) {
      return util.sendError(err, 400, req, res, next);
    }

    // Return the audit obj
    res.sendResult = {
      status: "Success",
      message: "Retrieved Firebase Image List",
      files: result || {},
    };
    return next();
  });
};
