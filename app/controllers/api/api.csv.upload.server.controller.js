"use strict";

/**
 * Module dependencies.
 */
const _ = require("lodash");
const path = require("path");
const fs = require("fs");
const errorHandler = require("../errors.server.controller");
const uploadDir = path.join(__dirname, "..", "..", "..", "upload");
const mongoose = require("mongoose");
const Measure = mongoose.model("Measure");
const Component = mongoose.model("Component");
const util = require("./utils/api.utils");
const validate = require("./utils/api.validation");
const config = require("../../../config/config");

const Model = {};
Model.component = Component;
Model.measure = Measure;

const baseFieldMapper = require("../../firebase/firebase.csvbase.model").csvMap;

const Schema = {};
Schema.measure = require("../../firebase/firebase.measure.model").csvMap;
Schema.lightfixture = require("../../firebase/firebase.lightfixture.model").csvMap;
Schema.window = require("../../firebase/firebase.window.model").csvMap;
Schema.door = require("../../firebase/firebase.door.model").csvMap;
Schema.plugload = require("../../firebase/firebase.plugload.model").csvMap;
Schema.processload = require("../../firebase/firebase.processload.model").csvMap;
Schema.waterfixture = require("../../firebase/firebase.waterfixture.model").csvMap;

const Busboy = require("busboy");
const busboyOptions = {
  limits: {
    files: 1,
    fileSize: 250000,
  },
};

// # Match one value in valid CSV string.
// (?!\s*$)                            # Don't match empty last value.
// \s*                                 # Strip whitespace before value.
// (?:                                 # Group for value alternatives.
//   '([^'\\]*(?:\\[\S\s][^'\\]*)*)'   # Either $1: Single quoted string,
// | "([^"\\]*(?:\\[\S\s][^"\\]*)*)"   # or $2: Double quoted string,
// | ([^,'"\s\\]*(?:\s+[^,'"\s\\]+)*)  # or $3: Non-comma, non-quote stuff.
// )                                   # End group of value alternatives.
// \s*                                 # Strip whitespace after value.
// (?:,|$)                             # Field ends on comma or EOS.
const lineParseRegex = /(?!\s*$)\s*(?:'([^'\\]*(?:\\[\S\s][^'\\]*)*)'|"([^"\\]*(?:\\[\S\s][^"\\]*)*)"|([^,'"\s\\]*(?:\s+[^,'"\s\\]+)*))\s*(?:,|$)/g;

const _convertCsvLineItemToArray = function (lineItem) {
  const tmpArr = [];
  // Split each line item into tmp array
  lineItem.replace(lineParseRegex, function (m0, m1, m2, m3) {
    if (m1 !== undefined) {
      tmpArr.push(m1.replace(/\\'/g, "'"));
    } else if (m2 !== undefined) {
      tmpArr.push(m2.replace(/\\"/g, "\""));
    } else if (m3 !== undefined) {
      tmpArr.push(m3);
    }
    return "";
  });
  if (/,\s*$/.test(lineItem)) {
    tmpArr.push("");
  }
  return tmpArr;
};

const _sortByLineNumber = function (a, b) {
  return a.lineNumber > b.lineNumber ? 1 : a.lineNumber < b.lineNumber ? -1 : 0;
};

const _cleanFieldsForError = function (item) {
  const ret = {};
  const fieldWhiteListArr = [
    "lineNumber", "valInvalidFormat", "valMissingFields", "valItemCheck",
    "valTypeCheck", "valCountCheck", "item", "type", "valErrors",
  ];
  fieldWhiteListArr.map(function (key) {
    if (item[key] !== undefined) ret[key] = item[key];
  });

  return ret;
};
const _cleanFieldsForSuccess = function (item, dbResult) {
  const ret = {};
  const fieldWhiteListItemArr = [
    "lineNumber", "item", "type",
  ];
  const fieldWhiteListDbResultArr = [
    "_id", "created", "name",
  ];
  fieldWhiteListItemArr.map(function (key) {
    if (item[key] !== undefined) ret[key] = item[key];
  });
  fieldWhiteListDbResultArr.map(function (key) {
    if (dbResult[key] !== undefined) ret[key] = dbResult[key];
  });

  return ret;
};

const _saveComponents = function (componentsArr, done) {
  const ret = [];
  if (!componentsArr || (componentsArr && !componentsArr.length)) {
    return done(null, ret);
  }

  let tmpComponent;
  const errorsArr = [];
  const successArr = [];
  const iterators = [];
  // Loop thru each component in the array and save to db
  // Format and return all errors generated and successful saves
  componentsArr.map(function (component, index) {
    tmpComponent = new Component(component);
    tmpComponent.save(function (err, componentRes) {
      if (err) {
        component = _cleanFieldsForError(component);
        component.error = {
          message: errorHandler.getErrorMessage(err),
          errors: errorHandler.getErrorList(err),
        };
        errorsArr.push(component);
      } else {
        successArr.push(_cleanFieldsForSuccess(component, componentRes));
      }
      // Only trigger callback when everything has processed
      iterators.push(index);
      if (iterators.length === componentsArr.length) {
        // Sort by lineNumber, before return
        if (successArr.length) {
          successArr.sort(_sortByLineNumber);
        }
        done(errorsArr, successArr);
      }
    });
  });
};
const _saveMeasures = function (measuresArr, done) {
  const ret = [];
  if (!measuresArr || (measuresArr && !measuresArr.length)) {
    return done(null, ret);
  }

  let tmpMeasure;
  const errorsArr = [];
  const successArr = [];
  const iterators = [];
  // Loop thru each measure in the array and save to db
  // Format and return all errors generated and successful saves
  measuresArr.map(function (measure, index) {
    // Create the default fields for measures
    Schema.measure.setFields.map(function (ele) {
      measure = util.createObjPerPath.call(measure, ele.fbPath, ele.value);
    });

    tmpMeasure = new Measure(measure);
    tmpMeasure.save(function (err, measureRes) {
      if (err) {
        measure = _cleanFieldsForError(measure);
        measure.error = {
          message: errorHandler.getErrorMessage(err),
          errors: errorHandler.getErrorList(err),
        };
        errorsArr.push(measure);
      } else {
        successArr.push(_cleanFieldsForSuccess(measure, measureRes));
      }
      // Only trigger callback when everything has processed
      iterators.push(index);
      if (iterators.length === measuresArr.length) {
        // Sort by lineNumber, before return
        if (successArr.length) {
          successArr.sort(_sortByLineNumber);
        }
        done(errorsArr, successArr);
      }
    });
  });
};

/**
 * Process a CSV batch upload file - validate and save Library components/measures
 */
exports.processLibraryCsvUpload = function (req, res, next) {
  // API Key verification
  if (!req.apiKey.organizationFirebaseId || !req.apiKey.userFirebaseId) {
    return util.sendError("Issues with provided key.", 400, req, res, next);
  }

  const reqOrganizationFirebaseId = req.apiKey.organizationFirebaseId;
  const reqUserFirebaseId = req.apiKey.userFirebaseId;

  // Respond quickly with an error if it is a ~empty request
  if (req.headers["content-length"] < 100) {
    return util.sendError("Invalid request.", 400, req, res, next);
  }

  busboyOptions.headers = req.headers;
  const busboy = new Busboy(busboyOptions);

  // Send back error if to many files are provided in the request
  busboy.on("filesLimit", function () {
    return util.sendError("Request has too many files.", 400, req, res, next);
  });

  // Send back error if to many fields are provided in the request
  busboy.on("fieldsLimit", function () {
    return util.sendError("Request has too many fields.", 400, req, res, next);
  });

  // Send back error if to many parts (files + fields) are provided in the request
  busboy.on("partsLimit", function () {
    return util.sendError("Request is not properly formated.", 400, req, res, next);
  });

  let err;
  let fileChunksStrArr;
  busboy.on("file", function (fieldname, file, filename, encoding, mimetype) {
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
    // Collect file chunks and convert to string
    file.on("data", function (chunk) {
      fileChunksStrArr.push(chunk.toString("utf8"));
    });

    // After file has finished uploading
    file.on("end", function () {
      if (err) {
        return util.sendError(err, 400, req, res, next);
      }
      if (file.truncated) {
        return util.sendError("The file is too large. Max size of 250kb.", 400, req, res, next);
      }
      if (!fileChunksStrArr) {
        return util.sendError("Issues accessing file.", 400, req, res, next);
      }

      // Split each line item into an array element, remove the last empty element
      const fileContentsArr = fileChunksStrArr.join("").split("\n");
      if (!fileContentsArr[fileContentsArr.length - 1]) fileContentsArr.pop();

      const parsedItems = {};
      let tmpLineArr = [];
      let tmpItemSchema;
      let tmpItem, tmpType, tmpName;
      // Create an array of objects per the item and type fields in the csv
      fileContentsArr.map(function (lineItem, lineItemIndex) {
        tmpItemSchema = {};
        tmpItemSchema.valErrors = [];
        tmpItem = "";
        tmpType = "";
        tmpLineArr = [];

        // Always store line number of the item being processed
        tmpItemSchema.lineNumber = lineItemIndex + 1;

        // Validate the csv line item
        if (!validate.valCsvLineItem(lineItem)) {
          tmpItemSchema.valInvalidFormat = true;
        } else {
          tmpLineArr = _convertCsvLineItemToArray(lineItem);

          // Store item / types / name
          tmpItem = (tmpLineArr[0]) ? tmpLineArr[0] : "";
          tmpType = (tmpLineArr[1]) ? tmpLineArr[1] : "";
          tmpName = (tmpLineArr[2]) ? tmpLineArr[2] : "";
        }

        // Validate field count first, else start initial validations
        if (!tmpItemSchema.valInvalidFormat && tmpLineArr.length < 2) {
          tmpItemSchema.valMissingFields = true;
        } else {
          // Normalize and validate the item field
          if (tmpItem && typeof tmpItem.toLowerCase === "function") {
            tmpItem = tmpItem.toLowerCase().trim();
            tmpLineArr[0] = tmpItem;
          }
          tmpItemSchema.valItemCheck = validate.valLibraryItem(tmpItem);

          // Init array if the property for the type doesnt exist
          if (!parsedItems[tmpItem] && tmpItemSchema.valItemCheck) parsedItems[tmpItem] = [];
          if (!parsedItems.errors) parsedItems.errors = [];

          // Normalize and validate the type field
          if (tmpType && typeof tmpType.toLowerCase === "function") {
            tmpType = tmpType.toLowerCase().trim();
            tmpLineArr[1] = tmpType;
          }
          tmpItemSchema.valTypeCheck = validate.valLibraryTypePerItem(tmpItem, tmpType);

          // Verify the field count is correct per the item-type
          tmpItemSchema.valCountCheck = Boolean(
            Schema[tmpType] && Schema[tmpType].fieldCount && Schema[tmpType].fieldCount === tmpLineArr.length
          );
        }

        // Only if there is an appropriate item and number of elements, continue
        if (tmpItemSchema.valItemCheck && tmpItemSchema.valCountCheck) {
          // Set the names for the mongoose model
          tmpItemSchema.name = tmpName;
          tmpItemSchema[tmpItem] = {};
          tmpItemSchema[tmpItem].name = tmpName;
          // Set the user/org found in apiKey for mongoose model
          tmpItemSchema.organizationFirebaseId = reqOrganizationFirebaseId || "";
          tmpItemSchema.userFirebaseId = reqUserFirebaseId || "";

          // Loop thru the each delimited element in the line item
          tmpLineArr.map(function (ele, index) {
            // Use the mapper to create an object with base fields
            if (baseFieldMapper[index]) tmpItemSchema[baseFieldMapper[index]] = tmpLineArr[index];
            // Use the type mapper to continue with the unique fields
            // Check the field count matches, there isnt an empty value in the file, and a path exists in the mapper
            if (tmpLineArr[index] && (Schema[tmpType] && Schema[tmpType][index])) {
              // Ensure the value is within the maxLength to continue
              if (
                (Schema[tmpType][index].maxLength && tmpLineArr[index]) &&
                  (Schema[tmpType][index].maxLength < tmpLineArr[index].length)
              ) {
                // Invalidate the entire line item, but keep the specifics on the error and line
                tmpItemSchema.valInvalidFormat = true;
                tmpItemSchema.valErrors.push({
                  element: index,
                  type: "max_length_exceeded",
                  max: Schema[tmpType][index].maxLength,
                  message: "Element cannot exceed max length of " + Schema[tmpType][index].maxLength + " characters.",
                }
                );
              } else if (!tmpItemSchema.valInvalidFormat) {
                // Attempt to convert to numerical value if the schema expects it to be a number
                if (Schema[tmpType][index].type && Schema[tmpType][index].type === Number) {
                  tmpLineArr[index] = Number(tmpLineArr[index]) || tmpLineArr[index];
                }
                // Write the value to the tmp object at the specified dot notation path
                if (Schema[tmpType][index].fbPath) {
                  tmpItemSchema = util.createObjPerPath.call(tmpItemSchema, Schema[tmpType][index].fbPath, tmpLineArr[index]);
                }
                // Check if there are base configs which need to be added to the object
                if (Schema[tmpType] && typeof Schema[tmpType].config === "object") {
                  Object.keys(Schema[tmpType].config).map(function (key) {
                    tmpItemSchema = util.createObjPerPath.call(tmpItemSchema, "config." + key, Schema[tmpType].config[key]);
                  });
                }
              }
            }
          });
        }

        // Store any validation errors, else push valid items into an array to be saved
        if (
          tmpItemSchema.valInvalidFormat ||
            tmpItemSchema.valMissingFields ||
            !tmpItemSchema.valItemCheck ||
            !tmpItemSchema.valTypeCheck ||
            !tmpItemSchema.valCountCheck
        ) {
          // Cleanup the error for response
          parsedItems.errors.push(_cleanFieldsForError(tmpItemSchema));
        } else {
          // Clean up the errors array since no errors were found for this line item
          delete tmpItemSchema.valErrors;
          parsedItems[tmpItem].push(tmpItemSchema);
        }
      });

      // Save any valid components
      _saveComponents(parsedItems.component, function (componentsErr, components) {
        if (componentsErr) {
          parsedItems.errors.push(componentsErr);
        }

        // Save any valid measures
        _saveMeasures(parsedItems.measure, function (measuresErr, measures) {
          if (measuresErr) {
            parsedItems.errors.push(measuresErr);
          }

          // Flatten to a single array
          parsedItems.errors = _.flattenDeep(parsedItems.errors);

          // Return CSV upload response
          res.sendResult = {
            status: (components.length || measures.length) ? "Success" : "Error",
            message: "Processed CSV File",
            errors: parsedItems.errors || [],
            components: components,
            measures: measures,
          };
          return next();
        });
      });
    });
  });

  req.pipe(busboy);
};
