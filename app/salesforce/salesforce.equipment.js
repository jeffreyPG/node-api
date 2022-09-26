/**
 * SalesForce Equipment functions
 */
"use strict";

/**
 * Module dependencies.
 */
const _ = require("lodash");
let salesforceSync = require("./salesforce.sync");
const mongoose = require("mongoose");
const Equipment = mongoose.model("Equipment");
const Location = mongoose.model("Location");
const EquipmentCategorization = mongoose.model("EquipmentCategorization");
const EquipmentSchema = mongoose.model("EquipmentSchema");


/**
 * Standard Mapping for a Buildee Equipment to SalesForce Equipment
 */
const _createMappedEquipment = async function(e, org) {
    let sfEquipment = e.toObject();
    let equipmentType = await Equipment.findById(e.libraryEquipment);

    let catQuery = { "category.value": equipmentType.category };
    if (equipmentType.application) catQuery["application.value"] = equipmentType.application;
    if (equipmentType.technology) catQuery["technology.value"] = equipmentType.technology;

    let equipmentCategorization = await EquipmentCategorization.findOne(catQuery);

    delete sfEquipment.images;

    let configs = {};
    for (let c of e.configs) {
        configs[c.field] = c.value;
    }
    for (let f in equipmentType.fields) {
        configs[f] = equipmentType.fields[f].value;
    }

    sfEquipment._id = { "$oid": e._id };
    sfEquipment.category = _.get(equipmentCategorization, "category.displayName", "");
    sfEquipment.application = _.get(equipmentCategorization, "application.displayName", "");
    sfEquipment.technology = _.get(equipmentCategorization, "technology.displayName", "");
    sfEquipment.name = equipmentType.name;
    sfEquipment.fields = {
        manufacturer: configs.manufacturer || configs.brand || _.get(equipmentType, "fields.manufacturer.value", "") || _.get(equipmentType, "fields.brand.value", ""),
        model: configs.model || _.get(equipmentType, "fields.model.value", "")
    };
    sfEquipment.fuel = equipmentType.fuel;
    sfEquipment.yearOfInstallation = configs.yearOfInstallation;
    sfEquipment.conditionRating = configs.conditionRating;
    sfEquipment.buildingId = e.building;

    if (e.location) {
        sfEquipment.location = (await Location.findById(e.location)).name;
    }

    // Find first capacity field if there is one and populate with unit type
    sfEquipment.capacity = 0.0;
    sfEquipment.capacityUnit = "";
    let equipmentSchema = await EquipmentSchema.findOne({ type: equipmentCategorization.type.value });
    let capacityFieldsRanked = [];
    for (let f of equipmentSchema.fields) {
        if (f.capacityField > 0) {
            capacityFieldsRanked.push([f.field, f.capacityField]);
        }
    }
    capacityFieldsRanked = capacityFieldsRanked.sort(function(a, b) {
        return a[1] - b[1];
    });
    let capacityFields = [];
    for (let a of capacityFieldsRanked) {
        capacityFields.push(a[0]);
    }
    for (let fieldName of capacityFields) {
        if (!Object.keys(configs).includes(fieldName)) {
            continue;
        }
        sfEquipment.capacity = configs[fieldName] || 0.0;
        if (!sfEquipment.capacity) continue;
        if (typeof(sfEquipment.capacity) === "string") {
            sfEquipment.capacity = parseFloat(sfEquipment.capacity);
        }
        let allFields = equipmentSchema.configs;
        allFields.push(...equipmentSchema.fields);
        let schemaField = allFields.find(f => f.field === fieldName);
        if (schemaField && schemaField.units) {
            sfEquipment.capacityUnit = schemaField.units;
        }
        break;
    }

    return sfEquipment;
};

/**
 * Syncs equipment using endpoint with salesforce
 * @param conn
 * @param equipment
 * @param equipmentPageObjects
 * @param account
 * @private
 */
const _syncEquipment = async function(conn, equipment, equipmentPageObjects, account) {
    await conn.apex.post("/buildEE/UpdateEquipments/", equipment, function(err, res) {
        if (err) { return console.error(err); }

        let sfIdMap = {};
        for (let r of res) {
            if (res.errorDescriptions) {
                console.error("Failed to sync equipment with salesforce", res.errorDescriptions);
                continue;
            }
            sfIdMap[r.buildeeId] = r.SFID;
        }

        if (account) {
            salesforceSync.syncSFIds(sfIdMap, equipmentPageObjects, account);
        }
    });
};

/**
 * Inserts/Updates equipment objects in salesforce
 * @param equipments
 * @param organization
 * @param sfAccountToUpdate
 */
const updateEquipment = async function(equipments, organization, sfAccountToUpdate="") {
    await salesforceSync.updateDocuments(equipments, organization, _syncEquipment, _createMappedEquipment, sfAccountToUpdate);
};


module.exports = {
    updateEquipment,
    _createMappedEquipment
};