"use strict";

var _ = require("lodash"),
  should = require("should"),
  request = require("supertest"),
  server = require("../../../server"),
  testUtils = require("../utils/test.utils");

/**
 * Globals
 */
var createCodeReq,
  invalidCode,
  invalidCodeReq,
  invalidCodeCharacters,
  invalidCodeLength,
  createdVerifyCode,
  sessionDetails,
  sessionSecret;

/**
 * Init functions
 */
var _init = function (callback) {
  testUtils.fullUserCreate(callback);
};

/**
 * Setup Account tests
 */
describe.skip("Account API Functional Tests:", function () {
  before(function (done) {
    // Run init for setup
    _init(function (err, sessionInfo) {
      if (err) {
        throw new Error("Issues with Account init setup.");
      }

      createCodeReq = {};
      invalidCodeReq = {};

      invalidCode = "E5y2w9um6bAqY082kN1yctKXxN4wAH";
      invalidCodeCharacters = "5!y2w9%m6bAq*082kN1yctKXxN4wAH";
      invalidCodeLength = "E5y2w9um6bAqY082kN1yctKXxN4wAHdfL";

      sessionDetails = sessionInfo;
      sessionSecret = sessionInfo.secret;

      // Clean db and proceed with testing
      testUtils.cleanModelsBeforeDone(["Code"], done);
    });
  });

  /**
   * General Account API Tests
   */
  describe("General - ", function () {
    it("should send back key authentication error with api error code level \"400\" for POST", function (done) {
      request(server)
        .post("/account/verify")
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
   * Create Account API Tests
   */
  describe("Create - ", function () {
    describe("Verify Email Code - ", function () {
      it("should create a verify code via hmac authentication", function (done) {
        var toDigest = testUtils.genereateDigest(
          "post",
          "/account/verify",
          sessionSecret
        );
        testUtils.generateHmacDigest(toDigest.string, toDigest.secret, function (
          digest
        ) {
          request(server)
            .post("/account/verify")
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
            .send(createCodeReq)
            .expect(200)
            .expect(function (res) {
              res.body.status.should.be.eql("Success");
              res.body.message.should.not.be.empty;
              // Grab the code sent back - code is returned in ENV "test" or "development"
              createdVerifyCode = res.body.message.substring(
                res.body.message.indexOf(": ") + 2
              );
            })
            .end(function (err, data) {
              testUtils.end(err, data, done);
            });
        });
      });
    });
  });

  /**
   * Get Account API Tests
   */
  describe("Get - ", function () {
    describe("Verify Email Code - ", function () {
      it("should fail with invalid verify code with special characters", function (done) {
        var toDigest = testUtils.genereateDigest(
          "get",
          "/account/verify/" + invalidCodeCharacters,
          sessionSecret
        );
        testUtils.generateHmacDigest(toDigest.string, toDigest.secret, function (
          digest
        ) {
          request(server)
            .get("/account/verify/" + invalidCodeCharacters)
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
            .send(createCodeReq)
            .expect(500)
            .expect(function (res) {})
            .end(function (err, data) {
              testUtils.end(err, data, done);
            });
        });
      });

      it("should fail with invalid verify code which exceeds the max length", function (done) {
        var toDigest = testUtils.genereateDigest(
          "get",
          "/account/verify/" + invalidCodeLength,
          sessionSecret
        );
        testUtils.generateHmacDigest(toDigest.string, toDigest.secret, function (
          digest
        ) {
          request(server)
            .get("/account/verify/" + invalidCodeLength)
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
            .send(createCodeReq)
            .expect(400)
            .expect(function (res) {
              res.body.status.should.be.eql("Error");
              res.body.message.should.be.eql("Invalid verify code request.");
            })
            .end(function (err, data) {
              testUtils.end(err, data, done);
            });
        });
      });

      it("should fail with verify code not found in the database", function (done) {
        var toDigest = testUtils.genereateDigest(
          "get",
          "/account/verify/" + invalidCode,
          sessionSecret
        );
        testUtils.generateHmacDigest(toDigest.string, toDigest.secret, function (
          digest
        ) {
          request(server)
            .get("/account/verify/" + invalidCode)
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
            .send(createCodeReq)
            .expect(400)
            .expect(function (res) {
              res.body.status.should.be.eql("Error");
              res.body.message.should.be.eql(
                "Invalid code or code has expired."
              );
            })
            .end(function (err, data) {
              testUtils.end(err, data, done);
            });
        });
      });

      it("should use a verify code via hmac authentication and update user account", function (done) {
        var toDigest = testUtils.genereateDigest(
          "get",
          "/account/verify/" + createdVerifyCode,
          sessionSecret
        );
        testUtils.generateHmacDigest(toDigest.string, toDigest.secret, function (
          digest
        ) {
          request(server)
            .get("/account/verify/" + createdVerifyCode)
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
              res.body.message.should.be.eql("User Account Verified");
            })
            .end(function (err, data) {
              testUtils.end(err, data, done);
            });
        });
      });

      it("should acknowledge an already verified user via hmac authentication", function (done) {
        var toDigest = testUtils.genereateDigest(
          "get",
          "/account/verify/" + createdVerifyCode,
          sessionSecret
        );
        testUtils.generateHmacDigest(toDigest.string, toDigest.secret, function (
          digest
        ) {
          request(server)
            .get("/account/verify/" + createdVerifyCode)
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
              res.body.message.should.be.eql("User Verified");
            })
            .end(function (err, data) {
              testUtils.end(err, data, done);
            });
        });
      });
    });
  });

  after(function (done) {
    // Cleanup db after running tests
    testUtils.cleanModelsBeforeDone(["User", "Session", "Code"], done);
  });
});
