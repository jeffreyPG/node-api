"use strict";

const assert = require("assert");
const request = require("supertest");
const mongoose = require("mongoose");
const server = require("../../../server");
const { Building } = require("../../models/building.server.model");
const User = mongoose.model("User");

describe("Project API Functional Tests:", function () {
  let building;
  let user;
  let app;

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
  });

  afterEach(async function () {
    await User.collection.drop();
    await Building.collection.drop();
  });

  describe("Create", function () {
    it("should fail to create with invalid data", async function () {
      const response = await request(app)
        .post(`/building/${building._id}/project`)
        .send({})
        .expect(500);

      assert.equal(response.body.status, 500);
    });
  });
});
