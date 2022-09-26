/**
 * SalesForce Organization functions
 */
"use strict";

/**
 * Module dependencies.
 */
const _ = require("lodash");
let salesforceSync = require("./salesforce.sync");
const useTypes = require("../static/building-use-types");
const mongoose = require("mongoose");

/**
 * Standard Mapping for a Buildee Organization to SalesForce Organization
 */
const _createMappedOrganization = async function(o, org) {
    let sfOrganization = o.toObject();

    sfOrganization._id = { "$oid": o._id };
    sfOrganization.userIds = [];
    for (let userData of o.users) {
        sfOrganization.userIds.push(userData.userId.toString());
    }

    return sfOrganization;
};

/**
 * Syncs organizations using endpoint with salesforce
 * @param conn
 * @param organizations
 * @param buildingPageObjects
 * @param account
 * @private
 */
const _syncOrganizations = async function(conn, organizations, buildingPageObjects, account) {
    await conn.apex.post("/buildEE/UpdateOrganizations/", organizations, function(err, res) {
        if (err) { return console.error(err); }

        let sfIdMap = {};
        for (let r of res) {
            if (res.errorDescriptions) {
                console.error("Failed to sync organization with salesforce", res.errorDescriptions);
                continue;
            }
            sfIdMap[r.buildeeId] = r.SFID;
        }

        if (account) {
            salesforceSync.syncSFIds(sfIdMap, buildingPageObjects, account);
        }
    });
};

/**
 * Inserts/Updates organization objects in salesforce
 * @param organizations
 * @param organization
 * @param sfAccountToUpdate
 */
const updateOrganizations = async function(organizations, organization, sfAccountToUpdate="") {
    await salesforceSync.updateDocuments(organizations, organization, _syncOrganizations, _createMappedOrganization, sfAccountToUpdate);
};


module.exports = {
    updateOrganizations,
    _createMappedOrganization,
};