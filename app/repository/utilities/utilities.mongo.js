const { Utility } = require("../../models/utility.server.model");
const utils = require("../mongo.utils");

exports.getChangeStream = onChangeStream => {
  return Utility.watch().on('change', data => {
    console.debug("Utilities Mongo -> On change stream")
    onChangeStream(data);
  });
}

exports.findByIds = (ids, extraFilter) => {
  const mappedIds = utils.mapStringArrayIntoObjectIdArray(ids);
  let filter = {};
  filter["_id"] = {
    "$in": mappedIds
  };
  filter = Object.assign(filter, extraFilter);
  return Utility.find(filter);
}

exports.findByIdsAndExistingData = ids => {
  const filter = {
    "$or": [
      {
        "meterData.0": {
          "$exists": true
        }
      },
      {
        "deliveryData.0": {
          "$exists": true
        }
      }
    ]
  };
  return exports.findByIds(ids, filter);
}

exports.findEarliestStartDateMeterData = ids => {
  const filter = {
    "meterData.0.startDate": { $exists: true }
  };
  return exports.findByIds(ids, filter).project({ meterData: 1 }).sort({ "meterData.startDate": 1 }).limit(1);
}

exports.findEarliestDeliveryDateDeliveryData = ids => {
  const filter = {
    "deliveryData.0.deliveryDate": { $exists: true }
  };
  return exports.findByIds(ids, filter).project({ deliveryData: 1 }).sort({ "deliveryData.deliveryDate": 1 }).limit(1);
}