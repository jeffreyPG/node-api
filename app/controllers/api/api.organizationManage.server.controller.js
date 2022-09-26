/* eslint-disable no-undef */
"use strict";

/**
 * Module dependencies.
 */
const mongoose = require("mongoose");
const Organization = mongoose.model("Organization");
const User = mongoose.model("User");
const ObjectId = mongoose.Types.ObjectId;
const util = require("./utils/api.utils");
const FeatureUser = mongoose.model("FeatureUser");
const {
  sendUserInviteEmail,
  sendOrganizationInvite
} = require("./utils/api.email.client");
const { addUserFeatureFlagByName } = require("./utils/api.featureflag.util");
const ManagementClient = require("auth0").ManagementClient;
const {
  auth0ManagementClient,
  formatAuth0Profile
} = require("./api.user.server.controller");

const getOrganizationsV2 = async (req, res, next) => {
  try {
    const user = req.user;
    const orgIds = user.orgIds || [];
    const organizations = await Organization.find({
      _id: { $in: orgIds },
      isArchived: { $ne: true }
    });
    let cleanedOrganizations = [];
    for (let organization of organizations) {
      const userObj = {};
      const userIds = organization.users.map(user => user.userId);
      const users = await User.find({
        _id: { $in: userIds },
        archived: { $ne: true },
        license: { $ne: "DEACTIVATED" }
      })
        .lean()
        .exec();
      const availableUserIds = users.map(user => user._id.toString());
      for (let user of organization.users) {
        if (availableUserIds.includes(user.userId.toString())) {
          userObj[user.userId] = user.userRole;
        }
      }
      cleanedOrganizations.push({
        _id: organization._id,
        name: organization.name,
        roles: userObj
      });
    }
    // Return organization list
    res.sendResult = {
      status: "Success",
      message: "Retrieved User Organizations",
      organizations: cleanedOrganizations
    };
    return next();
  } catch (error) {
    console.log("error", error);
    return util.sendError(error, 400, req, res, next);
  }
};

const getOrganizationArray = (organizations, user) => {
  let list = [];
  let userId = user._id.toString();
  let roles = {};

  for (let organization of organizations) {
    let orgId = organization._id.toString();
    let findUser = organization.users.find(
      user => user.userId.toString() === userId
    );

    if (findUser) {
      list.push(orgId);
      roles[orgId] = findUser.userRole;
    }
  }
  return { list, roles };
};

const getOrganizationsUsersV2 = async (req, res, next) => {
  try {
    const { organizationId = "all" } = req.query;
    const user = req.user;
    let orgIds = user.orgIds || [];
    if (organizationId !== "all") {
      orgIds = [ObjectId(organizationId)];
    }
    // const allOrganizations = await Organization.find({
    //   isArchived: {
    //     $ne: true
    //   }
    // });
    const organizations = await Organization.find({
      _id: {
        $in: orgIds
      },
      isArchived: {
        $ne: true
      }
    });
    let userIds = [];
    organizations.forEach(org => {
      userIds.push(...org.users.map(user => user.userId.toString()));
    });
    userIds = [...new Set(userIds)];
    const allUsers = await User.find({
      _id: { $in: userIds },
      archived: { $ne: true },
      license: { $ne: "DEACTIVATED" }
    });
    let cleanUsers = [];
    for (let user of allUsers) {
      const { list: assignedOrganization = [], roles = {} } =
        getOrganizationArray(organizations, user) || [];
      const featureUserList = await FeatureUser.find({ user: user._id })
        .lean()
        .exec();
      const features = featureUserList
        .map(item => item.feature)
        .filter(item => !!item);
      const data = {
        _id: user._id,
        name: user.name,
        email: user.email,
        created: user.created,
        organizationList: assignedOrganization,
        organizationCount: assignedOrganization.length,
        roles: roles,
        features: features
      };
      cleanUsers.push(data);
    }

    // return user list
    res.sendResult = {
      status: "Success",
      message: "Retrieved Users",
      users: cleanUsers
    };
    return next();
  } catch (error) {
    console.log("error", error);
    return util.sendError(error, 400, req, res, next);
  }
};

const getUserV2 = async (req, res, next) => {
  /**
   * todo
   * payload
   *  firstName: values.firstName,
      lastName: values.lastName,
      email: values.email,
      orgIds: orgIds,
      userRoles: values.organizationObj: [orgId]: role
   */
  try {
    res.sendResult = {
      status: "Success",
      message: "Get User"
    };
    return next();
  } catch (error) {
    console.log("error", error);
    return util.sendError(error, 400, req, res, next);
  }
};

const removeUserV2 = async (req, res, next) => {
  const payload = req.body;
  const { userId, organizationId } = payload;
  try {
    let currentUser = await User.findById(userId)
      .lean()
      .exec();
    let userOrgIds = currentUser.orgIds || [];
    userOrgIds = userOrgIds.map(id => id.toString());
    const filterOrganizationIds =
      organizationId === "all"
        ? req.user.orgIds.map(id => id.toString())
        : [organizationId];
    const removedOrgIds = userOrgIds.filter(id =>
      filterOrganizationIds.includes(id)
    );
    const remainOrgIds = userOrgIds.filter(
      id => !filterOrganizationIds.includes(id)
    );
    for (let orgId of removedOrgIds) {
      let organization = await Organization.findById(orgId);
      let organizationData = await Organization.findById(orgId)
        .lean()
        .exec();
      if (organization && organizationData) {
        let users = organizationData.users || [];
        users = users.filter(userObj => userObj.userId.toString() !== userId);
        organization.users = users;
        organization.markModified("users");
        await organization.save();
      }
    }
    currentUser = await User.findById(userId);
    currentUser.orgIds = remainOrgIds;
    if (remainOrgIds.length === 0) {
      currentUser.archived = true;
      currentUser.license = "DEACTIVATED";
      currentUser.markModified("archived");
      currentUser.markModified("license");
    }
    currentUser.markModified("orgIds");
    await currentUser.save();

    res.sendResult = {
      status: "Success",
      message: "Remove user"
    };
    return next();
  } catch (error) {
    console.log("error", error);
    return util.sendError(error, 400, req, res, next);
  }
};

const updateUserV2 = async (req, res, next) => {
  try {
    const { body } = req;
    const user = await User.findById(body._id).exec();
    const originalOrgIds = ((user && user.orgIds) || []).map(orgId =>
      orgId.toString()
    );
    let { orgIds: newOrganizationIds = [], roles = {} } = body;
    newOrganizationIds = [
      ...new Set([...newOrganizationIds, ...originalOrgIds])
    ];
    Object.assign(user, {
      name: body.name || body.name,
      email: body.email || body.email,
      orgIds: newOrganizationIds
    });
    user.markModified("name");
    user.markModified("email");
    user.markModified("orgIds");
    await user.save();

    const updatedUserRoles = {};
    let check = false;

    for (let orgId of newOrganizationIds) {
      const organization = await Organization.findById(orgId);
      if (!organization) continue;
      const organizationObj = await Organization.findById(orgId)
        .lean()
        .exec();
      let userRoles = [...((organizationObj && organizationObj.users) || [])];
      let findUser = userRoles.find(
        user => user.userId.toString() === body._id
      );
      const newUserRole = roles[orgId] || "editor";
      let filteredUserUsers = userRoles.filter(
        user => user.userId.toString() !== body._id
      );
      let finalUserRole;
      if (findUser) {
        if (findUser.userRole !== newUserRole) {
          filteredUserUsers.push({
            buildingIds: findUser.buildingIds || ["all"],
            templateIds: findUser.templateIds || ["all"],
            userId: ObjectId(body._id),
            userRole: newUserRole
          });
          finalUserRole = newUserRole;
        } else {
          filteredUserUsers.push(findUser);
          finalUserRole = findUser.userRole;
        }
      } else {
        filteredUserUsers.push({
          buildingIds: ["all"],
          templateIds: ["all"],
          userId: ObjectId(body._id),
          userRole: newUserRole
        });
        finalUserRole = newUserRole;
      }
      organization.users = filteredUserUsers;
      organization.markModified("users");
      await organization.save();
      updatedUserRoles[orgId] = finalUserRole || "editor";
      if (finalUserRole === "admin" || finalUserRole === "editor") check = true;
    }
    let updatedUser = await User.findById(ObjectId(body._id));
    await addUserFeatureFlagByName(updatedUser._id, "Admin", check);
    const cleanedUser = {
      name: updatedUser.name,
      email: updatedUser.email,
      organizationCount:
        (updatedUser.orgIds && updatedUser.orgIds.length) || [],
      organizationList: updatedUser.orgIds || [],
      roles: updatedUserRoles
    };
    res.sendResult = {
      status: "Success",
      message: "Updated user",
      user: cleanedUser
    };
    return next();
  } catch (error) {
    console.log("error", error);
    return util.sendError(error, 400, req, res, next);
  }
};

const inviteUserV2 = async (req, res, next) => {
  try {
    const payload = req.body;

    const {
      firstName = "",
      lastName = "",
      email = "",
      orgIds = [],
      userRoles,
      featureFlags = []
    } = payload;
    const existingUser = await User.findOne({
      email: email
    }).exec();
    let userId;
    if (existingUser) {
      userId = existingUser._id.toString();
      let check = false;
      for (let orgId of orgIds) {
        const organization = await Organization.findById(orgId);
        const organizationObj = await Organization.findById(orgId)
          .lean()
          .exec();
        let objectUsers = [...(organizationObj.users || [])];
        let filteredUserUsers = objectUsers.filter(
          user => user.userId.toString() !== userId
        );
        const newUserRole = userRoles[orgId] || "editor";
        filteredUserUsers.push({
          buildingIds: ["all"],
          templateIds: ["all"],
          userId: ObjectId(userId),
          userRole: newUserRole
        });
        organization.users = filteredUserUsers;
        organization.markModified("users");
        await organization.save();
        if (newUserRole === "admin" || newUserRole === "editor") check = true;
      }
      await addUserFeatureFlagByName(userId, "Admin", check);
      for (let featureFlag of featureFlags) {
        const newFeatureUser = new FeatureUser({
          user: userId,
          feature: featureFlag
        });
        await newFeatureUser.save();
      }
      try {
        await Promise.all(
          orgIds.map(orgId =>
            sendOrganizationInvite(
              userId,
              orgId,
              email,
              res.app.locals.prefix,
              userRoles[orgId] || "editor"
            )
          )
        );
      } catch (err) {
        console.log("err", err);
      }
    } else {
      const user = new User({
        name: firstName + " " + lastName,
        email: email,
        username: email,
        license: "DEACTIVATED",
        password: "BuildeeGo123!@#",
        orgIds: orgIds
      });
      const savedUser = await user.save();
      userId = savedUser._id.toString();
      let check = false;
      for (let orgId of orgIds) {
        const organization = await Organization.findById(orgId);
        const organizationObj = await Organization.findById(orgId)
          .lean()
          .exec();
        let objectUsers = [...(organizationObj.users || [])];
        let filteredUserUsers = objectUsers.filter(
          user => user.userId.toString() !== userId
        );
        const newUserRole = userRoles[orgId] || "editor";
        filteredUserUsers.push({
          buildingIds: ["all"],
          templateIds: ["all"],
          userId: ObjectId(userId),
          userRole: newUserRole
        });
        organization.users = filteredUserUsers;
        organization.markModified("users");
        await organization.save();
        if (newUserRole === "admin" || newUserRole === "editor") check = true;
      }
      await addUserFeatureFlagByName(userId, "Admin", check);
      for (let featureFlag of featureFlags) {
        const newFeatureUser = new FeatureUser({
          user: userId,
          feature: featureFlag
        });
        await newFeatureUser.save();
      }
      let profile = formatAuth0Profile(user);
      profile.user_id = savedUser._id;
      profile.connection = process.env.AUTH0_DB_CONNECTION;
      profile.password = "BuildeeGo123!@#";
      profile.email = user.email;
      profile.email_verified = false;
      await auth0ManagementClient.createUser(profile);
      sendUserInvite(profile);
    }
    // await Promise.all(
    //   orgIds.map(orgId =>
    //     sendOrganizationInvite(
    //       savedUser._id,
    //       orgId,
    //       email,
    //       res.app.locals.prefix,
    //       userRoles[orgId] || "editor"
    //     )
    //   )
    // );

    res.sendResult = {
      status: "Success",
      message: "Invite User"
    };
    return next();
  } catch (error) {
    console.log("error", error);
    return util.sendError(error, 400, req, res, next);
  }
};

const sendUserInvite = async userProfile => {
  const payload = {
    email: userProfile.email,
    connection_id: process.env.AUTH0_DB_CONNECTION_ID,
    mark_email_as_verified: true,
    result_url: process.env.HOST,
    includeEmailInRedirect: true
  };

  try {
    const auth0Client = new ManagementClient({
      domain: process.env.AUTH0_DOMAIN,
      clientId: process.env.AUTH0_CLIENT_ID,
      clientSecret: process.env.AUTH0_CLIENT_SECRET,
      scope: "create:user_tickets"
    });
    const { ticket } = await auth0Client.createPasswordChangeTicket(payload);
    await sendUserInviteEmail(ticket, userProfile.email);
  } catch (err) {
    console.log("Unable to send user email: ", err);
  }
};

module.exports = {
  getOrganizationsV2,
  getOrganizationsUsersV2,
  updateUserV2,
  inviteUserV2,
  removeUserV2,
  getUserV2,
  sendUserInvite
};
