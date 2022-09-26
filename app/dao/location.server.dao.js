const mongoose = require("mongoose");
const Location = mongoose.model("Location");

async function findByIdOrCreate(identity, attributes) {
  try {
    const found = await Location.findById(identity);
    if (found === null) {
      return Location.create({ _id: identity, ...attributes });
    }
    return found;
  } catch (err) {
    console.error(err);
  }
}

module.exports = { findByIdOrCreate };
