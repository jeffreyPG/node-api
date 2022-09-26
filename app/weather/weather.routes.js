const logger = require("../controllers/api/utils/api.logger");
const controller = require("./weather.controller");

module.exports = function(app) {
  app.route("/scripts/weather").post(controller.generateWeather, logger.log);
};
