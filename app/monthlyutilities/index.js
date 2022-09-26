const utilitiesService = require("../utilities/utilities.service");
const service = require("./monthlyutilities.service");

exports.init = () => {
  utilitiesService.registerUtilityChangesHandler(service.utilityChangesHandler);
}