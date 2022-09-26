"use strict";

var _ = require("lodash"),
  should = require("should"),
  mongoose = require("mongoose");

const { Code } = require("../../models/code.server.model");
const testUtils = require("../utils/test.utils");

/**
 * Globals
 */
var baseCode, code, dupeCode;
var codeNoUserId;

/**
 * Code Unit tests
 */
describe.skip("Code Model Unit Tests:", function () {
  before(function (done) {
    baseCode = {
      userId: "599efa259b9acd0039067c4f"
    };

    code = new Code(baseCode);
    dupeCode = new Code(baseCode);

    // Clean db and proceed with testing
    testUtils.cleanModelsBeforeDone(["Code"], done);
  });

  describe("Method Save -", function () {
    it("should begin with no codes", function (done) {
      Code.find({}, function (err, codes) {
        codes.should.have.length(0);
        done();
      });
    });

    it("should be able to save without problems", function (done) {
      code.save(function (err) {
        should.not.exist(err);
        should.exist(code.code);
        should.exist(code.userId);
        done();
      });
    });

    it("should produce error when trying to save without userId", function (done) {
      // Clone and remove userId
      codeNoUserId = new Code(_.clone(baseCode));
      codeNoUserId.userId = undefined;
      codeNoUserId.save(function (err) {
        should.exist(err);
        should.exist(err.errors.userId);
        err.errors.userId.message.should.be.eql("Field \"userId\" is required.");
        done();
      });
    });
  });

  after(function (done) {
    // Cleanup db after running tests
    testUtils.cleanModelsBeforeDone(["Code"], done);
  });
});
