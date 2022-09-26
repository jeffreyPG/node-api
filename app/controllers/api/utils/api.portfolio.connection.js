const _ = require("lodash");

const {
  MOCK_ALL_REPSONSE,
  request,
  getXMLString,
} = require("./api.portfolio.util");

/**
 * Get a list of pending invites for account connections
 */
async function getPendingAccountConnections () {
  const opts = {
    method: "GET",
    url: "/connect/account/pending/list",
  };

  if (MOCK_ALL_REPSONSE) {
    opts.mock = "getPendingAccountConnections";
  }

  const previousPages = [];
  let pendingAccounts = [];
  const __performPaginatedRequest = async function (link, method) {
    // Perform the request against the portfolio service
    const response = await request(Object.assign({}, opts, {
      url: link || opts.url,
      method: (method) ? method.toUpperCase() : opts.method,
    }));
    if (response.pendingList && Object.keys(response.pendingList).length === 0 && response.pendingList.constructor === Object) {
      return "No account with these credentials have been connected to the simuwatt account.";
    }

    // Normalize the return data to return properties in an array
    if (response.pendingList && response.pendingList.account) {
      pendingAccounts = pendingAccounts.concat(
        (_.isArray(response.pendingList.account)) ? response.pendingList.account : [response.pendingList.account]
      );
    }

    // Need to handle any paginated results
    if (
      response.pendingList && response.pendingList.links && response.pendingList.links.link &&
      response.pendingList.links.link.link && response.pendingList.links.link.httpMethod &&
      previousPages.indexOf(response.pendingList.links.link.link + response.pendingList.links.link.httpMethod) === -1 &&
      response.pendingList.links.link.linkDescription && response.pendingList.links.link.linkDescription === "next page"
    ) {
      // Ensure we havent requested the same page previously
      previousPages.push(response.pendingList.links.link.link + response.pendingList.links.link.httpMethod);
      return __performPaginatedRequest(
        response.pendingList.links.link.link,
        response.pendingList.links.link.httpMethod
      );
    }
  };

  await __performPaginatedRequest();
  return pendingAccounts;
}

/**
 * Accept a user connection / account invite
 */
async function acceptAccountInvite (options) {
  if (!options.portfolioUserId) {
    throw new Error("Portfolio \"portfolioUserId\" is required.");
  }

  const opts = {
    method: "POST",
    url: "/connect/account/" + options.portfolioUserId,
  };

  if (MOCK_ALL_REPSONSE) {
    opts.mock = "acceptAccountInvite";
  }

  const xmlObj = {
    sharingResponse: {
      action: "Accept",
      note: "Your connection request has been verified and accepted.",
    },
  };
  let xmlBlob;
  try {
    xmlBlob = getXMLString(xmlObj);
  } catch (err) {
    throw new Error(`Issues generating xml from request: ${err}`);
  }

  opts.body = xmlBlob;

  // Perform the request against the portfolio service
  return request(opts);
}

/**
 * Get a list of pending invites for property shares
 */
async function getPendingPropertyInvites (options) {
  const opts = {
    method: "GET",
    url: "/share/property/pending/list",
  };

  if (MOCK_ALL_REPSONSE) {
    opts.mock = "getPendingPropertyInvites";
  }

  const previousPages = [];
  let pendingProperties = [];
  const __performPaginatedRequest = async function (link, method) {
    // Perform the request against the portfolio service
    const response = await request(Object.assign({}, opts, {
      url: link || opts.url,
      method: (method) ? method.toUpperCase() : opts.method,
    }));

    // Normalize the return data to return properties in an array
    if (response.pendingList && response.pendingList.property) {
      pendingProperties = pendingProperties.concat(
        (_.isArray(response.pendingList.property)) ? response.pendingList.property : [response.pendingList.property]
      );
    }

    // Need to handle any paginated results
    if (
      response.pendingList && response.pendingList.links && response.pendingList.links.link &&
      response.pendingList.links.link.link && response.pendingList.links.link.httpMethod &&
      previousPages.indexOf(response.pendingList.links.link.link + response.pendingList.links.link.httpMethod) === -1 &&
      response.pendingList.links.link.linkDescription && response.pendingList.links.link.linkDescription === "next page"
    ) {
      // Ensure we havent requested the same page previously
      previousPages.push(response.pendingList.links.link.link + response.pendingList.links.link.httpMethod);
      return __performPaginatedRequest(
        response.pendingList.links.link.link,
        response.pendingList.links.link.httpMethod
      );
    }
  };

  await __performPaginatedRequest();
  // Only return the ids if option is set
  if (pendingProperties.length) {
    if (options.returnOnlyIds) {
      return pendingProperties;
    }
    const pendingPropertyIds = [];
    pendingProperties.map(function (property) {
      if (property.propertyId) {
        pendingPropertyIds.push({
          propertyId: property.propertyId,
          accountId: property.accountId || null,
        });
      }
    });
    return pendingPropertyIds;
  }
  return [];
}

/**
 * Accept property invites per the passed property ids
 */
async function acceptPropertyInvites (options) {
  if (!options.propertyIds) {
    throw new Error("Portfolio \"propertyIds\" is required.");
  }
  if (options.propertyIds && !_.isArray(options.propertyIds)) {
    throw new Error("Portfolio \"propertyIds\" must be an array.");
  }

  // If no ids were passed, then just return an empty result array
  if (!options.propertyIds.length) {
    return [];
  }

  const opts = {
    method: "POST",
    url: "/share/property/:propertyId",
  };

  if (MOCK_ALL_REPSONSE) {
    opts.mock = "acceptPropertyInvites";
  }

  const xmlObj = {
    sharingResponse: {
      action: "Accept",
      note: "Your sharing request has been verified and accepted.",
    },
  };
  let xmlBlob;
  try {
    xmlBlob = getXMLString(xmlObj);
  } catch (err) {
    throw new Error(`Issues generating xml from request: ${err}`);
  }

  opts.body = xmlBlob;

  // Perform the requests against the portfolio service for each id
  await Promise.all(options.propertyIds.map(function (propertyId) {
    return request(Object.assign({}, opts, { url: opts.url.replace(":propertyId", propertyId) }));
  }));
}

/**
 * Get a list of pending invites for meter shares
 */
async function getPendingMeterInvites (options) {
  const opts = {
    method: "GET",
    url: "/share/meter/pending/list",
  };

  if (MOCK_ALL_REPSONSE) {
    opts.mock = "getPendingMeterInvites";
  }

  const previousPages = [];
  let pendingMeters = [];
  const __performPaginatedRequest = async function (link, method) {
    // Perform the request against the portfolio service
    const response = await request(Object.assign({}, opts, {
      url: link || opts.url,
      method: (method) ? method.toUpperCase() : opts.method,
    }));

    // Normalize the return data to return meters in an array
    if (response.pendingList && response.pendingList.meter) {
      pendingMeters = pendingMeters.concat(
        (_.isArray(response.pendingList.meter)) ? response.pendingList.meter : [response.pendingList.meter]
      );
    }

    // Need to handle any paginated results
    if (
      response.pendingList && response.pendingList.links && response.pendingList.links.link &&
      response.pendingList.links.link.link && response.pendingList.links.link.httpMethod &&
      previousPages.indexOf(response.pendingList.links.link.link + response.pendingList.links.link.httpMethod) === -1 &&
      response.pendingList.links.link.linkDescription && response.pendingList.links.link.linkDescription === "next page"
    ) {
      // Ensure we havent requested the same page previously
      previousPages.push(response.pendingList.links.link.link + response.pendingList.links.link.httpMethod);
      return __performPaginatedRequest(
        response.pendingList.links.link.link,
        response.pendingList.links.link.httpMethod
      );
    }
  };

  await __performPaginatedRequest();

  // Only return the ids if option is set
  if (pendingMeters.length) {
    if (options.returnOnlyIds) {
      return pendingMeters;
    }
    const pendingMeterIds = [];
    pendingMeters.map(function (meter) {
      if (meter.propertyId) {
        pendingMeterIds.push({
          propertyId: meter.propertyId,
          meterId: meter.meterId,
          accountId: meter.accountId || null,
        });
      }
    });
    return pendingMeterIds;
  }

  return [];
}

/**
 * Accept meter invites per the passed meter ids
 */
async function acceptMeterInvites (options) {
  if (!options.meterIds) {
    throw new Error("Portfolio \"meterIds\" is required.");
  }
  if (options.meterIds && !_.isArray(options.meterIds)) {
    throw new Error("Portfolio \"meterIds\" must be an array.");
  }

  // If no ids were passed, then just return an empty result array
  if (!options.meterIds.length) {
    return [];
  }

  const opts = {
    method: "POST",
    url: "/share/meter/:meterId",
  };

  if (MOCK_ALL_REPSONSE) {
    opts.mock = "acceptPropertyInvites";
  }

  const xmlObj = {
    sharingResponse: {
      action: "Accept",
      note: "Your sharing request has been verified and accepted.",
    },
  };
  let xmlBlob;
  try {
    xmlBlob = getXMLString(xmlObj);
  } catch (err) {
    throw new Error(`Issues generating xml from request: ${err}`);
  }

  opts.body = xmlBlob;

  // Perform the requests against the portfolio service for each id
  await Promise.all(options.meterIds.map(function (meterId) {
    return request(Object.assign({}, opts, { url: opts.url.replace(":meterId", meterId) }));
  }));
}

module.exports = {
  getPendingAccountConnections,
  acceptAccountInvite,
  getPendingPropertyInvites,
  acceptPropertyInvites,
  getPendingMeterInvites,
  acceptMeterInvites,
};
