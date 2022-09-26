"use strict";

var _ = require("lodash"),
  should = require("should"),
  mongoose = require("mongoose"),
  testUtils = require("../utils/test.utils");
const { PublicMeasure } = require("../../models/public.measure.server.model");

/**
 * Globals
 */
var basePublicMeasure, publicMeasure, dupePublicMeasure;
var publicMeasureNoName,
  publicMeasureNoConfigType,
  publicMeasureNoConfigTypePlural,
  publicMeasureRemoveEmptyField;

/**
 * Public Measure Unit tests
 */
describe("Public Measure Model Unit Tests:", function () {
  before(function (done) {
    basePublicMeasure = {
      name: "test public measure",
      measure: {
        name: "test public measure name",
        comment: ""
      },
      config: {
        projectType: "lighting"
      }
    };

    publicMeasure = new PublicMeasure(basePublicMeasure);
    dupePublicMeasure = new PublicMeasure(basePublicMeasure);

    // Clean db and proceed with testing
    testUtils.cleanModelsBeforeDone(["PublicMeasure"], done);
  });

  describe("Method Save -", function () {
    it("should begin with no public measures", function (done) {
      PublicMeasure.find({}, function (err, publicMeasures) {
        publicMeasures.should.have.length(0);
        done();
      });
    });

    it("should be able to save without problems", function (done) {
      publicMeasure.save(done);
    });

    it("should produce error when trying to save without name", function (done) {
      // Clone and remove name
      publicMeasureNoName = new PublicMeasure(_.clone(basePublicMeasure));
      publicMeasureNoName.name = "";
      publicMeasureNoName.save(function (err) {
        should.exist(err);
        should.exist(err.errors.name);
        err.errors.name.message.should.be.eql("Field \"name\" is required.");
        done();
      });
    });

    it("should produce error when trying to save without config.projectType", function (done) {
      // Clone and remove config.projectType
      publicMeasureNoConfigType = new PublicMeasure(_.clone(basePublicMeasure));
      publicMeasureNoConfigType.config.projectType = "";
      publicMeasureNoConfigType.save(function (err) {
        should.exist(err);
        should.exist(err.errors["config.projectType"]);
        err.errors["config.projectType"].message.should.be.eql(
          "Field \"config.projectType\" is required."
        );
        done();
      });
    });

    it("should produce error when trying to save measure with the same name (dupe)", function (done) {
      dupePublicMeasure.save(function (err) {
        err = err.toJSON === "function" ? err.toJSON() : err;
        should.exist(err);
        should.exist(err.code);
        err.code.should.be.eql(11000);
        done();
      });
    });

    it("should save and remove empty fields from measure", function (done) {
      // Clone and ensure the empty field measure.comment is removed
      publicMeasureRemoveEmptyField = new PublicMeasure(
        _.clone(basePublicMeasure)
      );
      publicMeasureRemoveEmptyField.name = "test public measure updated";
      publicMeasureRemoveEmptyField.save(function (err) {
        should.not.exist(err);
        should.exist(publicMeasureRemoveEmptyField.measure);
        should.exist(publicMeasureRemoveEmptyField.measure.name);
        should.not.exist(publicMeasureRemoveEmptyField.measure.comment);
        done();
      });
    });
  });

  after(function (done) {
    // Cleanup db after running tests
    testUtils.cleanModelsBeforeDone(["PublicMeasure"], done);
  });
});
