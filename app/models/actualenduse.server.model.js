const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ActualEndUseSchema = new Schema(
  {
    building: {
      type: Schema.Types.ObjectId,
      ref: "Building"
    },
    buildingId: {
      type: String
    },
    startDate: {
      type: Date
    },
    endDate: {
      type: Date
    },
    baseline: {
      type: Object
    },
    proposed: {
      type: Object
    }
  },
  { timestamps: true }
);

module.exports.ActualEndUse = mongoose.model(
  "ActualEndUse",
  ActualEndUseSchema
);
