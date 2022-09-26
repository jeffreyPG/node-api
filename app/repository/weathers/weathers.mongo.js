
const { Weather } = require("../../models/weather.script.model");


/**
 * Gets weather entries based on zipcodes, ordered by date descending
 * 
 * @param {string[]} zipcodes zipcodes to filter data with
 */
exports.findByZipCodes = (zipcodes) => {
  let filter = {};
  filter["location"] = {
    "$in": zipcodes
  };
  const projection = {
    "date": 1,
    "location": 1,
    "year": 1,
    "hdd": 1,
    "cdd": 1,
    "_id": 0
  };
  return Weather.find(filter, projection).sort({ "date": -1 });
}

/**
 * Gets latest date from weathers collection
 */
exports.findLatestWeatherDate = () => {
  return Weather.findOne({}, { date: 1 }).sort({ "date": -1 });
}

/**
 * Deletes weather data based on zipcodes
 * 
 * @param {string[]} zipcodes zipcodes to filter data to be deleted
 */
exports.deleteByZipCodes = (zipcodes) => {
  let filter = {};
  filter["location"] = {
    "$in": zipcodes
  };
  return Weather.deleteMany(filter);
}

exports.insertMany = weathers => {
  return Weather.insertMany(weathers);
}