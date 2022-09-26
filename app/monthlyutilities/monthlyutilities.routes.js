
const logger = require("../controllers/api/utils/api.logger")
const controller = require("./monthlyutilities.controller");

module.exports = function(app) {
  app.route("/scripts/monthlyutilities").post(controller.monthlyUtilities, logger.log);
};