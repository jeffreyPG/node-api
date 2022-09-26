"use strict";

var should = require("should"),
  request = require("supertest"),
  server = require("../../../server"),
  testUtils = require("../utils/test.utils");

/**
 * Globals
 */
var createUserReq,
  createUserWithKeyReq,
  updatePasswordReq,
  updatePasswordNoCurrentReq,
  invalidUpdatePasswordReq,
  invalidCreateUserEmailReq,
  invalidCreateUserPasswordReq,
  invalidDuplicateUsernameReq,
  createdUserAccountWithKey,
  createdUserAccount,
  passwordResetCode,
  sessionSecret,
  currentSession;

/**
 * Setup User tests
 */
describe.skip("User API Functional Tests:", function() {
  before(function(done) {
    invalidCreateUserEmailReq = {
      name: "Test Tester",
      email: "invalid!email.com",
      username: "invalidEmail",
      password: "12345678"
    };
    invalidCreateUserPasswordReq = {
      name: "Test Tester",
      email: "test@invalidpassword.com",
      username: "invalidPassword",
      password: "123"
    };
    invalidDuplicateUsernameReq = {
      name: "Test Tester",
      email: "test@test.com",
      username: "testuser",
      password: "12345678"
    };
    createUserReq = {
      name: "Test Tester",
      email: "test@test.com",
      username: "testuser",
      password: "12345678"
    };
    createUserWithKeyReq = {
      name: "Test Tester",
      email: "testwithkey@test.com",
      orgId: "-KHdRY07WQa-Kq9ZTjad",
      userId: "-KMbWCZkGo0O8WOQhknU",
      username: "testuserwithkey",
      password: "12345678"
    };
    updatePasswordNoCurrentReq = {
      password: "12345678!"
    };
    updatePasswordReq = {
      password: "!87654321!",
      currentPassword: "12345678!"
    };
    invalidUpdatePasswordReq = {
      password: "!!87654321!!",
      currentPassword: "invalidPassword"
    };

    // Clean db and proceed with testing
    testUtils.cleanModelsBeforeDone(["User", "Session", "Key"], done);
  });

  /**
   * General User API Tests
   */
  describe("General - ", function() {
    it('should send back hmac authentication error with api error code level "400" for GET', function(done) {
      request(server)
        .get("/user")
        .expect(401)
        .expect(function(res) {
          should.exist(res.body.code);
          // Ensure an error code between 400-500 was sent in response
          var errCode = testUtils.parseErrorCode(res.body.code);
          errCode.should.be.above(
            400,
            'incorrect api error code level was returned for hmac authentication failure for GET, should be above "400"'
          );
          errCode.should.be.below(
            500,
            'incorrect api error code level was returned for hmac authentication failure for GET, should be below "500"'
          );
        })
        .end(function(err, data) {
          testUtils.end(err, data, done);
        });
    });

    it('should send back hmac authentication error with api error code level "400" for PUT', function(done) {
      request(server)
        .put("/user/password/tester@test.com")
        .expect(401)
        .expect(function(res) {
          should.exist(res.body.code);
          // Ensure an error code between 400-500 was sent in response
          var errCode = testUtils.parseErrorCode(res.body.code);
          errCode.should.be.above(
            400,
            'incorrect api error code level was returned for hmac authentication failure for GET, should be above "400"'
          );
          errCode.should.be.below(
            500,
            'incorrect api error code level was returned for hmac authentication failure for GET, should be below "500"'
          );
        })
        .end(function(err, data) {
          testUtils.end(err, data, done);
        });
    });
  });

  /**
   * Create User API Tests
   */
  describe("Create - ", function() {
    it("should fail to create user with an invalid format of email and return validation errors", function(done) {
      request(server)
        .post("/user")
        .send(invalidCreateUserEmailReq)
        .expect(400)
        .expect(function(res) {
          res.body.status.should.be.eql("Error");
          res.body.errors.should.not.be.empty;
          res.body.message.should.not.be.empty;
          // Ensure the expected validation error message was returned
          if (!res.body.message.match(/email/gi)) {
            throw new Error(
              "unexpected validation message returned for invalid email format in request"
            );
          }
        })
        .end(function(err, data) {
          testUtils.end(err, data, done);
        });
    });

    it("should fail to create user with too short of a password (must be > 6 characters in length)", function(done) {
      request(server)
        .post("/user")
        .send(invalidCreateUserPasswordReq)
        .expect(400)
        .expect(function(res) {
          res.body.status.should.be.eql("Error");
          res.body.errors.should.not.be.empty;
          res.body.message.should.not.be.empty;
          // Ensure the expected validation error message was returned
          if (
            !res.body.message.match(
              /^(?=.*\bpassword\b)(?=.*\b6 characters\b).*$/m
            )
          ) {
            throw new Error(
              "unexpected validation message returned for invalid password length in request"
            );
          }
        })
        .end(function(err, data) {
          testUtils.end(err, data, done);
        });
    });

    it("should create new user and return user profile info", function(done) {
      request(server)
        .post("/user")
        .send(createUserReq)
        .expect(200)
        .expect(function(res) {
          res.body.status.should.be.eql("Success");
          res.body.user.should.not.be.empty;
          should.not.exist(res.body.user.password);
          should.not.exist(res.body.user.salt);
          res.body.user.email.should.be.eql(createUserReq.email);
          res.body.user._id.should.not.be.empty;

          createdUserAccount = res.body.user;
        })
        .end(function(err, data) {
          testUtils.end(err, data, done);
        });
    });

    it("should create new user and return user profile info (with a generated API Key)", function(done) {
      request(server)
        .post("/user")
        .send(createUserWithKeyReq)
        .expect(200)
        .expect(function(res) {
          res.body.status.should.be.eql("Success");
          res.body.user.should.not.be.empty;
          should.not.exist(res.body.user.password);
          should.not.exist(res.body.user.salt);
          res.body.user.email.should.be.eql(createUserWithKeyReq.email);
          res.body.user._id.should.not.be.empty;
          // Ensure Key info was generated and returned
          should.not.exist(res.body.user.apiKeyId);
          res.body.apiKey.should.not.be.empty;

          createdUserAccountWithKey = res.body.user;
        })
        .end(function(err, data) {
          testUtils.end(err, data, done);
        });
    });

    it("should fail to create with existing username", function(done) {
      request(server)
        .post("/user")
        .send(invalidDuplicateUsernameReq)
        .expect(400)
        .expect(function(res) {
          res.body.status.should.be.eql("Error");
          // Returned error message contains "username already exists"
          res.body.message.should.be.match(
            /already in use. Please try another./gi
          );
        })
        .end(function(err, data) {
          testUtils.end(err, data, done);
        });
    });
  });

  /**
   *  Token Related API Tests
   */
  describe("Token Secret (login) - ", function() {
    it("should create a new token secret via basic authentication and login the user", function(done) {
      request(server)
        .get("/auth/token")
        .auth(createUserReq.email, createUserReq.password)
        .expect(200)
        .expect(function(res) {
          res.body.status.should.be.eql("Success");
          res.body.secret.should.not.be.empty;
          res.body.expiry.should.not.be.empty;
          res.body.user.should.not.be.empty;
          should.not.exist(
            res.body.session,
            "session information should not be returned in non-development mode"
          );

          sessionSecret = res.body.secret;
        })
        .end(function(err, data) {
          testUtils.end(err, data, done);
        });
    });
  });

  /**
   * Get User API Tests
   */
  describe("Get - ", function() {
    it("should return the current user profile data", function(done) {
      var toDigest = testUtils.genereateDigest("get", "/user", sessionSecret);
      testUtils.generateHmacDigest(toDigest.string, toDigest.secret, function(
        digest
      ) {
        request(server)
          .get("/user")
          .set(
            "Authorization",
            "hmac " +
              createdUserAccount._id +
              ":" +
              toDigest.nonce +
              ":" +
              digest
          )
          .set("Date", toDigest.date)
          .expect(200)
          .expect(function(res) {
            res.body.status.should.be.eql("Success");
            res.body.user.should.not.be.empty;
            res.body.user.email.should.be.eql(createdUserAccount.email);
          })
          .end(function(err, data) {
            testUtils.end(err, data, done);
          });
      });
    });
  });

  /**
   * User Password API Tests
   */
  describe("Password - ", function() {
    describe("Forgot Password Reset - ", function() {
      it("should fail to generate a password reset code with invalid email address", function(done) {
        request(server)
          .get("/user/password/invalid!email.com")
          .expect(400)
          .expect(function(res) {
            res.body.status.should.be.eql("Error");
            res.body.message.should.not.be.empty;
            res.body.message.should.be.eql("Invalid email address.");
          })
          .end(function(err, data) {
            testUtils.end(err, data, done);
          });
      });

      it("should generate a password reset code for forgotten passwords", function(done) {
        request(server)
          .get("/user/password/" + createdUserAccount.email)
          .expect(200)
          .expect(function(res) {
            res.body.status.should.be.eql("Success");
            res.body.message.should.not.be.empty;

            passwordResetCode = res.body.message.substring(
              res.body.message.indexOf(":") + 2
            );
          })
          .end(function(err, data) {
            testUtils.end(err, data, done);
          });
      });

      it("should be able to login with password reset code and send back reset flag", function(done) {
        request(server)
          .get("/auth/token")
          .auth(createUserReq.email, passwordResetCode)
          .expect(200)
          .expect(function(res) {
            res.body.status.should.be.eql("Success");
            res.body.secret.should.not.be.empty;
            res.body.expiry.should.not.be.empty;
            res.body.user.should.not.be.empty;
            should.not.exist(
              res.body.session,
              "session information should not be returned in non-development mode"
            );
            // Ensure resetPassword flag is set
            res.body.user.resetPassword.should.not.be.empty;
            res.body.user.resetPassword.should.be.eql(true);

            sessionSecret = res.body.secret;
          })
          .end(function(err, data) {
            testUtils.end(err, data, done);
          });
      });

      it("should update user password via basic authentication (do not require current password)", function(done) {
        var toDigest = testUtils.genereateDigest(
          "put",
          "/user/password/" + createdUserAccount.email,
          sessionSecret
        );
        testUtils.generateHmacDigest(toDigest.string, toDigest.secret, function(
          digest
        ) {
          request(server)
            .put("/user/password/" + createdUserAccount.email)
            .set(
              "Authorization",
              "hmac " +
                createdUserAccount._id +
                ":" +
                toDigest.nonce +
                ":" +
                digest
            )
            .set("Date", toDigest.date)
            .send(updatePasswordNoCurrentReq)
            .expect(200)
            .expect(function(res) {
              res.body.status.should.be.eql("Success");
              res.body.message.should.not.be.empty;
            })
            .end(function(err, data) {
              testUtils.end(err, data, done);
            });
        });
      });
    });

    describe("Update Password - ", function() {
      it("should fail update user password with no password provided in request", function(done) {
        var toDigest = testUtils.genereateDigest(
          "put",
          "/user/password/" + createdUserAccount.email,
          sessionSecret
        );
        testUtils.generateHmacDigest(toDigest.string, toDigest.secret, function(
          digest
        ) {
          request(server)
            .put("/user/password/" + createdUserAccount.email)
            .set(
              "Authorization",
              "hmac " +
                createdUserAccount._id +
                ":" +
                toDigest.nonce +
                ":" +
                digest
            )
            .set("Date", toDigest.date)
            .send({})
            .expect(200)
            .expect(function(res) {
              res.body.status.should.be.eql("Failure");
              res.body.message.should.not.be.empty;
              res.body.message.should.be.eql("Missing new password");
            })
            .end(function(err, data) {
              testUtils.end(err, data, done);
            });
        });
      });

      it("should fail update user password with no current password provided in request", function(done) {
        var toDigest = testUtils.genereateDigest(
          "put",
          "/user/password/" + createdUserAccount.email,
          sessionSecret
        );
        testUtils.generateHmacDigest(toDigest.string, toDigest.secret, function(
          digest
        ) {
          request(server)
            .put("/user/password/" + createdUserAccount.email)
            .set(
              "Authorization",
              "hmac " +
                createdUserAccount._id +
                ":" +
                toDigest.nonce +
                ":" +
                digest
            )
            .set("Date", toDigest.date)
            .send(updatePasswordNoCurrentReq)
            .expect(400)
            .expect(function(res) {
              res.body.status.should.be.eql("Error");
              res.body.message.should.not.be.empty;
              res.body.message.should.be.eql("Current password is required.");
            })
            .end(function(err, data) {
              testUtils.end(err, data, done);
            });
        });
      });

      it("should fail update user password with invalid current password provided in request", function(done) {
        var toDigest = testUtils.genereateDigest(
          "put",
          "/user/password/" + createdUserAccount.email,
          sessionSecret
        );
        testUtils.generateHmacDigest(toDigest.string, toDigest.secret, function(
          digest
        ) {
          request(server)
            .put("/user/password/" + createdUserAccount.email)
            .set(
              "Authorization",
              "hmac " +
                createdUserAccount._id +
                ":" +
                toDigest.nonce +
                ":" +
                digest
            )
            .set("Date", toDigest.date)
            .send(invalidUpdatePasswordReq)
            .expect(400)
            .expect(function(res) {
              res.body.status.should.be.eql("Error");
              res.body.message.should.not.be.empty;
              res.body.message.should.be.eql("Current password is invalid.");
            })
            .end(function(err, data) {
              testUtils.end(err, data, done);
            });
        });
      });

      it("should update user password via basic authentication (require current password)", function(done) {
        var toDigest = testUtils.genereateDigest(
          "put",
          "/user/password/" + createdUserAccount.email,
          sessionSecret
        );
        testUtils.generateHmacDigest(toDigest.string, toDigest.secret, function(
          digest
        ) {
          request(server)
            .put("/user/password/" + createdUserAccount.email)
            .set(
              "Authorization",
              "hmac " +
                createdUserAccount._id +
                ":" +
                toDigest.nonce +
                ":" +
                digest
            )
            .set("Date", toDigest.date)
            .send(updatePasswordReq)
            .expect(200)
            .expect(function(res) {
              res.body.status.should.be.eql("Success");
              res.body.message.should.not.be.empty;
              res.body.user.should.not.be.empty;
            })
            .end(function(err, data) {
              testUtils.end(err, data, done);
            });
        });
      });
    });
  });

  /**
   *  Token Related API Tests (logout)
   */
  describe("Token Secret (logout) - ", function() {
    it("should terminate the session and logout the user", function(done) {
      var toDigest = testUtils.genereateDigest(
        "delete",
        "/auth/token",
        sessionSecret
      );
      testUtils.generateHmacDigest(toDigest.string, toDigest.secret, function(
        digest
      ) {
        request(server)
          .delete("/auth/token")
          .set(
            "Authorization",
            "hmac " +
              createdUserAccount._id +
              ":" +
              toDigest.nonce +
              ":" +
              digest
          )
          .set("Date", toDigest.date)
          .expect(200)
          .expect(function(res) {
            res.body.status.should.be.eql("Success");
          })
          .end(function(err, data) {
            testUtils.end(err, data, done);
          });
      });
    });
  });

  after(function(done) {
    // Cleanup db after running tests
    testUtils.cleanModelsBeforeDone(["User", "Session", "Key"], done);
  });
});
