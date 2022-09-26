"use strict";

var _ = require("lodash"),
  should = require("should"),
  request = require("supertest"),
  server = require("../../../server"),
  testUtils = require("../utils/test.utils");

/**
 * Globals
 */
var csvUtilityElectricFilePath,
  csvUtilityElectricInvalidDataFilePath,
  csvUtilityGasFilePath,
  csvUtilityWaterFilePath,
  csvUtilityFuelFilePath,
  csvUtilityOtherFilePath,
  testFilePath,
  sessionDetails,
  sessionSecret;

var electricMongoId, gasMongoId, waterMongoId, fuelMongoId, otherMongoId;

/**
 * Init functions
 */
var _init = function (callback) {
  testUtils.fullUserCreate(callback);
};

/**
 * Setup Utility tests
 */
describe.skip("Utility API Functional Tests:", function () {
  before(function (done) {
    // Run init for setup
    _init(function (err, sessionInfo) {
      if (err) {
        throw new Error("Issues with Utility init setup.");
      }

      sessionDetails = sessionInfo;
      sessionSecret = sessionInfo.secret;

      testFilePath = testUtils.getTestFilePath();

      csvUtilityElectricFilePath =
        testFilePath + "/test_csv_utility_electric.csv";
      csvUtilityGasFilePath = testFilePath + "/test_csv_utility_gas.csv";
      csvUtilityWaterFilePath = testFilePath + "/test_csv_utility_water.csv";
      csvUtilityFuelFilePath = testFilePath + "/test_csv_utility_fuel.csv";
      csvUtilityOtherFilePath = testFilePath + "/test_csv_utility_other.csv";

      csvUtilityElectricInvalidDataFilePath =
        testFilePath + "/test_csv_utility_electric_invalid_data.csv";

      electricMongoId = testUtils.getMongoId();
      gasMongoId = testUtils.getMongoId();
      waterMongoId = testUtils.getMongoId();
      fuelMongoId = testUtils.getMongoId();
      otherMongoId = testUtils.getMongoId();

      // Clean db and proceed with testing
      testUtils.cleanModelsBeforeDone(["Utility", "Meter"], done);
    });
  });

  /**
   * General Utility API Tests
   */
  describe("General - ", function () {
    it("should send back key authentication error with api error code level \"400\" for POST", function (done) {
      request(server)
        .post("/csv/utility/electric")
        .send({})
        // .expect(401)
        .expect(function (res) {
          // should.exist(res.body.code);
          // Ensure an error code between 400-500 was sent in response
          // var errCode = testUtils.parseErrorCode(res.body.code);
          // (errCode).should.be.above(400, 'incorrect api error code level was returned for key authentication failure for GET, should be above "400"');
          // (errCode).should.be.below(500, 'incorrect api error code level was returned for key authentication failure for GET, should be below "500"');
        })
        .end(function (err, data) {
          testUtils.end(err, data, done);
        });
    });
  });

  /**
   * Create Utility API Tests
   */
  describe("Create - ", function () {});

  /**
   * List Utility API Tests
   */
  describe("List - ", function () {});

  /**
   * CSV File Upload Utility API Tests
   */
  describe("CSV File Upload - ", function () {
    it("should fail to create utilities when invalid utilType is passed in request", function (done) {
      request(server)
        .post("/csv/utility/invalid")
        .send({})
        .attach("file", csvUtilityElectricFilePath)
        .expect(400)
        .expect(function (res) {
          res.body.status.should.be.eql("Error");
          res.body.message.should.not.be.empty;
          res.body.message.should.be.eql("Invalid utility type.");
        })
        .end(function (err, data) {
          testUtils.end(err, data, done);
        });
    });

    it("should fail to create utilities when no buildingId is passed in request", function (done) {
      request(server)
        .post("/csv/utility/electric")
        .send({})
        .attach("file", csvUtilityElectricFilePath)
        .expect(400)
        .expect(function (res) {
          res.body.status.should.be.eql("Error");
          res.body.message.should.not.be.empty;
          res.body.message.should.be.eql(
            "Field \"buildingId\" is required as a query string param."
          );
        })
        .end(function (err, data) {
          testUtils.end(err, data, done);
        });
    });

    it("should fail to create utilities when invalid buildingId is passed in request", function (done) {
      request(server)
        .post("/csv/utility/electric?buildingId=invalidId")
        .send({})
        .attach("file", csvUtilityElectricFilePath)
        .expect(400)
        .expect(function (res) {
          res.body.status.should.be.eql("Error");
          res.body.message.should.not.be.empty;
          res.body.message.should.be.eql("Field \"buildingId\" is invalid.");
        })
        .end(function (err, data) {
          testUtils.end(err, data, done);
        });
    });

    it("should fail to create utilities when there is missing data in csv file", function (done) {
      request(server)
        .post("/csv/utility/electric?buildingId=" + electricMongoId)
        .send({})
        .attach("file", csvUtilityElectricInvalidDataFilePath)
        .expect(400)
        .expect(function (res) {
          res.body.status.should.be.eql("Error");
          res.body.message.should.not.be.empty;
          res.body.message.should.be.eql("Invalid Data Found in CSV File");
          should.not.exist(res.body.utility);
          res.body.errors.should.not.be.empty;
          res.body.errors.should.be.Array;
          res.body.errors.length.should.be.eql(5);

          // Test missing fields
          res.body.errors[0].lineNumber.should.be.eql(1);
          res.body.errors[0].valMissingFields.should.be.eql(true);
          // Test invalid formatting - startDate
          res.body.errors[1].lineNumber.should.be.eql(3);
          res.body.errors[1].valInvalidFormat.should.be.eql(true);
          res.body.errors[1].valCountCheck.should.be.eql(true);
          res.body.errors[1].valErrors.should.not.be.empty;
          res.body.errors[1].valErrors[0].element.should.be.eql(0);
          res.body.errors[1].valErrors[0].type.should.be.eql("validation");
          res.body.errors[1].valErrors[0].name.should.be.eql("startDate");
          // Test invalid formatting - endDate
          res.body.errors[2].lineNumber.should.be.eql(5);
          res.body.errors[2].valInvalidFormat.should.be.eql(true);
          res.body.errors[2].valCountCheck.should.be.eql(true);
          res.body.errors[2].valErrors.should.not.be.empty;
          res.body.errors[2].valErrors[0].element.should.be.eql(1);
          res.body.errors[2].valErrors[0].type.should.be.eql("validation");
          res.body.errors[2].valErrors[0].name.should.be.eql("endDate");
          // Test invalid formatting - totalConsumption
          res.body.errors[3].lineNumber.should.be.eql(6);
          res.body.errors[3].valInvalidFormat.should.be.eql(true);
          res.body.errors[3].valCountCheck.should.be.eql(true);
          res.body.errors[3].valErrors.should.not.be.empty;
          res.body.errors[3].valErrors[0].element.should.be.eql(2);
          res.body.errors[3].valErrors[0].type.should.be.eql("validation");
          res.body.errors[3].valErrors[0].name.should.be.eql(
            "totalConsumption"
          );
          // Test invalid formatting - totalDemand
          res.body.errors[4].lineNumber.should.be.eql(7);
          res.body.errors[4].valInvalidFormat.should.be.eql(true);
          res.body.errors[4].valCountCheck.should.be.eql(true);
          res.body.errors[4].valErrors.should.not.be.empty;
          res.body.errors[4].valErrors[0].element.should.be.eql(3);
          res.body.errors[4].valErrors[0].type.should.be.eql("validation");
          res.body.errors[4].valErrors[0].name.should.be.eql("totalDemand");
        })
        .end(function (err, data) {
          testUtils.end(err, data, done);
        });
    });

    it("should create utilities with electric meter data via batch upload csv file", function (done) {
      request(server)
        .post("/csv/utility/electric?buildingId=" + electricMongoId)
        .send({})
        .attach("file", csvUtilityElectricFilePath)
        .expect(200)
        .expect(function (res) {
          res.body.status.should.be.eql("Success");
          res.body.utility.should.not.be.empty;
          should.exist(res.body.utility.utilType);
          res.body.utility.utilType.should.be.eql("electric");
          should.exist(res.body.utility.createdForBuildingId);
          res.body.utility.createdForBuildingId.should.be.eql(electricMongoId);
          should.exist(res.body.utility.meterData);
          res.body.utility.meterData.should.be.Array;
          res.body.utility.meterData.length.should.be.eql(7);
          // Check third element in array and ensure it sends back expected results
          res.body.utility.meterData[2]._id.should.not.be.empty;
          res.body.utility.meterData[2].created.should.not.be.empty;
          res.body.utility.meterData[2].startDate.should.be.eql(
            "2017-12-12T00:00:00.000Z"
          );
          res.body.utility.meterData[2].endDate.should.be.eql(
            "2018-12-12T00:00:00.000Z"
          );
          res.body.utility.meterData[2].totalConsumption.should.be.eql(
            202020.22
          );
          res.body.utility.meterData[2].totalDemand.should.be.eql(888.22);
        })
        .end(function (err, data) {
          testUtils.end(err, data, done);
        });
    });

    it("should create utilities with gas meter data via batch upload csv file", function (done) {
      request(server)
        .post("/csv/utility/gas?buildingId=" + gasMongoId)
        .send({})
        .attach("file", csvUtilityGasFilePath)
        .expect(200)
        .expect(function (res) {
          res.body.status.should.be.eql("Success");
          res.body.utility.should.not.be.empty;
          should.exist(res.body.utility.utilType);
          res.body.utility.utilType.should.be.eql("gas");
          should.exist(res.body.utility.createdForBuildingId);
          res.body.utility.createdForBuildingId.should.be.eql(gasMongoId);
          should.exist(res.body.utility.meterData);
          res.body.utility.meterData.should.be.Array;
          res.body.utility.meterData.length.should.be.eql(8);
          // Check last element in array and ensure it sends back expected results
          res.body.utility.meterData[7]._id.should.not.be.empty;
          res.body.utility.meterData[7].created.should.not.be.empty;
          res.body.utility.meterData[7].startDate.should.be.eql(
            "2017-08-08T00:00:00.000Z"
          );
          res.body.utility.meterData[7].endDate.should.be.eql(
            "2018-08-08T00:00:00.000Z"
          );
          res.body.utility.meterData[7].totalConsumption.should.be.eql(
            202020.22
          );
          should.not.exist(res.body.utility.meterData[7].totalDemand);
        })
        .end(function (err, data) {
          testUtils.end(err, data, done);
        });
    });

    it("should create utilities with water meter data via batch upload csv file", function (done) {
      request(server)
        .post("/csv/utility/water?buildingId=" + waterMongoId)
        .send({})
        .attach("file", csvUtilityWaterFilePath)
        .expect(200)
        .expect(function (res) {
          res.body.status.should.be.eql("Success");
          res.body.utility.should.not.be.empty;
          should.exist(res.body.utility.utilType);
          res.body.utility.utilType.should.be.eql("water");
          should.exist(res.body.utility.createdForBuildingId);
          res.body.utility.createdForBuildingId.should.be.eql(waterMongoId);
          should.exist(res.body.utility.meterData);
          res.body.utility.meterData.should.be.Array;
          res.body.utility.meterData.length.should.be.eql(9);
          // Check last element in array and ensure it sends back expected results
          res.body.utility.meterData[8]._id.should.not.be.empty;
          res.body.utility.meterData[8].created.should.not.be.empty;
          res.body.utility.meterData[8].startDate.should.be.eql(
            "2017-02-02T00:00:00.000Z"
          );
          res.body.utility.meterData[8].endDate.should.be.eql(
            "2018-03-12T00:00:00.000Z"
          );
          res.body.utility.meterData[8].totalConsumption.should.be.eql(
            202020.22
          );
          should.not.exist(res.body.utility.meterData[8].totalDemand);
        })
        .end(function (err, data) {
          testUtils.end(err, data, done);
        });
    });

    it("should create utilities with fuel meter data via batch upload csv file", function (done) {
      request(server)
        .post("/csv/utility/fuel?buildingId=" + fuelMongoId)
        .send({})
        .attach("file", csvUtilityFuelFilePath)
        .expect(200)
        .expect(function (res) {
          res.body.status.should.be.eql("Success");
          res.body.utility.should.not.be.empty;
          should.exist(res.body.utility.utilType);
          res.body.utility.utilType.should.be.eql("fuel");
          should.exist(res.body.utility.createdForBuildingId);
          res.body.utility.createdForBuildingId.should.be.eql(fuelMongoId);
          should.exist(res.body.utility.meterData);
          res.body.utility.meterData.should.be.Array;
          res.body.utility.meterData.length.should.be.eql(10);
          // Check last element in array and ensure it sends back expected results
          res.body.utility.meterData[9]._id.should.not.be.empty;
          res.body.utility.meterData[9].created.should.not.be.empty;
          res.body.utility.meterData[9].startDate.should.be.eql(
            "2017-09-11T00:00:00.000Z"
          );
          res.body.utility.meterData[9].endDate.should.be.eql(
            "2018-05-02T00:00:00.000Z"
          );
          res.body.utility.meterData[9].totalConsumption.should.be.eql(
            202020.22
          );
          should.not.exist(res.body.utility.meterData[9].totalDemand);
        })
        .end(function (err, data) {
          testUtils.end(err, data, done);
        });
    });

    it("should create utilities with other meter data via batch upload csv file", function (done) {
      request(server)
        .post("/csv/utility/other?buildingId=" + otherMongoId)
        .send({})
        .attach("file", csvUtilityOtherFilePath)
        .expect(200)
        .expect(function (res) {
          res.body.status.should.be.eql("Success");
          res.body.utility.should.not.be.empty;
          should.exist(res.body.utility.utilType);
          res.body.utility.utilType.should.be.eql("other");
          should.exist(res.body.utility.createdForBuildingId);
          res.body.utility.createdForBuildingId.should.be.eql(otherMongoId);
          should.exist(res.body.utility.meterData);
          res.body.utility.meterData.should.be.Array;
          res.body.utility.meterData.length.should.be.eql(11);
          // Check last element in array and ensure it sends back expected results
          res.body.utility.meterData[10]._id.should.not.be.empty;
          res.body.utility.meterData[10].created.should.not.be.empty;
          res.body.utility.meterData[10].startDate.should.be.eql(
            "2017-12-02T00:00:00.000Z"
          );
          res.body.utility.meterData[10].endDate.should.be.eql(
            "2018-01-02T00:00:00.000Z"
          );
          res.body.utility.meterData[10].totalConsumption.should.be.eql(
            202020.22
          );
          should.not.exist(res.body.utility.meterData[10].totalDemand);
        })
        .end(function (err, data) {
          testUtils.end(err, data, done);
        });
    });
  });

  after(function (done) {
    // Cleanup db after running tests
    testUtils.cleanModelsBeforeDone(
      ["User", "Session", "Utility", "Meter"],
      done
    );
  });
});
