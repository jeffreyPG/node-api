const moment = require("moment");

const {
  MOCK_ALL_REPSONSE,
  request,
  getXMLString,
  arrayify,
} = require("./api.portfolio.util");

const _createConsumptionMeterData = function (consumptionMeters) {
  const meterData = [];
  consumptionMeters.forEach((meter) => {
    const meterObj = {
      startDate: meter.startDate,
      endDate: meter.endDate || Date.now(),
      totalCost: meter.cost || 0,
      totalUsage: meter.usage || 0,
      demand: meter.demandTracking ? meter.demandTracking.demand : 0,
      demandCost: meter.demandTracking ? meter.demandTracking.demandCost : 0,
      estimation: meter.estimatedValue,
    };
    meterData.push(meterObj);
  });
  return meterData;
};


const _createDeliveryMeterData = function (deliveryMeters) {
  const meterData = [];
  deliveryMeters.forEach((meter) => {
    const meterObj = {
      deliveryDate: meter.deliveryDate,
      totalCost: meter.cost,
      quantity: meter.quantity,
      estimation: meter.estimatedValue,
    };
    meterData.push(meterObj);
  });
  return meterData;
};


/**
 * Get Portfolio Manager property meter data -> per meter id
 */
async function getMeterWithConsumption (meterId) {
  const opts = {
    method: "GET",
    url: "/meter/" + meterId,
  };

  if (MOCK_ALL_REPSONSE) {
    opts.mock = "getMeter";
  }

  // Perform the request against the portfolio service
  const { meter } = await request(opts);
  const consumptionOpts = {
    method: "GET",
    url: "/meter/" + meterId + "/consumptionData?startDate=" + meter.firstBillDate + "&endDate=" + (meter.inUse === "true" ? moment().format("YYYY-MM-DD") : meter.inactiveDate),
  };

  // Perform the request against the portfolio service
   const { meterData } = await request(consumptionOpts);

  meter.meterData = _createConsumptionMeterData(arrayify(meterData.meterConsumption));
  meter.deliveryData = _createDeliveryMeterData(arrayify(meterData.meterDelivery));
  return meter;
}

async function checkMeterExists (meterId) {
  try {
    const opts = {
      method: "GET",
      url: "/meter/" + meterId,
    };
    const { meter } = await request(opts);
    return !!meter;
  } catch (err) {
    return false;
  }
}

/**
 * Get Portfolio Manager meter list data -> per customer account id and property id
 */
async function getPropertyMeterList (propertyId) {
  if (!propertyId) {
    throw new Error("Portfolio \"propertyId\" is required.");
  }
  const opts = {
    method: "GET",
    url: "/property/" + propertyId + "/meter/list?myAccessOnly=true",
  };

  if (MOCK_ALL_REPSONSE) {
    opts.mock = "getPropertyMeterList";
  }

  // Perform the request against the portfolio service
  const { response } = await request(opts);
  return arrayify(response.links && response.links.link);
}

async function deletePropertyMeter (meterId) {
  const opts = {
    method: "DELETE",
    url: `/meter/${meterId}`,
  };

  if (MOCK_ALL_REPSONSE) {
    opts.mock = "deleteMethod";
  }

  // Perform the request against the portfolio service
  return request(opts);
}

async function createPortfolioMeterConsumption (payload) {
  const opts = {
    method: "POST",
    url: "/meter/" + payload.pmMeterId + "/consumptionData",
  };

  opts.body = payload.meterData;

  // Perform the request against the portfolio service
  return request(opts);
}

async function deletePortfolioMeterConsumption (payload) {
  const opts = {
    method: "DELETE",
    url: "/meter/" + payload.pmMeterId + "/consumptionData",
  };

  opts.body = payload.meterData;

  if (MOCK_ALL_REPSONSE) {
    opts.mock = "deleteMethod";
  }

  // Perform the request against the portfolio service
  return request(opts);
}

function createPortfolioMeterContent (buildeeUtility) {
  let utilType;
  let utilityUnit;

  switch (buildeeUtility.utilType) {
    case "electric":
      utilType = "Electric";
      break;
    case "natural-gas":
      utilType = "Natural Gas";
      break;
    case "water":
      utilType = "Municipally Supplied Potable Water - Mixed Indoor/Outdoor";
      break;
    case "steam":
      utilType = "District Steam";
      break;
    case "fuel-oil-2":
      utilType = "Fuel Oil No 2";
      break;
    case "fuel-oil-4":
      utilType = "Fuel Oil No 4";
      break;
    case "fuel-oil-5-6":
      utilType = "Fuel Oil No 5 or 6";
      break;
    case "diesel":
      utilType = "Diesel";
      break;
    case "other":
      utilType = "Other - Indoor";
      break;
    default:
      utilType = "Electric";
  }
  // TODO Fulfill this list
  switch (buildeeUtility.units) {
    case "kwh":
    case "kWh":
      utilityUnit = "kWh (thousand Watt-hours)";
      break;
    case "KLbs. (thousand pounds)":
      utilityUnit = "KLbs. (thousand pounds)";
      break;
    case "gallons":
      utilityUnit = "Gallons (US)";
      break;
    case "therms":
      utilityUnit = "therms";
      break;
    case "kgal":
      utilityUnit = "KGal (thousand gallons) (US)";
      break;
    default:
      utilityUnit = buildeeUtility.units;
  }
  let sortedMeter;
  let firstBillDate;
  if (buildeeUtility.meterData.length) {
    sortedMeter = buildeeUtility.meterData.sort(function (a, b) {
      a = new Date(a.startDate);
      b = new Date(b.startDate);
      return a - b;
    });
    const firstBillDateRaw = Date.parse(sortedMeter[0].startDate);
    firstBillDate = moment(firstBillDateRaw).format("YYYY-MM-DD");
  } else if (buildeeUtility.deliveryData.length) {
    sortedMeter = buildeeUtility.deliveryData.sort(function (a, b) {
      a = new Date(a.deliveryDate);
      b = new Date(b.deliveryDate);
      return a - b;
    });
    const firstBillDateRaw = Date.parse(sortedMeter[0].deliveryDate);
    firstBillDate = moment(firstBillDateRaw).format("YYYY-MM-DD");
  } 

  const xmlObj = {
    meter: {
      type: utilType,
      name: buildeeUtility.meterNumber || "Meter Name",
      unitOfMeasure: utilityUnit,
      metered: !!buildeeUtility.meterData.length,
      firstBillDate: firstBillDate || "2010-01-01",
      inUse: "true",
    },
  };
  let xmlBlob;
  try {
    xmlBlob = getXMLString(xmlObj);
  } catch (err) {
    throw new Error(`Issues generating xml from request: ${err}`);
  }
  return xmlBlob;
}

/**
 * Create buildee building in Portfolio Manager account
 */
async function createPortfolioMeter (buildeeUtility, propertyId) {
  const opts = {
    method: "POST",
    url: "/property/" + propertyId + "/meter",
  };
  const xmlBlob = createPortfolioMeterContent(buildeeUtility);

  opts.body = xmlBlob;

  // Perform the request against the portfolio service
  try {
  const { response } = await request(opts);
  return response.links.link.link;
  } catch(err) {
    console.log(err);
  }
}

async function updatePortfolioMeter (buildeeUtility, meterId) {
  /**
 * Create buildee building in Portfolio Manager account
 */
  const opts = {
    method: "PUT",
    url: `/meter/${meterId}`,
  };
  const xmlBlob = createPortfolioMeterContent(buildeeUtility);
  opts.body = xmlBlob;

  // Perform the request against the portfolio service
  const { response } = await request(opts);
  return response.links.link.link;
}

async function getCurrentAssociateMeters (payload) {
  const opts = {
    method: "GET",
    url: "/association/property/" + payload.propertyId + "/meter",
  };

  // Perform the request against the portfolio service
  const { meterPropertyAssociationList } = await request(opts);
  let meterIds = [];
  if (meterPropertyAssociationList.energyMeterAssociation) {
    meterIds = meterIds.concat(arrayify(meterPropertyAssociationList.energyMeterAssociation.meters.meterId));
  }
  if (meterPropertyAssociationList.waterMeterAssociation) {
    meterIds = meterIds.concat(arrayify(meterPropertyAssociationList.waterMeterAssociation.meters.meterId));
  }
  return meterIds;
}

function associateMeters (payload) {
  const opts = {
    method: "POST",
    url: "/association/property/" + payload.propertyId + "/meter",
  };

  opts.body = payload.xml;

  // Perform the request against the portfolio service
  return request(opts);
}

function deleteAssociateMeter (payload) {
  const opts = {
    method: "DELETE",
    url: "/association/property/" + payload.propertyId + "/meter/" + payload.meterId,
  };

  if (MOCK_ALL_REPSONSE) {
    opts.mock = "deleteMethod";
  }

  // Perform the request against the portfolio service
  return request(opts);
}

module.exports = {
  getMeterWithConsumption,
  checkMeterExists,
  getPropertyMeterList,
  deletePropertyMeter,
  createPortfolioMeterConsumption,
  deletePortfolioMeterConsumption,
  createPortfolioMeter,
  updatePortfolioMeter,
  associateMeters,
  getCurrentAssociateMeters,
  deleteAssociateMeter,
};
