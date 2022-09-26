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
const User = mongoose.model("User");

describe("Report Overview", function() {
  let sandbox = sinon.createSandbox();

  let app;
  let building;
  let user;
  let template;

  nock.disableNetConnect();
  nock.enableNetConnect(/127.0.0.1.*/);

  beforeEach(function() {
    sandbox.replace(reportEubClientUtility, "getEndUseBreakdown", sinon.stub());
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
      name: "Overview Test",
      styledDoc: "",
      header: { image: "", text: "" },
      body: [
        {
          fields: [
            "summary.totalCost",
            "portfolioManager.percentMedian",
            "electricity.electricityEui",
            "water.water.waterWUI",
            "naturalGas.naturalGasEui",
            "steam.steam.waterWUI",
            "fuelOil2.waterWUI",
            "fuelOil4.waterWUI",
            "fuelOil56.waterWUI",
            "diesel.waterWUI",
            "otherFuel.waterWUI",
            "rates.electricity",
            "ghgEmissions.totalEmissions",
            "annualUsageBenchmark.percentMedian",
            "degree.Hdd"
          ],
          dataLabels: "show",
          type: "div",
          target: "overview",
          metaData: { yearRange: "12" },
          organize: "CY",
          ele: "div"
        }
      ],
      footer: { text: "" },
      config: {
        pageNumbers: false,
        numberPosition: "",
        tableOfContents: false
      },
      createdByUserId: user._id
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
            "<html><body><div><p>Total Cost: -</p><p>Energy Star Portfolio Manager Score: -</p><p>Electricity EUI: -</p><p>Water WUI ([units]/sq.ft.): -</p><p>Natural Gas EUI: -</p><p>Steam EUI ([units]/sq.ft.): -</p><p>Fuel Oil 2 EUI ([units]/sq.ft.): -</p><p>Fuel Oil 4 EUI ([units]/sq.ft.): -</p><p>Fuel Oil 5 &amp; 6 EUI ([units]/sq.ft.): -</p><p>Diesel EUI ([units]/sq.ft.): -</p><p>Other EUI ([units]/sq.ft.): -</p><p>Electricity rate: -</p><p>Total Emissions (mtCO2e): -</p><p>% vs Median: -</p><p>HDD: -</p></div></body></html>"
          )
        )
      );
    });
  });
});
