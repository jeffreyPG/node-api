"use strict";

/**
 * Module dependencies.
 */
const _ = require("lodash");
const mongoose = require("mongoose");
const User = mongoose.model("User");
const Organization = mongoose.model("Organization");
const Feature = mongoose.model("Feature");
const FeatureUser = mongoose.model("FeatureUser");
const ObjectId = mongoose.Types.ObjectId;
const util = require("./utils/api.utils");
const validate = require("./utils/api.validation");

const getFeatureFlagList = async (req, res, next) => {
  try {
    const features = await Feature.find({ enabled: true })
      .select("_id name enabled")
      .lean()
      .exec();
    res.sendResult = {
      status: "Success",
      message: "Retrieved Features",
      featureFlags: features
    };
    return next();
  } catch (error) {
    console.log("error", error);
    return util.sendError(error, 400, req, res, next);
  }
};

const getUserListWithFeatureFlag = async (req, res, next) => {
  try {
    const { organizationId = "all" } = req.query;
    const currentUser = await User.findById(req.user._id)
      .lean()
      .exec();
    let orgIds = currentUser.orgIds || [];
    if (organizationId !== "all") {
      orgIds = [ObjectId(organizationId)];
    }
    const organizations = await Organization.find({
      _id: {
        $in: orgIds
      }
    });
    let userIds = [];
    organizations.forEach(org => {
      userIds.push(...org.users.map(user => user.userId.toString()));
    });
    userIds = [...new Set(userIds)];
    const allUsers = await User.find({ _id: { $in: userIds } });
    let userList = [];
    for (let user of allUsers) {
      const featureUserList = await FeatureUser.find({ user: user._id })
        .lean()
        .exec();
      const features = featureUserList
        .map(item => item.feature)
        .filter(item => !!item);
      userList.push({
        _id: user._id,
        name: user.name,
        features
      });
    }
    res.sendResult = {
      status: "Success",
      message: "Retrieved Users",
      userList: userList
    };
    return next();
  } catch (error) {
    console.log("error", error);
    return util.sendError(error, 400, req, res, next);
  }
};

const updateUserFeatureFlag = async (req, res, next) => {
  try {
    const { check, userId } = req.body;
    await FeatureUser.deleteMany({
      user: userId,
      feature: req.feature._id
    });
    if (check) {
      const newFeatureUser = new FeatureUser({
        user: userId,
        feature: req.feature._id
      });
      await newFeatureUser.save();
    }
    // Return organization list
    res.sendResult = {
      status: "Success",
      message: "Update User Feature Flag"
    };
    return next();
  } catch (error) {
    console.log("error", error);
    return util.sendError(error, 400, req, res, next);
  }
};

const featureById = (req, res, next, id) => {
  if (!validate.valMongoObjId(id)) {
    return next(new Error("Invalid ID present in request."));
  }

  Feature.findById(id).exec(function(err, feature) {
    if (err) return next(err);
    if (!feature) return next(new Error("Failed to load Feature Flag" + id));
    req.feature = feature;
    return next();
  });
};

module.exports = {
  getFeatureFlagList,
  getUserListWithFeatureFlag,
  updateUserFeatureFlag,
  featureById
};
