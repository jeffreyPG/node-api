const assert = require("assert");
const gql = require("graphql-tag");
const { createTestClient } = require("apollo-server-testing");

const { constructTestServer } = require("./__utils");
const { Feature } = require("../../types/feature/feature.model");
const { FeatureUser } = require("../../types/feature/featureuser.model");
const { User } = require("../../models/user.server.model");

const GET_ENABLED_FEATURES = gql`
  query enabledFeatures {
    enabledFeatures {
      _id
      name
      enabled
    }
  }
`;

const GET_FEATURE = gql`
  query Feature($feature: GetFeatureInput) {
    feature(feature: $feature) {
      _id
      name
      enabled
    }
  }
`;

describe("Features", () => {
  let user;
  let feature;
  let featureuser;

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

  afterEach(async function() {
    await Feature.collection.drop();
    await User.collection.drop();
    await FeatureUser.collection.drop();
  });

  it("fetches list of enabled features", async () => {
    await feature.updateOne({ $set: { enabled: true } });

    // create an instance of ApolloServer that mocks out context, while reusing
    // existing dataSources, resolvers, and typeDefs.
    // This function returns the server instance as well as our dataSource
    // instances, so we can overwrite the underlying fetchers
    const { server, database } = await constructTestServer({
      context: () => ({ user: user.toObject(), isLoggedIn: true })
    });

    // use our test server as input to the createTestClient fn
    // This will give us an interface, similar to apolloClient.query
    // to run queries against our instance of ApolloServer
    const { query } = createTestClient(server);
    const { data } = await query({
      query: GET_ENABLED_FEATURES
    });

    assert.equal(data.enabledFeatures.length, 1);
    assert.equal(data.enabledFeatures[0].name, feature.name);
  });

  it("filters disabled features", async () => {
    await feature.updateOne({ $set: { enabled: false } });

    // create an instance of ApolloServer that mocks out context, while reusing
    // existing dataSources, resolvers, and typeDefs.
    // This function returns the server instance as well as our dataSource
    // instances, so we can overwrite the underlying fetchers
    const { server, database } = await constructTestServer({
      context: () => ({ user: user.toObject(), isLoggedIn: true })
    });

    // use our test server as input to the createTestClient fn
    // This will give us an interface, similar to apolloClient.query
    // to run queries against our instance of ApolloServer
    const { query } = createTestClient(server);
    const { data } = await query({
      query: GET_ENABLED_FEATURES
    });

    assert.equal(data.enabledFeatures.length, 0);
  });

  it("requires login", async () => {
    await feature.updateOne({ $set: { enabled: false } });

    // create an instance of ApolloServer that mocks out context, while reusing
    // existing dataSources, resolvers, and typeDefs.
    // This function returns the server instance as well as our dataSource
    // instances, so we can overwrite the underlying fetchers
    const { server, database } = await constructTestServer({
      context: () => ({ user: user.toObject(), isLoggedIn: false })
    });

    // use our test server as input to the createTestClient fn
    // This will give us an interface, similar to apolloClient.query
    // to run queries against our instance of ApolloServer
    const { query } = createTestClient(server);
    const { data } = await query({
      query: GET_ENABLED_FEATURES
    });

    assert.equal(data.enabledFeatures.length, 0);
  });

  it("requires a user", async () => {
    await feature.updateOne({ $set: { enabled: false } });

    // create an instance of ApolloServer that mocks out context, while reusing
    // existing dataSources, resolvers, and typeDefs.
    // This function returns the server instance as well as our dataSource
    // instances, so we can overwrite the underlying fetchers
    const { server, database } = await constructTestServer({
      context: () => ({ isLoggedIn: true })
    });

    // use our test server as input to the createTestClient fn
    // This will give us an interface, similar to apolloClient.query
    // to run queries against our instance of ApolloServer
    const { query } = createTestClient(server);
    const { data } = await query({
      query: GET_ENABLED_FEATURES
    });

    assert.equal(data.enabledFeatures.length, 0);
  });

  context("query feature", () => {
    it("gets a feature", async () => {
      // create an instance of ApolloServer that mocks out context, while reusing
      // existing dataSources, resolvers, and typeDefs.
      // This function returns the server instance as well as our dataSource
      // instances, so we can overwrite the underlying fetchers
      const { server, database } = await constructTestServer({
        context: () => ({ isLoggedIn: true })
      });

      // use our test server as input to the createTestClient fn
      // This will give us an interface, similar to apolloClient.query
      // to run queries against our instance of ApolloServer
      const { query } = createTestClient(server);
      const { data } = await query({
        query: GET_FEATURE,
        variables: { feature: { name: "testfeature" } }
      });
      console.log(data);

      assert.equal(data.feature.name, "testfeature");
    });

    it("matches feature name", async () => {
      // create an instance of ApolloServer that mocks out context, while reusing
      // existing dataSources, resolvers, and typeDefs.
      // This function returns the server instance as well as our dataSource
      // instances, so we can overwrite the underlying fetchers
      const { server, database } = await constructTestServer({
        context: () => ({ isLoggedIn: true })
      });

      // use our test server as input to the createTestClient fn
      // This will give us an interface, similar to apolloClient.query
      // to run queries against our instance of ApolloServer
      const { query } = createTestClient(server);
      const { data } = await query({
        query: GET_FEATURE,
        variables: { feature: { name: "nonexistentfeature" } }
      });

      assert.equal(data.feature, null);
    });

    it("accepts empty input", async () => {
      // create an instance of ApolloServer that mocks out context, while reusing
      // existing dataSources, resolvers, and typeDefs.
      // This function returns the server instance as well as our dataSource
      // instances, so we can overwrite the underlying fetchers
      const { server, database } = await constructTestServer({
        context: () => ({ isLoggedIn: true })
      });

      // use our test server as input to the createTestClient fn
      // This will give us an interface, similar to apolloClient.query
      // to run queries against our instance of ApolloServer
      const { query } = createTestClient(server);
      const { data } = await query({
        query: GET_FEATURE,
        variables: { feature: {} }
      });

      assert.equal(data, null);
    });

    it("requires login", async () => {
      // create an instance of ApolloServer that mocks out context, while reusing
      // existing dataSources, resolvers, and typeDefs.
      // This function returns the server instance as well as our dataSource
      // instances, so we can overwrite the underlying fetchers
      const { server, database } = await constructTestServer({
        context: () => ({ isLoggedIn: false })
      });

      // use our test server as input to the createTestClient fn
      // This will give us an interface, similar to apolloClient.query
      // to run queries against our instance of ApolloServer
      const { query } = createTestClient(server);
      const { data } = await query({
        query: GET_FEATURE,
        variables: { feature: { name: "testfeature" } }
      });

      assert.equal(data.feature, null);
    });
  });
});
