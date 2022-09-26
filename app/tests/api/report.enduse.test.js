"use strict";

const assert = require("assert");
const mongoose = require("mongoose");
const request = require("supertest");
const sinon = require("sinon");

const server = require("../../../server");
const analysisClient = require("../../controllers/api/utils/api.analysis.client");
const endUseBreakdownFixture = require("../fixtures/end-use-breakdown");
const { ActualEndUse } = require("../../models/actualenduse.server.model");
const { Building } = require("../../models/building.server.model");
const { Template } = require("../../models/template.server.model");

const User = mongoose.model("User");

describe("Report End Use API Functional Tests:", function() {
  let sandbox = sinon.createSandbox();

  let building;
  let template;
  let user;
  let app;

  beforeEach(async function() {
    const { express } = server;
    app = await express();
  });

  beforeEach(function() {
    sandbox.replace(
      analysisClient,
      "getEubResult",
      sinon.stub().callsArgWithAsync(1, null, endUseBreakdownFixture)
    );
  });

  afterEach(function() {
    sandbox.restore();
  });

  beforeEach(async function() {
    user = await User.create({
      email: "test@test.com",
      password: "password"
    });
    building = await Building.create({
      buildingName: "Test Water Site",
      siteName: "Test Water Site",
      projectType: "Water",
      buildingType: "buildingType1",
      yearBuilt: "1976-2000",
      numberOfFloors: "6-10",
      occupancy: "6-10",
      floorArea: 42,
      createdByUserId: user._id,
      location: {
        city: "Test City",
        state: "CO",
        zip: "80229",
        address: "123 Test Address"
      }
    });
    template = await Template.create({
      header: { image: "", text: "" },
      footer: { text: "" },
      config: {
        pageNumbers: false,
        numberPosition: "",
        tableOfContents: false
      },
      name: "Chart Date Test",
      styledDoc: "",
      _id: "5eaa5705f350de001305a71c",
      body: [
        {
          fields: ["actualEndUseBreakdown.totalUse"],
          dataLabels: "show",
          metaData: { yearRange: "12" },
          projectConfig: {},
          equipmentConfig: {},
          dividerConfig: {},
          type: "table",
          target: "endusebreakdown",
          tableLayout: "horizontal",
          organize: "CY",
          tableType: "usetype",
          ele: "table"
        },
        {
          fields: ["actualEndUseBreakdown.totalUse"],
          dataLabels: "show",
          metaData: {
            yearRange: "36",
            selectedStartMonth: "January",
            selectedStartYear: "2018",
            selectedEndMonth: "April",
            selectedEndYear: "2020"
          },
          projectConfig: {},
          equipmentConfig: {},
          dividerConfig: {},
          type: "table",
          target: "endusebreakdown",
          tableLayout: "horizontal",
          organize: "FY",
          tableType: "usetype",
          ele: "table"
        },
        {
          fields: ["actualEndUseBreakdown.totalUse"],
          dataLabels: "show",
          metaData: {
            yearRange: "Custom",
            selectedStartMonth: "January",
            selectedStartYear: "2018",
            selectedEndMonth: "April",
            selectedEndYear: "2020"
          },
          projectConfig: {},
          equipmentConfig: {},
          dividerConfig: {},
          type: "table",
          target: "endusebreakdown",
          tableLayout: "horizontal",
          organize: "CY",
          tableType: "usetype",
          ele: "table"
        }
      ],
      createdByUserId: "5dd4306ca8d257000f256e9e",
      updated: "2020-04-30T04:41:41.342Z",
      __v: 0
    });
  });

  afterEach(async function() {
    await Building.collection.drop();
    await Template.collection.drop();
    await User.collection.drop();
    await ActualEndUse.collection.drop();
  });

  describe("Create", function() {
    it("succeeds", async function() {
      await request(app)
        .post(
          `/report/user/${user._id}/building/${building._id}/template/${template._id}/enduse`
        )
        .expect(200);
    });

    it("returns expected response", async function() {
      const response = await request(app).post(
        `/report/user/${user._id}/building/${building._id}/template/${template._id}/enduse`
      );

      assert.deepEqual(response.body, {
        status: "Success"
      });
    });

    it("persists actual end use", async function() {
      await request(app)
        .post(
          `/report/user/${user._id}/building/${building._id}/template/${template._id}/enduse`
        )
        .expect(200);

      const count = await ActualEndUse.count({ building: building._id });
      assert(count > 0);
    });
  });
});
