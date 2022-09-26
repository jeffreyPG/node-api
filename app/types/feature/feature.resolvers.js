const { FeatureUser } = require("./featureuser.model");
const { Feature } = require("./feature.model");

const enabledFeatures = (_, _req, ctx) => {
  const { isLoggedIn, user } = ctx;
  if (!isLoggedIn || !user) return [];

  return FeatureUser.aggregate([
    { $match: { user: user._id } },
    {
      $lookup: {
        from: "features",
        localField: "feature",
        foreignField: "_id",
        as: "feature"
      }
    },
    {
      $unwind: "$feature"
    },
    { $replaceRoot: { newRoot: "$feature" } },
    {
      $match: {
        enabled: true
      }
    }
  ]).exec();
};

const feature = (_, req, ctx) => {
  const { isLoggedIn } = ctx;
  const { feature } = req;
  if (!isLoggedIn || !feature) return null;

  return Feature.findOne({ name: feature.name }).exec();
};

module.exports = {
  Query: {
    enabledFeatures,
    feature
  }
};
