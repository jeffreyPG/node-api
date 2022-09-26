const http = require("../http");

const baseURL = (process.env.ANALYSIS_API_IP || "http://analysis-qa.buildee.com") + ":3000";

/**
 * Gets chart image based on viewId and buildingId
 * 
 * @param {Object} query querystring object
 *
 * @returns {Promise} http request with weather as data
 */
exports.getWeathers = query => {
  const requestOptions = {
    uri: baseURL + "/weathers",
    method: "POST",
    json: true,
    params: query
  };
  return http.request(requestOptions);
}

/**
 * Gets chart image based on viewId and buildingId
 * 
 * @param {Object} query querystring object
 *
 * @returns {Promise} http request with degree days as data
 */
exports.getDegreeDays = query => {
  const requestOptions = {
    uri: baseURL + "/degreedays",
    method: "POST",
    json: true,
    params: query
  };
  return http.request(requestOptions);
}