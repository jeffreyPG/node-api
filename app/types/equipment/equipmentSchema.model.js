const mongoose = require("mongoose");

const FieldSchema = new mongoose.Schema({
  field: String,
  fieldDisplayName: String,
  display: Boolean,
  type: String,
  units: String,
  order: Number,
  values: [String],
  capacityField: Number
});

const schema = new mongoose.Schema({
  configs: [FieldSchema],
  fields: [FieldSchema],
  type: String
});

module.exports.EquipmentSchema = mongoose.model("EquipmentSchema", schema);
