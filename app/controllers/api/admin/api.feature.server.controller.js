"use strict";

/**
 * Module dependencies.
 */
const mongoose = require("mongoose");
const util = require("../utils/api.utils");

const { Feature } = require("../../../types/feature/feature.model");
const { FeatureUser } = require("../../../types/feature/featureuser.model");
const { User } = require("../../../models/user.server.model");

exports.adminGetFeatures = async function (req, res, next) {
  const features = await Feature.find()
    .lean()
    .exec();

  res.sendResult = {
    status: "Success",
    message: "Retrieved Features",
    features,
  };
  next();
};

exports.adminCreateFeature = async function (req, res, next) {
  const { name, enabled = false } = req.body;

  if (!name) {
    return util.sendError("name is required", 400, req, res, next);
  }

  try {
    const feature = await Feature.create({ name, enabled });
    res.sendResult = {
      status: "Success",
      message: "Created Feature",
      feature: feature.toObject(),
    };
    next();
  } catch (err) {
    return util.sendError(err, 500, req, res, next);
  }
};

exports.adminUpdateFeature = async function (req, res, next) {
  const { featureId } = req.params;
  const set = {};
  const updateKeys = ["name", "enabled"];

  if (!mongoose.Types.ObjectId.isValid(featureId)) {
    return util.sendError("Feature ID must be valid", 400, req, res, next);
  }

  const feature = await Feature.findById(featureId);
  if (!feature) {
    return util.sendError("Feature not found", 404, req, res, next);
  }

  for (const key of updateKeys) {
    if (req.body[key] !== null && req.body[key] !== undefined) {
      set[key] = req.body[key];
    }
  }

  try {
    const updated = await Feature.findByIdAndUpdate(
      featureId,
      { $set: set },
      { new: true }
    );

    res.sendResult = {
      status: "Success",
      message: "Updated Feature",
      feature: updated,
    };
    return next();
  } catch (err) {
    return util.sendError(err, 500, req, res, next);
  }
};

exports.adminDeleteFeature = async function (req, res, next) {
  const { featureId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(featureId)) {
    return util.sendError("Feature not found", 404, req, res, next);
  }

  const feature = await Feature.findByIdAndRemove(featureId);

  if (feature === null) {
    return util.sendError("Feature not found", 404, req, res, next);
  }

  res.sendStatus(200);
};

exports.adminGetFeatureUsers = async function (req, res, next) {
  const { filter = {} } = req.body;

  if (filter.feature && !mongoose.Types.ObjectId.isValid(filter.feature)) {
    return util.sendError("Feature must be valid", 400, req, res, next);
  }

  if (filter.user && !mongoose.Types.ObjectId.isValid(filter.user)) {
    return util.sendError("User must be valid", 400, req, res, next);
  }

  const featureusers = await FeatureUser.find(filter)
    .populate([
      { path: "feature", select: ["_id", "name", "enabled"] },
      { path: "user", select: ["_id", "name", "username", "email"] },
    ])
    .lean()
    .exec();

  res.sendResult = {
    status: "Success",
    message: "Retrieved Feature Users",
    featureusers,
  };
  next();
};

exports.adminCreateFeatureUser = async function (req, res, next) {
  const { user, feature } = req.body;

  if (!user || !feature) {
    return util.sendError("Feature and User are required", 400, req, res, next);
  }

  if (!mongoose.Types.ObjectId.isValid(feature)) {
    return util.sendError("Feature must be valid", 400, req, res, next);
  }

  if (!mongoose.Types.ObjectId.isValid(user)) {
    return util.sendError("User must be valid", 400, req, res, next);
  }

  const featureExists = await Feature.exists({ _id: feature });

  if (featureExists === false) {
    return util.sendError("Feature not found", 404, req, res, next);
  }

  const userExists = await User.exists({ _id: user });

  if (userExists === false) {
    return util.sendError("User not found", 404, req, res, next);
  }

  const exists = await FeatureUser.exists({ user, feature });
  if (exists === true) {
    return res.sendStatus(304);
  }

  const featureuser = await FeatureUser.create({ user, feature });

  res.sendResult = {
    status: "Success",
    message: "Created Feature User",
    featureuser: featureuser.toObject(),
  };
  next();
};

exports.adminBatchCreateFeatureUsers = async function (req, res, next) {
  const { users, feature } = req.body;

  if (!users || !feature) {
    return util.sendError(
      "Feature and Users are required",
      400,
      req,
      res,
      next
    );
  }

  if (!mongoose.Types.ObjectId.isValid(feature)) {
    return util.sendError("Feature must be valid", 400, req, res, next);
  }

  const featureExists = await Feature.exists({ _id: feature });

  if (featureExists === false) {
    return util.sendError("Feature not found", 404, req, res, next);
  }

  for (const user of users) {
    if (!mongoose.Types.ObjectId.isValid(user)) {
      return util.sendError("Users must be valid", 400, req, res, next);
    }
    const userExists = await User.exists({ _id: user });

    if (userExists === false) {
      return util.sendError("User not found", 404, req, res, next);
    }
  }

  try {
    const featureusers = [];
    for (const user of users) {
      const count = await FeatureUser.countDocuments({ user, feature });
      if (count === 0) {
        const featureuser = await FeatureUser.create({ user, feature });
        featureusers.push(featureuser.toObject());
      }
    }

    res.sendResult = {
      status: "Success",
      message: "Created Feature Users",
      featureusers,
    };
    return next();
  } catch (err) {
    return util.sendError(err, 500, req, res, next);
  }
};

exports.adminBatchDeleteFeatureUsers = async function (req, res, next) {
  const { users, feature } = req.body;

  if (!users || !feature) {
    return util.sendError(
      "Feature and Users are required",
      400,
      req,
      res,
      next
    );
  }

  if (!mongoose.Types.ObjectId.isValid(feature)) {
    return util.sendError("Feature must be valid", 400, req, res, next);
  }

  for (const user of users) {
    if (!mongoose.Types.ObjectId.isValid(user)) {
      return util.sendError("Users must be valid", 400, req, res, next);
    }
  }

  try {
    for (const user of users) {
      await FeatureUser.remove({ user, feature });
    }

    res.sendResult = {
      status: "Success",
      message: "Deleted Feature Users",
    };
    return next();
  } catch (err) {
    return util.sendError(err, 500, req, res, next);
  }
};

exports.adminDeleteFeatureUser = async function (req, res, next) {
  const { featureuserId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(featureuserId)) {
    return util.sendError("Feature ID must be valid", 400, req, res, next);
  }

  try {
    const featureuser = await FeatureUser.findByIdAndRemove(featureuserId);

    if (featureuser === null) {
      return util.sendError("Feature User not found", 404, req, res, next);
    }

    res.sendStatus(200);
  } catch (err) {
    return util.sendError(err, 500, req, res, next);
  }
};
