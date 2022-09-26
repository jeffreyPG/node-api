"use strict";

const should = require("should");
const assert = require("assert");
const request = require("supertest");
const passport = require("passport");
const sinon = require("sinon");
const server = require("../../../server");
const { SpreadsheetTemplate } = require("../../models/spreadsheetTemplate");

describe("Spreadsheet Template API Functional Tests", function() {
  let app;
  let authenticate;
  let spreadsheet;

  beforeEach(async function() {
    const { express } = server;
    app = await express();
  });

  beforeEach(async function() {
    let spreadsheetObj = new SpreadsheetTemplate({
      name: "TestTemplate1",
      type: "building",
      sheets: [
        {
          order: 1,
          name: "summary",
          datasource: "Overview & Property",
          metaData: {
            year: "most recent year"
          },
          columnHeadings: [
            {
              name: "Building Name"
            },
            {
              name: "Year Built"
            }
          ]
        }
      ],
      organizationId: "5b31ae19af3afa003eea1608",
      createdByUserId: "5ab966541486870047644137"
    });
    spreadsheet = await spreadsheetObj.save();
  });

  beforeEach(() => {
    authenticate = sinon.stub(passport, "authenticate").returns(() => {});
  });

  afterEach(() => {
    authenticate.restore();
  });

  afterEach(async function() {
    await SpreadsheetTemplate.collection.deleteMany({});
  });

  describe("Get", function() {
    beforeEach(function() {
      authenticate.yields(null, { _id: "5ab966541486870047644137" });
    });

    it("should return success", async function() {
      const response = await request(app).get(
        "/spreadsheet/template?organizationId=5b31ae19af3afa003eea1608"
      );

      assert.equal(response.status, 200);
    });

    it("should succeed with expected response body", async function() {
      const response = await request(app).get(
        "/spreadsheet/template?organizationId=5b31ae19af3afa003eea1608"
      );

      assert.equal(
        response.body.spreadsheetTemplate[0].organizationId,
        "5b31ae19af3afa003eea1608"
      );
    });

    it("should return expected response message", async function() {
      const response = await request(app).get(
        "/spreadsheet/template?organizationId=5b31ae19af3afa003eea1608"
      );

      assert.equal(response.body.status, "Success");
      assert.equal(response.body.message, "Retrieved Spreadsheet Templates");
    });
  });

  describe("Get spreadsheet by Id", function() {
    beforeEach(function() {
      authenticate.yields(null, { _id: "5ab966541486870047644137" });
    });

    it("should return success", async function() {
      const response = await request(app).get(
        `/spreadsheet/template/${spreadsheet._id}`
      );

      assert.equal(response.status, 200);
    });

    it("should succeed with expected response body", async function() {
      const response = await request(app).get(
        `/spreadsheet/template/${spreadsheet._id}`
      );

      assert.equal(response.body.spreadsheetTemplate._id, spreadsheet._id);
    });

    it("should return expected response message", async function() {
      const response = await request(app).get(
        `/spreadsheet/template/${spreadsheet._id}`
      );

      assert.equal(response.body.status, "Success");
      assert.equal(response.body.message, "Retrieved Spreadsheet Template");
    });
  });

  describe("Create", function() {
    beforeEach(function() {
      authenticate.yields(null, { _id: "5ab966541486870047644137" });
    });

    it("should fail with invalid data", async function() {
      const response = await request(app)
        .post("/spreadsheet/template")
        .send({})
        .expect(400);
      assert.equal(
        response.body.message,
        "Mandatory Params name and type missing"
      );
    });

    it("should succeed with valid data", async function() {
      const response = await request(app)
        .post("/spreadsheet/template")
        .send({
          name: "TestTemplate1",
          type: "building",
          sheets: [
            {
              order: 1,
              name: "summary",
              datasource: "Overview & Property",
              metaData: {
                year: "most recent year"
              },
              columnHeadings: [
                {
                  name: "Building Name"
                },
                {
                  name: "Year Built"
                }
              ]
            }
          ],
          organizationId: "5b31ae19af3afa003eea1608"
        })
        .expect(200);
      assert.equal(response.body.status, "Success");
      assert.equal(response.body.message, "Created Spreadsheet Template");
      assert.equal(response.body.spreadsheetTemplate.name, "TestTemplate1");
    });
  });

  describe("Update", function() {
    beforeEach(function() {
      authenticate.yields(null, { _id: "5ab966541486870047644137" });
    });

    it("should fail with invalid data", async function() {
      const response = await request(app)
        .put(`/spreadsheet/template/${spreadsheet._id}`)
        .send({})
        .expect(400);
      assert.equal(
        response.body.message,
        "Mandatory Params name and type missing"
      );
    });

    it("should return not found", async function() {
      const spreadsheetId = "5dea525b797d7e005ec69871";
      const response = await request(app)
        .put(`/spreadsheet/template/${spreadsheetId}`)
        .send({})
        .expect(404);
      assert.equal(response.body.status, "Error");
      assert.equal(
        response.body.message,
        "Spreadsheet Template does not exist"
      );
    });

    it("should succeed with valid data", async function() {
      let spreadsheetToUpdate = await SpreadsheetTemplate.findOne({
        _id: spreadsheet._id
      });
      spreadsheetToUpdate.name = "test2CaseUpdateTemplate";
      const response = await request(app)
        .put(`/spreadsheet/template/${spreadsheet._id}`)
        .send(spreadsheetToUpdate)
        .expect(200);
      assert.equal(response.body.status, "Success");
      assert.equal(response.body.message, "Updated Spreadsheet Template");
      assert.equal(
        response.body.spreadsheetTemplate.name,
        "test2CaseUpdateTemplate"
      );
    });
  });

  describe("Delete", function() {
    beforeEach(function() {
      authenticate.yields(null, { _id: "5ab966541486870047644137" });
    });

    it("should fail with invalid data", async function() {
      const invalidSpreadsheetId = "123";

      const response = await request(app)
        .delete(`/spreadsheet/template/${invalidSpreadsheetId}`)
        .expect(400);
    });

    it("should return not found", async function() {
      const spreadsheetId = "5dea525b797d7e005ec69871";

      const response = await request(app)
        .delete(`/spreadsheet/template/${spreadsheetId}`)
        .expect(404);
      assert.equal(response.body.status, "Error");
      assert.equal(
        response.body.message,
        "Spreadsheet Template does not exist"
      );
    });

    it("should succeed with valid data", async function() {
      const response = await request(app)
        .delete(`/spreadsheet/template/${spreadsheet._id}`)
        .expect(200);
      assert.equal(response.body.status, "Success");
      assert.equal(response.body.message, "Removed Spreadsheet Template");
    });
  });
});
