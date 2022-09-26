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

const User = mongoose.model("User");

describe("Building End Use API Functional Tests:", function() {
  let sandbox = sinon.createSandbox();

  let building;
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
  });

  afterEach(async function() {
    await Building.collection.drop();
    await User.collection.drop();
  });

  describe("Create", function() {
    it("succeeds", async function() {
      await request(app)
        .get(`/building/${building._id}/enduseActualUtil`)
        .expect(200);
    });

    it("returns expected response", async function() {
      const response = await request(app).get(
        `/building/${building._id}/enduseActualUtil`
      );

      assert.deepEqual(response.body, {
        status: "Success",
        message: "Actual End Use",
        actualEndUse: endUseBreakdownFixture
      });
    });

    it("persists building end use", async function() {
      assert.deepEqual(building.endUseActual, {});

      await request(app)
        .get(`/building/${building._id}/enduseActualUtil`)
        .expect(200);

      const { endUseActual } = await Building.findById(building._id);
      assert.deepEqual(endUseActual, endUseBreakdownFixture);
    });

    it("persists actual end use", async function() {
      await request(app)
        .get(`/building/${building._id}/enduseActualUtil`)
        .expect(200);

      const count = await ActualEndUse.count({ building: building._id });
      assert.equal(count, 1);
    });
  });
});
