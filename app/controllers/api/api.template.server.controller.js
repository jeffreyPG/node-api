"use strict";

/**
 * Module dependencies.
 */
const _ = require("lodash");
const mongoose = require("mongoose");
const util = require("./utils/api.utils");
const Template = mongoose.model("Template");
const Organization = mongoose.model("Organization");
const validate = require("./utils/api.validation");
const reportClient = require("./utils/api.report.client");
const ObjectId = mongoose.Types.ObjectId;

const HTMLELEMENTS = reportClient.htmlElementsArr;
const TARGETSARR = reportClient.targetsArr;
const TARGETFIELDSARR = reportClient.targetFieldsArr;
const HTMLTYPEMAP = reportClient.htmlTypeMapper;

const getOrgIdForTemplateId = function(orgTemplateIds, templateId) {
  return Object.keys(orgTemplateIds).find(orgId =>
    orgTemplateIds[orgId].includes(templateId)
  );
};

const getTemplateForIds = async function(orgTemplateIds, callbackFn) {
  const templateIds = Object.values(orgTemplateIds).flat();
  const cleanedTemplates = [];
  try {
    const templates = await Template.find({
      _id: { $in: templateIds }
    }).populate({ path: "createdByUserId", select: { name: 1 } });
    // clean templates list to only include what is need on template list view
    const cleanTemplatesForList = function(templates = []) {
      templates.map(template => {
        const cleanedTemplate = {};

        cleanedTemplate._id = template._id;
        cleanedTemplate.name = template.name;
        cleanedTemplate.createdAt = template.createdAt;
        cleanedTemplate.updatedAt = template.updatedAt || template.updated;
        cleanedTemplate.tableOfContents = template.config.tableOfContents;
        cleanedTemplate.orgId = getOrgIdForTemplateId(
          orgTemplateIds,
          template._id
        );
        cleanedTemplate.createdByUser = template.createdByUserId
          ? template.createdByUserId.name
          : "";
        cleanedTemplates.push(cleanedTemplate);
      });
    };

    cleanTemplatesForList(templates);
    callbackFn(null, cleanedTemplates);
  } catch (err) {
    callbackFn(err, cleanedTemplates);
  }
};
/**
 * Get a list of a org's templates
 */
exports.getOrgTemplates = async (req, res, next) => {
  try {
    const user = req.user;
    const org = req.organization;
    let orgTemplateIds = {};
    const orgUserObj = org.users.find(obj => {
      return obj.userId.toString() === user._id.toString();
    }) ?? {
      templateIds: ["all"]
    };
    if (orgUserObj.templateIds[0] === "all") {
      orgTemplateIds[org._id] = org.templateIds;
      let sharedTemplateOrgs = org.sharedTemplateOrgs || [];
      const allTemplatesOrgs = sharedTemplateOrgs.map(id => id.toString());

      sharedTemplateOrgs = sharedTemplateOrgs
        .filter(id => id.toString() !== org._id.toString())
        .map(id => id.toString())
        .map(id => ObjectId(id));

      let organizations = await Organization.find({
        _id: { $in: sharedTemplateOrgs },
        isArchived: { $ne: true }
      })
        .lean()
        .exec();
      for (let organization of organizations) {
        let templateIds = organization.templateIds || [];
        templateIds = templateIds.map(id => ObjectId(id));
        orgTemplateIds[organization._id] = templateIds;
      }
      if (!allTemplatesOrgs.includes(org._id.toString())) {
        orgTemplateIds[org._id] = [];
      }
    } else {
      orgTemplateIds[org._id] = orgUserObj.templateIds;
    }

    getTemplateForIds(orgTemplateIds, function(err, templates) {
      if (err) {
        return util.sendError(err, 400, req, res, next);
      }

      // Return the template object
      res.sendResult = {
        status: "Success",
        message: "Retrieved Templates",
        organization: req.organization || {},
        templates: templates || []
      };
      return next();
    });
  } catch (error) {
    console.log("error", error);
    return util.sendError(err, 400, req, res, next);
  }
};

exports.getAllOrgTemplates = function(req, res, next) {
  const user = req.user;
  Organization.find({ _id: { $in: user.orgIds } }, function(err, orgs) {
    let orgTemplateIds = {};
    orgs.forEach(org => {
      const orgUserObj = org.users.find(obj => {
        return obj.userId.toString() === user._id.toString();
      });
      if (orgUserObj.templateIds[0] === "all") {
        orgTemplateIds[org._id] = org.templateIds;
      } else {
        orgTemplateIds[org._id] = orgUserObj.templateIds;
      }
    });
    getTemplateForIds(orgTemplateIds, function(err, templates) {
      if (err) {
        return util.sendError(err, 400, req, res, next);
      }

      // Return the template object
      res.sendResult = {
        status: "Success",
        message: "Retrieved Templates",
        organization: req.organization || {},
        templates: templates || []
      };
      return next();
    });
  });
};

/**
 * Get single template by id
 */
exports.getOrgTemplate = function(req, res, next) {
  const user = req.user;
  const template = req.template;
  const currentOrg = req.organization;

  // Check if user isn't a part of the current org
  if (user.orgIds.indexOf(currentOrg._id.toString()) === -1) {
    return util.sendError("Permission denied.", 400, req, res, next);
  }

  template.updated = Date.now();

  template.save(function(err) {
    if (err) {
      return util.sendError(err, 400, req, res, next);
    }

    // Return the template object
    res.sendResult = {
      status: "Success",
      message: "Retrieved Template",
      template: template
    };

    return next();
  });
};

/**
 * Delete template by id
 */
exports.deleteOrgTemplate = function(req, res, next) {
  const user = req.user;
  const template = req.template;
  let currentOrg = req.organization;

  // Check if user isn't a part of the current org
  if (user.orgIds.indexOf(currentOrg._id.toString()) === -1) {
    return util.sendError("Permission denied.", 400, req, res, next);
  }

  // remove all instances of that template id on the organization model
  const tempTemplateIds = currentOrg.templateIds;
  for (let i = tempTemplateIds.length - 1; i >= 0; i--) {
    if (tempTemplateIds[i].toString() === template._id.toString()) {
      tempTemplateIds.splice(i, 1);
    }
  }
  // save current org
  currentOrg = _.extend(currentOrg, {
    templateIds: tempTemplateIds
  });

  currentOrg.save(function(err) {
    if (err) {
      return util.sendError(err, 400, req, res, next);
    }

    template.remove(function(err) {
      if (err) {
        return util.sendError(err, 400, req, res, next);
      }

      // Return the template object
      res.sendResult = {
        status: "Success",
        message: "Removed Document Template",
        currentOrg: currentOrg
      };
      return next();
    });
  });
};

/**
 * Create a user template
 */
exports.createOrgTemplate = function(req, res, next) {
  const reqTemplate = req.body;
  const reqTemplateBody = req.body.body;

  if (!reqTemplate || (reqTemplate && !reqTemplate.name)) {
    return util.sendError('Field "name" is required.', 400, req, res, next);
  }

  if (!reqTemplateBody) {
    return util.sendError('Field "body" is required.', 400, req, res, next);
  }
  if (!_.isArray(reqTemplateBody)) {
    return util.sendError(
      'Field "body" must be an array.',
      400,
      req,
      res,
      next
    );
  }

  const tmpValArr = [];
  let tmpValEle;
  // Validate the template body
  reqTemplateBody.map(function(htmlObj, index) {
    tmpValEle = { valid: true, index: index, validationErrors: [] };
    if (!htmlObj.ele && !htmlObj.type) {
      tmpValEle.valid = false;
      tmpValEle.validationErrors.push('Must contain "ele" or "type" field.');
    }

    // If there is no specific element, then fall to the default for the type
    if (!htmlObj.ele && htmlObj.type && HTMLTYPEMAP[htmlObj.type])
      htmlObj.ele = HTMLTYPEMAP[htmlObj.type] || null;
    if (!htmlObj.ele) {
      tmpValEle.valid = false;
      tmpValEle.validationErrors.push(
        'Field "ele" is not set, or no default for the "type" provided.'
      );
    }

    // Validate against the whitelisted elements
    if (HTMLELEMENTS.indexOf(htmlObj.ele) === -1) {
      tmpValEle.valid = false;
      tmpValEle.validationErrors.push(
        'Field "ele" is not an allowed html element.'
      );
    }

    // Ensure target / fields are present for some elements/types
    if (
      htmlObj.type === "ordered-list-text" ||
      htmlObj.type === "unordered-list-text" ||
      htmlObj.type === "google-map"
    ) {
      if (!htmlObj.fields || (htmlObj.fields && !_.isArray(htmlObj.fields))) {
        tmpValEle.valid = false;
        tmpValEle.validationErrors.push('Field "fields" is invalid.');
      }
    } else {
      if (
        TARGETFIELDSARR.indexOf(htmlObj.ele) !== -1 ||
        TARGETFIELDSARR.indexOf(htmlObj.type || "") !== -1
      ) {
        if (
          !htmlObj.target ||
          (htmlObj.target && TARGETSARR.indexOf(htmlObj.target) === -1)
        ) {
          tmpValEle.valid = false;
          tmpValEle.validationErrors.push('Field "target" is invalid.');
        }
        if (htmlObj.type === "divider") {
          if (
            !htmlObj.dividerConfig ||
            (htmlObj.dividerConfig && !_.isObject(htmlObj.dividerConfig))
          ) {
            tmpValEle.valid = false;
            tmpValEle.validationErrors.push(
              'Field "dividerConfig" is invalid.'
            );
          }
          if (htmlObj.dividerConfig && !htmlObj.dividerConfig.color) {
            tmpValEle.valid = false;
            tmpValEle.validationErrors.push('Field "color" is invalid.');
          }
          if (htmlObj.dividerConfig && !htmlObj.dividerConfig.width) {
            tmpValEle.valid = false;
            tmpValEle.validationErrors.push('Field "width" is invalid.');
          }
        } else if (htmlObj.type !== "measures") {
          if (
            !htmlObj.fields ||
            (htmlObj.fields && !_.isArray(htmlObj.fields))
          ) {
            tmpValEle.valid = false;
            tmpValEle.validationErrors.push('Field "fields" is invalid.');
          }
        } else {
          if (!htmlObj.projectConfig) {
            tmpValEle.valid = false;
            tmpValEle.validationErrors.push(
              'Field "projectConfig" is not present.'
            );
          }
          if (htmlObj.projectConfig && !htmlObj.projectConfig.format) {
            tmpValEle.valid = false;
            tmpValEle.validationErrors.push('Field "format" is not present.');
          }
          if (htmlObj.projectConfig && !htmlObj.projectConfig.projectGrouping) {
            if (
              !["endUseTable", "energyTable"].includes(
                htmlObj.projectConfig.format
              )
            ) {
              tmpValEle.valid = false;
              tmpValEle.validationErrors.push(
                'Field "projectGrouping" is not present.'
              );
            }
          }
          const isValid = validateFullProjectTemplate(htmlObj);
          if (!isValid) {
            tmpValEle.valid = false;
            tmpValEle.validationErrors.push("Fields are not present.");
          }
        }
      }
    }

    // If there was an error, store to array
    if (!tmpValEle.valid) tmpValArr.push(tmpValEle);
  });

  // If there was validation errors in any of the req html ele objects, return the errors
  if (tmpValArr.length) {
    return util.sendError(tmpValArr, 400, req, res, next);
  }

  reqTemplate.createdByUserId = req.user._id;

  const template = new Template(reqTemplate);

  // if the table of contents is greater than 6, less than 1 or not a whole number
  if (
    template.config.tableOfContentsDepth &&
    !isNaN(template.config.tableOfContentsDepth)
  ) {
    if (template.config.tableOfContentsDepth > 6) {
      template.config.tableOfContentsDepth = 6;
    }
    if (template.config.tableOfContentsDepth < 1) {
      template.config.tableOfContentsDepth = 1;
    }

    template.config.tableOfContentsDepth = Math.round(
      template.config.tableOfContentsDepth
    );
  }

  template.save(function(err, template) {
    if (err) {
      return util.sendError(err, 400, req, res, next);
    }

    // save templateId into organization object
    let currentOrg = req.organization;
    const tempTemplateIds = currentOrg.templateIds;

    tempTemplateIds.push(template._id);
    currentOrg = _.extend(currentOrg, {
      templateIds: tempTemplateIds
    });

    currentOrg.save(function(err) {
      if (err) {
        return util.sendError(err, 400, req, res, next);
      }

      // Return the template object
      res.sendResult = {
        status: "Success",
        message: "Created Template",
        template: {
          ...template,
          createdByUserEmail: req.user.email
        },
        currentOrg: currentOrg
      };
      return next();
    });
  });
};

/**
 * Update a template
 */
exports.updateOrgTemplates = function(req, res, next) {
  const user = req.user;
  let template = req.template;
  const reqTemplate = req.body.template || req.body;
  const currentOrg = req.organization;

  if (!reqTemplate) {
    return util.sendError("Invalid request.", 400, req, res, next);
  }

  // Check if user isn't a part of the current org
  if (user.orgIds.indexOf(currentOrg._id.toString()) === -1) {
    return util.sendError("Permission denied.", 400, req, res, next);
  }

  const tmpValArr = [];
  let tmpValEle;
  // Validate the template body
  reqTemplate.body.map(function(htmlObj, index) {
    tmpValEle = { valid: true, index: index, validationErrors: [] };
    if (!htmlObj.ele && !htmlObj.type) {
      tmpValEle.valid = false;
      tmpValEle.validationErrors.push('Must contain "ele" or "type" field.');
    }

    // If there is no specific element, then fall to the default for the type
    if (htmlObj.type && HTMLTYPEMAP[htmlObj.type])
      htmlObj.ele = HTMLTYPEMAP[htmlObj.type] || null;
    if (!htmlObj.ele) {
      tmpValEle.valid = false;
      tmpValEle.validationErrors.push(
        'Field "ele" is not set, or no default for the "type" provided.'
      );
    }

    // Validate against the whitelisted elements
    if (HTMLELEMENTS.indexOf(htmlObj.ele) === -1) {
      tmpValEle.valid = false;
      tmpValEle.validationErrors.push(
        'Field "ele" is not an allowed html element.'
      );
    }

    // Ensure target / fields are present for some elements/types
    if (
      htmlObj.type === "ordered-list-text" ||
      htmlObj.type === "unordered-list-text" ||
      htmlObj.type === "google-map"
    ) {
      if (!htmlObj.fields || (htmlObj.fields && !_.isArray(htmlObj.fields))) {
        tmpValEle.valid = false;
        tmpValEle.validationErrors.push('Field "fields" is invalid.');
      }
    } else {
      if (
        TARGETFIELDSARR.indexOf(htmlObj.ele) !== -1 ||
        TARGETFIELDSARR.indexOf(htmlObj.type || "") !== -1
      ) {
        if (
          !htmlObj.target ||
          (htmlObj.target && TARGETSARR.indexOf(htmlObj.target) === -1)
        ) {
          tmpValEle.valid = false;
          tmpValEle.validationErrors.push('Field "target" is invalid.');
        }
        if (htmlObj.type === "divider") {
          if (
            !htmlObj.dividerConfig ||
            (htmlObj.dividerConfig && !_.isObject(htmlObj.dividerConfig))
          ) {
            tmpValEle.valid = false;
            tmpValEle.validationErrors.push(
              'Field "dividerConfig" is invalid.'
            );
          }
          if (htmlObj.dividerConfig && !htmlObj.dividerConfig.color) {
            tmpValEle.valid = false;
            tmpValEle.validationErrors.push('Field "color" is invalid.');
          }
          if (htmlObj.dividerConfig && !htmlObj.dividerConfig.width) {
            tmpValEle.valid = false;
            tmpValEle.validationErrors.push('Field "width" is invalid.');
          }
        } else if (htmlObj.type !== "measures") {
          if (
            !htmlObj.fields ||
            (htmlObj.fields && !_.isArray(htmlObj.fields))
          ) {
            tmpValEle.valid = false;
            tmpValEle.validationErrors.push('Field "fields" is invalid.');
          }
        } else {
          if (!htmlObj.projectConfig) {
            tmpValEle.valid = false;
            tmpValEle.validationErrors.push(
              'Field "projectConfig" is not present.'
            );
          }
          if (htmlObj.projectConfig && !htmlObj.projectConfig.format) {
            tmpValEle.valid = false;
            tmpValEle.validationErrors.push('Field "format" is not present.');
          }
          if (htmlObj.projectConfig && !htmlObj.projectConfig.projectGrouping) {
            if (
              !["endUseTable", "energyTable"].includes(
                htmlObj.projectConfig.format
              )
            ) {
              tmpValEle.valid = false;
              tmpValEle.validationErrors.push(
                'Field "projectGrouping" is not present.'
              );
            }
          }
          const isValid = validateFullProjectTemplate(htmlObj);
          if (!isValid) {
            tmpValEle.valid = false;
            tmpValEle.validationErrors.push("Fields are not present.");
          }
        }
      }
    }

    // If there was an error, store to array
    if (!tmpValEle.valid) tmpValArr.push(tmpValEle);
  });

  // If there was validation errors in any of the req html ele objects, return the errors
  if (tmpValArr.length) {
    return util.sendError(tmpValArr, 400, req, res, next);
  }

  // Never allow client to modify these fields so remove from the req body
  const deleteFields = ["createdByUserId", "updated", "created"];
  deleteFields.map(function(field) {
    delete reqTemplate[field];
  });

  template = _.extend(template, reqTemplate);
  template.updated = Date.now();

  // if the table of contents is greater than 6, less than 1 or not a whole number
  if (
    template.config.tableOfContentsDepth &&
    !isNaN(template.config.tableOfContentsDepth)
  ) {
    if (template.config.tableOfContentsDepth > 6) {
      template.config.tableOfContentsDepth = 6;
    }
    if (template.config.tableOfContentsDepth < 1) {
      template.config.tableOfContentsDepth = 1;
    }

    template.config.tableOfContentsDepth = Math.round(
      template.config.tableOfContentsDepth
    );
  }

  template.save(function(err) {
    if (err) {
      return util.sendError(err, 400, req, res, next);
    }

    // Return the updated template object
    res.sendResult = {
      status: "Success",
      message: "Updated Template",
      template: template
    };
    return next();
  });
};

const validateFullProjectTemplate = htmlObj => {
  let isValid = true;
  // if (htmlObj.projectConfig && htmlObj.projectConfig.format === "fullDetails" && htmlObj.projectConfig.filter) {
  //   const categories = htmlObj.projectConfig.filter.category;
  //   isValid = categories && categories.length;
  //   for (let category of categories) {
  //     const contents = category.content || [];
  //     isValid = contents && contents.length;
  //     let pdt = contents.find(content => content.key === "projectDesignTable");
  //     let bct = contents.find(content => content.key === "businessCaseTable");
  //     if (pdt) {
  //       pdt = pdt && pdt.fields && pdt.fields.length || false;
  //       isValid = pdt;
  //     }
  //     if (bct) {
  //       bct = bct && bct.fields && bct.fields.length || false;
  //       isValid = bct;
  //     }
  //   }
  // }
  return isValid;
};

/**
 * Template param middleware
 */
exports.templateById = function(req, res, next, id) {
  if (!validate.valMongoObjId(id)) {
    return next(new Error("Invalid ID present in request."));
  }

  Template.findById(id).exec(function(err, template) {
    if (err) return next(err);
    if (!template) return next(new Error("Failed to load Template " + id));
    req.template = template;
    return next();
  });
};
