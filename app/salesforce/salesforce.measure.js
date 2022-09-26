/**
 * SalesForce Measure functions
 */
"use strict";

/**
 * Module dependencies.
 */
const _ = require("lodash");
let salesforceSync = require("./salesforce.sync");
const mongoose = require("mongoose");
const Building = mongoose.model("Building");


/**
 * Standard Mapping for a Buildee Measure to SalesForce Measure
 */
const _createMappedMeasure = async function(m, org) {
    let sfMeasure = m.toObject();
    sfMeasure._id = { "$oid": m._id };
    sfMeasure.organizationName = org.name;

    let building = await Building.findOne({"projectIds": m._id});
    sfMeasure.buildingId = building._id;
    sfMeasure.projectId = m.package;
    sfMeasure.created = { "$date": m.created };
    sfMeasure.updated = { "$date": m.updated };

    if (sfMeasure.runResults) {
        let runResult = sfMeasure.runResults[building._id];

        runResult = _.omitBy(runResult, _.isNull);

        // TODO: get these from metric if possible
        runResult.annualCostSavings = Object.values(_.get(runResult, "annual-savings", {})).reduce((a, b) => a + b, 0.0);
        runResult.annualEnergySavings = Object.values(_.get(runResult, "energy-savings", {})).reduce((a, b) => a + b, 0);
        runResult.electricSavings = _.get(runResult, "annual-savings.electric-charge", 0);
        runResult.gasSavings = _.get(runResult, "annual-savings.gas-charge", 0);
        runResult.waterSavings = _.get(runResult, "annual-savings.water-charge", 0);
        runResult.ghgSavings = _.get(runResult, "ghg", 0);
        runResult.costGhg = _.get(runResult, "ghg-cost", 0);
        let roiNumerator = runResult.annualCostSavings + _.get(sfMeasure, "initialValues.maintenance_savings", 0.0);
        runResult.roi = roiNumerator / (_.get(sfMeasure, "initialValues.project_cost", 0.0) - _.get(runResult, "utility-incentive", 0.0));
        runResult.simplePayback = _.get(runResult, "cash-flows.simple_payback", 0);
        runResult.npv = _.get(runResult, "cash-flows.cash_flows.9.NPV", 0);
        runResult.sir = _.get(runResult, "cash-flows.cash_flows.9.SIR", 0);

        sfMeasure.runResults = runResult;
    }

    sfMeasure.isEditable = sfMeasure.name === "multiCustomOffline";
    if (!sfMeasure.imageUrls) sfMeasure.imageUrls = [];

    return sfMeasure;
};

/**
 * Syncs measure using endpoint with salesforce
 * @param conn
 * @param measures
 * @param measurePageObjects
 * @param account
 * @private
 */
const _syncMeasures = async function(conn, measures, measurePageObjects, account) {
    await conn.apex.post("/buildEE/UpdateMeasures/", measures, function(err, res) {
        if (err) { return console.error(err); }

        let sfIdMap = {};
        for (let r of res) {
            if (res.errorDescriptions) {
                console.error("Failed to sync measure with salesforce", res);
                continue;
            }
            sfIdMap[r.buildeeId] = r.SFID;
        }

        if (account) {
            salesforceSync.syncSFIds(sfIdMap, measurePageObjects, account);
        }
    });
};

/**
 * Inserts/Updates building objects in salesforce
 * @param measures
 * @param organization
 * @param sfAccountToUpdate
 */
const updateMeasures = async function(measures, organization, sfAccountToUpdate="") {
    await salesforceSync.updateDocuments(measures, organization, _syncMeasures, _createMappedMeasure, sfAccountToUpdate);
};


module.exports = {
    updateMeasures,
    _createMappedMeasure
};
