const repository = require("../repository");

const utilityChangesHandlers = [];

exports.listenForUtilityChanges = () => {
  console.debug("listenForUtilityChanges -> Listening");
  repository.utilities.getChangeStream(data => {
    console.debug("listenForUtilityChanges -> Utility with id", data.documentKey._id, "was changed");

    repository.buildings.findByUtilityIds([data.documentKey._id]).then(buildings => {
      if (buildings) {
        utilityChangesHandlers.forEach(handler => {
          if (typeof handler === "function") {
            handler(buildings.map(building => building._id));
          }
        });
      };
    }).catch(error => console.error("listenForUtilityChanges -> An error occurred while getting buildings based on utility id:", data.documentKey._id, error));
  });
};

exports.getUtilityDataEarliestDate = utilityIds => {
  const datePromises = [];
  let deliveryData, meterData;
  datePromises.push(repository.utilities.findEarliestDeliveryDateDeliveryData(utilityIds).then(data => data ? deliveryData = data.deliveryData : null));
  datePromises.push(repository.utilities.findEarliestStartDateMeterData(utilityIds).then(data => data ? meterData = data.meterData : null));
  return Promise.all(datePromises).then(() => {
    let earliestDeliveryDate = moment(), earliestStartDate = moment();
    if (deliveryData) earliestDeliveryDate = moment(_.sortBy(deliveryData, "deliveryDate")[0].deliveryDate);
    if (meterData) earliestStartDate = moment(_.sortBy(meterData, "deliveryDate")[0].startDate);
    return earliestDeliveryDate.isSameOrAfter(earliestStartDate) ? earliestDeliveryDate : earliestStartDate;
  });
}

exports.getUtilities = utilityIds => {
  const datePromises = [];
  let deliveryData, meterData;
  datePromises.push(repository.utilities.findEarliestDeliveryDateDeliveryData(utilityIds).then(data => data ? deliveryData = data.deliveryData : null));
  datePromises.push(repository.utilities.findEarliestStartDateMeterData(utilityIds).then(data => data ? meterData = data.meterData : null));
  return Promise.all(datePromises).then(() => {
    let earliestDeliveryDate = moment(), earliestStartDate = moment();
    if (deliveryData) earliestDeliveryDate = moment(_.sortBy(deliveryData, "deliveryDate")[0].deliveryDate);
    if (meterData) earliestStartDate = moment(_.sortBy(meterData, "deliveryDate")[0].startDate);
    return earliestDeliveryDate.isSameOrAfter(earliestStartDate) ? earliestDeliveryDate : earliestStartDate;
  });
}

exports.registerUtilityChangesHandler = func => {
  utilityChangesHandlers.push(func);
}