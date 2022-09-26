const { Schema, model } = require("mongoose");

const featureUserSchema = new Schema(
  {
    feature: {
      type: Schema.Types.ObjectId,
      ref: "Feature"
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User"
    }
  },
  { timestamps: true }
);

module.exports.FeatureUser = model("FeatureUser", featureUserSchema);
