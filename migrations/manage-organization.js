'use strict';

// $ node manage-organization.js

// Set env for config
process.env.NODE_ENV = 'development';

var fs = require('fs'),
  path = require('path'),
  config = require('../config/config'),
  validate = require('../app/controllers/api/utils/api.validation'),
  mongoose = require('mongoose'),
  Schema = mongoose.Schema,
  UserSchema = require('../app/models/user.server.model'),
  OrganizationSchema = require('../app/models/organization.server.model');

// Setup database items
mongoose.Promise = global.Promise;
var db = mongoose.createConnection(config.db.uri);
var Organization = db.model('Organization', OrganizationSchema);
var User = db.model('User', UserSchema);

var args = process.argv.slice(2);

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

var _processOrganization = function() {
  var user;
  var userId = '';
  var organizationName = '';

  // Ensure we have all the required data to continue
  if (args.length !== 4) {
    return _returnError(
      'Ensure args "--name" and "--user-id" are included. ' +
      'The full command would resemble "node manage-organization.js --name "Corp INC" --user-id "599efa259b9acd0039067c4f".'
    );
  }

  // Grab and validate the pass args
  userId = args[args.indexOf('--user-id') + 1];
  organizationName = args[args.indexOf('--name') + 1];

  if (!validate.valMongoObjId(userId)) {
    return _returnError('The arg "-user-id" is not a valid mongo id.');
  }
  if (organizationName.length >= 50) {
    return _returnError('The arg "name" should be less than 50 characters.');
  }

  User.findById(userId).exec(function(err, user) {
    if (err) return _returnError(err.toString());
    if (!user) return _returnError('There was no user returned with id: ' + userId);

    Organization.findOne({ name: organizationName }).exec(function(err, organization) {
      if (err) return _returnError(err.toString());

      // Either update an existing or create a new organization
      var org = (!organization) ? new Organization({ name: organizationName }) : organization;

      if (!org.adminUserIds || (org.adminUserIds.indexOf(user._id) === -1)) org.adminUserIds.push(user._id);
      if (!org.createdByUserId)  org.createdByUserId = user._id;

      org.markModified('adminUserIds');

      org.save(function(err) {
        if (err) return _returnError(err.toString());

        user.organizationId = org._id;

        user.save(function(err) {
          if (err) return _returnError(err.toString());

          return _returnSuccess('User ' + user.email + ' has been linked to organization ' + org.name);
        });
      });
    });
  });
};

_processOrganization();
