
const { Building } = require("../../models/building.server.model");
const utils = require("../mongo.utils");

/**
 * Find buildings by utility ids
 * 
 * @param {string[]} utilityIds utility ids
 */
exports.findByUtilityIds = utilityIds => {
  const mappedIds = utils.mapStringArrayIntoObjectIdArray(utilityIds);
  let filter = {};
  filter["utilityIds"] = {
    "$in": mappedIds
  };
  return Building.find(filter);
}

/**
 * Find buildings by ids
 * 
 * @param {string[]} ids building ids list
 * @param {object} extraFilter extra filter to be added to existing one
 * @param {object} projection properties to be returned
 */
exports.findByIds = (ids, extraFilter, projection) => {
  const mappedIds = utils.mapStringArrayIntoObjectIdArray(ids);
  let filter = {};
  filter["_id"] = {
    "$in": mappedIds
  };
  filter = Object.assign(filter, extraFilter);
  return Building.find(filter, projection);
}

/**
 * Find buildings with utility data filtered by ids
 * 
 * @param {string[]} ids building ids list
 */
exports.findByIdsWithUtilityData = ids => {
  const filter = {
    "utilityIds.0": { "$exists": true }
  };
  return exports.findByIds(ids, filter);
}

/**
 * Find building Ids with utility data
 */
exports.findIdsWithUtilityData = () => {
  const filter = {
    "utilityIds.0": { "$exists": true }
  };
  return Building.find(filter, { _id: 1 });
}

/**
 * Find zip codes from building that have zipcode and utilities
 * @param {string[]} ids building ids list
 */
exports.findZipCodesByBuildingIds = ids => {
  const filter = {
    "location": { "$exists": true },
    "location.zipCode": { "$exists": true },
    "utilityIds.0": { "$exists": true }
  };
  const projection = { "location.zipCode": 1, "_id": 0 };
  return exports.findByIds(ids, filter, projection).distinct("location.zipCode");
}