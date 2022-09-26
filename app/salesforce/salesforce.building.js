/**
 * SalesForce Building functions
 */
"use strict";

/**
 * Module dependencies.
 */
const _ = require("lodash");
let salesforceSync = require("./salesforce.sync");
const useTypes = require("../static/building-use-types");
const mongoose = require("mongoose");
const User = mongoose.model("User");


/**
 * Standard Mapping for a Buildee Building to SalesForce Building
 */
const _createMappedBuilding = async function(b, org) {
    let sfBuilding = b.toObject();

    sfBuilding._id = { "$oid": b._id };
    sfBuilding.organizationName = org.name;
    sfBuilding.organizationId = org._id.toString();
    sfBuilding.buildingUse = _.defaultTo(useTypes.find(useType => useType.value === b.buildingUse), {name: ""}).name;

    sfBuilding.createdByUserName = "";
    if (sfBuilding.createdByUserId) {
        let user = await User.findOne({_id: sfBuilding.createdByUserId});
        if (user) sfBuilding.createdByUserName = user.name;
    }

    return sfBuilding;
};

/**
 * Syncs buildings using endpoint with salesforce
 * @param conn
 * @param buildings
 * @param buildingPageObjects
 * @param account
 * @private
 */
const _syncBuildings = async function(conn, buildings, buildingPageObjects, account) {
  await conn.apex.post("/buildEE/UpdateBuildings/", buildings, function(err, res) {
      if (err) { return console.error(err); }

      let sfIdMap = {};
      for (let r of res) {
          if (res.errorDescriptions) {
              console.error("Failed to sync building with salesforce", res.errorDescriptions);
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
 * Inserts/Updates building objects in salesforce
 * @param buildings
 * @param organization
 * @param sfAccountToUpdate
 */
const updateBuildings = async function(buildings, organization, sfAccountToUpdate="") {
  await salesforceSync.updateDocuments(buildings, organization, _syncBuildings, _createMappedBuilding, sfAccountToUpdate);
};


module.exports = {
    updateBuildings,
    _createMappedBuilding,
};