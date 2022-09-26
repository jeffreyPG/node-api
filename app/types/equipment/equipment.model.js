const mongoose = require("mongoose");
const { PARTITION_KEYS } = require("../../../config/realm");
const Schema = mongoose.Schema;

const equipmentSchema = new mongoose.Schema(
  {
    description: String,
    name: {
      type: String,
      trim: true
    },
    hide: { type: Boolean, default: false },
    type: {
      type: String
    },
    application: {
      type: String
    },
    category: {
      type: String
    },
    fuel: {
      type: String
    },
    technology: {
      type: String
    },
    configs: {
      type: Array
    },
    fields: {
      type: Object
    },
    fieldsArray: {
      type: Object
    },
    organization: {
      type: Schema.Types.ObjectId,
      ref: "Organization"
    },
    useCount: {
      type: Number,
      default: 0
    },
    _partition: {
      type: String
    }
  },
  { timestamps: true, autoIndex: false }
);

equipmentSchema.options.emitIndexErrors;
equipmentSchema.index(
  { name: "text", description: "text" },
  {
    weights: {
      name: 10,
      description: 5
    },
    name: "TextIndex",
    unique: false
  }
);

equipmentSchema.pre("save", function (next) {
  if (this.organization) {
    this._partition = `${PARTITION_KEYS.BUILDING_LIST}=${this.organization.toString()}`
  } else {
    this._partition = PARTITION_KEYS.PUBLIC
  }
  next();
});

const Equipment = mongoose.model("Equipment", equipmentSchema);

Equipment.createIndexes(function(err) {
  if (err) console.error(err);
});
Equipment.on("error", function(err) {
  console.error(err);
});
Equipment.on("index", function(err) {
  if (err) console.log(err);
});
module.exports.Equipment = Equipment;
