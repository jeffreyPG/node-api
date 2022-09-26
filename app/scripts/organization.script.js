"use strict";

const fs = require("fs");
const path = require("path");

const _ = require("lodash");
const moment = require("moment");
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;
const Organization = mongoose.model("Organization");

const { horizontalLine } = require("./utils/log.utils");

const logFilePath = path.join(__dirname, "/logs/organization.logs");

const updateUserTemplateIds = async (options = null) => {
  let successfullIds = [];
  let failedIds = [];
  try {
    fs.appendFileSync(
      logFilePath,
      `\n${horizontalLine(120, "-")}\n${moment()
        .utc()
        .toLocaleString()} Script Started\n${horizontalLine(120, "-")}\n`
    );
    const organizationIds = (options && options.organizationIds) || [];
    const organizations = await getOrganizations(organizationIds);
    for (let organization of organizations) {
      let users = organization.users || [];
      let newUsers = [];
      let isNeedUpdate = false;
      for (let user of users) {
        if (!user.templateIds || user.templateIds.length === 0) {
          isNeedUpdate = true;
          newUsers.push({
            ...user,
            templateIds: ["all"],
            userRole: user.userRole || "admin"
          });
        } else {
          newUsers.push(user);
        }
      }
      if (isNeedUpdate) {
        let org = await Organization.findById(organization._id);
        Object.assign(org.users, newUsers);
        org.markModified("users");
        await org.save();
        successfullIds.push(organization._id.toString());
      }
    }
  } catch (error) {
    console.error(error);
    console.log(error);
  } finally {
    successfullIds = [...new Set(successfullIds)];
    failedIds = [...new Set(failedIds)];
    fs.appendFileSync(
      logFilePath,
      `Successfully updated organizations for Ids: ${successfullIds}\n`
    );
    fs.appendFileSync(
      logFilePath,
      `Failed update organizations for Ids: ${failedIds}\n`
    );
    fs.appendFileSync(logFilePath, `Script Ended...\n`);
  }
};

const getOrganizations = async (organizationIds = []) => {
  try {
    fs.appendFileSync(logFilePath, `Getting Organization Data...\n`);
    const filter = {
      "users.templateIds": []
    };
    if (organizationIds && organizationIds.length) {
      organizationIds = organizationIds.map(bid => ObjectId(bid));
      filter["_id"] = {
        $in: organizationIds
      };
    }
    const organizations = await Organization.find(filter).exec();
    return Promise.resolve(organizations);
  } catch (error) {
    fs.appendFileSync(logFilePath, `Error: ${error}\n`);
    return Promise.resolve([]);
  }
};

module.exports = {
  updateUserTemplateIds
};
