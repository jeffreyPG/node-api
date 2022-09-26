'use strict';

// $ node seed-private-projects.js

// Set env for config
process.env.NODE_ENV = 'development';

var fs = require('fs'),
  path = require('path'),
  config = require('../config/config'),
  validate = require('../app/controllers/api/utils/api.validation'),
  mongoose = require('mongoose');

var { ProjectSchema } = require('../app/models/project.server.model');

// Setup database items
mongoose.Promise = global.Promise;
var db = mongoose.createConnection(config.db.uri);
var Project = db.model('Project', ProjectSchema);

var _colorizeRed = function(string) {
  return '\x1B[31m' + string + '\x1b[0m';
};
var _colorizeGreen = function(string) {
  return '\x1B[32m' + string + '\x1b[0m';
};

var STATIC_FILE_DIR = path.resolve('../static');


var _saveProjectsById = () => {
  return new Promise((resolve, reject) => {
    fs.readFile(STATIC_FILE_DIR + '/projectMigrationIds.json', (err, idFileContents) => {
      if (err || !idFileContents) {
        reject(err);
      }
      try {
        let idProjectsJSON = JSON.parse(idFileContents)
        let promises = []
        let projectIds = []

        const findAllProjectIds = Object.keys(idProjectsJSON).map((projectId) => {
          let editAndSaveProject = new Promise((resolve, reject) => {
            Project.findById(projectId).exec((err, project) => {
              // save an originalDisplayName if the project doesn't have one
              if(err || !project) {
                console.log(projectId)
                resolve()
              }
              if(!project.originalDisplayName) {
                project.originalDisplayName = project.displayName
              }
    
              project.project_category = idProjectsJSON[projectId]
    
              project.save((err, savedProject) => {
                if (err) {
                  reject(err);
                }
                projectIds.push(savedProject._id)
                resolve()
              })
            });
          })
    
          promises.push(editAndSaveProject)
        })
    
        Promise.all(findAllProjectIds).then(() => {
          return Promise.all(promises).then(() => {
            resolve(projectIds);
          }).catch((err) => { reject(err) });
        }).catch((err) => { reject(err) });


      } catch (err) {
        reject(err);
      }
    });
  })
}

var _saveOtherProjects = (otherProjects, otherProjectsJSON) => {
  return new Promise((resolve, reject) => {
    let promises = []
    let otherProjectIds = []

    const findAllProjects = otherProjects.map((singleProject) => {
      let editAndSaveProject = new Promise((resolve, reject) => {

        Project.findById(singleProject._id).exec((err, project) => {
          // save an originalDisplayName if the project doesn't have one
          if(!project.originalDisplayName) {
            project.originalDisplayName = project.displayName
          }

          // if it has a measureType
          if(singleProject && singleProject.measureType !== '' && otherProjectsJSON[singleProject.measureType]) {
            project.project_category = otherProjectsJSON[singleProject.measureType]
            otherProjectIds.push(project._id)
          }

          project.save((err, savedProject) => {
            if (err) {
              reject(err);
            }
            resolve()
          })
        });
      })

      promises.push(editAndSaveProject)
    })

    Promise.all(findAllProjects).then(() => {
      return Promise.all(promises).then(() => {
        resolve(otherProjectIds);
      }).catch((err) => { reject(err) });
    }).catch((err) => { reject(err) });
  })
} 

var _saveCalculatedProjects = (calculatedProjects, calculatedProjectsJSON) => {
  return new Promise((resolve, reject) => {
    let promises = []
    let projectIds = []

    const findAllProjects = calculatedProjects.map((singleProject) => {
      let editAndSaveProject = new Promise((resolve, reject) => {

        // find object with same base measure name
        let targetObject = calculatedProjectsJSON.find(x => x.base_measure === singleProject.name);
        
        Project.findById(singleProject._id).exec((err, project) => {
          // save an originalDisplayName if the project doesn't have one
          if(!project.originalDisplayName) {
            project.originalDisplayName = project.displayName
          }
          // save new fields based on targeted object
          if(targetObject) {
            project.project_category = targetObject.project_category
            project.project_application = targetObject.project_application
            project.project_technology = targetObject.project_technology
            projectIds.push(project._id)
          } else {
            console.log('no base measure matching for ', singleProject.name)
          }
          project.save((err, savedProject) => {
            if (err) {
              reject(err);
            }
            resolve()
          })
        });
      })

      promises.push(editAndSaveProject)
    })

    Promise.all(findAllProjects).then(() => {
      return Promise.all(promises).then(() => {
        resolve(projectIds);
      }).catch((err) => { reject(err) });
    }).catch((err) => { reject(err) });
  });
}

var divideProjects = (calculatedProjectsJSON, otherProjectsJSON) => {
  return new Promise((resolve, reject) => {

    Project.find({}).lean(true).exec((err, projects) => {
      let totalProjectIds = []
      let calculatedProjects = []
      let otherProjects = []
      projects.forEach((project) => {
        totalProjectIds.push(project._id)
        if(project.category === "calculated") {
          calculatedProjects.push(project)
        } else {
          otherProjects.push(project)
        }
      })

      _saveCalculatedProjects(calculatedProjects, calculatedProjectsJSON).then((calcProjectIds) => {
        _saveOtherProjects(otherProjects, otherProjectsJSON).then((otherProjectIds) => {
          _saveProjectsById().then((noMeasureTypeProjects) => {
            let projectIds = {
              totalProjects: totalProjectIds,
              calcProjectIds: calcProjectIds,
              otherProjectIds: otherProjectIds,
              noMeasureTypeProjects: noMeasureTypeProjects,
            }
            resolve(projectIds);
          }).catch((err) => reject(err))
        }).catch((err) => reject(err))
      }).catch((err) => reject(err))
    })
  })
}


var _readProjectData = () => {
  fs.readFile(STATIC_FILE_DIR + '/projectMigrationCalculated.json', (err, calculatedFileContents) => {
    if (err || !calculatedFileContents) {
      console.error(_colorizeRed('\n', 'Issues loading static file (projectMigrationCalculated.json).'), '\n');
    }
    try {
      var calculatedProjectsJSON = JSON.parse(calculatedFileContents);

      fs.readFile(STATIC_FILE_DIR + '/projectMigrationMeasureTypeMap.json', (err, incentiveFileContents) => {
        if (err || !incentiveFileContents) {
          console.error(_colorizeRed('\n', 'Issues loading static file (projectMigrationMeasureTypeMap.json).'), '\n');
        }
        try {
          var otherProjectsJSON = JSON.parse(incentiveFileContents);

          divideProjects(calculatedProjectsJSON, otherProjectsJSON).then((projectIds) => {
            console.log('Total projects:', _colorizeGreen(projectIds.totalProjects.length));
            console.log('Calculated projects:', _colorizeGreen(projectIds.calcProjectIds.length));
            console.log('Other projects (measureType -> project_category):', _colorizeGreen(projectIds.otherProjectIds.length));
            console.log('No measureType projects:', _colorizeGreen(projectIds.noMeasureTypeProjects.length));
            console.log('Remaining projects:', _colorizeGreen(projectIds.totalProjects.length - projectIds.otherProjectIds.length - projectIds.calcProjectIds.length - projectIds.noMeasureTypeProjects.length));
            console.log('\n', _colorizeGreen('All done 🙌'),'\n');
            process.exit()
          }).catch((err) => {
            console.error('\n',_colorizeRed(err),'\n');
            process.exit()  
          });

        } catch (err) {
          console.error('\n',_colorizeRed('Issues parsing data loaded from file (projectMigrationMeasureTypeMap.json).'),'\n');
          process.exit()
        }
      });
      
    } catch (err) {
      console.error('\n',_colorizeRed('Issues parsing data loaded from file (projectMigrationCalculated.json).'),'\n');
      process.exit()
    }
  });
}


_readProjectData();
