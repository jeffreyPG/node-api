const _ = require("lodash");
const mongoose = require("mongoose");
const utils = require("util");
const MeasurePackage = mongoose.model("MeasurePackage");
const ProjectDatawareHouse = mongoose.model("ProjectDatawareHouse");
const Building = mongoose.model("Building");
const Project = mongoose.model("Project");
const ObjectId = mongoose.Types.ObjectId;
const {
  calculateMeasurePackageTotal,
  addProjectToProjectPackage,
  removeProjectFromProjectPackage,
  calculateMetric,
  mockData
} = require("./utils/api.project.util");
const util = require("./utils/api.utils");
const { getPackageProjectRunResult } = require("./utils/api.scenario.util");
const validate = require("./utils/api.validation");
const { calculate } = require("../../scripts/projectghg.script");
const projectSyncScript = require("../../scripts/projectsync.script");

const getMeasurePackages = async (req, res, next) => {
  try {
    let measurePackages = await MeasurePackage.find({
      buildingId: req.building._id
    })
      .sort({
        updated: -1
      })
      .populate({
        path: "projects",
        populate: {
          path: "projects author"
        }
      })
      .populate("author")
      .lean()
      .exec();

    measurePackages = measurePackages.map(measurePackage => {
      let mockProjects = mockData(measurePackage);
      delete measurePackage.projects;
      measurePackage.projects = mockProjects;
      return measurePackage;
    });

    res.sendResult = {
      status: "Success",
      message: "Get Measure Packages",
      measurePackages: measurePackages
    };
    return next();
  } catch (error) {
    console.log("Issues loading the measure packages", error);
    return util.sendError(
      "Issues loading the measure packages",
      500,
      req,
      res,
      next
    );
  }
};

const createMeasurePackage = async (req, res, next) => {
  try {
    let { values: body, mode } = req.body;
    delete body._id;
    const measurePackage = new MeasurePackage({
      name: body.name,
      description: body.description,
      package: body.package || null,
      projects: body.projects || [],
      total: body.total || {},
      category: body.category,
      application: body.application,
      technology: body.technology,
      status: body.status || "Identified",
      type: body.type || "",
      budgetType: body.budgetType || "Low Cost/No Cost",
      comments: body.comments || "",
      images: body.images || [],
      createdByUserId: req.user._id
    });
    let projectIds = body.projects || [];
    let savedMeasurePackage = await measurePackage.save();

    let total = await calculateMeasurePackageTotal(
      req.building._id,
      savedMeasurePackage._id
    );
    if (mode === "ProjectView") {
      savedMeasurePackage.total = total;
      savedMeasurePackage.totalWithRates = total;
    } else {
      savedMeasurePackage.total = total;
      let totalWithRates = await calculateMeasurePackageTotal(
        req.building._id,
        savedMeasurePackage._id,
        "runResultsWithRate"
      );
      savedMeasurePackage.totalWithRates = totalWithRates;
    }
    savedMeasurePackage.markModified("total");
    savedMeasurePackage.markModified("totalWithRates");
    savedMeasurePackage = await savedMeasurePackage.save();

    let measurePackageIds = req.building.measurePackageIds || [];
    measurePackageIds = measurePackageIds.map(id => id.toString());
    measurePackageIds = [
      ...measurePackageIds,
      savedMeasurePackage._id.toString()
    ];
    measurePackageIds = [...new Set(measurePackageIds)];
    req.building.measurePackageIds = measurePackageIds;
    let measurePackageMeasureIds = req.building.measurePackageMeasureIds || [];
    measurePackageMeasureIds = [...measurePackageMeasureIds, ...projectIds];
    await req.building.save();

    await addProjectToProjectPackage(
      req.building._id,
      body.package,
      savedMeasurePackage._id,
      "measurePackage"
    );

    savedMeasurePackage = await MeasurePackage.findById(savedMeasurePackage._id)
      .populate({
        path: "projects",
        populate: {
          path: "projects author"
        }
      })
      .populate("author")
      .lean();
    let mockProjects = mockData(savedMeasurePackage);
    delete savedMeasurePackage.projects;
    savedMeasurePackage.projects = mockProjects;

    res.sendResult = {
      status: "Success",
      message: "Create Measure Package",
      measurePackage: savedMeasurePackage
    };
    return next();
  } catch (error) {
    console.log("Issues creating the measure package", error);
    return util.sendError(
      "Issues creating the measure package",
      500,
      req,
      res,
      next
    );
  }
};

const updateMeasurePackage = async (req, res, next) => {
  try {
    let { values: body, mode } = req.body;
    let buildingId = req.building._id;
    let originProjectIds =
      (req.measurePackage && req.measurePackage.projects) || [];
    let previousProjectPackage = req.measurePackage.package || "";
    Object.assign(req.measurePackage, {
      name: body.name,
      description: body.description,
      package: body.package || null,
      projects: body.projects || [],
      total: body.total || {},
      updated: Date.now(),
      category: body.category,
      application: body.application,
      technology: body.technology,
      status: body.status || "Identified",
      type: body.type || "",
      budgetType: body.budgetType || "Low Cost/No Cost",
      comments: body.comments || "",
      images: body.images || []
    });
    let projectIds = body.projects || [];
    originProjectIds = originProjectIds.map(pid => pid.toString());
    originProjectIds = originProjectIds.filter(
      pid => projectIds.indexOf(pid) === -1
    );

    // remove measures from measure package

    let measurePackageMeasureIds = req.building.measurePackageMeasureIds || [];
    measurePackageMeasureIds = measurePackageMeasureIds.filter(
      id => originProjectIds.indexOf(id) === -1
    );
    measurePackageMeasureIds = [...measurePackageMeasureIds, ...projectIds];
    measurePackageMeasureIds = [...new Set(measurePackageMeasureIds)];
    let updateBuilding = await Building.findById(req.building._id);
    updateBuilding.measurePackageMeasureIds = measurePackageMeasureIds;
    updateBuilding.markModified("measurePackageMeasureIds");
    await updateBuilding.save();

    let updatedMeasurePackage = await req.measurePackage.save();
    let total = await calculateMeasurePackageTotal(
      req.building._id,
      updatedMeasurePackage._id
    );
    if (mode === "ProjectView") {
      updatedMeasurePackage.total = total;
      updatedMeasurePackage.totalWithRates = total;
    } else {
      updatedMeasurePackage.total = total;
      let totalWithRates = await calculateMeasurePackageTotal(
        req.building._id,
        updatedMeasurePackage._id,
        "runResultsWithRate"
      );
      updatedMeasurePackage.totalWithRates = totalWithRates;
    }
    updatedMeasurePackage.markModified("total");
    updatedMeasurePackage.markModified("totalWithRates");
    updatedMeasurePackage = await updatedMeasurePackage.save();

    await removeProjectFromProjectPackage(
      buildingId,
      previousProjectPackage,
      updatedMeasurePackage._id,
      "measurePackage"
    );
    await addProjectToProjectPackage(
      buildingId,
      body.package,
      updatedMeasurePackage._id,
      "measurePackage"
    );

    updatedMeasurePackage = await MeasurePackage.findById(
      updatedMeasurePackage._id
    )
      .populate({
        path: "projects",
        populate: {
          path: "projects author"
        }
      })
      .populate("author")
      .lean();

    let mockProjects = mockData(updatedMeasurePackage);
    delete updatedMeasurePackage.projects;
    updatedMeasurePackage.projects = mockProjects;

    res.sendResult = {
      status: "Success",
      message: "Update Measure Package",
      measurePackage: updatedMeasurePackage
    };
    return next();
  } catch (error) {
    console.log("Issues updating the measure package", error);
    return util.sendError(
      "Issues updating the measure package",
      500,
      req,
      res,
      next
    );
  }
};

const removeMeasurePackage = async (req, res, next) => {
  try {
    let projectIds = (req.measurePackage && req.measurePackage.projects) || [];
    projectIds = projectIds.map(pid => ObjectId(pid));
    for (let id of projectIds) {
      await Project.update({ _id: id }, { $unset: { package: 1 } });
    }
    await ProjectDatawareHouse.deleteMany({ _id: { $in: projectIds } });

    // remove measure package from previous project
    let previousProjectPackage = req.measurePackage.package || "";
    if (previousProjectPackage) {
      removeProjectFromProjectPackage(
        req.building._id,
        previousProjectPackage,
        req.measurePackage._id,
        "measurePackage"
      );
    }
    await req.measurePackage.remove();

    // Remove measure package id from building
    let measurePackageIds = req.building.measurePackageIds || [];
    measurePackageIds = measurePackageIds.map(id => id.toString());
    measurePackageIds = measurePackageIds.filter(
      mid => mid !== req.measurePackage._id.toString()
    );
    measurePackageIds = [...new Set(measurePackageIds)];
    let measurePackageMeasureIds = req.building.measurePackageMeasureIds || [];
    measurePackageMeasureIds = measurePackageMeasureIds.map(id =>
      id.toString()
    );
    projectIds = projectIds.map(id => id.toString());
    measurePackageMeasureIds = measurePackageMeasureIds.filter(
      id => projectIds.indexOf(id) === -1
    );
    let updateBuilding = await Building.findById(req.building._id);
    updateBuilding.measurePackageIds = measurePackageIds;
    updateBuilding.measurePackageMeasureIds = measurePackageMeasureIds;
    updateBuilding.markModified("measurePackageIds");
    updateBuilding.markModified("measurePackageMeasureIds");
    await updateBuilding.save();

    res.sendResult = {
      status: "Success",
      message: "Remove Measure Package"
    };
    return next();
  } catch (err) {
    console.log("Issues removing the measure package", err);
    return util.sendError(
      "Issues removing the measure package",
      500,
      req,
      res,
      next
    );
  }
};

const createMeasurePackageMeasure = async (req, res, next) => {
  try {
    const building = req.building;
    const user = req.user;
    let { payload: projectBody, rates } = req.body;
    if (
      !rates ||
      (Object.keys(rates).length === 0 && rates.constructor === Object)
    )
      rates = building.rates;
    let project;
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
        analysisType: projectBody.analysisType,
        type: projectBody.type,
        runResults: req.project.runResults || {},
        createdByUserId: user._id,
        imageUrls: projectBody.imageUrls || [],
        isComplete: projectBody.isComplete || false,
        status: projectBody.status || "Identified",
        type: projectBody.type || "",
        measureLife: projectBody.measureLife || "0",
        budgetType: projectBody.budgetType || "Low Cost/No Cost",
        imagesInReports: projectBody.imagesInReports || []
      });
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
        analysisType: projectBody.analysisType,
        type: projectBody.type,
        runResults: {},
        createdByUserId: user._id,
        imageUrls: projectBody.imageUrls || [],
        isComplete: projectBody.isComplete || false,
        status: projectBody.status || "Identified",
        type: projectBody.type || "",
        measureLife: projectBody.measureLife || "0",
        budgetType: projectBody.budgetType || "Low Cost/No Cost",
        imagesInReports: projectBody.imagesInReports || []
      });
    }
    await project.validate();
    project.updated = Date.now();

    let runObj = project.runResults || {};
    let runWithRateObj = project.runResultsWithRate || {};
    let result = await getPackageProjectRunResult(project, building._id);
    runObj[building._id] = result;
    let resultWithRate = await getPackageProjectRunResult(
      project,
      building._id,
      rates
    );
    runWithRateObj[building._id] = resultWithRate;
    project.runResults = runObj;
    project.runResultsWithRate = runWithRateObj;
    project.markModified("runResults");
    project.markModified("runResultsWithRate");
    let savedProject = await project.save();
    let measureIds = building.measurePackageMeasureIds || [];
    measureIds.push(savedProject._id);
    measureIds = [...new Set(measureIds)];
    building.measurePackageMeasureIds = measureIds;
    building.markModified("measurePackageMeasureIds");
    let savedBuilding = await building.save();
    await runProjectGHGScript(savedBuilding._id);
    await runProjectSyncScript([...measureIds, ...building.projectIds]);

    savedProject = await Project.findById(savedProject._id);
    savedProject.metric = calculateMetric(savedProject, savedBuilding._id);
    if (savedProject.metric.eul)
      savedProject.measureLife = savedProject.metric.eul;
    savedProject.markModified("metric");
    savedProject = await savedProject.save();

    let projectResult = await Project.findById(savedProject._id)
      .populate("author")
      .lean();
    res.sendResult = {
      status: "Success",
      project: projectResult.toObject(),
      message: "Created/Updated Measure"
    };
    return next();
  } catch (err) {
    console.log(err);
    return util.sendError("Issues create/update measure", 400, req, res, next);
  }
};

const createTempMeasurePackage = async (req, res, next) => {
  try {
    let body = req.body;
    let projectIds = body.projects || [];
    let updatedProjectIds = [];
    for (let id of projectIds) {
      let originalProject = await Project.findById(id).lean();
      let project = new Project({
        name: originalProject.name,
        displayName: originalProject.displayName,
        originalDisplayName: originalProject.originalDisplayName,
        source: originalProject.source || "",
        fuel: originalProject.fuel || "",
        description: originalProject.description,
        project_category: originalProject.project_category,
        project_application: originalProject.project_application,
        project_technology: originalProject.project_technology,
        implementation_strategy: originalProject.implementation_strategy,
        incentive: originalProject.incentive,
        fields: originalProject.fields,
        category: originalProject.category,
        initialValues: originalProject.initialValues,
        locations: originalProject.locations,
        analysisType: originalProject.analysisType || "prescriptive",
        type: originalProject.type,
        createdByUserId: originalProject.createdByUserId,
        imageUrls: originalProject.imageUrls || [],
        imagesInReports: originalProject.imagesInReports || [],
        isComplete: originalProject.isComplete,
        status: originalProject.status || "Identified",
        type: originalProject.type || "",
        measureLife: originalProject.measureLife || "0",
        budgetType: originalProject.budgetType || "Low Cost/No Cost",
        package: null,
        metric: originalProject.metric,
        runResults: originalProject.runResults,
        runResultsWithRate: originalProject.runResults
      });
      project = await project.save();
      updatedProjectIds = [...updatedProjectIds, project._id];
    }

    let measurePackage = new MeasurePackage({
      name: body.name,
      description: body.description,
      package: null,
      projects: updatedProjectIds,
      total: body.total || {},
      category: body.category,
      application: body.application,
      technology: body.technology,
      status: body.status || "Identified",
      type: body.type || "",
      budgetType: body.budgetType || "Low Cost/No Cost",
      comments: body.comments || "",
      images: body.images || [],
      createdByUserId: req.user._id
    });
    let savedMeasurePackage = await measurePackage.save();
    let total = await calculateMeasurePackageTotal(
      req.building._id,
      savedMeasurePackage._id
    );
    savedMeasurePackage.total = total;
    savedMeasurePackage.totalWithRates = total;
    savedMeasurePackage.markModified("total");
    savedMeasurePackage.markModified("totalWithRates");
    savedMeasurePackage = await savedMeasurePackage.save();

    savedMeasurePackage = await MeasurePackage.findById(savedMeasurePackage._id)
      .populate({
        path: "projects",
        populate: {
          path: "projects author"
        }
      })
      .populate("author")
      .lean();
    let mockProjects = mockData(savedMeasurePackage);
    delete savedMeasurePackage.projects;
    savedMeasurePackage.projects = mockProjects;

    res.sendResult = {
      status: "Success",
      message: "Remove Measure Package",
      measurePackage: savedMeasurePackage
    };
    return next();
  } catch (err) {
    console.log("Issues creating Temp Measure Package", err);
    return util.sendError(
      "Issues creating Temp Measure Package",
      500,
      req,
      res,
      next
    );
  }
};

const _bulkEvaluateMeasurePackages = async (ids, buildingId) => {
  for (let id of ids) {
    await calculateMeasurePackageTotal(buildingId, id);
  }
};

const runProjectGHGScript = async buildingId => {
  const options = {
    buildingIds: [buildingId]
  };
  await calculate(options);
};

const runProjectSyncScript = async projectId => {
  const options = {};
  if (typeof projectId === "object" && projectId.length)
    options.projectIds = projectId;
  else options.projectIds = [projectId];
  await projectSyncScript.calculate(options);
};

const measurePackageById = (req, res, next, id) => {
  if (!validate.valMongoObjId(id)) {
    return next(new Error("Invalid ID present in request."));
  }

  MeasurePackage.findById(id).exec(function(err, measurePackage) {
    if (err) return next(err);
    if (!measurePackage)
      return next(new Error("Failed to load Measure Package" + id));
    req.measurePackage = measurePackage;
    return next();
  });
};

module.exports = {
  getMeasurePackages,
  createMeasurePackage,
  updateMeasurePackage,
  removeMeasurePackage,
  createMeasurePackageMeasure,
  createTempMeasurePackage,
  measurePackageById,
  _bulkEvaluateMeasurePackages
};
