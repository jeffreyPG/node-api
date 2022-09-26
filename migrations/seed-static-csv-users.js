'use strict';

// $ node seed-static-csv-users.js --csv-path /opt/mean.js/firebase-users.csv --item-output --summary

// Set env for config
process.env.NODE_ENV = 'development';

var fs = require('fs'),
  path = require('path'),
  util = require('../app/controllers/api/utils/api.utils'),
  config = require('../config/config'),
  validate = require('../app/controllers/api/utils/api.validation'),
  mongoose = require('mongoose'),
  Schema = mongoose.Schema,
  organization = require('../app/models/organization.server.model'),
  user = require('../app/models/user.server.model');

// Setup database items
mongoose.Promise = global.Promise;
var db = mongoose.createConnection(config.db.uri);
var User = db.model('User', user);
var Organization = db.model('Organization', organization);

// Set defaults for settings
var DISPLAY_OUTPUT_FOR_EACH_ITEM = false; // Toggle to show success/error for each item
var DISPLAY_OUTPUT_SUMMARY_AFTER_TYPE = true; // Toggle to show error summary

var args = process.argv.slice(2);
// Only overwrite settings if there are args passed into the script
// Priorities based on order of arg checks
if (args.length) {
  if (args.indexOf('--item-output') !== -1) DISPLAY_OUTPUT_FOR_EACH_ITEM = true;
  if (args.indexOf('--no-item-output') !== -1) DISPLAY_OUTPUT_FOR_EACH_ITEM = false; // Priority no-item-output
  if (args.indexOf('--no-summary') !== -1) DISPLAY_OUTPUT_SUMMARY_AFTER_TYPE = false;
  if (args.indexOf('--summary') !== -1) DISPLAY_OUTPUT_SUMMARY_AFTER_TYPE = true; // Priority summary
}

var LINE_PARSE_REGEX = /(?!\s*$)\s*(?:'([^'\\]*(?:\\[\S\s][^'\\]*)*)'|"([^"\\]*(?:\\[\S\s][^"\\]*)*)"|([^,'"\s\\]*(?:\s+[^,'"\s\\]+)*))\s*(?:,|$)/g;
var _convertCsvLineItemToArray = function(lineItem) {
  var tmpArr = [];
  // Split each line item into tmp array
  lineItem.replace(LINE_PARSE_REGEX, function(m0, m1, m2, m3) {
    if (m1 !== undefined) {
      tmpArr.push(m1.replace(/\\'/g, '\''));
    } else if (m2 !== undefined) {
      tmpArr.push(m2.replace(/\\"/g, '"'));
    } else if (m3 !== undefined) {
      tmpArr.push(m3);
    }
    return '';
  });
  if (/,\s*$/.test(lineItem)) {
    tmpArr.push('');
  }
  return tmpArr;
};

var _colorizeRed = function(string) {
  return '\x1B[31m' + string + '\x1b[0m';
};
var _colorizeGreen = function(string) {
  return '\x1B[32m' + string + '\x1b[0m';
};

var _returnError = function(msg) {
  console.log('\n', _colorizeRed(msg), '\n');
  return process.exit();
};
var _returnSuccess = function(msg) {
  console.log('\n', _colorizeGreen(msg), '\n');
  return process.exit();
};

var parsedItems = {
  errors: [],
  models: [],
  valid: [],
  organizations: []
};

var _postProcess = function() {
  if (!DISPLAY_OUTPUT_SUMMARY_AFTER_TYPE) process.exit();

  console.log('\n', _colorizeRed('There were ' + parsedItems.errors.length + ' errors.'), '\n');
  console.log('\n', _colorizeGreen('There were ' + parsedItems.valid.length + ' successful entries.'), '\n');
  if (parsedItems.organizations.length) {
    console.log('\n', _colorizeGreen('Organizations created: ' + parsedItems.organizations), '\n');
  }

  process.exit();
};

var _saveToDatabase = function() {
  if (!parsedItems.models.length) return _returnError('No valid items to save.');

  var iterators = [];
  function _checkFinished() {
    iterators.push(1);
    if (iterators.length === parsedItems.models.length) _postProcess();
  };

  var validArr = [];
  parsedItems.models.map(function(item) {
    var user = new User(item.user);
    user.save(function(err) {
      if (err) {
        parsedItems.errors.push({ index: item.index, lineItem: item.lineItem });
        if (DISPLAY_OUTPUT_FOR_EACH_ITEM) {
          console.log(_colorizeRed('Index: ' + item.index + '. LineItem: ' + item.lineItem + '. Reason: ' + err.toString()));
        }
        _checkFinished();
      } else {
        var org = new Organization({
          name: item.organization.name,
          adminUserIds: [user._id],
          createdByUserId: user._id
        });
        org.save(function(err) {
          if (err) {
            parsedItems.errors.push({ index: item.index, lineItem: item.lineItem });
            if (DISPLAY_OUTPUT_FOR_EACH_ITEM) {
              console.log(_colorizeRed('Index: ' + item.index + '. LineItem: ' + item.lineItem + '. Reason: ' + err.toString()));
            }
          } else {
            parsedItems.valid.push({ index: item.index, lineItem: item.lineItem });
            if (DISPLAY_OUTPUT_SUMMARY_AFTER_TYPE) {
              parsedItems.organizations.push(org.name);
            }
            if (DISPLAY_OUTPUT_FOR_EACH_ITEM) {
              console.log(_colorizeGreen('Index: ' + item.index + '. LineItem: ' + item.lineItem + '. Success!'));
            }
          }
          _checkFinished();
        });
      }
    });
  });
};

var _processUserCsvFile = function() {
  var csvFilePath, fileCheck;

  // Ensure we have a file path arg supplied
  if (args.indexOf('--csv-path') === -1) {
    return _returnError('No "--csv-path" csv file path arg.');
  }

  csvFilePath = args[args.indexOf('--csv-path') + 1];
  if(!fs.existsSync(csvFilePath)) {
    return _returnError('No file exists at this --csv-path.');
  }

  fileCheck = path.parse(csvFilePath);
  if (!fileCheck || (fileCheck && fileCheck.ext && fileCheck.ext !== '.csv')) {
    return _returnError('No .csv file extension used for --csv-path.');
  }

  var tmpName, tmpEmail, tmpOrgName,
    tmpFirebaseUserId, tmpFirebaseOrgId;
  var tmpUser, tmpOrganization;
  var tmpLineArr = [];
  var error;
  // Read file and parse csv contents
  fs.readFile(csvFilePath, 'utf-8', (err, contents) => {
    if (err) return _returnError('Issues reading file.')

    // Split each line item into an array element, remove the last empty element
    var fileContentsArr = contents.split('\n');
    if (!fileContentsArr[fileContentsArr.length - 1]) fileContentsArr.pop();

    fileContentsArr.map(function(lineItem, lineItemIndex) {
      error = null;
      // Skip the first csv export column line
      if ((lineItemIndex === 0) && lineItem.startsWith('name,')) error = true;
      if (error && DISPLAY_OUTPUT_FOR_EACH_ITEM) {
        console.log(_colorizeRed('Index: ' + lineItemIndex + '. LineItem: ' + lineItem + '. Reason: Column line.'));
      }

      tmpLineArr = _convertCsvLineItemToArray(lineItem);
      if (tmpLineArr.length !== 8) error = true;
      if (error && DISPLAY_OUTPUT_FOR_EACH_ITEM) {
        console.log(_colorizeRed('Index: ' + lineItemIndex + '. LineItem: ' + lineItem + '. Reason: Must be 7 commas delimited line items.'));
      }

      // Store the desired lineitems
      tmpName = tmpLineArr[0] || null;
      tmpEmail = tmpLineArr[4] || null;
      tmpOrgName = tmpLineArr[7] || null;
      tmpFirebaseUserId = tmpLineArr[3] || null;
      tmpFirebaseOrgId = tmpLineArr[6] || null;

      tmpUser = {
        name: tmpName,
        email: tmpEmail,
        username: tmpEmail,
        password: util.generateRandomString(50)
      };

      tmpOrganization = {
        name: tmpOrgName
      };

      // Ensure all values are required values are present
      if ([tmpName, tmpEmail, tmpOrgName, tmpFirebaseUserId, tmpFirebaseOrgId].includes(null)) error = true;
      if (error && DISPLAY_OUTPUT_FOR_EACH_ITEM) {
        console.log(_colorizeRed('Index: ' + lineItemIndex + '. LineItem: ' + lineItem + '. Reason: Missing required data in lineitem.'));
      }

      // If there was an error, then store error else pass the models to be validated and saved
      if (error) {
        parsedItems.errors.push({ index: lineItemIndex, lineItem: lineItem });
      } else {
        parsedItems.models.push({ index: lineItemIndex, lineItem: lineItem, user: tmpUser, organization: tmpOrganization });
      }

      // When the final item is parsed, only then proceed to the next process
      if (lineItemIndex === (fileContentsArr.length - 1)) return _saveToDatabase();
    });
  });
};

_processUserCsvFile();
