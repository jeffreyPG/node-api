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
  PublicComponentSchema = require('../app/models/public.component.server.model');

// Setup database items
mongoose.Promise = global.Promise;
var db = mongoose.createConnection(config.db.uri);
var PublicComponent = db.model('PublicComponent', PublicComponentSchema);

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
var COMPONENT_FILES_ARR = [
  // Top-level components
  { configSingular: 'lightfixture', namespace: 'lightfixtures', filename: 'public_component_lightfixtures.json' },
  { configSingular: 'window', namespace: 'windows', filename: 'public_component_windows.json' },
  { configSingular: 'door', namespace: 'doors', filename: 'public_component_doors.json' },
  { configSingular: 'plugload', namespace: 'plugloads', filename: 'public_component_plugloads.json' },
  { configSingular: 'processload', namespace: 'processloads', filename: 'public_component_processloads.json' },
  { configSingular: 'waterfixture', namespace: 'waterfixtures', filename: 'public_component_waterfixtures.json' },
  { configSingular: 'constructions', namespace: 'constructions', filename: 'public_component_constructions.json' },
  // System-level components
  { configSingular: 'boiler', namespace: 'boilers', filename: 'public_component_boilers.json' },
  { configSingular: 'chiller', namespace: 'chillers', filename: 'public_component_chillers.json' },
  { configSingular: 'coolingtowers', namespace: 'coolingtowers', filename: 'public_component_coolingtowers.json' },
  { configSingular: 'dhw', namespace: 'dhws', filename: 'public_component_dhws.json' },
  { configSingular: 'pump', namespace: 'pumps', filename: 'public_component_pumps.json' },
  { configSingular: 'fan', namespace: 'fans', filename: 'public_component_fans.json' },
  // Terminal components
  { configSingular: 'terminal', namespace: 'terminals', filename: 'public_component_terminals.json' },
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

var _displaySummary = function(componentData) {
  if (!errors[componentData.typeplural]) {
    return console.log('\n', '\t\t',
      _colorizeGreen('No errors for ' + componentData.typeplural + ' (' + componentData.filename + ').'),
    '\n');
  }
  // Print the error count, type, and file
  console.log('\n', '-----------------------', '\n' ,'\t\t',
    _colorizeRed(
      'There are ' + errors[componentData.typeplural].length + ' errors for \'' + componentData.typeplural +
      '\' (' + componentData.filename + ').'
    ),
    '\n', '-----------------------'
  );
  // Loop thru and format the errors for display
  var tmpError;
  errors[componentData.typeplural].map(function(error, errNum) {
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

var _checkPostProcess = function(componentData) {
    // Keep track of overall progress of all component types finished
    totalFinishedArr.push(componentData.typeplural);
    // If all component types havent processed then return out
    if (Object.keys(items.components).length !== totalFinishedArr.length) return;

    // Run the post-process after everything has finished
    process.exit();
};

var tmpComponentItem, tmpComponent;
var tmpComponentCount, tmpComponentProcessedCount;
var _saveComponentsToDatabase = function() {
  // Check if the database collection needs to be dropped before running import
  if (DROP_COLLECTION_BEFORE_SEED) {
    PublicComponent.remove({}, function(err) {
      if (err) return console.log(_colorizeRed('There was an issue cleaning the collection before seeding: '), err);
      __runProcess();
    });
  } else {
    __runProcess();
  }

  function __saveToDatabase(itemModel, itemData, done) {
    itemModel.save(function(err, componentData) {
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
    Object.keys(items.components).map(function(component) {
      component = items.components[component];

      // Ensure the files were parsed correctly
      if (component.componentArr && component.config) {

        // Loop thru each component of the component types arr and save to db
        for (var index = 0; index < component.componentArr.length; index +=1) {
          tmpComponent = component.componentArr[index];
          if (!tmpComponent.name) continue;
          tmpComponentItem = new PublicComponent({
            name: tmpComponent.name,
            component: tmpComponent,
            config: component.config
          });

          // Save the item to the database, and send along its info to be displayed later
          __saveToDatabase(tmpComponentItem, {
            item: 'component',
            type: component.config.type,
            typeplural: component.config.typeplural,
            index: index,
            name: tmpComponent.name,
            filename: component.filename,
          }, function(componentData) {
            // Keep a count of which items are completely finished processing
            // Use this later to trigger the post-process/display errors/etc...
            itemsFinished.components[componentData.typeplural].push(1);

            // Show success/error message
            if (DISPLAY_OUTPUT_FOR_EACH_ITEM) {
              if (componentData.error) {
                console.log(_colorizeRed(
                  componentData.name + ' (' + componentData.type + ') - @index: ' + componentData.index + ' - Error!')
                );
              } else {
                console.log(
                  _colorizeGreen('Added "' + componentData.name + '" (' + componentData.type + ') - Success!')
                );
              }
            }

            tmpComponentCount = items.components[componentData.typeplural].componentArr.length;
            tmpComponentProcessedCount = itemsFinished.components[componentData.typeplural].length;
            // Check if all items of a certain type have been processed
            if (tmpComponentCount === tmpComponentProcessedCount) {
              if (DISPLAY_OUTPUT_SUMMARY_AFTER_TYPE) {
                _displaySummary(componentData);
              }
              _checkPostProcess(componentData);
            }
          });
        }

      }

    });
  };
};
var _processComponentFiles = function() {
  // Process each of the component files and store for further processing later
  COMPONENT_FILES_ARR.map(function(componentFile, index) {
    fs.readFile(STATIC_FILE_DIR + '/' + componentFile.filename, function(err, fileContents) {
      if (err || !fileContents) {
        console.error(_colorizeRed('\n', 'Issues loading static file (' + componentFile.filename + ').'), '\n');
      }
      try {
        // Store item data
        items.components[componentFile.namespace] = {};
        items.components[componentFile.namespace].filename = componentFile.filename;
        items.components[componentFile.namespace].componentArr = JSON.parse(fileContents) || [];
        items.components[componentFile.namespace].config = {
          type: componentFile.configSingular,
          typeplural: componentFile.namespace
        };
        // Store item finished data
        itemsFinished.components[componentFile.namespace] = [];
      } catch (err) {
        console.error('\n',
          _colorizeRed('Issues parsing data loaded from file (' + componentFile.filename + ').'),
        '\n');
      }

      if (index === COMPONENT_FILES_ARR.length - 1) {
        _saveComponentsToDatabase();
      }
    });
  });
};

_processComponentFiles();
