"use strict";

const _ = require("lodash");
const fs = require("fs");
const config = require("../../../../config/config");
const errorHandler = require("../../errors.server.controller");

const FbLightfixture = require("../../../firebase/firebase.lightfixture.model");

const COMPONENTS = [
  "boilers",
  "chillers",
  "constructions",
  "coolingtowers",
  "doors",
  "fans",
  "lightfixtures",
  "measures",
  "packagedunits",
  "plugloads",
  "processloads",
  "pumps",
  "schedules",
  "terminals",
  "waterfixtures",
  "waterheater",
  "windows",
];

const EA_CDN_URI =
  config.energyAuditor && config.energyAuditor.cdnUri
    ? config.energyAuditor.cdnUri
    : "";

/**
 * createObjPerPath.call(objectContext, dotNotationPathToAddToObject, valueToAddAtPathProvided);
 */
const _createObjPerPath = function (path, value) {
  path.split(".").reduce(function (prev, curr, index, arr) {
    // If final item in path set as the value, else use current or set as a new nested object if not set
    if (index === arr.length - 1) return (prev[curr] = value);
    return typeof prev[curr] === "object" ? prev[curr] : (prev[curr] = {});
  }, this);
  return this;
};

/**
 * _getValueFromObjPerPath.call(objectContext, pathToGetValue);
 */
const _getValueFromObjPerPath = function (path, value) {
  const field = path.split(".").reduce(function (prev, curr) {
    return prev !== undefined ? prev[curr] : undefined;
  }, this);
  return field;
};

exports.sendError = function (err, status, req, res, next) {
  res.httpStatus = status;
  res.sendResult = {
    status: "Error",
    message: errorHandler.getErrorMessage(err),
    errors: errorHandler.getErrorList(err),
  };
  return next();
};

/**
 * Recursively walk thru an object and remove any empty prop values
 */
exports.cleanEmptyProps = function (obj) {
  const tmpObj = _.cloneDeep(obj);

  function recurse (object) {
    _.forIn(object, function (value, key) {
      if (typeof value !== "boolean" && !value) delete object[key];

      if (value === null || value === undefined) delete object[key];

      if (_.isArray(value)) {
        if (!value.length) {
          delete object[key];
        } else {
          value.forEach(function (ele) {
            if (_.isObject(ele)) recurse(ele);
          });
        }
      }

      if (_.isObject(value)) {
        if (_.isEmpty(value)) {
          delete object[key];
        } else {
          recurse(value);
        }
      }
    });
  }
  recurse(tmpObj);

  return tmpObj;
};

const _cleanUserForResponse = function (user) {
  if (typeof user.toJSON === "function") {
    user = user.toJSON();
  }

  // Do not send sensitive data back
  delete user.salt;
  delete user.password;
  delete user.apiKeyId;

  // Size down user profile for most things
  delete user.__v;
  // delete user.created;
  // delete user.updated;

  if (user.resetPasswordExpires > new Date()) {
    user.resetPassword = true;
  }

  delete user.resetPasswordExpires;

  return user;
};

exports.sendEmail = function (to, subject, message, done) {
  return done(null, "success");
};

/**
 * Clean a firebase Audit object to lean up the response
 */
exports.cleanFirebaseAudit = function (firebaseAuditObj) {
  const ret = {};

  if (!firebaseAuditObj) return ret;

  // Append audit name
  if (firebaseAuditObj.name) {
    ret.name = firebaseAuditObj.name;
  }
  // Append building info
  if (firebaseAuditObj.info) {
    ret.info = firebaseAuditObj.info;
  }
  let tmp;
  // Append level info
  if (firebaseAuditObj.levels) {
    ret.levels = [];
    Object.keys(firebaseAuditObj.levels).map(function (levelId) {
      tmp = firebaseAuditObj.levels[levelId];
      ret.levels.push(tmp.displayName || tmp.name || "level");
    });
  }
  // Append space info
  if (firebaseAuditObj.spaces) {
    ret.spaces = [];
    Object.keys(firebaseAuditObj.spaces).map(function (spaceId) {
      tmp = firebaseAuditObj.spaces[spaceId];
      ret.spaces.push(tmp.displayName || tmp.name || "space");
    });
  }
  // Append zone info
  if (firebaseAuditObj.zones) {
    ret.zones = [];
    Object.keys(firebaseAuditObj.zones).map(function (zoneId) {
      tmp = firebaseAuditObj.zones[zoneId];
      ret.zones.push(tmp.displayName || tmp.name || "zone");
    });
  }

  return ret;
};

/**
 * Clean a firebase Audit object formatted for measures mappings
 */
exports.cleanFirebaseAuditForMeasuresMap = function (firebaseAuditObj) {
  const ret = {};

  if (!firebaseAuditObj) return ret;

  // Cleanup data which was added specifically for use with the client and setting its views
  delete firebaseAuditObj.showAll;
  delete firebaseAuditObj.template;

  // Append audit details
  if (firebaseAuditObj.name) {
    ret.name = firebaseAuditObj.name;
  }
  if (firebaseAuditObj.createdDate) {
    ret.createdDate = firebaseAuditObj.createdDate;
  }

  ret.measures = [];
  ret.components = {};

  let tmp;
  // Append measure map reference info
  if (firebaseAuditObj.measures) {
    Object.keys(firebaseAuditObj.measures).map(function (measureId) {
      tmp = firebaseAuditObj.measures[measureId];
      if (tmp.references) {
        ret.measures.push({
          measureRefId: measureId,
          name: tmp.displayName || tmp.name || "measure",
          description: tmp.description || "",
          baseId: tmp.baseId || "",
          references: tmp.references,
        });
      }
    });
  }

  let tmpComponent, tmpComponentRefId;
  // Process the measures with references to components to grab that component data
  ret.measures.map(function (measure) {
    Object.keys(measure.references).map(function (componentType) {
      tmpComponent = componentType;
      measure.references[tmpComponent].map(function (componentRefId) {
        tmpComponentRefId = componentRefId;
        if (firebaseAuditObj[tmpComponent][tmpComponentRefId]) {
          if (!ret.components[tmpComponent]) ret.components[tmpComponent] = {};
          ret.components[tmpComponent][tmpComponentRefId] =
            firebaseAuditObj[tmpComponent][tmpComponentRefId];
        }
      });
    });
  });

  return ret;
};

/**
 * Clean a firebase Audit object formatted for a report
 */
exports.cleanFirebaseAuditForReport = function (firebaseAuditObj) {
  const ret = {};

  if (!firebaseAuditObj) return ret;

  // Cleanup data which was added specifically for use with the client and setting its views
  delete firebaseAuditObj.showAll;
  delete firebaseAuditObj.template;

  // Append audit details
  if (firebaseAuditObj.name) {
    ret.name = firebaseAuditObj.name;
  }
  if (firebaseAuditObj.createdDate) {
    ret.createdDate = firebaseAuditObj.createdDate;
  }

  // Append building info
  if (firebaseAuditObj.info) {
    delete firebaseAuditObj.info.files;
    ret.info = firebaseAuditObj.info;
  }

  let tmp, tmpComponentArr, tmpTotalCount;
  // Append level info
  if (firebaseAuditObj.levels) {
    ret.levels = [];
    Object.keys(firebaseAuditObj.levels).map(function (levelId) {
      tmp = firebaseAuditObj.levels[levelId];
      // Get array of components contained in level
      tmpComponentArr = _.intersection(COMPONENTS, Object.keys(tmp));
      if (tmpComponentArr.length) {
        tmpTotalCount = 0;
        tmpComponentArr.map(function (component) {
          Object.keys(tmp[component]).map(function (id) {
            if (tmp[component][id] && tmp[component][id].quantity) { tmpTotalCount += tmp[component][id].quantity || 0; }
          });
        });
      }
      ret.levels.push({
        name: tmp.name || "level",
        displayName: tmp.displayName || "level",
        componentCount: tmpTotalCount || 0,
        info: tmp.info || {},
      });
    });
  }
  // Append space info
  if (firebaseAuditObj.spaces) {
    ret.spaces = [];
    Object.keys(firebaseAuditObj.spaces).map(function (spaceId) {
      tmp = firebaseAuditObj.spaces[spaceId];
      // Get array of components contained in space
      tmpComponentArr = _.intersection(COMPONENTS, Object.keys(tmp));
      if (tmpComponentArr.length) {
        tmpTotalCount = 0;
        tmpComponentArr.map(function (component) {
          Object.keys(tmp[component]).map(function (id) {
            if (tmp[component][id] && tmp[component][id].quantity) { tmpTotalCount += tmp[component][id].quantity || 0; }
          });
        });
      }
      ret.spaces.push({
        name: tmp.name || "space",
        displayName: tmp.displayName || "space",
        componentCount: tmpTotalCount || 0,
        info: tmp.spaceType || {},
      });
    });
  }
  // Append zone info
  if (firebaseAuditObj.zones) {
    ret.zones = [];
    Object.keys(firebaseAuditObj.zones).map(function (zoneId) {
      tmp = firebaseAuditObj.zones[zoneId];
      ret.zones.push({
        name: tmp.name || "zone",
        comment: tmp.comment || "",
        info: {},
      });
    });
  }
  // Append note info
  if (firebaseAuditObj.notes) {
    ret.notes = [];
    Object.keys(firebaseAuditObj.notes).map(function (noteId) {
      tmp = firebaseAuditObj.notes[noteId];
      ret.notes.push({
        name: tmp.displayName || tmp.name || "note",
        comment: tmp.comment || "",
        info: {},
      });
    });
  }
  // Append schedule info
  if (firebaseAuditObj.schedules) {
    ret.schedules = [];
    Object.keys(firebaseAuditObj.schedules).map(function (scheduleId) {
      tmp = firebaseAuditObj.schedules[scheduleId];
      ret.schedules.push({
        name: tmp.displayName || tmp.name || "schedule",
        comment: tmp.comment || "",
        displayType: tmp.displayType || "",
        type: tmp.type || "",
        info: {},
      });
    });
  }
  // Append utility bill info
  if (firebaseAuditObj.utilitybills) {
    ret.utilitybills = [];
    Object.keys(firebaseAuditObj.utilitybills).map(function (scheduleId) {
      tmp = firebaseAuditObj.utilitybills[scheduleId];
      ret.utilitybills.push({
        name: tmp.displayName || tmp.name || "schedule",
        type: tmp.type || "",
        units: tmp.units || "",
        periods: tmp.periods || [],
        info: {},
      });
    });
  }

  // Append measure info
  if (firebaseAuditObj.measures) {
    ret.measures = [];
    Object.keys(firebaseAuditObj.measures).map(function (measureId) {
      tmp = firebaseAuditObj.measures[measureId];
      ret.measures.push({
        name: tmp.displayName || tmp.name || "measure",
        comment: tmp.comment || "",
        description: tmp.description || "",
        info: {},
      });
    });
  }

  let componentCount = 0;
  // Append component info - include if part of this audit
  ret.components = {};
  COMPONENTS.map(function (componentType) {
    if (firebaseAuditObj[componentType]) {
      if (!ret.components[componentType]) ret.components[componentType] = [];
      Object.keys(firebaseAuditObj[componentType]).map(function (firebaseId) {
        componentCount += 1;
        ret.components[componentType].push({
          type: componentType,
          info: firebaseAuditObj[componentType][firebaseId],
        });
      });
    }
  });

  // Append count info
  ret.componentCount = componentCount || 0;
  ret.spacesCount = ret.spaces ? ret.spaces.length : 0;
  ret.schedulesCount = ret.schedules ? ret.schedules.length : 0;
  ret.notesCount = ret.notes ? ret.notes.length : 0;
  ret.zonesCount = ret.zones ? ret.zones.length : 0;
  ret.measureCount = ret.measures ? ret.measures.length : 0;
  ret.levelsCount = ret.levels ? ret.levels.length : 0;

  return ret;
};

/**
 * Return a list of image urls found within an audit's buildingInfo/notes/measures
 */
exports.locateFirebaseFileUrls = function (
  orgId,
  clientId,
  buildingId,
  firebaseObj,
  returnFiles
) {
  const ret = {
    building: {
      imageUrls: [],
      fileUrls: [],
    },
    notes: {
      imageUrls: [],
      fileUrls: [],
    },
    measures: {
      imageUrls: [],
      fileUrls: [],
    },
  };

  const includeFiles = Boolean(returnFiles);

  if (!orgId || !clientId || !buildingId || !firebaseObj) return ret;

  const __getCdnPath = function (filename) {
    return (
      EA_CDN_URI +
      "org" +
      orgId +
      "/client" +
      clientId +
      "/bld" +
      buildingId +
      "/thumb-" +
      filename
    );
  };

  // Format if there is only one audit present
  if (!firebaseObj.audits && firebaseObj.name && firebaseObj.createdDate) {
    firebaseObj.audits = [firebaseObj];
  }

  // Check audits for image data
  if (firebaseObj.audits) {
    Object.keys(firebaseObj.audits).map(function (auditId) {
      // Get building images
      if (
        firebaseObj.audits[auditId].info &&
        firebaseObj.audits[auditId].info.files &&
        firebaseObj.audits[auditId].info.files.length
      ) {
        firebaseObj.audits[auditId].info.files.map(function (file) {
          if (file.fileName && file.type) {
            if (file.type === "photo") {
              ret.building.imageUrls.push(__getCdnPath(file.fileName));
            } else if (includeFiles) {
              ret.building.fileUrls.push(__getCdnPath(file.fileName));
            }
          }
        });
      }
      // Get notes images
      if (firebaseObj.audits[auditId].notes) {
        Object.keys(firebaseObj.audits[auditId].notes).map(function (noteId) {
          if (
            firebaseObj.audits[auditId].notes[noteId].files &&
            firebaseObj.audits[auditId].notes[noteId].files.length
          ) {
            firebaseObj.audits[auditId].notes[noteId].files.map(function (file) {
              if (file.fileName && file.type) {
                if (file.type === "photo") {
                  ret.notes.imageUrls.push(__getCdnPath(file.fileName));
                } else if (includeFiles) {
                  ret.notes.fileUrls.push(__getCdnPath(file.fileName));
                }
              }
            });
          }
        });
      }
      // Get measure images
      if (firebaseObj.audits[auditId].measures) {
        Object.keys(firebaseObj.audits[auditId].measures).map(function (
          measureId
        ) {
          if (
            firebaseObj.audits[auditId].measures[measureId].files &&
            firebaseObj.audits[auditId].measures[measureId].files.length
          ) {
            firebaseObj.audits[auditId].measures[measureId].files.map(function (
              file
            ) {
              if (file.fileName && file.type) {
                if (file.type === "photo") {
                  ret.measures.imageUrls.push(__getCdnPath(file.fileName));
                } else if (includeFiles) {
                  ret.measures.fileUrls.push(__getCdnPath(file.fileName));
                }
              }
            });
          }
        });
      }
    });
  }

  // Remove duplicate urls
  ret.building.imageUrls = _.uniq(ret.building.imageUrls);
  ret.notes.imageUrls = _.uniq(ret.notes.imageUrls);
  ret.measures.imageUrls = _.uniq(ret.measures.imageUrls);

  // Cleanup empty file arrays, else remove duplicate urls
  if (!includeFiles) {
    delete ret.building.fileUrls;
    delete ret.notes.fileUrls;
    delete ret.measures.fileUrls;
  } else {
    ret.building.fileUrls = _.uniq(ret.building.fileUrls);
    ret.notes.fileUrls = _.uniq(ret.notes.fileUrls);
    ret.measures.fileUrls = _.uniq(ret.measures.fileUrls);
  }

  return ret;
};

/**
 * Return the matched client id per the buildingId found within projects
 */
exports.locateFirebaseClientId = function (buildingId, firebaseClients) {
  let ret = null;

  if (!buildingId || !firebaseClients) return ret;

  let tmpProjectsArr, tmpProject;
  Object.keys(firebaseClients).map(function (clientId) {
    if (firebaseClients[clientId].projects) {
      tmpProjectsArr = Object.keys(firebaseClients[clientId].projects);
      for (let i = 0; i < tmpProjectsArr.length; i += 1) {
        tmpProject = firebaseClients[clientId].projects[tmpProjectsArr[i]];
        if (
          tmpProject &&
          tmpProject.buildings &&
          tmpProject.buildings[buildingId]
        ) {
          ret = clientId;
          break;
        }
      }
    }
  });

  return ret;
};

/**
 * Parse and format static library public measure and return its firebase object schema
 */
exports.parseFormatStaticLibraryPublicMeasure = function (measureArr) {
  const ret = [];
  if (!measureArr || (measureArr && !measureArr.length)) {
    return ret;
  }

  const _cleanString = function (str) {
    return str.replace(/[\/\\]/gi, " ");
  };

  let tmpFbMeasure, tmpName;
  measureArr.map(function (measureObj) {
    tmpFbMeasure = {};

    // These are fields specific to the EA angular app and hardcoded within to process measures
    if (measureObj.name && measureObj.description) {
      tmpName = _cleanString(measureObj.name);
      tmpFbMeasure = {
        name: "",
        measure: {
          name: "",
          ecm: {
            attachedTo: [
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
              "lvp",
            ],
            description: "custom",
            name: "custom",
          },
        },
      };

      tmpFbMeasure.name = tmpName;
      tmpFbMeasure.measure.name = tmpName;
      tmpFbMeasure.measure.ecm.description = measureObj.description;
      if (measureObj.attachedTo) {
        tmpFbMeasure.measure.ecm.attachedTo = measureObj.attachedTo;
      }

      ret.push(tmpFbMeasure);
    }
  });

  return ret;
};

/**
 * Parse and format public measure and return it in a new format
 */
exports.parseFormatStaticPublicMeasure = function (measureArr) {
  const ret = {
    building: [],
    lighting: [],
    hvac: [],
    water: [],
    other: [],
  };
  if (!measureArr || (measureArr && !measureArr.length)) {
    return ret;
  }

  const _cleanString = function (str) {
    return str.replace(/[\/\\]/gi, " ");
  };

  let tmpMeasure;
  measureArr.map(function (measureObj) {
    tmpMeasure = {};

    // Set common fields
    tmpMeasure.name = _cleanString(measureObj.name);
    tmpMeasure.description = _cleanString(measureObj.description);
    tmpMeasure.yearsPayback = measureObj.yearsPayback || 0.5;
    tmpMeasure.costSavings = measureObj.costSavings || [5000, 10000]; // [Min, Max]
    tmpMeasure.hasIncentives = measureObj.hasIncentives || true;

    // Create namespaces per building and measure types
    if (measureObj.attachedTo) {
      if (measureObj.attachedTo.indexOf("lightfixtures") !== -1) {
        ret.lighting.push(tmpMeasure);
      } else if (measureObj.attachedTo.indexOf("waterfixtures") !== -1) {
        ret.water.push(tmpMeasure);
      } else if (
        measureObj.attachedTo.indexOf("dhws") !== -1 ||
        measureObj.attachedTo.indexOf("hw") !== -1 ||
        measureObj.attachedTo.indexOf("evapcoolers") !== -1 ||
        measureObj.attachedTo.indexOf("outdoorairintakes") !== -1
      ) {
        ret.hvac.push(tmpMeasure);
      } else if (
        measureObj.attachedTo.indexOf("building") !== -1 ||
        measureObj.attachedTo.indexOf("doors") !== -1 ||
        measureObj.attachedTo.indexOf("windows") !== -1
      ) {
        ret.building.push(tmpMeasure);
      } else {
        ret.other.push(tmpMeasure);
      }
    }
  });

  return ret;
};

/**
 * Parse and format library component attributes and return its firebase object schema
 */
exports.parseFormatLibraryComponents = function (componentsArr) {
  const ret = [];
  if (!componentsArr || (componentsArr && !componentsArr.length)) {
    return ret;
  }

  let tmpAttrArr, tmpFbComponent;
  // Loop thru all components and its attributes
  componentsArr.map(function (componentObj, componentIndex) {
    tmpFbComponent = {};

    if (
      componentObj.component &&
      componentObj.component.attributes &&
      componentObj.component.attributes.attribute &&
      componentObj.component.attributes.attribute.length
    ) {
      tmpFbComponent.name = componentObj.component.name
        ? componentObj.component.name
        : componentIndex;
      // Build out a new object per firebase mapping of the attribute names
      tmpAttrArr = componentObj.component.attributes.attribute;
      tmpAttrArr.map(function (attribute) {
        // If the attribute name is found in the map, then find its firebase
        // path and add the attributes value to the tmp firebase object
        if (FbLightfixture.fields[attribute.name]) {
          tmpFbComponent = _createObjPerPath.call(
            tmpFbComponent,
            FbLightfixture.fields[attribute.name].fbPath,
            attribute.value
          );
        }
      });
      // Collect all the converted attributes, and return
      ret.push(tmpFbComponent);
    }
  });

  return ret;
};

/**
 * Parse and format library public measure and return its firebase object schema
 */
exports.parseFormatLibraryPublicMeasure = function (measureArr) {
  const ret = [];
  if (!measureArr || (measureArr && !measureArr.length)) {
    return ret;
  }

  let tmpFbMeasure;
  measureArr.map(function (measureObj) {
    tmpFbMeasure = {};

    // These are fields specific to the EA angular app and hardcoded within to process measures
    if (measureObj.measure && measureObj.measure.name) {
      tmpFbMeasure = {
        name: "",
        measure: {
          name: "",
          ecm: {
            attachedTo: [
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
              "lvp",
            ],
            description: "custom",
            name: "custom",
          },
        },
      };

      tmpFbMeasure.name = measureObj.measure.name;
      tmpFbMeasure.measure.name = measureObj.measure.name;

      ret.push(tmpFbMeasure);
    }
  });

  return ret;
};

/**
 * Parse and format library query results
 *
 *  - Example of returned data from Drupal Library API
 *  -- { component: {
 *        attributes: {attribute: [{name: "Thickness", value: 6.35, datatype: "float", units: "mm"},…]},…},
 *        changed: "2013-11-01T16:01:10Z",
 *        description: "Material from a data set created from ASHRAE HOF 2005 and ASHRAE 90.1-2004 Appendix A",
 *        files: {file: [{version: {software_program: "OpenStudio", identifier: "0.7.0"},…},…]},
 *        modeler_description: null,
 *        name: "Opaque Spandrel Glass- 1/4 in.",
 *        source: {manufacturer: null, model: null, url: null, serial_number: null},
 *        tags: {tag: ["Material.Opaque.Building Board and Siding"]},
 *        uuid: "681a3970-7926-0130-b6de-0026b9d40ccf",
 *        vuuid: "681afcc0-7926-0130-b6e0-0026b9d40ccf"
 *     }}
 *
 */
exports.parseFormatLibraryQuery = function (resultsArr) {
  const ret = [];
  if (!resultsArr || (resultsArr && !resultsArr.length)) {
    return ret;
  }

  // Just pass measure results thru
  if (resultsArr[0].measure) {
    return resultsArr;
  }

  let tmpResult;
  resultsArr.map(function (resultObj) {
    tmpResult = {};

    // Only keep the needed fields for the EA app to function
    if (
      resultObj.component &&
      resultObj.component.name &&
      resultObj.component.attributes
    ) {
      tmpResult = {
        component: {
          attributes: [],
          name: "",
        },
      };

      tmpResult.component.attributes = resultObj.component.attributes;
      tmpResult.component.name = resultObj.component.name;

      ret.push(tmpResult);
    }
  });

  return ret;
};

/**
 * Generate a string of random characters
 */
exports.generateRandomString = function (wordLength, charSet) {
  wordLength = wordLength || 10;
  charSet =
    charSet || "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let randomString = "";
  for (let i = 0; i < wordLength; i++) {
    const randomPos = Math.floor(Math.random() * charSet.length);
    randomString += charSet.charAt(randomPos);
  }
  return randomString;
};

exports.generateRandomStringFunction = function (wordLength, charSet) {
  const self = this;
  return function () {
    return self.generateRandomString(wordLength, charSet);
  };
};

exports.checkWriteDirSync = function (path) {
  if (fs.existsSync(path)) return path;

  try {
    fs.mkdirSync(path);
    return path;
  } catch (err) {
    console.error("Issues mkdir : ", err);
    return err;
  }
};

/**
 * Add commas to numbers
 */
exports.formatNumbersWithCommas = (x) => {
  if (!x) {
    return "";
  }
  if (isNaN(x)) {
    return x;
  }

  x = parseFloat(x).toFixed(2);

  const parts = x.toString().split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  if (parts[parts.length - 1] === "00") {
    return parts[0];
  }
  return parts.join(".");
};

exports.formatNumberWithUnits = (value, units, isCurrency = false) => {
  if(!value) return null;
  return `${isCurrency ? '$' : ''}${value} ${units}`;
}

exports.getValueFromObjPerPath = _getValueFromObjPerPath;
exports.createObjPerPath = _createObjPerPath;
exports.cleanUserForResponse = _cleanUserForResponse;
