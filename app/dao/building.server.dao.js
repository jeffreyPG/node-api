const mongoose = require("mongoose");
const Building = mongoose.model("Building");

async function findByIdOrCreate(identity, attributes) {
  try {
    const found = await Building.findById(identity);
    if (found === null) {
      console.log(attributes);
      return Building.create({ _id: identity, ...attributes });
    }
    return found;
  } catch (err) {
    console.error(err);
  }
}

async function getBuildings(idList) {
  return Building.find({ _id: { $in: idList } }).populate("utilityIds");
}

async function getBuildingById(id) {
  return Building.findById(id).populate("utilityIds");
}

async function saveBuilding(buildingObject) {
  const building = new Building(buildingObject);
  return building.save();
}

module.exports = {
  findByIdOrCreate,
  getBuildings,
  getBuildingById,
  saveBuilding
};
