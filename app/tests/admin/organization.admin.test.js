"use strict";

const assert = require("assert");
const request = require("supertest");
const passport = require("passport");
const sinon = require("sinon");
const faker = require("faker");
const server = require("../../../server");
const { Organization } = require("../../models/organization.server.model");
const { User } = require("../../models/user.server.model");

describe.skip("Organization API Functional Tests", function() {
  let app;
  let authenticate;
  let organization;
  let user;

  try {
    Organization.collection.drop();
    User.collection.drop();
  } catch (err) {
    console.error(err);
  }

  beforeEach(async function loadServer() {
    const { express } = server;
    app = await express();
  });

  beforeEach(async function loadData() {
    organization = await Organization.create({
      name: faker.internet.userName(),
      orgType: "root"
    });
    user = await User.create({
      email: faker.internet.email(),
      username: faker.internet.userName(),
      password: faker.internet.password()
    });
  });

  beforeEach(function stubAuthenticate() {
    authenticate = sinon.stub(passport, "authenticate").returns(() => {});
  });

  beforeEach(function restoreAuthenticate() {
    authenticate && authenticate.restore();
  });

  beforeEach(async function dropData() {
    try {
      await Organization.collection.drop();
      await User.collection.drop();
    } catch (err) {
      console.error(err);
    }
  });

  describe("Get", function() {
    beforeEach(function() {
      authenticate.yields(null, { _id: 1, isAdmin: true });
    });

    it("should return success", async function() {
      const response = await request(app).get("/admin/v2/organizations");

      assert.equal(response.status, 200);
    });

    it("should succeed with expected response body", async function() {
      const response = await request(app).get("/admin/v2/organizations");

      assert.equal(response.body.length, 1);
      assert.equal(response.body[0]._id, organization._id.toString());
    });
  });

  describe("User Create", function() {
    beforeEach(function() {
      authenticate.yields(null, { _id: 1, isAdmin: true });
    });

    it("should return success", async function() {
      await request(app)
        .post(
          `/admin/v2/organizations/${organization._id.toString()}/user/${user._id.toString()}`
        )
        .send({})
        .expect(200);
    });

    it("returns unauthorized", async function() {
      authenticate.yields(null, { _id: 1, isAdmin: false });
      await request(app)
        .post(
          `/admin/v2/organizations/${organization._id.toString()}/user/${user._id.toString()}`
        )
        .send({})
        .expect(401);
    });

    it("should return object", async function() {
      const response = await request(app)
        .post(
          `/admin/v2/organizations/${organization._id.toString()}/user/${user._id.toString()}`
        )
        .send({});

      assert.equal(response.body._id, organization._id.toString());
    });
  });
});
