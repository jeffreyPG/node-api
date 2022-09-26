const assert = require("assert");
const gql = require("graphql-tag");
const { createTestClient } = require("apollo-server-testing");

const { constructTestServer } = require("./__utils");
const { Project } = require("../../models/project.server.model");
const { User } = require("../../models/user.server.model");

const GET_PROJECT_CATEGORIZATION = gql`
  query ProjectCategorization {
    projectCategorization {
      categories
      applications
      technologies
    }
  }
`;

describe("Projects", () => {
  let project1;
  let project2;
  let user;

  beforeEach(async function() {
    try {
      await Project.collection.drop();
      await User.collection.drop();
    } catch (err) {
      console.error(err);
    }

    project1 = await Project.create({
      name: "testproject",
      displayName: "testprojectdisplay",
      originalDisplayName: "testprojectdisplay",
      project_category: "Category1",
      project_application: "Application1",
      project_technology: "Technology2"
    });

    project2 = await Project.create({
      name: "testproject",
      displayName: "testprojectdisplay",
      originalDisplayName: "testprojectdisplay",
      project_category: "Category1",
      project_application: null,
      project_technology: "Technology1"
    });

    user = await User.create({
      name: "test",
      email: "test@test.com",
      password: "password"
    });
  });

  afterEach(async function() {
    await Project.collection.drop();
    await User.collection.drop();
  });

  it("fetches categorization values", async () => {
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
      query: GET_PROJECT_CATEGORIZATION
    });

    assert.deepEqual(data.projectCategorization, {
      categories: ["Category1"],
      applications: ["Application1"],
      technologies: ["Technology1", "Technology2"]
    });
  });
});
