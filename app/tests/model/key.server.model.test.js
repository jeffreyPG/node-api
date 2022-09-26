"use strict";

var _ = require("lodash"),
  should = require("should"),
  mongoose = require("mongoose"),
  testUtils = require("../utils/test.utils");
const Key = require("../../models/key.server.model");

/**
 * Globals
 */
var baseKey, key, dupeKey;
var keyNoOrganizationFirebaseId, keyNoUserFirebaseId;

/**
 * Key Unit tests
 */
describe("Key Model Unit Tests:", function () {
  before(function (done) {
    baseKey = {
      organizationFirebaseId: "-KHdRY07WQa-Kq9ZTjad",
      userFirebaseId: "-KMbWCZkGo0O8WOQhknU",
      eaUsername: "test ea username"
    };

    key = new Key(baseKey);
    dupeKey = new Key(baseKey);

    // Clean db and proceed with testing
    testUtils.cleanModelsBeforeDone(["Key"], done);
  });

  describe("Method Save -", function () {
    it("should begin with no keys", function (done) {
      Key.find({}, function (err, keys) {
        keys.should.have.length(0);
        done();
      });
    });

    it("should be able to save without problems and generate fields on save", function (done) {
      key.save(function (err) {
        should.not.exist(err);
        should.exist(key.apiKey);
        should.exist(key.initialLoginToken);
        should.exist(key.deactivated);
        key.deactivated.should.be.eql(false);
        done();
      });
    });

    it("should produce error when trying to save without organizationFirebaseId", function (done) {
      // Clone and remove organizationFirebaseId
      keyNoOrganizationFirebaseId = new Key(_.clone(baseKey));
      keyNoOrganizationFirebaseId.organizationFirebaseId = "";
      keyNoOrganizationFirebaseId.save(function (err) {
        should.exist(err);
        should.exist(err.errors.organizationFirebaseId);
        err.errors.organizationFirebaseId.message.should.be.eql(
          "Field \"orgId\" is required."
        );
        done();
      });
    });

    it("should produce error when trying to save without userFirebaseId", function (done) {
      // Clone and remove userFirebaseId
      keyNoUserFirebaseId = new Key(_.clone(baseKey));
      keyNoUserFirebaseId.userFirebaseId = "";
      keyNoUserFirebaseId.save(function (err) {
        should.exist(err);
        should.exist(err.errors.userFirebaseId);
        err.errors.userFirebaseId.message.should.be.eql(
          "Field \"userId\" is required."
        );
        done();
      });
    });
  });

  after(function (done) {
    // Cleanup db after running tests
    testUtils.cleanModelsBeforeDone(["Key"], done);
  });
});
