"use strict";

const assert = require("assert");
const request = require("supertest");
const sinon = require("sinon");
const passport = require("passport");

const server = require("../../../server");
const { Feature } = require("../../types/feature/feature.model");
const { FeatureUser } = require("../../types/feature/featureuser.model");
const { User } = require("../../models/user.server.model");

describe("Feature User API Functional Tests", function() {
  let app;
  let authenticate;
  let feature;
  let featureuser;
  let user;

  beforeEach(async function() {
    const { express } = server;
    app = await express();
  });

  beforeEach(async function() {
    feature = await Feature.create({
      name: "testfeature"
    });

    user = await User.create({
      name: "test",
      email: "test@test.com",
      password: "password"
    });

    featureuser = await FeatureUser.create({
      feature: feature._id,
      user: user._id
    });
  });

  beforeEach(() => {
    authenticate = sinon.stub(passport, "authenticate").returns(() => {});
  });

  afterEach(() => {
    authenticate.restore();
  });

  afterEach(async function() {
    await Feature.collection.drop();
    await User.collection.drop();
    await FeatureUser.collection.drop();
  });

  describe("Get", function() {
    beforeEach(function() {
      authenticate.yields(null, { id: 1 });
    });

    it("should return success", async function() {
      const response = await request(app)
        .get("/admin/feature/user")
        .set({ admin: process.env.ADMIN_ENDPOINTS });

      assert.equal(response.status, 200);
    });

    it("should succeed with expected response body", async function() {
      const response = await request(app)
        .get("/admin/feature/user")
        .set({ admin: process.env.ADMIN_ENDPOINTS });

      assert.equal(response.body.featureusers.length, 1);
      assert.equal(
        response.body.featureusers[0]._id,
        featureuser.id.toString()
      );
    });

    it("should return expected response message", async function() {
      const response = await request(app)
        .get("/admin/feature/user")
        .set({ admin: process.env.ADMIN_ENDPOINTS });

      assert.equal(response.body.status, "Success");
      assert.equal(response.body.message, "Retrieved Feature Users");
    });

    it("should succeed with empty response body", async function() {
      await feature.remove();

      const response = await request(app)
        .get("/admin/feature/user")
        .set({ admin: process.env.ADMIN_ENDPOINTS });

      assert.equal(response.body.featureusers.length, 1);
    });
  });

  describe("Create", function() {
    beforeEach(function() {
      authenticate.yields(null, { id: 1 });
    });

    beforeEach(async function() {
      await FeatureUser.remove({});
    });

    it("should fail with invalid data", async function() {
      const response = await request(app)
        .post("/admin/feature/user")
        .set({ admin: process.env.ADMIN_ENDPOINTS })
        .send({})
        .expect(400);

      assert.equal(response.body.message, "Feature and User are required");
    });

    it("should succeed with valid data", async function() {
      const featureuserCount = await FeatureUser.count();

      const response = await request(app)
        .post("/admin/feature/user")
        .set({ admin: process.env.ADMIN_ENDPOINTS })
        .send({ feature: feature._id, user: user._id })
        .expect(200);

      assert.equal(response.body.status, "Success");
      assert.equal(await FeatureUser.count(), featureuserCount + 1);
    });

    it("should return not modified", async function() {
      await FeatureUser.create({ feature, user });

      const featureuserCount = await FeatureUser.count();

      const response = await request(app)
        .post("/admin/feature/user")
        .set({ admin: process.env.ADMIN_ENDPOINTS })
        .send({ feature: feature._id, user: user._id })
        .expect(304);

      assert.equal(await FeatureUser.count(), featureuserCount);
    });
  });

  describe("Delete", function() {
    beforeEach(function() {
      authenticate.yields(null, { id: 1 });
    });

    it("should return bad request", async function() {
      const invalidId = "123";

      const response = await request(app)
        .delete(`/admin/feature/user/${invalidId}`)
        .set({ admin: process.env.ADMIN_ENDPOINTS })
        .expect(400);
    });

    it("should return not found", async function() {
      await featureuser.remove();

      const response = await request(app)
        .delete(`/admin/feature/user/${featureuser._id}`)
        .set({ admin: process.env.ADMIN_ENDPOINTS })
        .expect(404);
    });

    it("should succeed with valid data", async function() {
      const response = await request(app)
        .delete(`/admin/feature/user/${featureuser._id}`)
        .set({ admin: process.env.ADMIN_ENDPOINTS })
        .expect(200);
    });
  });

  context("Batch", function() {
    beforeEach(function() {
      authenticate.yields(null, { id: 1 });
    });

    describe("Delete", function() {
      it("should return bad request", async function() {
        const invalidId = "123";

        const response = await request(app)
          .delete("/admin/feature/user/batch")
          .set({ admin: process.env.ADMIN_ENDPOINTS })
          .send({ feature: invalidId })
          .expect(400);
      });

      it("should return not found", async function() {
        await feature.remove();

        const response = await request(app)
          .delete("/admin/feature/user")
          .set({ admin: process.env.ADMIN_ENDPOINTS })
          .send({ feature: feature._id, users: [user._id] })
          .expect(404);
      });

      it("should succeed with valid data", async function() {
        const response = await request(app)
          .delete("/admin/feature/user/batch")
          .set({ admin: process.env.ADMIN_ENDPOINTS })
          .send({ feature: feature._id, users: [user._id] })
          .expect(200);
      });
    });

    describe("Create", function() {
      it("should fail with invalid data", async function() {
        const response = await request(app)
          .post("/admin/feature/user/batch")
          .set({ admin: process.env.ADMIN_ENDPOINTS })
          .send({})
          .expect(400);

        assert.equal(response.body.message, "Feature and Users are required");
      });

      it("should succeed with valid data", async function() {
        const featureuserCount = await FeatureUser.count();
        const user2 = await User.create({
          name: "test",
          email: "test@test.com",
          password: "password"
        });

        const response = await request(app)
          .post("/admin/feature/user/batch")
          .set({ admin: process.env.ADMIN_ENDPOINTS })
          .send({ feature: feature._id, users: [user._id, user2._id] })
          .expect(200);

        assert.equal(response.body.status, "Success");
        assert.equal(await FeatureUser.count(), featureuserCount + 1);
      });
    });
  });
});
