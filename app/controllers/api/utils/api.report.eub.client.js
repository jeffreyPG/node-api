const _ = require("lodash");
const moment = require("moment");
const mongoose = require("mongoose");
const MonthlyUtility = mongoose.model("MonthlyUtility");
const Construction = mongoose.model("Constructions");
const analysisClient = require("./api.analysis.client");
const { getProjects } = require("../../../dao/project.server.dao");
const { findByBuilding } = require("../../../dao/buildingEquipment.server.dao");
const Project = mongoose.model("Project");
const { findById } = require("../../../dao/equipment.server.dao");
const repository = require("../../../repository");
const {
  calculateMetric
} = require("../../../controllers/api/utils/api.project.util");

const getEndUseBreakdown = async function(startDate, endDate, building) {
  if (!building) return null;
  let monthlyUtilities = await repository.monthlyutilities.findByBuildingIdsStartEndDates(
    building._id,
    startDate,
    endDate
  );

  const monthlyUtilityData = await MonthlyUtility.find({
    building: building._id
  })
    .lean()
    .exec();
  const filteredMonthlyUtilities = monthlyUtilityData.filter(utility => {
    const itemStartDate = moment(utility.date);
    const itemEndDate = moment(utility.date).startOf("month");
    return (
      itemStartDate.isSameOrAfter(startDate) &&
      itemEndDate.isSameOrBefore(endDate)
    );
  });

  const mapToFinalShape = (monthlyUtility, fuelType) => {
    let currentShape = monthlyUtility[fuelType];
    let finalShape = {
      totalCost: (currentShape.totalCost || 0) - (currentShape.demandCost || 0),
      totalUsage: currentShape.totalUsage || 0,
      demand: currentShape.demand || 0,
      demandCost: currentShape.demandCost || 0,
      estimation: true,
      _id: "",
      created: monthlyUtility.createdAt,
      daysInPeriod: monthlyUtility.daysInPeriod
    };
    finalShape.startDate = moment(
      moment(monthlyUtility.date)
        .startOf("month")
        .startOf("day")
        .toDate()
    );
    finalShape.endDate = moment(
      moment(monthlyUtility.date)
        .endOf("month")
        .startOf("day")
        .toDate()
    );
    return finalShape;
  };
  monthlyUtilities = _.uniqBy(monthlyUtilities, mu =>
    [mu.month, mu.year].join()
  );
  const electric = monthlyUtilities.map(monthlyUtility =>
    mapToFinalShape(monthlyUtility, "electric")
  );
  const gas = monthlyUtilities.map(monthlyUtility =>
    mapToFinalShape(monthlyUtility, "naturalgas")
  );

  if ((!electric || electric.length === 0) && (!gas || gas.length === 0)) {
    return Promise.resolve(null);
  }

  const equipmentsObject = {};
  const equipments = await findByBuilding(building._id.toString());
  const libraryEquipments = await Promise.all(
    equipments.map(async equipment => {
      const found = await findById(equipment.libraryEquipment);
      const operation = building.operations.find(operation => {
        return (
          ((operation && operation._id && operation._id.toString()) || "") ===
          (equipment.operation && equipment.operation.id
            ? equipment.operation.id.toString()
            : "")
        );
      });
      let quantity = 1;
      if (equipment.quantity) {
        quantity = equipment.quantity;
      }
      let annualHours = -1;
      if (operation && operation.annualHours) {
        annualHours = operation.annualHours;
      }
      let configs = {};
      if (equipment.configs) {
        for (let c of equipment.configs) {
          if (c.value) {
            configs[c.field] = { value: c.value };
          }
        }
      }
      return (
        found && {
          equipment: found,
          annualHours: annualHours,
          quantity: quantity,
          configs: configs
        }
      );
    })
  );
  _.compact(libraryEquipments).forEach(
    ({ equipment, annualHours, quantity, configs }) => {
      let equipmentObj = equipment.toObject();
      const category = equipment.category;
      equipmentObj.fieldsArray = undefined;
      equipmentObj.quantity = quantity;
      if (annualHours >= 0) {
        equipmentObj.annualHours = annualHours;
      }
      equipmentObj.configs = configs;
      if (!equipmentsObject[category]) {
        equipmentsObject[category] = [];
      }
      equipmentsObject[category].push(equipmentObj);
    }
  );
  const equipment = [];
  const equipmentArray = Object.entries(equipmentsObject);
  equipmentArray.forEach(([key, value]) => {
    const temp = {};
    temp[key] = value;
    equipment.push(temp);
  });
  const rates = building.rates;
  const projectRates = building.projectRates;

  let projects = await getProjects(building.projectIds);

  let projectIds = building.projectIds || [];

  // need to add all subprojectIds

  for (let project of projects) {
    projectIds.push(...(project.projects || []));
  }

  projectIds = [...new Set(projectIds.map(id => id.toString()))];

  projects = await getProjects(building.projectIds);

  let reload = false;
  for (let project of projects) {
    if (!project.metric || Object.keys(project.metric).length === 0) {
      try {
        const updatedProject = await Project.findById(project._id);
        updatedProject.metric = calculateMetric(
          project,
          building._id.toString()
        );
        updatedProject.markModified("metric");
        await updatedProject.save();
        reload = true;
      } catch (error) {
        console.log("error", error);
      }
    }
  }

  if (reload) {
    projects = await getProjects(building.projectIds);
  }

  let projectsData = projects.map(project => ({
    fuelType: project.fuel,
    category: project.project_category,
    application: project.project_application,
    results: Object.values(project.runResults || {}).map(result => ({
      energySavings: result ? result["energy-savings"] : 0,
      costSavings: result ? result["annual-savings"] : 0
    })),
    metric: project.metric || {}
  }));

  //cleanup projects with empty results
  projectsData = projectsData.filter(
    project =>
      project.results &&
      project.results.length > 0 &&
      !_.isNil(project.results[0].energySavings)
  );

  let buildingUseTypes =
    building?.buildingUseTypes?.map(buildingtype => buildingtype) || [];

  let constructionIds =
    building?.constructions?.map(construction => construction.construction) ||
    [];

  let constructions = await Construction.find({
    _id: { $in: constructionIds }
  })
    .lean()
    .exec();

  const request = {
    utilityData: [{ electric }, { gas }],
    sqFoot: building.squareFeet,
    zipcode: building.location.zipCode,
    equipment,
    rates,
    projectRates,
    projects: projectsData,
    buildingType: building.buildingUse,
    monthlyUtilityData: filteredMonthlyUtilities,
    buildingUseTypes,
    constructions,
    floorCount: building.floorCount || 0,
    belowGradeFloorCount: building.belowGradeFloorCount || 0
  };

  return new Promise((resolve, reject) => {
    analysisClient.getEubResult(request, (err, response) => {
      if (err || !response) {
        console.error(err);
        reject(err);
      }
      resolve(response);
    });
  });
};

const getSimpleCBECS = async function(startDate, endDate, building) {
  /* I don't think this is actually Simple CBECS. I think it us Ashrae end use breakdown, but use getEndUseBreakdown */
  let monthlyUtilities = await repository.monthlyutilities.findByBuildingIdsStartEndDates(
    building._id,
    startDate,
    endDate
  );

  const mapToFinalShape = (monthlyUtility, fuelType) => {
    let currentShape = monthlyUtility[fuelType];
    let finalShape = {
      totalCost: (currentShape.totalCost || 0) - (currentShape.demandCost || 0),
      totalUsage: currentShape.totalUsage || 0,
      demand: currentShape.demand || 0,
      demandCost: currentShape.demandCost || 0,
      estimation: true,
      _id: "",
      created: monthlyUtility.createdAt
    };
    finalShape.startDate = moment(
      moment(monthlyUtility.date)
        .startOf("month")
        .startOf("day")
        .toDate()
    );
    finalShape.endDate = moment(
      moment(monthlyUtility.date)
        .endOf("month")
        .startOf("day")
        .toDate()
    );
    return finalShape;
  };
  monthlyUtilities = _.uniqBy(monthlyUtilities, mu =>
    [mu.month, mu.year].join()
  );
  const electric = monthlyUtilities.map(monthlyUtility =>
    mapToFinalShape(monthlyUtility, "electric")
  );
  const gas = monthlyUtilities.map(monthlyUtility =>
    mapToFinalShape(monthlyUtility, "naturalgas")
  );

  if ((!electric || electric.length === 0) && (!gas || gas.length === 0)) {
    return Promise.resolve(null);
  }

  const equipmentsObject = {};
  const equipments = await findByBuilding(building._id.toString());
  const libraryEquipments = await Promise.all(
    equipments.map(async equipment => {
      const found = await findById(equipment.libraryEquipment);
      const operation = building.operations.find(operation => {
        return operation.id == equipment.operation.id;
      });
      return (
        found && {
          equipment: found,
          annualHours: operation && operation.annualHours
        }
      );
    })
  );
  _.compact(libraryEquipments).forEach(({ equipment, annualHours }) => {
    let equipmentObj = equipment.toObject();
    const category =
      equipment.category === "KITCHEN" ? "COOKING" : equipment.category;
    equipmentObj.fieldsArray = undefined;
    equipmentObj.annualHours = annualHours;
    if (!equipmentsObject[category]) {
      equipmentsObject[category] = [];
    }
    equipmentsObject[category].push(equipmentObj);
  });
  const equipment = [];
  const equipmentArray = Object.entries(equipmentsObject);
  equipmentArray.forEach(([key, value]) => {
    const temp = {};
    temp[key] = value;
    equipment.push(temp);
  });
  const rates = building.rates;
  const projectRates = building.projectRates;

  const projects = await getProjects(building.projectIds);
  let projectsData = projects.map(project => ({
    fuelType: project.fuel,
    category: project.project_category,
    application: project.project_application,
    results: Object.values(project.runResults).map(result => ({
      energySavings: result ? result["energy-savings"] : 0,
      costSavings: result ? result["annual-savings"] : 0
    })),
    metric: project.metric || {}
  }));

  //cleanup projects with empty results
  projectsData = projectsData.filter(
    project =>
      project.results &&
      project.results.length > 0 &&
      !_.isNil(project.results[0].energySavings)
  );

  let buildingUseTypes =
    building?.buildingUseTypes?.map(buildingtype => buildingtype) || [];

  let constructionIds =
    building?.constructions?.map(construction => construction.construction) ||
    [];

  let constructions = await Construction.find({
    _id: { $in: constructionIds }
  })
    .lean()
    .exec();

  const request = {
    utilityData: [{ electric }, { gas }],
    sqFoot: building.squareFeet,
    zipcode: building.location.zipCode,
    equipment,
    rates,
    projectRates,
    projects: projectsData,
    buildingUseTypes,
    constructions,
    floorCount: building.floorCount || 0,
    belowGradeFloorCount: building.belowGradeFloorCount || 0
  };

  return new Promise((resolve, reject) => {
    analysisClient.getEubResult(request, (err, response) => {
      if (err || !response) {
        console.error(err);
        reject(err);
      }
      resolve(response);
    });
  });
};

module.exports = {
  getEndUseBreakdown
};
