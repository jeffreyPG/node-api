"use strict";

/**
 * Module dependencies.
 */
const _ = require("lodash");
const mongoose = require("mongoose");
const bcl = require("./utils/api.bcl");
const Key = mongoose.model("Key");
const Project = mongoose.model("Project");
const Component = mongoose.model("Component");
const PublicComponent = mongoose.model("PublicComponent");
const PublicMeasure = mongoose.model("Measure");
const util = require("./utils/api.utils");
const validate = require("./utils/api.validation");

const defaultAttachedTo = ["building", "levels", "spaces", "constructions", "lightfixtures", "windows", "doors", "plugloads", "processloads", "occupants", "waterfixtures", "zones", "terminals", "coolingtowers", "fans", "pumps", "customsystemsair", "customsystemshw", "customsystemschw", "coolingcoils", "heatingcoils", "evapcoolers", "outdoorairintakes", "chillers", "boilers", "cw", "chw", "dhws", "hw", "packagedunits", "swh", "mvt", "mvsb", "mvs", "lvt", "lvsb", "lvp"];

const _transformMeasures = (publicMeasures) => {
  const transformedPublicMeasures = [];

  return new Promise((resolve, reject) => {
    const measurePromise = publicMeasures.map(function (measure, index) {
      const measureObj = {
        name: measure.displayName,
        buildeeMeasureId: measure._id,
        measure: {
          name: measure.displayName,
          ecm: {
            description: measure.description,
            attachedTo: measure.eaAttachedTo || defaultAttachedTo,
          },
          category: measure.project_category || "Light Fixtures",
        },
      };
      transformedPublicMeasures.push(measureObj);
    });

    Promise.all(measurePromise).then(() => {
      resolve(transformedPublicMeasures);
    }).catch((err) => {
      reject(err);
    });
  });
};

/**
 * Return or generate a key to access the system
 */
exports.userLibraryKey = function (req, res, next) {
  const reqOrgId = req.body.orgId;
  const reqUserId = req.body.userId;
  const reqUsername = req.body.username;
  const reqAuthorName = req.body.authorName;

  if (!reqOrgId) {
    return util.sendError("Field \"orgId\" is required.", 400, req, res, next);
  }
  if (!reqUserId) {
    return util.sendError("Field \"userId\" is required.", 400, req, res, next);
  }

  const query = {
    organizationFirebaseId: reqOrgId,
    userFirebaseId: reqUserId,
  };

  // Lookup to see if the key for this org/user already exists
  Key.findOne(query, function (err, key) {
    if (err) {
      return util.sendError(err, 400, req, res, next);
    }

    // Key was found, return in response
    if (key && key.apiKey) {
      // Return user library key
      res.sendResult = {
        status: "Success",
        message: "Retrieved Library API Key",
        key: key.apiKey,
      };
      return next();
    }

    query.eaUsername = reqUsername || "";
    query.eaAuthorName = reqAuthorName || "";
    // No key result was found, so generate, save, and return
    key = new Key(query);

    key.save(function (err) {
      if (err) {
        return util.sendError(err, 400, req, res, next);
      }

      // Return generated user library key
      res.sendResult = {
        status: "Success",
        message: "Generated Library API Key",
        key: key.apiKey,
      };
      return next();
    });
  });
};

/**
 * Get component per Org id, and component type
 */
exports.getLibraryComponents = function (req, res, next) {
  const reqOrganizationFirebaseId = req.query.organizationId;
  if (!reqOrganizationFirebaseId) {
    return util.sendError("Field \"organizationId\" is required.", 400, req, res, next);
  }

  // API Key verification
  if (reqOrganizationFirebaseId !== req.apiKey.organizationFirebaseId) {
    return util.sendError("Key mismatch.", 400, req, res, next);
  }

  const reqComponentType = req.params.componentType.toLowerCase();
  if (!validate.valComponentType(reqComponentType)) {
    return util.sendError("Invalid \"componentType\" param.", 400, req, res, next);
  }

  const query = {
    organizationFirebaseId: reqOrganizationFirebaseId,
    "config.type": reqComponentType,
  };

  Component.find(query).lean(true).exec(function (err, components) {
    if (err) {
      return util.sendError(err, 400, req, res, next);
    }

    // Return the component obj
    res.sendResult = {
      status: "Success",
      message: "Retrieved Library Components",
      components: components,
    };
    return next();
  });
};

/**
 * Get measures per Org id
 */
exports.getLibraryMeasures = function (req, res, next) {
  const reqOrganizationFirebaseId = req.query.organizationId;
  if (!reqOrganizationFirebaseId) {
    return util.sendError("Field \"organizationId\" is required.", 400, req, res, next);
  }

  // API Key verification
  if (reqOrganizationFirebaseId !== req.apiKey.organizationFirebaseId) {
    return util.sendError("Key mismatch.", 400, req, res, next);
  }

  const query = {
    organizationFirebaseId: reqOrganizationFirebaseId,
  };

  Project.find(query).lean(true).exec(function (err, measures) {
    if (err) {
      return util.sendError(err, 400, req, res, next);
    }

    _transformMeasures(measures).then((transformedPublicMeasures) => {
      // Return the public measure response
      res.sendResult = {
        status: "Success",
        message: "Retrieved Library Measures",
        measures: transformedPublicMeasures || [],
      };
      return next();
    });
  });
};

/**
 * Create component per User and Org id
 */
exports.createLibraryComponent = function (req, res, next) {
  const reqOrganizationFirebaseId = req.body.organizationId;
  const reqUserFirebaseId = req.body.userId;
  const reqComponent = req.body.component;
  const reqConfig = req.body.config;

  if (!reqOrganizationFirebaseId) {
    return util.sendError("Field \"organizationId\" is required.", 400, req, res, next);
  }
  if (!reqUserFirebaseId) {
    return util.sendError("Field \"userId\" is required.", 400, req, res, next);
  }

  // API Key verification
  if (reqOrganizationFirebaseId !== req.apiKey.organizationFirebaseId) {
    return util.sendError("Key mismatch.", 400, req, res, next);
  }
  if (reqUserFirebaseId !== req.apiKey.userFirebaseId) {
    return util.sendError("Key mismatch.", 400, req, res, next);
  }

  const reqComponentType = req.params.componentType.toLowerCase();
  if (!validate.valComponentType(reqComponentType)) {
    return util.sendError("Invalid \"componentType\" param.", 400, req, res, next);
  }

  if (!reqComponent) {
    return util.sendError("Field \"component\" is required.", 400, req, res, next);
  }
  if (!reqComponent.name) {
    return util.sendError("Field \"component.name\" is required.", 400, req, res, next);
  }

  if (!reqConfig) {
    return util.sendError("Field \"config\" is required.", 400, req, res, next);
  }
  if (!reqConfig.typeplural) {
    return util.sendError("Field \"config.typeplural\" is required.", 400, req, res, next);
  }

  // Normalize to lowercase
  reqConfig.type = reqComponentType;
  reqConfig.typeplural = reqConfig.typeplural.toLowerCase();

  const component = new Component({
    organizationFirebaseId: reqOrganizationFirebaseId,
    userFirebaseId: reqUserFirebaseId,
    name: reqComponent.name,
    authorName: req.apiKey.eaAuthorName || "",
    component: reqComponent,
    config: reqConfig,
  });

  component.save(function (err) {
    if (err) {
      return util.sendError(err, 400, req, res, next);
    }

    // Return the component obj
    res.sendResult = {
      status: "Success",
      message: "Created Library Component",
      component: component,
    };
    return next();
  });
};

/**
 * Create measure per User and Org id
 */
exports.createLibraryMeasure = function (req, res, next) {
  const reqOrganizationFirebaseId = req.body.organizationId;
  const reqUserFirebaseId = req.body.userId;
  const reqMeasure = req.body.measure;

  if (!reqOrganizationFirebaseId) {
    return util.sendError("Field \"organizationId\" is required.", 400, req, res, next);
  }
  if (!reqUserFirebaseId) {
    return util.sendError("Field \"userId\" is required.", 400, req, res, next);
  }

  // API Key verification
  if (reqOrganizationFirebaseId !== req.apiKey.organizationFirebaseId) {
    return util.sendError("Key mismatch.", 400, req, res, next);
  }
  if (reqUserFirebaseId !== req.apiKey.userFirebaseId) {
    return util.sendError("Key mismatch.", 400, req, res, next);
  }

  if (!reqMeasure) {
    return util.sendError("Field \"measure\" is required.", 400, req, res, next);
  }
  if (!reqMeasure.name) {
    return util.sendError("Field \"measure.name\" is required.", 400, req, res, next);
  }

  const measure = new Project({
    name: "none",
    displayName: reqMeasure.name,
    originalDisplayName: reqMeasure.name,
    eaDisplayName: reqMeasure.name,
    description: reqMeasure.ecm.description || "",
    project_category: reqMeasure.category || "Light Fixtures",
    project_application: reqMeasure.category || "Light Fixtures",
    category: "description",
    eaSavedToLibrary: true,
    eaAttachedTo: reqMeasure.ecm.attachedTo || defaultAttachedTo,
    organizationFirebaseId: reqOrganizationFirebaseId || "",
  });

  measure.save(function (err) {
    if (err) {
      return util.sendError(err, 400, req, res, next);
    }

    // Return the measure obj
    res.sendResult = {
      status: "Success",
      message: "Created Library Measure",
      measure: measure,
    };
    return next();
  });
};

/**
 * Update component per Org id, component type, and name
 */
exports.updateLibraryComponent = function (req, res, next) {
  const reqOrganizationFirebaseId = req.body.organizationId;
  const reqComponentName = req.body.name;
  const reqComponent = req.body.component;
  const reqConfig = req.body.config;

  if (!reqOrganizationFirebaseId) {
    return util.sendError("Field \"organizationId\" is required.", 400, req, res, next);
  }

  // API Key verification
  if (reqOrganizationFirebaseId !== req.apiKey.organizationFirebaseId) {
    return util.sendError("Key mismatch.", 400, req, res, next);
  }

  if (!reqComponentName) {
    return util.sendError("Field \"name\" is required.", 400, req, res, next);
  }

  const reqComponentType = req.params.componentType.toLowerCase();
  if (!validate.valComponentType(reqComponentType)) {
    return util.sendError("Invalid \"componentType\" param.", 400, req, res, next);
  }

  if (!reqComponent || !reqConfig) {
    return util.sendError("Invalid data found in request.", 400, req, res, next);
  }

  const query = {
    organizationFirebaseId: reqOrganizationFirebaseId,
    "config.type": reqComponentType,
    name: reqComponentName,
  };

  Component.findOne(query).exec(function (err, component) {
    if (err || !component) {
      return util.sendError(err || "Issues finding component.", 400, req, res, next);
    }

    // Check for name edits, and update when needed
    if (reqComponent.previousName && (reqComponent.previousName !== reqComponent.name)) {
      component.name = reqComponent.name;
      delete reqComponent.previousName;
    }

    component.component = _.extend(component.component, reqComponent);
    component.config = _.extend(component.config, reqConfig);
    component.updated = Date.now();

    component.markModified("component");
    component.markModified("config");

    component.save(function (err) {
      if (err) {
        return util.sendError(err, 400, req, res, next);
      }

      // Return the component obj
      res.sendResult = {
        status: "Success",
        message: "Updated Library Component",
        component: component,
      };
      return next();
    });
  });
};

/**
 * Update measure per Org id and name
 */
exports.updateLibraryMeasure = function (req, res, next) {
  const reqOrganizationFirebaseId = req.body.organizationId;
  const reqMeasureName = req.body.name;
  const reqMeasure = req.body.measure;

  if (!reqOrganizationFirebaseId) {
    return util.sendError("Field \"organizationId\" is required.", 400, req, res, next);
  }

  // API Key verification
  if (reqOrganizationFirebaseId !== req.apiKey.organizationFirebaseId) {
    return util.sendError("Key mismatch.", 400, req, res, next);
  }

  if (!reqMeasureName) {
    return util.sendError("Field \"name\" is required.", 400, req, res, next);
  }
  if (!reqMeasure) {
    return util.sendError("Invalid data found in request.", 400, req, res, next);
  }

  const query = {
    organizationFirebaseId: reqOrganizationFirebaseId,
    displayName: reqMeasureName,
  };

  Project.findOne(query).exec(function (err, measure) {
    if (err || !measure) {
      return util.sendError(err || "Issues finding measure.", 400, req, res, next);
    }

    // Check for name edits, and update when needed
    if (reqMeasure.previousName && (reqMeasure.previousName !== reqMeasure.name)) {
      measure.displayName = reqMeasure.name;
      measure.eaDisplayName = reqMeasure.name;
      measure.updated = Date.now();
      delete reqMeasure.previousName;
    }

    if (reqMeasure.ecm && reqMeasure.ecm.description) {
      measure.description = reqMeasure.ecm.description;
    }

    if (reqMeasure.category) {
      measure.project_category = reqMeasure.category;
      measure.project_application = reqMeasure.category;
    }

    measure.save(function (err) {
      if (err) {
        return util.sendError(err, 400, req, res, next);
      }

      // Return the measure obj
      res.sendResult = {
        status: "Success",
        message: "Updated Library Measure",
        measure: measure,
      };
      return next();
    });
  });
};

/**
 * Remove component per Org id, component type, and name
 */
exports.deleteLibraryComponent = function (req, res, next) {
  const reqOrganizationFirebaseId = req.query.organizationId;
  const reqComponentName = req.query.name;

  if (!reqOrganizationFirebaseId) {
    return util.sendError("Field \"organizationId\" is required.", 400, req, res, next);
  }

  // API Key verification
  if (reqOrganizationFirebaseId !== req.apiKey.organizationFirebaseId) {
    return util.sendError("Key mismatch.", 400, req, res, next);
  }

  if (!reqComponentName) {
    return util.sendError("Field \"name\" is required.", 400, req, res, next);
  }

  const reqComponentType = req.params.componentType.toLowerCase();
  if (!validate.valComponentType(reqComponentType)) {
    return util.sendError("Invalid \"componentType\" param.", 400, req, res, next);
  }

  const query = {
    organizationFirebaseId: reqOrganizationFirebaseId,
    "config.type": reqComponentType,
    name: reqComponentName,
  };

  Component.findOne(query).exec(function (err, component) {
    if (err || !component) {
      return util.sendError(err || "Issues finding component.", 400, req, res, next);
    }

    component.remove(function (err) {
      if (err) {
        return util.sendError(err, 400, req, res, next);
      }

      // Return the component obj
      res.sendResult = {
        status: "Success",
        message: "Removed Library Component",
      };
      return next();
    });
  });
};

/**
 * Remove measure per Org id and name
 */
exports.deleteLibraryMeasure = function (req, res, next) {
  const reqOrganizationFirebaseId = req.query.organizationId;
  const reqMeasureName = req.query.name;

  if (!reqOrganizationFirebaseId) {
    return util.sendError("Field \"organizationId\" is required.", 400, req, res, next);
  }

  // API Key verification
  if (reqOrganizationFirebaseId !== req.apiKey.organizationFirebaseId) {
    return util.sendError("Key mismatch.", 400, req, res, next);
  }

  if (!reqMeasureName) {
    return util.sendError("Field \"name\" is required.", 400, req, res, next);
  }

  const query = {
    organizationFirebaseId: reqOrganizationFirebaseId,
    displayName: reqMeasureName,
  };

  Project.findOne(query).exec(function (err, measure) {
    if (err || !measure) {
      return util.sendError(err || "Issues finding measure.", 400, req, res, next);
    }

    measure.remove(function (err) {
      if (err) {
        return util.sendError(err, 400, req, res, next);
      }

      // Return the measure obj
      res.sendResult = {
        status: "Success",
        message: "Removed Library Measure",
      };
      return next();
    });
  });
};

/**
 * Search against the Library API for Component Data
 *
 * - Example and Structure:
 *    https://library.simuwatt.com/api/search.json/?fq[]=bundle:nrel_component&api_version=2.0&fq[]=sm_vid_Component_Tags:Electric%20Lighting
 */
exports.searchLibraryComponent = function (req, res, next) {
  const reqComponentType = req.params.componentType.toLowerCase();

  if (!validate.valComponentType(reqComponentType)) {
    return util.sendError("Invalid \"componentType\" param.", 400, req, res, next);
  }

  const options = {
    componentType: reqComponentType,
    mock: process.env.NODE_ENV === "test",
  };

  // Search BCL per component type
  bcl.searchComponent(options, function (err, response) {
    if (err) {
      return util.sendError(err, 400, req, res, next);
    }

    // Return the library measure response
    res.sendResult = {
      status: "Success",
      message: "Library Component Search Success",
      components: response,
    };
    return next();
  });
};

/**
 * Search against the Library API for Measure Data
 *
 * - Example and Structure:
 *    https://library.simuwatt.com/api/search.json/?fq[]=bundle:nrel_measure&api_version=2.0
 */
exports.searchLibraryMeasure = function (req, res, next) {
  const options = {
    mock: process.env.NODE_ENV === "test",
  };

  // Search BCL measures
  bcl.searchMeasure(options, function (err, response) {
    if (err) {
      return util.sendError(err, 400, req, res, next);
    }

    // Return the library measure response
    res.sendResult = {
      status: "Success",
      message: "Library Measure Search Success",
      measures: response,
    };
    return next();
  });
};

/**
 * Return public component data per requested component type
 */
exports.getPublicComponents = function (req, res, next) {
  const reqComponentType = req.params.componentType.toLowerCase();
  if (!validate.valComponentType(reqComponentType)) {
    return util.sendError("Invalid \"componentType\" param.", 400, req, res, next);
  }

  const query = {
    "config.type": reqComponentType,
  };

  PublicComponent.find(query).lean(true).exec(function (err, publicComponents) {
    if (err) {
      return util.sendError(err, 400, req, res, next);
    }

    // Return the public component response
    res.sendResult = {
      status: "Success",
      message: "Retrieved Public Components - " + reqComponentType,
      components: publicComponents || [],
    };
    return next();
  });
};

/**
 * Return public measure data
 */
exports.getPublicMeasures = function (req, res, next) {
  const query = {

  };

  PublicMeasure.find(query).lean(true).exec(function (err, publicMeasures) {
    if (err) {
      return util.sendError(err, 400, req, res, next);
    }

    _transformMeasures(publicMeasures).then((transformedPublicMeasures) => {
      // Return the public measure response
      res.sendResult = {
        status: "Success",
        message: "Retrieved Public Measures",
        measures: transformedPublicMeasures || [],
      };
      return next();
    });
  });
};

/**
 * Query and provide a proxy against old Library
 */
exports.queryLibraryProxy = function (req, res, next) {
  const reqQueryString = req.body.querystring;

  if (!reqQueryString) {
    return util.sendError("Field \"querystring\" is required.", 400, req, res, next);
  }

  const options = {
    mock: process.env.NODE_ENV === "test",
    querystring: reqQueryString,
  };

  // Query for BCL results
  bcl.queryProxy(options, function (err, result) {
    if (err) {
      return util.sendError(err, 400, req, res, next);
    }

    // Return the relayed library response
    res.sendResult = {
      status: "Success",
      message: "Library Query Success",
      result: result,
    };
    return next();
  });
};

/**
 * Sync process to send all library components/measures to user for offline storage
 */
exports.syncLibrary = function (req, res, next) {
  const reqOrganizationFirebaseId = req.query.organizationId;
  if (!reqOrganizationFirebaseId) {
    return util.sendError("Field \"organizationId\" is required.", 400, req, res, next);
  }

  // API Key verification
  if (reqOrganizationFirebaseId !== req.apiKey.organizationFirebaseId) {
    return util.sendError("Key mismatch.", 400, req, res, next);
  }

  const query = {
    organizationFirebaseId: reqOrganizationFirebaseId,
  };

  Project.find(query).lean(true).exec(function (err, measures) {
    if (err) {
      return util.sendError(err, 400, req, res, next);
    }

    Component.find(query).sort("config.typeplural").lean(true).exec(function (err, componentsRes) {
      if (err) {
        return util.sendError(err, 400, req, res, next);
      }

      // Format and sort the components per the component type
      const components = {};
      if (componentsRes && componentsRes.length) {
        for (let i = 0; i < componentsRes.length; i += 1) {
          if (componentsRes[i].config && componentsRes[i].config.type) {
            if (!components[componentsRes[i].config.type]) {
              components[componentsRes[i].config.type] = [];
            }
            components[componentsRes[i].config.type].push(componentsRes[i]);
          }
        }
      }

      // Return the full library data set
      res.sendResult = {
        status: "Success",
        message: "Retrieved Library Sync Data Set",
        sync: { measures: measures, components: components },
      };
      return next();
    });
  });
};

/**
 * Sync process to send all public library components/measures to user for offline storage
 */
exports.syncPublicLibrary = function (req, res, next) {
  const query = {

  };

  PublicMeasure.find(query).lean(true).exec(function (err, measures) {
    if (err) {
      return util.sendError(err, 400, req, res, next);
    }

    PublicComponent.find(query).sort("config.typeplural").lean(true).exec(function (err, componentsRes) {
      if (err) {
        return util.sendError(err, 400, req, res, next);
      }

      // Format and sort the components per the component type
      const components = {};
      if (componentsRes && componentsRes.length) {
        for (let i = 0; i < componentsRes.length; i += 1) {
          if (componentsRes[i].config && componentsRes[i].config.type) {
            if (!components[componentsRes[i].config.type]) {
              components[componentsRes[i].config.type] = [];
            }
            components[componentsRes[i].config.type].push(componentsRes[i]);
          }
        }
      }

      // Return the full public library data set
      res.sendResult = {
        status: "Success",
        message: "Retrieved Public Library Sync Data Set",
        sync: { measures: measures, components: components },
      };
      return next();
    });
  });
};
