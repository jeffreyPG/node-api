"use strict";

var _ = require("lodash"),
  should = require("should"),
  mongoose = require("mongoose"),
  Measure = mongoose.model("Measure"),
  testUtils = require("../utils/test.utils");

/**
 * Globals
 */
var baseMeasure, measure, dupeMeasure;
var measureNoOrganizationFirebaseId,
  measureNoUserFirebaseId,
  measureNoName,
  measureRemoveEmptyField;

/**
 * Measure Unit tests
 */
describe.skip("Measure Model Unit Tests:", function () {
  before(function (done) {
    baseMeasure = {
      organizationFirebaseId: "-KHdRY07WQa-Kq9ZTjad",
      userFirebaseId: "-KMbWCZkGo0O8WOQhknU",
      name: "test measure",
      measure: {
        name: "test measure name",
        comment: ""
      }
    };

    measure = new Measure(baseMeasure);
    dupeMeasure = new Measure(baseMeasure);

    // Clean db and proceed with testing
    testUtils.cleanModelsBeforeDone(["Measure"], done);
  });

  describe("Method Save -", function () {
    it("should begin with no measures", function (done) {
      Measure.find({}, function (err, measures) {
        measures.should.have.length(0);
        done();
      });
    });

    it("should be able to save without problems", function (done) {
      measure.save(done);
    });

    it("should produce error when trying to save without organizationFirebaseId", function (done) {
      // Clone and remove organizationFirebaseId
      measureNoOrganizationFirebaseId = new Measure(_.clone(baseMeasure));
      measureNoOrganizationFirebaseId.organizationFirebaseId = "";
      measureNoOrganizationFirebaseId.save(function (err) {
        should.exist(err);
        should.exist(err.errors.organizationFirebaseId);
        err.errors.organizationFirebaseId.message.should.be.eql(
          "Field \"organizationId\" is required."
        );
        done();
      });
    });

    it("should produce error when trying to save without userFirebaseId", function (done) {
      // Clone and remove userFirebaseId
      measureNoUserFirebaseId = new Measure(_.clone(baseMeasure));
      measureNoUserFirebaseId.userFirebaseId = "";
      measureNoUserFirebaseId.save(function (err) {
        should.exist(err);
        should.exist(err.errors.userFirebaseId);
        err.errors.userFirebaseId.message.should.be.eql(
          "Field \"userId\" is required."
        );
        done();
      });
    });

    it("should produce error when trying to save without name", function (done) {
      // Clone and remove name
      measureNoName = new Measure(_.clone(baseMeasure));
      measureNoName.name = "";
      measureNoName.save(function (err) {
        should.exist(err);
        should.exist(err.errors.name);
        err.errors.name.message.should.be.eql("Field \"name\" is required.");
        done();
      });
    });

    it("should save and remove empty fields from measure", function (done) {
      // Clone and change unique index fields
      measureRemoveEmptyField = _.clone(baseMeasure);
      measureRemoveEmptyField.organizationFirebaseId = "-KHdRY07WQa-Kq9ZTjab";
      measureRemoveEmptyField.userFirebaseId = "-KMbWCZkGo0O8WOQhknb";
      // Clone and ensure the empty field measure.comment is removed

      measureRemoveEmptyField = new Measure(measureRemoveEmptyField);
      measureRemoveEmptyField = new Measure(_.clone(baseMeasure));
      measureRemoveEmptyField.organizationFirebaseId = "-KHdRY07WQa-Kq9ZTjab";
      measureRemoveEmptyField.userFirebaseId = "-KMbWCZkGo0O8WOQhknb";

      measureRemoveEmptyField.save(function (err) {
        should.not.exist(err);
        should.exist(measureRemoveEmptyField.measure);
        should.exist(measureRemoveEmptyField.measure.name);
        should.not.exist(measureRemoveEmptyField.measure.comment);
        done();
      });
    });
  });

  after(function (done) {
    // Cleanup db after running tests
    testUtils.cleanModelsBeforeDone(["Measure"], done);
  });
});
