"use strict";

var _ = require("lodash"),
  should = require("should"),
  mongoose = require("mongoose"),
  testUtils = require("../utils/test.utils");
const Session = require("../../models/session.server.model");

/**
 * Globals
 */
var sessionValid;

/**
 * Session Unit tests
 */
describe("Session Model Unit Tests:", function () {
  before(function (done) {
    sessionValid = new Session({
      secret: "testingsecret",
      username: testUtils.getMongoId(),
      expires: testUtils.getSessionExpiration()
    });

    // Clean db and proceed with testing
    testUtils.cleanModelsBeforeDone(["Session"], done);
  });

  describe("Method Save -", function () {
    it("should begin with no sessions", function (done) {
      Session.find({}, function (err, sessions) {
        sessions.should.have.length(0);
        done();
      });
    });

    it("should be able to save without problems", function (done) {
      sessionValid.save(done);
    });
  });

  after(function (done) {
    // Cleanup db after running tests
    testUtils.cleanModelsBeforeDone(["Session"], done);
  });
});
