const repository = require("../repository");
const service = require("./weather.service");
const moment = require("moment");

exports.init = () => {
  setSchedulers();
  validateWeatherUpdate();
}

/**
 * Set schedulers to run with given period of time
 */
const setSchedulers = () => {
  //run every day
  setInterval(validateWeatherUpdate, 1 * 24 * 60 * 60 * 1000);
}

/**
 * Validates if latest saved weather data is lower than previous month
 * If it is, then tries to update weather data for the previous month
 * If not, do nothing
 */
const validateWeatherUpdate = () => {
  console.debug("Weather validateWeatherUpdate", moment().toISOString());
  repository.weathers.findLatestWeatherDate().then(entry => {
    const currentDate = moment().startOf("month").subtract(1, "month");
    const latestDate = moment(entry.date).startOf("month");
    if (latestDate.isBefore(currentDate)) {
      executeWeatherUpdate();
    }
  })
}

/**
 * Gets building ids with utility data and triggers generate function with those ids as options
 */
const executeWeatherUpdate = () => {
  console.debug("Weather executeWeatherUpdate", moment().toISOString());
  repository.buildings.findIdsWithUtilityData().then(entries => {
    const ids = entries.map(entry => entry._id);
    service.generate({ buildingIds: ids });
  })
}