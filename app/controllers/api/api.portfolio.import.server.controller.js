"use strict";

/**
 * Module dependencies.
 */
const util = require("./utils/api.utils");
const connectionService = require("./utils/api.portfolio.connection");
const meterService = require("./utils/api.portfolio.meter");
const propertyService = require("./utils/api.portfolio.property");
const propertyUseService = require("./utils/api.portfolio.property.use");
const portfolioUtil = require("./utils/api.portfolio.util");
const buildingSyncScript = require("../../scripts/buildingSync.script");

const { getBuildings, saveBuilding } = require("../../dao/building.server.dao");
const {
  getPortfolioSyncByAccountId,
  savePortfolioSync
} = require("../../dao/portfolio.sync.server.dao");
const {
  getUtilityByMeterId,
  saveUtility,
  deleteUtility
} = require("../../dao/utility.server.dao");

const { updatePMScores } = require("./api.portfolio.server.controller");
const { PARTITION_KEYS } = require("../../../config/realm");

// returns the saved buildee utility object
const _saveMeterAsUtility = async function(meter) {
  // see if utility meter already exists in db
  const existingUtility = await getUtilityByMeterId(meter.id);
  if (existingUtility) {
    // If it's already exist update meterData
    existingUtility.meterData = meter.meterData;
    existingUtility.deliveryData = meter.deliveryData;
    return existingUtility.save();
  } else {
    // if it is not in the db yet create a new utility and save its id to the building's utilityIds array
    let utilType;
    // 'electric', 'natural-gas', 'water', 'steam', 'fuel-oil-2', 'fuel-oil-4', 'fuel-oil-5-6', 'diesel
    switch (meter.type) {
      case "Natural Gas":
        utilType = "natural-gas";
        break;
      case "Electric":
        utilType = "electric";
        break;
      case "Municipally Supplied Potable Water - Mixed Indoor/Outdoor":
      case "Municipally Supplied Potable Water - Indoor":
        utilType = "water";
        break;
      case "Diesel":
        utilType = "diesel";
        break;
      case "Fuel Oil No 2":
        utilType = "fuel-oil-2";
        break;
      case "Fuel Oil No 4":
        utilType = "fuel-oil-4";
        break;
      case "Fuel Oil No 5 or 6":
        utilType = "fuel-oil-5-6";
        break;
      case "District Steam":
        utilType = "steam";
        break;
      default:
        utilType = "electric";
    }
    let units;
    switch (meter.unitOfMeasure) {
      case "kWh (thousand Watt-hours)":
        units = "kwh";
        break;
      case "Gallons (US)":
        units = "gallons";
        break;
      default:
        units = meter.unitOfMeasure;
    }

    const utilityObject = {
      name: meter.name,
      meterNumber: meter.name,
      source: "Portfolio Manager",
      units,
      utilType,
      portfolioManagerMeterId: meter.id,
      meterData: meter.meterData,
      deliveryData: meter.deliveryData
    };
    return saveUtility(utilityObject);
  }
};

const setPropertyUses = async (building, propertyId) => {
  // Use types
  const pmPropertyUseLists = await propertyUseService.getPropertyUseList(
    propertyId
  );
  if (pmPropertyUseLists) {
    const propertyUseDetails = await Promise.all(
      pmPropertyUseLists.map(async function(propertyUse) {
        const pmPropertyUseLink = propertyUse.link;
        return propertyUseService.getCustomerPropertyUseDetails(
          pmPropertyUseLink
        );
      })
    );
    building.buildingUseTypes = getBuildingUseTypes(propertyUseDetails);
    building.markModified("buildingUseTypes");
  }
};

const getAllowedMeterUnit = meterType => {
  switch(meterType) {
    case "Natural Gas":
        return ["therm"];
      case "Electric":
        return ["kwh", "kilogram"];
      case "Diesel":
        return ["kwh", "therm", "kilogram", "ccf", "gal"];
      case "Fuel Oil No 2":
        return ["kwh", "therm", "kilogram", "ccf", "gal"];
      case "Fuel Oil No 4":
        return ["kwh", "therm", "kilogram", "ccf", "gal"];
      case "Fuel Oil No 5 or 6":
        return ["kwh", "therm", "kilogram", "ccf", "gal"];
      case "District Steam":
        return ["therm"];
      default:
        return ["kwh", "therm", "kilogram", "ccf", "gal"];
  }
};

const isAllowedMeterUnit = meter => {
  const allowedUnits = getAllowedMeterUnit(meter.type);
  if (meter.unitOfMeasure) {
    return allowedUnits.some(
      unit => meter.unitOfMeasure.toLowerCase().indexOf(unit) > -1
    );
  }
  return false;
};

const _getMeterData = async function(propertyId) {
  // Meters
  const meterLinkList = await meterService.getPropertyMeterList(propertyId);
  const meterIdList = meterLinkList.map(meterLink => Number(meterLink.id));
  const meterData = [];
  const errors = [];
  let errorData = null;
  if (meterIdList && meterIdList.length) {
    // loop over meterslist, for each meter get the pm meter object
    await Promise.all(
      meterIdList.map(async meterId => {
        // for each meter reach out to pm to get meter details object including meterconsumption key
        const meter = await meterService.getMeterWithConsumption(meterId);
        if (isAllowedMeterUnit(meter)) {
          meterData.push(meter);
        } else {
          errors.push(
            `There was a problem with importing the meter ${meter.name} as the unit ${meter.unitOfMeasure} didn't matched`
          );
        }
      })
    );
  }
  if (errors.length > 0) {
    errorData = {
      text:
        "There was a problem while saving your building. " + errors.join("\n"),
      type: "error",
      link:
        "https://intercom.help/buildee/en/articles/4655340-import-properties-from-energy-star-portfolio-manager"
    };
  }
  return { meterData, errorData };
};

const _setUtilities = async function(
  building,
  meterData,
  propertyId,
  isUpdate
) {
  const message = [];

  // Meters
  const meterIdList = meterData.map(meter => Number(meter.meterId));
  if (isUpdate) {
    // Delete removed pm meters from db
    let buildingUpdated = false;
    const deletedMeterList = [];
    await Promise.all(
      building.utilityIds.map(async utility => {
        if (!utility) return;
        if (!meterIdList.includes(utility.portfolioManagerMeterId)) {
          await deleteUtility(utility._id);
          buildingUpdated = true;
          deletedMeterList.push(utility.portfolioManagerMeterId);
        }
      })
    );
    if (buildingUpdated) {
      building.utilityIds = building.utilityIds.filter(
        utility =>
          utility && !deletedMeterList.includes(utility.portfolioManagerMeterId)
      );
    }
  }

  if (meterIdList && meterIdList.length) {
    building.utilityIds = [];
    // loop over meterslist, for each meter get the pm meter object
    await Promise.all(
      meterData.map(async meter => {
        // for each meter object returned from pm save the meter to buildee as utility; returns buildee utility obj
        const utility = await _saveMeterAsUtility(meter);
        if (utility) {
          building.utilityIds.push(utility._id);
        }
      })
    );
    await building.save();
    await updatePMScores(building, propertyId);
  } else {
    message.push(
      "No meters have been shared with the 'simuwatt' account for this property"
    );
  }
  return message;
};

const getBuildingUseTypes = function(propertyUseDetails) {
  return propertyUseDetails.map(propertyUseDetail => {
    const use = Object.keys(propertyUseDetail)[0];
    const useDetails = propertyUseDetail[use].useDetails;
    const useType = {
      use: portfolioUtil.getBuildingUse("xml", "buildee", use)
    };
    const fields = Object.keys(useDetails);
    fields.forEach(field => {
      if (field === "totalGrossFloorArea") {
        useType.squareFeet = useDetails.totalGrossFloorArea.value;
      } else if (
        useDetails[field].default != "Yes" &&
        useDetails[field].value
      ) {
        useType[field] = useDetails[field].value;
      }
    });
    return useType;
    /* return {
      squareFeet: useDetails.totalGrossFloorArea.value,
      weeklyOperatingHours: useDetails.weeklyOperatingHours && useDetails.weeklyOperatingHours.default !== 'Yes' ? useDetails.weeklyOperatingHours.value : undefined,
      openOnWeekends: useDetails.openOnWeekends && useDetails.openOnWeekends.default !== 'Yes' ? useDetails.openOnWeekends.value : undefined,
      numberOfWorkers: useDetails.numberOfWorkers && useDetails.numberOfWorkers.default !== 'Yes' ? useDetails.numberOfWorkers.value : undefined,
      percentCooled: useDetails.percentCooled && useDetails.percentCooled.default !== 'Yes' ? useDetails.percentCooled.value : undefined,
      percentHeated: useDetails.percentHeated && useDetails.percentHeated.default !== 'Yes' ? useDetails.percentHeated.value : undefined,
      numberOfResidentialLivingUnits: useDetails.numberOfResidentialLivingUnits && useDetails.numberOfResidentialLivingUnits.default !== 'Yes' ? useDetails.numberOfResidentialLivingUnits.value : undefined,
      numberOfRooms: useDetails.numberOfRooms && useDetails.numberOfRooms.default !== 'Yes' ? useDetails.numberOfRooms.value : undefined,
      numberOfComputers: useDetails.numberOfComputers && useDetails.numberOfComputers.default !== 'Yes' ? useDetails.numberOfComputers.value : undefined,
      cookingFacilities: useDetails.cookingFacilities && useDetails.cookingFacilities.default !== 'Yes' ? useDetails.cookingFacilities.value : undefined,
      numberOfCommercialRefrigerationUnits: useDetails.numberOfCommercialRefrigerationUnits && useDetails.numberOfCommercialRefrigerationUnits.default !== 'Yes' ? useDetails.numberOfCommercialRefrigerationUnits.value : undefined,
      numberOfWalkInRefrigerationUnits: useDetails.numberOfWalkInRefrigerationUnits && useDetails.numberOfWalkInRefrigerationUnits.default !== 'Yes' ? useDetails.numberOfWalkInRefrigerationUnits.value : undefined,
      areaOfAllWalkInRefrigerationUnits: useDetails.areaOfAllWalkInRefrigerationUnits && useDetails.areaOfAllWalkInRefrigerationUnits.default !== 'Yes' ? useDetails.areaOfAllWalkInRefrigerationUnits.value : undefined,
      numberOfOpenClosedRefrigerationUnits: useDetails.numberOfOpenClosedRefrigerationUnits && useDetails.numberOfOpenClosedRefrigerationUnits.default !== 'Yes' ? useDetails.numberOfOpenClosedRefrigerationUnits.value : undefined,
      lengthOfAllOpenClosedRefrigerationUnits: useDetails.lengthOfAllOpenClosedRefrigerationUnits && useDetails.lengthOfAllOpenClosedRefrigerationUnits.default !== 'Yes' ? useDetails.lengthOfAllOpenClosedRefrigerationUnits.value : undefined,
      numberOfCashRegisters: useDetails.numberOfCashRegisters && useDetails.numberOfCashRegisters.default !== 'Yes' ? useDetails.numberOfCashRegisters.value : undefined,
      singleStore: useDetails.singleStore && useDetails.singleStore.default !== 'Yes' ? useDetails.singleStore.value : undefined,
      exteriorEntranceToThePublic: useDetails.exteriorEntranceToThePublic && useDetails.exteriorEntranceToThePublic.default !== 'Yes' ? useDetails.exteriorEntranceToThePublic.value : undefined,
      isHighSchool: useDetails.isHighSchool && useDetails.isHighSchool.default !== 'Yes' ? useDetails.isHighSchool.value : undefined,
      schoolDistrict: useDetails.schoolDistrict && useDetails.schoolDistrict.default !== 'Yes' ? useDetails.schoolDistrict.value : undefined,
      studentSeatingCapacity: useDetails.studentSeatingCapacity && useDetails.studentSeatingCapacity.default !== 'Yes' ? useDetails.studentSeatingCapacity.value : undefined,
      monthsInUse: useDetails.monthsInUse && useDetails.monthsInUse.default !== 'Yes' ? useDetails.monthsInUse.value : undefined,
      grossFloorAreaUsedForFoodPreparation: useDetails.grossFloorAreaUsedForFoodPreparation && useDetails.grossFloorAreaUsedForFoodPreparation.default !== 'Yes' ? useDetails.grossFloorAreaUsedForFoodPreparation.value : undefined,
      gymnasiumFloorArea: useDetails.gymnasiumFloorArea && useDetails.gymnasiumFloorArea.default !== 'Yes' ? useDetails.gymnasiumFloorArea.value : undefined,
      computerLab: useDetails.computerLab && useDetails.computerLab.default !== 'Yes' ? useDetails.computerLab.value : undefined,
      diningHall: useDetails.diningHall && useDetails.diningHall.default !== 'Yes' ? useDetails.diningHall.value : undefined,
      ownedBy: useDetails.ownedBy && useDetails.ownedBy.default !== 'Yes' ? useDetails.ownedBy.value : undefined,
      maximumNumberOfFloors: useDetails.maximumNumberOfFloors && useDetails.maximumNumberOfFloors.default !== 'Yes' ? useDetails.maximumNumberOfFloors.value : undefined,
      numberOfStaffedBeds: useDetails.numberOfStaffedBeds && useDetails.numberOfStaffedBeds.default !== 'Yes' ? useDetails.numberOfStaffedBeds.value : undefined,
      numberOfFullTimeEquivalentWorkers: useDetails.numberOfFullTimeEquivalentWorkers && useDetails.numberOfFullTimeEquivalentWorkers.default !== 'Yes' ? useDetails.numberOfFullTimeEquivalentWorkers.value : undefined,
      numberOfMriMachines: useDetails.numberOfMriMachines && useDetails.numberOfMriMachines.default !== 'Yes' ? useDetails.numberOfMriMachines.value : undefined,
      percentUsedForColdStorage: useDetails.percentUsedForColdStorage && useDetails.percentUsedForColdStorage.default !== 'Yes' ? useDetails.percentUsedForColdStorage.value : undefined,
      numberOfResidentialLivingUnitsInALowriseSetting: useDetails.numberOfResidentialLivingUnitsInALowriseSetting && useDetails.numberOfResidentialLivingUnitsInALowriseSetting.default !== 'Yes' ? useDetails.numberOfResidentialLivingUnitsInALowriseSetting.value : undefined,
      numberOfResidentialLivingUnitsInAMidriseSetting: useDetails.numberOfResidentialLivingUnitsInAMidriseSetting && useDetails.numberOfResidentialLivingUnitsInAMidriseSetting.default !== 'Yes' ? useDetails.numberOfResidentialLivingUnitsInAMidriseSetting.value : undefined,
      numberOfResidentialLivingUnitsInAHighriseSetting: useDetails.numberOfResidentialLivingUnitsInAHighriseSetting && useDetails.numberOfResidentialLivingUnitsInAHighriseSetting.default !== 'Yes' ? useDetails.numberOfResidentialLivingUnitsInAHighriseSetting.value : undefined,
      numberOfBedrooms: useDetails.numberOfBedrooms && useDetails.numberOfBedrooms.default !== 'Yes' ? useDetails.numberOfBedrooms.value : undefined,
      maximumResidentCapacity: useDetails.maximumResidentCapacity && useDetails.maximumResidentCapacity.default !== 'Yes' ? useDetails.maximumResidentCapacity.value : undefined,
      averageNumberOfResidents: useDetails.averageNumberOfResidents && useDetails.averageNumberOfResidents.default !== 'Yes' ? useDetails.averageNumberOfResidents.value : undefined,
      numberOfResidentialWashingMachines: useDetails.numberOfResidentialWashingMachines && useDetails.numberOfResidentialWashingMachines.default !== 'Yes' ? useDetails.numberOfResidentialWashingMachines.value : undefined,
      numberOfCommercialWashingMachines: useDetails.numberOfCommercialWashingMachines && useDetails.numberOfCommercialWashingMachines.default !== 'Yes' ? useDetails.numberOfCommercialWashingMachines.value : undefined,
      numberOfResidentialElectronicLiftSystems: useDetails.numberOfResidentialElectronicLiftSystems && useDetails.numberOfResidentialElectronicLiftSystems.default !== 'Yes' ? useDetails.numberOfResidentialElectronicLiftSystems.value : undefined,
      plantDesignFlowRate: useDetails.plantDesignFlowRate && useDetails.plantDesignFlowRate.default !== 'Yes' ? useDetails.plantDesignFlowRate.value : undefined,
      averageInfluentBiologicalOxygenDemand: useDetails.averageInfluentBiologicalOxygenDemand && useDetails.averageInfluentBiologicalOxygenDemand.default !== 'Yes' ? useDetails.averageInfluentBiologicalOxygenDemand.value : undefined,
      averageEffluentBiologicalOxygenDemand: useDetails.averageEffluentBiologicalOxygenDemand && useDetails.averageEffluentBiologicalOxygenDemand.default !== 'Yes' ? useDetails.averageEffluentBiologicalOxygenDemand.value : undefined,
      fixedFilmTrickleFiltrationProcess: useDetails.fixedFilmTrickleFiltrationProcess && useDetails.fixedFilmTrickleFiltrationProcess.default !== 'Yes' ? useDetails.fixedFilmTrickleFiltrationProcess.value : undefined,
      nutrientRemoval: useDetails.nutrientRemoval && useDetails.nutrientRemoval.default !== 'Yes' ? useDetails.nutrientRemoval.value : undefined,
      seatingCapacity: useDetails.seatingCapacity && useDetails.seatingCapacity.default !== 'Yes' ? useDetails.seatingCapacity.value : undefined,
    }; */
  });
};

// creates buildee payload based on building model with the information from PM building
const _createNewBuildingPayload = function(
  pmBuilding,
  accountId,
  propertyId,
  userId,
  organizaitonId
) {
  function isValidUSZip(zip) {
    return /^\d{5}(-\d{4})?$/.test(zip);
  }
  const address = pmBuilding.address;
  const zipCode = isValidUSZip(address.postalCode) ? address.postalCode : 80205;
  const customFieldsArray = [];
  let _partition;
  if (organizaitonId) {
    _partition = `${PARTITION_KEYS.BUILDING_LIST}=${organizaitonId.toString()}`;
  }
  const payload = {
    energystar: true,
    energystarIds: [
      {
        accountId,
        buildingId: propertyId
      }
    ],
    projectIds: [],
    utilityIds: [],
    archived: false,
    location: {
      address: address ? address.address1 : "3000 Lawrence St",
      city: address && address.city ? pmBuilding.address.city : "Denver",
      state: address && address.state ? pmBuilding.address.state : "CO",
      zipCode
    },
    clientName: "",
    siteName: "",
    buildingName: pmBuilding.name || "Building Name",
    buildingImage: "",
    floorCount: pmBuilding.numberOfBuildings || 1,
    squareFeet: pmBuilding.grossFloorArea.value || 1000,
    buildYear: pmBuilding.yearBuilt || 2000,
    open247: "no",
    buildingUse: portfolioUtil.getBuildingUse(
      "pm",
      "buildee",
      pmBuilding.primaryFunction
    ),
    createdByUserId: userId,
    customFields: customFieldsArray,
    _partition
  };

  return payload;
};

const _handlePendingAccountInvites = async pendingAccountInvites => {
  await Promise.all(
    pendingAccountInvites.map(async pendingConnection => {
      try {
        const response = await connectionService.acceptAccountInvite({
          portfolioUserId: pendingConnection.accountId
        });
        const portfolioSync = await getPortfolioSyncByAccountId(
          pendingConnection.accountId
        );
        if (!portfolioSync) {
          if (
            response &&
            response.response &&
            response.response.links &&
            response.response.links.link &&
            typeof response.response.links.link === "object"
          ) {
            const portfolioSyncObject = {
              accountId: pendingConnection.accountId,
              email: pendingConnection.accountInfo.email,
              account: pendingConnection.accountInfo,
              username: pendingConnection.connectionAudit.createdBy
            };
            await savePortfolioSync(portfolioSyncObject);
          }
        }
      } catch (err) {
        return util.sendError(
          "Issues contacting Portfolio Manager server (account invite sync)"
        );
      }
    })
  );
};

const fetchAdditionalIdentifiers = async function(propertyId) {
  const customFields = [];
  const identifiers = await propertyService.getBuildingIdentifiers({
    propertyId
  });
  if (identifiers && identifiers.length > 0) {
    await Promise.all(
      identifiers.map(identifier => {
        const customFieldsObject = {
          key: identifier.description,
          value: identifier.value,
          id: identifier.id,
          typeId: identifier.additionalIdentifierType.id,
          standardApproved: identifier.standardApproved
        };
        customFields.push(customFieldsObject);
      })
    );
    return customFields;
  }
};

const setPropertyInformationToBuilding = (buildeeBuilding, property) => {
  if (property.name) {
    buildeeBuilding.buildingName = property.name;
  }

  if (property.address.address1) {
    buildeeBuilding.location.address = property.address.address1;
  }

  if (property.address.city) {
    buildeeBuilding.location.city = property.address.city;
  }

  if (property.address.state) {
    buildeeBuilding.location.state = property.address.state;
  }

  if (property.address.postalCode) {
    buildeeBuilding.location.zipCode = property.address.postalCode;
  }

  if (property.primaryFunction) {
    buildeeBuilding.buildingUse = portfolioUtil.getBuildingUse(
      "pm",
      "buildee",
      property.primaryFunction
    );
  }

  if (property.yearBuilt) {
    buildeeBuilding.buildYear = property.yearBuilt;
  }

  if (
    property.grossFloorArea &&
    property.grossFloorArea.units === "Square Feet" &&
    property.grossFloorArea.value
  ) {
    buildeeBuilding.squareFeet = property.grossFloorArea.value;
  }
};

async function _syncAll() {
  // Sync accounts
  try {
    const pendingAccounts = await connectionService.getPendingAccountConnections();
    if (pendingAccounts.length) {
      await _handlePendingAccountInvites(pendingAccounts);
    }
  } catch (err) {
    // Do nothing
  }
  // Sync meters
  try {
    const pendingMeters = await connectionService.getPendingMeterInvites({
      returnOnlyIds: true
    });
    if (pendingMeters.length) {
      await connectionService.acceptMeterInvites({
        meterIds: pendingMeters.map(meter => meter.meterId)
      });
    }
  } catch (err) {
    // Do nothing
  }
  // Sync properties
  try {
    const pendingProperties = await connectionService.getPendingPropertyInvites(
      { returnOnlyIds: true }
    );
    if (pendingProperties.length) {
      await connectionService.acceptPropertyInvites({
        propertyIds: pendingProperties.map(property => property.propertyId)
      });
    }
  } catch (err) {
    // Do nothing
  }
}

let _finishedRunPmImport = false;
let importResponse = [];

const _runPmImport = async function(req) {
  // Sync accounts, meters and properties before import
  await _syncAll();

  const userId = req.user._id;
  const organization = req.organization;
  let buildingIds = [];
  const tempImportResponse = [];

  // loop over buildings
  await Promise.all(
    req.body.map(async function(propertyDetails) {
      const propertyAccountId = propertyDetails.accountId;
      const propertyId = propertyDetails.id;
      const buildingResponse = {
        id: propertyId,
        message: []
      };

      const { property } = await propertyService.getCustomerProperty(
        propertyId
      );
      if (property && Object.keys(property).length > 0) {
        try {
          const { meterData, errorData } = await _getMeterData(propertyId);
          // creates a buildee building returning buildingdetails with new messages concerning their status
          const buildingPayload = await _createNewBuildingPayload(
            property,
            propertyAccountId,
            propertyId,
            userId,
            organization._id
          );
          const buildeeBuilding = await saveBuilding(buildingPayload);
          buildeeBuilding.customFields = await fetchAdditionalIdentifiers(
            propertyId
          );
          buildingIds.push(buildeeBuilding._id);
          await setPropertyUses(buildeeBuilding, propertyId);
          buildingResponse.message = await _setUtilities(
            buildeeBuilding,
            meterData,
            propertyId,
            false
          );
          await buildeeBuilding.save();
          if (errorData) {
            buildingResponse.message.push(errorData);
          } else {
            buildingResponse.message.push("Building Saved Successfully");
          }
          tempImportResponse.push(buildingResponse);
        } catch (err) {
          buildingResponse.message.push({
            text: "There was a problem while saving your building. " + err,
            type: "error",
            link:
              "https://intercom.help/buildee/en/articles/4655340-import-properties-from-energy-star-portfolio-manager"
          });
          tempImportResponse.push(buildingResponse);
        }
      } else {
        // could not find corresponding building in PM or building has not been shared with simuwatt
        buildingResponse.message.push("Could not find shared property in PM.");
        tempImportResponse.push(buildingResponse);
      }
    })
  );

  const log = {
    user: req.user,
    date: Date.now(),
    log: tempImportResponse
  };

  organization.portfolioSyncHistory.import.unshift(log);
  if (organization.portfolioSyncHistory.import.length >= 3) {
    organization.portfolioSyncHistory.import.length = 3;
  }
  organization.buildingIds = organization.buildingIds.concat(buildingIds);
  await organization.save();
  buildingIds = [...new Set(buildingIds)];
  await buildingSyncScript.sync({
    organizationId: organization._id,
    buildingIds: buildingIds,
    onlyRemove: false
  });
  importResponse = tempImportResponse;
  _finishedRunPmImport = true;
};

let _finishedRunPmImportUpdate = false;
let importUpdateResponse = [];

const _runPmImportUpdate = async function(req) {
  // Sync accounts, meters and properties before import
  await _syncAll();
  const tempImportUpdateResponse = [];
  const buildingsInOrg = await getBuildings(req.organization.buildingIds);
  let buildingIds = [];
  // loop over buildings
  await Promise.all(
    req.body.map(async function(propertyDetails) {
      const accountId = propertyDetails.accountId;
      const propertyId = propertyDetails.id;
      const buildingResponse = {
        id: propertyId,
        message: []
      };
      const buildeeBuilding = buildingsInOrg.find(obj => {
        return obj.energystarIds.find(obj => {
          return (
            obj.buildingId === Number(propertyId) && obj.accountId === accountId
          );
        });
      });
      buildeeBuilding.customFields = await fetchAdditionalIdentifiers(
        propertyId
      );
      buildeeBuilding.markModified("customFields");
      const { property } = await propertyService.getCustomerProperty(
        propertyDetails.id
      );
      setPropertyInformationToBuilding(buildeeBuilding, property);
      buildingIds.push(buildeeBuilding._id);
      await setPropertyUses(buildeeBuilding, propertyId);
      try {
        const { meterData, errorData } = await _getMeterData(propertyId);
        buildingResponse.message = await _setUtilities(
          buildeeBuilding,
          meterData,
          propertyId,
          true
        );
        buildeeBuilding.updated = Date.now();
        await buildeeBuilding.save();
        if (errorData) {
          buildingResponse.message.push(errorData);
        } else {
          buildingResponse.message.push("Update Successful");
        }
        tempImportUpdateResponse.push(buildingResponse);
      } catch (err) {
        buildingResponse.message.push({
          text: "There was a problem saving your building. " + err,
          type: "error",
          link:
            "https://intercom.help/buildee/en/articles/4655340-import-properties-from-energy-star-portfolio-manager"
        });
        tempImportUpdateResponse.push(buildingResponse);
      }
    })
  );

  const log = {
    user: req.user,
    date: Date.now(),
    log: tempImportUpdateResponse
  };

  req.organization.portfolioSyncHistory.import.unshift(log);

  if (req.organization.portfolioSyncHistory.import.length >= 3) {
    req.organization.portfolioSyncHistory.import.length = 3;
  }

  await req.organization.save();
  buildingIds = buildingIds.map(id => id.toString());
  buildingIds = [...new Set(buildingIds)];
  if (buildingIds.length) {
    await buildingSyncScript.sync({
      organizationId: req.organization._id,
      buildingIds: buildingIds,
      onlyRemove: false
    });
  }
  _finishedRunPmImportUpdate = true;
  importUpdateResponse = tempImportUpdateResponse;
};

exports.pmImport = function(req, res, next) {
  if (req.query.run === "true") {
    _runPmImport(req, res, next);

    res.sendResult = {
      status: "Success",
      message: "Import buildee Buildings Started"
    };
    return next();
  } else {
    if (_finishedRunPmImport) {
      res.sendResult = {
        status: "Success",
        message: "Imported PM Building(s).",
        importResponse
      };
      return next();
    } else {
      res.sendResult = {
        status: "Warning",
        message: "Run Import Pm Building(s) Incomplete."
      };
      return next();
    }
  }
};

exports.pmImportUpdate = function(req, res, next) {
  if (req.query.run === "true") {
    importUpdateResponse = [];
    _finishedRunPmImportUpdate = false;
    _runPmImportUpdate(req, res, next);

    res.sendResult = {
      status: "Success",
      message: "Update buildee Buildings Started"
    };
    return next();
  } else {
    if (_finishedRunPmImportUpdate) {
      res.sendResult = {
        status: "Success",
        message: "Updated buildee Building(s) Successfully.",
        importUpdateResponse
      };
      return next();
    } else {
      res.sendResult = {
        status: "Warning",
        message: "Run Update buildee Building(s) Incomplete."
      };
      return next();
    }
  }
};
