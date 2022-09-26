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
const User = mongoose.model("User");

describe("Report", function() {
  let sandbox = sinon.createSandbox();

  let app;
  let building;
  let user;
  let template;

  nock.disableNetConnect();
  nock.enableNetConnect(/127.0.0.1.*/);

  beforeEach(function() {
    sandbox.replace(reportEubClientUtility, "getEndUseBreakdown", sinon.stub());
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
      createdByUserId: user._id,
      name: "testtemplate"
    });
  });

  afterEach(async function() {
    await User.collection.drop();
    await Building.collection.drop();
    await Template.collection.drop();
  });

  afterEach(() => {
    // Restore the default sandbox here
    sinon.restore();
  });

  describe("Get", function() {
    context("when valid", function() {
      it("should succeed", async function() {
        const response = await request(app).get(
          `/report/user/${user._id}/building/${building._id}/template/${template._id}`
        );

        assert.equal(response.status, 200);
        assert(response.body, { status: "Success" });
      });
    });

    context("when invalid", function() {
      it("should fail", async function() {
        const response = await request(app).get(
          `/report/user/${user._id}/building/${building._id}/template/123`
        );

        assert.equal(response.status, 500);
        assert(response.body, { status: "Error" });
      });
    });

    context("text blocks", function() {
      context("with special characters", function() {
        beforeEach(async function() {
          template = await Template.create({
            header: { image: "", text: "" },
            footer: { text: "" },
            config: {
              pageNumbers: false,
              numberPosition: "",
              tableOfContents: false
            },
            name: "testtemplate",
            styledDoc: "",
            body: [
              {
                fields: [],
                dataLabels: "show",
                type: "text",
                content: "!@#$%^&*()[]{}/<>'\"",
                ele: "p"
              }
            ],
            createdByUserId: user._id
          });
        });

        it("should generate expected output", async function() {
          const reportClient = require("../../controllers/api/utils/api.report.client");
          const spy = sinon.spy(reportClient, "getWordReport");
          await request(app).get(
            `/report/user/${user._id}/building/${building._id}/template/${template._id}`
          );

          sinon.assert.calledWith(
            spy,
            sinon.match.has(
              "body",
              sinon.match("<p>!@#$%^&amp;*()[]{}/&lt;&gt;'\"</p>")
            )
          );
        });
      });
    });

    context("project blocks", function() {
      context("when sorted", function() {
        it("should group by category", async function() {
          const reportClient = require("../../controllers/api/utils/api.report.client");
          const spy = sinon.spy(reportClient, "getWordReport");

          const project1 = await Project.create({
            name: "project1",
            description: "projectdescription1",
            displayName: "projectname1",
            originalDisplayName: "projectname1",
            project_category: "category1"
          });
          const project2 = await Project.create({
            name: "project2",
            description: "projectdescription2",
            displayName: "projectname2",
            originalDisplayName: "projectname2",
            project_category: "category1"
          });
          const project3 = await Project.create({
            name: "project3",
            description: "projectdescription3",
            displayName: "projectname3",
            originalDisplayName: "projectname3",
            project_category: "category2"
          });
          await Building.update(building, {
            $set: { projectIds: [project1._id, project2._id, project3._id] }
          });
          template = await Template.create({
            header: { image: "", text: "" },
            footer: { text: "" },
            config: {
              pageNumbers: false,
              numberPosition: "",
              tableOfContents: false
            },
            name: "testtemplate",
            styledDoc: "",
            body: [
              {
                fields: [],
                dataLabels: "show",
                projectConfig: {
                  format: "bulletedList",
                  projectGrouping: "groupCategory",
                  filter: {
                    type: [],
                    category: [],
                    application: [],
                    technology: []
                  },
                  data: { fields: ["name", "description"] },
                  style: "unordered-list"
                },
                equipmentConfig: {},
                type: "measures",
                target: "measure",
                ele: "table"
              }
            ],
            createdByUserId: user._id
          });

          await request(app).get(
            `/report/user/${user._id}/building/${building._id}/template/${template._id}`
          );

          sinon.assert.calledWith(
            spy,
            sinon.match.has(
              "body",
              '<html><body><h3>category1</h3><ul style="list-style-type:disc"><li>projectname1<ul style="list-style-type:disc"><li>projectdescription1</li></ul></li><li>projectname2<ul style="list-style-type:disc"><li>projectdescription2</li></ul></li></ul><h3>category2</h3><ul style="list-style-type:disc"><li>projectname3<ul style="list-style-type:disc"><li>projectdescription3</li></ul></li></ul></body></html>'
            )
          );
        });

        it("should group by category and location", async function() {
          const project1 = await Project.create({
            name: "project1",
            description: "projectdescription1",
            displayName: "projectname1",
            originalDisplayName: "projectname1",
            project_category: "category1",
            location: "location1"
          });
          const project2 = await Project.create({
            name: "project2",
            description: "projectdescription2",
            displayName: "projectname2",
            originalDisplayName: "projectname2",
            project_category: "category1",
            location: "location1"
          });
          const project3 = await Project.create({
            name: "project3",
            description: "projectdescription3",
            displayName: "projectname3",
            originalDisplayName: "projectname3",
            project_category: "category2",
            location: "location2"
          });
          await Building.update(building, {
            $set: { projectIds: [project1._id, project2._id, project3._id] }
          });
          template = await Template.create({
            header: { image: "", text: "" },
            footer: { text: "" },
            config: {
              pageNumbers: false,
              numberPosition: "",
              tableOfContents: false
            },
            name: "testtemplate",
            styledDoc: "",
            body: [
              {
                fields: [],
                dataLabels: "show",
                projectConfig: {
                  format: "bulletedList",
                  projectGrouping: "groupCategoryLocation",
                  filter: {
                    type: [],
                    category: [],
                    application: [],
                    technology: []
                  },
                  data: { fields: ["name", "description"] },
                  style: "unordered-list"
                },
                equipmentConfig: {},
                type: "measures",
                target: "measure",
                ele: "table"
              }
            ],
            createdByUserId: user._id
          });

          const reportClient = require("../../controllers/api/utils/api.report.client");
          const spy = sinon.spy(reportClient, "getWordReport");

          await request(app).get(
            `/report/user/${user._id}/building/${building._id}/template/${template._id}`
          );

          sinon.assert.calledWith(
            spy,
            sinon.match.has(
              "body",
              '<html><body><h3>category1 in location1</h3><ul style="list-style-type:disc"><li>projectname1<ul style="list-style-type:disc"><li>projectdescription1</li></ul></li><li>projectname2<ul style="list-style-type:disc"><li>projectdescription2</li></ul></li></ul><h3>category2 in location2</h3><ul style="list-style-type:disc"><li>projectname3<ul style="list-style-type:disc"><li>projectdescription3</li></ul></li></ul></body></html>'
            )
          );
        });

        it("should group by category and locations", async function() {
          const location1 = await Location.create({
            name: "location1",
            usetype: "usetype1"
          });
          const location2 = await Location.create({
            name: "location2",
            usetype: "usetype2"
          });
          const project1 = await Project.create({
            name: "project1",
            description: "projectdescription1",
            displayName: "projectname1",
            originalDisplayName: "projectname1",
            project_category: "category1",
            locations: [location1._id]
          });
          const project2 = await Project.create({
            name: "project2",
            description: "projectdescription2",
            displayName: "projectname2",
            originalDisplayName: "projectname2",
            project_category: "category1",
            locations: [location1._id]
          });
          const project3 = await Project.create({
            name: "project3",
            description: "projectdescription3",
            displayName: "projectname3",
            originalDisplayName: "projectname3",
            project_category: "category2",
            locations: [location2._id]
          });
          await Building.update(building, {
            $set: { projectIds: [project1._id, project2._id, project3._id] }
          });
          template = await Template.create({
            header: { image: "", text: "" },
            footer: { text: "" },
            config: {
              pageNumbers: false,
              numberPosition: "",
              tableOfContents: false
            },
            name: "testtemplate",
            styledDoc: "",
            body: [
              {
                fields: [],
                dataLabels: "show",
                projectConfig: {
                  format: "bulletedList",
                  projectGrouping: "groupCategoryLocation",
                  filter: {
                    type: [],
                    category: [],
                    application: [],
                    technology: []
                  },
                  data: { fields: ["name", "description"] },
                  style: "unordered-list"
                },
                equipmentConfig: {},
                type: "measures",
                target: "measure",
                ele: "table"
              }
            ],
            createdByUserId: user._id
          });

          const reportClient = require("../../controllers/api/utils/api.report.client");
          const spy = sinon.spy(reportClient, "getWordReport");

          await request(app).get(
            `/report/user/${user._id}/building/${building._id}/template/${template._id}`
          );

          sinon.assert.calledWith(
            spy,
            sinon.match.has(
              "body",
              '<html><body><h3>category1 in location1</h3><ul style="list-style-type:disc"><li>projectname1<ul style="list-style-type:disc"><li>projectdescription1</li></ul></li><li>projectname2<ul style="list-style-type:disc"><li>projectdescription2</li></ul></li></ul><h3>category2 in location2</h3><ul style="list-style-type:disc"><li>projectname3<ul style="list-style-type:disc"><li>projectdescription3</li></ul></li></ul></body></html>'
            )
          );
        });
      });

      context("with special characters", function() {
        const expectedName = "projectname !@#$%^&amp;*()[]{}";
        const expectedDescription = "projectdescription !@#$%^&amp;*()[]{}";

        beforeEach(async function() {
          const project = await Project.create({
            name: "projectname",
            description: "projectdescription !@#$%^&*()[]{}",
            displayName: "projectname !@#$%^&*()[]{}",
            originalDisplayName: "projectname"
          });
          await Building.update(building, {
            $set: { projectIds: [project._id] }
          });
        });

        context("bulleted list format", function() {
          beforeEach(async function() {
            template = await Template.create({
              header: { image: "", text: "" },
              footer: { text: "" },
              config: {
                pageNumbers: false,
                numberPosition: "",
                tableOfContents: false
              },
              name: "testtemplate",
              styledDoc: "",
              body: [
                {
                  fields: [],
                  dataLabels: "show",
                  projectConfig: {
                    format: "bulletedList",
                    filter: {
                      type: [],
                      category: [],
                      application: [],
                      technology: []
                    },
                    data: { fields: ["name", "description"] },
                    style: "unordered-list",
                    projectGrouping: "individual"
                  },
                  equipmentConfig: {},
                  type: "measures",
                  target: "measure",
                  ele: "table"
                }
              ],
              createdByUserId: user._id
            });
          });

          it("should generate expected output", async function() {
            const reportClient = require("../../controllers/api/utils/api.report.client");
            const spy = sinon.spy(reportClient, "getWordReport");

            await request(app).get(
              `/report/user/${user._id}/building/${building._id}/template/${template._id}`
            );

            sinon.assert.calledWith(
              spy,
              sinon.match.has(
                "body",
                `<html><body><ul style="list-style-type:disc"><li>${expectedName}<ul style="list-style-type:disc"><li>${expectedDescription}</li></ul></li></ul></body></html>`
              )
            );
          });
        });

        context("table format", function() {
          beforeEach(async function() {
            template = await Template.create({
              header: { image: "", text: "" },
              footer: { text: "" },
              config: {
                pageNumbers: false,
                numberPosition: "",
                tableOfContents: false
              },
              name: "testtemplate",
              styledDoc: "",
              body: [
                {
                  fields: [],
                  dataLabels: "show",
                  projectConfig: {
                    format: "summaryTable",
                    filter: {
                      type: [],
                      category: [],
                      application: [],
                      technology: []
                    },
                    data: {
                      fields: ["name", "description"],
                      orderBy: "name",
                      order: "ascending"
                    },
                    style: "",
                    projectGrouping: "individual"
                  },
                  equipmentConfig: {},
                  type: "measures",
                  target: "measure",
                  ele: "table"
                }
              ],
              createdByUserId: user._id
            });
          });

          it("should generate expected output", async function() {
            const reportClient = require("../../controllers/api/utils/api.report.client");
            const spy = sinon.spy(reportClient, "getWordReport");
            await request(app).get(
              `/report/user/${user._id}/building/${building._id}/template/${template._id}`
            );

            sinon.assert.calledWith(
              spy,
              sinon.match.has(
                "body",
                `<html><body><table><thead><tr style="background-color:#4F81BC"><th>Proposed Project</th><th>Description</th></tr></thead><tbody><tr><td>${expectedName}</td><td>${expectedDescription}</td></tr><tr style="background-color:#D7E3BD"><td>Total</td><td>-</td></tr></tbody></table></body></html>`
              )
            );
          });
        });
      });
    });

    context("divider blocks", function() {
      context("with color and width", function() {
        beforeEach(async function() {
          template = await Template.create({
            header: { image: "", text: "" },
            footer: { text: "" },
            config: {
              pageNumbers: false,
              numberPosition: "",
              tableOfContents: false
            },
            name: "dividertemplate",
            styledDoc: "",
            body: [
              {
                dividerConfig: {
                  width: 3,
                  color: "#00ffff"
                },
                type: "divider",
                target: "divider",
                ele: "line"
              }
            ],
            createdByUserId: user._id
          });
        });

        it("should generate expected output", async function() {
          const reportClient = require("../../controllers/api/utils/api.report.client");
          const spy = sinon.spy(reportClient, "getWordReport");
          await request(app).get(
            `/report/user/${user._id}/building/${building._id}/template/${template._id}`
          );
          sinon.assert.calledWith(
            spy,
            sinon.match.has(
              "body",
              sinon.match('<p><line color="00ffff" thickness="3"></line></p>')
            )
          );
        });
      });
    });
  });
});
