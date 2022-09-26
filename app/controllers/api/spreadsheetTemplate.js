"use strict";

const mongoose = require("mongoose");
const Organization = mongoose.model("Organization");
const util = require("./utils/api.utils");
const { SpreadsheetTemplate } = require("../../models/spreadsheetTemplate");
const datasourceColumns = require("./utils/datasource.columns.json");
const validate = require("./utils/api.validation");
const ObjectId = mongoose.Types.ObjectId;

/**
 * Create Spreadsheet Template
 */
exports.saveSpreadsheetTemplate = async (req, res, next) => {
  try {
    const createdByUserId = req.user._id;

    if (!req.body) {
      return util.sendError("Invalid request.", 400, req, res, next);
    }
    let body = req.body;

    if (!body.name || !body.type) {
      return util.sendError(
        "Mandatory Params name and type missing",
        400,
        req,
        res,
        next
      );
    }

    let errorMessage = validateBody(body);
    if (errorMessage) {
      return util.sendError(errorMessage, 400, req, res, next);
    }

    if (!mongoose.Types.ObjectId.isValid(createdByUserId)) {
      return util.sendError("Invalid User Id", 400, req, res, next);
    }

    if (!mongoose.Types.ObjectId.isValid(body.organizationId)) {
      return util.sendError("Invalid Organization Id", 400, req, res, next);
    }

    body.createdByUserId = createdByUserId;

    // fetching columnHeadings from datasource.columns.json file and editing body object as per the type and datasource of the template
    const type = body.type;
    if (!validate.getSpreadSheetTypes().includes(type)) {
      return util.sendError(
        "Allowed spread sheet types building or project",
        400,
        req,
        res,
        next
      );
    }

    const sheets = body.sheets;
    for (let s = 0; s < sheets.length; s++) {
      const datasource = sheets[s].datasource;
      sheets[s]["columnHeadings"] = datasourceColumns[type][datasource];
    }
    body.sheets = sheets;

    const spreadsheet = new SpreadsheetTemplate(body);
    const spreadsheetTemplate = await spreadsheet.save();
    res.sendResult = {
      status: "Success",
      message: "Created Spreadsheet Template",
      spreadsheetTemplate: spreadsheetTemplate
    };
    return next();
  } catch (error) {
    return util.sendError(error, 500, req, res, next);
  }
};

/**
 * Get Spreadsheet Templates by Organization
 */
exports.getSpreadsheetTemplate = async (req, res, next) => {
  try {
    const orgId = req.query.organizationId;
    let currentOrganization = await Organization.findById({
      _id: orgId
    });
    let sharedTemplateOrgs = currentOrganization.sharedTemplateOrgs || [];
    sharedTemplateOrgs = sharedTemplateOrgs
      .map(id => id.toString())
      .map(id => ObjectId(id));

    sharedTemplateOrgs = [...sharedTemplateOrgs, ObjectId(orgId)];
    if (!mongoose.Types.ObjectId.isValid(orgId)) {
      return util.sendError("Invalid Organization Id", 400, req, res, next);
    }
    const filterObj = {
      organizationId: { $in: sharedTemplateOrgs }
    };
    const spreadsheetTemplates = await SpreadsheetTemplate.find(
      filterObj
    ).populate({ path: "createdByUserId", select: { name: 1 } });
    res.sendResult = {
      status: "Success",
      message: "Retrieved Spreadsheet Templates",
      spreadsheetTemplate: spreadsheetTemplates
    };
    return next();
  } catch (error) {
    return util.sendError(error, 500, req, res, next);
  }
};

exports.getAllOrgSpreadsheetTemplate = async (req, res, next) => {
  try {
    const user = req.user;
    const filterObj = {
      organizationId: {
        $in: user.orgIds
      }
    };
    const spreadsheetTemplates = await SpreadsheetTemplate.find(filterObj);
    res.sendResult = {
      status: "Success",
      message: "Retrieved Spreadsheet Templates",
      spreadsheetTemplate: spreadsheetTemplates
    };
    return next();
  } catch (error) {
    return util.sendError(error, 500, req, res, next);
  }
};

/**
 *  Get Spreadsheet Templates by spreadsheetId
 */
exports.getSpreadsheetTemplateById = async (req, res, next) => {
  try {
    const { spreadsheetId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(spreadsheetId)) {
      return util.sendError("Invalid Spreadsheet Id", 400, req, res, next);
    }

    const spreadsheetTemplates = await SpreadsheetTemplate.findById(
      spreadsheetId
    ).exec();
    res.sendResult = {
      status: "Success",
      message: "Retrieved Spreadsheet Template",
      spreadsheetTemplate: spreadsheetTemplates
    };
    return next();
  } catch (error) {
    return util.sendError(error, 500, req, res, next);
  }
};

/**
 * Update Spreadsheet Template
 */
exports.updateSpreadsheetTemplate = async (req, res, next) => {
  try {
    const { spreadsheetId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(spreadsheetId)) {
      return util.sendError("Invalid Spreadsheet Id", 400, req, res, next);
    }

    const filterObj = {
      _id: spreadsheetId
    };
    const templateExist = await SpreadsheetTemplate.findOne(filterObj);
    if (!templateExist) {
      return util.sendError(
        "Spreadsheet Template does not exist",
        404,
        req,
        res,
        next
      );
    }

    if (!req.body) {
      throw new Error("Invalid request.");
    }
    let body = req.body;

    if (!body.name || !body.type) {
      return util.sendError(
        "Mandatory Params name and type missing",
        400,
        req,
        res,
        next
      );
    }

    let errorMessage = validateBody(body);
    if (errorMessage) {
      return util.sendError(errorMessage, 400, req, res, next);
    }

    if (!mongoose.Types.ObjectId.isValid(body.createdByUserId)) {
      return util.sendError("Invalid User Id", 400, req, res, next);
    }

    if (!mongoose.Types.ObjectId.isValid(body.organizationId)) {
      return util.sendError("Invalid Organization Id", 400, req, res, next);
    }

    const type = body.type;
    if (!validate.getSpreadSheetTypes().includes(type)) {
      return util.sendError(
        "Allowed spread sheet types building or project",
        400,
        req,
        res,
        next
      );
    }

    const sheets = body.sheets;
    for (let s = 0; s < sheets.length; s++) {
      const datasource = sheets[s].datasource;
      sheets[s]["columnHeadings"] = datasourceColumns[type][datasource];
    }
    body.sheets = sheets;

    let spreadsheet = new SpreadsheetTemplate(body);
    spreadsheet.isNew = false;
    const spreadsheetTemplate = await spreadsheet.save();
    res.sendResult = {
      status: "Success",
      message: "Updated Spreadsheet Template",
      spreadsheetTemplate: spreadsheetTemplate
    };
    return next();
  } catch (error) {
    return util.sendError(error, 500, req, res, next);
  }
};

/**
 * Delete Spreadsheet Templates
 */
exports.deleteSpreadsheetTemplate = async (req, res, next) => {
  try {
    const { spreadsheetId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(spreadsheetId)) {
      return util.sendError("Invalid Spreadsheet Id", 400, req, res, next);
    }

    const spreadsheet = await SpreadsheetTemplate.findByIdAndRemove(
      spreadsheetId
    );
    if (spreadsheet === null) {
      return util.sendError(
        "Spreadsheet Template does not exist",
        404,
        req,
        res,
        next
      );
    }

    res.sendResult = {
      status: "Success",
      message: "Removed Spreadsheet Template"
    };
    return next();
  } catch (error) {
    return util.sendError(error, 500, req, res, next);
  }
};

/**
 * Request Data Validations:
 *  1. For Equipments CAT Filters are mandatory
 *  2. For Utilities FuelType filter is mandatory
 *  3. Sheet Names should be unique as MSExcel wont allow duplicate sheetnames.
 *
 * Returns the errorMessage if any of the above errors found
 */
const validateBody = body => {
  let errorMessage = "";
  const sheets = body.sheets;
  let sheetNames = [];
  for (let sheet of sheets) {
    let sheetname = sheet.name;
    if (sheetNames.includes(sheetname)) {
      errorMessage = "Duplicate Sheet Names Are Not Allowed";
      return errorMessage;
    }
    sheetNames.push(sheetname);
    switch (sheet.datasource) {
      case "Equipment": {
        let metaData = sheet.metaData;
        if (
          !metaData ||
          (!metaData.category && !metaData.application && !metaData.technology)
        ) {
          errorMessage =
            "Equipment: Category or Application or Technology filter selection is mandatory";
          return errorMessage;
        }
        break;
      }
    }
  }
  return errorMessage;
};
