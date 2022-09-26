const {
  MOCK_ALL_REPSONSE,
  request,
  getXMLString,
  arrayify,
  getBuildingUse,
} = require("./api.portfolio.util");

async function getBuildingIdentifiers (payload) {
  const opts = {
    method: "GET",
    url: "/property/" + payload.propertyId + "/identifier/list",
  };

  // Perform the request against the portfolio service
  const response = await request(opts);

  if (response && response.additionalIdentifiers && response.additionalIdentifiers.additionalIdentifier) {
    return arrayify(response.additionalIdentifiers.additionalIdentifier);
  }

  return [];
}

/**
 * Get Portfolio Manager property data -> per property id
 */
async function getCustomerProperty (propertyId) {
  if (!propertyId) {
    throw new Error("Portfolio \"propertyId\" is required.");
  }

  const opts = {
    method: "GET",
    url: "/property/" + propertyId,
  };

  if (MOCK_ALL_REPSONSE) {
    opts.mock = "getCustomerProperty";
  }
  // Perform the request against the portfolio service
  return request(opts);
}

/**
 * Get Portfolio Manager property list data -> per customer account id
 */
async function getCustomerPropertyList (options) {
  if (!options.portfolioUserId) {
    throw new Error("Portfolio \"portfolioUserId\" is required.");
  }

  const opts = {
    method: "GET",
    url: "/account/" + options.portfolioUserId + "/property/list",
  };

  if (MOCK_ALL_REPSONSE) {
    opts.mock = "getCustomerPropertyList";
  }

  // Perform the request against the portfolio service
  const { response } = await request(opts);
  if (response.errors) {
    throw new Error();
  }
  if (!response.links) return [];
  return arrayify(response.links.link);
}

/**
 * Create buildee building in Portfolio Manager account
 */
async function createPortfolioBuilding (payload) {
  const opts = {
    method: "POST",
    url: "/account/" + payload.accountId + "/property",
  };

  const xmlObj = {
    property: {
      name: payload.buildeeBuilding.buildingName || "",
      constructionStatus: "Existing",
      primaryFunction: getBuildingUse("buildee", "pm", payload.buildeeBuilding.buildingUse),
      grossFloorArea: {
        value: payload.buildeeBuilding.squareFeet || "",
        $: {
          units: "Square Feet",
          temporary: "true",
        },
      },
      yearBuilt: payload.buildeeBuilding.buildYear || "",
      address: {
        $: {
          postalCode: payload.buildeeBuilding.location.zipCode,
          address1: payload.buildeeBuilding.location.address,
          city: payload.buildeeBuilding.location.city,
          state: (payload.buildeeBuilding.location.state).toUpperCase(),
          country: "US",
        },
      },
      numberOfBuildings: "1",
      isFederalProperty: "false",
      occupancyPercentage: "100",
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
  const { response } = await request(opts);
  if (response.errors) {
    throw new Error("Error during creating property");
  }

  return response.links.link.link;
}

/**
 * Update buildee building in Portfolio Manager account
 */
async function updatePortfolioBuilding ({ buildeeBuilding, propertyId }) {
  const opts = {
    method: "PUT",
    url: "/property/" + propertyId,
  };

  const xmlObj = {
    property: {
      name: buildeeBuilding.buildingName,
      address: {
        $: {
          address1: buildeeBuilding.location.address,
          postalCode: buildeeBuilding.location.zipCode,
          city: buildeeBuilding.location.city,
          state: buildeeBuilding.location.state,
          country: "US",
        },
      },
      yearBuilt: buildeeBuilding.buildYear,
      grossFloorArea: {
        $: {
          units: "Square Feet",
        },
        value: buildeeBuilding.squareFeet,
      },
      primaryFunction: getBuildingUse("buildee", "pm", buildeeBuilding.buildingUse),
      constructionStatus: "Existing",
      occupancyPercentage: "100",
      isFederalProperty: false,
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
 * Create buildee building in Portfolio Manager account
 */
async function createCustomField (payload) {
  const opts = {
    method: "POST",
    url: "/property/" + payload.propertyId + "/identifier",
  };
  const customField = payload.customField;
  const description = customField.key || "";
  const type = customField.standardApproved ? customField.typeId : payload.counter;

  opts.body = "<additionalIdentifier><additionalIdentifierType id=\"" + type + "\"/><description>" + description + "</description><value>" + customField.value + "</value></additionalIdentifier>";
  // // Perform the request against the portfolio service
  const response = await request(opts);
  return response && response.id;
}
async function removeIdentifier (payload) {
  const opts = {
    method: "DELETE",
    url: `/property/${payload.propertyId}/identifier/${payload.id}`,
  };

  // // Perform the request against the portfolio service
  const response = await request(opts);
  return response && response.id;
}

module.exports = {
  getBuildingIdentifiers,
  getCustomerProperty,
  getCustomerPropertyList,
  createPortfolioBuilding,
  updatePortfolioBuilding,
  createCustomField,
  removeIdentifier,
};
