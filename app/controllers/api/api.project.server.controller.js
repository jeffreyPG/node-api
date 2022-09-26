"use strict";

/**
 * Module dependencies.
 */
const _ = require("lodash");
const mongoose = require("mongoose");
const utils = require("util");

const ObjectId = mongoose.Types.ObjectId;
const Project = mongoose.model("Project");
const Building = mongoose.model("Building");
const Organization = mongoose.model("Organization");
const MeasureFormula = mongoose.model("MeasureFormula");
const Measure = mongoose.model("Measure");
const MeasurePackage = mongoose.model("MeasurePackage");
const ProjectPackage = mongoose.model("ProjectPackage");
const ProjectDatawareHouse = mongoose.model("ProjectDatawareHouse");
const ImageSync = mongoose.model("ImageSync");
const util = require("./utils/api.utils");
const validate = require("./utils/api.validation");
const analysisClient = require("./utils/api.analysis.client");
const simulationClient = require("./utils/api.simulation.client");
const salesforce = require("../../salesforce/salesforce.measure");
const Poller = require("./utils/poller");
const { calculate } = require("../../scripts/projectghg.script");
const projectSyncScript = require("../../scripts/projectsync.script");
const {
  addProjectToProjectPackage,
  removeProjectFromProjectPackage,
  calculateAllProjectPackageTotal,
  runProjectWithRates,
  calculateMetric,
  calculateProjectPackageTotal,
  createSubProject,
  calculateMetricForProjectWithSubProject,
  updateProjectIdsForBuilding,
  getCashFlowData
} = require("./utils/api.project.util");
const {
  _bulkEvaluateMeasurePackages
} = require("./api.measure.package.server.controller");

/**
 * Get a list of public measures and user created projects
 */ exports.getOnlyMeasures = function(req, res, next) {
  Measure.find()
    .lean(true)
    .exec(function(err, measures) {
      if (err) {
        return util.sendError(err, 400, req, res, next);
      }

      let tmpMeasure = {
        lighting: [],
        mechanical: [],
        water: [],
        occupancy: [],
        nve: [],
        building: []
      };

      // Send back an object which creates a key for each project type
      if (measures.length) {
        tmpMeasure = {};
        measures
          .filter(measure => !!measure.displayName)
          .map(function(measure) {
            if (!tmpMeasure[measure.project_category]) {
              tmpMeasure[measure.project_category] = [];
            }
            tmpMeasure[measure.project_category].push(measure);
          });
      }

      // Return the measures
      res.sendResult = {
        status: "Success",
        message: "Retrieved Measures",
        measures: tmpMeasure
      };
      return next();
    });
};

/**
 * Get a list of public measures and user created projects
 */
exports.getAllMeasures = function(req, res, next) {
  const buildingId = req.query.buildingId;
  const loadedMeasure = req.query.loadedMeasure;

  if (!buildingId) {
    return util.sendError(
      'Field "buildingId" is required.',
      400,
      req,
      res,
      next
    );
  }

  if (!validate.valMongoObjId(buildingId)) {
    return util.sendError(
      'Field "buildingId" is invalid.',
      400,
      req,
      res,
      next
    );
  }
  if (loadedMeasure === "false") {
    Measure.find()
      .lean(true)
      .exec(function(err, measures) {
        if (err) {
          return util.sendError(err, 400, req, res, next);
        }

        let tmpMeasure = {
          lighting: [],
          mechanical: [],
          water: [],
          occupancy: [],
          nve: [],
          building: []
        };

        // Send back an object which creates a key for each project type
        if (measures.length) {
          tmpMeasure = {};
          measures
            .filter(measure => !!measure.displayName)
            .map(function(measure) {
              if (!tmpMeasure[measure.project_category]) {
                tmpMeasure[measure.project_category] = [];
              }
              tmpMeasure[measure.project_category].push(measure);
            });
        }

        Building.findById(buildingId, function(err, building) {
          if (err) {
            return util.sendError(err, 400, req, res, next);
          }

          let projectIds = building.projectIds || [];
          let measurePackageMeasureIds =
            building.measurePackageMeasureIds || [];
          projectIds = projectIds.filter(
            id => measurePackageMeasureIds.indexOf(id) === -1
          );

          Project.find({ _id: { $in: projectIds } })
            .populate("package", "name")
            .populate({
              path: "projects",
              populate: {
                path: "projects author"
              }
            })
            .populate("author")
            .exec(function(err, projects) {
              if (err) {
                return util.sendError(err, 400, req, res, next);
              }
              MeasurePackage.find({ _id: { $in: building.measurePackageIds } })
                .populate("package", "name")
                .populate({
                  path: "projects",
                  populate: {
                    path: "projects author"
                  }
                })
                .populate("author")
                .exec(function(err, measurePackages) {
                  if (err) {
                    return util.sendError(err, 400, req, res, next);
                  }
                  // Return the buildings utilities object
                  res.sendResult = {
                    status: "Success",
                    message: "Retrieved Utilities",
                    measures: tmpMeasure,
                    projects: projects || [],
                    measurePackages: measurePackages || []
                  };
                  return next();
                });
            });
        });
      });
  } else {
    Building.findById(buildingId, function(err, building) {
      if (err) {
        return util.sendError(err, 400, req, res, next);
      }
      let projectIds = building.projectIds || [];
      let measurePackageMeasureIds = building.measurePackageMeasureIds || [];
      projectIds = projectIds.filter(
        id => measurePackageMeasureIds.indexOf(id) === -1
      );

      Project.find({ _id: { $in: projectIds } })
        .populate("package", "name")
        .populate({
          path: "projects",
          populate: {
            path: "projects author"
          }
        })
        .populate("author")
        .exec(function(err, projects) {
          if (err) {
            return util.sendError(err, 400, req, res, next);
          }
          MeasurePackage.find({ _id: { $in: building.measurePackageIds } })
            .populate("package", "name")
            .populate({
              path: "projects",
              populate: {
                path: "projects author"
              }
            })
            .populate("author")
            .exec(function(err, measurePackages) {
              if (err) {
                return util.sendError(err, 400, req, res, next);
              }
              // Return the buildings utilities object
              res.sendResult = {
                status: "Success",
                message: "Retrieved Utilities",
                measures: [],
                projects: projects || [],
                measurePackages: measurePackages || []
              };
              return next();
            });
        });
    });
  }
};

/**
 * Delete project by id
 */
exports.deleteProject = function(req, res, next) {
  const user = req.user;
  const project = req.project;
  const buildingId = req.building._id;
  const currentOrg = req.organization;
  const packageId = (req.project && req.project.package) || null;
  // Ensure a user can only delete templates if they belong to the organization
  if (user.orgIds.indexOf(currentOrg._id.toString()) === -1) {
    return util.sendError("Permission denied.", 400, req, res, next);
  }

  let subMeasures = project.projects || [];
  if (subMeasures && subMeasures.length) {
    Project.deleteMany({ _id: { $in: subMeasures } });
  }

  // remove project from collection
  project.remove(function(err) {
    if (err) {
      return util.sendError(err, 400, req, res, next);
    }
    ProjectDatawareHouse.findByIdAndRemove(project._id, function(err) {
      if (err) {
        return util.sendError(err, 400, req, res, next);
      }
      // remove project ID from building
      Building.findById(buildingId).exec(function(err, building) {
        if (err) {
          return util.sendError(err, 400, req, res, next);
        }

        // remove all instances of that project id on the building model
        let updatedProjectIds = updateProjectIdsForBuilding(
          building.projectIds,
          [project._id],
          true
        );
        building.projectIds = updatedProjectIds;
        building.markModified("projectIds");

        building.save(function(err) {
          if (err) {
            return util.sendError(err, 400, req, res, next);
          }
          if (packageId) {
            ProjectPackage.findById(packageId).exec(function(
              err,
              projectPackage
            ) {
              if (err) {
                return util.sendError(err, 400, req, res, next);
              }
              let projects = (projectPackage.projects || []).map(item =>
                item.toString()
              );
              projects = projects.filter(
                item =>
                  item !=
                  ((project && project._id && project._id.toString()) || "")
              );
              projectPackage.projects = projects;
              projectPackage.markModified("projects");
              projectPackage.save(function(err) {
                if (err) {
                  return util.sendError(err, 400, req, res, next);
                }
                calculateProjectPackageTotal(building._id, packageId);
                // Return the building object
                res.sendResult = {
                  status: "Success",
                  message: "Removed Measure"
                };
                return next();
              });
            });
          } else {
            res.sendResult = {
              status: "Success",
              message: "Removed Measure"
            };
            return next();
          }
        });
      });
    });
  });
};

exports.addBuildingProject = async function(req, res, next) {
  const { buildingId } = req.params;
  const { body } = req;

  try {
    if (!body.measure || !body.measure._id) {
      return util.sendError("Measure is required", 400, req, res, next);
    }

    if (!mongoose.Types.ObjectId.isValid(buildingId)) {
      return util.sendError("Invalid Building Id", 400, req, res, next);
    }

    if (!mongoose.Types.ObjectId.isValid(body.measure._id)) {
      return util.sendError("Invalid Measure Id", 400, req, res, next);
    }

    const building = await Building.findById(buildingId);
    let measure = await Measure.findById(body.measure._id).lean();
    if (!measure) {
      // Try to find a matching Project
      measure = await Project.findById(body.measure._id).lean();
    }

    if (!building) {
      return util.sendError("Building not found", 404, req, res, next);
    }
    if (!measure) {
      return util.sendError("Measure not found", 404, req, res, next);
    }

    delete measure._id;

    const newProjectBody = Object.assign(
      {},
      {
        ...measure,
        runResults: {},
        originalDisplayName: measure.displayName
      }
    );
    if (req.body.userId) {
      newProjectBody["createdByUserId"] = req.body.userId;
    } else {
      newProjectBody["createdByUserId"] = req.user._id;
    }

    const project = await Project.create(newProjectBody);

    let updatedProjectIds = updateProjectIdsForBuilding(building.projectIds, [
      project._id
    ]);
    building.projectIds = updatedProjectIds;
    building.markModified("projectIds");
    await building.save();

    res.sendResult = {
      status: "Success",
      body: project.toObject(),
      message: "Added Measure"
    };
  } catch (error) {
    console.error(error);
    return util.sendError(error, 500, req, res, next);
  }
  return next();
};

exports.updateBuildingProject = async function(req, res, next) {
  const { buildingId } = req.params;
  const { body } = req;

  const building = await Building.findById(buildingId);

  if (!building) {
    return util.sendError("Building not found", 400, req, res, next);
  }

  const set = {};
  const updateKeys = [
    "name",
    "displayName",
    "originalDisplayName",
    "source",
    "fuel",
    "description",
    "project_category",
    "project_application",
    "project_technology",
    "implementation_strategy",
    "incentive",
    "fields",
    "category",
    "initialValues",
    "locations",
    "runResults",
    "createdByUserId",
    "imageUrls",
    "isComplete"
  ];

  updateKeys.forEach(key => {
    if (body[key]) {
      set[key] = body[key];
    }
  });

  Project.findByIdAndUpdate({ _id: body._id }, { $set: set }, { new: true })
    .exec()
    .then(project => {
      let updatedProjectIds = updateProjectIdsForBuilding(building.projectIds, [
        project._id
      ]);
      building.projectIds = updatedProjectIds;
      building.markModified("projectIds");

      building.save(function(err) {
        if (err) {
          return util.sendError(err, 400, req, res, next);
        }

        res.sendResult = {
          status: "Success",
          project: project.toObject(),
          message: "Created/Updated Measure"
        };
        return next();
      });
    });
};

exports.addIncompleteProject = function(req, res, next) {
  const building = req.building;
  const user = req.user;
  const projectBody = req.body;

  let project;
  let previousPackage = "";
  if (req.project && !req.body.createNewProject) {
    project = _.extend(req.project, {
      name: projectBody.name,
      displayName: projectBody.displayName,
      originalDisplayName: projectBody.originalDisplayName,
      source: projectBody.source || "",
      fuel: projectBody.fuel || "",
      description: projectBody.description,
      project_category: projectBody.project_category,
      project_application: projectBody.project_application,
      project_technology: projectBody.project_technology,
      implementation_strategy: projectBody.implementation_strategy,
      incentive: projectBody.incentive,
      fields: projectBody.fields,
      category: projectBody.category,
      initialValues: projectBody.initialValues,
      locations: projectBody.locations,
      analysisType: projectBody.analysisType || "prescriptive",
      type: projectBody.type,
      runResults: req.project.runResults || {},
      createdByUserId: user._id,
      imageUrls: projectBody.imageUrls || [],
      isComplete: false,
      status: projectBody.status || "",
      type: projectBody.type || "",
      measureLife: projectBody.measureLife || "",
      budgetType: projectBody.budgetType || "Low Cost/No Cost",
      package: projectBody.package || null,
      metric: {},
      imagesInReports: projectBody.imagesInReports || [],
      formulas: projectBody.formulas || {},
      config: projectBody.config || {}
    });
    previousPackage = req.project._id;
  } else {
    project = new Project({
      name: projectBody.name,
      displayName: projectBody.displayName,
      originalDisplayName: projectBody.originalDisplayName,
      source: projectBody.source || "",
      fuel: projectBody.fuel || "",
      description: projectBody.description,
      project_category: projectBody.project_category,
      project_application: projectBody.project_application,
      project_technology: projectBody.project_technology,
      implementation_strategy: projectBody.implementation_strategy,
      incentive: projectBody.incentive,
      fields: projectBody.fields,
      category: projectBody.category,
      initialValues: projectBody.initialValues,
      locations: projectBody.locations,
      analysisType: projectBody.analysisType || "prescriptive",
      type: projectBody.type,
      runResults: {},
      createdByUserId: user._id,
      imageUrls: projectBody.imageUrls || [],
      isComplete: false,
      status: projectBody.status || "",
      type: projectBody.type || "",
      measureLife: projectBody.measureLife || "",
      budgetType: projectBody.budgetType || "Low Cost/No Cost",
      package: projectBody.package || null,
      metric: {},
      imagesInReports: projectBody.imagesInReports || [],
      formulas: projectBody.formulas || {},
      config: projectBody.config || {}
    });
  }

  project.validate(function(err) {
    if (err) {
      return util.sendError(err, 400, req, res, next);
    }

    const runObj = {};
    runObj[building._id] = {};
    project.runResults = runObj;
    project.runResultsWithRate = runObj;
    project.metric = {};
    project.markModified("metric");
    project.markModified("runResults");
    project.markModified("runResultsWithRate");

    project.updated = Date.now();

    project.save(function(err) {
      if (err) {
        return util.sendError(err, 400, req, res, next);
      }

      let updatedProjectIds = updateProjectIdsForBuilding(building.projectIds, [
        project._id
      ]);
      building.projectIds = updatedProjectIds;
      building.markModified("projectIds");

      building.save(function(err) {
        if (err) {
          return util.sendError(err, 400, req, res, next);
        }
        runProjectGHGScript(building._id).then(() => {
          runProjectSyncScript(project._id).then(() => {
            removeProjectFromProjectPackage(
              building._id,
              previousPackage,
              project._id
            ).then(() => {
              addProjectToProjectPackage(
                building._id,
                project.package,
                project._id
              ).then(() => {
                res.sendResult = {
                  status: "Success",
                  project: project.toObject(),
                  message: "Created/Updated Measure"
                };
                return next();
              });
            });
          });
        });
      });
    });
  });
};

exports.runCustomMeasure = function(req, res, next) {
  const { body } = req;
  let customMeasure = {
    name: "multiCustomOffline",
    displayName: _.get(body, "name", "Custom Measure"),
    originalDisplayName: _.get(body, "name", "Custom Measure"),
    description: _.get(body, "description", ""),
    fuel: "gas/electric",
    category: "calculated",
    analysisType: "prescriptive",
    type: "Energy Efficiency Measure (EEM)",
    measureLife: _.get(body, "measureLife", ""),
    status: "",
    fields: [
      {
        options: [],
        firebase_input: "",
        replacement: true,
        existing: false,
        default: 0,
        description: "Annual electricity savings associated with this ECM",
        name: "electric",
        label: "Annual Electricity Savings (kWh)",
        type: "number"
      },
      {
        options: [],
        firebase_input: "",
        replacement: true,
        existing: false,
        default: 0,
        description:
          "Annual electricity demand savings associated with this ECM",
        name: "demand",
        label: "Annual Electricity Demand Savings (kW)",
        type: "number"
      },
      {
        options: [],
        firebase_input: "",
        replacement: true,
        existing: false,
        default: 0,
        description: "Annual natural gas savings associated with this ECM",
        name: "gas",
        label: "Annual Natural Gas Savings (therms)",
        type: "number"
      },
      {
        options: [],
        firebase_input: "",
        replacement: true,
        existing: false,
        default: 0,
        description: "Annual fuel oil No. 2 savings associated with this ECM",
        name: "fueloil",
        label: "Annual Fuel Oil No. 2 Savings (gal)",
        type: "number"
      },
      {
        options: [],
        firebase_input: "",
        replacement: true,
        existing: false,
        default: 0,
        description: "Annual fuel oil No. 4 savings associated with this ECM",
        name: "fueloil-4",
        label: "Annual Fuel Oil No. 4 Savings (gal)",
        type: "number"
      },
      {
        options: [],
        firebase_input: "",
        replacement: true,
        existing: false,
        default: 0,
        description:
          "Annual fuel oil No. 5 & 6 savings associated with this ECM",
        name: "fueloil-5-6",
        label: "Annual Fuel Oil No. 5 & 6 Savings (gal)",
        type: "number"
      },
      {
        options: [],
        firebase_input: "",
        replacement: true,
        existing: false,
        default: 0,
        description: "Annual steam savings associated with this ECM",
        name: "steam",
        label: "Annual Steam Savings (Mlb)",
        type: "number"
      },
      {
        options: [],
        firebase_input: "",
        replacement: true,
        existing: false,
        default: 0,
        description: "Annual propane savings associated with this ECM",
        name: "propane",
        label: "Annual Propane Savings (gal)",
        type: "number"
      },
      {
        options: [],
        replacement: true,
        existing: false,
        default: 0,
        description: "Annual cost savings",
        name: "annualCostSavings",
        label: "Annual Cost Savings ($)",
        type: "number"
      },
      {
        options: [],
        replacement: true,
        existing: false,
        default: 0,
        description: "Simple payback",
        name: "simplePayback",
        label: "Simple Payback (yrs)",
        type: "number"
      },
      {
        options: [],
        replacement: true,
        existing: false,
        default: 0,
        description: "NPV",
        name: "npv",
        label: "NPV",
        type: "number"
      },
      {
        options: [],
        replacement: true,
        existing: false,
        default: 0,
        description: "SIR",
        name: "sir",
        label: "SIR",
        type: "number"
      }
    ],
    initialValues: {
      electric: _.get(body, "electric", 0),
      demand: _.get(body, "demand", 0),
      gas: _.get(body, "gas", 0),
      fueloil: _.get(body, "fueloil-2", 0),
      "fueloil-4": _.get(body, "fueloil-4", 0),
      "fueloil-5-6": _.get(body, "fueloil-5-6", 0),
      steam: _.get(body, "steam", 0),
      propane: _.get(body, "propane", 0),
      annualCostSavings: _.get(body, "annualCostSavings", 0),
      simplePayback: _.get(body, "simplePayback", 0),
      npv: _.get(body, "npv", 0),
      sir: _.get(body, "sir", 0),
      input: _.get(body, "incentive", 0)
    },
    incentive: {
      input_label: null,
      input_description: null,
      state: [],
      utility_company: null,
      rebate_code: null,
      product_code: null,
      rebate_cap: null,
      program_link: null,
      bonuses_available: null,
      bonus_comment: null,
      source_link: null,
      expiration: null,
      existing_requirements: "",
      design_requirements: "",
      incentive_type: "default",
      input_units: null,
      input: _.get(body, "incentive", 0),
      unit_rate: null,
      category: "calculated",
      project_category: "",
      project_application: "",
      project_technology: "",
      applicable_building_types: [],
      source: []
    },
    altCreatedByUserId: _.get(body, "altCreatedByUserId", null)
  };
  req.body = { payload: customMeasure };
  if (req.project) {
    req.body.action = "edit";
  }
  return exports.runPrescriptiveProject(req, res, next);
};

exports.runPrescriptiveProject = function(req, res, next) {
  const { building, user, body } = req;
  const projectBody = body.payload;
  const userId = body.userId;
  if (!projectBody.name) {
    return util.sendError(
      'Field "projectBody.name" is required.',
      400,
      req,
      res,
      next
    );
  }

  let rates = null;
  if (req.body.action === "edit") {
    rates = projectBody.rates;
    if (
      !rates ||
      (Object.keys(rates).length === 0 && rates.constructor === Object)
    ) {
      rates = req.project.rates;
    }
    if (
      !rates ||
      (Object.keys(rates).length === 0 && rates.constructor === Object)
    ) {
      rates = req.building.projectRates;
    }
    if (
      !rates ||
      (Object.keys(rates).length === 0 && rates.constructor === Object)
    ) {
      rates = null;
    }
  } else {
    rates = projectBody.rates;
    if (
      !rates ||
      (Object.keys(rates).length === 0 && rates.constructor === Object)
    ) {
      rates = req.building.projectRates;
    }
    if (
      !rates ||
      (Object.keys(rates).length === 0 && rates.constructor === Object)
    ) {
      rates = null;
    }
  }

  // Ensure building has the required rates
  if (!building.rates || !rates) {
    return util.sendError(
      'Building "rates" are required.',
      400,
      req,
      res,
      next
    );
  }

  [
    "discountRate",
    // 'financeRate',       // Not required
    "inflationRate",
    // 'reinvestmentRate',  // Not required
    "investmentPeriod"
  ].forEach(rate => {
    if (!_.isNumber(rates[rate])) {
      return util.sendError(
        `Building "rates.${rate}" are required.`,
        400,
        req,
        res,
        next
      );
    }
  });

  let newCreatedByUserId = projectBody.altCreatedByUserId;

  if (userId) {
    newCreatedByUserId = userId;
  }

  // Never allow client to modify these fields so remove from the req body
  let deleteFields = [
    "createdByUserId",
    "analysisIds",
    "created",
    "altCreatedByUserId"
  ];
  deleteFields.forEach(field => {
    delete projectBody[field];
  });

  const projectFinance = {
    discount_rate: rates.discountRate,
    finance_rate: rates.financeRate,
    inflation_rate: rates.inflationRate,
    reinvestment_rate: rates.reinvestmentRate,
    investment_period: rates.investmentPeriod,
    project_cost: parseFloat(projectBody.initialValues.project_cost) || 0,
    maintenance_savings:
      parseFloat(projectBody.initialValues.maintenance_savings) || 0
  };

  // Check optional "incentive" field
  if (projectBody.incentive) {
    if (!projectBody.incentive.incentive_type) {
      return util.sendError(
        'Field "incentive.incentiveType" is required.',
        400,
        req,
        res,
        next
      );
    }
    if (projectBody.incentive.incentive_type !== "none") {
      if (
        projectBody.incentive.incentive_type !== "analysis" &&
        projectBody.incentive.incentive_type !== "timeOfUse" &&
        !_.isNumber(projectBody.incentive.input)
      ) {
        return util.sendError(
          'Field "incentive.input" is required.',
          400,
          req,
          res,
          next
        );
      }
    }
  }

  if (projectBody.incentive.incentive_type === "analysis") {
    projectBody.incentive.input = 0;
  }

  const utilityObj = {};

  if (rates) {
    if (rates.electric) {
      utilityObj.electric = rates.electric;
    }
    if (rates.gas) {
      utilityObj.gas = rates.gas;
    }
    if (rates.steam) {
      utilityObj.steam = rates.steam;
    }
    if (rates.water) {
      utilityObj.water = rates.water;
    }
    if (rates.fuelOil2) {
      utilityObj.fuelOil2 = rates.fuelOil2;
    }
    if (rates.fuelOil4) {
      utilityObj.fuelOil4 = rates.fuelOil4;
    }
    if (rates.fuelOil56) {
      utilityObj.fuelOil56 = rates.fuelOil56;
    }
    if (rates.diesel) {
      utilityObj.diesel = rates.diesel;
    }
    if (rates.other) {
      utilityObj.other = rates.other;
    }
  }
  // // Make sure image urls are in an array
  if (projectBody.imageUrls && !_.isArray(projectBody.imageUrls)) {
    return util.sendError(
      'Field "projectBody.imageUrls" must be an array.',
      400,
      req,
      res,
      next
    );
  }
  const request = {
    measure: JSON.parse(JSON.stringify(projectBody.initialValues)),
    incentive: JSON.parse(JSON.stringify(projectBody.incentive)),
    finance: projectFinance,
    utility: utilityObj
  };
  // remove the 4 fields that may contain special characters
  // so the analysis API doesn't choke on these
  delete request.measure.displayName;
  delete request.measure.description;
  delete request.incentive.design_requirements;
  delete request.incentive.existing_requirements;

  request.measure.name = projectBody.name;

  let project;
  let previousPackage = "";
  if (req.body.action === "edit") {
    project = _.extend(req.project, {
      name: projectBody.name,
      displayName: projectBody.displayName,
      originalDisplayName: projectBody.originalDisplayName,
      source: projectBody.source || "",
      fuel: projectBody.fuel || "",
      description: projectBody.description,
      project_category: projectBody.project_category,
      project_application: projectBody.project_application,
      project_technology: projectBody.project_technology,
      implementation_strategy: projectBody.implementation_strategy,
      incentive: projectBody.incentive,
      fields: projectBody.fields,
      category: projectBody.category,
      initialValues: projectBody.initialValues,
      locations: projectBody.locations,
      runResults: req.project.runResults || {},
      createdByUserId: newCreatedByUserId || user._id,
      imageUrls: projectBody.imageUrls || [],
      imagesInReports: projectBody.imagesInReports || [],
      isComplete: true,
      status: projectBody.status || "",
      type: projectBody.type || "",
      measureLife: projectBody.measureLife || "",
      package: projectBody.package || null,
      budgetType: projectBody.budgetType || "Low Cost/No Cost",
      analysisType: projectBody.analysisType || "prescriptive",
      metric: {},
      formulas: projectBody.formulas || {},
      config: projectBody.config || {}
    });
    previousPackage = req.project._id;
  } else {
    project = new Project({
      name: projectBody.name,
      displayName: projectBody.displayName,
      originalDisplayName: projectBody.originalDisplayName,
      source: projectBody.source || "",
      fuel: projectBody.fuel || "",
      description: projectBody.description,
      project_category: projectBody.project_category,
      project_application: projectBody.project_application,
      project_technology: projectBody.project_technology,
      implementation_strategy: projectBody.implementation_strategy,
      incentive: projectBody.incentive,
      fields: projectBody.fields,
      category: projectBody.category,
      initialValues: projectBody.initialValues,
      locations: projectBody.locations,
      runResults: {},
      createdByUserId: newCreatedByUserId || (user ? user._id : null), // null if the project is run by the Survey App
      imageUrls: projectBody.imageUrls || [],
      imagesInReports: projectBody.imagesInReports || [],
      isComplete: true,
      status: projectBody.status || "",
      type: projectBody.type || "",
      measureLife: projectBody.measureLife || "",
      budgetType: projectBody.budgetType || "Low Cost/No Cost",
      package: projectBody.package || null,
      analysisType: projectBody.analysisType || "prescriptive",
      metric: {},
      formulas: projectBody.formulas || {},
      config: projectBody.config || {}
    });
  }

  /* Measure Formula Strings */
  // TODO: Get rid of this, it will be created on analysis api
  // if (project.formulas !== {}) {
  //   for (let fuelType in project.formulas) {
  //     MeasureFormula.findOne({ _id: project.formulas[fuelType] }, function(
  //       err,
  //       doc
  //     ) {
  //       if (err) {
  //         console.log(err);
  //       } else if (doc && doc.formula) {
  //         let formula = doc.formula;
  //         for (let key in project.initialValues) {
  //           let value = project.initialValues[key];
  //           formula = formula.split(key).join(value);
  //         }
  //         project.initialValues[fuelType + "Formula"] = formula;
  //         project.markModified("initialValues");
  //         project.save();
  //       }
  //     });
  //   }
  // }

  if (projectBody.eaDisplayName) {
    project.eaDisplayName = projectBody.eaDisplayName;
  }
  project.updated = Date.now();

  project.validate(function(err) {
    if (err) {
      return util.sendError(err, 400, req, res, next);
    }

    if (projectBody.analysisType === "simulation") {
      // console.log("STARTING SIMULATION!", project)
      let projects = [project];
      // console.log("BUILDING:", building)
      simulationClient
        .createSimulation({
          projects,
          parameters: {
            floorArea: building.squareFeet,
            primaryUseType: "SmallOffice", // TODO: Need to map buildee format of buildingUse to OpenStudio name
            yearBuilt: building.buildYear
          }
        })
        .then((baseline, measures) => {
          // console.log("DONE STARTING SIMULATION RUN")
          // console.log("BASELINE:", baseline)
          // console.log("MEASURES:", measures)
          waitForResponseComplete(() => {
            return simulationClient.getMeasure({
              baselineId: baseline.baseline._id,
              measureId: baseline.measures[0]._id
            });
          })
            .then(sim_results => {
              // console.log("SIM RESULTS:", sim_results)
              // TODO: Create simulation results? see api.projectSimulation.server.controller line 70
              const runResultsObj = {};
              runResultsObj[building._id] = sim_results;
              project.runResults = runResultsObj;
              project.metric = calculateMetric(project, building._id);
              if (project.metric.eul) project.measureLife = project.metric.eul;
              project.markModified("metric");
              project.markModified("runResults");
              project.save(async function(err) {
                if (err) {
                  console.error(err);
                  return util.sendError(err, 400, req, res, next);
                }
                // console.log("SAVING BUILDING");
                building.projectIds.push(project._id);
                building.markModified("projectIds");
                building.save(function() {
                  if (err) {
                    console.error(err);
                    return util.sendError(err, 400, req, res, next);
                  }
                  // console.log("SAVED BUILDING")
                });
                if (project.imageUrls && project.imageUrls.length > 0) {
                  const images = await ImageSync.find({
                    sourceIdentity: project._id
                  });
                  project.imageUrls.forEach(async imageUrl => {
                    if (
                      !images.find(syncedImage => syncedImage.uri === imageUrl)
                    ) {
                      await ImageSync.create({
                        filePath: imageUrl,
                        sourceObject: "Project",
                        sourceIdentity: project._id,
                        sourcePartition: `projectId=${project._id}`,
                        uri: imageUrl,
                        createdByUserId: user._id
                      });
                    }
                  });
                }
              });
            })
            .then(() => {
              console.log("SENDING RESPONSE");
              res.sendResult = {
                status: "Success",
                project: project.toObject(),
                message: "Created/Updated Measure"
              };
              return next();
            });
        });

      return;
    }

    console.log("REQUEST", request);
    analysisClient.runPrescriptiveMeasure(request, function(err, result) {
      if (err) {
        console.error(err);
        result = {};
        project.isComplete = false;
        // return util.sendError('Issues running project.', 400, req, res, next)
      }

      const runObj = {};
      runObj[building._id] = result;
      project.runResults = runObj;
      project.markModified("runResults");
      project.updated = Date.now();
      if (result.financial && result.financial["project_cost"]) {
        project.initialValues["project_cost"] =
          result.financial["project_cost"];
        project.markModified("initialValues");
      }
      if (
        result["utility-incentive"] &&
        project.initialValues &&
        project.incentive
      ) {
        project.initialValues.input = result["utility-incentive"];
        project.incentive.input = result["utility-incentive"];
      }
      if (result["formulas"] && project.initialValues) {
        project.initialValues.formulas = result["formulas"];
      }
      project.save(function(err) {
        if (err) {
          console.error(err);
          return util.sendError(err, 400, req, res, next);
        }
        runProjectWithRates(project._id, req.building._id).then(
          resultWithRate => {
            const runResultsWithRateObj = project.runResultsWithRate || {};
            runResultsWithRateObj[building._id] = resultWithRate;
            project.runResultsWithRate = runResultsWithRateObj;
            project.markModified("runResultsWithRate");
            project.save(function(err) {
              if (err) {
                console.error(err);
                return util.sendError(err, 400, req, res, next);
              }

              let updatedProjectIds = updateProjectIdsForBuilding(
                building.projectIds,
                [project._id]
              );
              building.projectIds = updatedProjectIds;
              building.markModified("projectIds");

              building.save(function() {
                if (err) {
                  console.error(err);
                  return util.sendError(err, 400, req, res, next);
                }
                runProjectGHGScript(building._id).then(() => {
                  Project.findById(project._id, function(err, project) {
                    if (err) {
                      console.error(err);
                      return util.sendError(err, 400, req, res, next);
                    }
                    project.metric = calculateMetric(project, building._id);
                    if (project.metric.eul)
                      project.measureLife = project.metric.eul;
                    project.markModified("metric");
                    project.save(function(err) {
                      if (err) {
                        console.error(err);
                        return util.sendError(err, 400, req, res, next);
                      }
                      runProjectSyncScript(project._id).then(() => {
                        removeProjectFromProjectPackage(
                          building._id,
                          previousPackage,
                          project._id
                        ).then(() => {
                          addProjectToProjectPackage(
                            building._id,
                            project.package,
                            project._id
                          ).then(() => {
                            Organization.findOne(
                              { buildingIds: building._id },
                              function(err, org) {
                                // For SalesForce
                                if (err) {
                                  console.error(
                                    "Failed to update salesforce with new measure ",
                                    project._id
                                  );
                                  res.sendResult = {
                                    status: "Success",
                                    project: project.toObject(),
                                    message: "Created/Updated Measure"
                                  };
                                  return next();
                                }

                                try {
                                  salesforce.updateMeasures([project], org);
                                } catch (err) {
                                  console.error(
                                    "SalesForce was not updated:",
                                    err
                                  );
                                }

                                res.sendResult = {
                                  status: "Success",
                                  project: project.toObject(),
                                  message: "Created/Updated Measure"
                                };

                                return next();
                              }
                            );
                          });
                        });
                      });
                    });
                  });
                });
              });
            });
          }
        );
      });
    });
  });
};

/**
 * Poll Translator API until measure simulation is complete
 */
const waitForResponseComplete = (fn, timeout = 10000) => {
  return new Promise(function(resolve, reject) {
    let attempts = 0;
    const maxTimeoutMillis = 1200000; // 10 minutes
    const maxAttempts = maxTimeoutMillis / timeout;
    const poller = new Poller(timeout);

    poller.onPoll(async function() {
      attempts++;
      console.log(`Polling attempts: ${attempts}, maxAttempts: ${maxAttempts}`);
      let response = await fn();
      console.log("response");
      console.log(response);
      if (typeof response === "string" || response instanceof String) {
        response = JSON.parse(response);
      }
      if (response.complete === true) {
        resolve(response);
      } else if (attempts > maxAttempts) {
        reject(
          new Error(
            `Max attempts exceeded. attempts: ${attempts}, maxAttempts: ${maxAttempts}`
          )
        );
      } else {
        poller.poll();
      }
    });

    poller.poll();
  });
};

const _bulkAddProjects = (projects, buildingId, user) => {
  return new Promise((resolve, reject) => {
    const promises = [];
    const projectIdsArray = [];

    const projectLoop = projects.map(projectObject => {
      console.log(projectObject);
      const project = new Project({
        name: projectObject.project.name,
        displayName: projectObject.project.displayName,
        originalDisplayName:
          projectObject.project.originalDisplayName ||
          projectObject.project.displayName,
        source: projectObject.project.source || "",
        fuel: projectObject.project.fuel || "",
        description: projectObject.project.description,
        project_category: projectObject.project.project_category,
        project_application: projectObject.project.project_application,
        project_technology: projectObject.project.project_technology,
        implementation_strategy: projectObject.project.implementation_strategy,
        incentive: projectObject.project.incentive,
        fields: projectObject.project.fields,
        category: projectObject.project.category,
        initialValues: projectObject.project.initialValues,
        locations: projectObject.project.locations,
        analysisType: projectObject.project.analysisType,
        runResults: {},
        createdByUserId: user._id,
        imageUrls: projectObject.project.imageUrls || [],
        // mark description projects as complete
        isComplete: projectObject.project.category === "description",
        type: projectObject.project.type || "",
        measureLife: projectObject.project.measureLife || "0",
        status: projectObject.project.status || "Identified",
        budgetType: projectObject.project.budgetType || "Low Cost/No Cost",
        imagesInReports: projectObject.project.imagesInReports || [],
        formulas: projectObject.project.formulas || {},
        config: projectObject.project.config || {}
      });

      const saveProject = new Promise((resolve, reject) => {
        project.validate(function(err) {
          if (err) {
            reject(err);
          }

          const runObj = {};
          runObj[buildingId] = [];

          project.runResults = runObj;
          project.metric = {};
          project.markModified("metric");
          project.markModified("runResults");
          project.updated = Date.now();

          project.save(function(err, createdProject) {
            if (err) {
              reject(err);
            }
            projectIdsArray.push(createdProject._id);
            resolve();
          });
        });
      });

      promises.push(saveProject);
    });

    Promise.all(projectLoop)
      .then(() => {
        return Promise.all(promises)
          .then(() => {
            resolve(projectIdsArray);
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

exports.bulkAddProjects = function(req, res, next) {
  const building = req.building;
  const user = req.user;
  const projects = req.body;

  _bulkAddProjects(projects, building._id, user)
    .then(projectIds => {
      let updatedProjectIds = updateProjectIdsForBuilding(
        building.projectIds,
        projectIds
      );
      building.projectIds = updatedProjectIds;
      building.markModified("projectIds");

      building.save((err, building) => {
        if (err) {
          return util.sendError(err, 400, req, res, next);
        }
        res.sendResult = {
          status: "Success",
          message: "Created Measures in bulk"
        };
        return next();
      });
    })
    .catch(err => {
      return util.sendError(err, 400, req, res, next);
    });
};

const _bulkEvaluateProjects = (projects, building, utilityObj) => {
  return new Promise((resolve, reject) => {
    const promises = [];
    const projectLoop = projects.map(project => {
      // first empty the run results object becuase you'll get a new one
      if (project.runResults) delete project.runResults[building._id];

      const projectFinance = {
        discount_rate:
          (building.projectRates && building.projectRates.discountRate) || 2.5,
        finance_rate:
          (building.projectRates && building.projectRates.financeRate) || 0,
        inflation_rate:
          (building.projectRates && building.projectRates.inflationRate) || 0.5,
        reinvestment_rate:
          (building.projectRates && building.projectRates.reinvestmentRate) ||
          0,
        investment_period:
          (building.projectRates && building.projectRates.investmentPeriod) ||
          10,
        project_cost: parseFloat(project.initialValues.project_cost) || 0,
        maintenance_savings:
          parseFloat(project.initialValues.maintenance_savings) || 0
      };
      if (project.incentive) {
        if (!project.incentive.incentive_type) {
          reject('Field "incentive.incentiveType" is required.');
        }
        if (project.incentive.incentive_type !== "none") {
          if (
            project.incentive.incentive_type !== "analysis" &&
            project.incentive.incentive_type !== "timeOfUse" &&
            !_.isNumber(project.incentive.input)
          ) {
            reject('Field "incentive.input" is required.');
          }
        }
      }
      if (project.incentive.incentive_type === "analysis") {
        project.incentive.input = 0;
      }
      project.initialValues.name = project.name;
      const request = {
        measure: JSON.parse(JSON.stringify(project.initialValues)),
        incentive: JSON.parse(JSON.stringify(project.incentive)),
        finance: projectFinance,
        utility: utilityObj
      };
      // remove the 4 fields that may contain special characters
      // so the analysis API doesn't choke on these
      delete request.measure.displayName;
      delete request.measure.description;
      delete request.incentive.design_requirements;
      delete request.incentive.existing_requirements;

      const saveProject = new Promise((resolve, reject) => {
        Project.findById(project._id, function(err, project) {
          project.validate(function(err) {
            if (err) {
              reject(err);
            }
            analysisClient.runPrescriptiveMeasure(request, function(
              err,
              result
            ) {
              if (err) {
                console.error(err);
                reject("Issues running project.");
              }

              const runObj = {};
              runObj[building._id] = result;

              project.runResults = runObj;
              project.metric = calculateMetric(project, building._id);
              if (project.metric.eul) project.measureLife = project.metric.eul;
              project.markModified("runResults");
              project.markModified("metric");
              project.updated = Date.now();

              project.save(function(err) {
                if (err) {
                  reject(err);
                }
                resolve();
              });
            });
          });
        });
      });

      promises.push(saveProject);
    });

    Promise.all(projectLoop)
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
};

const reCalculateMetric = async (projects, buildingId) => {
  let projectIds = projects.map(project => project._id.toString());
  for (let projectId of projectIds) {
    let project = await Project.findById(projectId);
    project.metric = calculateMetric(project, buildingId);
    if (project.metric.eul) project.measureLife = project.metric.eul;
    project.markModified("metric");
    project.updated = Date.now();
    await project.save();
  }
};

exports.bulkEvaluateProjects = function(req, res, next) {
  const building = req.building;
  const allProjects = req.body;
  let projects = allProjects.filter(
    project => project.collectionTarget === "measure"
  );
  const measurePackages = allProjects.filter(
    project => project.collectionTarget === "measurePackage"
  );
  for (let measurePackage of measurePackages) {
    let measures = measurePackage.projects || [];
    projects.push(...measures);
  }
  let measureIds = measurePackages.map(measurePackage => measurePackage._id);
  const utilityObj = {};
  if (building.projectRates) {
    if (building.projectRates.electric) {
      utilityObj.electric = building.projectRates.electric;
    }
    if (building.projectRates.gas) {
      utilityObj.gas = building.projectRates.gas;
    }
    if (building.projectRates.steam) {
      utilityObj.steam = building.projectRates.steam;
    }
    if (building.projectRates.water) {
      utilityObj.water = building.projectRates.water;
    }
    if (building.projectRates.fuelOil2) {
      utilityObj.fuelOil2 = building.projectRates.fuelOil2;
    }
    if (building.projectRates.fuelOil4) {
      utilityObj.fuelOil4 = building.projectRates.fuelOil4;
    }
    if (building.projectRates.fuelOil56) {
      utilityObj.fuelOil56 = building.projectRates.fuelOil56;
    }
    if (building.projectRates.diesel) {
      utilityObj.diesel = building.projectRates.diesel;
    }
    if (building.projectRates.other) {
      utilityObj.other = building.projectRates.other;
    }
  }

  _bulkEvaluateProjects(projects, building, utilityObj)
    .then(() => {
      runProjectGHGScript(building._id)
        .then(() => {
          reCalculateMetric(projects, building._id).then(() => {
            let projectIds = projects.map(project => project._id) || [];
            runProjectSyncScript(projectIds).then(() => {
              _bulkEvaluateMeasurePackages(measureIds, building)
                .then(() => {
                  calculateAllProjectPackageTotal(building._id)
                    .then(() => {
                      res.sendResult = {
                        status: "Success",
                        message: "Re-evaluated measures in bulk"
                      };
                      return next();
                    })
                    .catch(err => {
                      console.log(err);
                      return util.sendError(err, 400, req, res, next);
                    });
                })
                .catch(err => {
                  console.log(err);
                  return util.sendError(err, 400, req, res, next);
                });
            });
          });
        })
        .catch(err => {
          console.log(err);
          return util.sendError(err, 400, req, res, next);
        });
    })
    .catch(err => {
      console.log(err);
      return util.sendError(err, 400, req, res, next);
    });
};

exports.editOrganizationProject = function(req, res, next) {
  const user = req.user;
  const projectBody = req.body;

  const project = _.extend(req.project, {
    name: projectBody.name,
    displayName: projectBody.displayName,
    originalDisplayName: projectBody.originalDisplayName,
    source: projectBody.source || "",
    fuel: projectBody.fuel || "",
    description: projectBody.description,
    implementation_strategy: projectBody.implementation_strategy,
    incentive: projectBody.incentive,
    fields: projectBody.fields,
    project_category: projectBody.project_category,
    project_application: projectBody.project_application,
    project_technology: projectBody.project_technology,
    category: projectBody.category,
    initialValues: projectBody.initialValues,
    locations: projectBody.locations,
    createdByUserId: user._id,
    imageUrls: projectBody.imageUrls || [],
    isComplete: true,
    status: projectBody.status || "",
    type: projectBody.type || "",
    measureLife: projectBody.measureLife || "",
    budgetType: projectBody.budgetType || "Low Cost/No Cost"
  });

  project.updated = Date.now();

  project.validate(function(err) {
    if (err) {
      return util.sendError(err, 400, req, res, next);
    }

    project.save(function(err) {
      if (err) {
        return util.sendError(err, 400, req, res, next);
      }

      res.sendResult = {
        status: "Success",
        message: "Edited Measure"
      };
      return next();
    });
  });
};

exports.createOrganizationProject = function(req, res, next) {
  const user = req.user;
  const reqProject = req.body;

  if (!reqProject) {
    return util.sendError("Invalid request.", 400, req, res, next);
  }

  // remove new york state measure

  if (reqProject.incentive.state && reqProject.incentive.state.length > 0) {
    reqProject.incentive.state = [];
  }

  if (
    reqProject.applicable_building_types &&
    reqProject.applicable_building_types.length > 0
  ) {
    delete reqProject.applicable_building_types;
  }

  reqProject.createdByUserId = user._id;
  const project = new Project(reqProject);
  if (!project.package) project.package = null;

  project.validate(function(err) {
    if (err) {
      return util.sendError(err, 400, req, res, next);
    }

    Organization.findById(req.organization._id, function(err, organization) {
      if (err) {
        return util.sendError(err, 400, req, res, next);
      }

      organization.projectIds.push(project._id);
      organization.markModified("projectIds");

      organization.save(function(err) {
        if (err) {
          return util.sendError(err, 400, req, res, next);
        }

        project.updated = Date.now();

        project.save(function(err) {
          if (err) {
            return util.sendError(err, 400, req, res, next);
          }

          // Return the project and analysis object
          res.sendResult = {
            status: "Success",
            message: "Created Measure",
            project: project
          };
          return next();
        });
      });
    });
  });
};

exports.getOrganizationProject = async (req, res, next) => {
  try {
    const organization = req.organization;
    const { library } = req.query;
    let projectIds = organization.projectIds || [];
    if (library === "true") {
      projectIds = [
        ...projectIds,
        ...((organization.survey && organization.survey.projectIds) || [])
      ];
    }
    let sharedMeasureOrgs = organization.sharedMeasureOrgs || [];
    const allSharedMeasureOrgs = sharedMeasureOrgs.map(id => id.toString());
    if (!allSharedMeasureOrgs.includes(organization._id.toString())) {
      projectIds = [];
    }
    sharedMeasureOrgs = sharedMeasureOrgs
      .filter(id => id.toString() !== organization._id.toString())
      .map(id => ObjectId(id));

    const organizations = await Organization.find({
      _id: { $in: sharedMeasureOrgs },
      isArchived: { $ne: true }
    })
      .lean()
      .exec();
    for (let org of organizations) {
      let shareProjectIds = org.projectIds || [];
      if (library === "true") {
        shareProjectIds = [
          ...shareProjectIds,
          ...((org.survey && org.survey.projectIds) || [])
        ];
      }
      shareProjectIds = shareProjectIds.map(id => ObjectId(id));
      projectIds = [...projectIds, ...shareProjectIds];
    }

    const projects = await Project.find({
      _id: { $in: projectIds }
    }).populate("projects");

    res.sendResult = {
      status: "Success",
      message: "Retrieved Measures",
      projects: projects
    };

    return next();
  } catch (error) {
    console.log("error", error);
    return util.sendError(err, 400, req, res, next);
  }
};

exports.getAllOrganizationProject = async (req, res, next) => {
  try {
    const user = req.user;
    const orgs = await Organization.find({ _id: { $in: user.orgIds } });
    const projectIds = orgs.reduce((agg, org) => {
      agg = agg.concat(org.projectIds);
      return agg;
    }, []);

    const projects = await Project.find({
      _id: { $in: projectIds }
    }).populate("projects");

    res.sendResult = {
      status: "Success",
      message: "Retrieved Measures",
      projects: projects
    };

    return next();
  } catch (error) {
    return util.sendError(error, 400, req, res, next);
  }
};

exports.deleteOrganizationProject = function(req, res, next) {
  const organization = req.organization;
  const project = req.project;

  // remove all instances of deleted project Id ...
  // in the organization main org array
  const projectIds = [...organization.projectIds];
  for (let i = projectIds.length - 1; i >= 0; i--) {
    if (projectIds[i].toString() === project._id.toString()) {
      projectIds.splice(i, 1);
    }
  }
  organization.projectIds = projectIds;

  organization.save(function(err) {
    if (err) {
      return util.sendError(err, 400, req, res, next);
    }

    project.remove(function(err) {
      if (err) {
        return util.sendError(err, 400, req, res, next);
      }
      ProjectDatawareHouse.findByIdAndRemove(project._id, function(err) {
        if (err) {
          return util.sendError(err, 400, req, res, next);
        }
        res.sendResult = {
          status: "Success",
          message: "Deleted Measure"
        };
        return next();
      });
    });
  });
};

exports.getMeasureOrProjectById = async function(req, res, next) {
  let measureId = req.query.measureId;
  let measure = await Measure.findById(measureId);
  if (!measure) {
    measure = await Project.findById(measureId);
  }

  if (measure) {
    res.sendResult = {
      status: "Success",
      message: "Found measure/project",
      measure: measure.toObject()
    };
  } else {
    res.sendResult = {
      status: "Error",
      message: "Measure/project not found!",
      measure: null
    };
  }

  return next();
};

/**
 * User param middleware
 */
exports.projectById = function(req, res, next, id) {
  if (!validate.valMongoObjId(id)) {
    return next(new Error("Invalid ID present in request."));
  }

  Project.findById(id).exec(function(err, project) {
    if (err) return next(err);
    if (!project) return next(new Error("Failed to load Project " + id));
    req.project = project;
    return next();
  });
};

/**
 * Project param middleware
 */
exports.measureById = function(req, res, next, id) {
  if (!validate.valMongoObjId(id)) {
    return next(new Error("Invalid ID present in request."));
  }

  Measure.findById(id).exec(function(err, measure) {
    if (err) return next(err);
    if (!measure) return next(new Error("Failed to load Measure " + id));
    req.measure = measure;
    return next();
  });
};

const runProjectGHGScript = async buildingId => {
  const options = {
    buildingIds: [buildingId]
  };
  await calculate(options);
};

const runProjectSyncScript = async (projectId, removeProjectId = null) => {
  const options = {};
  if (typeof projectId === "object" && projectId.length)
    options.projectIds = projectId;
  else options.projectIds = [projectId];
  if (removeProjectId) {
    if (typeof removeProjectId === "object" && projectId.length)
      options.removeProjectIds = removeProjectId;
    else options.removeProjectIds = [removeProjectId];
  }
  await projectSyncScript.calculate(options);
};

exports.analysisProjectWithSubProject = async (req, res, next) => {
  try {
    const {
      groups,
      equipmentToGroupMap,
      mainFormValues,
      needNewProjectsByEquipment,
      rates,
      projectValues
    } = req.body;
    let equipmentToProjectMap = {};
    let subProjectIds = [];

    for (let equipment of needNewProjectsByEquipment) {
      let groupId = equipmentToGroupMap && equipmentToGroupMap[equipment];
      let group = _.find(groups, { id: groupId });
      let newProjectId = await createSubProject({
        group,
        equipment,
        mainFormValues,
        rates,
        projectValues,
        user: req.user,
        building: req.building
      });
      equipmentToProjectMap[equipment] = newProjectId;
      subProjectIds.push(newProjectId);
    }
    await runProjectSyncScript(subProjectIds);

    let projects = await Project.find({ _id: { $in: subProjectIds } });
    let cashFlowData = await getCashFlowData(projects, req.building._id, rates);
    res.sendResult = {
      status: "Success",
      message: "Create Sub Measures for Measure",
      projects,
      equipmentToProjectMap,
      cashFlowData
    };
  } catch (error) {
    console.log("error", error);
    res.sendResult = {
      status: "Error",
      message: "Failed to Create Sub Measures for Measure",
      projects: [],
      equipmentToProjectMap: {}
    };
  }
  return next();
};

exports.createProjectWithSubProject = async (req, res, next) => {
  try {
    const building = req.building;
    const user = req.user;
    const { payload: projectBody, options = {}, actionType, id } = req.body;
    let finalProject, newId;
    let removeProjectIds = (options && options.oldSubProjects) || [];
    removeProjectIds = removeProjectIds.map(id => ObjectId(id));

    await Project.deleteMany({ _id: { $in: removeProjectIds } });
    let oldProjectPackage;
    let newProjectPackage;

    if (actionType === "add") {
      oldProjectPackage = null;
      newProjectPackage = projectBody.package;
      let initialValues = Object.assign({}, projectBody.initialValues || {});
      delete initialValues["rates"];
      let measure = await Measure.findById(id)
        .lean()
        .exec();
      let projectData = _.extend(measure, {
        name: projectBody.name,
        displayName: projectBody.displayName,
        originalDisplayName:
          projectBody.originalDisplayName || projectBody.displayName,
        source: projectBody.source || "",
        fuel: projectBody.fuel || "",
        description: projectBody.description,
        project_category: projectBody.project_category,
        project_application: projectBody.project_application,
        project_technology: projectBody.project_technology,
        implementation_strategy: projectBody.implementation_strategy,
        category: projectBody.category,
        initialValues: projectBody.initialValues,
        rates: projectBody.rates,
        locations: projectBody.locations,
        analysisType: projectBody.analysisType || "prescriptive",
        type: projectBody.type,
        runResults: {},
        createdByUserId: user._id,
        imageUrls: projectBody.imageUrls || [],
        isComplete: true,
        status: projectBody.status || "",
        type: projectBody.type || "",
        fields: projectBody.fields || [],
        measureLife: projectBody.measureLife || "",
        budgetType: projectBody.budgetType || "Low Cost/No Cost",
        package: projectBody.package || null,
        metric: {},
        imagesInReports: projectBody.imagesInReports || [],
        formulas: projectBody.formulas || {},
        config: projectBody.config || {},
        projects: options.subProjects || [],
        groups: options.groups || {},
        equipments: options.equipments || [],
        equipmentToGroupMap: options.equipmentToGroupMap || {},
        equipmentToProjectMap: options.equipmentToProjectMap || {},
        equipmentToEquipmentNameMap: options.equipmentToEquipmentNameMap || {},
        updated: Date.now()
      });
      delete projectData["_id"];
      const {
        equipmentToProjectMap = {},
        equipments = [],
        equipmentToGroupMap
      } = options;

      const newEquipmentToProjectMap = {};
      let newProjectIds = [];
      for (let equipment of equipments) {
        let projectId = equipmentToProjectMap[equipment];
        if (projectId) {
          const oldProject = await Project.findById(ObjectId(projectId)).lean();
          const projectData = Object.assign({}, oldProject);
          delete projectData["_id"];
          delete projectData["created"];
          delete projectData["updated"];
          delete projectData["package"];
          delete projectData["metric"];
          delete projectData["equipments"];
          delete projectData["equipmentToProjectMap"];
          delete projectData["equipmentToGroupMap"];
          delete projectData["incentive"];
          delete projectData["runResults"];
          delete projectData["runResultsWithRate"];
          delete projectData["createdByUserId"];
          projectData["createdByUserId"] = user._id;
          const newProjectData = new Project(projectData);
          await newProjectData.save();
          const newProjectId = newProjectData._id;
          newEquipmentToProjectMap[equipment] = newProjectId;
          newProjectIds.push(newProjectId);
          const group = equipmentToGroupMap[equipment];
          {
            const financialValues = (group && group["financialValues"]) || {};
            let equipmentValues = (group && group.equipmentValues) || {};
            let equipmentValue =
              (equipmentValues && equipmentValues[equipment]) || {};
            let newInitialValues = {
              ...projectData.initialValues,
              ...group.formValues,
              ...((financialValues && financialValues[equipment]) || {}),
              ...equipmentValue
            };
            delete newInitialValues["rates"];
            let incentive = { ...oldProject.incentive, ...group.incentive };

            const projectFinance = {
              discount_rate: parseFloat(projectBody.rates.discountRate) || 0,
              finance_rate: parseFloat(projectBody.rates.financeRate) || 0,
              inflation_rate: parseFloat(projectBody.rates.inflationRate) || 0,
              reinvestment_rate:
                parseFloat(projectBody.rates.reinvestmentRate) || 0,
              investment_period:
                parseFloat(projectBody.rates.investmentPeriod) || 0,
              project_cost: parseFloat(newInitialValues.project_cost) || 0,
              maintenance_savings:
                parseFloat(newInitialValues.maintenance_savings) || 0
            };

            const utilityObj = {};
            const rates = projectBody.rates || {};

            if (rates) {
              if (rates.electric) {
                utilityObj.electric = rates.electric;
              }
              if (rates.gas) {
                utilityObj.gas = rates.gas;
              }
              if (rates.steam) {
                utilityObj.steam = rates.steam;
              }
              if (rates.water) {
                utilityObj.water = rates.water;
              }
              if (rates.fuelOil2) {
                utilityObj.fuelOil2 = rates.fuelOil2;
              }
              if (rates.fuelOil4) {
                utilityObj.fuelOil4 = rates.fuelOil4;
              }
              if (rates.fuelOil56) {
                utilityObj.fuelOil56 = rates.fuelOil56;
              }
              if (rates.diesel) {
                utilityObj.diesel = rates.diesel;
              }
              if (rates.other) {
                utilityObj.other = rates.other;
              }
            }

            const updatedInitialValues = {};
            for (let key of Object.keys(newInitialValues)) {
              let value = newInitialValues[key];
              if (value && value == +value) value = +value;
              updatedInitialValues[key] = value;
            }

            const updatedIncentive = {};
            for (let key of Object.keys(incentive)) {
              let value = incentive[key];
              if (value && value == +value) value = +value;
              updatedIncentive[key] = value;
            }

            const updatedProjectFinance = {};
            for (let key of Object.keys(projectFinance)) {
              let value = projectFinance[key];
              if (value && value == +value) value = +value;
              updatedProjectFinance[key] = value;
            }

            const updatedUtilityObj = {};
            for (let key of Object.keys(utilityObj)) {
              let value = utilityObj[key];
              if (value && value == +value) value = +value;
              updatedUtilityObj[key] = value;
            }

            let request = {
              measure: JSON.parse(JSON.stringify(updatedInitialValues)),
              incentive: JSON.parse(JSON.stringify(updatedIncentive)),
              finance: updatedProjectFinance,
              utility: updatedUtilityObj
            };

            delete request.measure.displayName;
            delete request.measure.description;
            delete request.incentive.design_requirements;
            delete request.incentive.existing_requirements;

            request.measure.name = oldProject.name;
            console.log("request", JSON.stringify(request));
            let result = {};

            try {
              const asyncFuc = utils.promisify(
                analysisClient.runPrescriptiveMeasure
              );
              result = await asyncFuc(request);
            } catch (error) {
              console.log("error", error);
              result = {};
            }
            const project = await Project.findById(newProjectId);
            project.runResults = {
              [building._id]: result
            };
            project.runResultsWithRate = {
              [building._id]: result
            };
            project.markModified("runResults");
            project.markModified("runResultsWithRate");
            await project.save();
          }
        } else {
          newEquipmentToProjectMap[equipment] = null;
        }
      }
      projectData["equipmentToProjectMap"] = newEquipmentToProjectMap;
      projectData["projects"] = newProjectIds;
      let project = new Project(projectData);
      await project.save();
      newId = project._id;
      await runProjectSyncScript(newProjectIds);
      await runProjectSyncScript(newId);
      await calculate({
        notIncludingBuildingProjects: true,
        buildingIds: [building._id],
        projectIds: [...newProjectIds, newId.toString()]
      });
    } else {
      const {
        subProjects = [],
        groups = {},
        equipmentToGroupMap = {},
        equipmentToProjectMap = {},
        equipmentToEquipmentNameMap = {},
        equipments = []
      } = options;
      let project = await Project.findById(id);
      oldProjectPackage = project.package && project.package.toString();
      newProjectPackage = projectBody.package;
      let oldProjects = project.projects || [];
      oldProjects = oldProjects.map(id => id.toString());
      oldProjects = oldProjects.filter(id => !subProjects.includes(id));
      await Project.deleteMany({ _id: { $in: oldProjects } });
      let initialValues = Object.assign({}, projectBody.initialValues || {});
      delete initialValues["rates"];

      project = _.extend(project, {
        name: projectBody.name,
        displayName: projectBody.displayName,
        originalDisplayName: projectBody.originalDisplayName,
        source: projectBody.source || "",
        fuel: projectBody.fuel || "",
        description: projectBody.description,
        project_category: projectBody.project_category,
        project_application: projectBody.project_application,
        project_technology: projectBody.project_technology,
        implementation_strategy: projectBody.implementation_strategy,
        category: projectBody.category,
        initialValues: initialValues,
        locations: projectBody.locations,
        analysisType: projectBody.analysisType || "prescriptive",
        type: projectBody.type,
        runResults: {},
        createdByUserId: user._id,
        imageUrls: projectBody.imageUrls || [],
        isComplete: true,
        status: projectBody.status || "",
        type: projectBody.type || "",
        measureLife: projectBody.measureLife || "",
        budgetType: projectBody.budgetType || "Low Cost/No Cost",
        package: projectBody.package || null,
        metric: {},
        imagesInReports: projectBody.imagesInReports || [],
        formulas: projectBody.formulas || {},
        config: projectBody.config || {},
        projects: options.subProjects || [],
        groups: groups,
        equipmentToGroupMap: equipmentToGroupMap,
        equipmentToProjectMap: equipmentToProjectMap,
        equipmentToEquipmentNameMap: equipmentToEquipmentNameMap,
        equipments: equipments,
        rates: projectBody.rates,
        fiels: projectBody.fields || [],
        updated: Date.now()
      });
      await project.save();
      newId = project._id;
      await runProjectSyncScript(newId, oldProjects);
    }
    newId = newId.toString();
    let allProjectIds = [...building.projectIds];
    allProjectIds.push(newId);
    building.projectIds = [...new Set(allProjectIds)];
    building.markModified("projectIds");
    await building.save();
    finalProject = await Project.findById(newId)
      .populate("package", "name")
      .populate("projects")
      .exec();
    let cashFlowData = {};
    if (finalProject.projects.length > 1) {
      cashFlowData = await getCashFlowData(
        finalProject.projects,
        building._id,
        projectBody.rates
      );
      finalProject = await Project.findById(newId);
      finalProject.cashFlowData = cashFlowData;
      finalProject.markModified("cashFlowData");
      await finalProject.save();
    }
    let metric = await calculateMetricForProjectWithSubProject(
      newId,
      building._id,
      cashFlowData,
      finalProject.projects.length
    );
    finalProject = await Project.findById(newId);
    await calculate({
      notIncludingBuildingProjects: true,
      buildingIds: [building._id],
      projectIds: finalProject.projects.map(id => id.toString()) || []
    });
    await runProjectSyncScript(newId, removeProjectIds);
    finalProject = await Project.findById(newId);
    finalProject.metric = metric;
    finalProject.markModified("metric");
    finalProject.markModified("runResults");
    if (finalProject.metric.eul) {
      finalProject.measureLife = finalProject.metric.eul;
      finalProject.markModified("measureLife");
    }
    await finalProject.save();
    finalProject = await Project.findById(newId)
      .populate("package", "name")
      .populate("projects")
      .populate("author")
      .exec();
    if (oldProjectPackage) {
      await removeProjectFromProjectPackage(
        building._id,
        oldProjectPackage,
        finalProject._id
      );
    }
    if (newProjectPackage) {
      await addProjectToProjectPackage(
        building._id,
        newProjectPackage,
        finalProject._id
      );
    }
    res.sendResult = {
      status: "Success",
      message: "Create Measure with Sub Measures",
      project: finalProject,
      cashFlowData
    };
  } catch (error) {
    console.log("error", error);
    res.sendResult = {
      status: "Error",
      message: "Failed to Create Measure with Sub Measures"
    };
  }
  return next();
};

exports.removeSubProject = async (req, res, next) => {
  try {
    let id = req.project._id;
    await Project.remove({ _id: id });
    await runProjectSyncScript([], [id]);
    res.sendResult = {
      status: "Success",
      message: "Remove sub measure successfully"
    };
  } catch (error) {
    console.log("error", error);
    res.sendResult = {
      status: "Error",
      message: "Issues to remove sub measure"
    };
  }
  return next();
};

exports.removeSubProjects = async (req, res, next) => {
  try {
    const { ids = [] } = req.body;
    await Project.deleteMany({ _id: { $in: ids.map(id => ObjectId(id)) } });
    await runProjectSyncScript([], ids);
    res.sendResult = {
      status: "Success",
      message: "Remove sub measure successfully"
    };
  } catch (error) {
    console.log("error", error);
    res.sendResult = {
      status: "Error",
      message: "Issues to remove sub measure"
    };
  }
  return next();
};

exports.analysisProjectWithSubProjectOrg = async (req, res, next) => {
  try {
    res.sendResult = {
      status: "Success",
      message: "Create Measure with Sub Measures",
      projects: [],
      equipmentToProjectMap: {}
    };
    return next();
  } catch (error) {
    console.log("error", error);
    res.sendResult = {
      status: "Error",
      message: "Failed to Create Sub Measures for Measure",
      projects: [],
      equipmentToProjectMap: {}
    };
    return next();
  }
};

exports.copyProjectWithSubProject = async (req, res, next) => {
  try {
    const user = req.user;
    const { options = {}, actionType } = req.body;
    const {
      equipmentToProjectMap = {},
      equipments = [],
      payload: projectBody = {}
    } = options;
    let initialValues = Object.assign({}, projectBody.initialValues || {});
    let newProjectIds = [];
    const newEquipmentToProjectMap = {};
    for (let equipment of equipments) {
      let projectId = equipmentToProjectMap[equipment];
      if (projectId) {
        const oldProject = await Project.findById(ObjectId(projectId)).lean();
        const projectData = Object.assign({}, oldProject);
        delete projectData["_id"];
        delete projectData["created"];
        delete projectData["updated"];
        delete projectData["package"];
        delete projectData["metric"];
        delete projectData["equipments"];
        delete projectData["equipmentToProjectMap"];
        delete projectData["equipmentToGroupMap"];
        delete projectData["incentive"];
        delete projectData["runResults"];
        delete projectData["runResultsWithRate"];
        delete projectData["createdByUserId"];
        projectData["createdByUserId"] = user._id;
        const newProjectData = new Project(projectData);
        await newProjectData.save();
        const newProjectId = newProjectData._id;
        newEquipmentToProjectMap[equipment] = newProjectId;
        newProjectIds.push(newProjectId);
      } else {
        newEquipmentToProjectMap[equipment] = null;
      }
    }

    let fullProjectData = _.extend(
      {},
      {
        name: projectBody.name,
        displayName: projectBody.displayName,
        originalDisplayName:
          projectBody.originalDisplayName || projectBody.displayName,
        source: projectBody.source || "",
        fuel: projectBody.fuel || "",
        description: projectBody.description,
        project_category: projectBody.project_category,
        project_application: projectBody.project_application,
        project_technology: projectBody.project_technology,
        implementation_strategy: projectBody.implementation_strategy,
        category: projectBody.category,
        initialValues: projectBody.initialValues,
        rates: projectBody.rates,
        locations: projectBody.locations,
        analysisType: projectBody.analysisType || "prescriptive",
        type: projectBody.type,
        runResults: {},
        createdByUserId: user._id,
        imageUrls: projectBody.imageUrls || [],
        isComplete: true,
        status: projectBody.status || "",
        type: projectBody.type || "",
        fields: projectBody.fields || [],
        measureLife: projectBody.measureLife || "",
        budgetType: projectBody.budgetType || "Low Cost/No Cost",
        package: projectBody.package || null,
        metric: {},
        imagesInReports: projectBody.imagesInReports || [],
        formulas: projectBody.formulas || {},
        config: projectBody.config || {},
        projects: newProjectIds,
        groups: options.groups || {},
        equipments: options.equipments || [],
        equipmentToGroupMap: options.equipmentToGroupMap || {},
        equipmentToProjectMap: newEquipmentToProjectMap || {},
        equipmentToEquipmentNameMap: options.equipmentToEquipmentNameMap || {}
      }
    );

    let newProjectV2 = new Project(fullProjectData);
    await newProjectV2.save();
    let newId = newProjectV2._id;

    const organization = await Organization.findById(req.organization._id);
    organization.projectIds.push(newId);
    organization.markModified("projectIds");

    await organization.save();

    res.sendResult = {
      status: "Success",
      message: "Copy Measure to Organization"
    };
    return next();
  } catch (error) {
    console.log("error", error);
    return util.sendError(error, 500, req, res, next);
  }
};

exports.updateOrganizationProjectWithSubProject = async (req, res, next) => {
  try {
    const user = req.user;
    const { payload: projectBody, options = {}, id } = req.body;
    let project = await Project.findById(id);
    let oldProjects = project.projects || [];
    oldProjects = oldProjects.map(id => id.toString());
    oldProjects = oldProjects.filter(id => !subProjects.includes(id));
    await Project.deleteMany({ _id: { $in: oldProjects } });

    const initialValues = Object.assign({}, projectBody.initialValues);
    delete initialValues["rates"];
    const {
      subProjects = [],
      groups = {},
      equipmentToGroupMap = {},
      equipmentToProjectMap = {},
      equipmentToEquipmentNameMap = {},
      equipments = []
    } = options;

    project = _.extend(project, {
      name: projectBody.name,
      displayName: projectBody.displayName,
      originalDisplayName: projectBody.originalDisplayName,
      source: projectBody.source || "",
      fuel: projectBody.fuel || "",
      description: projectBody.description,
      project_category: projectBody.project_category,
      project_application: projectBody.project_application,
      project_technology: projectBody.project_technology,
      implementation_strategy: projectBody.implementation_strategy,
      category: projectBody.category,
      initialValues: initialValues,
      locations: projectBody.locations,
      analysisType: projectBody.analysisType || "prescriptive",
      type: projectBody.type,
      runResults: {},
      createdByUserId: user._id,
      imageUrls: projectBody.imageUrls || [],
      isComplete: true,
      status: projectBody.status || "",
      type: projectBody.type || "",
      measureLife: projectBody.measureLife || "",
      budgetType: projectBody.budgetType || "Low Cost/No Cost",
      package: projectBody.package || null,
      metric: {},
      imagesInReports: projectBody.imagesInReports || [],
      formulas: projectBody.formulas || {},
      config: projectBody.config || {},
      projects: options.subProjects || [],
      groups: groups,
      equipmentToGroupMap: equipmentToGroupMap,
      equipmentToProjectMap: equipmentToProjectMap,
      equipmentToEquipmentNameMap: equipmentToEquipmentNameMap,
      equipments: equipments,
      rates: projectBody.rates,
      fiels: projectBody.fields || [],
      updated: Date.now()
    });
    await project.save();
    const finalProject = await Project.findById(id)
      .populate("package", "name")
      .populate("projects")
      .populate("author")
      .exec();
    res.sendResult = {
      status: "Success",
      message: "Update Measure",
      project: finalProject
    };
    return next();
  } catch (error) {
    console.log("error", error);
    return util.sendError(error, 500, req, res, next);
  }
};
