'use strict';

// $ node seed-organization-migration.js

// Set env for config
process.env.NODE_ENV = 'development';

var _ = require('lodash'),
    config = require('../config/config'),
    mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    UserSchema = require('../app/models/user.server.model'),
    OrganizationSchema = require('../app/models/organization.server.model'),
    BuildingSchema = require('../app/models/building.server.model'),
    TemplateSchema = require('../app/models/template.server.model');

// Setup database items
mongoose.Promise = global.Promise;
var db = mongoose.createConnection(config.db.uri);
var User = db.model('User', UserSchema);
var Organization = db.model('Organization', OrganizationSchema);
var Building = db.model('Building', BuildingSchema);
var Template = db.model('Template', TemplateSchema);


var _colorizeRed = function(string) {
  return '\x1B[31m' + string + '\x1b[0m';
};
var _colorizeGreen = function(string) {
  return '\x1B[32m' + string + '\x1b[0m';
};
    
//------------ ROOT ORG ------------\\
// for every user in the db (~ 37) create a root org for each 
  // put the user obj on the newly created root org model
  // also make sure to put the root org ID on the user model
const createRootOrgs = () => {
  return new Promise(function(resolve, reject){
    var promises = [];

    User.find({}, function(err, users){
      if (err) {
        console.log(_colorizeRed('Unable to find users in createRootOrgs()'));
        reject();
      }

      const allUsers = users.map((user) => {

        var rootOrgForEachUser = new Promise(function(resolve) {
          // create a root org for each user
          var newOrg = new Organization({
            name: user.name + '\'s Organization',
            orgType: 'root',
          });

          // add a single user obj to that org
          newOrg.users.push({
            userId: user._id,
            userRole: 'owner',
            buildingIds: ['all'],
            templateIds: ['all'],
          });

          // save org to get ID
          newOrg.save(function(err, org) {
            if (err) {
              console.log(_colorizeRed('Unable to save new root org for users in createRootOrgs()'));
              resolve(err);
            }
            
            if(!user.orgIds) {
              user.orgIds = []
            }
            var tempOrgIds = user.orgIds;
            tempOrgIds.push(org._id);

            user = _.extend(user, {
              orgIds: tempOrgIds
            });

            // save root org ID on the user model
            user.save(function(err, user) {
              if (err) {
                console.log(_colorizeRed('Unable to save save users after creating new root org in createRootOrgs()'));
                resolve(err);
              }
              resolve();
            });
          });
        });

        promises.push(rootOrgForEachUser);
      });

      Promise.all(allUsers).then(() => {
        return Promise.all(promises).then(() => {
          resolve();
        });
      });

    });
  });
};


//------------ COMPANY ORGS ------------\\
// find unique company names for each user
  // create an org for that company name
  // add the users with that company name to the corresponding org
  // add the org id to each user in that org

const _findUsersWithCompanies = (companies) => {
  let usersArray = []

  return new Promise(function(resolve, reject){
    User.find( { 'company' : { $in : companies } }).lean(true).exec(function(err, users) {
      if (err) {
        console.log(_colorizeRed('Unable to find users in _findUsersWithCompanies()'));
        reject();
      }

      var usersInSingleCompany = users.map(function(user) {
        usersArray.push(user._id)
      });

      Promise.all(usersInSingleCompany).then(() => {
        resolve(usersArray);
      });
  
    });
  })
}

const _saveUsersToOrg = (usersArray, companyName) => {
  return new Promise(function(resolve, reject){
    
    var newOrg = new Organization({
      name: companyName,
      orgType: 'group',
    });

    usersArray.map((userId, index) => {
      let role = 'editor'
      if(index === 0) {
        role = 'owner';
      }
    
      newOrg.users.push({
        userId: userId,
        userRole: role,
        buildingIds: ['all'],
        templateIds: ['all'],
      });

      newOrg.save(function(err, org) {
        if (err) {
          console.log(_colorizeRed('Unable to save new org to users in _saveUsersToOrg()'));
          resolve(err);
        }

        resolve(org._id)

      });

    });
  });
};


const _saveOrgIdToUsers = (usersArray, orgId) => {
  return new Promise((resolve, reject) => {
    var promises = [];

    User.find( { '_id' : { $in : usersArray } }, function(err, users) {
      if(err){ 
        console.log(_colorizeRed('Unable to find users from user array in _saveOrgIdToUsers()'));  
        resolve(err);
      }
      
      var findAllUsers = users.map(function(user) {
        
        var saveUsers = new Promise(function(resolve, reject) {
          
          // save company org id on to every user previously created
          var tempOrgIds = user.orgIds;
          tempOrgIds.push(orgId);
          user = _.extend(user, {
            orgIds: tempOrgIds
          });
          
          user.save(function(err) {
            if(err){ 
              console.log(_colorizeRed('Unable to save users in _saveOrgIdToUsers()'));  
              resolve(err);
            }
            resolve();
          });
          
        });
        promises.push(saveUsers);

      });

      Promise.all(findAllUsers).then(() => {
        return Promise.all(promises).then(() => {
          resolve();
        });
      });
    });
  });
};



const createCompanyOrgs = () => {
  return new Promise(function(resolve, reject){
    var promises = [];
    const companies = [
      {
        name: 'Simuwatt',
        companies: ["simuwatt", "simuwatt, Inc.", "new", "noea", "e", "Simuwatt", "O'Connor", "Claassen", "Test", "test company", "Eternal Contrast"]
      },
      {
        name: 'QA Source',
        companies: ["QASource", "QAS", "qas"]
      },
      {
        name: 'DNV GL',
        companies: ["DNV GL"]
      },
      {
        name: 'CUNY BPL',
        companies: ["CUNY BPL"]
      },
      {
        name: 'NYC',
        companies: ["NYC"]
      },
      {
        name: 'BEST',
        companies: ["BEST"]
      },
    ]

    // for every company name in array
    const createCompanies = companies.map((company) => {
      var groupOrgForEachCompany = new Promise(function(resolve) {
        
        // find users by companies group
        _findUsersWithCompanies(company.companies).then((usersArray) => {
          // create and save user objects on to new group org
          _saveUsersToOrg(usersArray, company.name).then((orgId) => {
            // save new orgId on to every user in array
            _saveOrgIdToUsers(usersArray, orgId).then(() => {

              resolve();

            });
          });
        });

      });

      promises.push(groupOrgForEachCompany);
    });

    Promise.all(createCompanies).then(() => {
      return Promise.all(promises).then(() => {
        resolve();
      });
    });

  });
};


//------------ BUILDING ORGS ------------\\
// for each user in each org, find the buildings that they have created
  // add those building IDs to the company org

//------------ TEMPLATE ORGS ------------\\
// for each user in each org, find the templates that they have created
  // add those template IDs to the company org

const _findAllBuildingIdsForUser = (userId) => {
  return new Promise((resolve, reject) => {
    let promises = [];
    let buildingArray = [];
    
    Building.find( { createdByUserId: userId } ).lean(true).exec(function (err, buildings) {
      if(err || !buildings) {
        console.log(_colorizeRed('Unable to find buildings created by user in _findAllBuildingIdsForUser()'));
        reject();
      }
    
      var findAllBuildings = buildings.map((building) => {
        var addBuildingId = new Promise(function(resolve, reject) {

          var tempBuildingIds = buildingArray;
          tempBuildingIds.push(building._id);

          resolve();
        });
    
        promises.push(addBuildingId);
        
      });

      Promise.all(findAllBuildings).then(() => {
        return Promise.all(promises).then(() => {
          resolve(buildingArray);
        });
      });

    });
  });
}

const _findAllTemplateIdsForUser = (userId) => {
  return new Promise((resolve, reject) => {
    let promises = [];
    let templateArray = [];
    
    Template.find( { createdByUserId: userId } ).lean(true).exec(function (err, templates) {
      if(err || !templates) {
        console.log(_colorizeRed('Unable to find templates created by user in _findAllTemplateIdsForUser()'));
        reject();
      }
    
      var findAllTemplates = templates.map((template) => {
        var addTemplateId = new Promise(function(resolve, reject) {

          var tempTemplateIds = templateArray;
          tempTemplateIds.push(template._id);

          resolve();
        });
    
        promises.push(addTemplateId);
        
      });

      Promise.all(findAllTemplates).then(() => {
        return Promise.all(promises).then(() => {
          resolve(templateArray);
        });
      });

    });
  });
}

const _findGroupOrgIdForUser = (userOrgIds) => {
  return new Promise((resolve, reject) => {
    let promises = [];
    let groupOrgId = '';

    Organization.find( { '_id' : { $in : userOrgIds }, "orgType": "group" } ).lean(true).exec(function (err, orgs) {
      if(err || !orgs) {
        console.log(_colorizeRed('Unable to find orgs of a user in _findGroupOrgIdForUser()'));
        reject();
      }
    
      var findAllOrgs = orgs.map((org) => {
        var findGroupOrgId = new Promise(function(resolve, reject) {
          
          groupOrgId = org._id;
          resolve();

        });
    
        promises.push(findGroupOrgId);
        
      });

      Promise.all(findAllOrgs).then(() => {
        return Promise.all(promises).then(() => {
          resolve(groupOrgId);
        });
      });

    });
  });
}

const addOrgBuildingsAndTemplatesToUser = () => {
  return new Promise(function(resolve, reject){
    var promises = [];
    var arrayOfUserObjs = [];

    User.find({}).lean(true).exec(function(err, users){
      if (err) {
        console.log(_colorizeRed('Unable to find users in addOrgBuildingsAndTemplatesToUser()'));
        reject();
      }

      const allUsers = users.map((user) => {
        let userObj = {
          id: user._id,
          groupOrgId: '',
          buildingIds: [],
          templateIds: []
        }

        var findUserTemplates = new Promise(function(resolve) {

          // find all buildings created by that user
          _findAllBuildingIdsForUser(user._id).then((buildingIds) => {
            // set buildingIds on user obj based on what comes back
            userObj.buildingIds = buildingIds;

            if(!buildingIds || buildingIds.length === 0) {
              userObj.buildingIds = ['all'];
            } 

            // find all templateIds created by that user
            _findAllTemplateIdsForUser(user._id).then((templateIds) => {
              // set buildingIds on user obj based on what comes back
              userObj.templateIds = templateIds;

              if(!templateIds || templateIds.length === 0) {
                userObj.templateIds = ['all'];
              } 

              // find the group org id for that user
              _findGroupOrgIdForUser(user.orgIds).then((groupOrgId) => {
                // set group org id on user obj based on what comes back
                userObj.groupOrgId = groupOrgId;

                arrayOfUserObjs.push(userObj)
                resolve();

              });
            });
          });
        });

        promises.push(findUserTemplates);
      });

      Promise.all(allUsers).then(() => {
        return Promise.all(promises).then(() => {
          resolve(arrayOfUserObjs);
        });
      });

    });
  });
};

const sortUserArray = (arrayOfUserObjs) => {
  return new Promise(function(resolve, reject){
    var promises = [];
    var arrayOfOrgObjs = [];

    const allUserObjs = arrayOfUserObjs.map((userObj) => {

      var sortUserObjs = new Promise(function(resolve) {

        let existing = arrayOfOrgObjs.filter(function(v, i) {
          return v.orgId.toString() === userObj.groupOrgId.toString();
        });

        // if the arrayOfOrgObjs array already contains an object with this orgId as a key/value
        if (existing.length) {
          let existingIndex = arrayOfOrgObjs.indexOf(existing[0]);
          arrayOfOrgObjs[existingIndex].buildingIds = arrayOfOrgObjs[existingIndex].buildingIds.concat(userObj.buildingIds);
          arrayOfOrgObjs[existingIndex].templateIds = arrayOfOrgObjs[existingIndex].templateIds.concat(userObj.templateIds);
        // if the array already contains the object with this orgId as a key/value
        } else {
          arrayOfOrgObjs.push({
            orgId: userObj.groupOrgId,
            buildingIds: userObj.buildingIds,
            templateIds: userObj.templateIds
          });
        }

        resolve();
      });

      promises.push(sortUserObjs);
    });

    Promise.all(allUserObjs).then(() => {
      return Promise.all(promises).then(() => {
        resolve(arrayOfOrgObjs);
      });
    });
  });
}

const saveObjsToOrg = (arrayOfOrgObjs) => {
  return new Promise((resolve, reject) => {
    let promises = [];

    var lookUpOrg = arrayOfOrgObjs.map((orgObj) => {
      var findGroupOrgId = new Promise(function(resolve, reject) {

        Organization.findOne( { '_id' : orgObj.orgId }, function (err, org) {
          if(err || !org) {
            console.log(_colorizeRed('Unable to find org in saveObjsToOrg()'));
            reject();
          }

          org = _.extend(org, {
            buildingIds: orgObj.buildingIds,
            templateIds: orgObj.templateIds
          });
          
          org.save(function(err, org) {
            if(err){ 
              console.log(_colorizeRed('Unable to save org in saveObjsToOrg()'));
              resolve(err);
            }

            console.log(_colorizeGreen(`Successfully saved ${org.buildingIds.length} buildings, ${org.templateIds.length} templates and ${org.users.length} users in the ${org.name} organization.`));

            resolve();
          });

        });
      });
  
      promises.push(findGroupOrgId);
      
    });

    Promise.all(lookUpOrg).then(() => {
      return Promise.all(promises).then(() => {
        resolve();
      });
    });

  });
}


createRootOrgs().then(() => {
  
  createCompanyOrgs().then(() => {

    addOrgBuildingsAndTemplatesToUser().then((arrayOfUserObjs) => {

      sortUserArray(arrayOfUserObjs).then((arrayOfOrgObjs) => {

        saveObjsToOrg(arrayOfOrgObjs).then(() => {

          console.log('All done! 🙌')
          process.exit(-1);

        }).catch(() => {
          return console.log('Issues saving objs to org');  
        });

      }).catch(() => {
        return console.log('Issues creating org objects from user objects');  
      });

    }).catch(() => {
      return console.log('Issues creating user objects');  
    });

  }).catch(() => {
    return console.log('Issues creating company orgs');  
  });

}).catch(() => {
  return console.log('Issues creating root orgs');
});