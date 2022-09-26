
const { MonthlyUtility } = require("../../models/monthlyutility.script.model");
const utils = require("../mongo.utils");
const mongoose = require("mongoose");

exports.findByBuildingIds = (ids, extraFilter) => {
  const mappedIds = utils.mapStringArrayIntoObjectIdArray(ids);
  let filter = {};
  filter["building"] = {
    "$in": mappedIds
  };
  filter = Object.assign(filter, extraFilter);
  return MonthlyUtility.find(filter);
}

exports.findByBuildingIdsStartEndDates = (ids, startDate, endDate) => {
  let filter = {
    date: {
      $gte: startDate.toDate(),
      $lte: endDate.toDate()
    }
  };
  return exports.findByBuildingIds(ids, filter);
}

exports.insertMany = monthlyUtilities => {
  if (monthlyUtilities) {
    monthlyUtilities.forEach(monthlyUtility => {
      if (typeof monthlyUtility._id === "string") monthlyUtility._id = mongoose.Types.ObjectId(monthlyUtility._id);
    });
  }
  return MonthlyUtility.insertMany(monthlyUtilities);
}

exports.deleteManyByBuildingIdAndYear = (buildingId, year) => {
  if (!year || !buildingId) throw Error("Arguments are mandatory");
  return MonthlyUtility.deleteMany({ building: mongoose.Types.ObjectId(buildingId), year });
}