"use strict";

var _ = require("lodash"),
  should = require("should"),
  mongoose = require("mongoose"),
  testUtils = require("../utils/test.utils");
const {
  PublicComponent
} = require("../../models/public.component.server.model");

/**
 * Globals
 */
var basePublicComponent, publicComponent, dupePublicComponent;
var publicComponentNoName,
  publicComponentNoConfigType,
  publicComponentNoConfigTypePlural,
  publicComponentRemoveEmptyField;

/**
 * Public Component Unit tests
 */
describe("Public Component Model Unit Tests:", function () {
  before(function (done) {
    basePublicComponent = {
      name: "test public component",
      component: {
        name: "test public lightfixture name",
        comment: ""
      },
      config: {
        type: "lightfixture",
        typeplural: "lightfixtures"
      }
    };

    publicComponent = new PublicComponent(basePublicComponent);
    dupePublicComponent = new PublicComponent(basePublicComponent);

    // Clean db and proceed with testing
    testUtils.cleanModelsBeforeDone(["PublicComponent"], done);
  });

  describe("Method Save -", function () {
    it("should begin with no public components", function (done) {
      PublicComponent.find({}, function (err, publicComponents) {
        publicComponents.should.have.length(0);
        done();
      });
    });

    it("should be able to save without problems", function (done) {
      publicComponent.save(done);
    });

    it("should produce error when trying to save without name", function (done) {
      // Clone and remove name
      publicComponentNoName = new PublicComponent(_.clone(basePublicComponent));
      publicComponentNoName.name = "";
      publicComponentNoName.save(function (err) {
        should.exist(err);
        should.exist(err.errors.name);
        err.errors.name.message.should.be.eql("Field \"name\" is required.");
        done();
      });
    });

    it("should produce error when trying to save without config.type", function (done) {
      // Clone and remove config.type
      publicComponentNoConfigType = new PublicComponent(
        _.clone(basePublicComponent)
      );
      publicComponentNoConfigType.config.type = "";
      publicComponentNoConfigType.save(function (err) {
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
      publicComponentNoConfigTypePlural = new PublicComponent(
        _.clone(basePublicComponent)
      );
      publicComponentNoConfigTypePlural.config.typeplural = "";
      publicComponentNoConfigTypePlural.save(function (err) {
        should.exist(err);
        should.exist(err.errors["config.typeplural"]);
        err.errors["config.typeplural"].message.should.be.eql(
          "Field \"config.typeplural\" is required."
        );
        done();
      });
    });

    it("should produce error when trying to save component with the same name (dupe)", function (done) {
      dupePublicComponent.save(function (err) {
        err = err.toJSON === "function" ? err.toJSON() : err;
        should.exist(err);
        should.exist(err.code);
        err.code.should.be.eql(11000);
        done();
      });
    });

    it("should save and remove empty fields from component", function (done) {
      // Clone and ensure the empty field component.comment is removed
      publicComponentRemoveEmptyField = new PublicComponent(
        _.clone(basePublicComponent)
      );
      publicComponentRemoveEmptyField.name = "test public component updated";
      publicComponentRemoveEmptyField.save(function (err) {
        should.not.exist(err);
        should.exist(publicComponentRemoveEmptyField.component);
        should.exist(publicComponentRemoveEmptyField.component.name);
        should.not.exist(publicComponentRemoveEmptyField.component.comment);
        done();
      });
    });
  });

  after(function (done) {
    // Cleanup db after running tests
    testUtils.cleanModelsBeforeDone(["PublicComponent"], done);
  });
});
