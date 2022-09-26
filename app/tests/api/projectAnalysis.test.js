"use strict";

const assert = require("assert");
const request = require("supertest");
const mongoose = require("mongoose");
const passport = require("passport");
const sinon = require("sinon");
const nock = require("nock");
const nockBack = require("nock").back;

const server = require("../../../server");
const { Building } = require("../../models/building.server.model");
const { Project } = require("../../models/project.server.model");
const UserSchema = require("../../models/user.server.model");
const User = mongoose.model("User");

//nock.recorder.rec();

describe("Analysis API Functional Tests:", function () {
  let app;
  let authenticate;
  let building;
  let project;
  let user;

  beforeEach(async function () {
    const { express } = server;
    app = await express();
  });

  beforeEach(async function () {
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
    project = await Project.create({
      name: "none",
      description: "projectdescription1",
      displayName: "projectname1",
      originalDisplayName: "projectname1",
      project_category: "category1"
    });
  });

  beforeEach(() => {
    authenticate = sinon.stub(passport, "authenticate").returns(() => {});
  });

  afterEach(() => {
    authenticate.restore();
  });

  afterEach(async function () {
    await User.collection.drop();
    await Building.collection.drop();
    await Project.collection.drop();
  });

  describe("Create", function () {
    beforeEach(function () {
      authenticate.yields(null, { id: 1 });
    });

    beforeEach(function () {
      nock(process.env.ANALYSIS_API_IP + ":3000")
        .post("/prescriptive")
        .reply(200, {
          "energy-savings": 0,
          "annual-savings": { "electric-charge": 0, "gas-charge": 0 },
          "utility-incentive": 0,
          "cash-flows": {
            initial: 0,
            simple_payback: null,
            cash_flows: [
              { year: 1, PV: 0, NPV: 0, IRR: null, SIR: null },
              { year: 2, PV: 0, NPV: 0, IRR: null, SIR: null },
              { year: 3, PV: 0, NPV: 0, IRR: null, SIR: null },
              { year: 4, PV: 0, NPV: 0, IRR: null, SIR: null },
              { year: 5, PV: 0, NPV: 0, IRR: null, SIR: null },
              { year: 6, PV: 0, NPV: 0, IRR: null, SIR: null },
              { year: 7, PV: 0, NPV: 0, IRR: null, SIR: null },
              { year: 8, PV: 0, NPV: 0, IRR: null, SIR: null },
              { year: 9, PV: 0, NPV: 0, IRR: null, SIR: null },
              { year: 10, PV: 0, NPV: 0, IRR: null, SIR: null }
            ]
          },
          "calculation-type": "calculated-savings"
        });
    });

    it("should succeed", async function () {
      const response = await request(app)
        .post(`/building/${building._id}/project/${project._id}/analysis`)
        .send({})
        .expect(200);
    });

    it("should fail with invalid building", async function () {
      const response = await request(app)
        .post(`/building/123/project/${project._id}/analysis`)
        .send({})
        .expect(500);
    });

    it("should fail with invalid project", async function () {
      const response = await request(app)
        .post(`/building/${building._id}/project/123/analysis`)
        .send({})
        .expect(500);
    });

    it("should return the results", async function () {
      const response = await request(app)
        .post(`/building/${building._id}/project/${project._id}/analysis`)
        .send({});

      assert(response.body.analysis);
    });

    context("prescriptive analysis", function () {
      beforeEach(function () {
        nock("http://analysis-qa.buildee.com:3000", {
          encodedQueryParams: true
        })
          .post("/prescriptive", {
            measure: { name: "none" },
            incentive: { input: 0, incentive_type: "none" },
            finance: {
              discount_rate: 1,
              finance_rate: 1,
              inflation_rate: 1,
              reinvestment_rate: 1,
              investment_period: 10,
              project_cost: 0,
              maintenance_savings: 0
            },
            utility: {}
          })
          .reply(200, {
            "energy-savings": 0,
            "annual-savings": { "electric-charge": 0, "gas-charge": 0 },
            "utility-incentive": 0,
            "cash-flows": {
              initial: 0,
              simple_payback: null,
              cash_flows: [
                { year: 1, PV: 0, NPV: 0, IRR: null, SIR: null },
                { year: 2, PV: 0, NPV: 0, IRR: null, SIR: null },
                { year: 3, PV: 0, NPV: 0, IRR: null, SIR: null },
                { year: 4, PV: 0, NPV: 0, IRR: null, SIR: null },
                { year: 5, PV: 0, NPV: 0, IRR: null, SIR: null },
                { year: 6, PV: 0, NPV: 0, IRR: null, SIR: null },
                { year: 7, PV: 0, NPV: 0, IRR: null, SIR: null },
                { year: 8, PV: 0, NPV: 0, IRR: null, SIR: null },
                { year: 9, PV: 0, NPV: 0, IRR: null, SIR: null },
                { year: 10, PV: 0, NPV: 0, IRR: null, SIR: null }
              ]
            },
            "calculation-type": "calculated-savings"
          });
      });

      it("should call analysis api", async function () {
        project = await Project.create({
          name: "none",
          description: "projectdescription1",
          displayName: "projectname1",
          originalDisplayName: "projectname1",
          project_category: "category1",
          analysisType: "prescriptive"
        });

        const response = await request(app)
          .post(`/building/${building._id}/project/${project._id}/analysis`)
          .expect(200);
      });
    });

    context("simulation analysis", function () {
      beforeEach(function () {
        nock(process.env.MODELING_API_URL, { encodedQueryParams: true })
          .post("/baseline", {})
          .reply(200, { _id: "64d16b71-7b6c-4b7d-a9b6-319647a8924e" });

        nock(process.env.MODELING_API_URL, { encodedQueryParams: true })
          .post("/baseline/64d16b71-7b6c-4b7d-a9b6-319647a8924e/measure", {
            name: "none"
          })
          .reply(200, { _id: "9f34b5e4-2fa6-45d7-9042-4e235e502e97" });

        nock(process.env.MODELING_API_URL, { encodedQueryParams: true })
          .post("/baseline/64d16b71-7b6c-4b7d-a9b6-319647a8924e/measure", {
            name: "none"
          })
          .reply(200, { _id: "9f34b5e4-2fa6-45d7-9042-4e235e502e97" });
      });

      it("should call simulation api", async function () {
        project = await Project.create({
          name: "none",
          description: "projectdescription1",
          displayName: "projectname1",
          originalDisplayName: "projectname1",
          project_category: "category1",
          analysisType: "simulation"
        });

        const response = await request(app)
          .post(`/building/${building._id}/project/${project._id}/analysis`)
          .expect(200);
      });
    });
  });
});
