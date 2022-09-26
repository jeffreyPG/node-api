const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const schema = new mongoose.Schema({
  category: {
    displayName: String,
    value: String
  },
  application: {
    displayName: String,
    value: String
  },
  technology: {
    displayName: String,
    value: String
  },
  type: {
    displayName: String,
    value: String
  },
  linkedSchema: {
    type: Schema.Types.ObjectId,
    ref: "EquipmentSchema"
  }
});

module.exports.EquipmentCategorization = mongoose.model(
  "EquipmentCategorization",
  schema
);
