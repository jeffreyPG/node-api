const {
  MOCK_ALL_REPSONSE,
  request,
  arrayify,
} = require("./api.portfolio.util");

/**
 * Get a list of property use types
 */
async function getPropertyUseList (propertyId) {
  if (!propertyId) {
    throw new Error("Portfolio \"propertyId\" is required.");
  }

  const opts = {
    method: "GET",
    url: "/property/" + propertyId + "/propertyUse/list",
  };

  if (MOCK_ALL_REPSONSE) {
    opts.mock = "getPropertyUseList";
  }

  // Perform the request against the portfolio service
  const { response } = await request(opts);
  if (response.errors) {
    throw new Error();
  }
  // TODO Check if links or links.link is undefined, and if only links.link is undefined remove line below
  if (!response.links) return [];
  return arrayify(response.links.link);
}

/**
 * Get Property Use Details based on ID:
 */
async function getCustomerPropertyUseDetails (propertyUseLink) {
  const opts = {
    method: "GET",
    url: propertyUseLink,
  };

  if (MOCK_ALL_REPSONSE) {
    opts.mock = "getCustomerPropertyUseDetails";
  }

  // Perform the request against the portfolio service
  return request(opts);
}

async function associateBuildingUse (payload) {
  const opts = {
    method: "POST",
    url: "/property/" + payload.propertyId + "/propertyUse",
  };

  opts.body = payload.xml;

  // Perform the request against the portfolio service
  return request(opts).catch((err) => {
    console.log(err);
    throw err;
  });
}

function deletePropertyUse (url) {
  const opts = {
    method: "DELETE",
    url: url,
  };

  // Perform the request against the portfolio service
  return request(opts);
}

module.exports = {
  getPropertyUseList,
  getCustomerPropertyUseDetails,
  associateBuildingUse,
  deletePropertyUse,
};
