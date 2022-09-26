"use strict";

/**
 * Module dependencies.
 */
const _ = require("lodash");
const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");
const moment = require("moment");
const Utility = mongoose.model("Utility");
const MonthlyUtility = mongoose.model("MonthlyUtility");
const util = require("./utils/api.utils");
const validate = require("./utils/api.validation");
const config = require("../../../config/config");
const analysisClient = require("./utils/api.analysis.client");
const parser = require("fast-csv");
const { getUtilityById } = require("../../dao/utility.server.dao");
const { findByBuilding } = require("../../dao/buildingEquipment.server.dao");
const { findById } = require("../../dao/equipment.server.dao");
const { getProjects } = require("../../dao/project.server.dao");
const { createEUBBenchmark } = require("../../dao/eubBenchmark");

/*
 * Send error for CSV upload
 */
const _sendCSVError = (message, res, next) => {
  res.httpStatus = 400;
  res.sendResult = {
    status: "Error",
    message: "Issues Processing CSV File",
    errors: message + " Please follow template."
  };
  return next();
};

/*
 * Check if string is a number
 */
const _isNumeric = num => {
  return !isNaN(num);
};

const uploadDir = path.join(__dirname, "..", "..", "..", "upload");
// Run the upload dir check/write process to ensure upload dir exists
util.checkWriteDirSync(uploadDir);

const Busboy = require("busboy");
const busboyOptions = {
  limits: {
    files: 1,
    fileSize: 250000
  }
};

const _validateUtilityData = (array, utilType, consumptionOrDelivery) => {
  const warningMsgs = [];
  const utilRowLength =
    consumptionOrDelivery === "delivery" ? 4 : utilType === "electric" ? 7 : 5;

  return new Promise((resolve, reject) => {
    const utilityValidationPromise = array.map((row, index) => {
      const lineItem = index + 1;
      let arrayRow = row;

      const filteredRow = arrayRow.filter(item => item !== "");
      // Check if it's an empty row
      if (filteredRow.length === 0 && index != 0) {
        resolve();
        return;
      }
      // turn string that are actually numbers into real numbers
      arrayRow = arrayRow.map(item => {
        if (_isNumeric(item)) {
          return parseFloat(item);
        }
        return item;
      });
      // validate row length for deliveryType (4) electricity (7) and all others (5)
      if (arrayRow.length > 0) {
        if (arrayRow.length === utilRowLength) {
          // validate first array for correct strings
          if (consumptionOrDelivery === "delivery") {
            if (index === 0) {
              if (
                arrayRow[0] !== "Delivery Date" ||
                arrayRow[1] !== "Quantity" ||
                arrayRow[2] !== "Cost" ||
                arrayRow.slice(-1)[0] !== "Estimation"
              ) {
                reject("Invalid first row. Must be column header names.");
              }
            } else {
              // validate first two items in array as dates
              if (!moment(arrayRow[0], "M/D/YY", true).isValid()) {
                reject(
                  "Delivery Date must both be in date format. Please check line " +
                    lineItem +
                    " for this error."
                );
              }

              // make sure the last column is either a yes or no
              if (
                arrayRow.slice(-1)[0] !== null &&
                arrayRow.slice(-1)[0] !== "yes" &&
                arrayRow.slice(-1)[0] !== "no"
              ) {
                reject(
                  'Estimation column must be either a "yes" or "no". Please check line ' +
                    lineItem +
                    " for this error."
                );
              }

              // make sure all number columns are actual numbers
              if (
                typeof arrayRow[1] !== "number" ||
                (arrayRow[2] !== null && typeof arrayRow[2] !== "number")
              ) {
                reject(
                  "Quantity and Total Cost must be a number. Please check line " +
                    lineItem +
                    " for this error."
                );
              }
            }
          } else {
            if (index === 0) {
              if (
                arrayRow[0] !== "Start Date" ||
                arrayRow[1] !== "End Date" ||
                arrayRow[2] !== "Total Usage" ||
                (arrayRow[3] !== "Total Cost" &&
                  arrayRow[3] !== "Total Usage Cost") ||
                arrayRow.slice(-1)[0] !== "Estimation"
              ) {
                reject("Invalid first row. Must be column header names.");
              }
              // check for more fields if utility type is electric
              if (utilType === "electric") {
                if (arrayRow[4] !== "Demand" || arrayRow[5] !== "Demand Cost") {
                  reject("Invalid first row. Must be column header names.");
                }
              }
            } else {
              // validate first two items in array as dates
              if (
                !moment(arrayRow[0], "M/D/YY", true).isValid() ||
                !moment(arrayRow[1], "M/D/YY", true).isValid()
              ) {
                reject(
                  "Start Date and End Date must both be in date format. Please check line " +
                    lineItem +
                    " for this error."
                );
              }

              // make sure second date is after first date
              if (
                moment(arrayRow[0], "M/D/YY", true) >
                moment(arrayRow[1], "M/D/YY", true)
              ) {
                reject(
                  "Start Date must be before End Date. Please check line " +
                    lineItem +
                    " for this error."
                );
              }

              // make sure number of days is between 26 and 35
              const billingDays = moment(arrayRow[1], "M/D/YY", true).diff(
                moment(arrayRow[0], "M/D/YY", true),
                "days"
              );
              if (billingDays < 26 || billingDays > 35) {
                warningMsgs.push(
                  "Billing days longer or shorter than month span"
                );
              }

              // make sure the last column is either a yes or no
              if (
                arrayRow.slice(-1)[0] !== "yes" &&
                arrayRow.slice(-1)[0] !== "no"
              ) {
                reject(
                  'Estimation column must be either a "yes" or "no". Please check line ' +
                    lineItem +
                    " for this error."
                );
              }

              // make sure all number columns are actual numbers
              if (
                typeof arrayRow[2] !== "number" ||
                typeof arrayRow[3] !== "number"
              ) {
                reject(
                  "Total Usage and Total Cost must be a number. Please check line " +
                    lineItem +
                    " for this error."
                );
              }

              // make sure extra fields for electric utility are numbers
              if (utilType === "electric") {
                if (
                  typeof arrayRow[4] !== "number" ||
                  typeof arrayRow[5] !== "number"
                ) {
                  reject(
                    "Demand and Demand Cost must be a number. Please check line " +
                      lineItem +
                      " for this error."
                  );
                }
              }
            }
          }
        } else {
          reject("Invalid row length on line " + lineItem);
        }
        resolve();
      }
    });

    Promise.all(utilityValidationPromise).then(() => {
      resolve(warningMsgs);
    });
  });
};

const _transformConsumptionUtilityObj = (array, utilType) => {
  return Promise.all(
    array.slice(1).reduce((result, row) => {
      let arrayRow = row;

      const filteredRow = arrayRow.filter(item => item !== "");
      // Check if it's an empty row
      if (filteredRow.length === 0) {
        return result;
      }

      // turn string that are actually numbers into real numbers
      arrayRow = arrayRow.map(item => {
        if (_isNumeric(item)) {
          return parseFloat(item);
        }
        return item;
      });

      const estimationBool = arrayRow.slice(-1)[0] === "yes";
      if (utilType === "electric") {
        result.push({
          startDate: arrayRow[0],
          endDate: arrayRow[1],
          totalUsage: arrayRow[2],
          totalCost: arrayRow[3] || 0,
          demand: arrayRow[4] || 0,
          demandCost: arrayRow[5] || 0,
          estimation: estimationBool
        });
      } else {
        result.push({
          startDate: arrayRow[0],
          endDate: arrayRow[1],
          totalUsage: arrayRow[2],
          totalCost: arrayRow[3] || 0,
          estimation: estimationBool
        });
      }
      return result;
    }, [])
  );
};

const _transformDeliveryUtilityObj = array => {
  return Promise.all(
    array.slice(1).reduce((result, row) => {
      let arrayRow = row;

      const filteredRow = arrayRow.filter(item => item !== "");
      // Check if it's an empty row
      if (filteredRow.length === 0) {
        return result;
      }

      // turn string that are actually numbers into real numbers
      arrayRow = arrayRow.map(item => {
        if (_isNumeric(item)) {
          return parseFloat(item);
        }
        return item;
      });
      const estimationBool = arrayRow.slice(-1)[0] === "yes";
      result.push({
        deliveryDate: arrayRow[0],
        quantity: arrayRow[1],
        totalCost: arrayRow[2] || 0,
        estimation: estimationBool
      });
      return result;
    }, [])
  );
};

const _saveUtilities = async (utility, building) => {
  await utility.validate();

  building.utilityIds.push(utility._id);
  building.markModified("utilityIds");
  building.rerunAnalyses = true;

  await building.save();
  await utility.save();

  return {
    building: building,
    utility: utility
  };
};

/**
 * Process a CSV batch upload file - validate and save utility meter data
 */
exports.processCsvUtility = function(req, res, next) {
  const reqUtilType = req.query.utilType;
  const reqConsumptionOrDelivery = req.query.consumptionOrDelivery; // consumpiton or delivery

  if (!validate.valUtilType(reqUtilType)) {
    return util.sendError("Invalid utility type.", 400, req, res, next);
  }

  // Respond quickly with an error if it is a ~empty request
  if (req.headers["content-length"] < 100) {
    return util.sendError("Invalid request.", 400, req, res, next);
  }

  busboyOptions.headers = req.headers;
  const busboy = new Busboy(busboyOptions);

  // Send back error if to many files are provided in the request
  busboy.on("filesLimit", function() {
    return util.sendError("Request has too many files.", 400, req, res, next);
  });
  // Send back error if to many fields are provided in the request
  busboy.on("fieldsLimit", function() {
    return util.sendError("Request has too many fields.", 400, req, res, next);
  });
  // Send back error if to many parts (files + fields) are provided in the request
  busboy.on("partsLimit", function() {
    return util.sendError(
      "Request is not properly formated.",
      400,
      req,
      res,
      next
    );
  });

  let err;
  let fileChunksStrArr;
  busboy.on("file", function(fieldname, file, filename, encoding, mimetype) {
    // Only allow csv, and similar, files
    if (
      mimetype !== "text/csv" &&
      mimetype !== "application/csv" &&
      mimetype !== "application/vnd.ms-excel" &&
      mimetype !== "text/plain"
    ) {
      err = "Unsupported file type.";
      file.resume();
    }

    //  Use file stream and write file to system
    if (config.uploadCsv && config.uploadCsv.writeFile) {
      const savePath = path.join(uploadDir, path.basename(filename));
      file.pipe(fs.createWriteStream(savePath));
    }

    fileChunksStrArr = [];

    file
      .pipe(parser())
      // Collect file chunks
      .on("data", function(data) {
        if (data) {
          fileChunksStrArr.push(data);
        }
      })
      // After file has finished uploading
      .on("end", async function() {
        if (err) {
          return util.sendError(err, 400, req, res, next);
        }

        if (!fileChunksStrArr) {
          return util.sendError("Issues accessing file.", 400, req, res, next);
        }

        try {
          // validate all data coming through in CSV
          await _validateUtilityData(
            fileChunksStrArr,
            reqUtilType,
            reqConsumptionOrDelivery
          );
          // use the same array (because it's validated) and transform into objects that can be saved in db
          const utility = new Utility({
            name: req.query.name,
            meterNumber: req.query.meterNumber,
            accountNumber: req.query.accountNumber,
            meterType: req.query.meterType,
            meterPurpose: req.query.meterPurpose,
            meterConfiguration: req.query.meterConfiguration,
            meterShared: req.query.meterShared,
            source: req.query.source,
            units: req.query.units,
            utilType: req.query.utilType
          });

          if (reqConsumptionOrDelivery === "consumption") {
            utility.meterData = await _transformConsumptionUtilityObj(
              fileChunksStrArr,
              reqUtilType
            );
          } else if (reqConsumptionOrDelivery === "delivery") {
            utility.deliveryData = await _transformDeliveryUtilityObj(
              fileChunksStrArr
            );
          }

          // save utility obj in db
          const response = await _saveUtilities(utility, req.building);
          // Return the validated and saved utilities
          res.sendResult = {
            status: "Success",
            message: "Uploaded Utility CSV",
            utility: response.utility,
            building: response.building
          };
          next();
        } catch (err) {
          return _sendCSVError(err, res, next);
        }
      });
  });

  req.pipe(busboy);
};

/**
 * Create manual utility
 */
exports.createUtility = function(req, res, next) {
  const building = req.building;
  const utilities = req.body.manual;
  const user = req.user;
  let utilType = req.query.utilType;
  if (utilType === "naturalgas") {
    utilType = "natural-gas";
  }

  const isNewUtility = req.query.isNewUtility || false;
  const utility = new Utility({
    name: req.query.name,
    meterNumber: req.query.meterNumber,
    accountNumber: req.query.accountNumber,
    meterType: req.query.meterType,
    meterPurpose: req.query.meterPurpose,
    meterConfiguration: req.query.meterConfiguration,
    meterShared: req.query.meterShared || false,
    source: req.query.source,
    units: req.query.units,
    utilType: utilType,
    createdByUserId: user._id
  });
  if (req.query.consumptionOrDelivery === "consumption") {
    utility.meterData = utilities;
  } else if (req.query.consumptionOrDelivery === "delivery") {
    utility.deliveryData = utilities;
  }

  utility.validate(function(err) {
    if (err) {
      return util.sendError(err, 400, req, res, next);
    }

    building.utilityIds.push(utility._id);
    building.markModified("utilityIds");
    building.rerunAnalyses = true;
    if (isNewUtility) {
      const newCommoditySettings = {
        ...building.commoditySettings,
        [req.query.utilType]: {
          unit: req.query.units
        }
      };
      building.commoditySettings = newCommoditySettings;
    }

    building.save(function(err, building) {
      if (err) {
        return util.sendError(err, 400, req, res, next);
      }

      utility.save(function(err) {
        if (err) {
          return util.sendError(err, 400, req, res, next);
        }

        // Return the utility obj
        res.sendResult = {
          status: "Success",
          message: "Created Manual Utility",
          utility: {
            ...utility,
            createdByUserId: {
              name: user.name
            }
          },
          building: building
        };
        return next();
      });
    });
  });
};

/**
 * Get a building's utilities
 */

const sleep = ms => {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
};
exports.getUtilities = async function(req, res, next) {
  const allUtilities = req.building.utilityIds;
  try {
    const utilities = await Utility.find({ _id: { $in: allUtilities } })
      .populate({
        path: "createdByUserId",
        select: { name: 1 }
      })
      .lean();
    await sleep(1000);
    const monthlyUtilities = await MonthlyUtility.find({
      building: req.building._id
    })
      .lean()
      .exec();
    // Return the buildings utilities object
    res.sendResult = {
      status: "Success",
      message: "Retrieved Utilities",
      utilities: utilities || [],
      monthlyUtilities: monthlyUtilities || []
    };
    return next();
  } catch (err) {
    return util.sendError(err, 400, req, res, next);
  }
};

exports.editUtility = function(req, res, next) {
  const building = req.building;
  const utilityBody = req.body;

  const utility = _.extend(req.utility, {
    name: utilityBody.name,
    meterNumber: utilityBody.number,
    accountNumber: utilityBody.accountNumber,
    meterType: utilityBody.meterType,
    meterPurpose: utilityBody.meterPurpose,
    meterConfiguration: utilityBody.meterConfiguration,
    meterShared: utilityBody.meterShared,
    source: utilityBody.source,
    units: utilityBody.units,
    utilType: utilityBody.type
  });

  if (utilityBody.consumptionOrDelivery === "consumption") {
    utility.meterData = utilityBody.upload.manual;
  } else if (utilityBody.consumptionOrDelivery === "delivery") {
    utility.deliveryData = utilityBody.upload.manual;
  }

  utility.validate(function(err) {
    if (err) {
      return util.sendError(err, 400, req, res, next);
    }

    building.rerunAnalyses = true;

    building.save(function(err, building) {
      if (err) {
        return util.sendError(err, 400, req, res, next);
      }

      utility.save(function(err) {
        if (err) {
          return util.sendError(err, 400, req, res, next);
        }

        res.sendResult = {
          status: "Success",
          message: "Edited Utility",
          building: building
        };
        return next();
      });
    });
  });
};

exports.getEndUse = function(req, res, next) {
  const building = req.building;
  const request = {
    occupancy: building.buildingUse || "office",
    size: building.squareFeet || 30000,
    zipcode: building.location.zipCode || "47918",
    open24: building.open247 || "no",
    stories: building.floorCount || "2",
    vintage: building.buildYear || "2001",
    wwr: 0.3
  };

  analysisClient.getEndUse(request, function(err, response) {
    if (err || !response) {
      return util.sendError(err, 400, req, res, next);
    }
    let result = response;
    if (typeof response === "string") {
      result = JSON.parse(response);
    }
    building.endUse = result;

    building.save(function(err) {
      if (err) {
        return util.sendError(err, 400, req, res, next);
      }

      // Return the benchmark object
      res.sendResult = {
        status: "Success",
        message: "Edited Utility",
        endUse: result
      };
      return next();
    });
  });
};

exports.getEndUseUtil = async function(req, res, next) {
  const building = req.building;
  const urlParams = {
    occupancy: building.buildingUse || "office",
    size: building.squareFeet || 30000,
    zipcode: building.location.zipCode || "47918",
    open24: building.open247 || "no",
    stories: building.floorCount || "2",
    vintage: building.buildYear || "2001",
    wwr: 0.3,
    year: parseInt(req.query.year) || 2019,
    electric: req.query.utils.electric,
    gas: req.query.utils["natural-gas"] || 0,
    "total-cost": req.query.totalCost || 0
  };
  const startDate = moment([parseInt(req.query.year) || 2019, 0]);
  const endDate = moment(startDate).endOf("year");
  const monthlyUtilities = await MonthlyUtility.find({ building: building._id })
    .lean()
    .exec();
  const filteredMonthlyUtilities = monthlyUtilities.filter(utility => {
    const itemStartDate = moment(utility.date);
    const itemEndDate = moment(utility.date).startOf("month");
    return (
      itemStartDate.isSameOrAfter(startDate) &&
      itemEndDate.isSameOrBefore(endDate)
    );
  });
  const electricUtilities = monthlyUtilities.filter(
    utility => !!(utility.electric && utility.electric.totalUsage)
  );
  const gasUtilities = monthlyUtilities.filter(
    utility => !!(utility.naturalgas && utility.naturalgas.totalUsage)
  );

  const allElectric = electricUtilities.map(utility => ({
    startDate: moment(utility.date),
    endDate: moment(utility.date).startOf("month"),
    ...(utility.electric || {})
  }));
  const allGas = gasUtilities.map(utility => ({
    startDate: moment(utility.date),
    endDate: moment(utility.date).startOf("month"),
    ...(utility.naturalgas || {})
  }));

  const electric = allElectric.filter(
    item =>
      item.startDate.isSameOrAfter(startDate) &&
      item.endDate.isSameOrBefore(endDate)
  );
  const gas = allGas.filter(
    item =>
      item.startDate.isSameOrAfter(startDate) &&
      item.endDate.isSameOrBefore(endDate)
  );

  const equipmentsObject = {};
  const equipments = await findByBuilding(building._id.toString());
  const libraryEquipments = await Promise.all(
    equipments.map(async equipment => {
      const found = await findById(equipment.libraryEquipment);
      const operation = building.operations.find(operation => {
        return operation.id == equipment.operation.id;
      });
      return (
        found && {
          equipment: found,
          annualHours: operation && operation.annualHours
        }
      );
    })
  );
  _.compact(libraryEquipments).forEach(({ equipment, annualHours }) => {
    let equipmentObj = equipment.toObject();
    const category =
      equipment.category === "KITCHEN" ? "COOKING" : equipment.category;
    equipmentObj.fieldsArray = undefined;
    equipmentObj.annualHours = annualHours;
    if (!equipmentsObject[category]) {
      equipmentsObject[category] = [];
    }
    equipmentsObject[category].push(equipmentObj);
  });
  const equipment = [];
  const equipmentArray = Object.entries(equipmentsObject);
  equipmentArray.forEach(([key, value]) => {
    const temp = {};
    temp[key] = value;
    equipment.push(temp);
  });
  const rates = {
    electric: building.rates.electric,
    gas: building.rates.gas
  };

  const projects = await getProjects(building.projectIds);
  let projectsData = projects.map(project => ({
    fuelType: project.fuel,
    category: project.project_category,
    application: project.project_application,
    results: Object.values(project.runResults || {}).map(result => ({
      energySavings: result ? result["energy-savings"] : 0,
      costSavings: result ? result["annual-savings"] : 0
    }))
  }));

  //cleanup projects with empty results
  projectsData = projectsData.filter(
    project =>
      project.results &&
      project.results.length > 0 &&
      !_.isNil(project.results[0].energySavings)
  );
  const endUseConfigurationBody = req.body?.endUseConfiguration ?? {};
  const originalEndUseConfiguration = building?.endUseConfiguration ?? {};
  const endUseConfiguration = _.merge(
    originalEndUseConfiguration,
    endUseConfigurationBody
  );
  const request = {
    utilityData: [{ electric }, { gas }],
    allUtilityData: [{ electric: allElectric }, { gas: allGas }],
    equipment,
    rates,
    year: parseInt(req.query.year) || 2019,
    projects: projectsData,
    sqFoot: building.squareFeet || 30000,
    year: parseInt(req.query.year) || 2019,
    zipcode: building.location.zipCode || "47918",
    monthlyUtilityData: filteredMonthlyUtilities,
    ...(!_.isEmpty(endUseConfiguration) && { endUseConfiguration })
  };
  analysisClient.getEndUseUtil(request, urlParams, function(err, response) {
    if (err || !response) {
      return util.sendError(err, 400, req, res, next);
    }

    response.actual = true;
    building.endUse = response;
    building.endUseConfiguration = endUseConfiguration;
    building.markModified("endUseConfiguration");
    building.markModified("endUse");

    building.save(async function(err) {
      if (err) {
        return util.sendError(err, 400, req, res, next);
      }
      
      // To add the entry of the response to EUB Benchmark table in postgres
      await createEUBBenchmark({ building_id: building._id.toString(), ...response});
      
      // Return the benchmark object
      res.sendResult = {
        status: "Success",
        message: "Edited Utility",
        endUse: response
      };
      return next();
    });
  });
};

/**
 * Get weather data
 */

exports.getWeather = function(req, res, next) {
  const request = {
    location: req.building.location.zipCode,
    start_date: req.body.startDate,
    stop_date: req.body.endDate
  };

  if (
    moment(req.body.startDate).isSameOrAfter(new Date(), "month") ||
    moment(req.body.endDate).isSameOrAfter(new Date(), "month")
  ) {
    res.sendResult = {
      status: "Success",
      message: "Retrieved Weather Data",
      weather: {}
    };
    return next();
  }

  analysisClient.getWeather(request, function(err, response) {
    // if (err || !response) return util.sendError(err, 400, req, res, next);
    let responseToReturn = response;
    if (err || !responseToReturn) {
      responseToReturn = {};
    }

    res.sendResult = {
      status: "Success",
      message: "Retrieved Weather Data",
      weather: responseToReturn
    };
    return next();
  });
};

const _sendChangePointCall = (utilityData, building) => {
  return new Promise((resolve, reject) => {
    const promises = [];
    const buildingData = {};
    const allResponseData = {};

    const utilityDataPromise = Object.keys(utilityData).map(utility => {
      const newUtilityData = utilityData[utility].map(utility => ({
        totalUsage: utility.totalUsage,
        startDate: utility.startDate,
        endDate: utility.endDate
      }));

      const request = {
        utilityData: newUtilityData,
        size: building.squareFeet,
        zipcode: building.location.zipCode,
        id: building._id.toString(),
        fuelType: utility
      };

      const saveResults = new Promise((resolve, reject) => {
        analysisClient.getChangePoint(request, function(err, response) {
          // catch errors first
          if (err || !response) reject(err);
          if (response && (response.error || response.message)) {
            reject(response.error || response.message);
          }

          if (response && response.results) {
            // store response to send back
            allResponseData[utility] = response;

            buildingData[utility] = {
              baseload: response.results[0].baseload
            };

            if (response.results[0].cooling_sensitivity) {
              buildingData[utility].cooling_sensitivity =
                response.results[0].cooling_sensitivity;
              buildingData[utility].cooling_change_point =
                response.results[0].cooling_change_point;
            }

            if (response.results[0].heating_sensitivity) {
              buildingData[utility].heating_sensitivity =
                response.results[0].heating_sensitivity;
              buildingData[utility].heating_change_point =
                response.results[0].heating_change_point;
            }

            buildingData[utility].results = response.results;
            buildingData[utility].data = response.data;
            buildingData[utility].fit = response.fit;
            resolve();
          } else {
            reject("Issues retrieving change point data from analysis API.");
          }
        });
      });

      promises.push(saveResults);
    });

    Promise.all(utilityDataPromise)
      .then(() => {
        return Promise.all(promises)
          .then(() => {
            const response = {
              modelingData: allResponseData,
              buildingData: buildingData
            };
            resolve(response);
          })
          .catch(err => {
            reject(err);
          });
      })
      .catch(err => {
        reject(err);
      });
  });
};

/**
 * Get change point analysis
 */
exports.getChangePointAnalysis = function(req, res, next) {
  let building = req.building;
  const utilityData = req.body.utilityData;

  _sendChangePointCall(utilityData, building)
    .then(response => {
      building = _.extend(building, {
        changePointModels: response.buildingData
      });

      // reset flag back to false since change point has been ran
      building.rerunAnalyses = false;

      building.save(function(err) {
        if (err) {
          return util.sendError(err, 400, req, res, next);
        }

        res.sendResult = {
          status: "Success",
          message: "Retrieved Change Point Analysis",
          modelingData: response.modelingData,
          buildingConsumptionData: response.buildingData
        };
        return next();
      });
    })
    .catch(err => {
      return util.sendError(err, 400, req, res, next);
    });
};

/**
 * Delete Utility
 */
exports.deleteUtility = function(req, res, next) {
  let building = req.building;
  const utility = req.utility;

  // remove all instances of that template id on the organization model
  const tempUtilityIds = building.utilityIds;
  for (let i = tempUtilityIds.length - 1; i >= 0; i--) {
    if (tempUtilityIds[i].toString() === utility._id.toString()) {
      tempUtilityIds.splice(i, 1);
    }
  }

  // if all the utilities on the building match with all the utilities in the change point trend object
  Utility.find({ _id: { $in: tempUtilityIds } }, function(err, utilities) {
    if (err) {
      return util.sendError(err, 400, req, res, next);
    }

    const uniqueUtilTypes = [
      ...new Set(utilities.map(utility => utility.utilType))
    ];

    Object.keys(building.changePointModels).map(util => {
      // if any of the utils in the building's change point model aren't in the current utils,
      if (!uniqueUtilTypes.includes(util)) {
        // delete from the object on the building
        delete building.changePointModels[util];
      }
    });

    // save current org
    building = _.extend(building, {
      utilityIds: tempUtilityIds
    });

    building.rerunAnalyses = true;
    building.markModified("changePointModels");

    building.save(function(err, building) {
      if (err) {
        return util.sendError(err, 400, req, res, next);
      }

      utility.remove(function(err) {
        if (err) {
          return util.sendError(err, 400, req, res, next);
        }

        res.sendResult = {
          status: "Success",
          message: "Removed Utility",
          building: building
        };

        return next();
      });
    });
  });
};

/**
 * Utility param middleware
 */
exports.utilityById = function(req, res, next, id) {
  if (!validate.valMongoObjId(id)) {
    return next(new Error("Invalid ID present in request."));
  }

  Utility.findById(id).exec(function(err, utility) {
    if (err) return next(err);
    if (!utility) return next(new Error("Failed to load utility " + id));
    req.utility = utility;
    return next();
  });
};
