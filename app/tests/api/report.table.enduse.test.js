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
const analysisClient = require("../../controllers/api/utils/api.analysis.client");
const reportEubClientUtility = require("../../controllers/api/utils/api.report.eub.client");
const endUseBreakdownFixture = require("../fixtures/end-use-breakdown");
const User = mongoose.model("User");

describe("Report Table End Use", function() {
  let sandbox = sinon.createSandbox();

  let app;
  let building;
  let user;
  let template;

  nock.disableNetConnect();
  nock.enableNetConnect(/127.0.0.1.*/);

  beforeEach(async function() {
    const { express } = server;
    app = await express();
  });

  beforeEach(function() {
    sandbox.replace(
      reportEubClientUtility,
      "getEndUseBreakdown",
      sinon.stub().returns(endUseBreakdownFixture)
    );
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
      name: "Table EndUse Test",
      styledDoc: "",
      header: { image: "", text: "" },
      body: [
        {
          fields: [
            "actualEndUseBreakdown.totalUse",
            "actualEndUseBreakdown.electricity.energyUse",
            "actualEndUseBreakdown.naturalGas.energyUse",
            "actualEndUseBreakdown.totalCost"
          ],
          dataLabels: "show",
          metaData: {
            yearRange: "36",
            selectedStartMonth: "January",
            selectedStartYear: "2018",
            selectedEndMonth: "May",
            selectedEndYear: "2020"
          },
          type: "table",
          target: "endusebreakdown",
          tableLayout: "horizontal",
          tableType: "totals",
          organize: "CY",
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
      createdByUserId: user.id
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
            '<html><body><table><caption>End Use Impacts Table</caption><thead><tr style="background-color:#4F81BC"><th>End Use</th><th>Electricity (kWh)</th><th>Natural Gas (therms)</th><th>Electricity Savings (kWh)</th><th>Natural Gas Savings (therms)</th><th>Total Existing Energy Consumption (kBtu)</th><th>Total Proposed Energy Consumption (kBtu)</th><th>% Reduction</th></tr></thead><tbody><tr><td>Space Heating</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td></tr><tr style="background-color:#D7E3BD"><td>Space Cooling</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td></tr><tr><td>Air Distribution</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td></tr><tr style="background-color:#D7E3BD"><td>Water Heating</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td></tr><tr><td>Cooking</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td></tr><tr style="background-color:#D7E3BD"><td>Lighting</td><td>21,659,470.37</td><td>-</td><td>21,659,470.37</td><td>-</td><td>73,905,450.48</td><td>73,905,450.48</td><td>-</td></tr><tr><td>Plug Load</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td></tr><tr style="background-color:#D7E3BD"><td>Process Load</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td></tr><tr><td>Total</td><td>21,659,470.37</td><td>-</td><td>21,659,470.37</td><td>1,985.93</td><td>74,104,043.01</td><td>74,104,043.01</td><td>-</td></tr><tr style="background-color:#D7E3BD"><td>kBtu/sq.ft.</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td></tr></tbody></table></body></html>'
          )
        )
      );
    });
  });
});
