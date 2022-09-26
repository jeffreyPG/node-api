"use strict";

const fs = require("fs");
const path = require("path");

const _ = require("lodash");
const moment = require("moment");
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;
const Organization = mongoose.model("Organization");
const Building = mongoose.model("Building");
const datawarehouseDb = require("../models/datawarehouse");

const { horizontalLine } = require("./utils/log.utils");

const logFilePath = path.join(
  __dirname,
  "/logs/organization.building.sync.logs"
);

const sync = async (options = null) => {
  try {
    fs.appendFileSync(
      logFilePath,
      `\n${horizontalLine(120, "-")}\n${moment()
        .utc()
        .toLocaleString()} Script Started\n${horizontalLine(120, "-")}\n`
    );
    const organization = await Organization.findById(options.organizationId);
    let buildingIds = (options && options.buildingIds) || [];
    let organizationBuildingIds = organization.buildingIds || [];
    buildingIds = buildingIds.map(id => id.toString());
    organizationBuildingIds = organizationBuildingIds.map(id => id.toString());
    if (buildingIds.length === 0) buildingIds = organizationBuildingIds;

    const buildings = await getBuildings(buildingIds);
    const onlyRemove = (options && options.onlyRemove) || false;

    for (let building of buildings) {
      await datawarehouseDb.Building.destroy({
        where: { _id: building._id.toString() }
      });
      if (!!onlyRemove) continue;
      let buildingBody = {
        _id: building._id.toString(),
        _sdc_batched_at: Date.now(),
        _sdc_extracted_at: Date.now(),
        _sdc_received_at: Date.now(),
        _sdc_sequence: 0,
        _sdc_table_version: 0,
        archived: building.archived,
        buildYear: building.buildYear,
        buildingImage: building.buildingImage,
        buildingName: building.buildingName,
        buildingUse: building.buildingUse,
        clientName: building.clientName,
        created: building.created,
        createdByUserId: building.createdByUserId.toString(),
        energystar: building.energystar,
        floorCount: building.floorCount || 0,
        belowgradefloorcount: building.belowGradeFloorCount || 0,
        location__address:
          (building.location && building.location.address) || "",
        location__city: (building.location && building.location.city) || "",
        location__state: (building.location && building.location.state) || "",
        location__zipCode:
          (building.location && building.location.zipCode) || "",
        nycFields__bin: (building.nycFields && building.nycFields.bin) || "",
        nycFields__borough:
          (building.nycFields && building.nycFields.borough) || "",
        nycFields__historicBuilding:
          (building.nycFields && building.nycFields.historicBuilding) || "",
        nycFields__multiTenant:
          (building.nycFields && building.nycFields.historicBuilding) || "",
        nycFields__percentLeased:
          (building.nycFields && building.nycFields.percentLeased) || "",
        nycFields__percentOwned:
          (building.nycFields && building.nycFields.percentOwned) || "",
        nycFields__taxLot:
          (building.nycFields && building.nycFields.taxLot) || "",
        nycFields__block:
          (building.nycFields && building.nycFields.block) || "",
        open247: building.open247,
        rates__diesel: (building.rates && building.rates.diesel) || 0,
        rates__dieselGHG: (building.rates && building.rates.dieselGHG) || 0,
        rates__discountRate:
          (building.rates && building.rates.discountRate) || 0,
        rates__electric: (building.rates && building.rates.electric) || 0,
        rates__electricGHG: (building.rates && building.rates.electricGHG) || 0,
        rates__financeRate: (building.rates && building.rates.financeRate) || 0,
        rates__fuel: (building.rates && building.rates.fuel) || 0,
        rates__fueloil2: (building.rates && building.rates.fuelOil2) || 0,
        rates__fuelOil2GHG: (building.rates && building.rates.fuelOil2GHG) || 0,
        rates__fuelOil4: (building.rates && building.rates.fuelOil4) || 0,
        rates__fuelOil4GHG: (building.rates && building.rates.fuelOil4GHG) || 0,
        rates__fuelOil56: (building.rates && building.rates.fuelOil56) || 0,
        rates__fuelOil56GHG:
          (building.rates && building.rates.fuelOil56GHG) || 0,
        rates__gas: (building.rates && building.rates.gas) || 0,
        rates__gasGHG: (building.rates && building.rates.gasGHG) || 0,
        rates__inflationRate:
          (building.rates && building.rates.inflationRate) || 0,
        rates__investmentPeriod:
          (building.rates && building.rates.investmentPeriod) || 0,
        rates__other: (building.rates && building.rates.other) || 0,
        rates__reinvestmentRate:
          (building.rates && building.rates.reinvestmentRate) || 0,
        rates__steam: (building.rates && building.rates.stream) || 0,
        rates__steamGHG: (building.rates && building.rates.streamGHG) || 0,
        rerunAnalyses: building.rerunAnalyses,
        siteName: building.siteName,
        squareFeet: building.squareFeet,
        updated: building.updated,
        "changePointModels__natural-gas__baseload":
          (building.changePointModels &&
            building.changePointModels["natural-gas"] &&
            building.changePointModels["natural-gas"].baseload) ||
          0,
        changePointModels__electric__cooling_sensitivity:
          (building.changePointModels &&
            building.changePointModels["electric"] &&
            building.changePointModels["electric"].cooling_sensitivity) ||
          0,
        "changePointModels__natural-gas__heating_sensitivity":
          (building.changePointModels &&
            building.changePointModels["natural-gas"] &&
            building.changePointModels["natural-gas"].heating_sensitivity) ||
          0,
        changePointModels__steam__baseload:
          (building.changePointModels &&
            building.changePointModels.steam &&
            building.changePointModels.steam.baseload) ||
          0,
        changePointModels__electric__heating_sensitivity:
          (building.changePointModels &&
            building.changePointModels["electric"] &&
            building.changePointModels["electric"].heating_sensitivity) ||
          0,
        changePointModels__electric__baseload:
          (building.changePointModels &&
            building.changePointModels.electric &&
            building.changePointModels.electric.baseload) ||
          0,
        changePointModels__electric__heating_change_point:
          (building.changePointModels &&
            building.changePointModels.electric &&
            building.changePointModels.electric.heating_change_point) ||
          0,
        changePointModels__steam__heating_sensitivity:
          (building.changePointModels &&
            building.changePointModels.steam &&
            building.changePointModels.steam.heating_sensitivity) ||
          0,
        "changePointModels__natural-gas__heating_change_point":
          (building.changePointModels &&
            building.changePointModels["natural-gas"] &&
            building.changePointModels["natural-gas"].heating_change_point) ||
          0,
        changePointModels__steam__heating_change_point:
          (building.changePointModels &&
            building.changePointModels.steam &&
            building.changePointModels.steam.heating_change_point) ||
          0,
        changePointModels__electric__cooling_change_point:
          (building.changePointModels &&
            building.changePointModels.electric &&
            building.changePointModels.electric.cooling_change_point) ||
          0
      };
      await datawarehouseDb.Building.create(buildingBody);
      fs.appendFileSync(logFilePath, `Building ${building._id} synced\n`);
    }

    fs.appendFileSync(logFilePath, `Finished Building Sync\n`);
    // organization building ids sync
    buildingIds = buildings.map(building => building._id.toString());
    await datawarehouseDb.OrganizationBuilding.destroy({
      where: {
        _sdc_source_key__id: organization._id.toString(),
        value: buildingIds
      }
    });
    buildingIds = [...new Set(buildingIds)];
    let maxKey = await datawarehouseDb.OrganizationBuilding.max(
      "_sdc_level_0_id",
      {
        where: {
          _sdc_source_key__id: organization._id.toString()
        }
      }
    );
    maxKey = maxKey || 0;
    maxKey++;

    for (let i = 0; i < buildingIds.length; i++) {
      try {
        await datawarehouseDb.OrganizationBuilding.create({
          _sdc_source_key__id: organization._id.toString(),
          _sdc_level_0_id: maxKey + i,
          value: buildingIds[i],
          _sdc_batched_at: Date.now(),
          _sdc_received_at: Date.now(),
          _sdc_sequence: 0,
          _sdc_table_version: 0
        });
      } catch (error) {
        console.log("error", error);
      }
    }
    fs.appendFileSync(logFilePath, `Organization Synced\n`);
  } catch (error) {
    console.error(error);
    console.log(error);
  } finally {
    fs.appendFileSync(logFilePath, `Script Ended...\n`);
  }
};

const getBuildings = async (buildingIds = []) => {
  try {
    fs.appendFileSync(logFilePath, `Getting Buildings Data...\n`);
    const filter = {};
    if (buildingIds && buildingIds.length) {
      buildingIds = buildingIds.map(bid => ObjectId(bid));
      filter["_id"] = {
        $in: buildingIds
      };
    }
    const buildings = await Building.find(filter)
      .lean()
      .exec();
    return Promise.resolve(buildings);
  } catch (error) {
    fs.appendFileSync(logFilePath, `Error: ${error}\n`);
    return Promise.resolve([]);
  }
};

module.exports = {
  sync
};
