'use strict';

// $ node seed-ea-measures.js

// Set env for config
process.env.NODE_ENV = 'development';

var fs = require('fs'),
  unirest = require('unirest'),
  mongoose = require('mongoose'),
  config = require('../config/config'),
  Schema = mongoose.Schema,
  OrganizationSchema = require('../app/models/organization.server.model');

var { MeasureSchema } = require('../app/models/measure.server.model');
var { ProjectSchema } = require('../app/models/project.server.model');

mongoose.Promise = global.Promise;
var db = mongoose.createConnection(config.db.uri);
var Measure = db.model('Measure', MeasureSchema);
var Project = db.model('Project', ProjectSchema);
var Organization = db.model('Organization', OrganizationSchema);



//ea-migration-private-measures.json
//ea-migration-public-measures.json

var publicMeasures = [];

//PUBLIC EA MEASURES
var readPublicMeasures = function(fileName, type) {
  return new Promise(function(resolve, reject){
    fs.readFile(fileName, type, (err, measures) => {
      if (err) {
        reject();
      }

      var measuresArr = JSON.parse(measures);      
      var measuresMap = measuresArr.map((measure, index) => {
        if(measure.measure.ecm){        
          let newMeasure = {
            "category": "description",
            "name": "none",
            "fields": [],
            "incentive": {"input_label": null,"input_description": null,"incentive_type": "none"},
            "displayName": measure.measure.ecm.name,
            "description": measure.measure.ecm.description,
            "project_category": "lighting",
            "project_application": "lighting"
          }
          publicMeasures.push(newMeasure);
        }
      });

      Promise.all(measuresMap).then(() => {
        resolve();
      });
    });
  });
}

var promises = [];
var orgPromises = [];

readPublicMeasures('../static/ea-migration-public-measures.json', 'utf8').then(() => {
  return new Promise(function(resolve){
    var map = publicMeasures.map((publicMeasure, index) => {
      var saveModel = new Promise(function(resolve) {
        Measure.find({displayName : publicMeasure.displayName}, function (err, measures) {
          if (measures.length > 0){
            resolve();
          }else{
            var currentMeasure = new Measure(publicMeasure);
            currentMeasure.save(function(err, org) {
              if (err) {
                console.log('err: ', err);
                resolve();
              }
              resolve();
            });
          }
        });
      });
      promises.push(saveModel);
    });

    return Promise.all(map).then(() => {
      return Promise.all(promises).then(() => {
        resolve();
        readPrivateMeasures('../static/ea-migration-private-measures.json', 'utf8').then(() => {
          return new Promise(function(resolve){
            var map = privateMeasures.map((privateMeasure, index) => {
              var saveModel = new Promise(function(resolve) {
                
                var currentProject = new Project(privateMeasure);
                currentProject.save(function(err, project) {
                  if (err || !project) {
                    console.log('err !project: ', err);
                    resolve();
                  }

                  Organization.findOne({firebaseOrgId : privateMeasure.fbOrgId}, function (err, organization) {
                    
                    if (err || !organization || organization === null) {
                      console.log('err !organization: ', err);
                      resolve();
                    } else {
                      organization.projectIds.push(project._id);
                      organization.markModified('projectIds');

                      var saveOrg = new Promise(function(resolve) {
                        organization.save(function(err, organization){
                          if (err) {
                            console.log('err: ', err);
                            resolve();
                          }
                          resolve();
                        });
                      });
                      orgPromises.push(saveOrg);
                      resolve();
                    }
                  });


                });
              });
              promises.push(saveModel);
            });

            return Promise.all(map).then(() => {
              return Promise.all(promises).then(() => {
                return Promise.all(orgPromises).then(() => {
                  resolve();
                  process.exit();
                });
              });
            });
          });
        });
      });
    });
  });
});

var privateMeasures = [];

var readPrivateMeasures = function(fileName, type) {
  return new Promise(function(resolve, reject){
    fs.readFile(fileName, type, (err, measures) => {
      if (err) {
        reject();
      }
      var measuresArr = JSON.parse(measures);      
      var measuresMap = measuresArr.map((measure, index) => {
        if(measure.measure.ecm){        
          let newMeasure = {
            "fbOrgId": measure.organizationFirebaseId,
            "category": "description",
            "name": "none",
            "fields": [],
            "incentive": {"input_label": null,"input_description": null,"incentive_type": "none"},
            "displayName": measure.measure.ecm.name,
            "originalDisplayName": measure.measure.ecm.name,
            "description": measure.measure.ecm.description,
            "project_category": "lighting",
            "project_application": "lighting"
          }
          privateMeasures.push(newMeasure);
        }
      });

      Promise.all(measuresMap).then(() => {
        resolve();
      });
    });
  });
}



