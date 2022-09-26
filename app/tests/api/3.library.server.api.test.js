"use strict";

var _ = require("lodash"),
  should = require("should"),
  request = require("supertest"),
  server = require("../../../server"),
  testUtils = require("../utils/test.utils");

/**
 * Globals
 */
var createKeyReq,
  createKeyNoUsernameReq,
  createMeasureReq,
  createMeasureMismatchReq,
  updateMeasureReq,
  updateMeasureMismatchReq,
  createComponentReq,
  createComponentMismatchReq,
  updateComponentReq,
  updateComponentMismatchReq,
  proxyQueryReq,
  proxyQueryKeywordReq,
  invalidProxyQueryReq,
  invalidProxyQueryResourceReq,
  createdMeasure,
  createdComponent,
  invalidCreateKeyOrgId,
  invalidCreateKeyUserId,
  createdUserAccountWithKey,
  createdUserAccount,
  sessionSecret,
  currentSession,
  compareInitialKeyCheck,
  compareApiKeyCheck,
  keyGenerationData,
  diffKeyGenerationData,
  authCheckComponentType,
  searchComponentType,
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
    username: "testlibrarykeygenerate"
  };
  testUtils.libraryKeyCreate(keyGenerationData, callback);
};

/**
 * Setup Library tests
 */
describe.skip("Library API Functional Tests:", function () {
  before(function (done) {
    // Clean Key collection before running tests
    testUtils.cleanModelsBeforeDone(["Key"], function () {
      // Run init for setup
      _init(function (err, apiKeyGenerated) {
        if (err) {
          throw new Error("Issues with Library init setup.");
        }

        apiKey = apiKeyGenerated;
        searchComponentType = "lightfixture";
        authCheckComponentType = "lightfixture";
        diffKeyGenerationData = {
          organizationId: "-" + testUtils.generateRandomString(15),
          userId: "-" + testUtils.generateRandomString(15)
        };

        // Key requests
        invalidCreateKeyOrgId = {
          userId: "-KMbWCZkGo0O8WOQhknU",
          username: "testusername"
        };
        invalidCreateKeyUserId = {
          orgId: "-KHdRY07WQa-Kq9ZTjad",
          username: "testusername"
        };
        createKeyNoUsernameReq = {
          orgId: "-KHdRY07WQa-Kq9ZTjad",
          userId: "-KMbWCZkGo0O8WOQhknU"
        };
        createKeyReq = {
          orgId: "-KHdRY07WQa-Kq9Ztest",
          userId: "-KMbWCZkGo0O8WOQtest",
          username: "testusername"
        };

        // Measure requests
        createMeasureReq = {
          organizationId: keyGenerationData.request.orgId,
          userId: keyGenerationData.request.userId,
          measure: {
            name: "test measure name 1",
            comment: "test comment for measure name 1",
            references: { lightfixture: { 0: "-KMbWCZkGo0O8WOQhknU" } }
          }
        };
        updateMeasureReq = {
          organizationId: keyGenerationData.request.orgId,
          userId: keyGenerationData.request.userId,
          name: "test measure name 1",
          measure: {
            comment: "test comment for measure name 1 updated"
          }
        };
        createMeasureMismatchReq = _.cloneDeep(createMeasureReq);
        updateMeasureMismatchReq = _.cloneDeep(updateMeasureReq);
        createMeasureMismatchReq.organizationId =
          diffKeyGenerationData.organizationId;
        updateMeasureMismatchReq.organizationId =
          diffKeyGenerationData.organizationId;

        // Component requests
        createComponentReq = {
          organizationId: keyGenerationData.request.orgId,
          userId: keyGenerationData.request.userId,
          component: {
            name: "test component name 1",
            comment: "test comment for component name 1 ",
            conditionRating: "Excellent - Plan Preventative Maintenance",
            dataLamp: {
              manufacturer: "test component name datalamp manufacturer"
            }
          },
          config: {
            type: "lightfixture",
            typeplural: "lightfixtures"
          }
        };
        updateComponentReq = {
          organizationId: keyGenerationData.request.orgId,
          userId: keyGenerationData.request.userId,
          name: "test component name 1",
          component: {
            comment: "test comment for component name 1 updated",
            dataLamp: {
              model: "test component name datalamp model on update"
            }
          },
          config: {
            type: "lightfixture",
            typeplural: "lightfixtures"
          }
        };
        createComponentMismatchReq = _.cloneDeep(createComponentReq);
        updateComponentMismatchReq = _.cloneDeep(updateComponentReq);
        createComponentMismatchReq.organizationId =
          diffKeyGenerationData.organizationId;
        updateComponentMismatchReq.organizationId =
          diffKeyGenerationData.organizationId;

        proxyQueryReq = {
          querystring:
            "search/*.json?fq[]=bundle:nrel_component&fq[]=tid:157&fq[]=sm_a_Category:\"Asbestos%20Cement%20Board\"&api_version=2.0&show_rows=100&solrsort=sort_label%20asc"
        };
        proxyQueryKeywordReq = {
          querystring:
            "search/filter by keyword.json?fq[]=bundle:nrel_component&fq[]=tid:157&fq[]=sm_a_Category:\"Asbestos%20Cement%20Board\"&api_version=2.0&show_rows=100&solrsort=sort_label%20asc"
        };
        invalidProxyQueryReq = {
          querystring: "search/*.jsonfq[]=bundle:nrel_component&fq[]=tid:157"
        };
        invalidProxyQueryResourceReq = {
          querystring:
            "search/* !&@.json?fq[]=bundle:nrel_component&fq[]=tid:157"
        };

        // Clean db and proceed with testing
        testUtils.cleanModelsBeforeDone(
          ["User", "Session", "Component", "Measure"],
          done
        );
      });
    });
  });

  /**
   * General Library API Tests
   */
  describe("General - ", function () {
    describe("Key-Auth Check - Library Measure : ", function () {
      it("should send back key authentication error with api error code level \"400\" for GET", function (done) {
        request(server)
          .get("/library/measure")
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

      it("should send back key authentication error with api error code level \"400\" for POST", function (done) {
        request(server)
          .post("/library/measure")
          .send({})
          .expect(401)
          .expect(function (res) {
            should.exist(res.body.code);
            // Ensure an error code between 400-500 was sent in response
            var errCode = testUtils.parseErrorCode(res.body.code);
            errCode.should.be.above(
              400,
              "incorrect api error code level was returned for key authentication failure for POST, should be above \"400\""
            );
            errCode.should.be.below(
              500,
              "incorrect api error code level was returned for key authentication failure for POST, should be below \"500\""
            );
          })
          .end(function (err, data) {
            testUtils.end(err, data, done);
          });
      });

      it("should send back key authentication error with api error code level \"400\" for PUT", function (done) {
        request(server)
          .put("/library/measure/update")
          .send({})
          .expect(401)
          .expect(function (res) {
            should.exist(res.body.code);
            // Ensure an error code between 400-500 was sent in response
            var errCode = testUtils.parseErrorCode(res.body.code);
            errCode.should.be.above(
              400,
              "incorrect api error code level was returned for key authentication failure for PUT, should be above \"400\""
            );
            errCode.should.be.below(
              500,
              "incorrect api error code level was returned for key authentication failure for PUT, should be below \"500\""
            );
          })
          .end(function (err, data) {
            testUtils.end(err, data, done);
          });
      });

      it("should send back key authentication error with api error code level \"400\" for DELETE", function (done) {
        request(server)
          .delete("/library/measure")
          .send({})
          .expect(401)
          .expect(function (res) {
            should.exist(res.body.code);
            // Ensure an error code between 400-500 was sent in response
            var errCode = testUtils.parseErrorCode(res.body.code);
            errCode.should.be.above(
              400,
              "incorrect api error code level was returned for key authentication failure for DELETE, should be above \"400\""
            );
            errCode.should.be.below(
              500,
              "incorrect api error code level was returned for key authentication failure for DELETE, should be below \"500\""
            );
          })
          .end(function (err, data) {
            testUtils.end(err, data, done);
          });
      });

      it("should send back key authentication error with api error code level \"400\" for GET", function (done) {
        request(server)
          .get("/library/search/measure")
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

    describe("Key-Auth Check - Library Component : ", function () {
      it("should send back key authentication error with api error code level \"400\" for GET", function (done) {
        request(server)
          .get("/library/component/" + authCheckComponentType)
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

      it("should send back key authentication error with api error code level \"400\" for POST", function (done) {
        request(server)
          .post("/library/component/" + authCheckComponentType)
          .send({})
          .expect(401)
          .expect(function (res) {
            should.exist(res.body.code);
            // Ensure an error code between 400-500 was sent in response
            var errCode = testUtils.parseErrorCode(res.body.code);
            errCode.should.be.above(
              400,
              "incorrect api error code level was returned for key authentication failure for POST, should be above \"400\""
            );
            errCode.should.be.below(
              500,
              "incorrect api error code level was returned for key authentication failure for POST, should be below \"500\""
            );
          })
          .end(function (err, data) {
            testUtils.end(err, data, done);
          });
      });

      it("should send back key authentication error with api error code level \"400\" for PUT", function (done) {
        request(server)
          .put("/library/component/update/" + authCheckComponentType)
          .send({})
          .expect(401)
          .expect(function (res) {
            should.exist(res.body.code);
            // Ensure an error code between 400-500 was sent in response
            var errCode = testUtils.parseErrorCode(res.body.code);
            errCode.should.be.above(
              400,
              "incorrect api error code level was returned for key authentication failure for PUT, should be above \"400\""
            );
            errCode.should.be.below(
              500,
              "incorrect api error code level was returned for key authentication failure for PUT, should be below \"500\""
            );
          })
          .end(function (err, data) {
            testUtils.end(err, data, done);
          });
      });

      it("should send back key authentication error with api error code level \"400\" for DELETE", function (done) {
        request(server)
          .delete("/library/component/" + authCheckComponentType)
          .send({})
          .expect(401)
          .expect(function (res) {
            should.exist(res.body.code);
            // Ensure an error code between 400-500 was sent in response
            var errCode = testUtils.parseErrorCode(res.body.code);
            errCode.should.be.above(
              400,
              "incorrect api error code level was returned for key authentication failure for DELETE, should be above \"400\""
            );
            errCode.should.be.below(
              500,
              "incorrect api error code level was returned for key authentication failure for DELETE, should be below \"500\""
            );
          })
          .end(function (err, data) {
            testUtils.end(err, data, done);
          });
      });

      it("should send back key authentication error with api error code level \"400\" for GET", function (done) {
        request(server)
          .get("/library/search/component/" + authCheckComponentType)
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

    describe("Key-Auth Check - Library Sync : ", function () {
      it("should send back key authentication error with api error code level \"400\" for GET", function (done) {
        request(server)
          .get("/library/sync")
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

    describe("Key-Auth Check - Library Proxy Query : ", function () {
      it("should send back key authentication error with api error code level \"400\" for GET", function (done) {
        request(server)
          .post("/library/query")
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
   * Library API Tests
   */
  describe("API Library Key - ", function () {
    it("should fail to create api key with missing orgId and return validation errors", function (done) {
      request(server)
        .post("/library/key")
        .send(invalidCreateKeyOrgId)
        .expect(400)
        .expect(function (res) {
          res.body.status.should.be.eql("Error");
          res.body.errors.should.not.be.empty;
          res.body.message.should.not.be.empty;
          // Ensure the expected validation error message was returned
          res.body.message.should.be.match("Field \"orgId\" is required.");
        })
        .end(function (err, data) {
          testUtils.end(err, data, done);
        });
    });

    it("should fail to create api key with missing userId and return validation errors", function (done) {
      request(server)
        .post("/library/key")
        .send(invalidCreateKeyUserId)
        .expect(400)
        .expect(function (res) {
          res.body.status.should.be.eql("Error");
          res.body.errors.should.not.be.empty;
          res.body.message.should.not.be.empty;
          // Ensure the expected validation error message was returned
          res.body.message.should.be.match("Field \"userId\" is required.");
        })
        .end(function (err, data) {
          testUtils.end(err, data, done);
        });
    });

    it("should create/generate api key with no username provided in request", function (done) {
      request(server)
        .post("/library/key")
        .send(createKeyNoUsernameReq)
        .expect(200)
        .expect(function (res) {
          res.body.status.should.be.eql("Success");
          res.body.key.should.not.be.empty;
          res.body.message.should.not.be.empty;
          // Ensure the expected validation error message was returned
          res.body.message.should.be.match("Generated Library API Key");

          compareInitialKeyCheck = res.body.key;
        })
        .end(function (err, data) {
          testUtils.end(err, data, done);
        });
    });

    it("should create/generate api key with different userId/orgId provided in request", function (done) {
      request(server)
        .post("/library/key")
        .send(createKeyReq)
        .expect(200)
        .expect(function (res) {
          res.body.status.should.be.eql("Success");
          res.body.key.should.not.be.empty;
          // Ensure a new key was generated
          res.body.key.should.not.be.eql(compareInitialKeyCheck);
          res.body.message.should.not.be.empty;
          // Ensure the expected validation error message was returned
          res.body.message.should.be.match("Generated Library API Key");

          compareApiKeyCheck = res.body.key;
        })
        .end(function (err, data) {
          testUtils.end(err, data, done);
        });
    });

    it("should retrieve an existing api key with userId/orgId provided in request", function (done) {
      request(server)
        .post("/library/key")
        .send(createKeyReq)
        .expect(200)
        .expect(function (res) {
          res.body.status.should.be.eql("Success");
          res.body.key.should.not.be.empty;
          // Ensure the key is the same as initial generation
          res.body.key.should.be.eql(compareApiKeyCheck);
          res.body.message.should.not.be.empty;
          // Ensure the expected validation error message was returned
          res.body.message.should.be.match("Retrieved Library API Key");
        })
        .end(function (err, data) {
          testUtils.end(err, data, done);
        });
    });
  });

  /**
   * Create Library API Tests
   */
  describe("Create - ", function () {
    describe("Measures : ", function () {
      it("should fail create a component via key authentication with key-mismatch", function (done) {
        request(server)
          .post("/library/measure")
          .set("xkey", apiKey)
          .send(createMeasureMismatchReq)
          .expect(400)
          .expect(function (res) {
            res.body.status.should.be.eql("Error");
            res.body.message.should.not.be.empty;
            res.body.message.should.be.match("Key mismatch.");
          })
          .end(function (err, data) {
            testUtils.end(err, data, done);
          });
      });

      it("should create a component via key authentication and return component info", function (done) {
        request(server)
          .post("/library/measure")
          .set("xkey", apiKey)
          .send(createMeasureReq)
          .expect(200)
          .expect(function (res) {
            res.body.status.should.be.eql("Success");
            res.body.measure.should.not.be.empty;
            res.body.measure.organizationFirebaseId.should.be.eql(
              createMeasureReq.organizationId
            );
            res.body.measure.userFirebaseId.should.be.eql(
              createMeasureReq.userId
            );
            res.body.measure.name.should.be.eql(createMeasureReq.measure.name);
            res.body.measure.measure.name.should.be.eql(
              createMeasureReq.measure.name
            );
            res.body.measure.measure.comment.should.be.eql(
              createMeasureReq.measure.comment
            );
            res.body.measure.measure.references.should.be.eql(
              createMeasureReq.measure.references
            );

            createdMeasure = res.body.measure;
          })
          .end(function (err, data) {
            testUtils.end(err, data, done);
          });
      });
    });

    describe("Components : ", function () {
      it("should fail create a measure via key authentication with key-mismatch", function (done) {
        request(server)
          .post("/library/component/" + createComponentReq.config.type)
          .set("xkey", apiKey)
          .send(createComponentMismatchReq)
          .expect(400)
          .expect(function (res) {
            res.body.status.should.be.eql("Error");
            res.body.message.should.not.be.empty;
            res.body.message.should.be.match("Key mismatch.");
          })
          .end(function (err, data) {
            testUtils.end(err, data, done);
          });
      });

      it("should create a measure via key authentication and return component info", function (done) {
        request(server)
          .post("/library/component/" + createComponentReq.config.type)
          .set("xkey", apiKey)
          .send(createComponentReq)
          .expect(200)
          .expect(function (res) {
            res.body.status.should.be.eql("Success");
            res.body.component.should.not.be.empty;
            res.body.component.organizationFirebaseId.should.be.eql(
              createComponentReq.organizationId
            );
            res.body.component.userFirebaseId.should.be.eql(
              createComponentReq.userId
            );
            res.body.component.name.should.be.eql(
              createComponentReq.component.name
            );
            res.body.component.component.name.should.be.eql(
              createComponentReq.component.name
            );
            res.body.component.component.comment.should.be.eql(
              createComponentReq.component.comment
            );
            res.body.component.component.conditionRating.should.be.eql(
              createComponentReq.component.conditionRating
            );
            res.body.component.component.dataLamp.should.be.eql(
              createComponentReq.component.dataLamp
            );

            createdComponent = res.body.component;
          })
          .end(function (err, data) {
            testUtils.end(err, data, done);
          });
      });
    });
  });

  /**
   * List Library API Tests
   */
  describe("List - ", function () {
    describe("Measures : ", function () {
      it("should fail list organization level measures via key authentication with key-mismatch", function (done) {
        request(server)
          .get("/library/measure")
          .set("xkey", apiKey)
          .query({ organizationId: diffKeyGenerationData.organizationId })
          .expect(400)
          .expect(function (res) {
            res.body.status.should.be.eql("Error");
            res.body.message.should.not.be.empty;
            res.body.message.should.be.match("Key mismatch.");
          })
          .end(function (err, data) {
            testUtils.end(err, data, done);
          });
      });

      it("should list organization level measures via key authentication", function (done) {
        request(server)
          .get("/library/measure")
          .set("xkey", apiKey)
          .query({ organizationId: keyGenerationData.organizationId })
          .expect(200)
          .expect(function (res) {
            res.body.status.should.be.eql("Success");
            res.body.measures.should.be.Array;
            res.body.measures.should.not.be.empty;
            res.body.measures[0].organizationFirebaseId.should.be.eql(
              createMeasureReq.organizationId
            );
            res.body.measures[0].userFirebaseId.should.be.eql(
              createMeasureReq.userId
            );
            res.body.measures[0].name.should.be.eql(
              createMeasureReq.measure.name
            );
          })
          .end(function (err, data) {
            testUtils.end(err, data, done);
          });
      });
    });

    describe("Components : ", function () {
      it("should fail list organization level components per component type via key authentication with key-mismatch", function (done) {
        request(server)
          .get("/library/component/" + createComponentReq.config.type)
          .set("xkey", apiKey)
          .query({ organizationId: diffKeyGenerationData.organizationId })
          .expect(400)
          .expect(function (res) {
            res.body.status.should.be.eql("Error");
            res.body.message.should.not.be.empty;
            res.body.message.should.be.match("Key mismatch.");
          })
          .end(function (err, data) {
            testUtils.end(err, data, done);
          });
      });

      it("should list organization level components per component type via key authentication", function (done) {
        request(server)
          .get("/library/component/" + createComponentReq.config.type)
          .set("xkey", apiKey)
          .query({ organizationId: keyGenerationData.organizationId })
          .expect(200)
          .expect(function (res) {
            res.body.status.should.be.eql("Success");
            res.body.components.should.be.Array;
            res.body.components.should.not.be.empty;
            res.body.components[0].organizationFirebaseId.should.be.eql(
              createComponentReq.organizationId
            );
            res.body.components[0].userFirebaseId.should.be.eql(
              createComponentReq.userId
            );
            res.body.components[0].name.should.be.eql(
              createComponentReq.component.name
            );
          })
          .end(function (err, data) {
            testUtils.end(err, data, done);
          });
      });
    });
  });

  /**
   * Update Library API Tests
   */
  describe("Update - ", function () {
    describe("Measures : ", function () {
      it("should fail update measure via key authentication with key-mismatch", function (done) {
        request(server)
          .put("/library/measure/update")
          .set("xkey", apiKey)
          .send(updateMeasureMismatchReq)
          .expect(400)
          .expect(function (res) {
            res.body.status.should.be.eql("Error");
            res.body.message.should.not.be.empty;
            res.body.message.should.be.match("Key mismatch.");
          })
          .end(function (err, data) {
            testUtils.end(err, data, done);
          });
      });

      it("should update measure via key authentication", function (done) {
        request(server)
          .put("/library/measure/update")
          .set("xkey", apiKey)
          .send(updateMeasureReq)
          .expect(200)
          .expect(function (res) {
            res.body.status.should.be.eql("Success");
            res.body.measure.should.not.be.empty;
            res.body.measure._id.should.be.eql(createdMeasure._id);
            res.body.measure.organizationFirebaseId.should.be.eql(
              updateMeasureReq.organizationId
            );
            res.body.measure.userFirebaseId.should.be.eql(
              updateMeasureReq.userId
            );
            res.body.measure.name.should.be.eql(updateMeasureReq.name);
            res.body.measure.measure.name.should.be.eql(updateMeasureReq.name);
            res.body.measure.measure.comment.should.be.eql(
              updateMeasureReq.measure.comment
            );
          })
          .end(function (err, data) {
            testUtils.end(err, data, done);
          });
      });
    });

    describe("Components : ", function () {
      it("should fail update component via key authentication with key-mismatch", function (done) {
        request(server)
          .put("/library/component/update/" + createdComponent.config.type)
          .set("xkey", apiKey)
          .send(updateComponentMismatchReq)
          .expect(400)
          .expect(function (res) {
            res.body.status.should.be.eql("Error");
            res.body.message.should.not.be.empty;
            res.body.message.should.be.match("Key mismatch.");
          })
          .end(function (err, data) {
            testUtils.end(err, data, done);
          });
      });

      it("should update component via key authentication", function (done) {
        request(server)
          .put("/library/component/update/" + createdComponent.config.type)
          .set("xkey", apiKey)
          .send(updateComponentReq)
          .expect(200)
          .expect(function (res) {
            res.body.status.should.be.eql("Success");
            res.body.component.should.not.be.empty;
            res.body.component._id.should.be.eql(createdComponent._id);
            res.body.component.organizationFirebaseId.should.be.eql(
              updateComponentReq.organizationId
            );
            res.body.component.userFirebaseId.should.be.eql(
              updateComponentReq.userId
            );
            res.body.component.name.should.be.eql(updateComponentReq.name);
            res.body.component.component.name.should.be.eql(
              updateComponentReq.name
            );
            res.body.component.component.comment.should.be.eql(
              updateComponentReq.component.comment
            );
            res.body.component.component.dataLamp.should.not.be.empty;
            res.body.component.component.dataLamp.model.should.be.eql(
              updateComponentReq.component.dataLamp.model
            );
            should.not.exist(
              res.body.component.component.dataLamp.manufacturer
            );
          })
          .end(function (err, data) {
            testUtils.end(err, data, done);
          });
      });
    });
  });

  /**
   * Sync Library API Tests
   */
  describe("Sync - ", function () {
    it("should fail get sync list of organization level measures and components via key authentication with key-mismatch", function (done) {
      request(server)
        .get("/library/sync")
        .set("xkey", apiKey)
        .query({ organizationId: diffKeyGenerationData.organizationId })
        .expect(400)
        .expect(function (res) {
          res.body.status.should.be.eql("Error");
          res.body.message.should.not.be.empty;
          res.body.message.should.be.match("Key mismatch.");
        })
        .end(function (err, data) {
          testUtils.end(err, data, done);
        });
    });

    it("should get sync list of organization level measures and components via key authentication", function (done) {
      request(server)
        .get("/library/sync")
        .set("xkey", apiKey)
        .query({ organizationId: keyGenerationData.organizationId })
        .expect(200)
        .expect(function (res) {
          var syncComponents =
            res.body.sync && res.body.sync.components
              ? res.body.sync.components
              : "";
          syncComponents.should.not.be.empty;
          var resultInitialCreatedComponent =
            syncComponents[createComponentReq.config.type] || "";
          resultInitialCreatedComponent.should.not.be.empty;
          // Check measure data
          res.body.status.should.be.eql("Success");
          res.body.sync.measures.should.be.Array;
          res.body.sync.measures[0]._id.should.be.eql(createdMeasure._id);
          res.body.sync.measures[0].name.should.be.eql(createdMeasure.name);
          // Check component data
          resultInitialCreatedComponent.should.be.not.be.empty;
          resultInitialCreatedComponent.should.be.Array;
          resultInitialCreatedComponent[0]._id.should.be.eql(
            createdComponent._id
          );
          resultInitialCreatedComponent[0].name.should.be.eql(
            createdComponent.name
          );
        })
        .end(function (err, data) {
          testUtils.end(err, data, done);
        });
    });
  });

  /**
   * Delete Library API Tests
   */
  describe("Delete - ", function () {
    describe("Measures : ", function () {
      it("should fail delete measure via key authentication with key-mismatch", function (done) {
        request(server)
          .delete("/library/measure")
          .set("xkey", apiKey)
          .query({
            organizationId: diffKeyGenerationData.organizationId,
            name: createdMeasure.name
          })
          .expect(400)
          .expect(function (res) {
            res.body.status.should.be.eql("Error");
            res.body.message.should.not.be.empty;
            res.body.message.should.be.match("Key mismatch.");
          })
          .end(function (err, data) {
            testUtils.end(err, data, done);
          });
      });

      it("should delete measure via key authentication", function (done) {
        request(server)
          .delete("/library/measure")
          .set("xkey", apiKey)
          .query({
            organizationId: keyGenerationData.organizationId,
            name: createdMeasure.name
          })
          .expect(200)
          .expect(function (res) {
            res.body.status.should.be.eql("Success");
          })
          .end(function (err, data) {
            testUtils.end(err, data, done);
          });
      });
    });

    describe("Components : ", function () {
      it("should fail delete component via key authentication with key-mismatch", function (done) {
        request(server)
          .delete("/library/component/" + createdComponent.config.type)
          .set("xkey", apiKey)
          .query({
            organizationId: diffKeyGenerationData.organizationId,
            name: createdComponent.name
          })
          .expect(400)
          .expect(function (res) {
            res.body.status.should.be.eql("Error");
            res.body.message.should.not.be.empty;
            res.body.message.should.be.match("Key mismatch.");
          })
          .end(function (err, data) {
            testUtils.end(err, data, done);
          });
      });

      it("should delete component via key authentication", function (done) {
        request(server)
          .delete("/library/component/" + createdComponent.config.type)
          .set("xkey", apiKey)
          .query({
            organizationId: keyGenerationData.organizationId,
            name: createdComponent.name
          })
          .expect(200)
          .expect(function (res) {
            res.body.status.should.be.eql("Success");
          })
          .end(function (err, data) {
            testUtils.end(err, data, done);
          });
      });
    });
  });

  /**
   * External Search Service API Tests (Outbound request to servers are generally mocked)
   */
  describe("External Search Service (Mocked) - ", function () {
    describe("Public Measures : ", function () {
      it("should query external library server for measure results via key authentication", function (done) {
        request(server)
          .get("/library/search/measure")
          .set("xkey", apiKey)
          .expect(200)
          .expect(function (res) {
            res.body.status.should.be.eql("Success");
            res.body.measures.should.not.be.empty;
            res.body.measures.should.be.Array;
            res.body.measures[0].mock.should.be.eql(true);
          })
          .end(function (err, data) {
            testUtils.end(err, data, done);
          });
      });

      it("should query for public measures and return from static file data", function (done) {
        request(server)
          .get("/library/static/measure")
          .set("xkey", apiKey)
          .expect(200)
          .expect(function (res) {
            res.body.status.should.be.eql("Success");
            res.body.measures.should.not.be.empty;
            res.body.measures.should.be.Array;
            res.body.measures.length.should.be.eql(165);
            res.body.measures[0].name.should.not.be.empty;
            res.body.measures[0].name.should.be.String;
            res.body.measures[0].measure.should.not.be.empty;
            res.body.measures[0].measure.should.be.Object;
            res.body.measures[0].measure.name.should.be.eql(
              res.body.measures[0].name
            );
            res.body.measures[0].measure.ecm.should.not.be.empty;
            res.body.measures[0].measure.ecm.should.be.Object;
            res.body.measures[0].measure.ecm.attachedTo.should.not.be.empty;
            res.body.measures[0].measure.ecm.description.should.not.be.empty;
            res.body.measures[0].measure.ecm.name.should.not.be.empty;
          })
          .end(function (err, data) {
            testUtils.end(err, data, done);
          });
      });
    });

    describe("Public Components : ", function () {
      it("should fail query request via key authentication and return validation errors", function (done) {
        request(server)
          .get("/library/search/component/notatruecomponenttype")
          .set("xkey", apiKey)
          .send({})
          .expect(400)
          .expect(function (res) {
            res.body.status.should.be.eql("Error");
            res.body.message.should.not.be.empty;
            res.body.message.should.be.match("Invalid \"componentType\" param.");
          })
          .end(function (err, data) {
            testUtils.end(err, data, done);
          });
      });

      it("should query external library server for components results via key authentication", function (done) {
        request(server)
          .get("/library/search/component/" + searchComponentType)
          .set("xkey", apiKey)
          .expect(200)
          .expect(function (res) {
            res.body.status.should.be.eql("Success");
            res.body.components.should.not.be.empty;
            res.body.components.should.be.Array;
            res.body.components[0].mock.should.be.eql(true);
          })
          .end(function (err, data) {
            testUtils.end(err, data, done);
          });
      });

      it("should fail request for public components that do no exist via key authentication and return validation errors", function (done) {
        request(server)
          .get("/library/public/component/notatruecomponenttype")
          .set("xkey", apiKey)
          .expect(400)
          .expect(function (res) {
            res.body.status.should.be.eql("Error");
            res.body.message.should.not.be.empty;
            res.body.message.should.be.match("Invalid \"componentType\" param.");
          })
          .end(function (err, data) {
            testUtils.end(err, data, done);
          });
      });

      // it('should return public components via key authentication', function(done) {
      // 	request(server)
      // 		.get('/library/public/component/' + searchComponentType)
      // 		.set('xkey', apiKey)
      // 		.expect(200)
      // 		.expect(function(res) {
      // 			(res.body.status).should.be.eql('Success');
      // 		})
      // 		.end(function(err, data) {
      // 			testUtils.end(err, data, done);
      // 		});
      // });
    });

    describe("Proxy Query : ", function () {
      it("should fail proxy query request via key authentication and return field errors", function (done) {
        request(server)
          .post("/library/query")
          .set("xkey", apiKey)
          .send({})
          .expect(400)
          .expect(function (res) {
            res.body.status.should.be.eql("Error");
            res.body.message.should.not.be.empty;
            res.body.message.should.be.match(
              "Field \"querystring\" is required."
            );
          })
          .end(function (err, data) {
            testUtils.end(err, data, done);
          });
      });

      it("should fail proxy query request via key authentication and return parse errors", function (done) {
        request(server)
          .post("/library/query")
          .set("xkey", apiKey)
          .send(invalidProxyQueryReq)
          .expect(400)
          .expect(function (res) {
            res.body.status.should.be.eql("Error");
            res.body.message.should.not.be.empty;
            res.body.message.should.be.match("Issues parsing query request.");
          })
          .end(function (err, data) {
            testUtils.end(err, data, done);
          });
      });

      it("should fail proxy query request via key authentication and return validation errors", function (done) {
        request(server)
          .post("/library/query")
          .set("xkey", apiKey)
          .send(invalidProxyQueryResourceReq)
          .expect(400)
          .expect(function (res) {
            res.body.status.should.be.eql("Error");
            res.body.message.should.not.be.empty;
            res.body.message.should.be.match(
              "Invalid \"querystring\" used in request."
            );
          })
          .end(function (err, data) {
            testUtils.end(err, data, done);
          });
      });

      it("should proxy query request to external library server for results via key authentication", function (done) {
        request(server)
          .post("/library/query")
          .set("xkey", apiKey)
          .send(proxyQueryReq)
          .expect(200)
          .expect(function (res) {
            res.body.status.should.be.eql("Success");
            res.body.result.should.not.be.empty;
            res.body.result.should.be.Array;
            res.body.result[0].mock.should.be.eql(true);
          })
          .end(function (err, data) {
            testUtils.end(err, data, done);
          });
      });

      it("should proxy query request with keyword to external library server for results via key authentication", function (done) {
        request(server)
          .post("/library/query")
          .set("xkey", apiKey)
          .send(proxyQueryKeywordReq)
          .expect(200)
          .expect(function (res) {
            res.body.status.should.be.eql("Success");
            res.body.result.should.not.be.empty;
            res.body.result.should.be.Array;
            res.body.result[0].mock.should.be.eql(true);
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
