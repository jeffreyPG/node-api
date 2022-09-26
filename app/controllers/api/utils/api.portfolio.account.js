const {
  MOCK_ALL_REPSONSE,
  request,
  getXMLString,
} = require("./api.portfolio.util");

/**
 * Get Portfolio Manager account data - per account id
 */
async function getCustomerAccount (options) {
  if (!options.portfolioUserId) {
    throw new Error("Portfolio \"portfolioUserId\" is required.");
  }

  const opts = {
    method: "GET",
    url: "/customer/" + options.portfolioUserId,
  };

  if (MOCK_ALL_REPSONSE) {
    opts.mock = "getCustomerAccount";
  }

  // Perform the request against the portfolio service
  return request(opts);
}

/**
 * Create customer Portfolio Manager account, which will create a connection (share) to the parent account
 */
async function createCustomerAccount (request) {
  const opts = {
    method: "POST",
    url: "/customer",
  };

  if (MOCK_ALL_REPSONSE) {
    opts.mock = "createCustomerAccount";
  }

  const xmlObj = {
    account: {
      username: request.username || "",
      password: request.password || "",
      webserviceUser: "true",
      searchable: "false",
      contact: {
        email: request.email || "",
        firstName: request.firstName || "",
        lastName: request.lastName || "",
        phone: request.phone || "",
        jobTitle: request.jobTitle || "Default Job Title",
      },
      organization: {
        $: {
          name: request.organization || "",
        },
        primaryBusiness: "Other",
        otherBusinessDescription: "other",
        energyStarPartner: "true",
        energyStarPartnerType: "Service and Product Providers",
      },
    },
  };
  if (request.address) {
    xmlObj.account.contact.address = {
      $: {
        address1: request.address.address1 || "",
        city: request.address.city || "",
        state: request.address.state || "",
        postalCode: request.address.postalCode || "",
        country: request.address.country || "",
      },
    };
  }
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

module.exports = {
  getCustomerAccount,
  createCustomerAccount,
};
