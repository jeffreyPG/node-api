const _ = require("lodash");
const moment = require("moment");
const mongoose = require("mongoose");
const Building = mongoose.model("Building");
const Utility = mongoose.model("Utility");
const Project = mongoose.model("Project");
const MeasurePackage = mongoose.model("MeasurePackage");
const ProjectPackage = mongoose.model("ProjectPackage");
const System = mongoose.model("System");
const Location = mongoose.model("Location");
const BuildingEquipment = mongoose.model("BuildingEquipment");
const Equipment = mongoose.model("Equipment");
const MonthlyUtility = mongoose.model("MonthlyUtility");

const _copyUtilityData = async (utilityIds = []) => {
  try {
    let newIds = [];
    utilityIds = utilityIds.map(id => id.toString());
    let utilities = await Utility.find({ _id: { $in: utilityIds } })
      .lean()
      .exec();
    for (let utility of utilities) {
      let utilityBody = _.extend({}, utility);
      delete utilityBody._id;
      let newUtility = new Utility(utilityBody);
      newUtility = await newUtility.save();
      newIds.push(newUtility._id.toString());
    }
    return newIds;
  } catch (error) {
    console.log("error for copying utility data from sample building", error);
    return [];
  }
};

const _copyProjectData = async (
  newBuildingId,
  originalBuildingId,
  projectIdsCopy = [],
  package = null
) => {
  try {
    let newIds = [];
    let projectIds = [...new Set(projectIdsCopy)];
    let projects = await Project.find({ _id: { $in: projectIds } })
      .lean()
      .exec();
    for (let project of projects) {
      let projectBody = _.extend({}, project);
      delete projectBody._id;
      delete projectBody.package;
      if (package) projectBody.package = package;
      let runResults = _.extend({}, project.runResults);
      let runResultsWithRate = _.extend({}, project.runResultsWithRate);
      runResults[newBuildingId] = _.extend({}, runResults[originalBuildingId]);
      runResultsWithRate[newBuildingId] = _.extend(
        {},
        runResultsWithRate[originalBuildingId]
      );
      delete runResults[originalBuildingId];
      delete runResultsWithRate[originalBuildingId];
      projectBody.runResults = runResults;
      projectBody.runResultsWithRate = runResultsWithRate;
      let newProject = new Project(projectBody);
      newProject = await newProject.save();
      newIds.push(newProject._id.toString());
    }
    return newIds;
  } catch (error) {
    console.log("error for copying project data from sample building", error);
    return [];
  }
};

const _copyMeasurePackageData = async (
  newBuildingId,
  originalBuildingId,
  measurePackageIds = [],
  package = null
) => {
  try {
    let newIds = [];
    let measurePackages = await MeasurePackage.find({
      _id: { $in: measurePackageIds }
    })
      .lean()
      .exec();
    for (let measurePackage of measurePackages) {
      let projectIds = await _copyProjectData(
        newBuildingId,
        originalBuildingId,
        measurePackage.projects || [],
        package
      );
      let measurePackageBody = _.extend({}, measurePackage, {
        createdByUserId: req.user._id
      });
      delete measurePackageBody._id;
      delete measurePackageBody.package;
      if (package) measurePackageBody.package = package;
      measurePackage.projects = projectIds;
      let newMeasurePackage = new MeasurePackage(measurePackageBody);
      newMeasurePackage = await newMeasurePackage.save();
      newIds.push(newMeasurePackage._id.toString());
    }
    return newIds;
  } catch (error) {
    console.log("error for copying project data from sample building", error);
    return [];
  }
};

const _copyProjectPackageData = async (newBuildingId, originalBuildingId) => {
  try {
    let originalProjectIds = [],
      originalMeasurePackageIds = [];
    let newProjectIds = [],
      newMeasurePackageIds = [];
    let projectPackages = await ProjectPackage.find({
      buildingId: originalBuildingId
    })
      .lean()
      .exec();
    for (let projectPackage of projectPackages) {
      let projectPackageBody = _.extend({}, projectPackage);
      projectPackageBody.buildingId = newBuildingId;
      delete projectPackageBody._id;
      delete projectPackageBody.projects;
      delete projectPackageBody.measurePackages;
      let newProjectPackage = new ProjectPackage(projectPackageBody);
      newProjectPackage = await newProjectPackage.save();
      let measurePackageIds = await _copyMeasurePackageData(
        newBuildingId,
        originalBuildingId,
        projectPackage.measurePackages || [],
        newProjectPackage
      );
      let projectIds = await _copyProjectData(
        newBuildingId,
        originalBuildingId,
        projectPackage.projects || [],
        newProjectPackage
      );
      newProjectPackage.projects = projectIds;
      newProjectPackage.measurePackages = measurePackageIds;
      newProjectPackage.markModified("projects");
      newProjectPackage.markModified("measurePackages");
      newProjectIds = [...newProjectIds, ...projectIds];
      newMeasurePackageIds = [...newMeasurePackageIds, ...measurePackageIds];
      if (projectPackage.projects)
        originalProjectIds = [
          ...originalProjectIds,
          ...projectPackage.projects
        ];
      if (projectPackage.measurePackages)
        originalMeasurePackageIds = [
          ...originalMeasurePackageIds,
          ...projectPackage.measurePackages
        ];
      await newProjectPackage.save();
    }
    newProjectIds = newProjectIds.map(id => id.toString());
    newMeasurePackageIds = newMeasurePackageIds.map(id => id.toString());
    originalProjectIds = originalProjectIds.map(id => id.toString());
    originalMeasurePackageIds = originalMeasurePackageIds.map(id =>
      id.toString()
    );
    return {
      newProjectIds,
      newMeasurePackageIds,
      updateProjectIds: originalProjectIds,
      updateMeasurePackageIds: originalMeasurePackageIds
    };
  } catch (error) {
    console.log(
      "error for copying project package data from sample building",
      error
    );
    return {
      updateProjectIds: [],
      updateMeasurePackageIds: [],
      newProjectIds: [],
      newMeasurePackageIds: []
    };
  }
};

const _copySystemData = async (newBuildingId, originalBuildingId) => {
  try {
    let systems = await System.find({ building: originalBuildingId })
      .lean()
      .exec();
    for (let system of systems) {
      let systemBody = _.extend({}, system);
      systemBody.building = newBuildingId;
      delete systemBody._id;
      delete systemBody.projects;
      let projectIds = await _copyProjectData(
        newBuildingId,
        originalBuildingId,
        systemBody.projects || []
      );
      systemBody.projects = projectIds;
      let newSystem = new System(systemBody);
      await newSystem.save();
    }
  } catch (error) {
    console.log("error for copying system data from sample building", error);
  }
};

const _copyConstructionData = async (
  newBuildingId,
  originalBuildingId,
  construction
) => {
  return [];
};

const _copyLocationData = async (
  newBuildingId,
  originalBuildingId,
  locations
) => {
  try {
    let data = [];
    for (let item of locations) {
      let location = item.location;
      let equipmentIDs = item.equipment || [];
      let newLocationId = "",
        newEquipmentIds = [];
      let originalLocation = await Location.findById(location)
        .lean()
        .exec();
      let originalEuipmentList = await BuildingEquipment.find({
        _id: { $in: equipmentIDs }
      })
        .lean()
        .exec();
      let body = _.extend({}, originalLocation);
      delete body._id;
      body.building = newBuildingId;
      let newLocation = new Location(body);
      newLocation = await newLocation.save();
      newLocationId = newLocation._id;
      for (let equip of originalEuipmentList) {
        let body = _.extend({}, equip);
        delete body._id;
        body.building = newBuildingId;
        body.location = newLocationId;
        let newEquipment = new BuildingEquipment(body);
        newEquipment = await newEquipment.save();
        newEquipmentIds = [...newEquipmentIds, newEquipment._id.toString()];
      }
      data.push({
        location: newLocationId,
        equipment: newEquipmentIds,
        originalEquipment: equipmentIDs
      });
    }
    return data;
  } catch (error) {
    console.log("error for copying location data from sample building", error);
    return [];
  }
};

const _copyBuildingData = async (
  newBuildingId,
  originalBuildingId,
  currentOrganizationId
) => {
  try {
    let newBuilding = await Building.findById(newBuildingId);
    let originalBuilding = await Building.findById(originalBuildingId);
    let utilityIds = await _copyUtilityData(originalBuilding.utilityIds || []);
    let {
      updateProjectIds,
      updateMeasurePackageIds,
      newMeasurePackageIds,
      newProjectIds
    } = await _copyProjectPackageData(newBuildingId, originalBuildingId);
    let originalProjectIds = originalBuilding.projectIds || [];
    let originalMeasurePackageIds = originalBuilding.measurePackageIds || [];
    originalProjectIds = originalProjectIds.map(id => id.toString());
    originalMeasurePackageIds = originalMeasurePackageIds.map(id =>
      id.toString()
    );
    originalProjectIds = [...new Set(originalProjectIds)];
    originalMeasurePackageIds = [...new Set(originalMeasurePackageIds)];
    let projectIds = originalProjectIds.filter(
      id => updateProjectIds.indexOf(id) === -1
    );
    projectIds = await _copyProjectData(
      newBuildingId,
      originalBuildingId,
      projectIds,
      null
    );
    let measurePackageIds = originalMeasurePackageIds.filter(
      id => updateMeasurePackageIds.indexOf(id) === -1
    );
    measurePackageIds = await _copyMeasurePackageData(
      newBuildingId,
      originalBuildingId,
      measurePackageIds,
      null
    );

    projectIds = [...projectIds, ...newProjectIds];
    projectIds = projectIds.map(id => id.toString());
    measurePackageIds = [...measurePackageIds, ...newMeasurePackageIds];
    measurePackageIds = measurePackageIds.map(id => id.toString());

    let measurePackageMeasureIds = [];
    for (let id of measurePackageIds) {
      if (id) {
        let measurePackage = await MeasurePackage.findById(id);
        let ids = measurePackage.projects || [];
        ids = ids.map(item => item.toString());
        measurePackageMeasureIds = [...measurePackageMeasureIds, ...ids];
      }
    }
    projectIds = projectIds.filter(
      id => measurePackageMeasureIds.indexOf(id) === -1
    );
    newBuilding.utilityIds = utilityIds;
    newBuilding.measurePackageIds = measurePackageIds;
    newBuilding.projectIds = projectIds;
    newBuilding.measurePackageMeasureIds = measurePackageMeasureIds;
    newBuilding.markModified("utilityIds");
    newBuilding.markModified("measurePackageIds");
    newBuilding.markModified("projectIds");
    newBuilding.markModified("measurePackageMeasureIds");
    let constructions = await _copyConstructionData(
      newBuildingId,
      originalBuildingId,
      originalBuilding.constructions || []
    );
    let locations = await _copyLocationData(
      newBuildingId,
      originalBuildingId,
      originalBuilding.locations || []
    );
    newBuilding.locations = locations;

    // copy building equipments
    let buildingEquipmentIDs = [];
    for (let location of locations) {
      let item = location.originalEquipment || [];
      item = item.map(id => id.toString());
      buildingEquipmentIDs = [...buildingEquipmentIDs, ...item];
    }
    let otherEquipment = await BuildingEquipment.find({
      _id: {
        $nin: buildingEquipmentIDs
      },
      building: originalBuildingId
    })
      .lean()
      .exec();
    for (let equip of otherEquipment) {
      let body = _.extend({}, equip);
      delete body._id;
      body.building = newBuildingId;
      let newEquipment = new BuildingEquipment(body);
      newEquipment = await newEquipment.save();
    }
    newBuilding.markModified("locations");
    await newBuilding.save();
    await _copySystemData(newBuildingId, originalBuildingId);
    otherEquipment = await BuildingEquipment.find({
      building: newBuildingId
    });

    // copy library equipments
    let libraryEquipments = {};
    for (let equip of otherEquipment) {
      let originalLibraryEquipmentId = equip.libraryEquipment || null;
      originalLibraryEquipmentId = originalLibraryEquipmentId.toString();
      if (
        originalLibraryEquipmentId &&
        !libraryEquipments[originalLibraryEquipmentId]
      ) {
        let equipment = await Equipment.findById(originalLibraryEquipmentId)
          .lean()
          .exec();
        let body = _.extend({}, equipment);
        delete body._id;
        body.organization = currentOrganizationId;
        let newEquipment = new Equipment(body);
        newEquipment = await newEquipment.save();
        libraryEquipments[
          originalLibraryEquipmentId
        ] = newEquipment._id.toString();
      }
      if (originalLibraryEquipmentId) {
        equip.libraryEquipment = libraryEquipments[originalLibraryEquipmentId];
        await equip.save();
      }
    }
    console.log("successfully copied sample building");
  } catch (error) {
    console.log("error", error);
  }
};

const calculateRates = async (filter, originalRates) => {
  try {
    const keys = [
      "electric",
      "gas",
      "water",
      "steam",
      "fuelOil2",
      "fuelOil4",
      "fuelOil56",
      "diesel",
      "other"
    ];
    const keyMappings = {
      electric: "electric",
      gas: "naturalgas",
      water: "water",
      steam: "steam",
      fuelOil2: "fueloil2",
      fuelOil4: "fueloil4",
      fuelOil56: "fueloil56",
      diesel: "diesel",
      other: "other"
    };
    const fuelRates = {
      electric: [],
      gas: [],
      water: [],
      steam: [],
      fuelOil2: [],
      fuelOil4: [],
      fuelOil56: [],
      diesel: [],
      other: []
    };
    let rates = _.extend({}, originalRates);
    const monthlyUtilities = await MonthlyUtility.find(filter);
    for (let monthlyUtility of monthlyUtilities) {
      for (let key of keys) {
        const map = keyMappings[key];
        const totalUsage = (monthlyUtility && monthlyUtility[map] && monthlyUtility[map]["totalUsage"]) || 0;
        const totalCost = (monthlyUtility && monthlyUtility[map] && monthlyUtility[map]["totalCost"]) || 0;
        fuelRates[key].push({
          totalUsage,
          totalCost
        });
      }
    }
    for (let key in fuelRates) {
      let ratesByFuelType = fuelRates[key] || [];
      if (ratesByFuelType.length < 12)
        ratesByFuelType = ratesByFuelType.filter(
          value => value.totalUsage !== 0 && value.totalCost !== 0
        );
      let calculatedRate = 0;
      let totalUsage =
        ratesByFuelType.reduce((prev, curr) => prev + curr.totalUsage, 0) || 0;
      let totalCost =
        ratesByFuelType.reduce((prev, curr) => prev + curr.totalCost, 0) || 0;
      if (ratesByFuelType.length && totalUsage) {
        calculatedRate = totalCost / totalUsage;
      }
      calculatedRate = _.round(calculatedRate, 4);
      if (isNaN(calculatedRate)) calculatedRate = 0;
      let fieldsEdited = rates.fieldsEdited || [];
      if (fieldsEdited.indexOf(key) === -1) rates[key] = calculatedRate;
    }
    return rates;
  } catch (error) {
    console.log("error", error);
    return originalRates;
  }
};

/**
 * Calculate Building Rates
 */

const calculateAverageRate = async (
  buildingId,
  originalStartDate,
  originalEndDate,
  yearType = "CY",
  startMonth = "Jul",
  endMonth = "Jun"
) => {
  try {
    const keys = [
      "electric",
      "gas",
      "water",
      "steam",
      "fuelOil2",
      "fuelOil4",
      "fuelOil56",
      "diesel",
      "other"
    ];
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec"
    ];
    let ratesArray = [];
    let result = {};
    let startDate = moment(originalStartDate).utc();
    let endDate = moment(originalEndDate).utc();
    let years = 0;

    if (yearType === "FY") {
      let month = originalStartDate.format("MMM");
      if (months.indexOf(month) < months.indexOf(startMonth)) {
        startDate = moment(originalStartDate)
          .utc()
          .subtract(1, "year")
          .set("month", startMonth);
      }
      month = originalEndDate.format("MMM");
      if (months.indexOf(month) > months.indexOf(endMonth)) {
        endDate = moment(originalEndDate)
          .utc()
          .add(1, "year")
          .set("month", endMonth);
      }
      years = endDate.diff(startDate, "months") + 1;
      if (years % 12 === 0) years = years / 12;
      else years = (years - (years % 12)) / 12 + 1;
    } else {
      let startYear = startDate.format("YYYY");
      let endYear = endDate.format("YYYY");
      startYear = +startYear;
      endYear = +endYear;
      years = endYear - startYear + 1;
    }

    for (let year = 0; year < years; year++) {
      let customStartDate;
      let customEndDate;
      let rates = {};
      if (yearType === "CY") {
        if (year === 0) {
          customStartDate = moment(startDate)
            .utc()
            .startOf("month");
          customEndDate = moment(startDate)
            .utc()
            .endOf("year")
            .startOf("month");
        } else {
          customStartDate = moment(startDate)
            .utc()
            .add(year, "year")
            .startOf("year");
          customEndDate = moment(startDate)
            .utc()
            .add(year, "year")
            .endOf("year")
            .startOf("month");
        }
      } else {
        if (year === 0) {
          customStartDate = moment(startDate)
            .utc()
            .startOf("month");
          customEndDate = moment(startDate)
            .utc()
            .add(1, "year")
            .set("month", endMonth)
            .startOf("month");
        } else {
          customStartDate = moment(startDate)
            .utc()
            .add(year, "year")
            .set("month", startMonth)
            .startOf("month");
          customEndDate = moment(startDate)
            .utc()
            .add(year + 1, "year")
            .set("month", endMonth)
            .startOf("month");
        }
      }
      if (customEndDate.diff(endDate) > 0) customEndDate = endDate;
      if (customStartDate.diff(endDate) > 0) break;
      if (customEndDate.diff(customStartDate) < 0) break;
      let filter = {
        building: buildingId,
        date: {
          $gte: new Date(customStartDate),
          $lte: new Date(customEndDate)
        }
      };
      rates = await calculateRates(filter, rates);
      ratesArray.push(rates);
    }
    for (let key of keys) {
      let rate = 0;
      let values = ratesArray.map(item => item[key] || 0);
      if (values.length)
        rate = values.reduce((prev, curr) => prev + curr) / values.length;
      result[key] = _.round(rate, 4);
      if (!result[key]) result[key] = 0;
    }
    return result;
  } catch (error) {
    console.log(error);
    return {};
  }
};

const buildingTypes = [
  { value: "adult-education", name: "Adult Education" },
  { value: "aquarium", name: "Aquarium" },
  { value: "automobile-dealership", name: "Automobile Dealership" },
  { value: "bank-branch", name: "Bank Branch" },
  { value: "bar", name: "Bar/Nightclub" },
  { value: "barracks", name: "Barracks" },
  { value: "bowling-alley", name: "Bowling Alley" },
  { value: "casino", name: "Casino" },
  { value: "college", name: "College/University" },
  {
    value: "convenience-store-gas",
    name: "Convenience Store with Gas Station"
  },
  { value: "convenience-store", name: "Convenience Store without Gas Station" },
  { value: "convention-center", name: "Convention Center" },
  { value: "courthouse", name: "Courthouse" },
  { value: "data-center", name: "Data Center" },
  { value: "distribution-center", name: "Distribution Center" },
  { value: "water-treatment", name: "Drinking water Treatment & Distribution" },
  { value: "enclosed-mall", name: "Enclosed Mall" },
  { value: "energy-station", name: "Energy/Power Station" },
  { value: "fast-food", name: "Fast Food restaurants" },
  { value: "financial-office", name: "Financial Office" },
  { value: "fire-station", name: "Fire Station" },
  { value: "fitness-center", name: "Fitness Center/Health Club/GYM" },
  { value: "food-sales", name: "Food Sales" },
  { value: "food-services", name: "Food Services" },
  { value: "hospital", name: "Hospital (General Medical &Surgical)" },
  { value: "hotel", name: "Hotel" },
  { value: "ice-rink", name: "Ice/Curling Rink" },
  { value: "indoor-arena", name: "Indoor Arena" },
  { value: "school", name: "K-12 School" },
  { value: "laboratory", name: "Laboratory" },
  { value: "library", name: "Library" },
  { value: "lifestyle-center", name: "Lifestyle Center" },
  { value: "mailing-center", name: "Mailing center/Post office" },
  { value: "manufacturing-plant", name: "Manufacturing/Industrial Plant" },
  { value: "medical-office", name: "Medical Office" },
  { value: "microbreweries", name: "Microbreweries" },
  { value: "mixed-use", name: "Mixed Use Property" },
  { value: "movie-theater", name: "Movie Theater" },
  { value: "multifamily-housing", name: "Multifamily Housing" },
  { value: "museum", name: "Museum" },
  { value: "non-refrigerated", name: "Non-Refrigerated Warehouse" },
  { value: "office", name: "Office" },
  { value: "other-education", name: "Other - Education" },
  {
    value: "other-entertainment",
    name: "Other - Entertainment/Public Assembly"
  },
  { value: "other-lodging/Residential", name: "Other - Lodging/Residential" },
  { value: "other-office", name: "Other - Office" },
  { value: "other-other", name: "Other - Other" },
  { value: "other-public", name: "Other - Public Service" },
  { value: "other-recreation", name: "Other - Recreation " },
  { value: "other-restaurant", name: "Other - Restaurant/Bar" },
  { value: "other-retail", name: "Other - Retail/Mall" },
  { value: "other-services", name: "Other - Services" },
  { value: "other-hospital", name: "Other - Specialty Hospital" },
  { value: "other-stadium", name: "Other - Stadium" },
  { value: "other-technology", name: "Other - Technology/Science" },
  { value: "other-utility", name: "Other - Utility" },
  {
    value: "outpatient-rehabilitation",
    name: "Outpatient Rehabilitation/Physical Therapy"
  },
  { value: "performing-arts", name: "Performing Arts" },
  {
    value: "personal-services",
    name: "Personal Services (Health/Beauty, Dry Cleaning, etc"
  },
  { value: "police-station", name: "Police Station" },
  { value: "pre-school", name: "Pre-school/Daycare" },
  { value: "prison", name: "Prison/Incarceration" },
  { value: "race-track", name: "Race Track" },
  { value: "refrigerated-warehouse", name: "Refrigerated Warehouse" },
  {
    value: "repair-services",
    name: "Repair Services (Vehicle, Shoe, Locksmith, etc)"
  },
  { value: "residential-care", name: "Residential Care Facility" },
  { value: "residential-hall", name: "Residential Hall/Dormitory" },
  { value: "restaurants", name: "Restaurants" },
  { value: "retail-store", name: "Retail Store" },
  { value: "roller-rink", name: "Roller Rink" },
  { value: "self-storage", name: "Self-storage Facility" },
  { value: "senior-care", name: "Senior Care Community" },
  { value: "single-family", name: "Single Family Home" },
  { value: "social-hall", name: "Social/Meeting Hall" },
  { value: "stadium-closed", name: "Stadium (Closed)" },
  { value: "stadium-open", name: "Stadium (Open)" },
  { value: "strip-mall", name: "Strip Mall" },
  { value: "supermarket", name: "Supermarket/ Grocery Store" },
  { value: "transportation-terminal", name: "Transportation Terminal/Station" },
  { value: "urgent-care", name: "Urgent Care/Clinic/Other Outpatient" },
  { value: "veterinary-office", name: "Veterinary Office" },
  { value: "vocational-school", name: "Vocational School" },
  { value: "wastewater-treatment-plant", name: "Wastewater Treatment Plant" },
  { value: "wholesale-club", name: "Wholesale Club/Supercenter" },
  { value: "worship-facility", name: "Worship Facility" },
  { value: "zoo", name: "Zoo" },
  { value: "parking", name: "Parking" },
  { value: "swimming-pool", name: "Swimming Pool" }
];

const createBuildingUtilityData = async (
  buildingId,
  utilityType,
  utilityMonthlyCost,
  rates,
  title = "",
  meterTitle = ""
) => {
  try {
    let type =
      utilityType === "electric"
        ? "electric"
        : utilityType === "natural-gas"
        ? "gas"
        : "";
    if (!type) return;
    let monthlyCost = utilityMonthlyCost[type] || 0;
    let rate = rates[type] || 1;
    let simpleMetaData = {
      totalCost: monthlyCost,
      totalUsage: monthlyCost / rate,
      estimation: true
    };
    let metaData = [];
    for (let i = 0; i < 12; i++) {
      let newData = {
        ...simpleMetaData,
        startDate: moment()
          .utc()
          .subtract(12 - i, "months")
          .startOf("month"),
        endDate: moment()
          .utc()
          .subtract(12 - i, "months")
          .endOf("month")
      };
      metaData.push(newData);
    }
    metaData.push({
      startDate: moment()
        .utc()
        .startOf("month"),
      endDate: moment()
        .utc()
        .endOf("month"),
      totalCost: monthlyCost,
      totalUsage: monthlyCost / rate,
      estimation: true
    });
    metaData.push({
      startDate: moment()
        .utc()
        .add(1, "month")
        .startOf("month"),
      endDate: moment()
        .utc()
        .add(1, "month")
        .endOf("month"),
      totalCost: monthlyCost,
      totalUsage: monthlyCost / rate,
      estimation: true
    });

    if (type === "electric") {
      let totalCost = monthlyCost * 12;
      let totalUsage = totalCost / rate;
      let newUtility = new Utility({
        name: title || "eletricity",
        meterNumber: meterTitle || "eletricity",
        source: "manual",
        units: "kwh",
        utilType: type,
        meterData: metaData
      });
      newUtility = await newUtility.save();
      let building = await Building.findById(buildingId);
      if (building) {
        let utilityIds = building.utilityIds || [];
        utilityIds = utilityIds.map(id => id.toString());
        utilityIds.push(newUtility._id.toString());
        building.utilityIds = utilityIds;
        building.markModified("utilityIds");
        await building.save();
      }
    } else {
      let newUtility = new Utility({
        name: "natural-gas",
        meterNumber: "natural-gas",
        source: "manual",
        units: "therms",
        utilType: "natural-gas",
        meterData: metaData
      });
      newUtility = await newUtility.save();
      let building = await Building.findById(buildingId);
      if (building) {
        let utilityIds = building.utilityIds || [];
        utilityIds = utilityIds.map(id => id.toString());
        utilityIds.push(newUtility._id.toString());
        building.utilityIds = utilityIds;
        building.markModified("utilityIds");
        await building.save();
      }
    }
  } catch (error) {
    console.log("error", error);
  }
};

module.exports = {
  _copyBuildingData,
  calculateRates,
  calculateAverageRate,
  buildingTypes,
  createBuildingUtilityData
};
