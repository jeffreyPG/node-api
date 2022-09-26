'use strict';

// $ node transfer-ea-private-library.js

// Set env for config
process.env.NODE_ENV = 'development';

var fs = require('fs'),
  unirest = require('unirest'),
  mongoose = require('mongoose'),
  config = require('../config/config'),
  Schema = mongoose.Schema,
  OrganizationSchema = require('../app/models/organization.server.model');

var { ProjectSchema } = require('../app/models/project.server.model');

mongoose.Promise = global.Promise;
var db = mongoose.createConnection(config.db.uri);
var Project = db.model('Project', ProjectSchema);
var Organization = db.model('Organization', OrganizationSchema);


var projectsWithErrors = [];


//ea_measures_export.json

//export mongo measures collection to json and wrap in array brackets

var _organizeOrgIds = function(orgIds) {
  return new Promise(function(resolve, reject){

    var organizedOrgIds = [];
    var sorted = orgIds.sort((a, b) => a.fbId < b.fbId ? -1 : 1);

    var sortedObj = {
      fbId: 0,
      projectIds: [],
    }

    var sortedMap = sorted.map((obj, index) => {
      if(sortedObj.fbId !== obj.fbId){
        if(sortedObj.fbId !== 0){
          organizedOrgIds.push(JSON.parse(JSON.stringify(sortedObj)));
        }
        sortedObj.fbId = obj.fbId;
        sortedObj.projectIds = obj.projectIds || [];

        if(sorted.length === 1){
          organizedOrgIds.push(JSON.parse(JSON.stringify(sortedObj)));
        }
      } else {
        let tempProjectIds = JSON.parse(JSON.stringify(sortedObj.projectIds))
        sortedObj.projectIds = tempProjectIds.concat(obj.projectIds);
      }
    });

    Promise.all(sortedMap).then(() => {
      resolve(organizedOrgIds);
    });

  });
}



var _saveOrg = function(orgIds) {

  return new Promise(function(resolve, reject){
    var orgPromise = [];
    var orgsMap = orgIds.map((org, index) => {
      var saveOrg = new Promise(function(resolve, reject) {
        Organization.findOne( { 'firebaseOrgId' : org.fbId }, function(err, organization) {

          if (err || !organization) {
            console.log(' ');
            console.log('ERROR');
            console.log('error finding organization with firebaseOrgId: ', org.fbId);
            console.log(' ');
            resolve();
          } else {
            let tempProjectIds = JSON.parse(JSON.stringify(organization.projectIds)).concat(org.projectIds);
        
            organization.projectIds = tempProjectIds;
            organization.markModified('projectIds');

            organization.save(function(err, returnedOrg) {

              if (err) {
                console.log(' ');
                console.log('ERROR');
                console.log('could not save organization: ', organization._id);
                console.log('err: ', err);
                console.log(' ');
                resolve();
              } else {
                resolve();
              }
            });
          }
        });
      });
      orgPromise.push(saveOrg);
    });

    Promise.all(orgsMap).then(() => {
      return Promise.all(orgPromise).then(() => {
        resolve();
      }).catch((err) => {
        reject(err);
      });
    });
  });
};

//PRIVATE EA MEASURES
var readPrivateProjects = function(fileName, type) {
  return new Promise(function(resolve, reject){
    var projectPromise = [];
    var orgIds = [];
    fs.readFile(fileName, type, (err, projects) => {
      if (err) {
        reject();
      }


      var projectsArr = JSON.parse(projects).sort((a, b) => a.organizationFirebaseId < b.organizationFirebaseId ? -1 : 1);
    
      var idsObj = {
        fbId: 0,
        projectIds: [],
      }

      var projectsMap = projectsArr.map((project, index) => {

        let newProject = {
          "name": "none",
          "displayName": project.name || project.measure.name,
          "originalDisplayName": project.name || project.measure.name,
          "eaDisplayName": project.name || project.measure.name,
          "description": project.measure.ecm && project.measure.ecm.description ? project.measure.ecm.description : "",
          "created": new Date(project.created.$date) || Date.now(),
          "eaSavedToLibrary": project.measure.savedToLibrary || false,
          "eaAttachedTo": project.measure.ecm && project.measure.ecm.attachedTo ? project.measure.ecm.attachedTo : [],
          "project_category": project.measure.category || "Light Fixtures",
          "project_application": project.measure.category || "Light Fixtures",
          "incentive": {
            "incentive_type": "none"
          },
          "category": "description",
          "organizationFirebaseId": project.organizationFirebaseId || ''
        }
      
       
        var saveProject = new Promise(function(resolve, reject) {
          
          var buildeeProject = new Project(newProject);

          buildeeProject.save(function(err, savedProject) {
            if (err || !savedProject) {
              projectsWithErrors.push(project);
              console.log(' ');
              console.log('ERROR');
              console.log('err: ', err);
              console.log('on project: ', project);
              console.log(' ');
              resolve();
            } else {

              if(idsObj.fbId !== project.organizationFirebaseId){
                if(idsObj.fbId !== 0){
                  orgIds.push(JSON.parse(JSON.stringify(idsObj)));
                }
                idsObj.fbId = project.organizationFirebaseId;
                idsObj.projectIds = [savedProject._id];

                if(projectsArr.length === 1){
                  orgIds.push(JSON.parse(JSON.stringify(idsObj)));
                }
              } else {
                idsObj.projectIds.push(savedProject._id);
              }
              resolve();
            }
          });
        });
        projectPromise.push(saveProject);
      });

      Promise.all(projectsMap).then(() => {
        return Promise.all(projectPromise).then(() => {
          _organizeOrgIds(orgIds).then((organizedOrgIds) => {
            _saveOrg(organizedOrgIds).then(() => {
              resolve();
            })
          })
        }).catch((err) => {
          reject(err);
        });
      });
    });
  });
}

var _colorizeGreen = function(string) {
  return '\x1B[32m' + string + '\x1b[0m';
};



readPrivateProjects('../static/ea_measures_export.json', 'utf8').then(() => {
  console.log(_colorizeGreen('EA Private Library successfully transfered.'));
  
  if(projectsWithErrors.length > 0){
    console.log("projectsWithErrors: ", projectsWithErrors);
  }
  process.exit();
});

