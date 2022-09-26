"use strict";

var should = require("should"),
  request = require("supertest"),
  server = require("../../../server"),
  testUtils = require("../utils/test.utils");

/**
 * General API Tests
 */
describe.skip("General API Functional Tests:", function () {
  describe("General - ", function () {
    it("should render the html index page", function (done) {
      request(server)
        .get("/")
        .expect(200)
        .expect(function (res) {
          // Ensure an html document is present
          if (res.text.search(/^<!DOCTYPE html>/) === -1) {
            throw new Error("html index page did not render");
          }
          // Ensure the developer logs weren't printed to the page
          if (res.text.search(/<table name="dev-logs"/) !== -1) {
            throw new Error(
              "the dev-logs table should not be present with current configuration"
            );
          }
        })
        .end(function (err, data) {
          testUtils.end(err, data, done);
        });
    });

    it("should return the custom css stylesheet", function (done) {
      request(server)
        .get("/css/style.css")
        .expect(200)
        .end(function (err, data) {
          testUtils.end(err, data, done);
        });
    });

    it("should send json object back for 404 error for /404-summary page when not in dev mode", function (done) {
      request(server)
        .get("/404-summary")
        .expect(404)
        .expect(function (res) {
          // Ensure response is the expected data type
          if (typeof res.body !== "object") {
            throw new Error(
              "invalid data type returned for a 404 page not found error"
            );
          }
          // Ensure a valid 404 - page not found response is returned
          if (
            JSON.stringify(res.body) !== "{\"status\":\"404\",\"error\":\"Not Found\"}"
          ) {
            throw new Error(
              "invalid response was returned for a 404 page not found error"
            );
          }
        })
        .end(function (err, data) {
          testUtils.end(err, data, done);
        });
    });

    it("should send json object back for 404 error for /test-summary page when not in dev mode", function (done) {
      request(server)
        .get("/test-summary")
        .expect(404)
        .expect(function (res) {
          // Ensure response is the expected data type
          if (typeof res.body !== "object") {
            throw new Error(
              "invalid data type returned for a 404 page not found error"
            );
          }
          // Ensure a valid 404 - page not found response is returned
          if (
            JSON.stringify(res.body) !== "{\"status\":\"404\",\"error\":\"Not Found\"}"
          ) {
            throw new Error(
              "invalid response was returned for a 404 page not found error"
            );
          }
        })
        .end(function (err, data) {
          testUtils.end(err, data, done);
        });
    });

    it("should send json object back for 404 error for /test-coverage page when not in dev mode", function (done) {
      request(server)
        .get("/test-coverage")
        .expect(404)
        .expect(function (res) {
          // Ensure response is the expected data type
          if (typeof res.body !== "object") {
            throw new Error(
              "invalid data type returned for a 404 page not found error"
            );
          }
          // Ensure a valid 404 - page not found response is returned
          if (
            JSON.stringify(res.body) !== "{\"status\":\"404\",\"error\":\"Not Found\"}"
          ) {
            throw new Error(
              "invalid response was returned for a 404 page not found error"
            );
          }
        })
        .end(function (err, data) {
          testUtils.end(err, data, done);
        });
    });

    it("should send json object back for 404 error for a page that does not exist", function (done) {
      request(server)
        .get("/testingapagethatdoesntexist")
        .expect(404)
        .expect(function (res) {
          // Ensure response is the expected data type
          if (typeof res.body !== "object") {
            throw new Error(
              "invalid data type returned for a 404 page not found error"
            );
          }
          // Ensure a valid 404 - page not found response is returned
          if (
            JSON.stringify(res.body) !== "{\"status\":\"404\",\"error\":\"Not Found\"}"
          ) {
            throw new Error(
              "invalid response was returned for a 404 page not found error"
            );
          }
        })
        .end(function (err, data) {
          testUtils.end(err, data, done);
        });
    });
  });
});
