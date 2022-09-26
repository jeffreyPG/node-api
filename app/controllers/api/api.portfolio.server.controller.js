"use strict";

/**
 * Module dependencies.
 */
const _ = require("lodash");
const util = require("./utils/api.utils");
const accountService = require("./utils/api.portfolio.account");
const connectionService = require("./utils/api.portfolio.connection");
const propertyService = require("./utils/api.portfolio.property");
const reportingService = require("./utils/api.portfolio.reporting");

const {
  getBuildingById,
} = require("../../dao/building.server.dao");
const {
  getPortfolioSyncByMail,
  getPortfolioSyncByMailUsername,
  getPortfolioSyncByOrganization,
  getPortfolioSyncByAccountId,
  savePortfolioSync,
  getPortfolioSyncById,
} = require("../../dao/portfolio.sync.server.dao");
const { getUtilityById } = require("../../dao/utility.server.dao");
/**
 * - Look for any pending connection invites in the Portfolio Manager system which match the provided username and email.
 *
 * - Search the portfolio sync history to get any ID information which has been previously added. Use latest account info
 *    from the Portfolio Manager system that any pending invite data returned, fall-back to any sync history ID data.
 *
 * - Attempt to use this ID to accept any pending invites. If the call fails, it is fine because it may not exist or it
 *   has already been accepted in the past.
 *
 * - If the account connection has been established, then request the latest user account information. Send an error
 *   back if Portfolio Manager doesnt return any user details because there is no current connection between accounts.
 *
 * - Finally, after getting the latest user account information, return those user details, along with the portfolio
 *   history mongo model for use later.
 */
const _processConnectionsGetAccountInfo = async function (options) {
  if (!options.portfolioUsername) throw new Error("Portfolio Username is required to make request.");
  if (!options.portfolioEmail) throw new Error("Portfolio Email is required to make request.");

  const portfolioEmail = options.portfolioEmail || "";
  let portfolioUserId = null;

  const accountPending = await connectionService.getPendingAccountConnections();
  const noPendingInvite = Boolean(!accountPending || !accountPending.length);

  const portfolioSyncHistory = await getPortfolioSyncByMail(portfolioEmail);
  if (noPendingInvite && !portfolioSyncHistory) {
    throw new Error("No pending or synced accounts found. Check the username and email provided, or try to reconnect");
  }
  if (noPendingInvite) {
    portfolioUserId = portfolioSyncHistory.accountId;
  } else {
    let matchingPendingAccount = accountPending.find(acc => acc.username === options.portfolioUsername);
    if (!matchingPendingAccount) {
      throw new Error("No pending or synced accounts found. Check the username and email provided, or try to reconnect");
    }
    portfolioUserId = matchingPendingAccount.accountId;
  }

  await connectionService.acceptAccountInvite({
    portfolioUserId,
  });
  // Get the latest account information in portfolio system and return
  const account = await accountService.getCustomerAccount({
    portfolioUserId,
  });
  if (account.response && account.response.status === "Error") {
    throw new Error("Issues contacting Portfolio Manager server (account)");
  }

  return {
    id: portfolioUserId,
    account: account.customer || null,
    portfolioSyncHistory: portfolioSyncHistory || null,
  };
};

const _getPMScore = async (years, propertyId) => {
  years.sort();
  const startYear = years[0];
  const endYear = years[years.length - 1];
  const yearsForScore = [];
  for (let i = startYear; i <= endYear; i += 1) {
    yearsForScore.push(i);
  }
  const allScores = await Promise.all(yearsForScore.map(year => reportingService.getPortfolioScore(year, propertyId)));
  return _.compact(allScores);
};

const updatePMScores = async function (building, propertyId) {
  const years = [];
  await Promise.all(building.utilityIds.map(async utilityId => {
    const utility = await getUtilityById(utilityId);
    utility.meterData.forEach(meterData => {
      years.push(meterData.startDate.getFullYear());
      years.push(meterData.endDate.getFullYear());
    });
    utility.deliveryData.forEach(meterData => {
      years.push(meterData.deliveryDate.getFullYear());
    });
  }));

  if (years.length) {
    let pmScores = [];
    pmScores = await _getPMScore(years, propertyId);
    if (pmScores) {
      if (!building.benchmark) { building.benchmark = {}; }
      building.benchmark.pmScores = pmScores;
      await building.save();
    }
  }
};

exports.updatePMScores = updatePMScores;

exports.updatePMScore = async function (req, res, next) {
  const buildeeBuilding = await getBuildingById(req.body.buildingId);
  const propertyId = req.body.propertyId;
  await updatePMScores(buildeeBuilding, propertyId);
  res.sendResult = {
    status: "Success",
    message: "PM Score updated",
  };
  next();
};

/**
 * Get a customer portfolio property list
 */
exports.getPortfolioPropertyList = async function (req, res, next) {
  const accountId = req.query.accountId;

  // Ensure the user has synced their account data
  if (!accountId) {
    return util.sendError("Missing portfolio data in user account.", 400, req, res, next);
  }

  const options = {
    portfolioUserId: accountId,
  };
  try {
    const propertyList = await propertyService.getCustomerPropertyList(options);
    res.sendResult = {
      status: "Success",
      message: "Retrieved Portfolio Property List",
      propertyList,
    };
    return next();
  } catch (err) {
    return util.sendError("Issues contacting Portfolio Manager server (property list).", 400, req, res, next);
  }
};

/// /////////////////////////////////////
/// /LINK PM PROPERTY TO BUILDEE BUILDING
/// /////////////////////////////////////
exports.linkToBuildeeBuilding = async function (req, res, next) {
  const buildeeBuilding = await getBuildingById(req.body.buildingId);
  if (!buildeeBuilding) return next("No building could be found.");

  const tempEnergystarIds = [...buildeeBuilding.energystarIds];

  const linkObj = {
    accountId: req.body.accountId,
    buildingId: req.body.propertyId,
  };

  tempEnergystarIds.push(linkObj);
  buildeeBuilding.energystarIds = tempEnergystarIds;

  buildeeBuilding.save();
  res.sendResult = {
    status: "Success",
    message: "Successfully linked to buildee building.",
  };
  return next();
};

/**
 * Sync portfolio manager account to user account, attempt to accept any pending invites on portfolio manager system
 * If no pending invites are present, then look to the portfolio sync history for id information
 */
exports.addPortfolioAccount = async function (req, res, next) {
  const reqPortfolioUser = req.body.portfolioUser;
  const reqPortfolioPass = req.body.portfolioPass;
  const organizationId = req.body.organizationId;

  if (!reqPortfolioUser) {
    return util.sendError("Field \"portfolioUser\" is required.", 400, req, res, next);
  }
  if (!reqPortfolioPass) {
    return util.sendError("Field \"portfolioPass\" is required.", 400, req, res, next);
  }
  const alreadyConnectedAccount = await getPortfolioSyncByMailUsername(reqPortfolioPass, reqPortfolioUser);
  // if account connection already exists in portfoliosync collection
  if (alreadyConnectedAccount) {
    const tempOrgsArr = [...alreadyConnectedAccount.orgsWithAccess];
    // if org is already connected to the pm account
    if (tempOrgsArr.indexOf(organizationId) > -1) {
      res.sendResult = {
        status: "Warning",
        message: "You have already connected to this account.",
      };
      return next();
    } else {
      // add orgid to orgswithaccess
      tempOrgsArr.push(organizationId);

      if (alreadyConnectedAccount.username === "") {
        alreadyConnectedAccount.set({ orgsWithAccess: tempOrgsArr, username: reqPortfolioUser });
        await alreadyConnectedAccount.save();
        res.sendResult = {
          status: "Success",
          message: "Sync Portfolio Account",
        };
        return next();
      } else {
        alreadyConnectedAccount.set({ orgsWithAccess: tempOrgsArr });
        await alreadyConnectedAccount.save();
        res.sendResult = {
          status: "Success",
          message: "Sync Portfolio Account",
        };
        return next();
      }
    }
    // create new connection - connection doesnt exist in portfoliosync collection yet
  } else {
    const options = {
      portfolioUsername: reqPortfolioUser,
      portfolioEmail: reqPortfolioPass,
    };

    let accountDetails;
    try {
      console.log("HERE", options);
      accountDetails = await _processConnectionsGetAccountInfo(options);
      console.log("TEST", accountDetails);
      if (!accountDetails || (accountDetails && !accountDetails.account)) {
        return util.sendError("Issues gathering Portfolio Manager account details.", 400, req, res, next);
      }
    } catch (err) {
      return util.sendError("Issues gathering Portfolio Manager account details.", 400, req, res, next);
    }

    // Ensure the account data matches
    // This check is here mostly for a user which has disconnected/connected accounts
    if ((options.portfolioUsername !== accountDetails.account.username) || (options.portfolioEmail !== accountDetails.account.accountInfo.email)) {
      return util.sendError("The provided info does not match that found within Portfolio Manager", 400, req, res, next);
    }

    const portfolioSyncObject = {
      accountId: accountDetails.id,
      username: accountDetails.account.username,
      email: accountDetails.account.accountInfo.email,
      account: accountDetails.account,
      portfolioSyncHistory: accountDetails.portfolioSyncHistory,
      orgsWithAccess: [organizationId],
    };

    await savePortfolioSync(portfolioSyncObject);
    res.sendResult = {
      status: "Success",
      message: "Sync Portfolio Account",
    };
    return next();
  }
};

exports.deletePortfolioConnection = async function (req, res, next) {
  const portfolioSync = await getPortfolioSyncById(req.body.portfolioId);
  let tempOrgIds = Object.assign([], portfolioSync.orgsWithAccess);
  tempOrgIds = tempOrgIds.filter(e => e !== req.body.organizationId);

  portfolioSync.orgsWithAccess = tempOrgIds;

  await portfolioSync.save();
  res.sendResult = {
    status: "Success",
    message: "Removed Portfolio Account Connection",
  };
  return next();
};

exports.getPortfolioAccountList = async function (req, res, next) {
  // find array of portfoliosyncs with passed orgid in orgsWithAccess
  const connectedAccounts = await getPortfolioSyncByOrganization(req.query.organizationId);
  res.sendResult = {
    status: "Success",
    message: "Retrieved Connected Portfolio Accounts",
    connectedAccounts,
  };
  return next();
};

/**
 * Attempt to accept any pending invites for user properties on portfolio manager system
 */
exports.getPortfolioPropertySync = async function (req, res, next) {
  let options = {
    returnOnlyIds: true,
  };

  // Find any pending property invites, then attempt to accept
  try {
    const pendingProperties = await connectionService.getPendingPropertyInvites(options);

    // If there are no pending invites to process, return early
    if (!pendingProperties.length) {
      res.sendResult = {
        status: "Success",
        message: "Sync Portfolio Property (no property invites to process)",
      };
      return next();
    }

    options = {
      propertyIds: [],
    };

    // Filter results for the current user
    pendingProperties.map(function (property) {
      options.propertyIds.push(property.propertyId);
    });
    try {
      await connectionService.acceptPropertyInvites(options);
      res.sendResult = {
        status: "Success",
        message: "Sync Portfolio Property",
      };
      return next();
    } catch (err) {
      return util.sendError("Issues contacting Portfolio Manager server (property accept invite)", 400, req, res, next);
    }
  } catch (err) {
    return util.sendError("Issues contacting Portfolio Manager server (property pending invite)", 400, req, res, next);
  }
};

/**
 * Attempt to accept any pending invites for user meters on portfolio manager system
 */
exports.getPortfolioMeterSync = async function (req, res, next) {
  let options = {
    returnOnlyIds: true,
  };
  try {
    // Find any pending meter invites, then attempt to accept
    const pendingMeters = await connectionService.getPendingMeterInvites(options);

    // If there are no pending invites to process, return early
    if (!pendingMeters.length) {
      res.sendResult = {
        status: "Success",
        message: "Sync Portfolio Meter (no meter invites to process)",
      };
      return next();
    }

    options = {
      meterIds: [],
    };

    // Filter results for the current user
    pendingMeters.map(function (meter) {
      options.meterIds.push(meter.meterId);
    });
    try {
      await connectionService.acceptMeterInvites(options);
      res.sendResult = {
        status: "Success",
        message: "Sync Portfolio Meter",
      };
      return next();
    } catch (err) {
      return util.sendError("Issues contacting Portfolio Manager server (meter accept invite)", 400, req, res, next);
    }
  } catch (err) {
    return util.sendError("Issues contacting Portfolio Manager server (meter pending invite)", 400, req, res, next);
  }
};

const _handlePendingAccountInvites = async (pendingAccountInvites) => {
  await Promise.all(pendingAccountInvites.map(async (pendingConnection) => {
    try {
      const response = await connectionService.acceptAccountInvite({
        portfolioUserId: pendingConnection.accountId,
      });
      const portfolioSync = await getPortfolioSyncByAccountId(pendingConnection.accountId);
      if (!portfolioSync) {
        if (response &&
          response.response &&
          response.response.links &&
          response.response.links.link &&
          typeof response.response.links.link === "object") {
          const portfolioSyncObject = {
            accountId: pendingConnection.accountId,
            email: pendingConnection.accountInfo.email,
            account: pendingConnection.accountInfo,
            username: pendingConnection.connectionAudit.createdBy,
          };
          await savePortfolioSync(portfolioSyncObject);
        }
      }
    } catch (err) {
      return util.sendError("Issues contacting Portfolio Manager server (account invite sync)");
    }
  }));
};

/**
 * Attempt to accept any pending invites for user meters on portfolio manager system
 */
exports.getPortfolioAccountSync = async function (req, res, next) {
  try {
    const pendingAccounts = await connectionService.getPendingAccountConnections();

    if (pendingAccounts.length) {
      await _handlePendingAccountInvites(pendingAccounts);
      res.sendResult = {
        status: "Success",
        message: "Sync Portfolio Accounts",
      };
      return next();
    } else {
      res.sendResult = {
        status: "Success",
        message: "Sync Portfolio Accounts",
      };
      return next();
    }
  } catch (err) {
    return util.sendError("Issues contacting Portfolio Manager server (account sync)", 400, req, res, next);
  }
};
