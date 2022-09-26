/**
 * SalesForce API controller
 */
"use strict";

/**
 * Module dependencies.
 */
const _ = require("lodash");
const sfBuildings = require("./salesforce.building");
const sfMeasures = require("./salesforce.measure");
const sfProjects = require("./salesforce.project");
const sfEquipment = require("./salesforce.equipment");
const sfUsers = require("./salesforce.user");
const sfOrganizations = require("./salesforce.organization");
const sfAuth = require("./salesforce.auth");
const mongoose = require("mongoose");
const User = mongoose.model("User");
const Organization = mongoose.model("Organization");
const Building = mongoose.model("Building");
const Measure = mongoose.model("Project");
const ProjectPackage = mongoose.model("ProjectPackage");
const Equipment = mongoose.model("BuildingEquipment");
const util = require("../controllers/api/utils/api.utils");
const seqqueue = require("seq-queue");

const queue = seqqueue.createQueue(1200000); // 20 minutes

const _syncOrganization = async function(organization, sfAccountToUpdate) {
  let buildingsToUpdate = [];
  let measureIdsToUpdate = [];
  let measuresToUpdate = [];
  let projectsToUpdate = [];
  let equipmentToUpdate = [];
  let usersToUpdate = [];

  for (let buildingId of [...new Set(organization.buildingIds)]) {

    let building = await Building.findById(buildingId);

    if (building === null || building === undefined || building.archived) {
      continue;
    }

    buildingsToUpdate.push(building);

    measureIdsToUpdate.push(...building.projectIds.map(p => p.toString()));
    let projectPackages = await ProjectPackage.find({buildingId: building._id});
    if (projectPackages === null || projectPackages === undefined) {
      continue;
    }

    projectsToUpdate.push(...projectPackages);

    equipmentToUpdate.push(...(await Equipment.find({building: building._id, isArchived: {"$ne": true}})));
  }

  measureIdsToUpdate = _.uniq(measureIdsToUpdate);
  for (let measureId of [...new Set(measureIdsToUpdate)]) {
    let measure = await Measure.findById(measureId);
    if (measure === null || measure === undefined) {
      continue;
    }
    measuresToUpdate.push(measure);
  }

  for (let userData of organization.users) {
      let userId = userData.userId;
      let user = await User.findById(userId);
      if (user === null || user === undefined || user.license === "DEACTIVATED") {
          continue;
      }
      usersToUpdate.push(user);
  }

  const sleep = (waitTimeInMs) => new Promise(resolve => setTimeout(resolve, waitTimeInMs));

  await sfOrganizations.updateOrganizations([organization], organization, sfAccountToUpdate);
  await sleep(1000);
  await sfUsers.updateUsers(usersToUpdate, organization, sfAccountToUpdate);
  await sleep(1000);  // one second
  await sfBuildings.updateBuildings(buildingsToUpdate, organization, sfAccountToUpdate);
  await sleep(1000);
  await sfProjects.updateProjects(projectsToUpdate, organization, sfAccountToUpdate);
  await sleep(1000);
  await sfMeasures.updateMeasures(measuresToUpdate, organization, sfAccountToUpdate);
  await sleep(1000);
  await sfEquipment.updateEquipment(equipmentToUpdate, organization, sfAccountToUpdate);
};


const testSync = async function(req, res, next) {
  /** Function for testing. Doesn't change the database or return a usable response */
  const orgId = req.body.orgId;
  const buildingId = req.body.buildingId;
  const userId = req.body.userId;
  let userList = [];
  queue.push(
      async function(task) {
        console.log("Starting Salesforce sync test");
        console.log("Starting Salesforce Equipment sync test");
        let org = await Organization.findById(orgId);
        let building = await Building.findById(buildingId);
        let user = await User.findById(userId);
        let equipments = await Equipment.find({building: building._id, isArchived: {"$ne": true}});
        // await _syncOrganization(org, salesforceUser);
        for (let equipment of equipments) {
          await sfEquipment._createMappedEquipment(equipment, org);
        }
        console.log("Completed Salesforce Equipment sync test");
        console.log("Starting Salesforce Measure sync test");
        let measureIdsToUpdate = building.projectIds.map(p => p.toString());
        measureIdsToUpdate = _.uniq(measureIdsToUpdate);
        let measuresToUpdate = [];
        for (let measureId of [...new Set(measureIdsToUpdate)]) {
          let measure = await Measure.findById(measureId);
          if (measure === null || measure === undefined) {
            continue;
          }
          measuresToUpdate.push(measure);
        }
        for (let m of measuresToUpdate) {
          await sfMeasures._createMappedMeasure(m, org)
        }
        console.log("Completed Salesforce Measure sync test");
        console.log("Starting Salesforce Building sync test");
        await sfBuildings._createMappedBuilding(building, org);
        console.log("Completed Salesforce Building sync test");

        console.log("Starting Salesforce User sync test");
        await sfUsers._createMappedUser(user, org);
        console.log("Completed Salesforce User sync test");

        console.log("Starting Salesforce Organization sync test");
        await sfOrganizations._createMappedOrganization(org, org);
        console.log("Completed Salesforce Organization sync test");

        console.log("Completed Salesforce sync test");
        task.done();
      },
      function() {
        console.error("[ERROR] SalesForce organization syncing timeout!");
      },
      1200000   // 20 minutes
  );
    let org = await Organization.findById(orgId);
    userList = await getListOfUsers(org);


  res.sendResult = {
    status: "Success",
    message: "Connected SF Account",
      users: userList
  };

  return next();
};

const getListOfUsers = async function(org) {
    let users = [];
    for (let user_data of org.users) {
        let user = await User.findOne({_id: user_data.userId});
        users.push({id: user_data.userId, name: user.name, email: user.email});
    }
    return users;
};


const connectSFAccount = async function(req, res, next) {
  const { body, user: requestUser } = req;
  const salesforceUser = body.salesforceUser;
  const aud  = body.aud || "https://login.salesforce.com";
  const tokenUrl = body.tokenUrl || aud;
  const noSync = body.noSync || false;

  let user = await User.findOne({"email": requestUser.email});
  if (!user) {
    return util.sendError("User not found", 400, req, res, next);
  }

  let authConnection = await sfAuth.getConnection(salesforceUser, aud, tokenUrl);
  if (authConnection === undefined || authConnection === null) {
    return util.sendError("Salesforce user not authorized", 400, req, res, next);
  }

  // Update Organizations
    let orgUsers = {};
  for (let orgId of user.orgIds) {
    let org = await Organization.findById(orgId);
    if (!sfAuth.isEnabled(org)) continue;
    if (org.salesforce.connectedAccounts.includes(salesforceUser)) continue;

    orgUsers[orgId] = getListOfUsers(org);

    org.salesforce.connectedAccounts.push(salesforceUser);
    org.salesforce.authorizations.push({
      username: salesforceUser,
      aud: aud,
      tokenUrl: tokenUrl
    });
    org.markModified("salesforce");
    await org.save();
  }

  if (!noSync) {
    // Sync Organizations in background
    queue.push(
        async function(task) {
          console.log("Starting Salesforce sync for user", user.email);
          for (let orgId of user.orgIds) {
            let org = await Organization.findById(orgId);
            // console.log("HERE", sfAuth.isEnabled(org))
            if (!sfAuth.isEnabled(org)) continue;
            await _syncOrganization(org, salesforceUser);
          }
          console.log("Completed Salesforce sync for user", user.email);
          task.done();
        },
        function() {
          console.error("[ERROR] SalesForce organization syncing timeout!");
        },
        1200000   // 20 minutes
    );
  }

  res.sendResult = {
    status: "Success",
    message: "Connected SF Account",
      orgUsers: orgUsers
  };

  return next();
};

const disconnectSFAccount = async function(req, res, next) {
  const { body, user: requestUser } = req;
  const salesforceUser = body.salesforceUser;

  const user = await User.findOne({"email": requestUser.email});
  if (!user) {
    return util.sendError("User not found", 400, req, res, next);
  }

  // Update Organizations
  for (let orgId of user.orgIds) {
    let org = await Organization.findById(orgId);

    if (!org.salesforce.connectedAccounts.includes(salesforceUser)) continue;

    org.salesforce.connectedAccounts.splice(org.salesforce.connectedAccounts.indexOf(salesforceUser), 1);
    org.salesforce.authorizations = org.salesforce.authorizations.filter(a => a.username !== salesforceUser);
    org.markModified("salesforce");
    org.save();
  }

  res.sendResult = {
    status: "Success",
    message: "Disconnected SF Account"
  };

  return next();
};

const forceSyncSFAccount = async function(req, res, next) {
  const { body, user: requestUser } = req;
  const salesforceUser = body.salesforceUser ? body.salesforceUser : "";

  const user = await User.findOne({"email": requestUser.email});
  if (!user) {
    return util.sendError("User not found", 400, req, res, next);
  }

  // Sync Organizations in background
  queue.push(
      async function(task) {
        for (let orgId of user.orgIds) {
          let org = await Organization.findById(orgId);
          if (!sfAuth.isEnabled(org)) continue;
          await _syncOrganization(org, salesforceUser);
        }
        task.done();
      },
      function() {
        console.error("[ERROR] SalesForce organization syncing timeout!");
      },
      1200000   // 20 minutes
  );

  res.sendResult = {
    status: "Success",
    message: "Added SalesForce user sync to queue"
  };

  return next();
};

module.exports = {
  connectSFAccount,
  disconnectSFAccount,
  forceSyncSFAccount,
  testSync
};
