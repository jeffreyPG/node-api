/**
 * SalesForce User functions
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
 * Standard Mapping for a Buildee User to SalesForce User
 */
const _createMappedUser = async function(u, org) {
    let sfUser = u.toObject();

    sfUser._id = { "$oid": u._id };
    sfUser.organizationIds = [];
    for (let orgId of u.orgIds) {
        sfUser.organizationIds.push(orgId.toString());
    }

    return sfUser;
};

/**
 * Syncs users using endpoint with salesforce
 * @param conn
 * @param users
 * @param buildingPageObjects
 * @param account
 * @private
 */
const _syncUsers = async function(conn, users, buildingPageObjects, account) {
    await conn.apex.post("/buildEE/UpdateUsers/", users, function(err, res) {
        if (err) { return console.error(err); }

        let sfIdMap = {};
        for (let r of res) {
            if (res.errorDescriptions) {
                console.error("Failed to sync user with salesforce", res.errorDescriptions);
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
 * Inserts/Updates user objects in salesforce
 * @param users
 * @param organization
 * @param sfAccountToUpdate
 */
const updateUsers = async function(users, organization, sfAccountToUpdate="") {
    await salesforceSync.updateDocuments(users, organization, _syncUsers, _createMappedUser, sfAccountToUpdate);
};


module.exports = {
    updateUsers,
    _createMappedUser,
};