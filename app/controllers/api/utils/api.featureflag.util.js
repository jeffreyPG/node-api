const mongoose = require("mongoose");
const Feature = mongoose.model("Feature");
const FeatureUser = mongoose.model("FeatureUser");

const addUserFeatureFlagByName = async (userId, featureFlagName, check) => {
  try {
    const feature = await Feature.findOne({
      name: featureFlagName
    });
    if (!feature) return;
    await FeatureUser.deleteMany({
      user: userId,
      feature: feature._id
    });
    if (check) {
      const newFeatureUser = new FeatureUser({
        user: userId,
        feature: feature._id
      });
      await newFeatureUser.save();
    }
  } catch (error) {
    console.log("error", error);
  }
};

module.exports = {
  addUserFeatureFlagByName
};
