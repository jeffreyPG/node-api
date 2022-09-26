"use strict";

const assert = require("assert");
const request = require("supertest");
const mongoose = require("mongoose");
const server = require("../../../server");
const UserSchema = require("../../models/user.server.model");
const User = mongoose.model("User");
const { Building } = require("../../models/building.server.model");
const { Action } = require("../../models/action.server.model");
const { Location } = require("../../models/location.server.model");

describe("BSXML API Functional Tests:", function() {
  let app;
  let action;
  let building;
  let user;

  beforeEach(async function() {
    const { express } = server;
    app = await express();
  });

  beforeEach(async function() {
    user = await User.create({
      email: "test@test.com",
      password: "password"
    });
    action = await Action.create({
      description: "testactiondescription",
      name: "testaction",
      contacts: []
    });
    const location = await Location.create({
      usetype: "testuse",
      name: "testlocation"
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
      },
      locations: [
        {
          location,
          equipment: []
        }
      ]
    });
  });

  afterEach(async function() {
    await Action.collection.drop();
    await Location.collection.drop();
    await Building.collection.drop();
    await User.collection.drop();
  });

  it("should fail to create with invalid request data", async function() {
    const response = await request(app)
      .get(`/report/user/${user._id}/building/123/bsxml`)
      .query({ action: action._id.toString() })
      .expect(500);

    assert.equal(response.body.status, 500);
  });

  it("should return success", async function() {
    const response = await request(app)
      .get(`/report/user/${user._id}/building/${building._id}/bsxml`)
      .query({ action: action._id.toString() });

    assert.equal(response.status, 200);
  });

  it("should return expected content type", async function() {
    const response = await request(app)
      .get(`/report/user/${user._id}/building/${building._id}/bsxml`)
      .query({ action: action._id.toString() });

    assert.equal(response.type, "application/xml");
  });
});
