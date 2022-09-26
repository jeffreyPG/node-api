const service = require("./utilities.service");

exports.init = () => {
  service.listenForUtilityChanges();
}