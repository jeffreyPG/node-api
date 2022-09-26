const utilitiesService = require("../utilities/utilities.service");
const service = require("./weather.service");
const scheduler = require("./weather.scheduler");

exports.init = () => {
  utilitiesService.registerUtilityChangesHandler(service.utilityChangesHandler);
  scheduler.init();
}