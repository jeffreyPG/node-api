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

describe("Report Chart", function() {
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
      name: "Chart Date Test",
      styledDoc: "",
      header: { image: "", text: "" },
      body: [
        {
          fields: [
            "chart.reportName.Energy End Use Breakdown - All Fuels Actual",
            "charts.Url.http://18.221.83.122:80/api/3.6/sites/0d8956fe-3e21-470c-a195-2da4b0ece5e4/views/da27dd18-8720-4bbc-b385-c468ef373b4c/image?",
            "chart.param."
          ],
          dataLabels: "show",
          metaData: {
            yearRange: "12"
          },
          type: "chart",
          target: "charts",
          ele: "img",
          projectConfig: {},
          equipmentConfig: {},
          dividerConfig: {}
        },
        {
          fields: [
            "chart.reportName.Energy End Use Breakdown - All Fuels Actual",
            "charts.Url.http://18.221.83.122:80/api/3.6/sites/0d8956fe-3e21-470c-a195-2da4b0ece5e4/views/b29402b4-143d-42c6-b02f-ce0a53e7258a/image?",
            "chart.param."
          ],
          dataLabels: "show",
          type: "chart",
          target: "charts",
          ele: "img",
          metaData: {
            yearRange: "Custom",
            selectedStartMonth: "January",
            selectedStartYear: "2017",
            selectedEndMonth: "January",
            selectedEndYear: "2019"
          },
          projectConfig: {},
          equipmentConfig: {},
          dividerConfig: {}
        },
        {
          fields: [
            "chart.reportName.Energy End Use Breakdown - All Fuels Actual",
            "charts.Url.http://18.221.83.122:80/api/3.6/sites/0d8956fe-3e21-470c-a195-2da4b0ece5e4/views/da27dd18-8720-4bbc-b385-c468ef373b4c/image?",
            "chart.param."
          ],
          dataLabels: "show",
          metaData: {
            yearRange: "Last 36 months",
            selectedStartMonth: "January",
            selectedStartYear: "2018",
            selectedEndMonth: "May",
            selectedEndYear: "2020"
          },
          type: "chart",
          target: "charts",
          ele: "img",
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
    it("should work for month range", async function() {
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
            `<p><img src="http://localhost/api/charts?url=http://18.221.83.122:80/api/3.6/sites/0d8956fe-3e21-470c-a195-2da4b0ece5e4/views/da27dd18-8720-4bbc-b385-c468ef373b4c/image?vf_building_id=${building._id.toString()}&amp;vf_months=12" width="600" alt="chartImg" /></p>`
          )
        )
      );
    });

    it("should work for month range display values", async function() {
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
            `<p><img src="http://localhost/api/charts?url=http://18.221.83.122:80/api/3.6/sites/0d8956fe-3e21-470c-a195-2da4b0ece5e4/views/da27dd18-8720-4bbc-b385-c468ef373b4c/image?vf_building_id=${building._id.toString()}&amp;vf_months=36" width="600" alt="chartImg" /></p>`
          )
        )
      );
    });

    it("should work for custom range", async function() {
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
            `<p><img src="http://localhost/api/charts?url=http://18.221.83.122:80/api/3.6/sites/0d8956fe-3e21-470c-a195-2da4b0ece5e4/views/b29402b4-143d-42c6-b02f-ce0a53e7258a/image?vf_building_id=${building._id.toString()}&amp;vf_start_month=1&amp;vf_start_year=2017&amp;vf_end_month=1&amp;vf_end_year=2019" width="600" alt="chartImg" /></p>`
          )
        )
      );
    });
  });
});
