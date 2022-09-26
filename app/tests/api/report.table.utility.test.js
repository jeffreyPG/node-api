"use strict";

const assert = require("assert");
const request = require("supertest");
const mongoose = require("mongoose");
const nock = require("nock");
const sinon = require("sinon");

const server = require("../../../server");
const { Building } = require("../../models/building.server.model");
const { Project } = require("../../models/project.server.model");
const { Template } = require("../../models/template.server.model");
const { Location } = require("../../models/location.server.model");
const { Utility } = require("../../models/utility.server.model");
const reportEubClientUtility = require("../../controllers/api/utils/api.report.eub.client");
const endUseBreakdownFixture = require("../fixtures/end-use-breakdown");
const User = mongoose.model("User");

describe("Report Table Utilities", function() {
  let sandbox = sinon.createSandbox();

  let app;
  let building;
  let user;
  let template;

  nock.disableNetConnect();
  nock.enableNetConnect(/127.0.0.1.*/);

  beforeEach(function() {
    sandbox.replace(
      reportEubClientUtility,
      "getEndUseBreakdown",
      sinon.stub().returns(endUseBreakdownFixture)
    );
  });

  afterEach(function() {
    sandbox.restore();
  });

  beforeEach(async function() {
    const { express } = server;
    app = await express();
  });

  beforeEach(function() {
    nock(`http://${process.env.REPORTS_API_IP}:80`)
      .post("/api/word/createDocument")
      .reply(200, {});
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
      name: "Organize By Test",
      styledDoc: "",
      header: { image: "", text: "" },
      body: [
        {
          fields: [
            "electricity.totalUsage",
            "electricity.totalDemandCost",
            "electricity.totalUsageCost",
            "electricity.totalCost"
          ],
          dataLabels: "show",
          metaData: { yearRange: "12" },
          type: "table",
          target: "utility",
          tableLayout: "horizontal",
          organize: "FY",
          tableType: "totals",
          ele: "table",
          projectConfig: {},
          equipmentConfig: {},
          dividerConfig: {}
        }
      ],
      footer: { text: "" },
      config: {
        pageNumbers: false,
        numberPosition: "",
        tableOfContents: false
      },
      createdByUserId: user.id,
      __v: 6
    });
  });

  afterEach(async function() {
    await User.collection.drop();
    await Building.collection.drop();
    await Template.collection.drop();
  });

  afterEach(() => {
    sinon.restore();
  });

  describe("Get", function() {
    it("should work", async function() {
      const reportClient = require("../../controllers/api/utils/api.report.client");
      const spy = sinon.spy(reportClient, "getWordReport");

      await request(app).get(
        `/report/user/${user._id}/building/${building._id}/template/${template._id}`
      );
      sinon.assert.calledWith(
        spy,
        sinon.match.has(
          "body",
          sinon.match(
            '<html><body><table><thead><tr style="background-color:#4F81BC"><th></th><th>Electric Usage (kWh)</th><th>Electric Demand Cost ($)</th><th>Electric Usage Cost ($)</th><th>Electric Total Cost ($)</th></tr></thead><tbody><tr><td>Average</td><td>0.00</td><td>0.00</td><td>0.00</td><td>0.00</td></tr></tbody></table><br /></body></html>'
          )
        )
      );
    });
  });
});
