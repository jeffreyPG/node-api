const mongoose = require("mongoose");
const Utility = mongoose.model("Utility");

async function getUtilityById (id) {
  return Utility.findById(id);
}

async function getUtilityByMeterId (meterId) {
  return Utility.findOne({ portfolioManagerMeterId: meterId });
}

async function saveUtility (utilityObject) {
  const utility = new Utility(utilityObject);
  return utility.save();
}

async function deleteUtility (id) {
  return Utility.findByIdAndRemove(id);
}

async function getUtilitiesByUtilType (utilType) {
  return Utility.findById({ utilType });
}

module.exports = {
  getUtilityById,
  getUtilityByMeterId,
  saveUtility,
  deleteUtility,
  getUtilitiesByUtilType,
};
