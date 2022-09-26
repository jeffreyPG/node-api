
const { Organization } = require("../../models/organization.server.model");
const utils = require("../mongo.utils");

exports.findByIds = (ids, extraFilter) => {
  const mappedIds = utils.mapStringArrayIntoObjectIdArray(ids);
  let filter = {};
  filter["_id"] = {
    "$in": mappedIds
  };
  filter = Object.assign(filter, extraFilter);
  return Organization.find(filter);
}

exports.findByIdsWithBuildings = ids => {
  const filter = {
    "buildingIds.0": { "$exists": true }
  };
  return exports.findByIds(ids, filter);
}