"use strict";

var _ = require("lodash"),
  should = require("should"),
  mongoose = require("mongoose");

const testUtils = require("../utils/test.utils");

const { User } = require("../../models/user.server.model");

/**
 * Globals
 */
var baseUser, user, dupeUser;
var userNoEmail, userNoUsername;

/**
 * User Unit tests
 */
describe.skip("User Model Unit Tests:", function () {
  before(function (done) {
    baseUser = {
      name: "Test Tester",
      email: "test@test.com",
      username: "testuser",
      password: "12345678"
    };

    user = new User(baseUser);
    dupeUser = new User(baseUser);

    // Clean db and proceed with testing
    testUtils.cleanModelsBeforeDone(["User"], done);
  });

  describe("Method Save -", function () {
    it("should begin with no users", function (done) {
      User.find({}, function (err, users) {
        users.should.have.length(0);
        done();
      });
    });

    it("should be able to save without problems", function (done) {
      user.save(done);
    });

    it("should fail to save an existing user again", function (done) {
      user.save(function () {
        dupeUser.save(function (err) {
          should.exist(err);
          done();
        });
      });
    });

    it("should produce error when trying to save without email", function (done) {
      // Clone and remove email
      userNoEmail = new User(_.clone(baseUser));
      userNoEmail.email = "";
      // Update to a new username to not trigger duplicate error
      userNoEmail.username = "testnoemail";
      userNoEmail.save(function (err) {
        should.exist(err);
        should.exist(err.errors.email);
        err.errors.email.message.should.be.eql("Field \"email\" is required.");
        done();
      });
    });

    it("should produce error when trying to save without username", function (done) {
      // Clone and remove username
      userNoUsername = new User(_.clone(baseUser));
      userNoUsername.username = "";
      userNoUsername.save(function (err) {
        should.exist(err);
        should.exist(err.errors.username);
        err.errors.username.message.should.be.eql(
          "Field \"username\" must be at least 6 characters."
        );
        done();
      });
    });
  });

  after(function (done) {
    // Cleanup db after running tests
    testUtils.cleanModelsBeforeDone(["User"], done);
  });
});
