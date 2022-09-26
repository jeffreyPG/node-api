"use strict";

var _ = require("lodash"),
  should = require("should"),
  mongoose = require("mongoose"),
  testUtils = require("../utils/test.utils");

var utilsModule = require("../../controllers/api/utils/api.utils");

/**
 * Globals
 */
var objectContext,
  dotNotationPathValueMapArr,
  stubTestObject,
  checkValue,
  stubDirtyObject,
  cleanedObject,
  mockUser,
  cleanedMockUser,
  generateRandomString,
  diffGenerateRandomString,
  generateRandomStringFunc,
  stubLibraryMeasureResponse,
  parsedFormattedMeasureArr,
  stubLibraryMeasureAttachTo;

/**
 * Utilities Module Unit Tests
 */
describe.skip("Utilities Module Unit Tests:", function () {
  before(function (done) {
    done();
  });

  describe("Object Helper Utilities -", function () {
    it("should return an object per dot notation path and value", function (done) {
      objectContext = {};
      dotNotationPathValueMapArr = [
        { path: "used.for.testing", value: "a nested value" },
        { path: "another.deeply.nested.object", value: "another nested value" }
      ];

      utilsModule.createObjPerPath.call(
        objectContext,
        dotNotationPathValueMapArr[0].path,
        dotNotationPathValueMapArr[0].value
      );

      objectContext.should.not.be.empty;
      objectContext.used.should.not.be.empty;
      objectContext.used.for.should.not.be.empty;
      objectContext.used.for.testing.should.not.be.empty;
      objectContext.used.for.testing.should.be.eql("a nested value");

      utilsModule.createObjPerPath.call(
        objectContext,
        dotNotationPathValueMapArr[1].path,
        dotNotationPathValueMapArr[1].value
      );

      objectContext.should.not.be.empty;
      objectContext.used.for.testing.should.be.eql("a nested value");

      objectContext.another.should.not.be.empty;
      objectContext.another.deeply.should.not.be.empty;
      objectContext.another.deeply.nested.should.not.be.empty;
      objectContext.another.deeply.nested.object.should.not.be.empty;
      objectContext.another.deeply.nested.object.should.be.eql(
        "another nested value"
      );

      done();
    });

    it("should return value from object per dot notation path", function (done) {
      stubTestObject = {
        test: {
          for: {
            nested: "test value"
          }
        }
      };

      checkValue = utilsModule.getValueFromObjPerPath.call(
        stubTestObject,
        "test.for.nested"
      );

      checkValue.should.not.be.empty;
      checkValue.should.be.eql("test value");

      checkValue = utilsModule.getValueFromObjPerPath.call(
        objectContext,
        "used.for.testing"
      );

      checkValue.should.not.be.empty;
      checkValue.should.be.eql("a nested value");

      done();
    });

    it("should return an object with property values of null/undefined/empty removed", function (done) {
      stubDirtyObject = {
        topLevelString: "topLevelString",
        topLevelArray: ["topLevelArray"],
        topLevelObject: { key: "value" },
        topLevelBoolTrue: true,
        topLevelBoolFalse: false,

        topLevelNull: null,
        topLevelUndefined: undefined,

        emptytopLevelString: "",
        emptytopLevelArray: [],
        emptytopLevelObject: {},

        nestedObject: {
          object: { key: "value" }
        },
        emptyNestedObject: {
          object: { key: "" }
        }
      };

      cleanedObject = utilsModule.cleanEmptyProps(stubDirtyObject);

      cleanedObject.topLevelString.should.be.eql("topLevelString");
      cleanedObject.topLevelArray.should.be.eql(["topLevelArray"]);
      cleanedObject.topLevelObject.should.be.eql({ key: "value" });
      cleanedObject.topLevelBoolTrue.should.be.eql(true);
      cleanedObject.topLevelBoolFalse.should.be.eql(false);
      cleanedObject.nestedObject.should.not.be.empty;
      cleanedObject.nestedObject.object.should.not.be.empty;
      cleanedObject.nestedObject.object.key.should.be.eql("value");

      should.not.exist(cleanedObject.topLevelNull);
      should.not.exist(cleanedObject.topLevelUndefined);

      should.not.exist(cleanedObject.emptytopLevelString);
      should.not.exist(cleanedObject.emptytopLevelArray);
      should.not.exist(cleanedObject.emptytopLevelObject);
      should.not.exist(cleanedObject.emptyNestedObject.object.key);

      done();
    });
  });

  describe("Response Data Helper Utilities -", function () {
    it("should return an object which has a cleaned user object", function (done) {
      mockUser = new User({
        name: "Test Tester",
        email: "test@test.com",
        username: "testuser",
        password: "12345678",
        apiKeyId: "generatedKey",
        resetPassword: "resetPassword",
        resetPasswordExpires: Date.now()
      });

      cleanedMockUser = utilsModule.cleanUserForResponse(mockUser);

      should.not.exist(cleanedMockUser.password);
      should.not.exist(cleanedMockUser.salt);
      should.not.exist(cleanedMockUser.resetPassword);
      should.not.exist(cleanedMockUser.apiKeyId);
      should.not.exist(cleanedMockUser.resetPasswordExpires);

      cleanedMockUser.resetPasswordExpires = Date.now() + 100000;

      cleanedMockUser = utilsModule.cleanUserForResponse(cleanedMockUser);

      should.not.exist(cleanedMockUser.resetPasswordExpires);
      cleanedMockUser.resetPassword.should.be.eql(true);

      done();
    });
  });

  describe("Third-party Response Parser/Formatter Helper Utilities -", function () {
    it("should return parsed and formatted array of objects of library api response data", function (done) {
      stubLibraryMeasureAttachTo = [
        "building",
        "levels",
        "spaces",
        "constructions",
        "lightfixtures",
        "windows",
        "doors",
        "plugloads",
        "processloads",
        "occupants",
        "waterfixtures",
        "zones",
        "terminals",
        "coolingtowers",
        "fans",
        "pumps",
        "customsystemsair",
        "customsystemshw",
        "customsystemschw",
        "coolingcoils",
        "heatingcoils",
        "evapcoolers",
        "outdoorairintakes",
        "chillers",
        "boilers",
        "cw",
        "chw",
        "dhws",
        "hw",
        "packagedunits",
        "swh",
        "mvt",
        "mvsb",
        "mvs",
        "lvt",
        "lvsb",
        "lvp"
      ];
      stubLibraryMeasureResponse = [
        {
          measure: {
            description: "Clean light fixtures covers and lamps",
            modeler_description: null,
            name: "Clean Light Fixtures",
            source: {
              organization: "organization 1",
              listing_date: null,
              url: null
            },
            tags: { tag: ["Electric Lighting.Lighting Maintenance"] },
            vuuid: "6066e587-1305-4887-8913-93c96e736de7",
            uuid: "01cc8940-451f-46be-9fac-95be60b89d30",
            changed: "2017-06-20T04:47:54Z"
          }
        },
        {
          measure: {
            description: "Delamp to meet minimum foot-candles required",
            modeler_description: null,
            name: "Delamp Light Fixtures",
            source: {
              organization: "organization 2",
              listing_date: null,
              url: null
            },
            tags: { tag: ["Electric Lighting.Lighting Maintenance"] },
            vuuid: "6066e587-1305-4887-8913-93c96e736de7",
            uuid: "01cc8940-451f-46be-9fac-95be60b89d30",
            changed: "2017-06-20T04:47:54Z"
          }
        }
      ];

      parsedFormattedMeasureArr = utilsModule.parseFormatLibraryPublicMeasure();

      parsedFormattedMeasureArr.should.be.an.Array;
      parsedFormattedMeasureArr.should.be.empty;

      parsedFormattedMeasureArr = utilsModule.parseFormatLibraryPublicMeasure(
        stubLibraryMeasureResponse
      );

      parsedFormattedMeasureArr.should.be.an.Array().and.not.be.empty;
      parsedFormattedMeasureArr.should.have.length(2);

      parsedFormattedMeasureArr[0].name.should.be.eql("Clean Light Fixtures");
      parsedFormattedMeasureArr[0].measure.name.should.be.eql(
        "Clean Light Fixtures"
      );
      parsedFormattedMeasureArr[0].measure.ecm.name.should.be.eql("custom");
      parsedFormattedMeasureArr[0].measure.ecm.description.should.be.eql(
        "custom"
      );
      parsedFormattedMeasureArr[0].measure.ecm.attachedTo.should.be.eql(
        stubLibraryMeasureAttachTo
      );

      parsedFormattedMeasureArr[1].name.should.be.eql("Delamp Light Fixtures");
      parsedFormattedMeasureArr[1].measure.name.should.be.eql(
        "Delamp Light Fixtures"
      );
      parsedFormattedMeasureArr[1].measure.ecm.name.should.be.eql("custom");
      parsedFormattedMeasureArr[1].measure.ecm.description.should.be.eql(
        "custom"
      );
      parsedFormattedMeasureArr[1].measure.ecm.attachedTo.should.be.eql(
        stubLibraryMeasureAttachTo
      );

      done();
    });
  });

  describe("Generator Helper Utilities -", function () {
    it("should return a random alphanumeric string", function (done) {
      generateRandomString = utilsModule.generateRandomString();
      diffGenerateRandomString = utilsModule.generateRandomString();

      generateRandomString.should.have.length(10);
      generateRandomString.should.not.match(/^[^a-z0-9]*$/gi);
      generateRandomString.should.not.be.eql(diffGenerateRandomString);

      generateRandomString = utilsModule.generateRandomString(25);

      generateRandomString.should.have.length(25);

      generateRandomString = utilsModule.generateRandomString(25, "!@$a");

      generateRandomString.should.not.match(/^[^a\!\@\$]*$/gi);

      done();
    });

    it("should return a function which can generate random alphanumeric strings", function (done) {
      generateRandomStringFunc = utilsModule.generateRandomStringFunction();

      (typeof generateRandomStringFunc).should.be.eql("function");

      generateRandomString = generateRandomStringFunc();

      generateRandomString.should.have.length(10);
      generateRandomString.should.not.match(/^[^a-z0-9]*$/gi);

      done();
    });
  });

  after(function (done) {
    done();
  });
});
