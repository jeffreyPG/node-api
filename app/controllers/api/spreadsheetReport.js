"use strict";

/**
 * Module dependencies.
 */
const _ = require("lodash"),
  moment = require("moment"),
  mongoose = require("mongoose"),
  util = require("./utils/api.utils"),
  Project = mongoose.model("Project"),
  Building = mongoose.model("Building"),
  Systems = mongoose.model("System"),
  SystemType = mongoose.model("SystemType"),
  Construction = mongoose.model("Constructions"),
  Location = mongoose.model("Location"),
  Utility = mongoose.model("Utility"),
  BuildingEquipment = mongoose.model("BuildingEquipment"),
  Equipment = mongoose.model("Equipment"),
  EquipmentCategorization = mongoose.model("EquipmentCategorization"),
  EquipmentSchema = mongoose.model("EquipmentSchema"),
  MeasureFormula = mongoose.model("MeasureFormula"),
  excelReportClient = require("./utils/api.excel.report.client");

const { SpreadsheetTemplate } = require("../../models/spreadsheetTemplate");
const { capitalize } = require("./utils/string.helpers");
const {
  getYearlyStartAndEndDates,
  getYearRange
} = require("./utils/date.helpers");
const {
  getProjectCost,
  getIncentive,
  getAnnualSavings,
  getEnergySavings,
  getSimplePayback,
  getSIR,
  getNPV,
  getGHGSavings,
  getGHGCost,
  getEUL,
  calculateROI,
  getTotalEnergySavings,
  getTotalProjectCost,
  getTotalAnnualSavings,
  getTotalTotalEnergySavings,
  getTotalIncentive,
  calculateTotalROI,
  getTotalFinancialFunding,
  calculateTotalEnergySavings,
  getTotalEUL,
  getTotalGHGCost,
  getTotalGHGSavings,
  getTotalSIR,
  getTotalNPV,
  getTotalSimplePayback,
  hasSubMeasure,
  getProjectFinancialValues,
  getTotalMaintenanceSavings
} = require("./utils/project.calculations");
const {
  calculateEnergySavings,
  calculateGasSavingsCost
} = require("./utils/api.project.util");
const fuelTypes = require("./utils/fuelTypes.json");
const displayNames = require("./utils/displayNames.json");
const { convertNameLabelForXcelMeasure } = require("./utils/report/project");
const ledLightingUtils = require("./utils/report/ledlighting");

/**
 * Get the Calculations for OverviewAndProperty DataSource of Building Report
 */
const getCalculations = async (building, year) => {
  try {
    const {
      totalGHGEmission,
      totalUtilUsages,
      totalCost
    } = await getGHGCalculations(building, year);
    const endUse = building.endUse || {};
    let EUI = getEUI(building);
    let costEstimate = endUse["cost-estimate"] || {};
    let totalEnergyEstimate = endUse["total-energy-estimate"] || {};
    let resultObject = {
      "Total Electricity usage": totalUtilUsages.electric,
      "Total GHG Emissions": totalGHGEmission,
      "Energy Star Benchmark Score": 0,
      EUI: EUI,
      "Total Cost": totalCost,
      "Cost - Median": costEstimate["quantile-50"] || 0,
      "Cost - 75th Percentile": costEstimate["quantile-75"] || 0,
      "Cost - 90th Percentile": costEstimate["quantile-90"] || 0,
      "Usage - Median": totalEnergyEstimate["quantile-50"] || 0,
      "Usage - 75th Percentile": totalEnergyEstimate["quantile-75"] || 0,
      "Usage - 90th Percentile": totalEnergyEstimate["quantile-90"] || 0
    };
    return Promise.resolve(resultObject);
  } catch (error) {
    return Promise.reject(error);
  }
};

/**
 * Get the EUI calculations for OverviewAndProperty DataSource of Building Report
 */
const getEUI = building => {
  const endUse = building.endUse || {};
  let EUI = 0;
  if (Object.keys(endUse).length) {
    EUI = endUse["total-energy-estimate"]
      ? endUse["total-energy-estimate"].estimated_eui
        ? endUse["total-energy-estimate"].estimated_eui
        : endUse["total-energy-estimate"].estimated_consumption /
          building.squareFeet
      : "";
  }
  return EUI;
};

/**
 * Get the GHG Emissions calculation for OverviewAndProperty DataSource of Building Report
 */
const getGHGCalculations = async (building, year) => {
  try {
    let utilityIds = building.utilityIds || [];
    let utilityFilterObject = {
      _id: {
        $in: utilityIds
      }
    };
    let utilities = await Utility.find(utilityFilterObject);

    let totalCost = 0,
      totalUtilUsages = {
        electric: 0,
        "natural-gas": 0,
        steam: 0,
        "fuel-oil-2": 0,
        "fuel-oil-4": 0,
        "fuel-oil-5-6": 0,
        diesel: 0
      };

    for (let i = 0; i < utilities.length; i++) {
      for (let j = 0; j < utilities[i].meterData.length; j++) {
        let meterDate = moment(utilities[i].meterData[j].startDate).year();
        if (year == meterDate) {
          totalCost += utilities[i].meterData[j].totalCost;
          if (utilities[i].utilType === "electric") {
            totalCost += utilities[i].meterData[j].demandCost;
          }
          totalUtilUsages[utilities[i].utilType] +=
            utilities[i].meterData[j].totalUsage;
        }
      }
    }

    let electricGHGFactor =
      building.rates && building.rates.electricGHG
        ? building.rates.electricGHG
        : 0.000744;
    let gasGHGFactor =
      building.rates && building.rates.gasGHG ? building.rates.gasGHG : 0.0053;
    let steamGHGFactor =
      building.rates && building.rates.steamGHG ? building.rates.steamGHG : 0;
    let fuelOil2GHGFactor =
      building.rates && building.rates.fuelOil2GHG
        ? building.rates.fuelOil2GHG
        : 0.01021;
    let fuelOil4GHGFactor =
      building.rates && building.rates.fuelOil4GHG
        ? building.rates.fuelOil4GHG
        : 0.01096;
    let fuelOil56GHGFactor =
      building.rates && building.rates.fuelOil56GHG
        ? building.rates.fuelOil56GHG
        : 0.01021;
    let dieselGHGFactor =
      building.rates && building.rates.dieselGHG
        ? building.rates.dieselGHG
        : 0.01021;

    let electricityEmissions =
      totalUtilUsages.electric * electricGHGFactor || 0;
    let naturalGasEmissions =
      totalUtilUsages["natural-gas"] * gasGHGFactor || 0;
    let steamEmissions = totalUtilUsages.steam * steamGHGFactor || 0;
    let fuelOil2Emissions =
      totalUtilUsages["fuel-oil-2"] * fuelOil2GHGFactor || 0;
    let fuelOil4Emissions =
      totalUtilUsages["fuel-oil-4"] * fuelOil4GHGFactor || 0;
    let fuelOil56Emissions =
      totalUtilUsages["fuel-oil-5-6"] * fuelOil56GHGFactor || 0;
    let dieselEmissions = totalUtilUsages.diesel * dieselGHGFactor || 0;

    let totalGHGEmission =
      electricityEmissions +
      naturalGasEmissions +
      steamEmissions +
      fuelOil2Emissions +
      fuelOil4Emissions +
      fuelOil56Emissions +
      dieselEmissions;
    let returnObject = {
      totalGHGEmission,
      totalUtilUsages,
      totalCost
    };
    return Promise.resolve(returnObject);
  } catch (error) {
    return Promise.reject(error);
  }
};

/**
 * Get the Column Data for OverviewAndProperty DataSource fo Building Report
 */
const getOverviewAndProperty = async (building, sheetdata, year) => {
  try {
    const dataObject = {
      BuildingName: (building && building.buildingName) || "",
      Country:
        (building && building.location && building.location.country) || "",
      Address:
        (building && building.location && building.location.address) || "",
      City: (building && building.location && building.location.city) || "",
      "State/Province":
        (building && building.location && building.location.state) || "",
      "Postal Code":
        (building && building.location && building.location.zipCode) || ""
    };

    // adding customfields
    const customFields = building && building.customFields;
    customFields.forEach(cf => {
      const label = cf.key;
      dataObject[label] = cf.value;
    });
    dataObject["Above Grade Floors"] =
      (building && building["floorCount"]) || "";
    dataObject["Below Grade Floors"] =
      (building && building["belowGradeFloorCount"]) || "";
    dataObject["Year Built"] = (building && building["buildYear"]) || "";
    dataObject["Open 24/7?"] = (building && building["open247"]) || "";
    dataObject["Square Footage (ft^2)"] =
      (building && building["squareFeet"]) || "";
    dataObject["Primary Use"] = (building && building["buildingUse"]) || "";

    // adding buildingUse list -- need to discus
    const buildingUseTypes = building && building.buildingUseTypes;
    dataObject["Building Use"] =
      buildingUseTypes.map(but => but.use).join("\n") || "";
    dataObject["Square Feet"] =
      buildingUseTypes.map(but => "" + but.squareFeet).join("\n") || "";

    dataObject["Client Name"] = (building && building["clientName"]) || "";
    dataObject["Site Name"] = (building && building["siteName"]) || "";

    // adding contacts
    const contacts = (building && building["contacts"]) || [];
    contacts.forEach((contact, index) => {
      const lable = `Contact${index + 1}`;
      dataObject[lable] =
        (contact && `${contact.firstName} ${contact.lastName}`) || "";
    });

    dataObject["Main Building Image"] =
      (building && building["buildingImage"]) || "";
    dataObject["Tags"] =
      (building && building["tags"] && building["tags"].join(",")) || "";

    // adding nycFields
    const nycFields = building && building["nycFields"];
    dataObject["Borough"] = (nycFields && nycFields["borough"]) || "";
    dataObject["Block"] = (nycFields && nycFields["block"]) || "";
    dataObject["Tax Lot"] = (nycFields && nycFields["taxLot"]) || "";
    dataObject["Historic Building?"] =
      (nycFields && nycFields["historicBuilding"]) || "";
    dataObject["Percent Owned"] =
      (nycFields && nycFields["percentOwned"]) || "";
    dataObject["Percent Leased"] =
      (nycFields && nycFields["percentLeased"]) || "";
    dataObject["Multi Tenant?"] = (nycFields && nycFields["multiTenant"]) || "";
    dataObject[
      "Shared Energy Systems or Meters for Multiple Buildings on Single Lot?"
    ] =
      (nycFields &&
        nycFields[
          "sharedEnergySystemsOrMetersForMultipleBuildingsOnSingleLot"
        ]) ||
      "";
    dataObject[
      "Shared Energy Systems or Meters for Multiple Buildings on Multiple Lots?"
    ] =
      (nycFields &&
        nycFields[
          "sharedEnergySystemsOrMetersForMultipleBuildingsOnMultipleLots"
        ]) ||
      "";

    // adding summary details
    let utilityIds = (building && building.utilityIds) || [];
    let reportStartDate;
    let reportEndDate;
    utilityIds = utilityIds.map(
      utilityId => new mongoose.Types.ObjectId(utilityId)
    );
    let utilityFilterObject = {
      _id: {
        $in: utilityIds
      }
    };
    let filterObject = await getUtilityFilterObject(
      utilityFilterObject,
      {},
      year
    );
    utilityFilterObject = filterObject.utilityFilterObject;
    reportStartDate = filterObject.reportStartDate;
    reportEndDate = filterObject.reportEndDate;
    const utilities = await Utility.find(utilityFilterObject).exec();
    const options = {
      allColumns: false,
      startDate: reportStartDate,
      endDate: reportEndDate
    };
    const utilitySummaryDetails = getUtilitySummaryDetails(utilities, options);
    const innerArrayObject =
      (utilitySummaryDetails &&
        utilitySummaryDetails.innerObjectArray &&
        utilitySummaryDetails.innerObjectArray[0]) ||
      [];
    const keys = Object.keys(innerArrayObject) || [];
    keys.forEach(key => {
      if (key !== "Year") {
        if (key === "Total Cost ($)") {
          dataObject[key] = innerArrayObject[key];
          dataObject["Total Cost per ft² ($)"] = (
            Number(dataObject[key]) /
            Number(dataObject["Square Footage (ft^2)"])
          ).toFixed(2);
        } else {
          dataObject[key] = innerArrayObject[key];
        }
      }
    });

    const calculations = await getCalculations(building, year);
    dataObject["Total GHG Emissions (kgCO2e/ft^2)"] =
      Number(calculations["Total GHG Emissions"]).toFixed(2) || "";
    dataObject["Energy Star Benchmark Score"] =
      calculations["Energy Star Benchmark Score"];

    dataObject["EUI (kBTU/ft^2)"] =
      Number(calculations["EUI"]).toFixed(2) || "";
    dataObject["Cost - Median ($)"] = Math.round(calculations["Cost - Median"]);
    dataObject["Cost - 75th Percentile ($)"] = Math.round(
      calculations["Cost - 75th Percentile"]
    );
    dataObject["Cost - 90th Percentile ($)"] = Math.round(
      calculations["Cost - 90th Percentile"]
    );
    dataObject["Usage - Median (kBTU)"] = Math.round(
      calculations["Usage - Median"]
    );
    dataObject["Usage - 75th Percentile (kBTU)"] = Math.round(
      calculations["Usage - 75th Percentile"]
    );
    dataObject["Usage - 90th Percentile (kBTU)"] = Math.round(
      calculations["Usage - 90th Percentile"]
    );
    dataObject["Main Building Image"] = building.buildingImage;

    const columnData = Object.keys(dataObject).map(key => ({
      ColumnName: key
    }));
    const data = [];
    data.push(dataObject);
    const returnObj = {
      columnData: columnData,
      data: data
    };
    return Promise.resolve(returnObj);
  } catch (error) {
    return Promise.reject(error);
  }
};

/**
 * Get the filtered data of Systems and SystemType collections.
 */
const systemTypeFilterData = async (systems, sheetData) => {
  try {
    const metaData = sheetData.metaData;
    const templateIds = systems.map(
      system => new mongoose.Types.ObjectId(system.template)
    );
    let systemTypeFilterObject = {
      _id: {
        $in: templateIds
      }
    };
    if (metaData && metaData.systemType) {
      systemTypeFilterObject["name"] = metaData.systemType;
    }
    let systemTypes = await SystemType.find(systemTypeFilterObject);
    if (metaData && metaData.systemType) {
      const tempIds = systemTypes.map(systemtype => systemtype._id.toString());
      systems = systems.filter(system =>
        tempIds.includes(system.template.toString())
      );
    }
    let resultObject = {
      systemTypes,
      systems
    };
    return Promise.resolve(resultObject);
  } catch (error) {
    return Promise.reject(error);
  }
};

/**
 * Get the Column Data for Systems DataSource of Building Report
 */
const getSystems = async (building, sheetdata) => {
  try {
    const filterObj = {
      building: building._id
    };
    let systems = await Systems.find(filterObj);
    const columnHeadings = sheetdata.columnHeadings;
    let columnData = [],
      data = [];
    let filteredObject = await systemTypeFilterData(systems, sheetdata);
    let templates = filteredObject.systemTypes;
    systems = filteredObject.systems;
    for (let i = 0; i < columnHeadings.length; i++) {
      if (columnHeadings[i].name !== "Media")
        columnData.push({ ColumnName: columnHeadings[i].name });
    }
    const imageColumns = [];
    for (let i = 0; i < systems.length; i++) {
      let sys = systems[i];
      let temp = templates.find(template =>
        template["_id"].equals(sys.template)
      );
      let images = (sys && sys.images) || [];
      let innerDataObj = {};
      let dataObj = {
        Name: sys.name || "",
        "System Type": temp ? temp.name : "",
        Comments: sys.comments || ""
      };

      images.forEach((image, index) => {
        let columnName = "Image" + (index + 1);
        dataObj[columnName] = image.toString();
        if (!imageColumns.find(imgCol => imgCol["ColumnName"] === columnName))
          imageColumns.push({ ColumnName: columnName });
      });
      columnData = _.uniq([...columnData, ...imageColumns]);

      for (let j = 0; j < columnData.length; j++) {
        innerDataObj[columnData[j].ColumnName] =
          dataObj[columnData[j].ColumnName];
      }
      data.push(innerDataObj);
    }
    if (!imageColumns.length) {
      columnData.push({ ColumnName: "Media" });
    }
    let returnObj = {
      columnData: columnData,
      data: data
    };
    return returnObj;
  } catch (error) {
    return Promise.reject(error);
  }
};

/**
 * Get the Column Data for Construction DataSource of Building Report
 */
const getConstructions = async (building, sheetdata) => {
  try {
    let constructions = building.constructions;
    let constructionIds = constructions.map(
      contruction => new mongoose.Types.ObjectId(contruction.construction)
    );
    let constructionFilterObject = {
      _id: {
        $in: constructionIds
      }
    };
    const constructionData = await Construction.find(constructionFilterObject);
    const columnHeadings = sheetdata.columnHeadings;
    let columnData = [],
      data = [],
      imageColumns = [];
    columnHeadings.forEach(columnHeading => {
      if (columnHeading.name !== "Media")
        columnData.push({ ColumnName: columnHeading.name });
    });
    constructions.forEach(construction => {
      const conObj = _.find(constructionData, {
        _id: construction.construction
      });
      const comments = construction.comments || "";
      const images = construction.images || [];
      let innerDataObj = {};
      let fields = conObj.fields;
      let dataObj = {
        Name: conObj.name || "",
        Application: conObj.application || "",
        "R-Value": fields.rValue ? fields.rValue.value : "",
        Comments: comments || ""
      };

      images.forEach((image, index) => {
        let columnName = "Media" + (index + 1);
        dataObj[columnName] = image.toString();
        if (!imageColumns.find(imgCol => imgCol["ColumnName"] === columnName))
          imageColumns.push({ ColumnName: columnName });
      });
      columnData = _.uniq([...columnData, ...imageColumns]);
      for (let a = 0; a < columnData.length; a++) {
        innerDataObj[columnData[a].ColumnName] =
          dataObj[columnData[a].ColumnName] || "";
      }
      data.push(innerDataObj);
    });
    let returnObj = {
      columnData: columnData,
      data: data
    };
    return Promise.resolve(returnObj);
  } catch (error) {
    return Promise.reject(error);
  }
};

/**
 * Get the Column Data for Location DataSource of Building Report
 */
const getLocations = async (building, sheetdata) => {
  try {
    let locationIds = building.locations || [];
    locationIds = locationIds.map(
      locationId => new mongoose.Types.ObjectId(locationId.location)
    );
    let locationsFilterObject = {
      _id: {
        $in: locationIds
      }
    };
    const locations = await Location.find(locationsFilterObject);
    const columnHeadings = sheetdata.columnHeadings;
    let columnData = [],
      data = [];
    columnHeadings.forEach(columnHeading => {
      columnData.push({ ColumnName: columnHeading.name });
    });
    locations.forEach(location => {
      let innerDataObj = {};
      const useTypes = displayNames.buildingTypes || {};
      let useType = location.usetype || "";
      useType = (useTypes && useTypes[useType]) || useType;
      let spaceType = location.spaceType || "";
      spaceType = (spaceType && useTypes[spaceType]) || spaceType;
      const conditions = displayNames.conditioning || "";
      let conditioning = location.conditioning || "";
      conditioning = (conditions && conditions[conditioning]) || conditioning;
      const users = displayNames.users || {};
      let user = location.user || "";
      user = (users && users[user]) || user;
      let dataObj = {
        Floor: "floor" in location ? location["floor"] : "", // to make floor 0 valid {true}
        "Use Type": useType,
        "Space Type": spaceType,
        Name: location.name || "",
        "Area (sq.ft)": location.area || "",
        Conditioning: conditioning,
        User: user
      };
      for (let l = 0; l < columnData.length; l++) {
        innerDataObj[columnData[l].ColumnName] =
          dataObj[columnData[l].ColumnName];
      }
      data.push(innerDataObj);
    });
    let returnObj = {
      columnData: columnData,
      data: data
    };
    return Promise.resolve(returnObj);
  } catch (error) {
    return Promise.reject(error);
  }
};

/**
 * returns the equipmentSchema data for the given filter -> type
 * @param {Object} filter
 */
const getEquipmentSchemaData = async filter => {
  try {
    const equipmentCategorization = await EquipmentCategorization.findOne(
      filter
    );
    if (!equipmentCategorization)
      throw new Error("Categorization not found for the filter");
    const { type } = equipmentCategorization;
    const equipmentSchemaData = await EquipmentSchema.findOne({
      type: type.value
    });
    if (!equipmentSchemaData)
      throw new Error("Schema not found for the filter -> type");
    return Promise.resolve(equipmentSchemaData);
  } catch (error) {
    return Promise.reject(error);
  }
};

/**
 * Get the Column Data for Equipment DataSource of Building Report
 */
const getEquipment = async (building, sheetdata) => {
  try {
    let buildingEquipmentFilter = {
      building: mongoose.Types.ObjectId(building._id)
    };
    const buildingEquipmentsData = await BuildingEquipment.find(
      buildingEquipmentFilter
    );
    let libraryEquipmentIds = [];
    let buildingEquipmentIds = [];
    let locationIds = [];
    let equipmentMapper = {};
    buildingEquipmentsData.forEach(buildingEquipment => {
      let libraryEquipmentId = buildingEquipment.libraryEquipment || "";
      let location = buildingEquipment.location || null;
      let configs = buildingEquipment.configs || [];
      let yearOfInstallation = configs.find(
        config => config.field === "yearOfInstallation"
      ) || { value: "" };
      let Quantity = buildingEquipment.quantity || "";
      equipmentMapper[buildingEquipment._id.toString()] = {
        equipmentId: libraryEquipmentId,
        locationId:
          (buildingEquipment.location &&
            buildingEquipment.location.toString()) ||
          "",
        yearOfInstallation: yearOfInstallation.value || "",
        images: buildingEquipment.images || [],
        configs: configs,
        Quantity: Quantity
      };
      buildingEquipmentIds.push(buildingEquipment._id.toString());
      libraryEquipmentIds.push(new mongoose.Types.ObjectId(libraryEquipmentId));
      if (location) locationIds.push(new mongoose.Types.ObjectId(location));
    });
    let equipmentFilterObject = {
      _id: {
        $in: libraryEquipmentIds
      }
    };
    const metaData = sheetdata.metaData;
    let equipmentSchemaFields = [];
    let equipmentSchemaConfigs = [];
    const equipmentShcemaFilter = {};
    if (metaData) {
      if (!metaData.category && !metaData.application && !metaData.technology) {
        return Promise.resolve({ columnData: [], data: [] });
      }
      if (metaData.category) {
        equipmentFilterObject.category = metaData.category;
        equipmentShcemaFilter["category.value"] = metaData.category;
      }
      if (metaData.application) {
        equipmentFilterObject.application = metaData.application;
        equipmentShcemaFilter["application.value"] = metaData.application;
      }
      if (metaData.technology) {
        equipmentFilterObject.technology = metaData.technology;
        equipmentShcemaFilter["technology.value"] = metaData.technology;
      }
    }
    const equipmentSchemaData = await getEquipmentSchemaData(
      equipmentShcemaFilter
    );
    equipmentSchemaConfigs = equipmentSchemaData.configs || [];
    equipmentSchemaConfigs = equipmentSchemaConfigs.filter(
      ec => ec.display === true
    );
    equipmentSchemaConfigs = _.orderBy(equipmentSchemaConfigs, "order", "asc");
    equipmentSchemaFields = equipmentSchemaData.fields || [];
    equipmentSchemaFields = equipmentSchemaFields.filter(
      ef => ef.display === true
    );
    equipmentSchemaFields = _.orderBy(equipmentSchemaFields, "order", "asc");
    const equipments = await Equipment.find(equipmentFilterObject);
    let locationFilterObject = {
      _id: {
        $in: locationIds
      }
    };
    const locations = await Location.find(locationFilterObject);
    const equipmentCategorization = await EquipmentCategorization.find();
    const columnHeadings = [
      ...equipmentSchemaFields.map(
        ef =>
          ef.fieldDisplayName +
          ((ef.units && `${(ef.units && " (" + ef.units + ")") || ""}`) || "")
      ),
      ...equipmentSchemaConfigs.map(
        ec =>
          ec.fieldDisplayName +
          ((ec.units && `${(ec.units && " (" + ec.units + ")") || ""}`) || "")
      )
    ];
    let columnData = [],
      data = [],
      imageColumns = [];
    columnHeadings.forEach(columnHeading => {
      columnData.push({ ColumnName: columnHeading });
    });
    buildingEquipmentIds.forEach(bEquipId => {
      const equipmentMapped = equipmentMapper[bEquipId];
      const equipId = equipmentMapped.equipmentId;
      const equipment = _.find(equipments, { _id: equipId });
      if (equipment) {
        let innerDataObj = {};
        let fields = equipment.fields || {};
        let configs = equipmentMapped.configs || [];
        let Quantity = equipmentMapped.Quantity || 0;
        const dataObj = {};
        equipmentSchemaFields.forEach(efield => {
          if (efield.display) {
            const field = efield.field;
            const displayName = efield.fieldDisplayName;
            const displayNameWithUnits =
              displayName +
              ((efield.units &&
                `${(efield.units && " (" + efield.units + ")") || ""}`) ||
                "");
            if (
              !columnData.find(
                col => col["ColumnName"] === displayNameWithUnits
              )
            )
              columnData.push({ ColumnName: displayNameWithUnits });
            let fieldValue = (field in fields && fields[field].value) || "";
            dataObj[displayNameWithUnits] = fieldValue;
          }
        });
        equipmentSchemaConfigs.forEach(econfig => {
          if (econfig.display) {
            const config = econfig.field;
            const displayName = econfig.fieldDisplayName;
            const displayNameWithUnits =
              displayName +
              ((econfig.units &&
                `${(econfig.units && " (" + econfig.units + ")") || ""}`) ||
                "");
            if (
              !columnData.find(
                col => col["ColumnName"] === displayNameWithUnits
              )
            )
              columnData.push({ ColumnName: displayNameWithUnits });
            const foundConfig = configs.find(cfg => cfg["field"] === config);
            let configValue = (foundConfig && foundConfig["value"]) || "";
            dataObj[displayNameWithUnits] = configValue;
          }
        });
        let locationId = equipmentMapped.locationId;
        let location = locations.find(
          location => location._id.toString() === locationId.toString()
        ) || { usetype: "", name: "" };
        let images = equipmentMapped.images || [];
        let application = (equipment && equipment.application) || "";
        application = equipmentCategorization.find(
          ec => ec.application["value"] === application
        );
        application =
          (application && application.application["displayName"]) || "";
        let technology = (equipment && equipment.technology) || "";
        technology = equipmentCategorization.find(
          ec => ec.technology["value"] === technology
        );
        technology = (technology && technology.technology["displayName"]) || "";
        let category = (equipment && equipment.category) || "";
        category = equipmentCategorization.find(
          ec => ec.category["value"] === category
        );
        category = (category && category.category["displayName"]) || "";
        dataObj["Application"] = application || "";
        if (!columnData.find(col => col["ColumnName"] === "Application"))
          columnData.push({ ColumnName: "Application" });
        dataObj["Category"] = category || "";
        if (!columnData.find(col => col["ColumnName"] === "Category"))
          columnData.push({ ColumnName: "Category" });
        dataObj["Fuel"] = equipment.fuel || "";
        if (!columnData.find(col => col["ColumnName"] === "Fuel"))
          columnData.push({ ColumnName: "Fuel" });
        dataObj["Location"] = `${location.usetype} ${location.name}` || "";
        dataObj["Location"] = capitalize(dataObj["Location"]);
        if (!columnData.find(col => col["ColumnName"] === "Location"))
          columnData.push({ ColumnName: "Location" });
        dataObj["Name"] = equipment.name || "";
        if (!columnData.find(col => col["ColumnName"] === "Name"))
          columnData.push({ ColumnName: "Name" });
        dataObj["Technology"] = technology || "";
        if (!columnData.find(col => col["ColumnName"] === "Technology"))
          columnData.push({ ColumnName: "Technology" });
        dataObj["Quantity"] = Quantity;
        if (!columnData.find(col => col["ColumnName"] === "Quantity"))
          columnData.push({ ColumnName: "Quantity" });
        images.forEach((image, index) => {
          let columnName = "Image" + (index + 1);
          dataObj[columnName] = image.toString();
          if (!imageColumns.find(imgCol => imgCol["ColumnName"] === columnName))
            imageColumns.push({ ColumnName: columnName });
        });
        columnData = _.uniq([...columnData, ...imageColumns]);
        for (let e = 0; e < columnData.length; e++) {
          innerDataObj[columnData[e].ColumnName] =
            dataObj[columnData[e].ColumnName];
        }
        data.push(innerDataObj);
      } else {
        const fields = [
          "Application",
          "Category",
          "Fuel",
          "Location",
          "Name",
          "Technology",
          "Quantity",
          "Images"
        ];
        fields.forEach(field => {
          if (!columnData.find(col => col.ColumnName === field))
            columnData.push({ ColumnName: field });
        });
      }
    });
    let returnObj = {
      columnData: columnData,
      data: data
    };
    return Promise.resolve(returnObj);
  } catch (error) {
    return Promise.reject(error);
  }
};

/**
 * returns utilityFilterObject for getting all utility data
 */
const getUtilityFilterObject = async (
  utilityFilterObject,
  metaData,
  currentYear = null
) => {
  try {
    let reportStartDate;
    let reportEndDate;
    const meterKeys = ["electric", "natural-gas", "water", "steam", "other"];
    const utilType = metaData.fuelType || "";
    if (metaData.year) {
      switch (metaData.year) {
        case "12":
          reportStartDate = moment()
            .utc()
            .subtract(12, "months")
            .startOf("month");
          reportEndDate = moment()
            .utc()
            .endOf("month");
          break;
        case "36":
          reportStartDate = moment()
            .utc()
            .subtract(36, "months")
            .startOf("month");
          reportEndDate = moment()
            .utc()
            .endOf("month");
          break;
        case "Custom": {
          let selectedStartMonth = metaData.selectedStartMonth;
          let selectedEndMonth = metaData.selectedEndMonth;
          let selectedStartYear = Number(metaData.selectedStartYear);
          let selectedEndYear = Number(metaData.selectedEndYear);
          reportStartDate = moment()
            .utc()
            .set({ year: selectedStartYear, month: selectedStartMonth })
            .startOf("month");
          reportEndDate = moment()
            .utc()
            .set({ year: selectedEndYear, month: selectedEndMonth })
            .endOf("month");
        }
      }
    } else if (currentYear) {
      // need to write the code.
      reportStartDate = moment()
        .utc()
        .set("year", currentYear)
        .startOf("year");
      reportEndDate = moment()
        .utc()
        .set("year", currentYear)
        .endOf("year");
    }
    if (metaData.data === "fuelType" && utilType) {
      utilityFilterObject["utilType"] = utilType;
      if (meterKeys.includes(utilType)) {
        if (reportStartDate) {
          utilityFilterObject["meterData.startDate"] = {
            $gte: reportStartDate.toISOString()
          };
        }
        if (reportEndDate) {
          utilityFilterObject["meterData.endDate"] = {
            $lte: reportEndDate.toISOString()
          };
        }
      } else {
        utilityFilterObject["deliveryData.deliveryDate"] = {
          $gte: reportStartDate.toISOString(),
          $lte: reportEndDate.toISOString()
        };
      }
    }
    return Promise.resolve({
      utilityFilterObject,
      reportStartDate,
      reportEndDate
    });
  } catch (error) {
    return Promise.reject(error);
  }
};

/**
 *  return the column data
 */
const getInnerObject = (utility, mData, columnData) => {
  let innerDataObj = {};
  let fuelType = utility.utilType || "";
  fuelType = fuelTypes[fuelType] || "";
  let unit = utility.units || "";
  let startDate =
    (mData.startDate && moment(mData.startDate)) ||
    (mData.deliveryDate && moment(mData.deliveryDate).startOf("month")) ||
    "";
  startDate = (startDate && startDate.format("MM-DD-YYYY")) || "";
  let endDate =
    (mData.endDate && moment(mData.endDate)) ||
    (mData.deliveryDate && moment(mData.deliveryDate).endOf("month")) ||
    "";
  endDate = (endDate && endDate.format("MM-DD-YYYY")) || "";
  let dataObj = {
    "Meter Name": utility.name || "",
    "Start Date": startDate,
    "End Date": endDate,
    "Total Usage": mData.totalUsage || mData.quantity || "",
    "Total Cost": mData.totalCost || "",
    "Fuel Type": fuelType || "",
    Demand: "demand" in mData ? mData.demand : "", // make 0 as valid {true}
    "Demand Cost": "demandCost" in mData ? mData.demandCost : "" // make 0 as valid {true}
  };
  dataObj = _.mapKeys(dataObj, (value, key) => {
    switch (key) {
      case "Total Usage":
        return `Total Usage${(unit && " (" + unit + ")") || ""}`;
      case "Total Cost":
        return "Total Cost ($)";
      case "Demand":
        return `Demand${(unit && " (" + unit + ")") || ""}`;
      case "Demand Cost":
        return "Demand Cost ($)";
      default:
        return key;
    }
  });
  for (let l = 0; l < columnData.length; l++) {
    innerDataObj[columnData[l].ColumnName] = dataObj[columnData[l].ColumnName];
  }
  return innerDataObj;
};

const getUtilitySummaryDetails = (utilities, options = null) => {
  try {
    const resultObject = {
      innerObjectArray: [],
      columnData: []
    };
    if (utilities && utilities.length === 0) return resultObject;
    options = options || {};
    let startDate = options.startDate || moment().startOf("year");
    let endDate = options.endDate || moment().endOf("year");
    let allColumns = options.allColumns || false;
    const utilitiesGroupedByFuelType = _.groupBy(utilities, "utilType");
    const groupedKeys =
      [
        "electric",
        "natural-gas",
        "water",
        "steam",
        "fuel-oil-2",
        "fuel-oil-4",
        "fuel-oil-5-6",
        "diesel",
        "other"
      ] || Object.keys(utilitiesGroupedByFuelType);
    const meterKeys = ["electric", "natural-gas", "water", "steam", "other"];
    const columnMapping = {
      totalCost: { columnName: "Total Cost", units: "$" },
      electric: { columnName: "Electricity", units: "kWh" },
      "natural-gas": { columnName: "Natural Gas", units: "therms" },
      water: { columnName: "Water", units: "kGal" },
      steam: { columnName: "Steam", units: "cubic ft" },
      "fuel-oil-2": { columnName: "Fuel Oil 2", units: "gallons" },
      "fuel-oil-4": { columnName: "Fuel Oil 4", units: "gallons" },
      "fuel-oil-5-6": { columnName: "Fuel Oil 5 & 6", units: "gallons" },
      diesel: { columnName: "Diesel", units: "gallons" },
      other: { columnName: "Other", units: "" }
    };
    const columnsCovered = [];
    const columnData = [
      { ColumnName: "Year" },
      { ColumnName: "Total Cost ($)" }
    ];
    const startAndEndYearlyDates = getYearlyStartAndEndDates(
      startDate,
      endDate
    );
    startAndEndYearlyDates.forEach(dates => {
      const innerObject = {
        Year: getYearRange(dates.start, dates.end),
        "Total Cost ($)": 0
      };
      groupedKeys.forEach(gkey => {
        columnsCovered.push(gkey);
        let utilData = utilitiesGroupedByFuelType[gkey];
        let column = columnMapping[gkey];
        let units =
          (utilData && utilData.length > 0 && utilData[0].units) ||
          (column && column.units) ||
          "";
        let columnName = "";
        columnName =
          (column &&
            column.columnName + `${(units && " (" + units + ")") || ""}`) ||
          "";
        columnData.push({ ColumnName: columnName });
        if (utilData && utilData.length > 0) {
          if (meterKeys.includes(gkey)) {
            let meterData = utilData.map(mdata => mdata.meterData);
            meterData = _.flatten(meterData);
            innerObject[columnName] = 0;
            if (dates.start && dates.end) {
              meterData.forEach(mData => {
                if (
                  moment(mData.startDate).isSameOrAfter(
                    moment(dates.start),
                    "month"
                  ) &&
                  moment(mData.endDate).isSameOrBefore(
                    moment(dates.end),
                    "month"
                  )
                ) {
                  // calculating the total cost and usage for meterreadings between the start and end dates.
                  innerObject["Total Cost ($)"] =
                    innerObject["Total Cost ($)"] + mData.totalCost;
                  if (gkey === "electric") {
                    innerObject["Total Cost ($)"] += mData.demandCost;
                  }
                  columnsCovered.push("totalCost");
                  innerObject[columnName] += mData.totalUsage;
                }
              });
            } else {
              // if not given start and enddate, calculate all the meterdata
              innerObject["Total Cost ($)"] = meterData.reduce(
                (accumulator, currentValue) => {
                  return (
                    accumulator +
                    ((currentValue.totalCost &&
                      Number(currentValue.totalCost)) ||
                      0)
                  );
                },
                innerObject["Total Cost ($)"]
              );
              columnsCovered.push("totalCost");
              innerObject[columnName] = meterData.reduce(
                (accumulator, currentValue) => {
                  return (
                    accumulator +
                    ((currentValue.totalUsage &&
                      Number(currentValue.totalUsage)) ||
                      0)
                  );
                },
                0
              );
            }
          } else {
            let deliveryData = utilData.map(dData => dData.deliveryData);
            deliveryData = _.flatten(deliveryData);
            innerObject[columnName] = 0;
            if (dates.start && dates.end) {
              deliveryData.forEach(dData => {
                if (
                  dData &&
                  moment(dData.deliveryDate).isSameOrAfter(
                    moment(dates.start),
                    "month"
                  ) &&
                  moment(dData.deliveryDate).isSameOrBefore(
                    moment(dates.end),
                    "month"
                  )
                ) {
                  // calculating the total cost and usage for meterreadings between the start and end dates.
                  innerObject["Total Cost ($)"] =
                    innerObject["Total Cost ($)"] + dData.totalCost;
                  columnsCovered.push("totalCost");
                  innerObject[columnName] += dData.quantity;
                }
              });
            } else {
              // if not given start and enddate, calculate all the meterdata
              innerObject["Total Cost ($)"] = deliveryData.reduce(
                (accumulator, currentValue) => {
                  return (
                    accumulator +
                    ((currentValue.totalCost &&
                      Number(currentValue.totalCost)) ||
                      0)
                  );
                },
                innerObject["Total Cost ($)"]
              );
              columnsCovered.push("totalCost");
              innerObject[columnName] = deliveryData.reduce(
                (accumulator, currentValue) => {
                  return (
                    accumulator +
                    ((currentValue.quantity && Number(currentValue.quantity)) ||
                      0)
                  );
                },
                0
              );
            }
          }
        }
      });
      resultObject["innerObjectArray"].push(innerObject);
    });
    if (allColumns) {
      let extraColumns = _.omit(columnMapping, columnsCovered);
      for (let col in extraColumns) {
        const column = extraColumns[col];
        const ColumnName =
          (column &&
            column.columnName +
              `${(column.units && " (" + column.units + ")") || ""}`) ||
          "";
        if (ColumnName) columnData.push({ ColumnName });
      }
    }
    resultObject["columnData"] = [
      ...new Set(columnData.map(cd => cd.ColumnName))
    ].map(cn => ({ ColumnName: cn }));
    return resultObject;
  } catch (error) {
    return new Error(error);
  }
};

/**
 * Get the Column Data for Utility DataSource of Building Report
 */
const getUtilities = async (building, sheetdata) => {
  try {
    let utilityIds = building.utilityIds || [];
    let reportStartDate;
    let reportEndDate;
    utilityIds = utilityIds.map(
      utilityId => new mongoose.Types.ObjectId(utilityId)
    );
    let utilityFilterObject = {
      _id: {
        $in: utilityIds
      }
    };
    let metaData = sheetdata.metaData;
    let dataType = "summary";
    if (metaData) {
      dataType = metaData.data || "summary";
      let filterObject = await getUtilityFilterObject(
        utilityFilterObject,
        metaData
      );
      utilityFilterObject = filterObject.utilityFilterObject;
      reportStartDate = filterObject.reportStartDate;
      reportEndDate = filterObject.reportEndDate;
    }
    const utilities = await Utility.find(utilityFilterObject).exec();
    const columnHeadings = sheetdata.columnHeadings;
    let columnData = [],
      data = [];
    const meterKeys = ["electric", "natural-gas", "water", "steam", "other"];
    switch (dataType) {
      case "summary": {
        const options = {
          allColumns: true,
          startDate: reportStartDate,
          endDate: reportEndDate
        };
        const summaryDetails = getUtilitySummaryDetails(utilities, options);
        const innerObject = summaryDetails && summaryDetails.innerObjectArray;
        columnData = summaryDetails && summaryDetails.columnData;
        data.push(innerObject);
        data = _.flatten(data);
        break;
      }
      case "fuelType": {
        columnHeadings.forEach(columnHeading => {
          columnData.push({ ColumnName: columnHeading.name });
        });
        let unit = "";
        utilities.forEach(utility => {
          unit = utility.units || "";
          columnData = getUtilColumnsWithUnits(columnData, unit);
          const fuelType = utility.utilType || "";
          if (meterKeys.includes(fuelType)) {
            const meterData = utility.meterData || [];
            meterData.forEach(mData => {
              if (reportStartDate && reportEndDate) {
                if (
                  moment(mData.startDate).isSameOrAfter(
                    moment(reportStartDate),
                    "month"
                  ) &&
                  moment(mData.endDate).isSameOrBefore(
                    moment(reportEndDate),
                    "month"
                  )
                ) {
                  // call method to get the column data
                  let innerDataObj = getInnerObject(utility, mData, columnData);
                  data.push(innerDataObj);
                }
              } else {
                // method to get the column data
                let innerDataObj = getInnerObject(utility, mData, columnData);
                data.push(innerDataObj);
              }
            });
          } else {
            const deliveryData = utility.deliveryData || [];
            deliveryData.forEach(dData => {
              if (reportStartDate && reportEndDate) {
                if (
                  moment(dData.deliveryDate).isSameOrAfter(
                    reportStartDate,
                    "month"
                  ) &&
                  moment(dData.deliveryDate).isSameOrBefore(
                    moment(reportEndDate),
                    "month"
                  )
                ) {
                  // call method to get the column data
                  let innerDataObj = getInnerObject(utility, dData, columnData);
                  data.push(innerDataObj);
                }
              } else {
                // method to get the column data
                let innerDataObj = getInnerObject(utility, dData, columnData);
                data.push(innerDataObj);
              }
            });
          }
        });
        if (utilities.length === 0) {
          columnData = getUtilColumnsWithUnits(columnData, unit);
        }
      }
    }
    let returnObj = {
      columnData: columnData,
      data: data
    };
    return Promise.resolve(returnObj);
  } catch (error) {
    return Promise.reject(error);
  }
};

/**
 * Returns the column headings with units for utils by fuelType.
 * @param {Array} data
 * @param {String} unit
 */
const getUtilColumnsWithUnits = (data, unit) => {
  return data.map(cd => {
    switch (cd["ColumnName"]) {
      case "Total Usage":
        return {
          ColumnName: `Total Usage${(unit && " (" + unit + ")") || ""}`
        };
      case "Total Cost":
        return { ColumnName: "Total Cost ($)" };
      case "Demand":
        return { ColumnName: `Demand${(unit && " (" + unit + ")") || ""}` };
      case "Demand Cost":
        return { ColumnName: "Demand Cost ($)" };
      default:
        return cd;
    }
  });
};

/**
 * Get the column data for Building Report
 */
const getColumnData = async (building, sheetdata, year) => {
  switch (sheetdata.datasource) {
    case "Overview & Property": {
      let overviewProperty = await getOverviewAndProperty(
        building,
        sheetdata,
        year
      );
      return overviewProperty;
    }
    case "Systems": {
      let systems = await getSystems(building, sheetdata);
      return systems;
    }
    case "Construction": {
      let constructions = await getConstructions(building, sheetdata);
      return constructions;
    }
    case "Locations": {
      let locations = await getLocations(building, sheetdata);
      return locations;
    }
    case "Equipment": {
      let equipments = await getEquipment(building, sheetdata);
      return equipments;
    }
    case "Utilities": {
      let utilities = await getUtilities(building, sheetdata, year);
      return utilities;
    }
    default:
      return new Error("Invalid Data source Present In Template");
  }
};

/**
 * Get the data for Building Report
 */
const getBuildingData = async (building, spreadsheetTemplate, year) => {
  try {
    let reportData = [];
    let sheets = spreadsheetTemplate.sheets;
    for (let i = 0; i < sheets.length; i++) {
      let dataObj = {
        DataSource: sheets[i].datasource,
        SheetName: sheets[i].name,
        ColumnNames: [],
        Data: []
      };
      let result = await getColumnData(building, sheets[i], year);
      dataObj.ColumnNames = result.columnData;
      dataObj.Data = result.data;
      reportData.push(dataObj);
    }
    let resultObj = {
      BuildingId: building._id,
      BuildingReportData: {
        ReportData: reportData
      },
      ProjectReportData: {}
    };
    return Promise.resolve(resultObj);
  } catch (error) {
    return Promise.reject(error);
  }
};

const getProjectReportingData = async (
  project,
  columnData,
  building,
  fuelTypes,
  proj
) => {
  let buildingId = building && building._id;
  buildingId = buildingId.toString();
  let innerDataObj = {};
  const runResults = project.runResults && project.runResults[buildingId];
  const initialValues = project.initialValues || {};
  const simplePayback = runResults && getSimplePayback(runResults);
  const fuelType = project.fuel || "electric";
  if (!fuelTypes.includes(fuelType)) fuelTypes.push(fuelType);
  let location = "";
  if (project.locations && project.locations[0]) {
    let locFilterObj = { _id: project.locations[0] };
    const result = await Location.findOne(locFilterObj);
    location = result.name;
  }

  let dataObj = {
    Application: project.project_application || "",
    Technology: project.project_technology || "",
    Location: location,
    Name: project.displayName,
    Comments: initialValues.comment || "",
    Category: proj !== "project" ? proj || "" : "",
    Description: project.description || "",
    "Calculation Source": project.source || "",
    "Material Cost ($)": initialValues.material_cost || "",
    "Labor Cost ($)": initialValues.labor_cost || "",
    "Design Fees ($)": initialValues.design_fees || "",
    "Construction Management": initialValues.construction_management || "",
    "Maintenance Savings ($)": initialValues.maintenance_savings || "",
    "Measure Cost ($)": (initialValues && getProjectCost(initialValues)) || "",
    "Incentive ($)": (runResults && getIncentive(runResults)) || "",
    "Annual Cost Savings ($)":
      (runResults && getAnnualSavings(runResults)) || "",
    "Energy Savings (kBtu)": getTotalEnergySavings(
      calculateEnergySavings(project, building._id, "electric"),
      calculateEnergySavings(project, building._id, "gas")
    ),
    "Electric Savings (kWh)":
      calculateEnergySavings(project, building._id, "electric") || "",
    "Gas Savings (therms)":
      calculateEnergySavings(project, building._id, "gas") || "",
    "Water Savings (kGal)":
      calculateEnergySavings(project, building._id, "water") || "",
    "ROI (%)": calculateROI(project, building._id) || "",
    "Simple Payback (yrs)": (simplePayback > 0 && simplePayback) || 0,
    "NPV ($)": (runResults && getNPV(runResults)) || "",
    SIR: (runResults && getSIR(runResults)) || "",
    "GHG Savings (mtCO2e)": (runResults && getGHGSavings(runResults)) || "",
    "GHG Cost ($/mtCO2e)": (runResults && getGHGCost(runResults)) || "",
    "Effective Useful Life (years)": (runResults && getEUL(runResults)) || "",
    "Total Financing/Funding ($)":
      (project &&
        project.initialValues &&
        project.initialValues.project_total_financing_funding) ||
      "",
    "Materials Unit Cost ($/unit)":
      (project &&
        project.initialValues &&
        project.initialValues.material_unit_cost) ||
      "",
    "Material Quantity":
      (project &&
        project.initialValues &&
        project.initialValues.material_quantity) ||
      "",
    "Total Materials Cost ($)":
      (project &&
        project.initialValues &&
        project.initialValues.material_cost) ||
      "",
    "Labor Rate ($/hr)":
      (project && project.initialValues && project.initialValues.labor_rate) ||
      "",
    "Hours (hrs)":
      (project && project.initialValues && project.initialValues.hours) || "",
    "Labor/Unit Cost ($/unit)":
      (project &&
        project.initialValues &&
        project.initialValues.labor_unit_cost) ||
      "",
    "Labor Quantity":
      (project &&
        project.initialValues &&
        project.initialValues.labor_quantity) ||
      "",
    "Total Labor Cost ($)":
      (project &&
        project.initialValues &&
        project.initialValues.total_labor_cost) ||
      "",
    "Site-Specific Installation Factors ($)":
      (project &&
        project.initialValues &&
        project.initialValues.installation_factors) ||
      "",
    "Utility Service Upgrades ($)":
      (project &&
        project.initialValues &&
        project.initialValues.utility_service_upgrades) ||
      "",
    "Temporary Services ($)":
      (project &&
        project.initialValues &&
        project.initialValues.temporary_services) ||
      "",
    "Environment Unit Cost ($)":
      (project &&
        project.initialValues &&
        project.initialValues.environment_unit_cost) ||
      "",
    "Environment Quantity":
      (project &&
        project.initialValues &&
        project.initialValues.environment_quantity) ||
      "",
    "Total Environment Unit Cost ($)":
      (project &&
        project.initialValues &&
        project.initialValues.total_environment_unit_cost) ||
      "",
    "Contingency ($)":
      (project && project.initialValues && project.initialValues.contingency) ||
      "",
    "Profit ($)":
      (project && project.initialValues && project.initialValues.profit) || "",
    "Taxes ($)":
      (project && project.initialValues && project.initialValues.taxes) || "",
    "Other Hard Costs ($)":
      (project &&
        project.initialValues &&
        project.initialValues.other_hard_cost) ||
      "",
    "Total Hard Costs ($)":
      (project &&
        project.initialValues &&
        project.initialValues.total_hard_cost) ||
      "",
    "Pre-Design ($)":
      (project && project.initialValues && project.initialValues.pre_design) ||
      "",
    "Permits & Inspections ($)":
      (project && project.initialValues && project.initialValues.permits) || "",
    "Material Handling ($)":
      (project &&
        project.initialValues &&
        project.initialValues.material_handling) ||
      "",
    "Test and Balancing ($)":
      (project &&
        project.initialValues &&
        project.initialValues.test_and_balancing) ||
      "",
    "Commissioning ($)":
      (project &&
        project.initialValues &&
        project.initialValues.commissioning) ||
      "",
    "Program Fees ($)":
      (project &&
        project.initialValues &&
        project.initialValues.program_fees) ||
      "",
    "Overhead ($)":
      (project && project.initialValues && project.initialValues.overhead) ||
      "",
    "Other Soft Costs ($)":
      (project &&
        project.initialValues &&
        project.initialValues.other_soft_cost) ||
      "",
    "Total Soft Costs ($)":
      (project &&
        project.initialValues &&
        project.initialValues.total_soft_cost) ||
      "",
    "Financing Cost Share ($)":
      (project &&
        project.initialValues &&
        project.initialValues.finance_cost_share) ||
      "",
    "Financing Cost Share Rate (%)":
      (project &&
        project.initialValues &&
        project.initialValues.finance_cost_share_rate) ||
      "",
    "Financing ($)":
      (project &&
        project.initialValues &&
        project.initialValues.finance_finance) ||
      "",
    "Financing Rate (%)":
      (project &&
        project.initialValues &&
        project.initialValues.finance_finance_rate) ||
      "",
    "Fund Cost Share ($)":
      (project &&
        project.initialValues &&
        project.initialValues.fund_cost_share) ||
      "",
    "Fund Cost Share Rate (%)":
      (project &&
        project.initialValues &&
        project.initialValues.fund_cost_share_rate) ||
      "",
    "Fund Finance ($)":
      (project &&
        project.initialValues &&
        project.initialValues.fund_finance) ||
      "",
    "Fund Finance Rate (%)":
      (project &&
        project.initialValues &&
        project.initialValues.fund_finance_rate) ||
      ""
  };

  for (let j = 0; j < columnData.length; j++) {
    innerDataObj[columnData[j].ColumnName] = dataObj[columnData[j].ColumnName];
  }

  /**
   * Ordering the fields, first comes existing true fields, then replacement true ones.
   * where existing and replacement wont be true for any single field at same time.
   */
  let fields = project.fields;
  const hideOptions = [
    "hvac_type",
    "xcelLEDLighting_rebate_type",
    "dlc_qualified",
    "energy_star_qualified",
    "xcelLEDLighting_rebate",
    "localOverrideDefaultBlendedElectricRate",
    "localBlendedElectricRate",
    "localOverrideDefaultElectricDemandRate",
    "localElectricDemandRate",
    "localOverrideDefaultElectricUsage",
    "localElectricUsageRate",
    "existing_equipment__v2",
    "retrofit_equipment__v2"
  ];
  if (fields) {
    fields = fields.filter(item => hideOptions.indexOf(item.name) === -1);
    const existingFields = _.groupBy(fields, "existing")["true"] || [];
    const replacementFields = _.groupBy(fields, "replacement")["true"] || [];
    existingFields.forEach(ef => {
      let label = ef.label || ef.name;
      let convertData = ef;
      if (project.name.startsWith("xcel")) {
        convertData = convertNameLabelForXcelMeasure(ef);
      }
      label = convertData.label;
      if (!columnData.some(col => col.ColumnName === label)) {
        columnData.push({ ColumnName: label });
      }
      innerDataObj[label] = initialValues[ef.name];
      if (label === "Annual Op. Hours") {
        innerDataObj[label] =
          ledLightingUtils.calculateAnnualHours(project) || "-";
      } else if (label === "Fixture Quantity") {
        innerDataObj[label] =
          (initialValues && initialValues.qty_existing_equip) || "-";
      } else if (label === "Existing Fixture Type") {
        innerDataObj[label] =
          (initialValues && initialValues.existing_equipment_name) || "-";
      } else if (label === "Existing Fixture Wattage (Watts)") {
        innerDataObj[label] =
          (initialValues && initialValues.existing_equipment_wattage) || "-";
      }
    });
    replacementFields.forEach(rf => {
      let label = rf.label || rf.name;
      let convertData = rf;
      if (project.name.startsWith("xcel")) {
        convertData = convertNameLabelForXcelMeasure(rf);
      }
      label = convertData.label;
      if (!columnData.some(col => col.ColumnName === label)) {
        columnData.push({ ColumnName: label });
      }
      innerDataObj[label] = initialValues[rf.name];
      if (label === "Proposed Fixture Type") {
        innerDataObj[label] =
          (initialValues && initialValues.xcelLEDLighting_replace_name) || "-";
      } else if (label === "Proposed Fixture Wattage (Watts)") {
        innerDataObj[label] =
          (initialValues && initialValues.xcelLEDLighting_replace_wattage) ||
          "-";
      }
    });
  }

  if (project.initialValues && project.initialValues.formulas) {
    try {
      let formulas = project.initialValues.formulas;
      for (let fuel in formulas) {
        if (!formulas[fuel]) continue;
        let formula = formulas[fuel];
        let cn = `Source Formula (${formula.fuel})`;
        innerDataObj[cn] = formula.originalFormula;
        if (!columnData.some(col => col.ColumnName === cn)) {
          columnData.push({ ColumnName: cn });
        }
        cn = `Applied Formula (${formula.fuel})`;
        innerDataObj[cn] = formula.completedFormula;
        if (!columnData.some(col => col.ColumnName === cn)) {
          columnData.push({ ColumnName: cn });
        }
      }
    } catch (e) {
      console.error("Could not add formulas to spreadsheet!", e);
    }
  }

  /**
   *  Images: need to show each image in a different column,
   *  all the projects in a group must have same number of image columns, as the highest images project.
   *  while showing nothing for those projects with no images in image columns
   */
  let imageColumns = [];
  if (project.imageUrls) {
    for (let x = 0; x < project.imageUrls.length; x++) {
      let columnName = "Image" + (x + 1);
      if (!imageColumns.includes(columnName)) {
        imageColumns.push(columnName);
      }
      innerDataObj[columnName] = project.imageUrls[x];
    }
  }
  return innerDataObj;
};

const getTotalProjectReportingData = async (
  project,
  columnData,
  building,
  fuelTypes,
  proj
) => {
  let buildingId = building && building._id;
  buildingId = buildingId.toString();
  let innerDataObj = {};
  const runResults = project.runResults && project.runResults[building._id];
  const initialValues = project.initialValues || {};
  const fuelType = project.fuel || "electric";
  if (!fuelTypes.includes(fuelType)) fuelTypes.push(fuelType);
  let location = "";
  if (project.locations && project.locations[0]) {
    let locFilterObj = { _id: project.locations[0] };
    const result = await Location.findOne(locFilterObj);
    location = result.name;
  }

  let dataObj = {
    Application: project.project_application || "",
    Technology: project.project_technology || "",
    Location: location,
    Name: project.displayName,
    Comments: initialValues.comment || "",
    Category: proj !== "project" ? proj || "" : "",
    Description: project.description || "",
    "Labor Cost ($)": initialValues.labor_cost || "",
    "Design Fees ($)": initialValues.design_fees || "",
    "Maintenance Savings ($)": getTotalMaintenanceSavings(project) || "",
    "Measure Cost ($)": getTotalProjectCost(project) || "",
    "Incentive ($)": getTotalIncentive(project, buildingId) || "",
    "Annual Cost Savings ($)": getTotalAnnualSavings(project, buildingId) || "",
    "Energy Savings (kBtu)": getTotalTotalEnergySavings(project, buildingId),
    "Electric Savings (kWh)":
      calculateTotalEnergySavings(project, building._id, "electric") || "",
    "Gas Savings (therms)":
      calculateTotalEnergySavings(project, building._id, "gas") || "",
    "Water Savings (kGal)":
      calculateTotalEnergySavings(project, building._id, "water") || "",
    "ROI (%)": calculateTotalROI(project, building._id) || "",
    "Simple Payback (yrs)": getTotalSimplePayback(project, building._id) || "",
    "NPV ($)": getTotalNPV(project, building._id) || "",
    SIR: getTotalSIR(project, building._id) || "",
    "GHG Savings (mtCO2e)": getTotalGHGSavings(project, building._id) || "",
    "GHG Cost ($/mtCO2e)": getTotalGHGCost(project, building._id) || "",
    "Effective Useful Life (years)": getTotalEUL(project, building._id) || "",
    "Total Financing/Funding ($)": getTotalFinancialFunding(project) || "",
    "Materials Unit Cost ($/unit)": getProjectFinancialValues(
      project,
      "material_unit_cost"
    ),
    "Material Quantity": getProjectFinancialValues(
      project,
      "material_quantity"
    ),
    "Total Materials Cost ($)": getProjectFinancialValues(
      project,
      "material_cost"
    ),
    "Labor Rate ($/hr)": getProjectFinancialValues(project, "labor_rate"),
    "Hours (hrs)": getProjectFinancialValues(project, "hours"),
    "Labor/Unit Cost ($/unit)": getProjectFinancialValues(
      project,
      "labor_unit_cost"
    ),
    "Labor Quantity": getProjectFinancialValues(project, "labor_quantity"),
    "Total Labor Cost ($)": getProjectFinancialValues(
      project,
      "total_labor_cost"
    ),
    "Site-Specific Installation Factors ($)": getProjectFinancialValues(
      project,
      "installation_factors"
    ),
    "Utility Service Upgrades ($)":
      getProjectFinancialValues(project, "utility_service_upgrades") ||
      "Varies",
    "Temporary Services ($)": getProjectFinancialValues(
      project,
      "temporary_services"
    ),
    "Environment Unit Cost ($)": getProjectFinancialValues(
      project,
      "environment_unit_cost"
    ),
    "Environment Quantity": getProjectFinancialValues(
      project,
      "environment_quantity"
    ),
    "Total Environment Unit Cost ($)":
      getProjectFinancialValues(project, "total_environment_unit_cost") ||
      "Varies",
    "Contingency ($)": getProjectFinancialValues(project, "contingency"),
    "Profit ($)": getProjectFinancialValues(project, "profit"),
    "Taxes ($)": getProjectFinancialValues(project, "taxes"),
    "Other Hard Costs ($)": getProjectFinancialValues(
      project,
      "other_hard_cost"
    ),
    "Total Hard Costs ($)": getProjectFinancialValues(
      project,
      "total_hard_cost"
    ),
    "Pre-Design ($)": getProjectFinancialValues(project, "pre_design"),
    "Permits & Inspections ($)": getProjectFinancialValues(project, "permits"),
    "Material Handling ($)": getProjectFinancialValues(
      project,
      "material_handling"
    ),
    "Test and Balancing ($)": getProjectFinancialValues(
      project,
      "test_and_balancing"
    ),
    "Commissioning ($)": getProjectFinancialValues(project, "commissioning"),
    "Program Fees ($)": getProjectFinancialValues(project, "program_fees"),
    "Overhead ($)": getProjectFinancialValues(project, "overhead"),
    "Other Soft Costs ($)": getProjectFinancialValues(
      project,
      "other_soft_cost"
    ),
    "Total Soft Costs ($)": getProjectFinancialValues(
      project,
      "total_soft_cost"
    ),
    "Financing Cost Share ($)": getProjectFinancialValues(
      project,
      "finance_cost_share"
    ),
    "Financing Cost Share Rate (%)": getProjectFinancialValues(
      project,
      "finance_cost_share_rate"
    ),
    "Financing ($)": getProjectFinancialValues(project, "finance_finance"),
    "Financing Rate (%)": getProjectFinancialValues(
      project,
      "finance_finance_rate"
    ),
    "Fund Cost Share ($)": getProjectFinancialValues(
      project,
      "fund_cost_share"
    ),
    "Fund Cost Share Rate (%)": getProjectFinancialValues(
      project,
      "fund_cost_share_rate"
    ),
    "Fund Finance ($)": getProjectFinancialValues(project, "fund_finance"),
    "Fund Finance Rate (%)": getProjectFinancialValues(
      project,
      "fund_finance_rate"
    )
  };

  for (let j = 0; j < columnData.length; j++) {
    innerDataObj[columnData[j].ColumnName] = dataObj[columnData[j].ColumnName];
  }

  /**
   * Ordering the fields, first comes existing true fields, then replacement true ones.
   * where existing and replacement wont be true for any single field at same time.
   */
  let fields = project.fields;
  const hideOptions = [
    "hvac_type",
    "xcelLEDLighting_rebate_type",
    "dlc_qualified",
    "energy_star_qualified",
    "xcelLEDLighting_rebate",
    "localOverrideDefaultBlendedElectricRate",
    "localBlendedElectricRate",
    "localOverrideDefaultElectricDemandRate",
    "localElectricDemandRate",
    "localOverrideDefaultElectricUsage",
    "localElectricUsageRate",
    "existing_equipment__v2",
    "retrofit_equipment__v2"
  ];
  if (fields) {
    fields = fields.filter(item => hideOptions.indexOf(item.name) === -1);
    const existingFields = _.groupBy(fields, "existing")["true"] || [];
    const replacementFields = _.groupBy(fields, "replacement")["true"] || [];
    existingFields.forEach(ef => {
      let label = ef.label || ef.name;
      let convertData = ef;
      if (project.name.startsWith("xcel")) {
        convertData = convertNameLabelForXcelMeasure(ef);
      }
      label = convertData.label;
      if (!columnData.some(col => col.ColumnName === label)) {
        columnData.push({ ColumnName: label });
      }
      innerDataObj[label] = getProjectFinancialValues(project, ef.name);
    });
    replacementFields.forEach(rf => {
      let label = rf.label || rf.name;
      let convertData = rf;
      if (project.name.startsWith("xcel")) {
        convertData = convertNameLabelForXcelMeasure(rf);
      }
      label = convertData.label;
      if (!columnData.some(col => col.ColumnName === label)) {
        columnData.push({ ColumnName: label });
      }
      innerDataObj[label] = getProjectFinancialValues(project, rf.name);
    });
  }

  if (project.initialValues && project.initialValues.formulas) {
    try {
      let formulas = project.initialValues.formulas;
      for (let fuel in formulas) {
        if (!formulas[fuel]) continue;
        let formula = formulas[fuel];
        let cn = `Source Formula (${formula.fuel})`;
        innerDataObj[cn] = formula.originalFormula;
        if (!columnData.some(col => col.ColumnName === cn)) {
          columnData.push({ ColumnName: cn });
        }
        cn = `Applied Formula (${formula.fuel})`;
        innerDataObj[cn] = formula.completedFormula;
        if (!columnData.some(col => col.ColumnName === cn)) {
          columnData.push({ ColumnName: cn });
        }
      }
    } catch (e) {
      console.error("Could not add formulas to spreadsheet!", e);
    }
  }

  /**
   *  Images: need to show each image in a different column,
   *  all the projects in a group must have same number of image columns, as the highest images project.
   *  while showing nothing for those projects with no images in image columns
   */
  let imageColumns = [];
  if (project.imageUrls) {
    for (let x = 0; x < project.imageUrls.length; x++) {
      let columnName = "Image" + (x + 1);
      if (!imageColumns.includes(columnName)) {
        imageColumns.push(columnName);
      }
      innerDataObj[columnName] = project.imageUrls[x];
    }
  }
  return innerDataObj;
};
/**
 * Get the column data for Project Report
 */
const getProjectColumnData = async (building, sheetdata) => {
  try {
    let projectIds = building.projectIds || [];
    let measurePackageMeasureIds = building.measurePackageMeasureIds || [];
    projectIds = projectIds.map(pIds => pIds.toString());
    measurePackageMeasureIds = measurePackageMeasureIds.map(pIds =>
      pIds.toString()
    );
    projectIds = projectIds.filter(
      pid => measurePackageMeasureIds.indexOf(pid) === -1
    );
    projectIds = [...new Set(projectIds)];
    projectIds = projectIds.map(pIds => new mongoose.Types.ObjectId(pIds));
    let filterObj = {
      _id: {
        $in: projectIds
      }
    };
    const metaData = sheetdata.metaData;
    if (metaData) {
      if (metaData.category && metaData.category !== "all") {
        filterObj.project_category = metaData.category;
      }
      if (metaData.application && metaData.application !== "all") {
        filterObj.project_application = metaData.application;
      }
      if (metaData.technology && metaData.technology !== "all") {
        filterObj.project_technology = metaData.technology;
      }
    }
    const getProjects = await Project.find(filterObj)
      .populate("projects")
      .lean();
    // Required columnHeadings as constants, that need to be shown in the downloaded report. (for 1.4 beta only)
    const columnHeadings = [
      "Application",
      "Technology",
      "Location",
      "Name",
      "Comments",
      "Category",
      "Description",
      "Calculation Source",
      "Material Cost ($)",
      "Labor Cost ($)",
      "Design Fees ($)",
      "Construction Management",
      "Maintenance Savings ($)",
      "Measure Cost ($)",
      "Incentive ($)",
      "Annual Cost Savings ($)",
      "Energy Savings (kBtu)",
      "Electric Savings (kWh)",
      "Gas Savings (therms)",
      "Water Savings (kGal)",
      "ROI (%)",
      "Simple Payback (yrs)",
      "NPV ($)",
      "SIR",
      "GHG Savings (mtCO2e)",
      "GHG Cost ($/mtCO2e)",
      "Effective Useful Life (years)",
      "Total Financing/Funding ($)",
      "Materials Unit Cost ($/unit)",
      "Material Quantity",
      "Total Materials Cost ($)",
      "Labor Rate ($/hr)",
      "Hours (hrs)",
      "Total Labor Cost ($)",
      "Site-Specific Installation Factors ($)",
      "Utility Service Upgrades ($)",
      "Temporary Services ($)",
      "Environment Unit Cost ($)",
      "Environment Quantity",
      "Quantity",
      "Total Environment Unit Cost ($)",
      "Contingency ($)",
      "Profit ($)",
      "Taxes ($)",
      "Other Hard Costs ($)",
      "Total Hard Costs ($)",
      "Pre-Design ($)",
      "Permits & Inspections ($)",
      "Material Handling ($)",
      "Test and Balancing ($)",
      "Commissioning ($)",
      "Program Fees ($)",
      "Overhead ($)",
      "Other Soft Costs ($)",
      "Total Soft Costs ($)",
      "Financing Cost Share ($)",
      "Financing Cost Share Rate (%)",
      "Financing ($)",
      "Financing Rate (%)",
      "Fund Cost Share ($)",
      "Fund Cost Share Rate (%)",
      "Fund Finance ($)",
      "Fund Finance Rate (%)"
    ];
    let returnData = [];
    let projectCategoryData = _.mapValues(
      _.groupBy(getProjects, "project_category"),
      plist => plist.map(proj => _.omit(proj, "project_category"))
    );
    if (Object.keys(projectCategoryData).length === 0) {
      projectCategoryData = {
        project: [{}]
      };
    }
    for (let proj in projectCategoryData) {
      let projects = projectCategoryData[proj];
      let projectData = {
        SheetName: proj || "",
        ColumnNames: [],
        Data: []
      };
      let columnData = [],
        data = [],
        imageColumns = [],
        fuelTypes = [];
      columnData = columnHeadings.map(ch => ({ ColumnName: ch }));

      const subMeasureOption =
        (metaData && metaData.subMeasureOption) || "Summary";
      for (let i = 0; i < projects.length; i++) {
        const isSubMeasure = hasSubMeasure(projects[i]);
        if (isSubMeasure) {
          if (subMeasureOption !== "Summary") {
            for (let equipmentId of (projects && projects[i].equipments) ||
              []) {
              let projectId =
                (projects[i] &&
                  projects[i].equipmentToProjectMap &&
                  projects[i].equipmentToProjectMap[equipmentId]) ||
                null;
              let project = projects[i].projects.find(
                proj => proj._id.toString() === projectId
              );
              if (project) {
                let innerDataObj = await getProjectReportingData(
                  project,
                  columnData,
                  building,
                  fuelTypes,
                  proj
                );
                let equipment = await Equipment.findById(equipmentId);
                let equipmentName = "";
                if (equipment) {
                  equipmentName = equipment && equipment.name;
                } else {
                  const equipmentToEquipmentNameMap =
                    (projects[i] && projects[i].equipmentToEquipmentNameMap) ||
                    {};
                  equipmentName =
                    equipmentToEquipmentNameMap[equipmentId] || "";
                }
                innerDataObj[
                  "Name"
                ] = `${innerDataObj["Name"]} - ${equipmentName}`;

                data.push(innerDataObj);
              }
            }
          } else {
            let innerDataObj = await getTotalProjectReportingData(
              projects[i],
              columnData,
              building,
              fuelTypes,
              proj
            );
            data.push(innerDataObj);
          }
        } else {
          let innerDataObj = await getProjectReportingData(
            projects[i],
            columnData,
            building,
            fuelTypes,
            proj
          );
          data.push(innerDataObj);
        }
      }
      for (let k = 0; k < imageColumns.length; k++) {
        columnData.push({ ColumnName: imageColumns[k] });
      }

      /*
       *  Need to make sure if all the projects in a sheet doesn't have said fuelType from set {electric, gas, water},
       *  it should not be shown in the report. for that need to manipulate the columnData at the end
       */
      const savingsMapping = {
        electric: "Electric Savings (kWh)",
        gas: "Gas Savings (therms)",
        water: "Water Savings (kGal)"
      };
      const columnsToBeRemoved = Object.keys(
        _.omit(savingsMapping, fuelTypes)
      ).map(cl => savingsMapping[cl]);
      columnData = _.remove(
        columnData,
        cd => !columnsToBeRemoved.includes(cd.ColumnName)
      );

      projectData.Data = data;
      projectData.ColumnNames = columnData;
      returnData.push(projectData);
    }
    return Promise.resolve(returnData);
  } catch (error) {
    console.log("error", error);
    return Promise.reject(error);
  }
};

/**
 * Get the data for Project Report
 */
const getProjectData = async (building, spreadsheetTemplate) => {
  try {
    let sheets = spreadsheetTemplate.sheets;
    let result = await getProjectColumnData(building, sheets[0]);
    let resultObj = {
      BuildingId: building._id,
      BuildingReportData: {
        ReportData: []
      },
      ProjectReportData: {
        Layout: sheets[0].metaData ? sheets[0].metaData.layout : "vertical",
        ProjectData: result
      }
    };
    return resultObj;
  } catch (error) {
    return Promise.reject(error);
  }
};

/**
 * Generate Spreadsheet excel report
 */
exports.getExcelReportDownload = async function(req, res, next) {
  var d = new Date();
  var hr = d.getHours();
  var min = d.getMinutes();
  if (min < 10) {
    min = "0" + min;
  }
  var date = d.getDate();
  var month = d.getMonth() + 1;
  var year = d.getFullYear();

  try {
    const { buildingId, spreadsheetId } = req.params;
    const spreadsheetTemplate = await SpreadsheetTemplate.findById(
      spreadsheetId
    );
    if (!spreadsheetTemplate) {
      throw new Error("Spreadsheet Not Found!");
    }
    const { name, type } = spreadsheetTemplate;
    const building = await Building.findById(buildingId);
    let opts = {
      filename:
        name +
        "_" +
        type +
        month +
        "." +
        date +
        "." +
        year +
        "_" +
        hr +
        "." +
        min
    };
    let body = {};
    const dateYear = req.query.year || year;
    if (type === "building") {
      body = await getBuildingData(building, spreadsheetTemplate, dateYear);
    } else if (type === "project") {
      body = await getProjectData(building, spreadsheetTemplate);
    } else {
      throw new Error("Invalid Report Type!");
    }
    opts.body = body;
    opts.reportType = type;
    excelReportClient.getExcelReport(opts, function(err, report) {
      if (err) {
        return util.sendError(
          "Issues generating excel report.",
          400,
          req,
          res,
          next
        );
      }
      // Set header data for file type and filename
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        "attachment; " + "filename=" + report.filename + ".xlsx"
      );
      res.cookie("downloading", "finished", { path: "/" });
      return res.send(report.buffer || "");
    });
  } catch (error) {
    console.error(error);
    return util.sendError(error, 500, req, res, next);
  }
};
