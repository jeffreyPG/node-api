const _ = require("lodash");
const request = require("request");
const requestPromise = require("request-promise");
const mongoose = require("mongoose");
const db = require("../../models/portfolio");
const datawarehouseDb = require("../../models/datawarehouse");
const Organization = mongoose.model("Organization");
const Scenario = mongoose.model("Scenario");
const Project = mongoose.model("Project");
const ProjectPackage = mongoose.model("ProjectPackage");
const MeasurePackage = mongoose.model("MeasurePackage");
const User = mongoose.model("User");
const Proposal = mongoose.model("Proposal");
const ProposalTemplate = mongoose.model("ProposalTemplate");
const ProjectDatawareHouse = mongoose.model("ProjectDatawareHouse");
const Building = mongoose.model("Building");
const BuildingEquipment = mongoose.model("BuildingEquipment");
const validate = require("./utils/api.validation");
const util = require("./utils/api.utils");
const { Op } = require("sequelize");
const stream = require("stream");
const zlib = require("zlib");

const {
  chunkArray,
  getScenarioProjectRunResult,
  buildingAttributes,
  monthlyUtilityAttributes,
  projectAttributes,
  projectPackageAttributes
} = require("./utils/api.scenario.util");
const projectghgScript = require("../../scripts/projectghg.script");
const scenarioScript = require("../../scripts/scenarioMetric.script");
const {
  calculateProjectPackageTotal,
  calculateMeasurePackageTotal,
  mockData,
  calculateProposalTotal
} = require("./utils/api.project.util");

const { memCache } = require("../../../server");

const findAllData = async ({
  model,
  filter = {},
  include,
  attributes,
  batchSize = 700,
  inputStream,
  parser
}) => {
  try {
    const max = await model.count({ where: filter });
    const offset = 0;
    const offsets = [];
    let start = offset;
    while (start < max) {
      offsets.push(start);
      start += batchSize;
    }
    for (const offset of offsets) {
      const difference = batchSize + offset - max;
      let results = await model.findAll({
        include,
        where: filter,
        attributes,
        offset,
        limit: difference > 0 ? batchSize - difference : batchSize
      });
      if (parser) {
        results = await parser(results);
      }
      inputStream.push(JSON.stringify(results) + "\n");
    }
  } catch (error) {
    console.log("stream error", error);
    return [];
  }
};

const mockScenarioData = async (scenario, hardReload = false) => {
  if (!scenario) return null;
  let data = { ...scenario };
  let projects = scenario.projectIds || [];
  let measurePackages = scenario.measurePackageIds || [];
  delete data.projectIds;
  delete data.measurePackageIds;
  data.projects = projects;
  data.measurePackages = measurePackages;
  data.projects = mockData(data);
  let buildingIds =
    (data && data.buildingIds && data.buildingIds.map(id => id.toString())) ||
    [];
  let organizations = scenario.organizations || [];
  let buildings = await getBuildings(buildingIds, organizations, hardReload);
  data.buildings = buildings;
  return data;
};

const getPortfolioBuilding = async (req, res, next) => {
  try {
    const user = req.user;
    let orgIds = user.orgIds.map(org => org.toString());
    let orgID = req.body.orgID || orgIds[orgIds.length - 1];
    let { organizationIds, hardReload } = req.body;
    let key = orgID.toString();
    let buildingQuery = {
      organization_id: orgID,
      archived: false
    };
    let buildings = [];
    if (organizationIds.length) {
      buildingQuery.organization_id = organizationIds;
      if (typeof organizationIds === "object")
        key = organizationIds.map(id => id.toString()).join(",");
    }

    let cachedScenarioData = memCache.get(`scenario - ${key}`);
    let cachedData = memCache.get(key);
    if (cachedScenarioData && !hardReload) {
      console.log("Load Cached Scenario Building Data");
      buildings = JSON.parse(cachedScenarioData) || [];
    } else if (cachedData && !hardReload) {
      console.log("Load Cached Portfolio Data");
      let dashboard = JSON.parse(cachedData);
      buildings = dashboard.buildings || [];
    } else {
      console.log("Loading Building Data");
      buildings = await db.Building.findAll({
        include: [
          {
            as: "projects",
            model: db.Project,
            attributes: ["_id"]
          },
          {
            as: "organization",
            model: db.Organization,
            attributes: ["_id", "name"],
            required: true
          },
          {
            as: "monthlyUtilities",
            model: db.Utility,
            attributes: monthlyUtilityAttributes
          },
          {
            as: "buildingUseTypes",
            model: db.BuildingUseType,
            attributes: ["use", "squarefeet"]
          },
          {
            as: "buildingPmScores",
            model: db.BuildingPmScore,
            attributes: ["year", "score"]
          }
        ],
        where: buildingQuery,
        attributes: buildingAttributes
      });
      let success = memCache.set(
        `scenario - ${key}`,
        JSON.stringify(buildings),
        1000
      );
    }
    const organization = await Organization.findById(orgID);
    res.sendResult = {
      status: "Success",
      message: "Retrieved Portfolio Buildings",
      organization: organization || {},
      buildings: buildings || []
    };
    return next();
  } catch (err) {
    return util.sendError(
      "Issues loading the portfolio buildings",
      500,
      req,
      res,
      next
    );
  }
};

const buildingParser = (userIdMap = {}) => async buildings => {
  const updatedBuildings = [];
  for (let building of buildings) {
    let newBuilding = Object.assign({}, building.dataValues || {});
    const userId = building.createdbyuserid;
    if (userId) {
      let user = userIdMap[userId];
      if (!user) {
        user = await User.findById(userId);
        if (user) userIdMap[userId] = user;
      }
      if (user) {
        newBuilding["createdBy"] = {
          id: userId,
          name: user.name
        };
      } else {
        newBuilding["createdBy"] = {
          id: null,
          name: null
        };
      }
    } else {
      newBuilding["createdBy"] = {
        id: null,
        name: null
      };
    }
    updatedBuildings.push(newBuilding);
  }
  return { dashboard: { buildings: updatedBuildings } };
};

const getBuildingPromise = async (
  filter,
  attributes,
  inputStream,
  userIdMap = {}
) => {
  const include = [
    {
      as: "projects",
      model: db.Project,
      attributes: ["_id"]
    },
    {
      as: "organization",
      model: db.Organization,
      attributes: ["_id", "name"],
      required: true
    },
    {
      as: "monthlyUtilities",
      model: db.Utility,
      attributes: monthlyUtilityAttributes
    },
    {
      as: "buildingUseTypes",
      model: db.BuildingUseType,
      attributes: ["use", "squarefeet"]
    },
    {
      as: "buildingPmScores",
      model: db.BuildingPmScore,
      attributes: ["year", "score"]
    }
  ];
  await findAllData({
    model: db.Building,
    filter,
    include,
    attributes,
    inputStream,
    parser: buildingParser(userIdMap)
  });
};

const projectParser = (organizations, userIdMap = {}) => async projects => {
  const resultProjects = [];
  for (let item of projects) {
    let project = {
      ...item.dataValues
    };
    const projectOrganization = organizations.filter(
      organization =>
        organization._id.toString() === project.building.organization_id
    );
    if (projectOrganization.length) {
      project.organization = {
        _id: projectOrganization[0]._id,
        name: projectOrganization[0].name
      };
    }
    let eletricCharge = project.runresults_annual_savings_electric_charge || 0;
    let gasCharge = project.runresults_annual_savings_gas_charge || 0;
    project.annual_saving = eletricCharge + gasCharge;
    let userId = project.createdbyuserid;
    if (userId) {
      let user = userIdMap[userId];
      if (!user) {
        user = await User.findById(userId);
        if (user) userIdMap[userId] = user;
      }
      if (user) {
        project["createdBy"] = {
          id: userId,
          name: user.name
        };
      } else {
        project["createdBy"] = {
          id: null,
          name: null
        };
      }
    } else {
      project["createdBy"] = {
        id: null,
        name: null
      };
    }
    if (project.metric_simple_payback < 0) project.metric_simple_payback = 0;
    resultProjects.push(project);
  }
  return { dashboard: { projects: resultProjects } };
};

const getProjectPromise = async (
  buildingIds,
  organizations,
  attributes,
  inputStream,
  userIdMap = {}
) => {
  let organizationIds = organizations.map(organization =>
    organization._id.toString()
  );
  const include = [
    {
      as: "building",
      model: db.Building,
      attributes: ["_id", "organization_id", "buildingname"],
      required: true,
      where: {
        organization_id: organizationIds
      }
    }
  ];
  const filter = {
    building_id: buildingIds,
    status: {
      [Op.ne]: "Scenario"
    }
  };
  await findAllData({
    model: db.Project,
    filter,
    include,
    attributes,
    inputStream,
    parser: projectParser(organizations, userIdMap)
  });
};

const projectPackageParser = (
  organizations,
  userIdMap = {}
) => async projectPackages => {
  const resultProjectPackages = [];
  for (let item of projectPackages) {
    let projectPackage = {
      ...item.dataValues
    };
    const projectOrganization = organizations.filter(
      organization =>
        organization._id.toString() === projectPackage.building.organization_id
    );
    if (projectOrganization.length) {
      projectPackage.organization = {
        _id: projectOrganization[0]._id,
        name: projectOrganization[0].name
      };
    }
    let userId = projectPackage.createdbyuserid;
    if (userId) {
      let user = userIdMap[userId];
      if (!user) {
        user = await User.findById(userId);
        if (user) userIdMap[userId] = user;
      }
      if (user) {
        projectPackage["createdBy"] = {
          id: userId,
          name: user.name
        };
      } else {
        projectPackage["createdBy"] = {
          id: null,
          name: null
        };
      }
    } else {
      projectPackage["createdBy"] = {
        id: null,
        name: null
      };
    }
    if (projectPackage.total_simplepayback < 0)
      projectPackage.total_simplepayback = 0;
    resultProjectPackages.push(projectPackage);
  }
  return { dashboard: { projectPackages: resultProjectPackages } };
};

const getProjectPackagePromise = async (
  buildingIds,
  organizations,
  attributes,
  inputStream,
  userIdMap = {}
) => {
  const organizationIds = organizations.map(organization =>
    organization._id.toString()
  );
  const include = [
    {
      as: "building",
      model: db.Building,
      attributes: ["_id", "organization_id", "buildingname"],
      required: true,
      where: {
        organization_id: organizationIds
      }
    }
  ];
  const filter = {
    buildingid: buildingIds,
    status: {
      [Op.ne]: "Scenario"
    }
  };
  await findAllData({
    model: db.ProjectPackage,
    filter,
    include,
    attributes,
    inputStream,
    parser: projectPackageParser(organizations, userIdMap)
  });
};

const getProposalPromise = async (organizations, inputStream) => {
  try {
    let proposals = [];
    let orgIds = organizations.map(org => org._id).map(id => id.toString());
    let proposalList = await Proposal.find({
      organization: { $in: orgIds }
    })
      .populate("organization")
      .populate("buildingIds")
      .populate("createdByUserId")
      .lean();
    for (let proposal of proposalList) {
      let proposalBody = Object.assign({}, proposal);
      let buildingIds = proposalBody.buildingIds || [];
      let measureIds = proposalBody.measures || [];
      let projectPackageIds = proposalBody.projectPackages || [];
      buildingIds = buildingIds.map(building => building._id.toString());
      measureIds = measureIds.map(id => id.toString());
      projectPackageIds = projectPackageIds.map(id => id.toString());
      let buildings = proposalBody.buildingIds || [];
      delete proposalBody.buildingIds;
      proposalBody.buildingIds = buildingIds || [];
      proposalBody.buildings = buildings || [];
      let mode =
        proposalBody.mode === "PortfolioMeasure" ||
        proposalBody.mode === "Measure"
          ? "Measure"
          : "Project";
      proposalBody.mode = mode;
      proposalBody.projects = [];
      proposalBody.projectPackages = [];

      if (mode === "Measure") {
        delete proposalBody["projectPackages"];
        proposalBody["projectPackages"] = [];
        proposalBody.modeIds = measureIds;
      } else {
        delete proposalBody["measures"];
        proposalBody["projects"] = [];
        proposalBody.modeIds = projectPackageIds;
      }
      proposalBody["createdBy"] = {
        id: proposalBody.createdByUserId._id.toString() || null,
        name: proposalBody.createdByUserId.name
      };
      proposals.push(proposalBody);
    }

    inputStream.push(JSON.stringify({ dashboard: { proposals } }) + "\n");
  } catch (error) {
    console.log("error", error);
    return [];
  }
};

const getTeamPromise = async (organizations = [], inputStream) => {
  let orgIds = organizations.map(org => org._id.toString());
  const userList = [];
  try {
    let users = await db.User.findAll({
      include: [
        {
          as: "userOrg",
          model: db.UserOrg,
          include: [
            {
              as: "organization",
              model: db.Organization,
              required: true,
              attributes: ["_id", "name"]
            }
          ],
          required: true
        }
      ]
    });
    for (let user of users) {
      let organizationSet = new Set();
      let userObj = Object.assign({}, user.dataValues || {});
      let userOrgs = [...userObj.userOrg];
      let organizations = [];
      for (let userOrg of userOrgs) {
        let dataValues = userOrg.dataValues || {};
        let organization = dataValues.organization;
        organization = organization.dataValues;
        if (!organizationSet.has(organization._id)) {
          organizationSet.add(organization._id);
          organizations.push(organization);
        }
      }
      let organizationIds = [...organizationSet];
      let flag = organizationIds.some(id => orgIds.includes(id));
      if (flag) {
        userObj["organizations"] = organizations;
        delete userObj["userOrg"];
        if (!userObj.simuwattRole) userList.push(userObj);
      }
    }
  } catch (error) {
    console.log("error", error);
  } finally {
    inputStream.push(JSON.stringify({ dashboard: { teams: userList } }) + "\n");
  }
};

const createReadableStream = (model, params = {}) => {
  return new stream.Readable({
    objectMode: true,
    read: function() {}
  });
};

const compressHandler = (readStream, req, res) => {
  const acceptEncoding = req.headers["accept-encoding"];
  if (!acceptEncoding || !acceptEncoding.match(/\b(gzip|deflate)\b/)) {
    return readStream;
  } else if (acceptEncoding.match(/\bgzip\b/)) {
    res.setHeader("Content-Encoding", "gzip");
    return readStream.pipe(zlib.createGzip());
  }
};

class StreamCache extends stream.Transform {
  constructor(cacheKey, options) {
    super(options);
    this._cacheKey = cacheKey;
    this._cacheData = [];
  }
  _transform(chunk, enc, cb) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : new Buffer(chunk, enc);
    this._cacheData.push(buffer.toString("base64"));
    cb(null, buffer);
  }
  _flush(callback) {
    memCache.set(this._cacheKey, this._cacheData.join("breakline"), 1000);
    callback();
  }
}

const getPortfolioDashboard = async (req, res, next) => {
  try {
    const user = req.user;
    let orgIds = user.orgIds.map(org => org.toString());
    let orgID =
      req.body.orgID && req.body.orgID != "all"
        ? req.body.orgID
        : orgIds[orgIds.length - 1];
    let { organizationIds } = req.body;
    let key = orgID.toString();
    let projectQuery = {
      organization_id: orgID
    };
    if (organizationIds.length) {
      projectQuery.organization_id = organizationIds;
      if (typeof organizationIds === "object")
        key = organizationIds.map(id => id.toString()).join(",");
    }
    const inputStream = createReadableStream();
    let cachedData = memCache.get(key);
    if (cachedData && !req.body.hardReload) {
      console.log("Load Cached Data");
      res.setHeader("Content-Encoding", "gzip");
      inputStream.pipe(res);
      cachedData.split("breakline").map(data => {
        inputStream.push(Buffer.from(data, "base64"));
      });
      inputStream.push(null);
      return;
    }
    const cacheStream = new StreamCache(key);
    compressHandler(inputStream, req, res)
      .pipe(cacheStream)
      .pipe(res);
    console.log("Not Load Cached Data");
    const organizations = await Organization.find({
      _id: { $in: projectQuery.organization_id }
    });

    let buildingIds = [];
    for (let org of organizations) {
      let ids = org.buildingIds || [];
      ids = ids.map(id => id.toString());
      buildingIds = [...buildingIds, ...ids];
      buildingIds = [...new Set(buildingIds)];
    }
    let mongodbBuildings = await Building.find({
      _id: { $in: buildingIds },
      archived: false
    })
      .lean()
      .exec();
    buildingIds = mongodbBuildings.map(building => building._id.toString());
    buildingIds = [...new Set(buildingIds)];
    const userMap = {};

    const buildingPromise = getBuildingPromise(
      {
        organization_id: projectQuery.organization_id,
        archived: false
      },
      buildingAttributes,
      inputStream,
      userMap
    );
    const projectPromise = getProjectPromise(
      buildingIds,
      organizations,
      projectAttributes,
      inputStream,
      userMap
    );
    const projectPackagePromise = getProjectPackagePromise(
      buildingIds,
      organizations,
      projectPackageAttributes,
      inputStream,
      userMap
    );
    const teamPromise = getTeamPromise(organizations, inputStream);
    const proposalPromise = getProposalPromise(organizations, inputStream);
    try {
      await Promise.all([
        buildingPromise,
        projectPromise,
        projectPackagePromise,
        teamPromise,
        proposalPromise
      ]);
    } catch (error) {
      console.log("error", error);
    }

    const authors = Object.values(userMap).map(value => ({
      id: value._id,
      name: value.name
    }));

    const organization = await Organization.find({
      _id: { $in: projectQuery.organization_id }
    })
      .select("-portfolioSyncHistory -passwordExpiry")
      .exec();
    inputStream.push(JSON.stringify({ organization, authors }) + "\n");
    inputStream.push(null);
  } catch (err) {
    console.log("Issues loading the portfolio dashboard", err);
    return util.sendError(
      "Issues loading the portfolio dashboard",
      500,
      req,
      res,
      next
    );
  }
};

const getPortfolioScenarios = async (req, res, next) => {
  try {
    let scenarioList = [];
    let hardReload = req.query.hardReload || false;
    let scenarios = await Scenario.find({
      createdByUserId: req.user._id
    })
      .sort({
        updated: -1
      })
      .populate("projectIds")
      .populate({
        path: "measurePackageIds",
        populate: { path: "projects" }
      })
      .lean();
    for (let scenario of scenarios) {
      let mockedScenario = await mockScenarioData(scenario, hardReload);
      if (mockedScenario) scenarioList = [...scenarioList, mockedScenario];
    }
    res.sendResult = {
      status: "Success",
      message: "Get Scenarios",
      scenarios: scenarioList
    };
    return next();
  } catch (err) {
    console.log("Issues loading the portfolio scenarios", err);
    return util.sendError(
      "Issues loading the portfolio scenarios",
      500,
      req,
      res,
      next
    );
  }
};

const createPortfolioScenario = async (req, res, next) => {
  try {
    let projectIds = req.body.projectIds || [];
    let allProjectIds = [...projectIds];
    let measurePackageIds = req.body.measurePackageIds || [];
    let buildingIdList = chunkArray(req.body.buildingIds, 10);
    for (let measurePackageId of measurePackageIds) {
      let measurePackage = await MeasurePackage.findById(measurePackageId);
      let projectIds = measurePackage.projects || [];
      projectIds = projectIds.map(pid => pid.toString());
      allProjectIds = [...allProjectIds, ...projectIds];
    }
    for (let id of allProjectIds) {
      let project = await Project.findById(id);
      let runObj = project.runResults || {};

      for (let idArray of buildingIdList) {
        const promiseArray = idArray.map(buildingId =>
          getScenarioProjectRunResult(project, buildingId)
        );
        const resArray = await Promise.all(promiseArray);
        resArray.forEach((value, index) => {
          runObj[idArray[index]] = value;
        });
      }

      project = _.extend(project, {
        runResults: runObj
      });
      project.markModified("runResults");
      await project.save();
    }
    const scenario = new Scenario({
      name: req.body.name,
      description: req.body.description,
      buildingIds: req.body.buildingIds,
      projectIds: req.body.projectIds,
      measurePackageIds: req.body.measurePackageIds,
      filters: req.body.filters || [],
      organizations: req.body.organizations || [],
      createdByUserId: req.user._id,
      estimatedStartDate: req.body.estimatedStartDate,
      estimatedCompletionDate: req.body.estimatedCompletionDate
    });
    let newScenario = await scenario.save();
    await scenarioScript.calculate({ scenarioIds: [newScenario._id] });
    newScenario = await Scenario.findById(newScenario._id)
      .populate("projectIds")
      .populate({
        path: "measurePackageIds",
        populate: { path: "projects" }
      })
      .lean();
    let metric = (newScenario && newScenario.metric) || {};
    let organizations = (newScenario && newScenario.organizations) || [];
    await datawarehouseDb.Scenario.create({
      _id: newScenario._id.toString(),
      name: newScenario.name,
      description: newScenario.description,
      createdbyuserid: newScenario.createdByUserId.toString(),
      updated: newScenario.updated,
      created: newScenario.created,
      estimatedstartdate: newScenario.estimatedStartDate,
      estimatedcompletiondate: newScenario.estimatedCompletionDate,
      metric_projectcost: metric.projectCost || 0,
      metric_annualsavings: metric.annualSavings || 0,
      metric_electricsavings: metric.electricSavings || 0,
      metric_gassavings: metric.gasSavings || 0,
      metric_ghgsavings: metric.ghgSavings || 0,
      metric_ghgsavingscost: metric.ghgSavings || 0,
      metric_energysavings: metric.energySavings || 0,
      metric_watersavings: metric.waterSavings || 0,
      metric_incentive: metric.incentive || 0,
      metric_roi: metric.roi || 0,
      metric_simple_payback: metric.simple_payback || 0,
      metric_npv: metric.npv || 0,
      metric_sir: metric.sir || 0,
      metric_demandsavings: metric.demandSavings || 0,
      metric_eul: metric.eul || 0,
      metric_maintenancesavings: metric.maintenanceSavings || 0,
      metric_ghgelectric: metric.ghgElectric || 0,
      metric_ghggas: metric.ghgGas || 0
    });
    let _sdc_level_0_id = 0;
    for (let organization of organizations) {
      await datawarehouseDb.ScenarioOrganization.create({
        _sdc_source_key__id: newScenario._id.toString(),
        _sdc_level_0_id: _sdc_level_0_id,
        buildingid: organization.buildingId,
        organization__id: organization.organization._id,
        organization_name: organization.organization.name
      });
      _sdc_level_0_id++;
    }
    newScenario = await mockScenarioData(newScenario);
    res.sendResult = {
      status: "Success",
      message: "Create Scenario",
      scenario: newScenario
    };
    return next();
  } catch (err) {
    console.log("Issues creating the scenario", err);
    return util.sendError("Issues creating the scenario", 500, req, res, next);
  }
};

const updatePortfolioScenario = async (req, res, next) => {
  try {
    let originProjectIds = req.scenario.projectIds || [];
    let originMeasurePackageIds = req.scenario.measurePackageIds || [];
    let projectIds = req.body.projectIds || [];
    let measurePackageIds = req.body.measurePackageIds || [];
    let buildingIdList = chunkArray(req.body.buildingIds, 10);
    let allProjectIds = [...projectIds];
    for (let measurePackageId of measurePackageIds) {
      let measurePackage = await MeasurePackage.findById(measurePackageId);
      let measureIds = measurePackage.projects || [];
      measureIds = measureIds.map(id => id.toString());
      allProjectIds = [...allProjectIds, ...measureIds];
      allProjectIds = [...new Set(allProjectIds)];
    }
    for (let id of allProjectIds) {
      let project = await Project.findById(id);
      let runObj = project.runResults || {};
      for (let idArray of buildingIdList) {
        const promiseArray = idArray.map(buildingId =>
          getScenarioProjectRunResult(project, buildingId)
        );
        const resArray = await Promise.all(promiseArray);
        resArray.forEach((value, index) => {
          runObj[idArray[index]] = value;
        });
      }
      project = _.extend(project, {
        runResults: runObj
      });
      project.markModified("runResults");
      await project.save();
    }
    Object.assign(req.scenario, {
      name: req.body.name,
      description: req.body.description,
      buildingIds: req.body.buildingIds,
      projectIds: req.body.projectIds,
      measurePackageIds: req.body.measurePackageIds,
      filters: req.body.filters || [],
      organizations: req.body.organizations || [],
      updated: Date.now(),
      estimatedStartDate: req.body.estimatedStartDate,
      estimatedCompletionDate: req.body.estimatedCompletionDate
    });
    let scenario = await req.scenario.save();
    await scenarioScript.calculate({ scenarioIds: [scenario._id] });
    scenario = await Scenario.findById(scenario._id)
      .populate("projectIds")
      .populate({
        path: "measurePackageIds",
        populate: { path: "projects" }
      })
      .lean();
    scenario = await mockScenarioData(scenario);

    await datawarehouseDb.Scenario.destroy({
      where: { _id: scenario._id.toString() }
    });
    await datawarehouseDb.ScenarioOrganization.destroy({
      where: { _sdc_source_key__id: scenario._id.toString() }
    });

    let metric = (scenario && scenario.metric) || {};
    let organizations = (scenario && scenario.organizations) || [];
    await datawarehouseDb.Scenario.create({
      _id: scenario._id.toString(),
      name: scenario.name,
      description: scenario.description,
      createdbyuserid: scenario.createdByUserId.toString(),
      updated: scenario.updated,
      created: scenario.created,
      estimatedstartdate: scenario.estimatedStartDate,
      estimatedcompletiondate: scenario.estimatedCompletionDate,
      metric_projectcost: metric.projectCost || 0,
      metric_annualsavings: metric.annualSavings || 0,
      metric_electricsavings: metric.electricSavings || 0,
      metric_gassavings: metric.gasSavings || 0,
      metric_ghgsavings: metric.ghgSavings || 0,
      metric_ghgsavingscost: metric.ghgSavings || 0,
      metric_energysavings: metric.energySavings || 0,
      metric_watersavings: metric.waterSavings || 0,
      metric_incentive: metric.incentive || 0,
      metric_roi: metric.roi || 0,
      metric_simple_payback: metric.simple_payback || 0,
      metric_npv: metric.npv || 0,
      metric_sir: metric.sir || 0,
      metric_demandsavings: metric.demandSavings || 0,
      metric_eul: metric.eul || 0,
      metric_maintenancesavings: metric.maintenanceSavings || 0,
      metric_ghgelectric: metric.ghgElectric || 0,
      metric_ghggas: metric.ghgGas || 0
    });
    let _sdc_level_0_id = 0;
    for (let organization of organizations) {
      await datawarehouseDb.ScenarioOrganization.create({
        _sdc_source_key__id: scenario._id.toString(),
        _sdc_level_0_id: _sdc_level_0_id,
        buildingid: organization.buildingId,
        organization__id: organization.organization._id,
        organization_name: organization.organization.name
      });
      _sdc_level_0_id++;
    }

    //remove project and measures
    originProjectIds = originProjectIds.filter(
      pid => projectIds.indexOf(pid.toString()) === -1
    );
    originMeasurePackageIds = originMeasurePackageIds.filter(
      pid => measurePackageIds.indexOf(pid.toString()) === -1
    );
    await removeProjectsandMeasurePackages(
      originProjectIds,
      originMeasurePackageIds
    );

    res.sendResult = {
      status: "Success",
      scenario: scenario,
      message: "Update Scenario"
    };
    return next();
  } catch (err) {
    console.log("Issues updating the scenario", err);
    return util.sendError("Issues updating the scenario", 500, req, res, next);
  }
};

const removeProjectsandMeasurePackages = async (
  projectIds = [],
  measurePackageIds = []
) => {
  let removeProjectIds = projectIds || [];
  let measurepackages = await MeasurePackage.find({
    _id: { $in: measurePackageIds }
  });
  for (let measurePackage of measurepackages) {
    let ids = measurePackage.projects || [];
    removeProjectIds = [...removeProjectIds, ...ids];
  }
  await Project.deleteMany({ _id: { $in: removeProjectIds } });
  await ProjectDatawareHouse.deleteMany({ _id: { $in: removeProjectIds } });
  await MeasurePackage.deleteMany({ _id: { $in: measurePackageIds } });
};

const removePortfolioScenario = async (req, res, next) => {
  try {
    let projectIds = req.scenario.projectIds || [];
    let measurePackageIds = req.scenario.measurePackageIds || [];
    await removeProjectsandMeasurePackages(projectIds, measurePackageIds);
    await Scenario.deleteOne({ _id: req.scenario._id });
    await datawarehouseDb.Scenario.destroy({
      where: { _id: req.scenario._id.toString() }
    });
    await datawarehouseDb.ScenarioOrganization.destroy({
      where: { _sdc_source_key__id: req.scenario._id.toString() }
    });
    res.sendResult = {
      status: "Success",
      message: "Remove Scenario"
    };
    return next();
  } catch (err) {
    return util.sendError("Issues removing the scenario", 500, req, res, next);
  }
};

const getBuildings = async (
  buildingIds = [],
  organizations = [],
  hardReload
) => {
  console.log("hardReload", hardReload);
  console.log("Getting Building for Scenario started");
  let bids = buildingIds;
  let cachedBuildingIds = [];
  let cachedBuildings = [];
  let buildings = [];
  if (!hardReload || hardReload === "false") {
    for (let bid of buildingIds) {
      let data = organizations.find(org => org.buildingId === bid);
      if (data) {
        let organizationId =
          (data.organization && data.organization._id) || null;
        if (organizationId) {
          let key = organizationId;
          let cachedScenarioData = memCache.get(`scenario - ${key}`);
          let cachedData = memCache.get(key);
          let buildings = [];
          if (cachedScenarioData) {
            buildings = JSON.parse(cachedScenarioData);
          } else if (cachedData) {
            let dashboard = JSON.parse(cachedData);
            buildings = dashboard.buildings || [];
          }
          let cachedBuilding = buildings.find(building => building._id === bid);
          if (cachedBuilding) {
            cachedBuildings = [...cachedBuildings, cachedBuilding];
            cachedBuildingIds = [...cachedBuildingIds, bid];
          }
        }
      }
    }
  }
  bids = bids.filter(bid => cachedBuildingIds.indexOf(bid) === -1);
  if (bids.length) {
    buildings = await db.Building.findAll({
      include: [
        {
          as: "projects",
          model: db.Project,
          attributes: ["_id"]
        },
        {
          as: "organization",
          model: db.Organization,
          attributes: ["_id", "name"]
        },
        {
          as: "monthlyUtilities",
          model: db.Utility,
          attributes: monthlyUtilityAttributes
        },
        {
          as: "buildingUseTypes",
          model: db.BuildingUseType,
          attributes: ["use", "squarefeet"]
        }
      ],
      where: {
        _id: bids
      },
      attributes: buildingAttributes
    });
    buildings = buildings || [];
  }

  console.log("cached building ids", cachedBuildingIds);
  console.log("load needed building ids", bids);
  console.log("Getting Building for Scenario ended");
  return [...cachedBuildings, ...buildings];
};

const addScenarioIncompleteProject = async (req, res, next) => {
  try {
    const user = req.user;
    let { body: projectBody, buildingIds } = req.body;
    buildingIds = buildingIds || [];
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
        type: projectBody.type || "Portfolio",
        runResults: req.project.runResults || {},
        createdByUserId: user._id,
        imageUrls: projectBody.imageUrls || [],
        isComplete: false
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
        type: projectBody.type || "Portfolio",
        runResults: {},
        createdByUserId: user._id,
        imageUrls: projectBody.imageUrls || [],
        isComplete: false
      });
    }

    await project.validate();
    project.updated = Date.now();
    let savedProject = await project.save();
    savedProject = await Project.findById(savedProject._id).lean();
    savedProject.collectionTarget = "measure";
    res.sendResult = {
      status: "Success",
      project: savedProject,
      message: "Created/Updated Measure"
    };
    return next();
  } catch (err) {
    console.log("Issues create/update scenario measure", err);
    return util.sendError(
      "Issues create/update scenario measure",
      400,
      req,
      res,
      next
    );
  }
};

const addScenarioMeasurePackage = async (req, res, next) => {
  try {
    let body = req.body;
    let measurePackage;
    if (body._id == "New") {
      delete body._id;
      measurePackage = new MeasurePackage({
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
    } else {
      measurePackage = await MeasurePackage.findById(body._id);
      measurePackage = _.extend(measurePackage, {
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
        images: body.images || []
      });
    }
    await measurePackage.validate();
    measurePackage.updated = Date.now();

    measurePackage = await measurePackage.save();
    measurePackage = await MeasurePackage.findById(measurePackage._id)
      .populate({
        path: "projects",
        populate: {
          path: "projects"
        }
      })
      .lean();
    let projects = mockData(measurePackage);
    delete measurePackage.projects;
    measurePackage.projects = projects;
    measurePackage.collectionTarget = "measurePackage";
    res.sendResult = {
      status: "Success",
      message: "Create/Update Measure Package for Scenario",
      measurePackage: measurePackage
    };
    return next();
  } catch (err) {
    console.log(err);
    return util.sendError(
      "Issues Create/Update Measure Package for Scenario",
      500,
      req,
      res,
      next
    );
  }
};

const convertScenarioProject = async (req, res, next) => {
  try {
    const user = req.user;
    let scenario = req.scenario;
    let projectIds = scenario.projectIds || [];
    let measurePackageIds = scenario.measurePackageIds || [];
    let buildingIds = scenario.buildingIds || [];
    let projects = await Project.find({ _id: { $in: projectIds } });
    let measurePackages = await MeasurePackage.find({
      _id: { $in: measurePackageIds }
    });

    if (buildingIds.length) {
      for (let buildingId of buildingIds) {
        let building = await Building.findById(buildingId);
        let buildingProjectIds = building.projectIds || [];
        let buildingMeasurePackageIds = building.measurePackageIds || [];
        let buildingMeasurePackageMeasureIds =
          building.measurePackageMeasureIds || [];
        let newProjectIds = [],
          newMeasurePackageMeasureIds = [],
          newMeasurePackageIds = [];
        let measurePackageMap = {};
        for (let project of projects) {
          const newProject = new Project({
            name: project.name,
            displayName: project.displayName,
            originalDisplayName: project.originalDisplayName,
            source: project.source || "",
            fuel: project.fuel || "",
            description: project.description,
            project_category: project.project_category,
            project_application: project.project_application,
            project_technology: project.project_technology,
            implementation_strategy: project.implementation_strategy,
            incentive: project.incentive,
            fields: project.fields,
            category: project.category,
            initialValues: project.initialValues,
            locations: project.locations,
            analysisType: project.analysisType || "prescriptive",
            type: project.type,
            runResults: {},
            createdByUserId: project.createdByUserId,
            imageUrls: project.imageUrls || [],
            isComplete: true,
            status: "Scenario",
            type: project.type || "",
            measureLife: project.measureLife || "0",
            budgetType: project.budgetType || "Low Cost/No Cost",
            package: project.package || null,
            metric: {}
          });
          if (project.eaDisplayName) {
            newProject.eaDisplayName = project.eaDisplayName;
          }
          let buildingEquipment = await BuildingEquipment.find({
            building: buildingId,
            isArchived: { $in: [null, false] }
          }).populate("libraryEquipment");
          buildingEquipment =
            buildingEquipment.filter(item => {
              let category =
                (item.libraryEquipment && item.libraryEquipment.category) || "";
              let application =
                (item.libraryEquipment && item.libraryEquipment.application) ||
                "";
              let technology =
                (item.libraryEquipment && item.libraryEquipment.technology) ||
                "";
              if (
                category == "HEATING" &&
                application == "BOILER" &&
                (technology == "STEAM_BOILER" ||
                  technology == "HOT_WATER_BOILER")
              )
                return true;
              return false;
            }) || [];
          if (project.name === "boilerTuneUpNY")
            newProject.initialValues.project_cost =
              buildingEquipment.length * 1600 || 1600;
          let runResults = {};
          runResults[buildingId] =
            (project.runResults && project.runResults[buildingId]) || {};
          newProject.runResults = runResults;
          newProject.runResultsWithRate = runResults;
          newProject.updated = Date.now();
          let savedProject = await newProject.save();
          newProjectIds = [...newProjectIds, savedProject._id];
        }
        for (let measurePackage of measurePackages) {
          let measurePackageMeasureIds = measurePackage.projects || [];
          let measures = await Project.find({
            _id: { $in: measurePackageMeasureIds }
          });
          let newIds = [];
          for (let project of measures) {
            const newProject = new Project({
              name: project.name,
              displayName: project.displayName,
              originalDisplayName: project.originalDisplayName,
              source: project.source || "",
              fuel: project.fuel || "",
              description: project.description,
              project_category: project.project_category,
              project_application: project.project_application,
              project_technology: project.project_technology,
              implementation_strategy: project.implementation_strategy,
              incentive: project.incentive,
              fields: project.fields,
              category: project.category,
              initialValues: project.initialValues,
              locations: project.locations,
              analysisType: project.analysisType || "prescriptive",
              type: project.type,
              runResults: {},
              createdByUserId: project.createdByUserId,
              imageUrls: project.imageUrls || [],
              isComplete: true,
              status: "Scenario",
              type: project.type || "",
              measureLife: project.measureLife || "0",
              budgetType: project.budgetType || "Low Cost/No Cost",
              package: project.package || null,
              metric: {}
            });
            if (project.eaDisplayName) {
              newProject.eaDisplayName = project.eaDisplayName;
            }
            let buildingEquipment = await BuildingEquipment.find({
              building: buildingId,
              isArchived: { $in: [null, false] }
            }).populate("libraryEquipment");
            buildingEquipment =
              buildingEquipment.filter(item => {
                let category =
                  (item.libraryEquipment && item.libraryEquipment.category) ||
                  "";
                let application =
                  (item.libraryEquipment &&
                    item.libraryEquipment.application) ||
                  "";
                let technology =
                  (item.libraryEquipment && item.libraryEquipment.technology) ||
                  "";
                if (
                  category == "HEATING" &&
                  application == "BOILER" &&
                  (technology == "STEAM_BOILER" ||
                    technology == "HOT_WATER_BOILER")
                )
                  return true;
                return false;
              }) || [];
            if (project.name === "boilerTuneUpNY")
              newProject.initialValues.project_cost =
                buildingEquipment.length * 1600 || 1600;
            let runResults = {};
            runResults[buildingId] =
              (project.runResults && project.runResults[buildingId]) || {};
            newProject.runResults = runResults;
            newProject.runResultsWithRate = runResults;
            newProject.updated = Date.now();
            let savedProject = await newProject.save();
            newIds = [...newIds, savedProject._id];
          }
          newIds = newIds.map(id => id.toString());
          newMeasurePackageMeasureIds = [
            ...newMeasurePackageMeasureIds,
            ...newIds
          ];
          measurePackageMap[measurePackage._id] = newIds;
        }

        buildingProjectIds = buildingProjectIds.map(pid => pid.toString());
        newProjectIds = newProjectIds.map(pid => pid.toString());
        newMeasurePackageMeasureIds = newMeasurePackageMeasureIds.map(pid =>
          pid.toString()
        );
        buildingProjectIds = [...buildingProjectIds, ...newProjectIds];
        buildingProjectIds = [...new Set(buildingProjectIds)];
        buildingMeasurePackageMeasureIds = [
          ...buildingMeasurePackageMeasureIds,
          ...newMeasurePackageMeasureIds
        ];
        buildingMeasurePackageMeasureIds = [
          ...new Set(buildingMeasurePackageMeasureIds)
        ];
        building.projectIds = buildingProjectIds;
        building.measurePackageMeasureIds = buildingMeasurePackageMeasureIds;
        building.markModified("projectIds");
        building.markModified("measurePackageIds");
        building.markModified("measurePackageMeasureIds");
        building = await building.save();
        await projectghgScript.calculate({ buildingIds: [buildingId] });

        for (let measurePackage of measurePackages) {
          let ids = measurePackageMap[measurePackage._id] || [];
          let newMeasurePackage = new MeasurePackage({
            name: measurePackage.name,
            description: measurePackage.description,
            package: null,
            projects: ids,
            total: measurePackage.total || {},
            category: measurePackage.category,
            application: measurePackage.application,
            technology: measurePackage.technology,
            status: measurePackage.status || "Identified",
            type: measurePackage.type || "",
            budgetType: measurePackage.budgetType || "Low Cost/No Cost",
            comments: measurePackage.comments || "",
            images: measurePackage.images || [],
            createdByUserId: req.user._id
          });
          newMeasurePackage = await newMeasurePackage.save();
          let total = await calculateMeasurePackageTotal(
            building._id,
            newMeasurePackage._id
          );
          newMeasurePackage.total = total;
          newMeasurePackage.totalWithRates = total;
          newMeasurePackageIds = [
            ...newMeasurePackageIds,
            newMeasurePackage._id
          ];
          newMeasurePackage.markModified("total");
          newMeasurePackage.markModified("totalWithRates");
          newMeasurePackage.save();
        }

        buildingMeasurePackageIds = buildingMeasurePackageIds.map(id =>
          id.toString()
        );
        newMeasurePackageIds = newMeasurePackageIds.map(id => id.toString());
        buildingMeasurePackageIds = [
          ...buildingMeasurePackageIds,
          ...newMeasurePackageIds
        ];
        buildingMeasurePackageIds = [...new Set(buildingMeasurePackageIds)];
        building.measurePackageIds = buildingMeasurePackageIds;
        building.markModified("measurePackageIds");
        building = await building.save();

        const projectPackage = new ProjectPackage({
          name: scenario.name,
          description: scenario.description,
          status: "Scenario",
          constructionStatus: "Conceptual design",
          estimatedStartDate: scenario.estimatedStartDate,
          estimatedCompletionDate: scenario.estimatedCompletionDate,
          actualStartDate: scenario.estimatedStartDate,
          actualCompletionDate: scenario.estimatedCompletionDate,
          createdByUserId: user._id,
          buildingId: buildingId,
          projects: newProjectIds,
          measurePackages: newMeasurePackageIds,
          rates: building.rates || {},
          total: {}
        });
        let savedProjectPackage = await projectPackage.save();
        await calculateProjectPackageTotal(buildingId, savedProjectPackage._id);

        for (let id of newProjectIds) {
          let project = await Project.findById(id);
          project.package = savedProjectPackage._id;
          await project.save();
        }
      }
    }
    await scenario.remove();
    await removeProjectsandMeasurePackages(projectIds, measurePackageIds);
    res.sendResult = {
      status: "Success",
      message: "Convert Scenario to Project"
    };
    return next();
  } catch (err) {
    console.log("Issues converting scenario to measures and project", err);
    return util.sendError(
      "Issues converting scenario to measures and project",
      400,
      req,
      res,
      next
    );
  }
};

const getTableauToken = (req, res, next) => {
  const { target } = req.body;
  var options = {
    method: "POST",
    url: "https://tableau.buildee.com/trusted",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    form: {
      username: "Buildee",
      target_site: target
    }
  };
  request(options, function(error, response) {
    if (error) {
      return util.sendError(
        "Issues getting tableau token",
        500,
        req,
        res,
        next
      );
    }
    res.sendResult = {
      status: "Success",
      token: response.body,
      message: "Get Tableau Token"
    };
    return next();
  });
};

const getTableauAccessToken = async (target = "buildee") => {
  const ipAddress = process.env.TABLEAU_IP;
  console.log(ipAddress);
  var options = {
    method: "POST",
    url: `https://tableau.buildee.com/api/2.2/auth/signin`,
    headers: {
      Authorization:
        "basic ZGhhbmFuamF5LnB1Z2xpYUB0b3B0YWwuY29tOkFiY0AxMjM0IQ==",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      credentials: {
        name: "Buildee",
        password: "Password@1234!",
        site: {
          contentUrl: target
        }
      }
    })
  };
  try {
    const response = await requestPromise(options);
    let tokenStart = response.indexOf("token=") + 7;
    let tokenEnd = response.indexOf("><site") - 1;
    return response.slice(tokenStart, tokenEnd);
  } catch (error) {
    console.log("Tableua Access Token error", error);
    return "";
  }
};

const scenarioById = (req, res, next, id) => {
  if (!validate.valMongoObjId(id)) {
    return next(new Error("Invalid ID present in request."));
  }

  Scenario.findById(id).exec(function(err, scen) {
    if (err) return next(err);
    if (!scen) return next(new Error("Failed to load Scenario " + id));
    req.scenario = scen;
    return next();
  });
};

const checkScenarioSynced = async (req, res, next) => {
  try {
    let { scenarioId } = req.query;
    let check = false;
    let scenarios = await db.Scenario.findAll({
      where: {
        _id: scenarioId,
        organization_id: {
          [Op.ne]: null
        }
      }
    });
    if (scenarios && scenarios.length != 0) check = true;
    res.sendResult = {
      status: "Success",
      check,
      message: check ? "Scenario is synced" : "Scenario is not synced"
    };
    return next();
  } catch (error) {
    console.log("error", error);
    res.sendResult = {
      status: "fail",
      check: false,
      message: "Scenario is not synced"
    };
    return next();
  }
};

const getPortfolioProjects = async (req, res, next) => {
  try {
    let { orgID } = req.body;
    const organization = await Organization.findOne({
      _id: { $in: orgID }
    });
    let buildingIds = [];
    if (organization) {
      let ids = organization.buildingIds || [];
      ids = ids.map(id => id.toString());
      buildingIds = [...buildingIds, ...ids];
      buildingIds = [...new Set(buildingIds)];
    }
    let projects = await db.Project.findAll({
      include: [
        {
          as: "building",
          model: db.Building,
          attributes: ["_id", "organization_id", "buildingname"],
          required: true
        }
      ],
      where: {
        building_id: buildingIds,
        status: {
          [Op.ne]: "Scenario"
        }
      },
      attributes: projectAttributes
    });
    let projectList = [];
    for (let project of projects) {
      const updateProject = { ...project.dataValues };
      if (updateProject.metric_simple_payback < 0)
        updateProject.metric_simple_payback = 0;
      projectList.push(updateProject);
    }
    res.sendResult = {
      status: "Success",
      message: "Successfully get Projects",
      projects: projectList
    };
    return next();
  } catch (error) {
    console.log("error", error);
    return util.sendError("Issues getting Projects", 400, req, res, next);
  }
};

const getRefetchPortfolioProjects = async (req, res, next) => {
  try {
    let { ids } = req.body;
    let projects = await db.Project.findAll({
      include: [
        {
          as: "building",
          model: db.Building,
          attributes: ["_id", "organization_id", "buildingname"],
          required: true
        }
      ],
      where: {
        _id: ids,
        status: {
          [Op.ne]: "Scenario"
        }
      },
      attributes: projectAttributes
    });
    let projectList = [];
    for (let project of projects) {
      const updateProject = { ...project.dataValues };
      if (updateProject.metric_simple_payback < 0)
        updateProject.metric_simple_payback = 0;
      projectList.push(updateProject);
    }
    res.sendResult = {
      status: "Success",
      message: "Successfully get Projects",
      projects: projectList
    };
    return next();
  } catch (error) {
    console.log("error", error);
    return util.sendError("Issues getting Projects", 400, req, res, next);
  }
};

const getPortfolioProjectPackages = async (req, res, next) => {
  try {
    let { orgID } = req.body;
    const organization = await Organization.findOne({
      _id: { $in: orgID }
    });
    let buildingIds = [];
    if (organization) {
      let ids = organization.buildingIds || [];
      ids = ids.map(id => id.toString());
      buildingIds = [...buildingIds, ...ids];
      buildingIds = [...new Set(buildingIds)];
    }
    let projectPackages = await db.ProjectPackage.findAll({
      include: [
        {
          as: "building",
          model: db.Building,
          attributes: ["_id", "organization_id", "buildingname"],
          required: true
        }
      ],
      where: {
        buildingid: buildingIds,
        status: {
          [Op.ne]: "Scenario"
        }
      },
      attributes: projectPackageAttributes
    });
    let projectPackagesList = [];
    for (let item of projectPackages) {
      const projectPackage = { ...item.dataValues };
      if (projectPackage.total_simplepayback < 0)
        projectPackage.total_simplepayback = 0;
      projectPackagesList.push(projectPackage);
    }
    res.sendResult = {
      status: "Success",
      message: "Successfully get ProjectPackages",
      projectPackages: projectPackagesList
    };
    return next();
  } catch (error) {
    console.log("error", error);
    return util.sendError(
      "Issues getting ProjectPackages",
      400,
      req,
      res,
      next
    );
  }
};

const mockPortfolioProposal = async (proposalId, key, status = "create") => {
  try {
    // currently we don't support for measurePackages
    let proposal = await Proposal.findById(proposalId)
      .populate("organization")
      .populate("buildingIds")
      .populate("createdByUserId")
      .lean();
    if (!proposal) return null;
    let proposalBody = Object.assign({}, proposal);
    let measureIds = proposalBody.measures || [];
    let projectIds = proposalBody.projectPackages || [];
    let buildingIds = proposalBody.buildingIds || [];
    buildingIds = buildingIds.map(building => building._id.toString());
    let buildings = proposalBody.buildingIds || [];
    delete proposalBody.buildingIds;
    proposalBody.buildingIds = buildingIds || [];
    proposalBody.buildings = buildings || [];
    buildingIds = buildingIds.map(id => id.toString());
    measureIds = measureIds.map(id => id.toString());
    projectIds = projectIds.map(id => id.toString());

    let mode =
      proposalBody.mode === "PortfolioMeasure" ||
      proposalBody.mode === "Measure"
        ? "Measure"
        : "Project";
    let organization = await Organization.findById(
      proposal.organization
    ).lean();
    if (mode === "Measure") {
      let projects = await db.Project.findAll({
        include: [
          {
            as: "building",
            model: db.Building,
            attributes: ["_id", "organization_id", "buildingname"],
            required: true
          }
        ],
        where: {
          building_id: buildingIds,
          status: {
            [Op.ne]: "Scenario"
          }
        },
        attributes: projectAttributes
      });

      let allProjects = [];
      for (let item of projects) {
        let project = {
          ...item.dataValues
        };
        project.organization = {
          _id: organization._id,
          name: organization.name
        };
        if (project.metric_simple_payback < 0)
          project.metric_simple_payback = 0;
        allProjects.push(project);
      }
      let filteredProjects = allProjects.filter(project => {
        let projectId = project._id;
        projectId = projectId.toString();
        return measureIds.indexOf(projectId) > -1;
      });
      delete proposalBody["measures"];
      delete proposalBody["projectPackages"];
      proposalBody["projects"] = filteredProjects;
      proposalBody["projectPackages"] = [];
    } else {
      let projectPackages = await db.ProjectPackage.findAll({
        include: [
          {
            as: "building",
            model: db.Building,
            attributes: ["_id", "organization_id", "buildingname"],
            required: true
          }
        ],
        where: {
          buildingid: buildingIds,
          status: {
            [Op.ne]: "Scenario"
          }
        },
        attributes: projectPackageAttributes
      });

      let allProjectPackages = [];
      for (let item of projectPackages) {
        let projectPackage = {
          ...item.dataValues
        };
        projectPackage.organization = {
          _id: organization._id,
          name: organization.name
        };
        if (projectPackage.total_simplepayback < 0)
          projectPackage.total_simplepayback = 0;
        allProjectPackages.push(projectPackage);
      }
      let filteredProjects = allProjectPackages.filter(project => {
        let projectId = project._id;
        projectId = projectId.toString();
        return projectIds.indexOf(projectId) > -1;
      });
      delete proposalBody["measures"];
      delete proposalBody["projectPackages"];
      proposalBody["projects"] = [];
      proposalBody["projectPackages"] = filteredProjects;
    }
    proposalBody["mode"] = mode;
    proposalBody["createdBy"] = {
      id: proposalBody.createdByUserId._id.toString() || null,
      name: proposalBody.createdByUserId.name
    };
    try {
      if (proposalBody) {
        let cachedData = memCache.get(key);
        if (cachedData) {
          let dashboard = JSON.parse(cachedData);
          let newProposals = [...dashboard.proposals];
          if (status === "update")
            newProposals = newProposals.filter(
              proposal =>
                proposal._id.toString() !== proposalBody._id.toString()
            );
          let dashboardBody = {
            ...dashboard,
            proposals: [...newProposals, proposalBody]
          };
          let success = memCache.set(key, JSON.stringify(dashboardBody), 1000);
        }
      }
    } catch (error) {
      console.log("error", error);
    }
    return proposalBody;
  } catch (error) {
    console.log("error", error);
    return null;
  }
};

const createPortfolioProposal = async (req, res, next) => {
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

    let total = await calculateProposalTotal(
      req.body.measures,
      req.body.measurePackages,
      req.body.projectPackages
    );

    const proposal = new Proposal({
      name: req.body.name,
      description: req.body.description,
      status: req.body.status || "Identified",
      measures: req.body.measures,
      measurePackages: req.body.measurePackages,
      projectPackages: req.body.projectPackages,
      createdByUserId: req.user._id,
      total: total,
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
    let memCacheKey = req.body.memCacheKey || [req.body.organization];
    let mockProposal = await mockPortfolioProposal(
      newProposal._id,
      memCacheKey
    );
    res.sendResult = {
      status: "Success",
      message: "Create Proposal",
      proposal: mockProposal
    };
    return next();
  } catch (error) {
    console.log("error", error);
    return util.sendError("Issues creating the proposal", 500, req, res, next);
  }
};

const updatePortfolioProposal = async (req, res, next) => {
  try {
    if (!req.proposal) return;
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

    let total = await calculateProposalTotal(
      req.body.measures,
      req.body.measurePackages,
      req.body.projectPackages
    );

    Object.assign(req.proposal, {
      name: req.body.name,
      description: req.body.description,
      status: req.body.status || "Identified",
      measures: req.body.measures,
      measurePackages: req.body.measurePackages,
      projectPackages: req.body.projectPackages,
      createdByUserId: req.user._id,
      total: total,
      rates: req.body.rates || {},
      comments: req.body.comments || "",
      images: req.body.images || [],
      template: req.body.proposalTemplate || null,
      fieldValues: fieldValues,
      fields: fields,
      buildingIds: req.body.buildingIds,
      organization: req.body.organizaiton,
      rates: req.body.rates || {},
      updated: Date.now()
    });
    let updateProposal = await req.proposal.save();
    let memCacheKey = req.body.memCacheKey || [req.body.organization];
    let mockProposal = await mockPortfolioProposal(
      updateProposal._id,
      memCacheKey,
      "update"
    );
    res.sendResult = {
      status: "Success",
      message: "Update Proposal",
      proposal: mockProposal
    };
    return next();
  } catch (error) {
    console.log("error", error);
    return util.sendError("Issues updating the proposal", 500, req, res, next);
  }
};

const deletePortfolioProposal = async (req, res, next) => {
  try {
    if (!req.proposal || !req.proposal._id) {
      return util.sendError(
        "Issues removing the proposal",
        500,
        req,
        res,
        next
      );
    }
    let memCacheKey = req.body.memCacheKey || "";
    let proposalId = req.proposal._id.toString();
    await req.proposal.remove();
    if (memCacheKey) {
      let cachedData = memCache.get(memCacheKey);
      if (cachedData) {
        let dashboard = JSON.parse(cachedData);
        let newProposals = [...dashboard.proposals];
        newProposals = newProposals.filter(
          proposal => proposal._id !== proposalId
        );
        let dashboardBody = {
          ...dashboard,
          proposals: [...newProposals]
        };
        let success = memCache.set(
          memCacheKey,
          JSON.stringify(dashboardBody),
          1000
        );
      }
    }
    res.sendResult = {
      status: "Success",
      message: "Remove Proposal"
    };
    return next();
  } catch (error) {
    console.log("error", error);
    return util.sendError("Issues removing the proposal", 500, req, res, next);
  }
};

const getPDFReport = async (req, res, next) => {
  try {
    let { urls, target, ...params } = req.query;
    if (Object.keys(params).length !== 0 && params.constructor === Object) {
      for (let key in params) {
        if (Object.keys(params).indexOf(key) === 0)
          urls += "?" + key + "=" + params[key];
        else urls += "&" + key + "=" + params[key];
      }
    }
    let token = await getTableauAccessToken(target);
    if (!token) return util.sendError("Token is inValid.", 400, req, res, next);

    console.log("___________________TABLEAU_URL________________", urls);

    var options = {
      method: "GET",
      url: urls,
      encoding: null,
      headers: {
        Authorization: `Bearer ${token}`,
        ContentType: "application/pdf",
        "accept-charset": "utf-8"
      }
    };
    const date = new Date().toLocaleDateString();
    const fileName = "PortfolioDashboard_" + date;
    const response = await requestPromise(options);
    res.setHeader(
      "Content-Disposition",
      "attachment; " + "filename=" + fileName + "." + "pdf"
    );
    res.setHeader("Content-Type", "application/pdf");
    return res.send(response);
  } catch (error) {
    console.log(error);
    return util.sendError(error, 400, req, res, next);
  }
};

const makeFilter = UIFilters => {
  let filters = {};
  if (UIFilters && UIFilters.length) {
    for (let filter of UIFilters) {
      if (filter.type === "range" || filter.type === "yearRange") {
        filters[filter.value] = {
          [Op.gte]: filter.options.start,
          [Op.lte]: filter.options.end
        };
      } else if (filter.type === "costRange") {
        if (filter.options.option === "Less than") {
          filters[filter.value] = {
            [Op.lte]: filter.options.cost
          };
        } else if (filter.options.option === "Equal to") {
          filters[filter.value] = {
            [Op.gte]: filter.options.cost,
            [Op.lte]: filter.options.cost
          };
        } else {
          filters[filter.value] = {
            [Op.gte]: filter.options.cost
          };
        }
      } else {
        let options = filter.options || [];
        if (options.length) {
          filters[filter.value] = options.length > 1 ? options : options[0];
        }
      }
    }
  }
};

const portfolioBuildingImportSync = async (req, res, next) => {
  try {
    let { organizationId, userId, env } = req.query;
    let { xml, option: importOption = {} } = req.body;
    var options = {
      method: "POST",
      url: `https://analysis-qa.buildee.com:5000/integration/buildingsync?orgId=${organizationId}&userId=${userId}&env=${env}`,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        xml: xml,
        ...importOption
      })
    };
    let response = await requestPromise(options);
    response = JSON.parse(response);
    res.sendResult = {
      status: "Success",
      buildingId:
        (importOption && importOption.buildingId) || response.buildingId,
      errors: response.errors || [],
      warnings: response.warnings || []
    };
    return next();
  } catch (error) {
    console.log(error);
    return util.sendError(error, 400, req, res, next);
  }
};

module.exports = {
  getPortfolioBuilding,
  getPortfolioDashboard,
  getPortfolioProjects,
  getPortfolioProjectPackages,
  getPortfolioScenarios,
  createPortfolioScenario,
  updatePortfolioScenario,
  removePortfolioScenario,
  getTableauToken,
  getTableauAccessToken,
  addScenarioIncompleteProject,
  convertScenarioProject,
  scenarioById,
  addScenarioMeasurePackage,
  checkScenarioSynced,
  createPortfolioProposal,
  updatePortfolioProposal,
  deletePortfolioProposal,
  getPDFReport,
  portfolioBuildingImportSync,
  getRefetchPortfolioProjects
};
