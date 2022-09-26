"use strict";

/**
 * Module dependencies.
 */
const moment = require("moment");
const util = require("./utils/api.utils");
const meterService = require("./utils/api.portfolio.meter");
const propertyService = require("./utils/api.portfolio.property");
const propertyUseService = require("./utils/api.portfolio.property.use");
const portfolioUtil = require("./utils/api.portfolio.util");

const { updatePMScores } = require("./api.portfolio.server.controller");

const {
  getBuildings,
} = require("../../dao/building.server.dao");

const _makeMeterConsumptionXML = function (meterArr) {
  let entireMeterConstumption = "";

  meterArr.forEach((meter) => {
    let meterConsumption = "<meterConsumption estimatedValue=\"" + meter.estimation + "\"><usage>" + (meter.totalUsage) + "</usage><cost>" + (meter.totalCost) + "</cost><startDate>" + moment(meter.startDate).format("YYYY-MM-DD") + "</startDate><endDate>" + moment(meter.endDate).format("YYYY-MM-DD")  + "</endDate>";

    if (meter.demand || meter.demandCost) {
      meterConsumption += "<demandTracking><demand>" + (meter.demand || 0) + "</demand><demandCost>" + (meter.demandCost || 0) + "</demandCost></demandTracking>";
    }

    meterConsumption += "</meterConsumption>";
    entireMeterConstumption += meterConsumption;
  });

  return entireMeterConstumption;
};

const _makeMeterDeliveryXML = function (meterArr) {
  let entireMeterDelivery = "";

  meterArr.forEach((meter) => {
    let meterDelivery = "<meterDelivery estimatedValue=\"" + meter.estimation + "\"><cost>" + (meter.totalCost) + "</cost><quantity>" + (meter.quantity) + "</quantity><deliveryDate>" + moment(meter.deliveryDate).format("YYYY-MM-DD")  + "</deliveryDate></meterDelivery>";
    entireMeterDelivery += meterDelivery;
  });

  return entireMeterDelivery;
};

const _iterateMeterData = function (meterData) {
  const arrayOfMeterArrays = [];

  const breakUpArr = function (arr) {
    if (arr.length <= 100) {
      arrayOfMeterArrays.push(arr);
      return arrayOfMeterArrays;
    }

    const first = arr.slice(0, 100);
    const second = arr.slice(100);

    arrayOfMeterArrays.push(first);
    return breakUpArr(second);
  };

  return breakUpArr(meterData);
};

const _addMeterConsumptionData = async function (buildeeUtility, pmMeterId, isUpdate) {
  console.log(pmMeterId);
  const meterConsumptionLog = [];
  let meterDataArrays = [];
  let type;
  if(buildeeUtility.meterData.length) {
    meterDataArrays = _iterateMeterData(buildeeUtility.meterData);
    type = "consumption";
  } else if (buildeeUtility.deliveryData.length) {
    meterDataArrays = _iterateMeterData(buildeeUtility.deliveryData);
    type = "delivery";
  }
  
  await Promise.all(meterDataArrays.map(async function (meterArr) {
    let meterData = "<meterData>";

    const meterXml = (type === "consumption") ? _makeMeterConsumptionXML(meterArr) : _makeMeterDeliveryXML(meterArr);
    meterData += meterXml;
    meterData += "</meterData>";

    // pmMeterId -> ensure its being saved to buildee, otherwise we need to throw an error
    try {
      if (isUpdate) {
        // Delete old data
        await meterService.deletePortfolioMeterConsumption({ pmMeterId });
      }
      // Add new data
      await meterService.createPortfolioMeterConsumption({ meterData, pmMeterId });
      // meterConsumptionLog.push("Meter consumption successfully created");
      buildeeUtility.portfolioManagerMeterId = Number(pmMeterId);
      return buildeeUtility.save();
    } catch (err) {
      meterConsumptionLog.push("Could not add meter consumption data for " + buildeeUtility.name);
    }
  }));
  return meterConsumptionLog;
};

const _saveUtilitiesAsMeters = async function (buildeeBuilding, propertyId, isUpdate) {
  const utilities = buildeeBuilding.utilityIds;
  const utilityMessages = [];
  const meterIds = [];
  if (isUpdate) {
    const pmMeterList = await meterService.getPropertyMeterList(propertyId);
    await Promise.all(pmMeterList.map(async function (pmMeter) {
      const buildeeMeterExist = utilities.find(buildeeUtility => buildeeUtility && buildeeUtility.portfolioManagerMeterId === Number(pmMeter.id));
      if (!buildeeMeterExist) {
        await meterService.deletePropertyMeter(pmMeter.id);
      }
    }));
  }

  await Promise.all(utilities.map(async function (buildeeUtility) {
    try {
      let meterExists = false;
      let pmMeterId = buildeeUtility.portfolioManagerMeterId;
      if (buildeeUtility.portfolioManagerMeterId) {
        meterExists = await meterService.checkMeterExists(buildeeUtility.portfolioManagerMeterId);
      }
      if (!meterExists) {
        const pmMeterUrl = await meterService.createPortfolioMeter(buildeeUtility, propertyId);
        pmMeterId = pmMeterUrl.split("/meter/")[1];
        buildeeUtility.portfolioManagerMeterId = pmMeterId;
      } else {
        await meterService.updatePortfolioMeter(buildeeUtility, pmMeterId);
      }

      const response = await _addMeterConsumptionData(buildeeUtility, pmMeterId, isUpdate);
      if (response !== "") {
        utilityMessages.push(response);
        meterIds.push({ meterId: pmMeterId, buildeeUtility });
        return;
      } else {
        try {
          await buildeeUtility.validate();
          try {
            await buildeeUtility.save();
            utilityMessages.push("Successfully exported meter consumption data");
          } catch (err) {
            utilityMessages.push("Could not save " + buildeeUtility.name + " PM reference in buildee");
          }
        } catch (err) {
          utilityMessages.push("Utility was created in PM but was invalid in buildee");
        }
      }
    } catch (err) {
      if (err.errorNumber === -200) {
        utilityMessages.push("Could not save " + buildeeUtility.name + " in PM, the meter type and unit of measure are invalid");
      } else {
        utilityMessages.push("Could not save " + buildeeUtility.name + " in PM");
      }
    }
  }));
  await _associateMeters(meterIds, propertyId);
  return utilityMessages;
};

const _removeExistingIdentifiers = async function (propertyId) {
  const existingIdentifiers = await propertyService.getBuildingIdentifiers({ propertyId });
  await Promise.all(existingIdentifiers.map(identifier => {
    return propertyService.removeIdentifier({ propertyId, id: identifier.id });
  }));
};

const _createAndSaveIdentifiers = async function (buildeeBuilding, propertyId) {
  if (buildeeBuilding.customFields && buildeeBuilding.customFields.length) {
    let counter = 1;
    await Promise.all(buildeeBuilding.customFields.map(async function (customField, index) {
      const identifierId = await propertyService.createCustomField({ propertyId, customField, counter });
      if (!customField.standardApproved) {
        counter++;
      }
      buildeeBuilding.customFields[index].identifierId = identifierId;
    }));
    buildeeBuilding.markModified("customFields");
    await buildeeBuilding.save();
  }
};

const _xmlForBuildingUse = (year, u) => {
  console.log("-----xml-----");
  console.log(u.use);
  const xmlUse = portfolioUtil.getBuildingUse("buildee", "xml", u.use);
  console.log(xmlUse);
  return `
    <${xmlUse}>
      <name>${u.use} Use</name>
      <useDetails>
        ${u.squareFeet ? `<totalGrossFloorArea units="Square Feet" currentAsOf="${year}-01-01" temporary="false"><value>${u.squareFeet}</value></totalGrossFloorArea>`:""}
        ${u.weeklyOperatingHours ? `<weeklyOperatingHours currentAsOf="${year}-01-01" temporary="false"><value>${u.weeklyOperatingHours}</value></weeklyOperatingHours>`:""}
        ${u.openOnWeekends ? `<openOnWeekends currentAsOf="${year}-01-01" temporary="false"><value>${u.openOnWeekends}</value></openOnWeekends>`:""}
        ${u.numberOfWorkers ? `<numberOfWorkers currentAsOf="${year}-01-01" temporary="false"><value>${u.numberOfWorkers}</value></numberOfWorkers>`:""}
        ${u.percentCooled ? `<percentCooled currentAsOf="${year}-01-01" temporary="false"><value>${u.percentCooled}</value></percentCooled>`:""}
        ${u.percentHeated ? `<percentHeated currentAsOf="${year}-01-01" temporary="false"><value>${u.percentHeated}</value></percentHeated>`:""}
        ${u.numberOfResidentialLivingUnits ? `<numberOfResidentialLivingUnits currentAsOf="${year}-01-01" temporary="false"><value>${u.numberOfResidentialLivingUnits}</value></numberOfResidentialLivingUnits>`:""}
        ${u.numberOfRooms ? `<numberOfRooms currentAsOf="${year}-01-01" temporary="false"><value>${u.numberOfRooms}</value></numberOfRooms>`:""}
        ${u.numberOfComputers ? `<numberOfComputers currentAsOf="${year}-01-01" temporary="false"><value>${u.numberOfComputers}</value></numberOfComputers>`:""}
        ${u.cookingFacilities ? `<cookingFacilities currentAsOf="${year}-01-01" temporary="false"><value>${u.cookingFacilities}</value></cookingFacilities>`:""}
        ${u.numberOfCommercialRefrigerationUnits ? `<numberOfCommercialRefrigerationUnits currentAsOf="${year}-01-01" temporary="false"><value>${u.numberOfCommercialRefrigerationUnits}</value></numberOfCommercialRefrigerationUnits>`:""}
        ${u.numberOfWalkInRefrigerationUnits ? `<numberOfWalkInRefrigerationUnits currentAsOf="${year}-01-01" temporary="false"><value>${u.numberOfWalkInRefrigerationUnits}</value></numberOfWalkInRefrigerationUnits>`:""}
        ${u.areaOfAllWalkInRefrigerationUnits ? `<areaOfAllWalkInRefrigerationUnits currentAsOf="${year}-01-01" temporary="false"><value>${u.areaOfAllWalkInRefrigerationUnits}</value></areaOfAllWalkInRefrigerationUnits>`:""}
        ${u.numberOfOpenClosedRefrigerationUnits ? `<numberOfOpenClosedRefrigerationUnits currentAsOf="${year}-01-01" temporary="false"><value>${u.numberOfOpenClosedRefrigerationUnits}</value></numberOfOpenClosedRefrigerationUnits>`:""}
        ${u.lengthOfAllOpenClosedRefrigerationUnits ? `<lengthOfAllOpenClosedRefrigerationUnits currentAsOf="${year}-01-01" temporary="false"><value>${u.lengthOfAllOpenClosedRefrigerationUnits}</value></lengthOfAllOpenClosedRefrigerationUnits>`:""}
        ${u.numberOfCashRegisters ? `<numberOfCashRegisters currentAsOf="${year}-01-01" temporary="false"><value>${u.numberOfCashRegisters}</value></numberOfCashRegisters>`:""}
        ${u.singleStore ? `<singleStore currentAsOf="${year}-01-01" temporary="false"><value>${u.singleStore}</value></singleStore>`:""}
        ${u.exteriorEntranceToThePublic ? `<exteriorEntranceToThePublic currentAsOf="${year}-01-01" temporary="false"><value>${u.exteriorEntranceToThePublic}</value></exteriorEntranceToThePublic>`:""}
        ${u.isHighSchool ? `<isHighSchool currentAsOf="${year}-01-01" temporary="false"><value>${u.isHighSchool}</value></isHighSchool>`:""}
        ${u.schoolDistrict ? `<schoolDistrict currentAsOf="${year}-01-01" temporary="false"><value>${u.schoolDistrict}</value></schoolDistrict>`:""}
        ${u.studentSeatingCapacity ? `<studentSeatingCapacity currentAsOf="${year}-01-01" temporary="false"><value>${u.studentSeatingCapacity}</value></studentSeatingCapacity>`:""}
        ${u.monthsInUse ? `<monthsInUse currentAsOf="${year}-01-01" temporary="false"><value>${u.monthsInUse}</value></monthsInUse>`:""}
        ${u.grossFloorAreaUsedForFoodPreparation ? `<grossFloorAreaUsedForFoodPreparation currentAsOf="${year}-01-01" temporary="false"><value>${u.grossFloorAreaUsedForFoodPreparation}</value></grossFloorAreaUsedForFoodPreparation>`:""}
        ${u.gymnasiumFloorArea ? `<gymnasiumFloorArea currentAsOf="${year}-01-01" temporary="false"><value>${u.gymnasiumFloorArea}</value></gymnasiumFloorArea>`:""}
        ${u.computerLab ? `<computerLab currentAsOf="${year}-01-01" temporary="false"><value>${u.computerLab}</value></computerLab>`:""}
        ${u.diningHall ? `<diningHall currentAsOf="${year}-01-01" temporary="false"><value>${u.diningHall}</value></diningHall>`:""}
        ${u.ownedBy ? `<ownedBy currentAsOf="${year}-01-01" temporary="false"><value>${u.ownedBy}</value></ownedBy>`:""}
        ${u.maximumNumberOfFloors ? `<maximumNumberOfFloors currentAsOf="${year}-01-01" temporary="false"><value>${u.maximumNumberOfFloors}</value></maximumNumberOfFloors>`:""}
        ${u.numberOfStaffedBeds ? `<numberOfStaffedBeds currentAsOf="${year}-01-01" temporary="false"><value>${u.numberOfStaffedBeds}</value></numberOfStaffedBeds>`:""}
        ${u.numberOfFullTimeEquivalentWorkers ? `<numberOfFullTimeEquivalentWorkers currentAsOf="${year}-01-01" temporary="false"><value>${u.numberOfFullTimeEquivalentWorkers}</value></numberOfFullTimeEquivalentWorkers>`:""}
        ${u.numberOfMriMachines ? `<numberOfMriMachines currentAsOf="${year}-01-01" temporary="false"><value>${u.numberOfMriMachines}</value></numberOfMriMachines>`:""}
        ${u.percentUsedForColdStorage ? `<percentUsedForColdStorage currentAsOf="${year}-01-01" temporary="false"><value>${u.percentUsedForColdStorage}</value></percentUsedForColdStorage>`:""}
        ${u.numberOfResidentialLivingUnitsInALowriseSetting ? `<numberOfResidentialLivingUnitsInALowriseSetting currentAsOf="${year}-01-01" temporary="false"><value>${u.numberOfResidentialLivingUnitsInALowriseSetting}</value></numberOfResidentialLivingUnitsInALowriseSetting>`:""}
        ${u.numberOfResidentialLivingUnitsInAMidriseSetting ? `<numberOfResidentialLivingUnitsInAMidriseSetting currentAsOf="${year}-01-01" temporary="false"><value>${u.numberOfResidentialLivingUnitsInAMidriseSetting}</value></numberOfResidentialLivingUnitsInAMidriseSetting>`:""}
        ${u.numberOfResidentialLivingUnitsInAHighriseSetting ? `<numberOfResidentialLivingUnitsInAHighriseSetting currentAsOf="${year}-01-01" temporary="false"><value>${u.numberOfResidentialLivingUnitsInAHighriseSetting}</value></numberOfResidentialLivingUnitsInAHighriseSetting>`:""}
        ${u.numberOfBedrooms ? `<numberOfBedrooms currentAsOf="${year}-01-01" temporary="false"><value>${u.numberOfBedrooms}</value></numberOfBedrooms>`:""}
        ${u.maximumResidentCapacity ? `<maximumResidentCapacity currentAsOf="${year}-01-01" temporary="false"><value>${u.maximumResidentCapacity}</value></maximumResidentCapacity>`:""}
        ${u.averageNumberOfResidents ? `<averageNumberOfResidents currentAsOf="${year}-01-01" temporary="false"><value>${u.averageNumberOfResidents}</value></averageNumberOfResidents>`:""}
        ${u.numberOfResidentialWashingMachines ? `<numberOfResidentialWashingMachines currentAsOf="${year}-01-01" temporary="false"><value>${u.numberOfResidentialWashingMachines}</value></numberOfResidentialWashingMachines>`:""}
        ${u.numberOfCommercialWashingMachines ? `<numberOfCommercialWashingMachines currentAsOf="${year}-01-01" temporary="false"><value>${u.numberOfCommercialWashingMachines}</value></numberOfCommercialWashingMachines>`:""}
        ${u.numberOfResidentialElectronicLiftSystems ? `<numberOfResidentialElectronicLiftSystems currentAsOf="${year}-01-01" temporary="false"><value>${u.numberOfResidentialElectronicLiftSystems}</value></numberOfResidentialElectronicLiftSystems>`:""}
        ${u.plantDesignFlowRate ? `<plantDesignFlowRate currentAsOf="${year}-01-01" temporary="false"><value>${u.plantDesignFlowRate}</value></plantDesignFlowRate>`:""}
        ${u.averageInfluentBiologicalOxygenDemand ? `<averageInfluentBiologicalOxygenDemand currentAsOf="${year}-01-01" temporary="false"><value>${u.averageInfluentBiologicalOxygenDemand}</value></averageInfluentBiologicalOxygenDemand>`:""}
        ${u.averageEffluentBiologicalOxygenDemand ? `<averageEffluentBiologicalOxygenDemand currentAsOf="${year}-01-01" temporary="false"><value>${u.averageEffluentBiologicalOxygenDemand}</value></averageEffluentBiologicalOxygenDemand>`:""}
        ${u.fixedFilmTrickleFiltrationProcess ? `<fixedFilmTrickleFiltrationProcess currentAsOf="${year}-01-01" temporary="false"><value>${u.fixedFilmTrickleFiltrationProcess}</value></fixedFilmTrickleFiltrationProcess>`:""}
        ${u.nutrientRemoval ? `<nutrientRemoval currentAsOf="${year}-01-01" temporary="false"><value>${u.nutrientRemoval}</value></nutrientRemoval>`:""}
        ${u.seatingCapacity ? `<seatingCapacity currentAsOf="${year}-01-01" temporary="false"><value>${u.seatingCapacity}</value></seatingCapacity>`:""}
        ${u.openFootage ? `<openFootage units="Square Feet" currentAsOf="${year}-01-01" temporary="false"><value>${u.openFootage}</value></openFootage>`:""}
        ${u.partiallyEnclosedFootage ? `<partiallyEnclosedFootage units="Square Feet" currentAsOf="${year}-01-01" temporary="false"><value>${u.partiallyEnclosedFootage}</value></partiallyEnclosedFootage>`:""}
        ${u.completelyEnclosedFootage ? `<completelyEnclosedFootage units="Square Feet" currentAsOf="${year}-01-01" temporary="false"><value>${u.completelyEnclosedFootage}</value></completelyEnclosedFootage>`:""}
        ${u.supplementalHeating ? `<supplementalHeating currentAsOf="${year}-01-01" temporary="false"><value>${u.supplementalHeating}</value></supplementalHeating>`:""}
      </useDetails>
    </${xmlUse}>
  `;
};

const _associateBuildingUses = function (buildeeBuilding, propertyId) {
  return Promise.all(
    buildeeBuilding.buildingUseTypes.map(buildingUseType => {
      const xml = _xmlForBuildingUse(buildeeBuilding.buildYear, buildingUseType);
      return propertyUseService.associateBuildingUse({ xml, propertyId });
    })
  );
};

const _associateMeters = async function (meterIds, propertyId) {
  const organizedMeters = {
    energy: [],
    water: [],
  };
  // Save new associations
  meterIds.forEach((meter) => {
    if (meter.buildeeUtility && meter.buildeeUtility.utilType) {
      if (meter.buildeeUtility.utilType !== "water") {
        organizedMeters.energy.push(meter.meterId);
      } else {
        organizedMeters.water.push(meter.meterId);
      }
    }
  });
  if ((organizedMeters.energy && organizedMeters.energy.length > 0) || (organizedMeters.water && organizedMeters.water.length > 0)) {
    let xml = "<meterPropertyAssociationList>";

    if (organizedMeters.energy && organizedMeters.energy.length > 0) {
      xml += "<energyMeterAssociation><meters>";

      organizedMeters.energy.map((id) => {
        xml += "<meterId>" + id + "</meterId>";
      });

      xml += "</meters><propertyRepresentation><propertyRepresentationType>Whole Property</propertyRepresentationType></propertyRepresentation></energyMeterAssociation>";
    }

    if (organizedMeters.water && organizedMeters.water.length > 0) {
      xml += "<waterMeterAssociation><meters>";

      organizedMeters.water.map((id) => {
        xml += "<meterId>" + id + "</meterId>";
      });

      xml += "</meters><propertyRepresentation><propertyRepresentationType>Whole Property</propertyRepresentationType></propertyRepresentation></waterMeterAssociation>";
    }

    xml += "</meterPropertyAssociationList>";

    await meterService.associateMeters({ xml, propertyId });
  }
};

let _finishedRunPmExport = false;
let exportResponse = [];

const _runPmExport = async function (req, res, next) {
  const organization = req.organization;
  const accountId = req.query.pmAccountId.toString();
  const tempExportResponse = [];
  let updateAll = false;
  let buildingIds;

  if (req.body.length > 0) {
    buildingIds = [req.body[0]._id];
  } else {
    updateAll = true;
    buildingIds = organization.buildingIds;
  }
  const buildings = await getBuildings(buildingIds);
  if (!buildings) {
    return util.sendError("Buildings not found", 400, req, res, next);
  }
  let filteredBuildings = [];
  const unArchivedBuildings = buildings.filter(building => !building.archived);
  if (updateAll) {
    const _filterBuildings = building => {
      let obj = false;

      if (building && building.energystarIds && building.energystarIds.length > 0) {
        obj = building.energystarIds.find(function (obj) {
          return obj.accountId.toString() === accountId;
        });
      }

      return !obj;
    };

    filteredBuildings = unArchivedBuildings.filter(_filterBuildings);
  } else {
    filteredBuildings = unArchivedBuildings;
  }

  // loop over buildings
  await Promise.all(filteredBuildings.map(async function (buildeeBuilding) {
    const buildingResponse = {
      id: buildeeBuilding._id,
      message: [],
    };

    let propertyLink;
    try {
      propertyLink = await propertyService.createPortfolioBuilding({ buildeeBuilding, accountId });
      const propertyId = propertyLink.split("/property/")[1];
      await _associateBuildingUses(buildeeBuilding, propertyId);
      const utilityMessages = await _saveUtilitiesAsMeters(buildeeBuilding, propertyId, false);
      buildingResponse.message = buildingResponse.message.concat(utilityMessages);

      const tempAccountIds = [...buildeeBuilding.energystarIds];
      const connectionObj = {
        accountId,
        buildingId: propertyId,
      };
      tempAccountIds.push(connectionObj);
      buildeeBuilding.energystarIds = tempAccountIds;
      buildeeBuilding.markModified("energystarIds");
      await _createAndSaveIdentifiers(buildeeBuilding, propertyId);
      const updatedBuilding = await buildeeBuilding.save();
      buildingResponse.message.push("Building exported successfully");
      await updatePMScores(buildeeBuilding, propertyId);
      return updatedBuilding;
    } catch (err) {
      buildingResponse.message.push("Was not able to create building in PM");
    }
    tempExportResponse.push(buildingResponse);
  }));
  const log = {
    user: req.user,
    date: Date.now(),
    log: tempExportResponse,
  };

  req.organization.portfolioSyncHistory.export.unshift(log);

  if (req.organization.portfolioSyncHistory.export.length >= 3) {
    req.organization.portfolioSyncHistory.export.length = 3;
  }

  await req.organization.save();
  exportResponse = tempExportResponse;
  _finishedRunPmExport = true;
};

let _finishedRunPmExportUpdate = false;
let exportUpdateResponse = [];

const _runPmExportUpdate = async function (req) {
  const organization = req.organization;
  const tempExportUpdateResponse = [];
  let updateAll = false;
  let buildingIds;
  const accountId = req.body.pmAccount;
  if (req.body.syncBuildings.length > 0) {
    buildingIds = [req.body.syncBuildings[0]._id];
  } else {
    updateAll = true;
    buildingIds = organization.buildingIds;
  }
  const buildings = await getBuildings(buildingIds);
  let filteredBuildings = [];
  const unArchivedBuildings = buildings.filter(building => !building.archived);

  if (updateAll) {
    const _filterBuildings = building => {
      let obj = false;

      if (building && building.energystarIds && building.energystarIds.length > 0) {
        obj = building.energystarIds.find(function (obj) {
          return obj.accountId.toString() === accountId.toString();
        });
      }

      return !!obj;
    };

    filteredBuildings = unArchivedBuildings.filter(_filterBuildings);
  } else {
    filteredBuildings = unArchivedBuildings;
  }

  // loop over buildings
  await Promise.all(filteredBuildings.map(async function (buildeeBuilding) {
    const buildingResponse = {
      id: buildeeBuilding._id,
      message: [],
    };

    const energyStarObject = buildeeBuilding.energystarIds.find(function (obj) { return obj.accountId === accountId; });

    if (!energyStarObject || !energyStarObject.buildingId) {
      buildingResponse.message.push("Buildings/accounts not correctly connected.");
      tempExportUpdateResponse.push(buildingResponse);
      return;
    }

    const propertyId = energyStarObject.buildingId;

    // Remove current property uses on espm
    const propertyUseLists = await propertyUseService.getPropertyUseList(propertyId);
    // delete all use types in pm
    if (propertyUseLists.length) {
      await Promise.all(propertyUseLists.map(async function (propertyUse) {
        const pmPropertyUseLink = propertyUse.link;
        return propertyUseService.deletePropertyUse(pmPropertyUseLink);
      }));
    }
    
    await _associateBuildingUses(buildeeBuilding, propertyId);
    
    const utilityMessages = await _saveUtilitiesAsMeters(buildeeBuilding, propertyId, true);
    buildingResponse.message = buildingResponse.message.concat(utilityMessages);
    
    await _removeExistingIdentifiers(propertyId);
    await _createAndSaveIdentifiers(buildeeBuilding, propertyId);
    // Future: compare floor area in buildee and PM and update as needed
    const payload = {
      buildeeBuilding,
      propertyId,
    };
    await propertyService.updatePortfolioBuilding(payload);
    buildingResponse.message.push("Building Successfully Synced.");
    tempExportUpdateResponse.push(buildingResponse);
  }));

  const log = {
    user: req.user,
    date: Date.now(),
    log: tempExportUpdateResponse,
  };

  req.organization.portfolioSyncHistory.export.unshift(log);

  if (req.organization.portfolioSyncHistory.export.length >= 3) {
    req.organization.portfolioSyncHistory.export.length = 3;
  }

  await req.organization.save();
  _finishedRunPmExportUpdate = true;
  exportUpdateResponse = tempExportUpdateResponse;  
};

exports.pmExport = function (req, res, next) {
  if (req.query.run === "true") {
    _runPmExport(req, res, next);

    res.sendResult = {
      status: "Success",
      message: "Export buildee Buildings Started",
    };
    return next();
  } else {
    if (_finishedRunPmExport) {
      res.sendResult = {
        status: "Success",
        message: "Exported all buildee Buildings.",
        exportResponse,
      };
      return next();
    } else {
      res.sendResult = {
        status: "Warning",
        message: "Run Export buildee Buildings Incomplete.",
      };
      return next();
    }
  }
};

exports.pmExportUpdate = async function (req, res, next) {
  if (req.query.run === "true") {
    await _runPmExportUpdate(req, res, next);

    res.sendResult = {
      status: "Success",
      message: "Export buildee Buildings Started",
    };
    return next();
  } else {
    if (_finishedRunPmExportUpdate) {
      res.sendResult = {
        status: "Success",
        message: "Exported all buildee Buildings.",
        exportUpdateResponse,
      };
      return next();
    } else {
      res.sendResult = {
        status: "Warning",
        message: "Run Export buildee Buildings Incomplete.",
      };
      return next();
    }
  }
};
