/**
 * SalesForce Project Package functions
 */
"use strict";

/**
 * Module dependencies.
 */
let salesforceSync = require("./salesforce.sync");


/**
 * Standard Mapping for a Buildee Measure to SalesForce Measure
 */
const _createMappedProject = async function(p, org) {
    let sfProject;
    try {
        sfProject = p.toObject();
    } catch (e) {
        sfProject = p;
    }

    sfProject._id = { "$oid": p._id };
    sfProject.organizationName = org.name;

    sfProject.created = { "$date": p.created };
    sfProject.updated = { "$date": p.updated };
    sfProject.estimatedStartDate = { "$date": p.estimatedStartDate };
    sfProject.estimatedCompletionDate = { "$date": p.estimatedCompletionDate };
    sfProject.actualStartDate = { "$date": p.actualStartDate };
    sfProject.actualCompletionDate = { "$date": p.actualCompletionDate };

    return sfProject;
};

/**
 * Syncs measure using endpoint with salesforce
 * @param conn
 * @param projects
 * @param projectPageObjects
 * @param account
 * @private
 */
const _syncProjects = async function(conn, projects, projectPageObjects, account) {
    await conn.apex.post("/buildEE/UpdateProjects/", projects, function(err, res) {
        if (err) { return console.error(err); }

        let sfIdMap = {};
        for (let r of res) {
            if (res.errorDescriptions) {
                console.error("Failed to sync project with salesforce", res.errorDescriptions);
                continue;
            }
            sfIdMap[r.buildeeId] = r.SFID;
        }

        if (account) {
            salesforceSync.syncSFIds(sfIdMap, projectPageObjects, account);
        }
    });
};

/**
 * Inserts/Updates building objects in salesforce
 * @param projects
 * @param organization
 * @param sfAccountToUpdate
 */
const updateProjects = async function(projects, organization, sfAccountToUpdate="") {
    await salesforceSync.updateDocuments(projects, organization, _syncProjects, _createMappedProject, sfAccountToUpdate);
};


module.exports = {
    updateProjects,
};
