"use strict";

var _ = require("lodash"),
  should = require("should"),
  mongoose = require("mongoose"),
  testUtils = require("../utils/test.utils");

const Component = require("../../models/component.server.model");

/**
 * Globals
 */
var baseComponent, component, dupeComponent;
var componentNoOrganizationFirebaseId,
  componentNoUserFirebaseId,
  componentNoName,
  componentNoConfigType,
  componentNoConfigTypePlural,
  componentRemoveEmptyField;

/**
 * Component Unit tests
 */
describe("Component Model Unit Tests:", function () {
  before(function (done) {
    baseComponent = {
      organizationFirebaseId: "-KHdRY07WQa-Kq9ZTjad",
      userFirebaseId: "-KMbWCZkGo0O8WOQhknU",
      name: "test component",
      component: {
        name: "test lightfixture name",
        comment: "",
        conditionRating: "Excellent - Plan Preventative Maintenance"
      },
      config: {
        type: "lightfixture",
        typeplural: "lightfixtures"
      }
    };

    component = new Component(baseComponent);
    dupeComponent = new Component(baseComponent);

    // Clean db and proceed with testing
    testUtils.cleanModelsBeforeDone(["Component"], done);
  });

  describe("Method Save -", function () {
    it("should begin with no components", function (done) {
      Component.find({}, function (err, components) {
        components.should.have.length(0);
        done();
      });
    });

    it("should be able to save without problems", function (done) {
      component.save(done);
    });

    it("should produce error when trying to save without organizationFirebaseId", function (done) {
      // Clone and remove organizationFirebaseId
      componentNoOrganizationFirebaseId = new Component(_.clone(baseComponent));
      componentNoOrganizationFirebaseId.organizationFirebaseId = "";
      componentNoOrganizationFirebaseId.save(function (err) {
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
      componentNoUserFirebaseId = new Component(_.clone(baseComponent));
      componentNoUserFirebaseId.userFirebaseId = "";
      componentNoUserFirebaseId.save(function (err) {
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
      componentNoName = new Component(_.clone(baseComponent));
      componentNoName.name = "";
      componentNoName.save(function (err) {
        should.exist(err);
        should.exist(err.errors.name);
        err.errors.name.message.should.be.eql("Field \"name\" is required.");
        done();
      });
    });

    it("should produce error when trying to save without config.type", function (done) {
      // Clone and remove config.type
      componentNoConfigType = new Component(_.clone(baseComponent));
      componentNoConfigType.config.type = "";
      componentNoConfigType.save(function (err) {
        should.exist(err);
        should.exist(err.errors["config.type"]);
        err.errors["config.type"].message.should.be.eql(
          "Field \"config.type\" is required."
        );
        done();
      });
    });

    it("should produce error when trying to save without config.typeplural", function (done) {
      // Clone and remove config.typeplural
      componentNoConfigTypePlural = new Component(_.clone(baseComponent));
      componentNoConfigTypePlural.config.typeplural = "";
      componentNoConfigTypePlural.save(function (err) {
        should.exist(err);
        should.exist(err.errors["config.typeplural"]);
        err.errors["config.typeplural"].message.should.be.eql(
          "Field \"config.typeplural\" is required."
        );
        done();
      });
    });

    it("should produce error when trying to save component with duplicate data", function (done) {
      dupeComponent.save(function (err) {
        err = err.toJSON === "function" ? err.toJSON() : err;
        should.exist(err);
        should.exist(err.code);
        err.code.should.be.eql(11000);
        done();
      });
    });

    it("should save and remove empty fields from component", function (done) {
      // Clone and change unique index fields
      componentRemoveEmptyField = _.clone(baseComponent);
      componentRemoveEmptyField.organizationFirebaseId = "-KHdRY07WQa-Kq9ZTjab";
      componentRemoveEmptyField.userFirebaseId = "-KMbWCZkGo0O8WOQhknb";
      // Clone and ensure the empty field component.comment is removed

      componentRemoveEmptyField = new Component(componentRemoveEmptyField);

      componentRemoveEmptyField = new Component(_.clone(baseComponent));
      componentRemoveEmptyField.organizationFirebaseId = "-KHdRY07WQa-Kq9ZTjab";
      componentRemoveEmptyField.userFirebaseId = "-KMbWCZkGo0O8WOQhknb";

      componentRemoveEmptyField.save(function (err) {
        should.not.exist(err);
        should.exist(componentRemoveEmptyField.component);
        should.exist(componentRemoveEmptyField.component.name);
        should.not.exist(componentRemoveEmptyField.component.comment);
        done();
      });
    });
  });

  after(function (done) {
    // Cleanup db after running tests
    testUtils.cleanModelsBeforeDone(["Component"], done);
  });
});
