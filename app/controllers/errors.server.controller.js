"use strict";

const _ = require("lodash");
const winston = require("winston");
const errorLog = winston.loggers.get("errorFileLog");

// Key is field / mongo index name, value is the message returned
const uniqueMessageMapper = {
  name_1_organizationFirebaseId: "Name already exists.",
  email: "This email address is already in use. Please try another.",
  username: "This username/email is already in use. Please try another.",
};

/**
 * Get unique error field name
 */
const _getUniqueErrorMessage = function (err) {
  let output;
  try {
    err = (err.toJSON === "function") ? err.toJSON() : err;
    const fieldNameOne = err.errmsg.substring(err.errmsg.lastIndexOf("index:") + 7, err.errmsg.lastIndexOf("_1"));
    const fieldNameTwo = err.errmsg.substring(err.errmsg.lastIndexOf(".$") + 2, err.errmsg.lastIndexOf("_1"));
    // Check for a unique message from the mapper before sending the default message
    if (uniqueMessageMapper[fieldNameOne]) {
      output = uniqueMessageMapper[fieldNameOne];
    } else if (uniqueMessageMapper[fieldNameTwo]) {
      output = uniqueMessageMapper[fieldNameTwo];
    } else {
      output = fieldNameTwo.charAt(0).toUpperCase() + fieldNameTwo.slice(1) + " already exists.";
    }
  } catch (ex) {
    output = "Unique field already exists.";
  }
  return output;
};

/**
 * Get the error message from error object
 */
function _getErrorMessage (err) {
  let message = "";
  if (err.code) {
    switch (err.code) {
      case 11000:
      case 11001:
        message = _getUniqueErrorMessage(err);
        break;
      default:
        message = "Something went wrong";
    }
  } else {
    for (const errName in err.errors) {
      if (err.errors[errName].message) {
        message = err.errors[errName].message;
      }
    }
    if (!message && err.message) {
      message = err.message;
    }
    if (!message && typeof err === "string") {
      message = err;
    }
  }
  return message;
}

/**
 * Used for mongoose validation errors. Creates more detail on these types of errors
 */
exports.getErrorList = function (err) {
  let errorList = [];

  if (typeof err.errors === "object") {
    Object.keys(err.errors).forEach(function (ele) {
      errorList.push({
        type: err.errors[ele].name || "",
        fullPath: ele,
        field: err.errors[ele].path || "",
        message: err.errors[ele].message || "",
      });
    });
  }
  if (_.isArray(err)) errorList = err;
  return errorList;
};

/**
 * Log the error
 */
exports.log = function (err, caller) {
  const file = caller || "-";
  let toLog = err.toJSON();
  toLog = toLog.stack || err;
  return errorLog.log("error", file, toLog);
};

exports.getErrorMessage = _getErrorMessage;
