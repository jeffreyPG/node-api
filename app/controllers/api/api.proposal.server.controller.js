"use strict";

/**
 * Module dependencies.
 */
const _ = require("lodash");
const mongoose = require("mongoose");
const Proposal = mongoose.model("Proposal");
const Project = mongoose.model("Project");
const MeasurePackage = mongoose.model("MeasurePackage");
const ProjectPackage = mongoose.model("ProjectPackage");
const ProposalTemplate = mongoose.model("ProposalTemplate");
const util = require("./utils/api.utils");
const validate = require("./utils/api.validation");
const {
  mockData,
  calculateProposalTotal
} = require("./utils/api.project.util");
const { getPackageProjectRunResult } = require("./utils/api.scenario.util");
const projectSyncScript = require("../../scripts/projectsync.script");
const { calculate } = require("../../scripts/projectghg.script");
const { calculateMetric } = require("./utils/api.project.util");
const { getPortfolioAllData } = require("./utils/api.proposal.util");

const getPortfolioBuildingProposals = async buildingIdString => {
  let proposals = [];
  try {
    let buildingId = buildingIdString.toString();
    let proposalList = await Proposal.find({
      buildingIds: { $in: [buildingId] },
      mode: { $in: ["PortfolioMeasure", "PortfolioProject"] }
    })
      .sort({
        updated: -1
      })
      .populate("organization")
      .populate("buildingIds")
      .populate("createdByUserId")
      .lean();
    let allOrganizationIds = [],
      allProjectIds = [],
      allProjectPackageIds = [],
      allBuildingIds = [];
    for (let proposal of proposalList) {
      let buildingIds = proposal.buildingIds || [];
      buildingIds = buildingIds.map(building => building._id.toString());
      let projectIds = proposal.measures || [];
      let projectPackageIds = proposal.projectPackages || [];
      projectIds = projectIds.map(id => id.toString());
      projectPackageIds = projectPackageIds.map(id => id.toString());
      let organizationId =
        proposal.organization && proposal.organization._id.toString();
      allOrganizationIds = [
        ...new Set([...allOrganizationIds, organizationId])
      ];
      allProjectIds = [...new Set([...allProjectIds, ...projectIds])];
      allProjectPackageIds = [
        ...new Set([...allProjectPackageIds, ...projectPackageIds])
      ];
      allBuildingIds = [...new Set([...allBuildingIds, ...buildingIds])];
    }
    let dashboard = await getPortfolioAllData(
      allOrganizationIds,
      allBuildingIds,
      allProjectIds,
      allProjectPackageIds
    );
    for (let proposal of proposalList) {
      let proposalBody = Object.assign({}, proposal);
      let buildingIds = proposalBody.buildingIds || [];
      let measureIds = proposalBody.measures || [];
      let projectPackageIds = proposalBody.projectPackages || [];
      let mode = proposalBody.mode;

      buildingIds = buildingIds.map(building => building._id.toString());
      measureIds = measureIds.map(id => id.toString());
      projectPackageIds = projectPackageIds.map(id => id.toString());
      let buildings = proposalBody.buildingIds || [];
      delete proposalBody.buildingIds;
      proposalBody.buildingIds = buildingIds || [];
      proposalBody.buildings = buildings || [];
      proposalBody.projects = [];
      proposalBody.projectPackages = [];

      if (mode === "PortfolioMeasure") {
        let measures = dashboard.projects.filter(
          project => measureIds.indexOf(project._id.toString()) > -1
        );
        delete proposalBody["measures"];
        delete proposalBody["projectPackages"];
        proposalBody["projects"] = measures;
        proposalBody["projectPackages"] = [];
      } else {
        let projectPackageList = dashboard.projectPackages.filter(
          project => projectPackageIds.indexOf(project._id.toString()) > -1
        );
        delete proposalBody["measures"];
        delete proposalBody["projectPackages"];
        proposalBody["projects"] = [];
        proposalBody["projectPackages"] = projectPackageList;
      }
      proposalBody["createdBy"] = {
        id: proposalBody.createdByUserId._id.toString() || null,
        name: proposalBody.createdByUserId.name
      };
      proposals.push(proposalBody);
    }
  } catch (error) {
    console.log("error", error);
  } finally {
    return proposals || [];
  }
};

const getProposals = async (req, res, next) => {
  try {
    let proposals = await Proposal.find({
      buildingIds: { $in: [req.building._id] },
      mode: { $in: ["Measure", "Project"] }
    })
      .sort({
        updated: -1
      })
      .populate({
        path: "measures",
        populate: {
          path: "projects author"
        }
      })
      .populate({
        path: "measurePackages",
        populate: {
          path: "projects",
          populate: {
            path: "projects author"
          }
        }
      })
      .populate({
        path: "projectPackages",
        populate: {
          path: "projects measurePackages author",
          populate: {
            path: "projects",
            populate: {
              path: "projects author"
            }
          }
        }
      })
      .populate("author")
      .lean()
      .exec();
    // mock data for measures and measure packages
    proposals = proposals.map(proposal => {
      let measurePackages = proposal.measurePackages || [];
      measurePackages = measurePackages.map(measurePackage => {
        let mockProjects = mockData(measurePackage);
        delete measurePackage.projects;
        measurePackage.projects = mockProjects;
        return measurePackage;
      });
      delete proposal.measurePackages;
      proposal.measurePackages = measurePackages;
      return proposal;
    });

    proposals = proposals.map(proposal => {
      let mockProjects = mockData(proposal);
      delete proposal.measures;
      delete proposal.measurePackages;
      proposal.projects = mockProjects;
      return proposal;
    });

    // mock data for proojects
    proposals = proposals.map(proposal => {
      let projectPackages = proposal.projectPackages || [];
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

        let mockProjects = mockData(projectPackage);
        delete projectPackage.measures;
        delete projectPackage.measurePackages;
        projectPackage.projects = mockProjects;
        return projectPackage;
      });
      delete proposal.projectPackages;
      proposal.projectPackages = projectPackages;
      return proposal;
    });

    let portfolioProposals = await getPortfolioBuildingProposals(
      req.building._id
    );
    proposals = [...proposals, ...portfolioProposals];
    proposals = proposals.sort((proposalA, proposalB) => {
      let updatedA = proposalA.updated;
      let updatedB = proposalB.updated;
      return updatedA > updatedB ? -1 : updatedA < updatedB ? 1 : 0;
    });

    res.sendResult = {
      status: "Success",
      message: "Get Proposals",
      proposals: proposals
    };
    return next();
  } catch (err) {
    console.log(err);
    return util.sendError("Issues loading the proposals", 500, req, res, next);
  }
};

const makeProjectFromProposal = async (req, proposal, status = "create") => {
  try {
    if (!proposal) return;
    if (proposal.mode === "Measure") {
      let newProjectPackage;
      if (status === "create") {
        const projectPackage = new ProjectPackage({
          name: proposal.name,
          description: "",
          status: "Proposal",
          constructionStatus: "Conceptual design",
          buildingId: req.building._id,
          projects: proposal.measures || [],
          measurePackages: proposal.measurePackages,
          createdByUserId: req.user._id,
          total: proposal.total || {},
          rates: proposal.rates || {}
        });
        newProjectPackage = await projectPackage.save();
      } else {
        newProjectPackage = await ProjectPackage.findById(
          proposal.convertedProjectPackage
        ).lean();
        if (!newProjectPackage) {
          const projectPackage = new ProjectPackage({
            name: proposal.name,
            description: "",
            status: "Proposal",
            constructionStatus: "Conceptual design",
            buildingId: req.building._id,
            projects: proposal.measures || [],
            measurePackages: proposal.measurePackages,
            createdByUserId: req.user._id,
            total: proposal.total || {},
            rates: proposal.rates || {}
          });
          newProjectPackage = await projectPackage.save();
        } else {
          Object.assign(newProjectPackage, {
            name: proposal.name,
            description: "",
            status: "Proposal",
            constructionStatus: "Conceptual design",
            buildingId: req.building._id,
            projects: proposal.measures || [],
            measurePackages: proposal.measurePackages,
            total: proposal.total || {},
            rates: proposal.rates || {}
          });
          newProjectPackage = await newProjectPackage.save();
        }
      }
      let projectIds = proposal.measures || [];
      for (let id of projectIds) {
        let project = await Project.findById(id);
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
        // project.package = newProjectPackage._id;
        project.markModified("runResults");
        project.markModified("runResultsWithRate");
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
      proposal.convertedProjectPackage = newProjectPackage._id;
      await proposal.save();
    } else {
      let ids = proposal.projectPackages || [];
      for (let id of ids) {
        let projectPackage = await ProjectPackage.findById(id);
        projectPackage.previousStatus = projectPackage.status;
        projectPackage.status = "Proposal";
        await projectPackage.save();
      }
    }
  } catch (error) {
    console.log(error);
  }
};

const createProposal = async (req, res, next) => {
  try {
    let fields = [],
      fieldValues = {};

    if (req.body.proposalTemplate) {
      let proposalTemplate = await ProposalTemplate.findById(
        req.body.proposalTemplate
      );
      fields = [...(proposalTemplate.fields || [])];
      if (req.body.fieldValues) {
        fieldValues = Object.assign({}, req.body.fieldValues);
      }
    }
    let total = req.body.total || null;
    if (total === null) {
      total = await calculateProposalTotal(
        req.body.measures,
        req.body.measurePackages,
        req.body.projectPackages
      );
    }

    const proposal = new Proposal({
      name: req.body.name,
      description: req.body.description,
      status: req.body.status || "Identified",
      measures: req.body.measures,
      measurePackages: req.body.measurePackages,
      projectPackages: req.body.projectPackages,
      createdByUserId: req.user._id,
      total: total || {},
      rates: req.body.rates || {},
      comments: req.body.comments || "",
      images: req.body.images || [],
      template: req.body.proposalTemplate || null,
      fieldValues: fieldValues,
      fields: fields,
      buildingIds: req.body.buildingIds,
      organization: req.body.organizaiton,
      mode: req.body.mode,
      rates: req.body.rates || {}
    });

    let newProposal = await proposal.save();

    await makeProjectFromProposal(req, newProposal, "create");

    newProposal = await Proposal.findById(newProposal._id)
      .populate("buildingIds")
      .populate({
        path: "measures",
        populate: {
          path: "projects author"
        }
      })
      .populate({
        path: "measurePackages",
        populate: {
          path: "projects",
          populate: {
            path: "projects author"
          }
        }
      })
      .populate({
        path: "projectPackages",
        populate: {
          path: "projects measurePackages",
          populate: {
            path: "projects author",
            populate: {
              path: "projects author"
            }
          }
        }
      })
      .populate("author")
      .lean()
      .exec();
    let mockProjects = mockData(newProposal);
    delete newProposal.measures;
    delete newProposal.measurePackages;
    newProposal.projects = mockProjects;
    res.sendResult = {
      status: "Success",
      message: "Create Proposal",
      proposal: newProposal
    };
    return next();
  } catch (err) {
    console.log(err);
    return util.sendError("Issues creating the proposal", 500, req, res, next);
  }
};

const updateProposal = async (req, res, next) => {
  try {
    let fields = [],
      fieldValues = {};
    if (req.body.proposalTemplate) {
      let proposalTemplate = await ProposalTemplate.findById(
        req.body.proposalTemplate
      );
      fields = [...(proposalTemplate.fields || [])];
      if (req.body.fieldValues) {
        fieldValues = Object.assign({}, req.body.fieldValues);
      }
    }
    let previousProjectPackageIds =
      (req.proposal.mode === "Project" && req.proposal.projectPackages) || [];
    previousProjectPackageIds = previousProjectPackageIds
      .map(item => item._id)
      .filter(item => !!item)
      .map(item => item.toString());
    previousProjectPackageIds = previousProjectPackageIds.filter(
      item => req.body.projectPackages.indexOf(item) === -1
    );
    if (previousProjectPackageIds) {
      for (let id of previousProjectPackageIds) {
        let projectPackage = await ProjectPackage.findById(id);
        if (projectPackage) {
          projectPackage.status = projectPackage.previousStatus;
          projectPackage.previousStatus = "";
          await projectPackage.save();
        }
      }
    }
    Object.assign(req.proposal, {
      name: req.body.name,
      description: req.body.description,
      status: req.body.status || "Identified",
      measures: req.body.measures,
      measurePackages: req.body.measurePackages,
      projectPackages: req.body.projectPackages,
      total: req.body.total || {},
      rates: req.body.rates || {},
      updated: Date.now(),
      comments: req.body.comments || "",
      images: req.body.images || [],
      template: req.body.proposalTemplate || null,
      fieldValues: fieldValues,
      fields: fields,
      buildingIds: req.body.buildingIds,
      organization: req.body.organizaiton,
      mode: req.body.mode
    });
    let updateProposal = await req.proposal.save();
    await makeProjectFromProposal(req, updateProposal, "update");
    updateProposal = await Proposal.findById(updateProposal._id)
      .populate({
        path: "measures",
        populate: {
          path: "projects author"
        }
      })
      .populate({
        path: "measurePackages",
        populate: {
          path: "projects author",
          populate: {
            path: "projects author"
          }
        }
      })
      .populate({
        path: "projectPackages",
        populate: {
          path: "projects measurePackages",
          populate: {
            path: "projects author",
            populate: {
              path: "projects author"
            }
          }
        }
      })
      .populate("author")
      .lean()
      .exec();
    let mockProjects = mockData(updateProposal);
    delete updateProposal.measures;
    delete updateProposal.measurePackages;
    updateProposal.projects = mockProjects;
    res.sendResult = {
      status: "Success",
      message: "Update Proposal",
      proposal: updateProposal
    };
    return next();
  } catch (error) {
    console.log(error);
    return util.sendError("Issues updating the proposal", 500, req, res, next);
  }
};

const removeProposal = async (req, res, next) => {
  try {
    if (req.proposal.mode === "Measure") {
      let convertedProjectPackage = await ProjectPackage.findById(
        req.proposal.convertedProjectPackage
      );
      if (convertedProjectPackage) await convertedProjectPackage.remove();
    } else {
      let ids = req.proposal.projectPackages || [];
      for (let id of ids) {
        let projectPackage = await ProjectPackage.findById(id);
        if (projectPackage) {
          projectPackage.status = projectPackage.previousStatus;
          projectPackage.previousStatus = "";
          await projectPackage.save();
        }
      }
    }
    await req.proposal.remove();
    res.sendResult = {
      status: "Success",
      message: "Remove Proposal"
    };
    return next();
  } catch (error) {
    console.log(error);
    return util.sendError("Issues removing the proposal", 500, req, res, next);
  }
};

const proposalById = (req, res, next, id) => {
  if (!validate.valMongoObjId(id)) {
    return next(new Error("Invalid ID present in request."));
  }

  Proposal.findById(id).exec(function(err, proposal) {
    if (err) return next(err);
    if (!proposal) return next(new Error("Failed to load Proposasl" + id));
    req.proposal = proposal;
    return next();
  });
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

const getProposalProject = async (req, res, next) => {
  try {
    let project = await Project.findById(req.project._id)
      .lean()
      .exec();
    res.sendResult = {
      project: project,
      message: "Success getting project for Proposal"
    };
    return next();
  } catch (error) {
    console.log(error);
    return util.sendError("Issues removing the proposal", 500, req, res, next);
  }
};

module.exports = {
  getProposals,
  createProposal,
  updateProposal,
  removeProposal,
  proposalById,
  getProposalProject
};
