"use strict";

const fs = require("fs");
const path = require("path");

const _ = require("lodash");
const moment = require("moment");
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;

const FeatureUser = mongoose.model("FeatureUser");
const { User } = require("../models/user.server.model");

const { horizontalLine } = require("./utils/log.utils");

const logFilePath = path.join(__dirname, "/logs/featureSync.logs");

const sync = async (options = null) => {
  const successfullIds = [];
  const failedIds = [];
  try {
    fs.appendFileSync(
      logFilePath,
      `\n${horizontalLine(120, "-")}\n${moment()
        .utc()
        .toLocaleString()} Script Started\n${horizontalLine(120, "-")}\n`
    );
    const featureId = options.featureId;
    const userIds = (options && options.userIds) || [];
    const users = await getUsers(userIds);
    for (let user of users) {
      try {
        await FeatureUser.deleteMany({ feature: featureId, user: user._id });
        let newFeatureUser = new FeatureUser({
          feature: featureId,
          user: user._id
        });
        newFeatureUser.save();
        successfullIds.push(user._id);
      } catch (error) {
        failedIds.push(user._id);
      }
    }
  } catch (error) {
    console.error(error);
    console.log(error);
  } finally {
    fs.appendFileSync(
      logFilePath,
      `Successfully updated user features for Ids: ${successfullIds}\n`
    );
    fs.appendFileSync(
      logFilePath,
      `Failed update user features for Ids: ${failedIds}\n`
    );
    fs.appendFileSync(logFilePath, `Script Ended...\n`);
  }
};

const update = async (options = null) => {
  const successfullIds = [];
  const failedIds = [];
  try {
    fs.appendFileSync(
      logFilePath,
      `\n${horizontalLine(120, "-")}\n${moment()
        .utc()
        .toLocaleString()} Update Script Started\n${horizontalLine(120, "-")}\n`
    );
    const oldFeatureId = options.oldFeatureId;
    const newFeatureId = options.newFeatureId;
    let featureusers = await FeatureUser.find({ feature: oldFeatureId });
    for (let featureuser of featureusers) {
      let id = featureuser._id.toString();
      try {
        featureuser.feature = newFeatureId;
        await featureuser.save();
        successfullIds.push(id);
      } catch (error) {
        failedIds.push(id);
      }
    }
  } catch (error) {
    console.error(error);
    console.log(error);
  } finally {
    fs.appendFileSync(
      logFilePath,
      `Successfully updated featureIds: ${successfullIds}\n`
    );
    fs.appendFileSync(
      logFilePath,
      `Failed update user features: ${failedIds}\n`
    );
    fs.appendFileSync(logFilePath, `Script Ended...\n`);
  }
};

const getUsers = async (userIds = []) => {
  try {
    fs.appendFileSync(logFilePath, `Getting User Data...\n`);
    const filter = {};
    if (userIds && userIds.length) {
      userIds = userIds.map(bid => ObjectId(bid));
      filter["_id"] = {
        $in: userIds
      };
    }
    const users = await User.find(filter).exec();
    return Promise.resolve(users);
  } catch (error) {
    fs.appendFileSync(logFilePath, `Error: ${error}\n`);
    return Promise.resolve([]);
  }
};

module.exports = {
  sync,
  update
};
