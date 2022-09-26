"use strict";

var _ = require("lodash"),
  should = require("should"),
  request = require("supertest"),
  server = require("../../../server"),
  testUtils = require("../utils/test.utils");

/**
 * Globals
 */
var keyGenerationData,
  testFilePath,
  csvMeasureFilePath,
  csvComponentFilePath,
  csvMixedItemTypesFilePath,
  csvMixedItemTypesInvalidFormatsFilePath,
  csvMixedItemTypesInvalidDuplicatesFilePath,
  apiKey;

/**
 * Init functions
 */
var _init = function (callback) {
  // Create firebase keys resembling "-DFDsdsfcxvfg3sdF2"
  // Set the query string params
  keyGenerationData = {
    organizationId: "-" + testUtils.generateRandomString(15),
    userId: "-" + testUtils.generateRandomString(15)
  };
  // Set the id to make the key request
  keyGenerationData.request = {
    orgId: keyGenerationData.organizationId,
    userId: keyGenerationData.userId,
    username: "testlibrarycsvkeygenerate"
  };
  // Set the path to the test files directory
  testFilePath = testUtils.getTestFilePath();
  testUtils.libraryKeyCreate(keyGenerationData, callback);
};

/**
 * Setup Library CSV Upload tests
 */
describe.skip("Library API CSV Upload Functional Tests:", function () {
  before(function (done) {
    // Clean Key collection before running tests
    testUtils.cleanModelsBeforeDone(["Key"], function () {
      // Run init for setup
      _init(function (err, apiKeyGenerated) {
        if (err) {
          throw new Error("Issues with Library CSV init setup.");
        }

        apiKey = apiKeyGenerated;

        csvMeasureFilePath = testFilePath + "/test_csv_measures.csv";
        csvComponentFilePath = testFilePath + "/test_csv_components.csv";
        csvMixedItemTypesFilePath =
          testFilePath + "/test_csv_all_item_types.csv";
        csvMixedItemTypesInvalidFormatsFilePath =
          testFilePath + "/test_csv_all_item_types_invalid_formats.csv";
        csvMixedItemTypesInvalidDuplicatesFilePath =
          testFilePath + "/test_csv_all_item_types_invalid_duplicates.csv";

        // Clean db and proceed with testing
        testUtils.cleanModelsBeforeDone(
          ["User", "Session", "Component", "Measure"],
          done
        );
      });
    });
  });

  /**
   * General Library CSV Upload tests
   */
  describe("General - ", function () {
    describe("Key-Auth Check : ", function () {
      it("should send back key authentication error with api error code level \"400\" for POST", function (done) {
        request(server)
          .post("/library/csv/upload")
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
  });

  /**
   * Create Library API CSV Tests
   */
  describe("Create - ", function () {
    describe("Measures : ", function () {
      it("should create measures via batch upload csv file", function (done) {
        request(server)
          .post("/library/csv/upload")
          .set("xkey", apiKey)
          .send({})
          .attach("file", csvMeasureFilePath)
          .expect(200)
          .expect(function (res) {
            res.body.status.should.be.eql("Success");
            should.exist(res.body.errors);
            res.body.errors.should.be.empty;
            should.exist(res.body.components);
            res.body.components.should.be.empty;
            should.exist(res.body.measures);
            res.body.measures.should.not.be.empty;
            res.body.measures.should.be.Array;
            res.body.measures.length.should.be.eql(5);
            // Check first element in array and ensure it sends back expected results
            res.body.measures[0].lineNumber.should.be.eql(1);
            res.body.measures[0].item.should.be.eql("measure");
            res.body.measures[0].type.should.be.eql("measure");
            res.body.measures[0]._id.should.not.be.empty;
            res.body.measures[0].created.should.not.be.empty;
            res.body.measures[0].name.should.be.eql(
              "test csv measure upload 1"
            );
          })
          .end(function (err, data) {
            testUtils.end(err, data, done);
          });
      });
    });

    describe("Components : ", function () {
      it("should create components via batch upload csv file", function (done) {
        request(server)
          .post("/library/csv/upload")
          .set("xkey", apiKey)
          .send({})
          .attach("file", csvComponentFilePath)
          .expect(200)
          .expect(function (res) {
            res.body.status.should.be.eql("Success");
            should.exist(res.body.errors);
            res.body.errors.should.be.empty;
            should.exist(res.body.measures);
            res.body.measures.should.be.empty;
            should.exist(res.body.components);
            res.body.components.should.not.be.empty;
            res.body.components.should.be.Array;
            res.body.components.length.should.be.eql(5);
            // Check first element in array and ensure it sends back expected results
            res.body.components[0].lineNumber.should.be.eql(1);
            res.body.components[0].item.should.be.eql("component");
            res.body.components[0].type.should.be.eql("door");
            res.body.components[0]._id.should.not.be.empty;
            res.body.components[0].created.should.not.be.empty;
            res.body.components[0].name.should.be.eql(
              "test csv component upload 1"
            );
          })
          .end(function (err, data) {
            testUtils.end(err, data, done);
          });
      });
    });

    describe("Mixed Items Types : ", function () {
      it("should create all/mixed items types via batch upload csv file", function (done) {
        request(server)
          .post("/library/csv/upload")
          .set("xkey", apiKey)
          .send({})
          .attach("file", csvMixedItemTypesFilePath)
          .expect(200)
          .expect(function (res) {
            res.body.status.should.be.eql("Success");
            should.exist(res.body.errors);
            res.body.errors.should.be.empty;
            should.exist(res.body.measures);
            should.exist(res.body.components);
            res.body.measures.should.be.empty;
            res.body.components.should.not.be.empty;
            res.body.measures.should.be.Array;
            res.body.components.should.be.Array;
            res.body.measures.length.should.be.eql(5);
            res.body.components.length.should.be.eql(5);
            // Check first element each in each item array and ensure it sends back expected results
            // Measures
            res.body.measures[0].lineNumber.should.be.eql(1);
            res.body.measures[0].item.should.be.eql("measure");
            res.body.measures[0].type.should.be.eql("measure");
            res.body.measures[0]._id.should.not.be.empty;
            res.body.measures[0].created.should.not.be.empty;
            res.body.measures[0].name.should.be.eql(
              "test csv measure upload 1-2"
            );
            // Components
            res.body.components[0].lineNumber.should.be.eql(2);
            res.body.components[0].item.should.be.eql("component");
            res.body.components[0].type.should.be.eql("door");
            res.body.components[0]._id.should.not.be.empty;
            res.body.components[0].created.should.not.be.empty;
            res.body.components[0].name.should.be.eql(
              "test csv component upload 1-2"
            );
          })
          .end(function (err, data) {
            testUtils.end(err, data, done);
          });
      });
    });

    describe("Mixed Items Types with Invalid Formats : ", function () {
      it("should create and validate mixed items types via batch upload csv file", function (done) {
        request(server)
          .post("/library/csv/upload")
          .set("xkey", apiKey)
          .send({})
          .attach("file", csvMixedItemTypesInvalidFormatsFilePath)
          .expect(200)
          .expect(function (res) {
            res.body.status.should.be.eql("Success");
            should.exist(res.body.errors);
            res.body.errors.should.not.be.empty;
            should.exist(res.body.measures);
            should.exist(res.body.components);
            res.body.measures.should.not.be.empty;
            res.body.components.should.not.be.empty;
            res.body.measures.should.be.Array;
            res.body.components.should.be.Array;
            // Check for appropriate validation and success responses
            // Measures - Success
            res.body.measures.length.should.be.eql(3);
            res.body.measures[0].lineNumber.should.be.eql(1);
            res.body.measures[0].item.should.be.eql("measure");
            res.body.measures[0].type.should.be.eql("measure");
            res.body.measures[0]._id.should.not.be.empty;
            res.body.measures[0].created.should.not.be.empty;
            res.body.measures[0].name.should.be.eql(
              "test csv measure upload 1-with-invalid-formats"
            );
            // Components - Success
            res.body.components.length.should.be.eql(1);
            res.body.components[0].lineNumber.should.be.eql(5);
            res.body.components[0].item.should.be.eql("component");
            res.body.components[0].type.should.be.eql("door");
            res.body.components[0]._id.should.not.be.empty;
            res.body.components[0].created.should.not.be.empty;
            res.body.components[0].name.should.be.eql(
              "test csv component upload 2-with-invalid-formats"
            );
            // Check Returned Errors
            res.body.errors.length.should.be.eql(7);
            // Empty line items
            res.body.errors[0].lineNumber.should.be.eql(2);
            res.body.errors[0].valMissingFields.should.be.eql(true);
            res.body.errors[5].lineNumber.should.be.eql(9);
            res.body.errors[5].valMissingFields.should.be.eql(true);
            res.body.errors[6].lineNumber.should.be.eql(11);
            res.body.errors[6].valMissingFields.should.be.eql(true);
            // Invalid Item (first field)
            res.body.errors[1].lineNumber.should.be.eql(3);
            res.body.errors[1].valItemCheck.should.be.eql(false);
            res.body.errors[1].valTypeCheck.should.be.eql(false);
            // Invalid Type (second field)
            res.body.errors[2].lineNumber.should.be.eql(4);
            res.body.errors[2].valItemCheck.should.be.eql(true);
            res.body.errors[2].valTypeCheck.should.be.eql(false);
            // Per the type (door for this line item), invalid amount of fields passed
            res.body.errors[3].lineNumber.should.be.eql(6);
            res.body.errors[3].valItemCheck.should.be.eql(true);
            res.body.errors[3].valTypeCheck.should.be.eql(true);
            res.body.errors[3].valCountCheck.should.be.eql(false);
            // Hit max characters - fields for DOOR MANUFACTURER(7) and DOOR GLAZING TYPE(11)
            res.body.errors[4].lineNumber.should.be.eql(8);
            res.body.errors[4].item.should.be.eql("component");
            res.body.errors[4].type.should.be.eql("door");
            res.body.errors[4].valItemCheck.should.be.eql(true);
            res.body.errors[4].valTypeCheck.should.be.eql(true);
            res.body.errors[4].valCountCheck.should.be.eql(true);
            res.body.errors[4].valInvalidFormat.should.be.eql(true);
            should.exist(res.body.errors[4].valErrors);
            res.body.errors[4].valErrors.should.be.Array;
            res.body.errors[4].valErrors.length.should.be.eql(2);
            res.body.errors[4].valErrors[0].element.should.be.eql(7); // Field number
            res.body.errors[4].valErrors[0].type.should.be.eql(
              "max_length_exceeded"
            ); // Error type
            res.body.errors[4].valErrors[0].max.should.be.a.Number; // Max char count
            res.body.errors[4].valErrors[0].message.should.startWith(
              "Element cannot exceed max length of"
            ); // The error message
            res.body.errors[4].valErrors[1].element.should.be.eql(11); // Field number
            res.body.errors[4].valErrors[1].type.should.be.eql(
              "max_length_exceeded"
            ); // Error type
          })
          .end(function (err, data) {
            testUtils.end(err, data, done);
          });
      });
    });

    describe("Mixed Items Types with Duplicates : ", function () {
      it("should fail to create all/mixed items types via batch upload csv file per database validation rules", function (done) {
        request(server)
          .post("/library/csv/upload")
          .set("xkey", apiKey)
          .send({})
          .attach("file", csvMixedItemTypesInvalidDuplicatesFilePath)
          .expect(200)
          .expect(function (res) {
            res.body.status.should.be.eql("Error");
            should.exist(res.body.errors);
            res.body.errors.should.not.be.empty;
            should.exist(res.body.measures);
            should.exist(res.body.components);
            res.body.measures.should.be.empty;
            res.body.components.should.be.empty;
            // Component - Check database validation errors
            res.body.errors[0].lineNumber.should.be.eql(1);
            res.body.errors[0].item.should.be.eql("component");
            res.body.errors[0].type.should.be.eql("door");
            res.body.errors[0].valItemCheck.should.be.eql(true);
            res.body.errors[0].valTypeCheck.should.be.eql(true);
            res.body.errors[0].valCountCheck.should.be.eql(true);
            should.exist(res.body.errors[0].error);
            res.body.errors[0].error.message.should.be.eql(
              "Name already exists."
            );
            // Measure - Check database validation errors
            res.body.errors[1].lineNumber.should.be.eql(2);
            res.body.errors[1].item.should.be.eql("measure");
            res.body.errors[1].type.should.be.eql("measure");
            res.body.errors[1].valItemCheck.should.be.eql(true);
            res.body.errors[1].valTypeCheck.should.be.eql(true);
            res.body.errors[1].valCountCheck.should.be.eql(true);
            should.exist(res.body.errors[1].error);
            res.body.errors[1].error.message.should.be.eql(
              "Name already exists."
            );
          })
          .end(function (err, data) {
            testUtils.end(err, data, done);
          });
      });
    });
  });

  after(function (done) {
    // Cleanup db after running tests
    testUtils.cleanModelsBeforeDone(
      ["User", "Session", "Key", "Component", "Measure"],
      done
    );
  });
});
