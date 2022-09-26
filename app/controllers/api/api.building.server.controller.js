"use strict";

/**
 * Module dependencies.
 */
const _ = require("lodash");
const mongoose = require("mongoose");
const Building = mongoose.model("Building");
const Measure = mongoose.model("Measure");
const Project = mongoose.model("Project");
const Organization = mongoose.model("Organization");
const Utility = mongoose.model("Utility");
const MonthlyUtility = mongoose.model("MonthlyUtility");
const util = require("./utils/api.utils");
const validate = require("./utils/api.validation");
const {
  _copyBuildingData,
  calculateRates,
  createBuildingUtilityData
} = require("./utils/api.building.util");
const { updateProjectIdsForBuilding } = require("./utils/api.project.util");
const analysisClient = require("./utils/api.analysis.client");
const firebaseClient = require("./utils/api.firebase.client");
const monthlyUtil = require("../../monthlyutilities/monthlyutilities.service");
const salesforce = require("../../salesforce/salesforce.building");
const sampleBuildingUseTypes = require("../../static/building-use-types.js");

const buildingSyncScript = require("../../scripts/buildingSync.script");
const { PARTITION_KEYS } = require("../../../config/realm");

const ANALYSIS_TYPE_MAPPER = analysisClient.getAnalysisTypeMap();

exports.getAnalysisBenchmark = function(building, done) {
  if (!building) {
    return done(
      "Issues with building data to get general benchmark results.",
      null
    );
  }

  const request = {
    occupancy: building.buildingUse,
    size: building.squareFeet,
    zipcode: building.location.zipCode,
    open24: building.open247,
    stories: building.floorCount,
    vintage: building.buildYear,
    wwr: 0.3
  };

  analysisClient.getBenchmark(request, "general", function(err, response) {
    // if (err || !response) return done('Issues getting building general benchmark results.', null);
    if (err || !response) {
      console.error(
        "Issues getting building general benchmark results on building create.",
        err
      );
    }

    const benchmark = {
      general:
        response && response[ANALYSIS_TYPE_MAPPER.general]
          ? response[ANALYSIS_TYPE_MAPPER.general]
          : 0
    };

    return done(null, benchmark);
  });
};

const _saveFirebaseMeasuresAsProjects = function(
  auditMeasuresArr,
  building,
  done
) {
  if (!auditMeasuresArr) return done(null, []);
  if (
    !auditMeasuresArr.measures ||
    !auditMeasuresArr.measures.length ||
    !auditMeasuresArr.components
  ) {
    return done(null, []);
  }

  function __saveProjectsPerBaseMeasure(measuresMap) {
    let baseMeasure;
    const countIterator = [];
    const iterators = [];
    const projects = [];
    const errorsArr = [];

    auditMeasuresArr.measures.map(function(measure) {
      baseMeasure = measuresMap[measure.name];

      // Create a project for each measure reference and grab its unique component data if it is populate,
      // else fall to default value set in the base measure
      Object.keys(measure.references).map(function(componentType) {
        measure.references[componentType].map(function(refId) {
          countIterator.push(refId);

          const measureFields = {};
          // Get all the measures fields, and overwrite if there is a firebase mapping
          if (baseMeasure.fields.length) {
            baseMeasure.fields.map(function(field) {
              let fbPath;
              if (field.firebase_input) {
                fbPath = field.firebase_input.substring(
                  field.firebase_input.indexOf("${refId}") + 9
                );
              }
              measureFields[field.name] = fbPath
                ? util.getValueFromObjPerPath.call(
                    auditMeasuresArr.components[componentType][refId],
                    fbPath
                  )
                : field.default;
            });
          }

          // Create the body of the request for this project
          const body = {
            measure: measureFields,
            incentive: baseMeasure.incentive,
            finance: {
              discount_rate: building.rates.discountRate,
              finance_rate: building.rates.financeRate,
              inflation_rate: building.rates.inflationRate,
              reinvestment_rate: building.rates.reinvestmentRate,
              investment_period: building.rates.investmentPeriod
              // project_cost: 0,
              // maintenance_savings: 0
            }
          };
          // Create the new project and save
          const project = new Project({
            name: baseMeasure.name,
            displayName: baseMeasure.name + "_" + Date.now(),
            runResults: [
              {
                buildingId: building._id,
                request: {
                  name: baseMeasure.name,
                  displayName: baseMeasure.displayName,
                  body: body
                }
              }
            ],
            measureId: baseMeasure._id,
            createdByUserId: building.createdByUserId,
            imageUrls: []
          });

          project.save(function(err) {
            iterators.push(1);

            if (err) {
              errorsArr.push(err);
            } else {
              projects.push(project);
            }

            if (iterators.length === countIterator.length) {
              return done(errorsArr, projects);
            }
          });
        });
      });
    });
  }

  const iteratorsMap = [];
  const measureResultMap = {};
  // Lookup the base measures and store to a mapper, after all measure results have been found, continue
  // The "displayName" of the measure is unique
  auditMeasuresArr.measures.map(function(auditMeasure, index) {
    Measure.findOne({ displayName: auditMeasure.name })
      .lean(true)
      .exec(function(err, measureResult) {
        iteratorsMap.push(1);
        measureResultMap[auditMeasure.name] = measureResult || null;
        if (iteratorsMap.length === auditMeasuresArr.measures.length) {
          return __saveProjectsPerBaseMeasure(measureResultMap);
        }
      });
  });
};

const _checkFirebaseMeasures = function(firebaseRefs, done) {
  const options = {
    path: [
      firebaseRefs.orgId,
      "/users/" + firebaseRefs.userId,
      "/buildings/" + firebaseRefs.buildingId,
      "/audits/" + firebaseRefs.auditId
    ].join(""),
    formatter: "measuresMap"
  };

  firebaseClient.getAudit(options, function(err, result) {
    if (err) return done(err, null);

    // Clean any empty fields present in the result
    result = util.cleanEmptyProps(result);

    return done(null, result);
  });
};

const _createBuildingObject = (buildings, user, organization) => {
  const tmpModelsArr = [];
  const errorsArr = [];
  const partition = organization
    ? `${PARTITION_KEYS.BUILDING_LIST}=${organization._id.toString()}`
    : null;
  return new Promise((resolve, reject) => {
    const buildingPromise = buildings.map(function(building, index) {
      const validationErrorsArr = [];
      // Check firebase refs if they are part of the request
      if (!_.isEmpty(building.firebaseRefs)) {
        // Validate building data
        if (!validate.valFirebaseId(building.firebaseRefs.orgId)) {
          validationErrorsArr.push({
            message: 'Field "firebaseRefs.orgId" is invalid.'
          });
        }
        if (!validate.valFirebaseId(building.firebaseRefs.userId)) {
          validationErrorsArr.push({
            message: 'Field "firebaseRefs.userId" is invalid.'
          });
        }
        if (!validate.valFirebaseId(building.firebaseRefs.buildingId)) {
          validationErrorsArr.push({
            message: 'Field "firebaseRefs.buildingId" is invalid.'
          });
        }
        if (!validate.valFirebaseId(building.firebaseRefs.auditId)) {
          validationErrorsArr.push({
            message: 'Field "firebaseRefs.auditId" is invalid.'
          });
        }
        // If there were validation errors, include in the error array sent back to client
        if (validationErrorsArr.length) {
          errorsArr.push({
            error: {
              message: 'Issues with the provided "firebaseRefs".',
              errors: validationErrorsArr
            },
            index: index
          });
        }
      }

      // Only create models with validated data
      if (!validationErrorsArr.length) {
        building.createdByUserId = user._id;
        if (building.location && building.location.zip) {
          building.zipCode = building.location.zip;
        }
        const tmpBuildingModel = new Building(building);
        tmpBuildingModel._partition = partition;
        tmpBuildingModel.benchmark = { general: 0 };
        tmpModelsArr.push({ building: tmpBuildingModel, index: index });
      } else {
        reject(validationErrorsArr);
      }
    });

    Promise.all(buildingPromise)
      .then(() => {
        resolve(tmpModelsArr);
      })
      .catch(err => {
        reject(err);
      });
  });
};

const _createPromises = tmpModelsArr => {
  return new Promise((resolve, reject) => {
    const promises = [];
    const buildingArr = [];
    const buildingIds = [];

    const modelPromise = tmpModelsArr.map(function(model, index) {
      const saveModel = new Promise(function(resolve, reject) {
        model.building.save(function(errBuilding, savedBuilding) {
          if (errBuilding) {
            reject(errBuilding);
          }
          if (savedBuilding) {
            buildingArr.push(savedBuilding);
            buildingIds.push(savedBuilding._id);
          }
          resolve();
        });
      });
      promises.push(saveModel);
    });

    Promise.all(modelPromise).then(() => {
      return Promise.all(promises)
        .then(() => {
          resolve([buildingArr, buildingIds]);
        })
        .catch(err => {
          reject(err);
        });
    });
  });
};

const _saveBuildings = function(buildings, user, organization) {
  return new Promise(function(resolve, reject) {
    _createBuildingObject(buildings, user, organization)
      .then(tmpModelsArr => {
        _createPromises(tmpModelsArr)
          .then(buildingInfo => {
            resolve(buildingInfo);
          })
          .catch(err => {
            reject(err);
          });
      })
      .catch(err => {
        reject(err);
      });
  });
};

/**
 * Get current user's buildings
 */
exports.getBuildings = function(req, res, next) {
  const user = req.user;
  const org = req.organization;
  let buildingIds = org.buildingIds;

  if (!req.apiKey) {
    const orgUserObj = org.users.find(obj => {
      return obj.userId.toString() === user._id.toString();
    });

    if (!orgUserObj) {
      return util.sendError("Permission denied.", 400, req, res, next);
    }

    if (orgUserObj.buildingIds[0] === "all") {
      buildingIds = org.buildingIds;
    } else {
      buildingIds = orgUserObj.buildingIds;
    }
  }

  Building.find({ _id: { $in: buildingIds } }, function(err, buildings) {
    if (err) {
      return util.sendError(err, 400, req, res, next);
    }

    const cleanedBuildings = [];

    // clean buildings list to only include what is need on building list view
    const cleanBuildingForList = function(buildings) {
      buildings.map(building => {
        const cleanedBuilding = { info: {} };

        cleanedBuilding._id = building._id;
        cleanedBuilding.benchmark = building.benchmark;
        cleanedBuilding.info.buildingName = building.buildingName;
        cleanedBuilding.info.buildingImage = building.buildingImage;
        cleanedBuilding.info.buildingUse = building.buildingUse;
        cleanedBuilding.info.squareFeet = building.squareFeet;
        cleanedBuilding.info.buildYear = building.buildYear;
        cleanedBuilding.info.buildingUseTypes = building.buildingUseTypes;
        cleanedBuilding.info.buildingAddress = building.location.address;
        cleanedBuilding.info.updated = building.updated || building.created;
        cleanedBuilding.info.energyStar = building.energyStar || false;
        cleanedBuilding.info.energystarIds = building.energystarIds || null;
        cleanedBuilding.projectIds = building.projectIds || [];
        cleanedBuilding.clientName = building.clientName || "";
        cleanedBuilding.siteName = building.siteName || "";
        cleanedBuilding.tags = building.tags || [];
        cleanedBuilding.archived = building.archived || false;
        cleanedBuilding.changePointModels = building.changePointModels;
        if (building.firebaseRefs && building.firebaseRefs.buildingId) {
          cleanedBuilding.firebaseRefs = {};
          cleanedBuilding.firebaseRefs.buildingId =
            building.firebaseRefs.buildingId;
        }
        cleanedBuildings.push(cleanedBuilding);
      });
    };

    cleanBuildingForList(buildings);

    // Return building list
    res.sendResult = {
      status: "Success",
      message: "Retrieved User Buildings",
      organization: req.organization || {},
      buildings: cleanedBuildings || []
    };
    return next();
  });
};

/**
 * Get single building by id
 */
exports.getBuilding = function(req, res, next) {
  const building = req.building;

  building.updated = Date.now();

  // update monthly utilities
  monthlyUtil.generate({ buildingIds: [building._id], update: true });

  // grab the ea audit if firebase refs exist and the audit in the building is empty
  // if (
  //   building.firebaseRefs &&
  //   building.firebaseRefs.orgId &&
  //   building.firebaseRefs.userId &&
  //   building.firebaseRefs.buildingId &&
  //   building.firebaseRefs.auditId &&
  //   Object.keys(building.eaAudit).length === 0 &&
  //   building.eaAudit.constructor === Object
  // ) {
  //   const options = {
  //     path: [
  //       building.firebaseRefs.orgId.trim(),
  //       "/users/" +
  //         building.firebaseRefs.userId.trim() +
  //         "/buildings/" +
  //         building.firebaseRefs.buildingId.trim() +
  //         "/audits/" +
  //         building.firebaseRefs.auditId.trim(),
  //     ].join(""),
  //   };
  //   firebaseClient.getAudit(options, function (err, audit) {
  //     if (err || !audit) {
  //       return util.sendError(err, 400, req, res, next);
  //     }
  //     // Clean any empty fields present in the result
  //     audit = util.cleanEmptyProps(audit);

  //     // save audit to building model
  //     building.eaAudit = audit;
  //     building.markModified("eaAudit");

  //     building.save(function (err) {
  //       if (err) {
  //         return util.sendError(err, 400, req, res, next);
  //       }

  //       res.sendResult = {
  //         status: "Success",
  //         message: "Retrieved Building",
  //         building: building,
  //       };
  //       return next();
  //     });
  //   });

  //   // if it doesn't have firebase refs and an empty eaAudit object
  // } else {
  building.save(function(err) {
    if (err) {
      return util.sendError(err, 400, req, res, next);
    }

    res.sendResult = {
      status: "Success",
      message: "Retrieved Building",
      building: building
    };
    return next();
  });
  // }
};

/**
 * Update a user building
 */
exports.updateBuilding = async function(req, res, next) {
  let user, org, message, buildingData;
  if (req.body && req.body.source === "survey") {
    /* For Survey - avoids user auth */
    user = req.body.user;
    org = req.organization;
    buildingData = req.body.building;
    message = req.body.message;
  } else {
    user = req.user;
    org = req.organization;
    buildingData = req.body;
    message = req.query.message;
  }

  if (!buildingData) {
    return util.sendError("Invalid request.", 400, req, res, next);
  }

  // Ensure a user can only update buildings if they are a part of the organization
  if (
    user.orgIds.indexOf(org._id) === -1 &&
    user.orgIds.indexOf(org._id.toString()) === -1
  ) {
    return util.sendError("Permission denied.", 400, req, res, next);
  }

  let newCreatedByUserId = buildingData.altCreatedByUserId;

  // Never allow client to modify these fields so remove from the req body
  const deleteFields = [
    "createdByUserId",
    "updated",
    "created",
    "building",
    "altCreatedByUserId"
  ];
  deleteFields.forEach(function(field) {
    delete buildingData[field];
  });

  const set = {
    ...buildingData,
    updated: Date.now(),
    benchmark: {},
    endUse: {},
    rerunAnalyses: true
  };

  if (newCreatedByUserId) {
    set.createdByUserId = newCreatedByUserId;
  }

  if (set.buildingUseTypes) {
    set.buildingUseTypes = [...set.buildingUseTypes].filter(
      item =>
        !!sampleBuildingUseTypes.find(useType => useType.value === item.use)
    );
  }

  try {
    const building = await Building.findByIdAndUpdate(
      req.params.buildingId,
      {
        $set: set
      },
      { new: true }
    );

    try {
      salesforce.updateBuildings([building], org);
      buildingSyncScript.sync({
        organizationId: org._id,
        buildingIds: [building._id],
        onlyRemove: false
      });
    } catch (err) {
      console.error("SalesForce was not updated:", err);
    }

    res.sendResult = {
      status: "Success",
      message: message || "Updated Building",
      building: building
    };
    return next();
  } catch (err) {
    return util.sendError(err, 400, req, res, next);
  }
};

const _deleteUtilsFromBuilding = building => {
  return new Promise(function(resolve, reject) {
    if (building.utilities && building.utilities.length > 0) {
      const utilMap = building.utilities.map((util, index) => {
        Utility.findById(util._id).exec(function(err, utility) {
          if (err) {
            reject();
          }
          utility.remove();
        });
      });
      Promise.all(utilMap).then(() => {
        resolve();
      });
    } else {
      resolve();
    }
  });
};

const _deleteBuildingRefsFromProjects = (userId, buildingId) => {
  return new Promise(function(resolve, reject) {
    const query = {
      createdByUserId: userId
    };

    Project.find(query)
      .lean(true)
      .exec(function(err, projects) {
        if (err) {
          reject();
        }
        if (projects && projects.length > 0) {
          const projectsMap = projects.map((project, index) => {
            if (
              project.runResults &&
              project.runResults &&
              project.runResults[buildingId]
            ) {
              Project.findById(project._id, function(err, foundProject) {
                if (err) {
                  reject();
                }
                const tempRun = Object.assign({}, foundProject.runResults);
                delete tempRun[buildingId];

                foundProject.runResults = tempRun;
                foundProject.save(function(err) {
                  if (err) {
                    reject();
                  }
                });
              });
            } else {
            }
          });
          Promise.all(projectsMap).then(() => {
            resolve();
          });
        } else {
          resolve();
        }
      });
  });
};

exports.deleteBuilding = function(req, res, next) {
  const user = req.user;
  const building = req.building;
  const organization = req.organization;

  _deleteUtilsFromBuilding(building).then(() => {
    _deleteBuildingRefsFromProjects(user._id, building._id).then(() => {
      const buildingIds = [...organization.buildingIds];

      for (let i = buildingIds.length - 1; i >= 0; i--) {
        if (buildingIds[i].toString() === building._id.toString()) {
          buildingIds.splice(i, 1);
        }
      }

      organization.buildingIds = buildingIds;

      organization.save(function(err) {
        if (err) {
          return util.sendError(err, 400, req, res, next);
        }

        building.remove(function(err) {
          if (err) {
            return util.sendError(err, 400, req, res, next);
          }
          buildingSyncScript.sync({
            organizationId: organization._id,
            buildingIds: [building._id],
            onlyRemove: true
          });
          res.sendResult = {
            status: "Success",
            message: "Removed Building"
          };

          return next();
        });
      });
    });
  });
};

/**
 * Calculate building rate
 */

exports.getBuildingRate = async (req, res, next) => {
  try {
    const {
      year,
      startMonth = "Jan",
      endMonth = "Dec",
      yearType = "CY"
    } = req.query;
    const buildingId = req.building._id.toString();

    let filter = {
      building: buildingId
    };
    if (yearType === "CY") {
      filter.year = year;
    } else {
      let startDate = new Date(`${year - 1} ${startMonth} 1`);
      let endDate = new Date(`${year} ${endMonth} 2`);
      filter.date = {
        $gte: startDate,
        $lte: endDate
      };
    }
    let building = await Building.findById(buildingId)
      .lean()
      .exec();
    let rates = _.extend({}, building.rates);
    let projectRates = _.extend({}, building.projectRates);
    rates = await calculateRates(filter, rates);
    let projectFilter = _.extend({}, filter);
    for (let i = 2; i >= 0; i--) {
      let filterObj = {
        building: buildingId
      };
      if (yearType === "CY") {
        filter.year = year - i;
      } else {
        let startDate = new Date(`${year - i - 1} ${startMonth} 1`);
        let endDate = new Date(`${year - i} ${endMonth} 2`);
        filterObj.date = {
          $gte: startDate,
          $lte: endDate
        };
      }
      const monthlyUtilities = await MonthlyUtility.find(filterObj);
      if (monthlyUtilities.length) {
        if (yearType === "CY") {
          projectFilter.year = {
            $gte: year - i,
            $lte: year
          };
        } else {
          let startDate = new Date(`${year - i - 1} ${startMonth} 1`);
          let endDate = new Date(`${year} ${endMonth} 2`);
          projectFilter.date = {
            $gte: startDate,
            $lte: endDate
          };
        }
        break;
      }
    }
    projectRates = await calculateRates(projectFilter, projectRates);
    let updatedBuilding = _.extend(req.building, {
      rates: rates,
      projectRates: projectRates
    });

    updatedBuilding.markModified("rates");
    updatedBuilding.markModified("projectRates");
    updatedBuilding = await updatedBuilding.save();

    res.sendResult = {
      status: "Success",
      message: "Calculated Building Rate",
      building: updatedBuilding
    };
    return next();
  } catch (error) {
    console.log(error);
    return util.sendError(
      "Issues calculating building rate",
      400,
      req,
      res,
      next
    );
  }
};

/**
 * Create building
 */
exports.createBuilding = function(req, res, next) {
  let user, org, reqBuilding;
  if (req.body.source === "survey") {
    /* For Survey - avoids user auth */
    user = req.body.user;
    org = req.organization;
    reqBuilding = req.body.building;

    const electricBlendRate =
      (req.body.building && req.body.building.electricBlendRate) || 0;
    if (electricBlendRate) {
      reqBuilding.rates = {
        electric: electricBlendRate
      };
    }
  } else {
    user = req.user;
    org = req.organization;
    reqBuilding = req.body;
  }

  if (!reqBuilding) {
    return util.sendError("Invalid request.", 400, req, res, next);
  }
  if (org._id) {
    reqBuilding._partition = `${
      PARTITION_KEYS.BUILDING_LIST
    }=${org._id.toString()}`;
  }

  let reqOrgId, reqUserId, reqBuildingId, reqAuditId;
  // Check firebase refs if they are part of the request
  if (!_.isEmpty(reqBuilding.firebaseRefs)) {
    reqOrgId = reqBuilding.firebaseRefs.orgId;
    reqUserId = reqBuilding.firebaseRefs.userId;
    reqBuildingId = reqBuilding.firebaseRefs.buildingId;
    reqAuditId = reqBuilding.firebaseRefs.auditId;

    if (!reqOrgId) {
      return util.sendError(
        'Field "firebaseRefs.orgId" is required.',
        400,
        req,
        res,
        next
      );
    }
    if (!reqUserId) {
      return util.sendError(
        'Field "firebaseRefs.userId" is required.',
        400,
        req,
        res,
        next
      );
    }
    if (!reqBuildingId) {
      return util.sendError(
        'Field "firebaseRefs.buildingId" is required.',
        400,
        req,
        res,
        next
      );
    }
    if (!reqAuditId) {
      return util.sendError(
        'Field "firebaseRefs.auditId" is required.',
        400,
        req,
        res,
        next
      );
    }

    // Validate request data
    if (!validate.valFirebaseId(reqOrgId)) {
      return util.sendError(
        'Field "firebaseRefs.orgId" is invalid.',
        400,
        req,
        res,
        next
      );
    }
    if (!validate.valFirebaseId(reqUserId)) {
      return util.sendError(
        'Field "firebaseRefs.userId" is invalid.',
        400,
        req,
        res,
        next
      );
    }
    if (!validate.valFirebaseId(reqBuildingId)) {
      return util.sendError(
        'Field "firebaseRefs.buildingId" is invalid.',
        400,
        req,
        res,
        next
      );
    }
    if (!validate.valFirebaseId(reqAuditId)) {
      return util.sendError(
        'Field "firebaseRefs.auditId" is invalid.',
        400,
        req,
        res,
        next
      );
    }
  }

  reqBuilding.createdByUserId = user._id;
  if (reqBuilding.altCreatedByUserId) {
    reqBuilding.createdByUserId = reqBuilding.altCreatedByUserId;
  }

  //! TODO Look at updating the schema for a building location...
  if (reqBuilding.location && reqBuilding.location.zip) {
    reqBuilding.zipCode = reqBuilding.location.zip;
  }

  const building = new Building(reqBuilding);

  // If there were firebase id info in the request, save these ids
  if (reqOrgId && reqUserId && reqBuildingId && reqAuditId) {
    building.firebaseRefs = {
      orgId: reqOrgId,
      userId: reqUserId,
      buildingId: reqBuildingId,
      auditId: reqAuditId
    };
  }

  building.validate(function(err) {
    if (err) {
      return util.sendError(err, 400, req, res, next);
    }

    building.save(function(err) {
      if (err) {
        return util.sendError(err, 400, req, res, next);
      }

      // save buildingId into organization object
      let currentOrg = req.organization;
      const tempBuildingIds = currentOrg.buildingIds;

      tempBuildingIds.push(building._id);
      currentOrg = _.extend(currentOrg, {
        buildingIds: tempBuildingIds
      });

      currentOrg.save(async err => {
        if (err) {
          return util.sendError(err, 400, req, res, next);
        }

        let { options = {} } = currentOrg;
        let { hasUtility = false } = options;

        if (!!hasUtility) {
          try {
            let utilityTypes = req.body.utilityTypes || [];
            let utilityMonthlyCost = req.body.utilityMonthlyCost || {};
            let rates = req.body.projectRates || {};
            for (let utility of utilityTypes) {
              await createBuildingUtilityData(
                building._id,
                utility,
                utilityMonthlyCost,
                rates
              );
            }
          } catch (error) {
            console.log("error", error);
          }
        }

        if (req.body && req.body.source === "survey") {
          const electricBlendRate =
            (req.body.building && req.body.building.electricBlendRate) || 0;
          const electricMonthlyEstimate =
            (req.body.building && req.body.building.electricMonthlyEstimate) ||
            0;
          if (electricBlendRate && electricMonthlyEstimate) {
            try {
              let rates = req.body.projectRates || {};
              await createBuildingUtilityData(
                building._id,
                "electric",
                { electric: electricMonthlyEstimate },
                { ...rates, electric: electricBlendRate },
                req.organization.name,
                "Survey"
              );
            } catch (error) {
              console.log("error", error);
            }
          }
        }

        buildingSyncScript.sync({
          organizationId: currentOrg._id,
          buildingIds: [building._id],
          onlyRemove: false
        });

        res.sendResult = {
          status: "Success",
          message: "Created Building",
          building: building,
          currentOrg: currentOrg
        };

        return next();
      });
    });
  });
};

exports.syncNewBuilding = function(req, res, next) {
  const org = req.organization;
  const building = req.building;
  try {
    salesforce.updateBuildings([building], org);
    buildingSyncScript.sync({
      organizationId: org,
      buildingIds: [building._id],
      onlyRemove: false
    });
  } catch (err) {
    console.error("SalesForce was not updated:", err);
  }

  res.sendResult = {
    status: "Success",
    message: "Synced Building",
    building: building,
    currentOrg: org
  };
  return next();
};

exports.createSampleBuilding = async (req, res, next) => {
  try {
    const user = req.user;
    let sampleID = "5fc57cf2d249a10011f497d7";
    let currentOrg = req.organization;
    if (!currentOrg.sampleBuilding) {
      const originalBuilding = await Building.findById(sampleID)
        .lean()
        .exec();
      let buildingBody = _.extend({}, originalBuilding);
      delete buildingBody._id;
      let newBuilding = new Building(buildingBody);
      newBuilding = await newBuilding.save();
      currentOrg.sampleBuilding = newBuilding._id;
      await currentOrg.save();
      currentOrg = await Organization.findById(currentOrg._id);
      await _copyBuildingData(
        newBuilding._id.toString(),
        sampleID,
        currentOrg._id.toString()
      );
    }
    let sampleBuilding = await Building.findById(currentOrg.sampleBuilding)
      .lean()
      .exec();
    if (!sampleBuilding) {
      const originalBuilding = await Building.findById(sampleID)
        .lean()
        .exec();
      let buildingBody = _.extend({}, originalBuilding);
      delete buildingBody._id;
      let newBuilding = new Building(buildingBody);
      newBuilding = await newBuilding.save();
      currentOrg.sampleBuilding = newBuilding._id;
      await currentOrg.save();
      currentOrg = await Organization.findById(currentOrg._id);
      await _copyBuildingData(
        newBuilding._id.toString(),
        sampleID,
        currentOrg._id.toString()
      );
      sampleBuilding = await Building.findById(currentOrg.sampleBuilding)
        .lean()
        .exec();
    }
    let buildingBody = _.extend({}, sampleBuilding);
    delete buildingBody._id;
    buildingBody.createdByUserId = user._id;
    let newBuilding = new Building(buildingBody);
    if (currentOrg._id) {
      newBuilding._partition = `${
        PARTITION_KEYS.BUILDING_LIST
      }=${currentOrg._id.toString()}`;
    }
    newBuilding = await newBuilding.save();
    let tempBuildingIds = currentOrg.buildingIds;
    tempBuildingIds.push(newBuilding._id);
    tempBuildingIds = tempBuildingIds.map(id => id.toString());
    tempBuildingIds = [...new Set(tempBuildingIds)];
    currentOrg = _.extend(currentOrg, {
      buildingIds: tempBuildingIds
    });
    currentOrg.markModified("buildingIds");
    await currentOrg.save();
    console.log("newBuildingId", newBuilding._id.toString());
    console.log("sampleBuilding", sampleBuilding._id.toString());
    await _copyBuildingData(
      newBuilding._id.toString(),
      sampleBuilding._id.toString(),
      currentOrg._id.toString()
    );
    try {
      salesforce.updateBuildings([newBuilding], currentOrg);
      buildingSyncScript.sync({
        organizationId: currentOrg._id.toString(),
        buildingIds: [newBuilding._id.toString()],
        onlyRemove: false
      });
    } catch (err) {
      console.error("SalesForce was not updated:", err);
    }

    res.sendResult = {
      status: "Success",
      message: "Created Sample Building",
      building: newBuilding,
      currentOrg: currentOrg
    };

    return next();
  } catch (error) {
    console.log("error", error);
    return util.sendError(error, 400, req, res, next);
  }
};

exports.batchCreateBuildings = function(req, res, next) {
  const user = req.user;
  const reqBuildings = req.body;
  let organization = req.organization;

  if (!reqBuildings) {
    return util.sendError("Invalid request.", 400, req, res, next);
  }
  if (!_.isArray(reqBuildings)) {
    return util.sendError("Request must be an array.", 400, req, res, next);
  }

  _saveBuildings(reqBuildings, user, organization)
    .then(buildingInfo => {
      // Return the batch buildings object
      if (buildingInfo[1].length > 0) {
        const tempBuildingIds = [
          ...organization.buildingIds,
          ...buildingInfo[1]
        ];
        organization = _.extend(organization, {
          buildingIds: tempBuildingIds
        });

        buildingSyncScript.sync({
          organizationId: organization._id,
          buildingIds: buildingInfo[1],
          onlyRemove: false
        });

        organization.save(function(err) {
          if (err) {
            return util.sendError(err, 400, req, res, next);
          }

          res.sendResult = {
            status: "Success",
            message: "Created Buildings (Batch)",
            result: buildingInfo[0] || []
          };

          return next();
        });
      } else {
        res.sendResult = {
          status: "Success",
          message: "No new buildings to create",
          result: []
        };
        return next();
      }
    })
    .catch(err => {
      return util.sendError(err, 400, req, res, next);
    });
};

/**
 * Create building/projects via firebase building import
 */
exports.createFirebaseBuilding = function(req, res, next) {
  const user = req.user;
  const reqBuilding = req.body;

  if (!reqBuilding) {
    return util.sendError("Invalid request.", 400, req, res, next);
  }

  const reqOrgId = reqBuilding.firebaseRefs.orgId;
  const reqUserId = reqBuilding.firebaseRefs.userId;
  const reqBuildingId = reqBuilding.firebaseRefs.buildingId;
  const reqAuditId = reqBuilding.firebaseRefs.auditId;

  // Ensure required data is present in request
  if (!reqOrgId) {
    return util.sendError('Field "orgId" is required.', 400, req, res, next);
  }
  if (!reqUserId) {
    return util.sendError('Field "userId" is required.', 400, req, res, next);
  }
  if (!reqBuildingId) {
    return util.sendError(
      'Field "buildingId" is required.',
      400,
      req,
      res,
      next
    );
  }
  if (!reqAuditId) {
    return util.sendError('Field "auditId" is required.', 400, req, res, next);
  }

  // Validate request data
  if (!validate.valFirebaseId(reqOrgId)) {
    return util.sendError('Field "orgId" is invalid.', 400, req, res, next);
  }
  if (!validate.valFirebaseId(reqUserId)) {
    return util.sendError('Field "userId" is invalid.', 400, req, res, next);
  }
  if (!validate.valFirebaseId(reqBuildingId)) {
    return util.sendError(
      'Field "buildingId" is invalid.',
      400,
      req,
      res,
      next
    );
  }
  if (!validate.valFirebaseId(reqAuditId)) {
    return util.sendError('Field "auditId" is invalid.', 400, req, res, next);
  }

  reqBuilding.createdByUserId = user._id;

  //! TODO Look at updating the schema for a building location...
  if (reqBuilding.location && reqBuilding.location.zip) {
    reqBuilding.zipCode = reqBuilding.location.zip;
  }

  _checkFirebaseMeasures(reqBuilding.firebaseRefs, function(
    err,
    auditMeasures
  ) {
    if (err) {
      return util.sendError(err, 400, req, res, next);
    }

    const building = new Building(reqBuilding);

    building.validate(function(err) {
      if (err) {
        return util.sendError(err, 400, req, res, next);
      }

      _saveFirebaseMeasuresAsProjects(auditMeasures, building, function(
        err,
        projects
      ) {
        if (err && err.length) {
          // return util.sendError(err, 400, req, res, next);
          console.error("Issues creating projects for building: ", err);
        }

        if (projects.length) {
          let updatedProjectIds = updateProjectIdsForBuilding(
            building.projectIds,
            projects.map(project => project._id)
          );
          building.projectIds = updatedProjectIds;
          building.markModified("projectIds");
        }

        building.save(function(err) {
          if (err) {
            return util.sendError(err, 400, req, res, next);
          }

          // Return the building/project objects
          res.sendResult = {
            status: "Success",
            message: "Created Building (Firebase Import)",
            building: building,
            projects: projects || []
          };
          return next();
        });
      });
    });
  });
};

/**
 * User param middleware
 */
exports.buildingById = function(req, res, next, id) {
  if (!validate.valMongoObjId(id)) {
    return next(new Error("Invalid ID present in request."));
  }

  Building.findById(id).exec(function(err, building) {
    if (err) return next(err);
    if (!building) return next(new Error("Failed to load Building " + id));
    req.building = building;
    return next();
  });
};
