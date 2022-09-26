"use strict";

const _ = require("lodash");
const should = require("should");
const mongoose = require("mongoose");

const testUtils = require("../utils/test.utils");
const { Building } = require("../../models/building.server.model");
const { Analysis } = require("../../models/analysis.server.model");
const { ProjectSimulation } = require("../../models/projectSimulation");
const { Utility } = require("../../models/utility.server.model");

/**
 * Globals
 */
var baseBuilding, building, dupeBuilding;
var buildingNoCreatedByUserId,
  buildingNoFloorArea,
  buildingNoLocation,
  buildingNoLocationCity,
  buildingNoLocationState,
  buildingNoLocationZip,
  buildingNoLocationAddress;

/**
 * Building Unit tests
 */
describe("Building Model Unit Tests:", function () {
  before(function (done) {
    baseBuilding = {
      buildingName: "test-lighting-site",
      siteName: "Test Lighting Site",
      description: "Test Lighting Site Description",
      description: "Test Lighting Site Description",
      projectType: "Lighting",
      buildingType: "buildingType1",
      yearBuilt: "1976-2000",
      numberOfFloors: "6-10",
      occupancy: "6-10",
      location: {
        city: "Test City",
        state: "CO",
        zip: "80229",
        address: "123 Test Address"
      },
      createdByUserId: testUtils.getMongoId()
    };

    building = new Building(baseBuilding);
    dupeBuilding = new Building(baseBuilding);

    // Clean db and proceed with testing
    testUtils.cleanModelsBeforeDone(["Building"], done);
  });

  describe("Method Save -", function () {
    it("should begin with no buildings", function (done) {
      Building.find({}, function (err, buildings) {
        buildings.should.have.length(0);
        done();
      });
    });

    it("should be able to save without problems", function (done) {
      building.save(done);
    });

    it("should produce error when trying to save without createdByUserId", function (done) {
      // Clone and remove createdByUserId
      buildingNoCreatedByUserId = new Building(_.clone(baseBuilding));
      buildingNoCreatedByUserId.createdByUserId = undefined;
      buildingNoCreatedByUserId.save(function (err, test) {
        should.exist(err);
        should.exist(err.errors.createdByUserId);
        err.errors.createdByUserId.message.should.be.eql(
          "Field \"createdByUserId\" is required."
        );
        done();
      });
    });
  });

  after(function (done) {
    // Cleanup db after running tests
    testUtils.cleanModelsBeforeDone(["Building"], done);
  });
});
