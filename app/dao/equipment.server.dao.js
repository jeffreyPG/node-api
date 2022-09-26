const mongoose = require("mongoose");
const Equipment = mongoose.model("Equipment");

async function findByIdOrCreate(identity, attributes) {
  try {
    const found = await Equipment.findById(identity);
    if (found === null) {
      return Equipment.create({ _id: identity, ...attributes });
    }
    return found;
  } catch (err) {
    console.error(err);
  }
}

async function findOneAndUpdateFields(identity, values, index) {
  try {
    const found = await Equipment.findById(identity);
    if (found === null) {
      console.log("Could not find Equipment");
      return null;
    }
    const {name, value, display, displayName } = values;
    // Check if the equipment value actually changed
    const currentEquipmentFields = found.fields || {};
    if (currentEquipmentFields[name] && currentEquipmentFields[name].value === value) return;
    console.log("UPDATE", index, values);
    return Equipment.updateOne(
      { _id: identity },
      {
        $set: {
          [`fields.${name}`]: {
            display,
            value,
            displayName
          }
        },
        $push: {
          fieldsArray: {
            $each: [values],
            $position: index
          }
        }
      }
    );
  } catch (err) {
    console.error(err);
  }
}

function findById(id) {
  return Equipment.findById(id);
}

module.exports = {
  findByIdOrCreate,
  findById,
  findOneAndUpdateFields
};
