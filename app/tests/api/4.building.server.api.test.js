"use strict";

var _ = require("lodash"),
  should = require("should"),
  request = require("supertest"),
  server = require("../../../server"),
  testUtils = require("../utils/test.utils");

/**
 * Globals
 */
var buildingDataBase,
  createBuildingReq,
  invalidBuildingReq,
  createdBuildingInfo,
  createdBuildingInfoId,
  sessionDetails,
  sessionSecret;

/**
 * Init functions
 */
var _init = function (callback) {
  testUtils.fullUserCreate(callback);
};

/**
 * Setup Building tests
 */
describe.skip("Building API Functional Tests:", function () {
  before(function (done) {
    // Run init for setup
    _init(function (err, sessionInfo) {
      if (err) {
        throw new Error("Issues with Building init setup.");
      }

      buildingDataBase = {
        siteName: "Test Water Site",
        projectType: "Water",
        buildingType: "buildingType1",
        yearBuilt: "1976-2000",
        numberOfFloors: "6-10",
        occupancy: "6-10",
        floorArea: 42,
        location: {
          city: "Test City",
          state: "CO",
          zip: "80229",
          address: "123 Test Address"
        }
      };

      createBuildingReq = _.cloneDeep(buildingDataBase);

      invalidBuildingReq = {
        siteName:
          "Test Site Name Test Site Name Test Site Name Test Site Name Test Site Name",
        projectType: "invalidProjectType",
        buildingType: "invalidBuildingType",
        yearBuilt: "invalidYearBuilt",
        numberOfFloors: "invalidNumberOfFloors",
        occupancy: "invalidOccupancy",
        floorArea: "invalidFloorArea",
        location: {
          city:
            "Test City Test City Test City Test City Test City Test City Test City ",
          state: "invalidState",
          zip: "invalidZip",
          address: "%%invalidZip$$"
        }
      };

      sessionDetails = sessionInfo;
      sessionSecret = sessionInfo.secret;

      // Clean db and proceed with testing
      testUtils.cleanModelsBeforeDone(["Building"], done);
    });
  });

  /**
   * General Building API Tests
   */
  describe("General - ", function () {
    it("should send back key authentication error with api error code level \"400\" for GET", function (done) {
      request(server)
        .get("/building")
        .expect(401)
        .expect(function (res) {
          should.exist(res.body.code);
          // Ensure an error code between 400-500 was sent in response
          var errCode = testUtils.parseErrorCode(res.body.code);
          errCode.should.be.above(
            400,
            "incorrect api error code level was returned for key authentication failure for GET, should be above \"400\""
          );
          errCode.should.be.below(
            500,
            "incorrect api error code level was returned for key authentication failure for GET, should be below \"500\""
          );
        })
        .end(function (err, data) {
          testUtils.end(err, data, done);
        });
    });

    it("should send back key authentication error with api error code level \"400\" for POST", function (done) {
      request(server)
        .post("/building")
        .send({})
        .expect(401)
        .expect(function (res) {
          should.exist(res.body.code);
          // Ensure an error code between 400-500 was sent in response
          var errCode = testUtils.parseErrorCode(res.body.code);
          errCode.should.be.above(
            400,
            "incorrect api error code level was returned for key authentication failure for GET, should be above \"400\""
          );
          errCode.should.be.below(
            500,
            "incorrect api error code level was returned for key authentication failure for GET, should be below \"500\""
          );
        })
        .end(function (err, data) {
          testUtils.end(err, data, done);
        });
    });
  });

  /**
   * Create Building API Tests
   */
  describe("Create - ", function () {
    it("should fail to create a building with invalid data", function (done) {
      var toDigest = testUtils.genereateDigest(
        "post",
        "/building",
        sessionSecret
      );
      testUtils.generateHmacDigest(toDigest.string, toDigest.secret, function (
        digest
      ) {
        request(server)
          .post("/building")
          .set(
            "Authorization",
            "hmac " +
              sessionDetails.user._id +
              ":" +
              toDigest.nonce +
              ":" +
              digest
          )
          .set("Date", toDigest.date)
          .send(invalidBuildingReq)
          .expect(400)
          .expect(function (res) {
            res.body.status.should.be.eql("Error");
            res.body.errors.should.not.be.empty;
            res.body.message.should.not.be.empty;
          })
          .end(function (err, data) {
            testUtils.end(err, data, done);
          });
      });
    });

    it("should create a building via hmac authentication and return building info", function (done) {
      var toDigest = testUtils.genereateDigest(
        "post",
        "/building",
        sessionSecret
      );
      testUtils.generateHmacDigest(toDigest.string, toDigest.secret, function (
        digest
      ) {
        request(server)
          .post("/building")
          .set(
            "Authorization",
            "hmac " +
              sessionDetails.user._id +
              ":" +
              toDigest.nonce +
              ":" +
              digest
          )
          .set("Date", toDigest.date)
          .send(createBuildingReq)
          .expect(200)
          .expect(function (res) {
            res.body.status.should.be.eql("Success");
            res.body.building.should.not.be.empty;
            res.body.building.location.should.be.eql(
              createBuildingReq.location
            );
            res.body.building.siteName.should.be.eql(
              createBuildingReq.siteName
            );
            res.body.building.projectType.should.be.eql(
              createBuildingReq.projectType
            );
            res.body.building.buildingType.should.be.eql(
              createBuildingReq.buildingType
            );
            res.body.building.yearBuilt.should.be.eql(
              createBuildingReq.yearBuilt
            );
            res.body.building.numberOfFloors.should.be.eql(
              createBuildingReq.numberOfFloors
            );
            res.body.building.occupancy.should.be.eql(
              createBuildingReq.occupancy
            );
            res.body.building.floorArea.should.be.eql(
              createBuildingReq.floorArea
            );

            createdBuildingInfo = res.body.building;
            createdBuildingInfoId = String(res.body.building._id);
          })
          .end(function (err, data) {
            testUtils.end(err, data, done);
          });
      });
    });
  });

  /**
   * List Building API Tests
   */
  describe("List - ", function () {
    it("should list current user building data via hmac authentication", function (done) {
      var toDigest = testUtils.genereateDigest(
        "get",
        "/building",
        sessionSecret
      );
      testUtils.generateHmacDigest(toDigest.string, toDigest.secret, function (
        digest
      ) {
        request(server)
          .get("/building")
          .set(
            "Authorization",
            "hmac " +
              sessionDetails.user._id +
              ":" +
              toDigest.nonce +
              ":" +
              digest
          )
          .set("Date", toDigest.date)
          .expect(200)
          .expect(function (res) {
            res.body.status.should.be.eql("Success");
            res.body.buildings.should.not.be.empty;
            res.body.buildings.length.should.be.eql(1);
            res.body.buildings[0]._id.should.be.eql(createdBuildingInfoId);
          })
          .end(function (err, data) {
            testUtils.end(err, data, done);
          });
      });
    });

    it("should list building public measures via hmac authentication", function (done) {
      var toDigest = testUtils.genereateDigest(
        "get",
        "/measure",
        sessionSecret
      );
      testUtils.generateHmacDigest(toDigest.string, toDigest.secret, function (
        digest
      ) {
        request(server)
          .get("/measure")
          .set(
            "Authorization",
            "hmac " +
              sessionDetails.user._id +
              ":" +
              toDigest.nonce +
              ":" +
              digest
          )
          .set("Date", toDigest.date)
          .expect(200)
          .expect(function (res) {
            res.body.status.should.be.eql("Success");
            res.body.measures.should.not.be.empty;
            res.body.measures.Building.should.not.be.empty;
            res.body.measures.Building.should.be.Array;
            res.body.measures.Building[0].name.should.not.be.empty;
            res.body.measures.Building[0].description.should.not.be.empty;
            res.body.measures.Building[0].yearsPayback.should.not.be.empty;
            res.body.measures.Building[0].costSavings.should.not.be.empty;
            res.body.measures.Building[0].hasIncentives.should.not.be.empty;
          })
          .end(function (err, data) {
            testUtils.end(err, data, done);
          });
      });
    });

    it("should list building public measures with filter by project type via hmac authentication", function (done) {
      var toDigest = testUtils.genereateDigest(
        "get",
        "/measure",
        sessionSecret
      );
      testUtils.generateHmacDigest(toDigest.string, toDigest.secret, function (
        digest
      ) {
        request(server)
          .get("/measure?projectType=Water")
          .set(
            "Authorization",
            "hmac " +
              sessionDetails.user._id +
              ":" +
              toDigest.nonce +
              ":" +
              digest
          )
          .set("Date", toDigest.date)
          .expect(200)
          .expect(function (res) {
            res.body.status.should.be.eql("Success");
            res.body.measures.should.not.be.empty;
            res.body.measures.Building.should.not.be.empty;
            res.body.measures.Building.should.be.Array;
            res.body.measures.Water.should.not.be.empty;
            res.body.measures.Water.should.be.Array;
            res.body.measures.Water[0].name.should.not.be.empty;
            res.body.measures.Water[0].description.should.not.be.empty;
            res.body.measures.Water[0].yearsPayback.should.not.be.empty;
            res.body.measures.Water[0].costSavings.should.not.be.empty;
            res.body.measures.Water[0].hasIncentives.should.not.be.empty;
          })
          .end(function (err, data) {
            testUtils.end(err, data, done);
          });
      });
    });
  });

  after(function (done) {
    // Cleanup db after running tests
    testUtils.cleanModelsBeforeDone(["User", "Session", "Building"], done);
  });
});
