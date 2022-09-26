const repository = require("../repository");
const organizationsService = require("../organizations/organizations.service");
const weatherProxyController = require("../api/weatherProxy.controller");
const mongoose = require("mongoose");
const Building = mongoose.model("Building");
const moment = require("moment");
const ObjectId = mongoose.Types.ObjectId;
const _ = require("lodash");

const generateWaitingTime = 3 * 1000; // 3 seconds
let generateTimeoutFunction; // 3 seconds
let buildingIdsToProcess = []; // 3 seconds

const HEATING_BALANCE = "65.0";
const COOLING_BALANCE = "70.0";
const STARTDATE = "2005-01-01"; // YYYY-DD-MM

/**
 * Handler to process utility changes. It only starts generating weather data after x amount of milliseconds so that multiple building ids can be processed at the same time
 *
 * @param {string[]} buildingIds Building ids that had their utility data updated
 */
exports.utilityChangesHandler = buildingIds => {
  if (generateTimeoutFunction) clearTimeout(generateTimeoutFunction);
  buildingIdsToProcess = _.union(buildingIdsToProcess, buildingIds);
  generateTimeoutFunction = setTimeout(() => {
    console.debug(
      "Weather utilityChangesHandler -> Generating weather after waiting",
      generateWaitingTime,
      "milliseconds"
    );
    exports.generate({ buildingIds: Object.assign([], buildingIdsToProcess) });
    buildingIdsToProcess = [];
  }, generateWaitingTime);
};

/**
 * generates weather data to be stored in mongo for given options
 *
 * @param {object} options it can received either organizationIds or buildingIds and set if data should be fully updated (update) and which specific years to process (years)
 */
exports.generate = options => {
  try {
    console.log(
      "Weather generate -> Started for options",
      JSON.stringify(options)
    );
    organizationsService
      .getBuildingIds(options.organizationIds, options.buildingIds)
      .then(ids => {
        let buildingIds = [];
        for (let id of ids) {
          if (mongoose.Types.ObjectId.isValid(id)) buildingIds.push(id);
          else if (id.includes(",")) buildingIds.push(...id.split(","));
          else buildingIds.push(id);
        }
        buildingIds = buildingIds.map(id =>
          mongoose.Types.ObjectId.isValid(id) ? id : ObjectId(id)
        );
        Building.find({ _id: { $in: buildingIds }, archived: false })
          .then(buildings => {
            const buildingIds = buildings
              .filter(
                building =>
                  building?.location?.zipCode &&
                  building?.location?.zipCode.length >= 5
              )
              .map(building => building._id.toString());
            console.log(
              "Weather generate -> Getting zipcodes for buildings",
              JSON.stringify(buildingIds)
            );
            repository.buildings
              .findZipCodesByBuildingIds(buildingIds)
              .then(zipcodes => {
                if (zipcodes.length > 0) {
                  // remove duplicates
                  zipcodes = zipcodes.filter(
                    (v, i) => zipcodes.indexOf(v) === i
                  );
                  let zipcodePromise;
                  // if update = true is received, remove all values from the DB for zipcodes
                  // else get the existing weather data
                  if (options.update) {
                    zipcodePromise = repository.weathers
                      .deleteByZipCodes(zipcodes)
                      .then(data => {
                        console.log(
                          "Weather generate -> Removed ",
                          data.n,
                          "entries from weathers collection with locations",
                          JSON.stringify(zipcodes)
                        );
                        return [];
                      });
                  } else {
                    console.log(
                      "Weather generate -> Getting weather entries for zipcodes",
                      JSON.stringify(zipcodes)
                    );
                    zipcodePromise = repository.weathers.findByZipCodes(
                      zipcodes
                    );
                  }
                  zipcodePromise.then(existingWeatherData => {
                    const weatherDataByZipcode = _.groupBy(
                      existingWeatherData,
                      "location"
                    );
                    const years = (options && options.years) || null;
                    processZipCodes(zipcodes, years, weatherDataByZipcode);
                  });
                } else {
                  console.log(
                    "Weather generate -> No zipcodes for buildings",
                    JSON.stringify(buildingIds)
                  );
                }
              });
          })
          .catch(err => {
            console.log("err", err);
          });
      })
      .catch(err => {
        console.log("err", err);
      });
  } catch (error) {
    console.error("Weather generate -> ", error);
  } finally {
  }
};

/**
 * Function created to ensure http requests are synchronous so it doesn't explode analysis/weather api
 *
 * @param {string[]} zipcodes
 * @param {string[]} years
 * @param {object[]} weatherDataByZipcode
 */
const processZipCodes = async (zipcodes, years, weatherDataByZipcode) => {
  let zipCodeIndex = 0;
  const processCode = index => {
    let zipcode = zipcodes[index];
    if (zipcode && zipcode.length > 0) {
      const processStart = moment();
      console.log(
        "Weather generate -> Started process for zipcode",
        zipcode,
        "at",
        moment().toISOString()
      );
      const dates = getStartEndDates(weatherDataByZipcode[zipcode], years);
      zipcode = convertToValidZipcodes([zipcode])[0];
      processDates(dates, zipcode).then(data => {
        const weathersToSave = data.weathersToSave;
        const processedDates = data.processedDates;
        if (weathersToSave && weathersToSave.length) {
          console.log(
            "Weather generate -> Saving for zipcode",
            zipcode,
            "and dates",
            JSON.stringify(
              processedDates.map(d => {
                return { start_date: d.start_date, end_date: d.end_date };
              })
            )
          );
          repository.weathers.insertMany(weathersToSave).then(() => {
            console.log(
              "Weather generate -> Saved",
              weathersToSave.length,
              "total entries for zipcode",
              zipcode,
              "and dates",
              JSON.stringify(processedDates)
            );
          });
        } else {
          console.log(
            "Weather generate -> No weather entries to save for zipcode",
            zipcode,
            "and dates",
            JSON.stringify(dates)
          );
        }
        console.log(
          "Weather generate -> Ended process for zipcode",
          zipcode,
          "at",
          moment().toISOString(),
          "It took",
          moment().diff(processStart, "minutes"),
          "minutes to complete"
        );
        if (zipCodeIndex < zipcodes.length - 1) {
          zipCodeIndex++;
          processCode(zipCodeIndex);
        }
      });
    } else {
      if (zipCodeIndex < zipcodes.length - 1) {
        zipCodeIndex++;
        processCode(zipCodeIndex);
      }
    }
  };
  processCode(zipCodeIndex);
};

/**
 * Function created to ensure http requests are synchronous so it doesn't explode analysis/weather api
 *
 * @param {moment[]} dates
 * @param {string} zipcode
 */
const processDates = (dates, zipcode) => {
  let weathersToSave = [];
  let processedDates = [];
  let dateIndex = 0;
  if (!zipcode) return Promise.resolve({});
  const processDate = index => {
    let date = dates[index];
    date.end = moment(date.end, "L").isSameOrAfter(moment(), "month")
      ? date.end
      : moment(date.end, "L")
          .add(1, "month")
          .endOf("month")
          .format("L");
    if (moment(date.end).isSameOrAfter(moment(), "month")) {
      date.end = moment()
        .subtract(1, "months")
        .endOf("month")
        .format("MM/DD/YYYY");
    }
    if (
      moment(date.start).isSameOrAfter(moment(), "month") ||
      moment(date.end).isSameOrAfter(moment(), "month") ||
      moment(date.start).isSameOrAfter(moment(date.end), "month")
    ) {
      return Promise.resolve();
    }

    let weatherData,
      degreeDaysData,
      requestStart = moment();
    const weatherRequestParams = {
      location: zipcode,
      start_date: date.start,
      stop_date: date.end
    };
    let degreeDaysRequestParams = {
      location: zipcode,
      start_date: date.start,
      end_date: date.end,
      heating_balance: HEATING_BALANCE,
      cooling_balance: COOLING_BALANCE
    };

    console.log(
      "Weather generate -> Getting weather data for params",
      JSON.stringify(weatherRequestParams)
    );
    return weatherProxyController
      .getWeathers(weatherRequestParams)
      .then(data => {
        weatherData = data;
        weatherData = (weatherData && weatherData.timeseries) || [];
      })
      .catch(error => {
        console.error(
          "Weather generate -> getWeathers for params",
          JSON.stringify(weatherRequestParams),
          "error",
          error.message ? error.message.substring(0, 200) : ""
        );
      })
      .finally(() => {
        console.log(
          "Weather generate -> getWeathers took",
          moment().diff(requestStart, "seconds"),
          "seconds to complete"
        );
        console.log(
          "Weather generate -> Getting degree days data for params",
          JSON.stringify(degreeDaysRequestParams)
        );
        requestStart = moment();
        return weatherProxyController
          .getDegreeDays(degreeDaysRequestParams)
          .then(data => (degreeDaysData = data))
          .catch(error => {
            console.error(
              "Weather generate -> getDegreeDays for params",
              JSON.stringify(degreeDaysRequestParams),
              "error",
              error.message ? error.message.substring(0, 200) : ""
            );
          })
          .finally(() => {
            console.log(
              "Weather generate -> getDegreeDays took",
              moment().diff(requestStart, "seconds"),
              "seconds to complete"
            );
            const expectedResults =
              moment(date.end, "L").year() > moment(date.start, "L").year()
                ? 12
                : moment(date.end, "L").month();
            if (weatherData && degreeDaysData) {
              const dataToSave = getFormattedWeatherDataToSave(
                zipcode,
                weatherData,
                degreeDaysData
              );
              weathersToSave = _.concat(dataToSave, weathersToSave);
              processedDates.push({
                start_date: date.start,
                end_date: date.end,
                expectedResults: expectedResults,
                returnedResults: dataToSave.length
              });
            } else {
              if (!degreeDaysData)
                console.error(
                  "Weather generate -> No degree days data received for params",
                  JSON.stringify(degreeDaysRequestParams)
                );
              if (!weatherData)
                console.error(
                  "Weather generate -> No weather data received for params",
                  JSON.stringify(weatherRequestParams)
                );
              processedDates.push({
                start_date: date.start,
                end_date: date.end,
                expectedResults: expectedResults,
                returnedResults: 0
              });
            }
            if (dateIndex < dates.length - 1) {
              dateIndex++;
              return processDate(dateIndex);
            }
          });
      });
  };
  return processDate(dateIndex).then(() => {
    return { weathersToSave, processedDates };
  });
};

/**
 *  Returns the start and end dates
 */
const getStartEndDates = (data = null, years = null) => {
  let dates = [];
  if (data && !data.length) data = null;
  if (years && !years.length) years = null;

  if (data && !years) {
    // need to get the dates from the last insertion to current date.
    let startDate = data[0] && data[0].date;
    startDate = moment(startDate)
      .add(1, "month")
      .startOf("month");
    let endDate = moment().startOf("month");
    dates = getDatesYearly(startDate, endDate);
  } else if (!data && !years) {
    // need to get the dates from STARTDATE to current date.
    let startDate = moment(STARTDATE).startOf("year");
    let endDate = moment().startOf("month");
    dates = getDatesYearly(startDate, endDate);
  } else if (!data && years) {
    // need to get the dates for the years mentioned.
    dates.push(
      years.map(year => {
        const startDate = moment()
          .set({ year })
          .startOf("year");
        let endDate = moment()
          .set({ year })
          .endOf("year");
        if (endDate.isSame(moment(), "year"))
          endDate = moment().startOf("month");
        return {
          start: startDate.format("MM/DD/YYYY"),
          end: endDate.format("MM/DD/YYYY")
        };
      })
    );
    dates = _.flatten(dates);
  } else if (data && years) {
    const existingData = _.groupBy(data, "year");
    dates.push(
      years.reduce((acc, year) => {
        let startDate = moment()
          .set({ year })
          .startOf("year");
        let endDate = moment()
          .set({ year })
          .endOf("year");
        if (endDate.isSame(moment(), "year"))
          endDate = moment().startOf("month");
        if (existingData[`${year}`]) {
          const yearData = existingData[`${year}`];
          const currentEndDate = yearData[0].date;
          if (moment(currentEndDate).isSame(endDate, "month")) {
            return acc;
          }
          startDate = moment(currentEndDate)
            .add(1, "M")
            .startOf("month");
        }
        acc.push({
          start: startDate.format("MM/DD/YYYY"),
          end: endDate.format("MM/DD/YYYY")
        });
        return acc;
      }, [])
    );
    dates = _.flatten(dates);
  }

  return dates;
};

/**
 * Returns yearly start and end dates in the given range
 * @param {Date} startDate
 * @param {Date} endDate
 */
const getDatesYearly = (startDate, endDate) => {
  try {
    const dates = [];
    while (startDate.isSameOrBefore(endDate, "year")) {
      let object = {
        start: startDate.format("L"),
        end: startDate.endOf("year").format("L")
      };
      if (startDate.isSame(endDate, "year")) object.end = endDate.format("L");
      dates.push(object);
      startDate
        .add(1, "year")
        .startOf("year")
        .format("L");
    }
    return dates;
  } catch (error) {
    console.log(error);
    return [];
  }
};

/**
 * Returns the validated 5 digit zipcodes excluding invalidated zipcodes.
 * @param {Array} zipcodes
 */
const convertToValidZipcodes = zipcodes => {
  if (zipcodes && zipcodes.length) {
    return zipcodes
      .filter(zipcode => {
        const regex = /^\d{1,5}$/;
        return regex.test(zipcode);
      })
      .map(zipcode => {
        while (zipcode.length < 5) {
          zipcode = `0${zipcode}`;
        }
        return zipcode;
      });
  }
  return [];
};

const getFormattedWeatherDataToSave = (location, timeseries, cddhdd) => {
  let data = timeseries;
  let cddHdd = cddhdd;
  data = data.map(item => {
    return {
      date: moment(item.datetime, "YYYY-MM-DD")
        .startOf("month")
        .format("YYYY-MM-DD"),
      celcius: item["temperatureCelsius"] && item["temperatureCelsius"]["avg"]
    };
  });
  let groupByData = _.groupBy(data, "date");
  const keys = Object.keys(groupByData);
  const dataToBeInserted = [];
  for (let key of keys) {
    let data = groupByData && groupByData[key];
    data = (data.length >= 1 && data) || null;
    if (data) {
      const celcius = (
        groupByData[key].map(temp => temp.celcius).reduce((a, b) => a + b, 0) /
        groupByData[key].length
      ).toFixed(2);
      const fahrenheit = (Number(celcius) * (9 / 5) + 32).toFixed(2);
      const cdd = (cddHdd[key] && cddHdd[key]["cdd"]) || 0;
      const hdd = (cddHdd[key] && cddHdd[key]["hdd"]) || 0;
      dataToBeInserted.push({
        location: location,
        month: moment(key, "YYYY-MM-DD").format("MMMM"),
        year: moment(key, "YYYY-MM-DD").format("YYYY"),
        date: moment(key, "YYYY-MM-DD")
          .set({ hours: 5, minutes: 30, seconds: 0 })
          .toISOString(),
        celcius: Number(celcius),
        fahrenheit: Number(fahrenheit),
        cdd: Number(cdd),
        hdd: Number(hdd)
      });
    }
  }
  return dataToBeInserted;
};
