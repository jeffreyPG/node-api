'use strict';

// $ node seed-private-projects.js

// Set env for config
process.env.NODE_ENV = 'development';

var fs = require('fs'),
  path = require('path'),
  config = require('../config/config'),
  validate = require('../app/controllers/api/utils/api.validation'),
  mongoose = require('mongoose'),
  Schema = mongoose.Schema,
  OrganizationSchema = require('../app/models/organization.server.model');

var { ProjectSchema } = require('../app/models/project.server.model');

// Setup database items
mongoose.Promise = global.Promise;
var db = mongoose.createConnection(config.db.uri);
var Project = db.model('Project', ProjectSchema);
var Organization = db.model('Organization', OrganizationSchema);

// Set defaults for settings
var DROP_COLLECTION_BEFORE_SEED = true; // Toggle to drop organization library before loading
var DISPLAY_OUTPUT_FOR_EACH_ITEM = false; // Toggle to show success/error for each item

var args = process.argv.slice(2);
// Only overwrite settings if there are args passed into the script
// Priorities based on order of arg checks
if (args.length) {
  if (args.indexOf('--drop') !== -1) DROP_COLLECTION_BEFORE_SEED = true;
  if (args.indexOf('--no-drop') !== -1) DROP_COLLECTION_BEFORE_SEED = false; // Priority no-drop
  if (args.indexOf('--item-output') !== -1) DISPLAY_OUTPUT_FOR_EACH_ITEM = true;
  if (args.indexOf('--no-item-output') !== -1) DISPLAY_OUTPUT_FOR_EACH_ITEM = false; // Priority no-item-output
}

var _colorizeRed = function(string) {
  return '\x1B[31m' + string + '\x1b[0m';
};
var _colorizeGreen = function(string) {
  return '\x1B[32m' + string + '\x1b[0m';
};

var STATIC_FILE_DIR = path.resolve('../static');

var _saveIndividualProject = (measure, orgId) => {
  return new Promise((resolve, reject) => {

    var project = new Project(measure);
    project.validate(function(err) {
      if (err) {
        reject(err);
      }
  
      Organization.findById(orgId, function (err, organization) {
        if (err) {
          reject(err);
        }
        organization.projectIds.push(project._id);
        organization.markModified('projectIds');
        organization.save(function(err){
          if (err) {
            reject(err);
          }
          
          project.updated = Date.now();
          
          project.save(function(err) {
            if (err) {
              reject(err);
            }
            if(DISPLAY_OUTPUT_FOR_EACH_ITEM) {
              console.log(_colorizeGreen('Project created: ' + project.displayName));
            }
            resolve();
          });
        });
      });
    });
  });
}

var _saveProjectsToDatabase = (fileContents) => {
  return new Promise((resolve, reject) => {
    var promises = [];
    var projectCount = 0;
    const allProjects = fileContents.measures.map((measure) => {
      var saveEachProject = new Promise((resolve, reject) => {
        _saveIndividualProject(measure, fileContents.organizationId, fileContents.userId).then(() => {
          projectCount++;
          resolve();
        }).catch((err) => {
          reject(err)
        });
      });

      promises.push(saveEachProject);
    });

    Promise.all(allProjects).then(() => {
      return Promise.all(promises).then(() => {
        resolve(projectCount);
      }).catch((err) => { reject(err) });
    }).catch((err) => { reject(err) });
  });
}

var _removeIndividualProject = (projectId) => {
  return new Promise((resolve, reject) => {
    Project.findById(projectId, (err, project) => {
      if (err) {
        reject(err);
      }
      if(!project) {
        resolve(); // no project with this ID exists
        return;
      }
      project.remove((err) => {
        if(err) {
          reject(err);
        }
        resolve();
      });
    });
  });
}

var _dropOrgProjects = (orgId, projectIds) => {
  return new Promise((resolve, reject) => {
    var promises = [];

    const removeAllProjects = projectIds.map((projectId) => {
      var removeEachProject = new Promise((resolve, reject) => {
        // remove each individual project, if it exists
        _removeIndividualProject(projectId).then(() => {
          resolve();
        }).catch((err) => {
          reject(err)
        });
      });

      promises.push(removeEachProject);
    });

    Promise.all(removeAllProjects).then(() => {
      return Promise.all(promises).then(() => {
        // clear out the projectIds array on the organization and save
        Organization.findById(orgId, (err, organization) => {
          if (err) {
            reject(err);
          }
          organization.projectIds = [];
          organization.markModified('projectIds');
          organization.save((err) => {
            if (err) {
              reject(err);
            }
            resolve();
          })
        });
      }).catch((err) => { reject(err) });
    }).catch((err) => { reject(err) });
  });
}

var _findOrgProjectIds = (orgId) => {
  return new Promise((resolve, reject) => {
    Organization.findById(orgId, function (err, organization) {
      if(err) {
        reject(err);
      }
      resolve(organization.projectIds);
    })
  })
}

var _processMeasureFiles = () => {
  fs.readFile(STATIC_FILE_DIR + '/myLibraryMeasures.json', (err, fileContents) => {
    if (err || !fileContents) {
      console.error(_colorizeRed('\n', 'Issues loading static file (myLibraryMeasures.json).'), '\n');
    }
    try {
      var fileContentsParsed = JSON.parse(fileContents);
      // add extra data to each to match projects model
      fileContentsParsed.measures.map((measure) => {
        measure.originalDisplayName = measure.displayName;
        measure.tags = [];
        measure.location = [];
        measure.initialValues = {};
        measure.initialValues.displayName = measure.displayName;
        measure.initialValues.description = measure.description;
        measure.isComplete = false;
        measure.createNewProject = false;
        measure.createdByUserId = fileContentsParsed.userId;
      });

      if(DROP_COLLECTION_BEFORE_SEED) {
        _findOrgProjectIds(fileContentsParsed.organizationId).then((projectIds) => {
          _dropOrgProjects(fileContentsParsed.organizationId, projectIds).then(() => {
            _saveProjectsToDatabase(fileContentsParsed).then((projectCount) => {
              console.log('\n',
                _colorizeGreen('Total projects created: ' + projectCount + ' 🙌'),
              '\n');
              process.exit()
            }).catch((err) => {
              console.error('\n',
                _colorizeRed(err),
              '\n');
              process.exit()  
            });
          }).catch((err) => {
            console.error('\n',_colorizeRed(err),'\n');
            process.exit()
          });
        }).catch((err) => {
          console.error('\n',_colorizeRed(err),'\n');
          process.exit()
        });
      } else {
        _saveProjectsToDatabase(fileContentsParsed).then((projectCount) => {
          console.log('\n', _colorizeGreen('Total projects created: ' + projectCount + ' 🙌'),'\n');
          process.exit()
        }).catch((err) => {
          console.error('\n',_colorizeRed(err),'\n');
          process.exit()  
        });
      }

    } catch (err) {
      console.error('\n',_colorizeRed('Issues parsing data loaded from file (myLibraryMeasures.json).'),'\n');
      process.exit()
    }
  });
};

_processMeasureFiles();
