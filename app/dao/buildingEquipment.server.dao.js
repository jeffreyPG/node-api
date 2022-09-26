const mongoose = require("mongoose");
const BuildingEquipment = mongoose.model("BuildingEquipment");

async function findByIdOrCreate(identity, attributes) {
  try {
    const found = await BuildingEquipment.findById(identity);
    if (found === null) {
      return BuildingEquipment.create({ _id: identity, ...attributes });
    }
    return found;
  } catch (err) {
    console.error(err);
  }
}

async function findOneAndInsertConfiguration(identity, configuration) {
  try {
    const found = await BuildingEquipment.findById(identity);
    if (found === null) {
      console.log("Could not find BuildingEquipment");
      return null;
    }
    console.log("Found BuildingEquipment");
    return BuildingEquipment.updateOne(
      { _id: identity },
      {
        $push: {
          configs: configuration
        }
      }
    );
  } catch (err) {
    console.error(err);
  }
}

async function findOneAndUpdateConfiguration(identity, configuration, index) {
  try {
    const found = await BuildingEquipment.findById(identity);
    if (found === null) {
      console.log("Could not find BuildingEquipment");
      return null;
    }
    console.log("UPDATE", index, configuration);
    return BuildingEquipment.updateOne(
      { _id: identity },
      {
        $set: {
          [`configs.${index}`]: configuration
        }
      }
    );
  } catch (err) {
    console.error(err);
  }
}

async function findByBuilding(building) {
  return BuildingEquipment.find({ building, isArchived: { $ne: true } });
}

module.exports = {
  findByIdOrCreate,
  findOneAndInsertConfiguration,
  findOneAndUpdateConfiguration,
  findByBuilding
};
