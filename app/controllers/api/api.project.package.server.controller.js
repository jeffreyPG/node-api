const _ = require("lodash");
const mongoose = require("mongoose");
const ProjectPackage = mongoose.model("ProjectPackage");
const MeasurePackage = mongoose.model("MeasurePackage");
const Project = mongoose.model("Project");
const ProjectDatawareHouse = mongoose.model("ProjectDatawareHouse");
const Organization = mongoose.model("Organization");
const utils = require("util");
const validate = require("./utils/api.validation");
const util = require("./utils/api.utils");
const { calculate } = require("../../scripts/projectghg.script");
const projectSyncScript = require("../../scripts/projectsync.script");
const { getPackageProjectRunResult } = require("./utils/api.scenario.util");
const analysisClient = require("./utils/api.analysis.client");
const salesforce = require("../../salesforce/salesforce.project");
const {
  calculateMetric,
  mockData,
  calculateMeasurePackageTotal,
  updateProjectIdsForBuilding
} = require("./utils/api.project.util");

const getProjectPackages = async (req, res, next) => {
  try {
    let projectPackages = await ProjectPackage.find({
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
      .populate({
        path: "measurePackages",
        populate: { path: "projects author" }
      })
      .populate("author")
      .lean();

    projectPackages = projectPackages.map(projectPackage => {
      let measurePackages = projectPackage.measurePackages || [];
      measurePackages = measurePackages.map(measurePackage => {
        let mockProjects = mockData(measurePackage);
        delete measurePackage.projects;
        measurePackage.projects = mockProjects;
        return measurePackage;
      });
      delete projectPackage.measurePackages;
      projectPackage.measurePackages = measurePackages;
      return projectPackage;
    });

    projectPackages = projectPackages.map(projectPackage => {
      let mockProjects = mockData(projectPackage);
      delete projectPackage.projects;
      delete projectPackage.measurePackages;
      projectPackage.projects = mockProjects;
      return projectPackage;
    });

    res.sendResult = {
      status: "Success",
      message: "Get Project Packages",
      projectPackages: projectPackages
    };
    return next();
  } catch (err) {
    return util.sendError(
      "Issues loading the project package",
      500,
      req,
      res,
      next
    );
  }
};

const createProjectPackage = async (req, res, next) => {
  try {
    const projectPackage = new ProjectPackage({
      name: req.body.name,
      description: req.body.description,
      status: req.body.status || "Identified",
      constructionStatus: req.body.constructionStatus || "Conceptual design",
      estimatedStartDate: req.body.estimatedStartDate,
      estimatedCompletionDate: req.body.estimatedCompletionDate,
      actualStartDate: req.body.actualStartDate,
      actualCompletionDate: req.body.actualCompletionDate,
      buildingId: req.building._id,
      projects: req.body.projects,
      measurePackages: req.body.measurePackages,
      createdByUserId: req.body.altCreatedByUserId || req.user._id,
      total: req.body.total || {},
      totalWithRate: req.body.total || {},
      rates: req.body.rates || {},
      fields: req.body.fields || [],
      fieldValues: req.body.fieldValues || []
    });
    let newProjectPackage = await projectPackage.save();
    newProjectPackage = await ProjectPackage.findById(
      newProjectPackage._id
    ).lean();
    let projectIds = req.body.projects || [];
    for (let id of projectIds) {
      let project = await Project.findById(id);
      let runObj = project.runResults || {};
      let result = await getPackageProjectRunResult(project, req.building._id);
      runObj[req.building._id] = result;
      let runWithRateObj = project.runResultsWithRate || {};
      let resultWithRate = await getPackageProjectRunResult(
        project,
        req.building._id,
        newProjectPackage.rates
      );
      runWithRateObj[req.building._id] = resultWithRate;
      project.runResults = runObj;
      project.runResultsWithRate = runWithRateObj;
      project.package = newProjectPackage._id;
      project.markModified("runResults");
      project.markModified("runResultsWithRate");
      project.markModified("package");
      await project.save();
    }
    await runProjectGHGScript(req.building._id);
    await runProjectSyncScript(projectIds);
    for (let id of projectIds) {
      let project = await Project.findById(id);
      project.metric = calculateMetric(project, req.building._id);
      if (project.metric.eul) project.measureLife = project.metric.eul;
      project.markModified("metric");
      await project.save();
    }
    let measurePackageIds = req.body.measurePackages || [];
    for (let id of measurePackageIds) {
      let measurePackage = await MeasurePackage.findById(id);
      measurePackage.package = newProjectPackage._id;
      await measurePackage.save();
    }
    newProjectPackage = await ProjectPackage.findById(newProjectPackage._id)
      .populate({
        path: "projects",
        populate: {
          path: "projects author"
        }
      })
      .populate({
        path: "measurePackages",
        populate: { path: "projects author" }
      })
      .populate("author")
      .lean();
    let mockProjects = mockData(newProjectPackage);
    delete newProjectPackage.projects;
    delete newProjectPackage.measurePackages;
    newProjectPackage.projects = mockProjects;

    Organization.findOne({ buildingIds: projectPackage.buildingId }, function(
      err,
      org
    ) {
      // For SalesForce
      if (err) {
        console.error(
          "Failed to update salesforce with new project",
          projectPackage._id
        );
      }

      try {
        salesforce.updateProjects([projectPackage], org);
      } catch (err) {
        console.error("SalesForce was not updated:", err);
      }
    });

    res.sendResult = {
      status: "Success",
      message: "Create Project Package",
      projectPackage: newProjectPackage
    };
    return next();
  } catch (err) {
    console.log(err);
    return util.sendError(
      "Issues creating the project package",
      500,
      req,
      res,
      next
    );
  }
};

const updateProjectPackage = async (req, res, next) => {
  try {
    let originProjectIds =
      (req.projectPackage && req.projectPackage.projects) || [];
    originProjectIds = originProjectIds.map(id => id.toString());
    let originMeasurePackageIds =
      (req.projectPackage && req.projectPackage.originMeasurePackageIds) || [];
    originMeasurePackageIds = originMeasurePackageIds.map(id => id.toString());
    Object.assign(req.projectPackage, {
      name: req.body.name,
      description: req.body.description,
      status: req.body.status || "Identified",
      constructionStatus: req.body.constructionStatus || "Conceptual design",
      estimatedStartDate: req.body.estimatedStartDate,
      estimatedCompletionDate: req.body.estimatedCompletionDate,
      actualStartDate: req.body.actualStartDate,
      actualCompletionDate: req.body.actualCompletionDate,
      projects: req.body.projects,
      measurePackages: req.body.measurePackages,
      total: req.body.total || {},
      totalWithRate: req.body.total || {},
      rates: req.body.rates || {},
      updated: Date.now(),
      fields: req.body.fields || [],
      fieldValues: req.body.fieldValues || [],
      createdByUserId: req.body.altCreatedByUserId || req.projectPackage.createdByUserId
    });
    let newProjectPackage = await req.projectPackage.save();
    newProjectPackage = await ProjectPackage.findById(
      newProjectPackage._id
    ).lean();
    let projects = [];
    let projectIds = req.body.projects || [];
    originProjectIds = originProjectIds.filter(
      id => projectIds.indexOf(id) === -1
    );
    let measurePackageIds = req.body.measurePackages || [];
    originMeasurePackageIds = originMeasurePackageIds.filter(
      id => measurePackageIds.indexOf(id) === -1
    );

    for (let id of projectIds) {
      let project = await Project.findById(id);
      if (project) {
        let runObj = project.runResults || {};
        let result = await getPackageProjectRunResult(
          project,
          req.building._id
        );
        runObj[req.building._id] = result;
        let runWithRateObj = project.runResultsWithRate || {};
        let resultWithRate = await getPackageProjectRunResult(
          project,
          req.building._id,
          newProjectPackage.rates
        );
        runWithRateObj[req.building._id] = resultWithRate;
        project.runResults = runObj;
        project.runResultsWithRate = runWithRateObj;
        project.package = newProjectPackage._id;
        project.markModified("runResults");
        project.markModified("runResultsWithRate");
        project.markModified("package");
        await project.save();
      }
    }
    await runProjectGHGScript(req.building._id);
    for (let id of projectIds) {
      let project = await Project.findById(id);
      project.metric = calculateMetric(project, req.building._id);
      if (project.metric.eul) project.measureLife = project.metric.eul;
      project.markModified("metric");
      await project.save();
    }

    for (let id of originProjectIds) {
      await Project.update({ _id: id }, { $unset: { package: 1 } });
    }
    await runProjectSyncScript([...projectIds, originProjectIds]);
    for (let id of originMeasurePackageIds) {
      await MeasurePackage.update({ _id: id }, { $unset: { package: 1 } });
    }

    for (let id of measurePackageIds) {
      await MeasurePackage.update(
        { _id: id },
        { package: newProjectPackage._id }
      );
    }
    // for (let id of measurePackageIds) {
    //   let measurePackage = await MeasurePackage.findById(id)
    //   measurePackage.package = newProjectPackage._id
    //   await measurePackage.save()
    // }

    newProjectPackage = await ProjectPackage.findById(newProjectPackage._id)
      .populate({
        path: "projects",
        populate: {
          path: "projects author"
        }
      })
      .populate("author")
      .populate({
        path: "measurePackages",
        populate: { path: "projects author" }
      })
      .lean();
    let mockProjects = mockData(newProjectPackage);
    delete newProjectPackage.projects;
    delete newProjectPackage.measurePackages;
    newProjectPackage.projects = mockProjects;

    Organization.findOne(
      { buildingIds: newProjectPackage.buildingId },
      function(err, org) {
        // For SalesForce
        if (err) {
          console.error(
            "Failed to update salesforce with new project",
            newProjectPackage._id
          );
        }

        try {
          salesforce.updateProjects([newProjectPackage], org);
        } catch (err) {
          console.error("SalesForce was not updated:", err);
        }
      }
    );

    res.sendResult = {
      status: "Success",
      projectPackage: newProjectPackage,
      message: "Update Project Package"
    };
    return next();
  } catch (err) {
    console.log(err);
    return util.sendError(
      "Issues updating the project package",
      500,
      req,
      res,
      next
    );
  }
};

const removeProjectPackage = async (req, res, next) => {
  try {
    let projectIds = (req.projectPackage && req.projectPackage.projects) || [];
    let measurePackageIds =
      (req.projectPackage && req.projectPackage.measurePackages) || [];
    projectIds = projectIds.map(id => id.toString());
    measurePackageIds = measurePackageIds.map(id => id.toString());
    for (let id of projectIds) {
      await Project.update({ _id: id }, { $unset: { package: 1 } });
    }
    for (let id of measurePackageIds) {
      await MeasurePackage.update({ _id: id }, { $unset: { package: 1 } });
    }
    await req.projectPackage.remove();
    await runProjectSyncScript(projectIds);
    res.sendResult = {
      status: "Success",
      message: "Remove Project Package"
    };
    return next();
  } catch (err) {
    return util.sendError(
      "Issues removing the project package",
      500,
      req,
      res,
      next
    );
  }
};

const addIncompleteProjectPackage = async (req, res, next) => {
  try {
    const building = req.building;
    const user = req.user;
    const { payload: projectBody, rates } = req.body;
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
        imagesInReports: projectBody.imagesInReports || [],
        isComplete: projectBody.isComplete || false,
        status: projectBody.status || "Identified",
        type: projectBody.type || "",
        measureLife: projectBody.measureLife || "0",
        budgetType: projectBody.budgetType || "Low Cost/No Cost"
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
    let updatedProjectIds = updateProjectIdsForBuilding(building.projectIds, [
      savedProject._id
    ]);
    building.projectIds = updatedProjectIds;
    building.markModified("projectIds");
    let savedBuilding = await building.save();
    await runProjectGHGScript(savedBuilding._id);
    await runProjectSyncScript(savedProject._id);

    savedProject = await Project.findById(savedProject._id);
    savedProject.metric = calculateMetric(savedProject, savedBuilding._id);
    if (savedProject.metric.eul)
      savedProject.measureLife = savedProject.metric.eul;
    savedProject.markModified("metric");
    savedProject = await savedProject.save();

    let projectResult = await Project.findById(savedProject._id).populate(
      "author"
    );
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

const getCashFlow = async (req, res, next) => {
  try {
    const asyncFuc = utils.promisify(analysisClient.getCashFlow);
    const data = await asyncFuc(req.body);
    res.sendResult = {
      status: "Success",
      data: JSON.parse(data),
      message: "Get Cash Flow"
    };
    return next();
  } catch (err) {
    console.log(err);
    return util.sendError("Issues getting cash flow", 400, req, res, next);
  }
};

const projectPackageById = (req, res, next, id) => {
  if (!validate.valMongoObjId(id)) {
    return next(new Error("Invalid ID present in request."));
  }

  ProjectPackage.findById(id).exec(function(err, project) {
    if (err) return next(err);
    if (!project)
      return next(new Error("Failed to load Project Package " + id));
    req.projectPackage = project;
    return next();
  });
};

const reRunProjectsByIds = async (req, res, next) => {
  try {
    let { ids, rates } = req.body;
    let { projectIds, measurePackageIds } = ids;

    let measurePackageMeasureIds = [];
    for (let id of measurePackageIds) {
      let measurePackage = await MeasurePackage.findById(id);
      let projects = measurePackage.projects || [];
      measurePackageMeasureIds = [...measurePackageMeasureIds, ...projects];
    }

    let allProjectIds = [...projectIds, ...measurePackageMeasureIds];
    allProjectIds = allProjectIds.map(id => id.toString());

    for (let id of allProjectIds) {
      let project = await Project.findById(id);
      let runObj = project.runResultsWithRate || {};
      let result = await getPackageProjectRunResult(
        project,
        req.building._id,
        rates
      );
      runObj[req.building._id] = result;
      project.runResultsWithRate = runObj;
      project.markModified("runResultsWithRate");
      await project.save();
    }
    await runProjectGHGScript(req.building._id);
    await runProjectSyncScript(allProjectIds);

    console.log(measurePackageIds);
    for (let id of measurePackageIds) {
      let measurePackage = await MeasurePackage.findById(id);
      delete measurePackage.totalWithRates;
      let totalWithRates = await calculateMeasurePackageTotal(
        req.building._id,
        measurePackage._id,
        "runResultsWithRate"
      );
      measurePackage.totalWithRates = totalWithRates;
      measurePackage.markModified("totalWithRates");
      await measurePackage.save();
    }
    let projects = await Project.find({ _id: { $in: projectIds } }).lean();
    let measurePackages = await MeasurePackage.find({
      _id: { $in: measurePackageIds }
    })
      .populate({
        path: "projects",
        populate: {
          path: "projects author"
        }
      })
      .populate("author")
      .lean();
    measurePackages = measurePackages.map(measurePackage => {
      let projects = measurePackage.projects || [];
      projects = projects.map(project => {
        return {
          ...project,
          collectionTarget: "measure"
        };
      });
      return {
        ...measurePackage,
        collectionTarget: "measurePackage",
        projects
      };
    });
    projects = projects.map(project => {
      return {
        ...project,
        collectionTarget: "measure"
      };
    });

    projects = [...projects, ...measurePackages];
    res.sendResult = {
      status: "Success",
      projects: projects,
      message: "Rerun the measures with Project rates"
    };
    return next();
  } catch (error) {
    console.log(error);
    return util.sendError(
      "Issues Rerunning the measures with Project rates",
      400,
      req,
      res,
      next
    );
  }
};

const reRunProjectPackage = async (req, res, next) => {
  try {
    const building = req.building;
    const user = req.user;
    const { payload: projectBody } = req.body;
    let project = new Project({
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
      budgetType: projectBody.budgetType || "Low Cost/No Cost"
    });
    await project.validate();
    project.updated = Date.now();
    let runObj = project.runResults || {};
    let runWithRateObj = project.runResultsWithRate || {};
    let result = await getPackageProjectRunResult(project, building._id);
    runObj[building._id] = result;
    runWithRateObj[building._id] = result;
    project.runResults = runObj;
    project.runResultsWithRate = runWithRateObj;
    project.markModified("runResults");
    project.markModified("runResultsWithRate");
    let savedProject = await project.save();
    let updatedProjectIds = updateProjectIdsForBuilding(building.projectIds, [
      savedproject._id
    ]);
    building.projectIds = updatedProjectIds;
    building.markModified("projectIds");
    let savedBuilding = await building.save();
    await runProjectGHGScript(savedBuilding._id);
    await runProjectSyncScript(savedProject._id);

    savedProject = await Project.findById(savedProject._id);
    savedProject.metric = calculateMetric(savedProject, savedBuilding._id);
    if (savedProject.metric.eul)
      savedProject.measureLife = savedProject.metric.eul;
    savedProject.markModified("metric");
    savedProject = await savedProject.save();

    let projectResult = await Project.findById(savedProject._id).populate(
      "author"
    );
    res.sendResult = {
      status: "Success",
      project: projectResult.toObject(),
      message: "Created/Updated Measure"
    };
    return next();
  } catch (error) {
    console.log(err);
    return util.sendError(
      "Issues creating/updating measure",
      400,
      req,
      res,
      next
    );
  }
};

const deleteBulkMeasureForProject = async (req, res, next) => {
  try {
    let { projectIds, measurePackageIds } = req.body;
    let measurePackageMeasureIds = [];
    for (let id of measurePackageIds) {
      let measurePackage = await MeasurePackage.findById(id);
      let projects = measurePackage.projects || [];
      measurePackageMeasureIds = [...measurePackageMeasureIds, ...projects];
    }
    let allProjectIds = [...projectIds, ...measurePackageMeasureIds];
    allProjectIds = allProjectIds.map(id => id.toString());
    await Project.deleteMany({ _id: { $in: allProjectIds } });
    await ProjectDatawareHouse.deleteMany({ _id: { $in: allProjectIds } });
    await MeasurePackage.deleteMany({ _id: { $in: measurePackageIds } });
    res.sendResult = {
      status: "Success",
      message:
        "Successfully remove Measures and Measure Packages for cancelled Project"
    };
    return next();
  } catch (err) {
    console.log(err);
    return util.sendError(
      "Issues removing Measures and Measure Packages for cancelled Project",
      400,
      req,
      res,
      next
    );
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

module.exports = {
  getProjectPackages,
  createProjectPackage,
  updateProjectPackage,
  removeProjectPackage,
  projectPackageById,
  addIncompleteProjectPackage,
  getCashFlow,
  reRunProjectsByIds,
  reRunProjectPackage,
  deleteBulkMeasureForProject
};
