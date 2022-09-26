const mongoose = require("mongoose");
const Organization = mongoose.model("Organization");
const User = mongoose.model("User");
const { Op } = require("sequelize");
const {
  buildingAttributes,
  monthlyUtilityAttributes,
  projectAttributes,
  projectPackageAttributes
} = require("./api.scenario.util");
const db = require("../../../models/portfolio");

const getPortfolioBuildingCustom = async buildingIds => {
  let updatedBuildings = [];
  try {
    let buildings = await db.Building.findAll({
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
      where: {
        _id: buildingIds
      },
      attributes: buildingAttributes
    });
    for (let building of buildings) {
      let newBuilding = Object.assign({}, building.dataValues || {});
      const userId = building.createdbyuserid;
      if (userId) {
        let user = await User.findById(userId);
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
  } catch (error) {
    console.log("error", error);
  } finally {
    return updatedBuildings;
  }
};

const getPortfolioProjectCustom = async (projectIds, organizationIds) => {
  let resultProjects = [];
  try {
    let organizations = await Organization.find({
      _id: { $in: organizationIds }
    });
    const projects = await db.Project.findAll({
      include: [
        {
          as: "building",
          model: db.Building,
          attributes: ["_id", "organization_id", "buildingname"],
          required: true,
          where: {
            organization_id: organizationIds
          }
        }
      ],
      where: {
        _id: projectIds,
        status: {
          [Op.ne]: "Scenario"
        }
      },
      attributes: projectAttributes
    });
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
      let eletricCharge =
        project.runresults_annual_savings_electric_charge || 0;
      let gasCharge = project.runresults_annual_savings_gas_charge || 0;
      project.annual_saving = eletricCharge + gasCharge;
      let userId = project.createdbyuserid;
      if (userId) {
        let user = await User.findById(userId);
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
      resultProjects.push(project);
    }
  } catch (error) {
    console.log("error", error);
  } finally {
    return resultProjects;
  }
};

const getPortfolioProjectPackageCustom = async (
  buildingIds = [],
  projectPackageIds = [],
  organizationIds = []
) => {
  let resultProjectPackages = [];
  try {
    let organizations = await Organization.find({
      _id: { $in: organizationIds }
    });
    const projectPackages = await db.ProjectPackage.findAll({
      include: [
        {
          as: "building",
          model: db.Building,
          attributes: ["_id", "organization_id", "buildingname"],
          required: true,
          where: {
            organization_id: organizationIds
          }
        }
      ],
      where: {
        buildingid: buildingIds,
        _id: projectPackageIds,
        status: {
          [Op.ne]: "Scenario"
        }
      },
      attributes: projectPackageAttributes
    });
    for (let item of projectPackages) {
      let projectPackage = {
        ...item.dataValues
      };
      const projectOrganization = organizations.filter(
        organization =>
          organization._id.toString() ===
          projectPackage.building.organization_id
      );
      if (projectOrganization.length) {
        projectPackage.organization = {
          _id: projectOrganization[0]._id,
          name: projectOrganization[0].name
        };
      }
      let userId = projectPackage.createdbyuserid;
      if (userId) {
        let user = await User.findById(userId);
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
      resultProjectPackages.push(projectPackage);
    }
  } catch (error) {
    console.log("error", error);
  } finally {
    return resultProjectPackages;
  }
};

const getPortfolioAllData = async (
  organizationIds,
  buildingIds,
  projectIds,
  projectPackageIds
) => {
  const buildingPromise = getPortfolioBuildingCustom(buildingIds);
  const projectPromise = getPortfolioProjectCustom(projectIds, organizationIds);
  const projectPackagePromise = getPortfolioProjectPackageCustom(
    buildingIds,
    projectPackageIds,
    organizationIds
  );
  let dashboard = {
    buildings: [],
    projects: [],
    projectPackages: []
  };
  try {
    let result = await Promise.all([
      buildingPromise,
      projectPromise,
      projectPackagePromise
    ]);
    dashboard = {
      buildings: result[0] || [],
      projects: result[1] || [],
      projectPackages: result[2] || []
    };
  } catch (error) {
    console.log("error", error);
  } finally {
    return dashboard;
  }
};

module.exports = {
  getPortfolioBuildingCustom,
  getPortfolioProjectCustom,
  getPortfolioProjectPackageCustom,
  getPortfolioAllData
};
