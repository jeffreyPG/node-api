'use strict';

// $ node seed-static-public-items.js

// Set env for config
process.env.NODE_ENV = 'development';

var fs = require('fs'),
  path = require('path'),
  config = require('../config/config'),
  validate = require('../app/controllers/api/utils/api.validation'),
  mongoose = require('mongoose'),
  Schema = mongoose.Schema,
  PublicMeasureSchema = require('../app/models/public.measure.server.model');

// Setup database items
mongoose.Promise = global.Promise;
var db = mongoose.createConnection(config.db.uri);
var PublicMeasure = db.model('PublicMeasure', PublicMeasureSchema);

// Set defaults for settings
var DROP_COLLECTION_BEFORE_SEED = true; // Toggle to drop db before loading
var DISPLAY_OUTPUT_FOR_EACH_ITEM = false; // Toggle to show success/error for each item
var DISPLAY_OUTPUT_SUMMARY_AFTER_TYPE = true; // Toggle to show error summary

var args = process.argv.slice(2);
// Only overwrite settings if there are args passed into the script
// Priorities based on order of arg checks
if (args.length) {
  if (args.indexOf('--drop') !== -1) DROP_COLLECTION_BEFORE_SEED = true;
  if (args.indexOf('--no-drop') !== -1) DROP_COLLECTION_BEFORE_SEED = false; // Priority no-drop
  if (args.indexOf('--item-output') !== -1) DISPLAY_OUTPUT_FOR_EACH_ITEM = true;
  if (args.indexOf('--no-item-output') !== -1) DISPLAY_OUTPUT_FOR_EACH_ITEM = false; // Priority no-item-output
  if (args.indexOf('--no-summary') !== -1) DISPLAY_OUTPUT_SUMMARY_AFTER_TYPE = false;
  if (args.indexOf('--summary') !== -1) DISPLAY_OUTPUT_SUMMARY_AFTER_TYPE = true; // Priority summary
}

var STATIC_FILE_DIR = path.resolve('../static');
var MEASURE_FILES_ARR = [
  { configProjectType: 'building', namespace: 'building', filename: 'public_measures.json' }
];

var errors = {};
var items = {
  components: {},
  measures: {}
};
var itemsFinished = {
  components: {},
  measures: {}
};
var totalFinishedArr = [];

var _colorizeRed = function(string) {
  return '\x1B[31m' + string + '\x1b[0m';
};
var _colorizeGreen = function(string) {
  return '\x1B[32m' + string + '\x1b[0m';
};

var _displaySummary = function(measureData) {
  if (!errors[measureData.typeplural]) {
    return console.log('\n', '\t\t',
      _colorizeGreen('No errors for ' + measureData.typeplural + ' (' + measureData.filename + ').'),
    '\n');
  }
  // Print the error count, type, and file
  console.log('\n', '-----------------------', '\n' ,'\t\t',
    _colorizeRed(
      'There are ' + errors[measureData.typeplural].length + ' errors for \'' + measureData.typeplural +
      '\' (' + measureData.filename + ').'
    ),
    '\n', '-----------------------'
  );
  // Loop thru and format the errors for display
  var tmpError;
  errors[measureData.typeplural].map(function(error, errNum) {
    tmpError = (error && error.error && typeof error.error.toJSON === 'function') ? error.error.toJSON() : error.error;
    console.log(
      errNum + 1 + '\t',
      '\tFile: ', error.filename, '\n',
      '\t\tIndex: ', error.index, '\n',
      '\t\tError Message: ', (tmpError && tmpError.errmsg) ? tmpError.errmsg : tmpError, '\n'
    );
  });
  console.log(' -----------------------');
};

var _checkPostProcess = function(measureData) {
    // Keep track of overall progress of all measure types finished
    totalFinishedArr.push(measureData.typeplural);
    // If all measure types havent processed then return out
    if (Object.keys(items.measures).length !== totalFinishedArr.length) return;

    // Run the post-process after everything has finished
    process.exit();
};

var tmpMeasureItem, tmpMeasure;
var tmpMeasureCount, tmpMeasureProcessedCount;
var _saveMeasuresToDatabase = function() {
  // Check if the database collection needs to be dropped before running import
  if (DROP_COLLECTION_BEFORE_SEED) {
    PublicMeasure.remove({}, function(err) {
      if (err) return console.log(_colorizeRed('There was an issue cleaning the collection before seeding: '), err);
      __runProcess();
    });
  } else {
    __runProcess();
  }

  function __saveToDatabase(itemModel, itemData, done) {
    itemModel.save(function(err, measureData) {
      // Attach any errors to this component and save the error to a glabal array
      if (err) {
        if (!errors[itemData.typeplural]) errors[itemData.typeplural] = [];
        itemData.error = err;
        errors[itemData.typeplural].push(itemData);
        return done(itemData);
      }
      return done(itemData);
    });
  };
  function __runProcess() {
    Object.keys(items.measures).map(function(measure) {
      measure = items.measures[measure];

      // Ensure the files were parsed correctly
      if (measure.measureArr && measure.config) {

        // Loop thru each measure of the measure types arr and save to db
        for (var index = 0; index < measure.measureArr.length; index +=1) {
          tmpMeasure = measure.measureArr[index];
          if (!tmpMeasure.name) continue;
          tmpMeasureItem = new PublicMeasure(tmpMeasure);

          // Save the item to the database, and send along its info to be displayed later
          __saveToDatabase(tmpMeasureItem, {
            item: 'measure',
            type: measure.config.projectType,
            typeplural: measure.config.projectType,
            index: index,
            name: tmpMeasure.name,
            filename: measure.filename,
          }, function(measureData) {
            // Keep a count of which items are completely finished processing
            // Use this later to trigger the post-process/display errors/etc...
            itemsFinished.measures[measureData.typeplural].push(1);

            // Show success/error message
            if (DISPLAY_OUTPUT_FOR_EACH_ITEM) {
              if (measureData.error) {
                console.log(_colorizeRed(
                  measureData.name + ' (' + measureData.type + ') - @index: ' + measureData.index + ' - Error!')
                );
              } else {
                console.log(
                  _colorizeGreen('Added "' + measureData.name + '" (' + measureData.type + ') - Success!')
                );
              }
            }

            tmpMeasureCount = items.measures[measureData.typeplural].measureArr.length;
            tmpMeasureProcessedCount = itemsFinished.measures[measureData.typeplural].length;
            // Check if all items of a certain type have been processed
            if (tmpMeasureCount === tmpMeasureProcessedCount) {
              if (DISPLAY_OUTPUT_SUMMARY_AFTER_TYPE) {
                _displaySummary(measureData);
              }
              _checkPostProcess(measureData);
            }
          });
        }

      }

    });
  };
};

var _processMeasureFiles = function() {
  // Process each of the measure files and store for further processing later
  MEASURE_FILES_ARR.map(function(measureFile, index) {
    fs.readFile(STATIC_FILE_DIR + '/' + measureFile.filename, function(err, fileContents) {
      if (err || !fileContents) {
        console.error(_colorizeRed('\n', 'Issues loading static file (' + measureFile.filename + ').'), '\n');
      }
      try {
        var fileContentsParsed = JSON.parse(fileContents);
        // Store item data
        items.measures[measureFile.namespace] = {};
        items.measures[measureFile.namespace].filename = measureFile.filename;
        items.measures[measureFile.namespace].measureDataArr = fileContentsParsed.measuresList || [];
        items.measures[measureFile.namespace].measureArr = [];
        items.measures[measureFile.namespace].config = {
          projectType: measureFile.configProjectType
        };
        // Store item finished data
        itemsFinished.measures[measureFile.namespace] = [];
      } catch (err) {
        console.error('\n',
          _colorizeRed('Issues parsing data loaded from file (' + measureFile.filename + ').'),
        '\n');
      }

      if (index === MEASURE_FILES_ARR.length - 1) {
        // Format the data to resemble a public measure schema, set by the public measure model
        items.measures[measureFile.namespace].measureDataArr.map(function(measure) {
          items.measures[measureFile.namespace].measureArr.push({
            name: measure.name,
            config: { projectType: measureFile.configProjectType },
            measure: {
              name: measure.name,
              ecm: {
                attachedTo: measure.attachedTo || ['building'],
                name: measure.name,
                description: measure.description
              }
            }
          });
        });

        delete items.measures[measureFile.namespace].measureDataArr;
        _saveMeasuresToDatabase();
      }
    });
  });
};

_processMeasureFiles();
