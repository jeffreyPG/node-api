"use strict";

const assert = require("assert");
const request = require("supertest");
const passport = require("passport");
const sinon = require("sinon");
const server = require("../../../server");
const { Feature } = require("../../types/feature/feature.model");

describe("Feature API Functional Tests", function () {
  let app;
  let authenticate;
  let feature;

  Feature.collection.drop();

  beforeEach(async function () {
    const { express } = server;
    app = await express();
  });

  beforeEach(async function () {
    feature = await Feature.create({
      name: "testfeature"
    });
  });

  beforeEach(() => {
    authenticate = sinon.stub(passport, "authenticate").returns(() => {});
  });

  afterEach(() => {
    authenticate.restore();
  });

  afterEach(async function () {
    await Feature.collection.drop();
  });

  describe("Get", function () {
    beforeEach(function () {
      authenticate.yields(null, { id: 1 });
    });

    it("should return success", async function () {
      const response = await request(app)
        .get("/admin/feature")
        .set({ admin: process.env.ADMIN_ENDPOINTS });

      assert.equal(response.status, 200);
    });

    it("should succeed with expected response body", async function () {
      const response = await request(app)
        .get("/admin/feature")
        .set({ admin: process.env.ADMIN_ENDPOINTS });

      assert.equal(response.body.features.length, 1);
      assert.equal(response.body.features[0]._id, feature.id.toString());
    });

    it("should return expected response message", async function () {
      const response = await request(app)
        .get("/admin/feature")
        .set({ admin: process.env.ADMIN_ENDPOINTS });

      assert.equal(response.body.status, "Success");
      assert.equal(response.body.message, "Retrieved Features");
    });
  });

  describe("Create", function () {
    beforeEach(function () {
      authenticate.yields(null, { id: 1 });
    });

    it("should fail with invalid data", async function () {
      const response = await request(app)
        .post("/admin/feature")
        .set({ admin: process.env.ADMIN_ENDPOINTS })
        .send({})
        .expect(400);

      assert.equal(response.body.message, "name is required");
    });

    it("should fail with duplicate name", async function () {
      await Feature.create({ name: "existingfeature" });

      const response = await request(app)
        .post("/admin/feature")
        .set({ admin: process.env.ADMIN_ENDPOINTS })
        .send({ name: "existingfeature" })
        .expect(500);

      assert.equal(response.body.message, "name already exists");
    });

    it("should succeed with valid data", async function () {
      const response = await request(app)
        .post("/admin/feature")
        .set({ admin: process.env.ADMIN_ENDPOINTS })
        .send({ name: "mytestfeature" })
        .expect(200);

      assert.equal(response.body.status, "Success");
    });

    it("should return the created document", async function () {
      const response = await request(app)
        .post("/admin/feature")
        .set({ admin: process.env.ADMIN_ENDPOINTS })
        .send({ name: "mytestfeature" });

      assert.equal(response.body.feature.name, "mytestfeature");
    });
  });

  describe("Update", function () {
    beforeEach(function () {
      authenticate.yields(null, { id: 1 });
    });

    it("should return bad request", async function () {
      const invalidFeatureId = "123";

      const response = await request(app)
        .put(`/admin/feature/${invalidFeatureId}`)
        .set({ admin: process.env.ADMIN_ENDPOINTS })
        .send({})
        .expect(400);

      assert.equal(response.body.message, "Feature ID must be valid");
    });

    it("should return not found", async function () {
      await feature.remove();

      const response = await request(app)
        .put(`/admin/feature/${feature._id}`)
        .set({ admin: process.env.ADMIN_ENDPOINTS })
        .send({})
        .expect(404);

      assert.equal(response.body.message, "Feature not found");
    });

    it("should fail with invalid data", async function () {
      const response = await request(app)
        .put("/admin/feature/123")
        .set({ admin: process.env.ADMIN_ENDPOINTS })
        .send({})
        .expect(400);
    });

    it("should succeed with valid data", async function () {
      const response = await request(app)
        .put(`/admin/feature/${feature._id}`)
        .set({ admin: process.env.ADMIN_ENDPOINTS })
        .send({ name: "myupdatedtestfeature", enabled: true })
        .expect(200);

      assert.equal(response.body.status, "Success");
      assert.equal(response.body.feature.name, "myupdatedtestfeature");
      assert.equal(response.body.feature.enabled, true);
    });

    it("should succeed with expected response body", async function () {
      const response = await request(app)
        .put(`/admin/feature/${feature._id}`)
        .set({ admin: process.env.ADMIN_ENDPOINTS })
        .send({ name: "myupdatedtestfeature" });

      assert.equal(response.body.feature.name, "myupdatedtestfeature");
    });
  });

  describe("Delete", function () {
    beforeEach(function () {
      authenticate.yields(null, { id: 1 });
    });

    it("should fail with invalid data", async function () {
      const invalidFeatureId = "123";

      const response = await request(app)
        .delete(`/admin/feature/${invalidFeatureId}`)
        .set({ admin: process.env.ADMIN_ENDPOINTS })
        .expect(404);
    });

    it("should succeed with valid data", async function () {
      const response = await request(app)
        .delete(`/admin/feature/${feature._id}`)
        .set({ admin: process.env.ADMIN_ENDPOINTS })
        .expect(200);
    });
  });
});
