"use strict";

/**
 * Module dependencies.
 */
const mongoose = require("mongoose");
const util = require("./utils/api.utils");
const Action = mongoose.model("Action");
const Building = mongoose.model("Building");
const excelReportClient = require("./utils/api.excel.report.client");

const {
  BuildingEquipment,
} = require("../../types/buildingequipment/buildingequipment.model");
const translator = require("bsxml-translator");

const getNYCRCxData = function (buildingId, acitonId) {
  // Get
  const getAction = Action.findById(acitonId)
    .populate("projects._id")
    .exec();

  const getBuilding = Building.findById(buildingId).exec();

  return Promise.all([getAction, getBuilding]).then(([action, building]) => {
    let owner = {};
    let licensedProfessional = {};
    let commissioningAgent = null;
    let operator = {};
    action.contacts.forEach(contact => {
      if (contact.title === "Owner") {
        owner = contact;
      }

      if (contact.title === "Licensed Professional") {
        licensedProfessional = contact;
      }

      if (contact.title === "Commissioning Agent") {
        commissioningAgent = contact;
      }

      if (contact.title === "Operator") {
        operator = contact;
      }
    });

    let teamCommissioningAgent = {};
    if (commissioningAgent) {
      teamCommissioningAgent = {
        CommissioningAgent:
          commissioningAgent.firstName + " " + commissioningAgent.lastName ||
          "", // Commissioning Agent First Name and Last Name
        YearsExperience: commissioningAgent.yearsOfExperience, // Commissioning Agent Years of Experience
        CertType: commissioningAgent.qualification || "", // Commissioning Agent Qualification
        CertExpirationDate: commissioningAgent.expirationDate || "", // Commissioning Agent Expiration Date
      };

      if (
        teamCommissioningAgent.YearsExperience === "" ||
        teamCommissioningAgent.YearsExperience === null ||
        teamCommissioningAgent.YearsExperience === undefined
      ) {
        delete teamCommissioningAgent.YearsExperience;
      }
    }

    return {
      SubmittalInfo: {
        SubmittedBy: owner.firstName + " " + owner.lastName || "", // Owner First Name and Last Name
        Company: owner.company || "", // Company
        Phone: owner.phoneNumber || "", // Phone Number
        Email: owner.emailAddress || "", // Email Address
        Borough: (building.nycFields && building.nycFields.borough) || "", // Property Tab > Borough
        Block: (building.nycFields && building.nycFields.block) || "", // Property Tab > Block
        Lot: (building.nycFields && building.nycFields.taxLot) || "", // Property Tab > Tax Lot
        BinNumber: (building.nycFields && building.nycFields.bin) || "", // Property Tab > BIN
        Address: (building.location && building.location.address) || "", // Property Tab > Address
        Zip: (building.location && building.location.zipCode) || "", // Property Tab > Address
      },
      TeamInfo: {
        ProfessionalName:
          licensedProfessional.firstName +
            " " +
            licensedProfessional.lastName || "", // Licensed Professional First Name and Last Name
        License: licensedProfessional.qualification || "", // Licensed Professional Qualification
        LicenseNo: licensedProfessional.certificateNumber || "", // Licensed Professional Certificate Number
        Company: licensedProfessional.company || "", // Licensed Professional Company
        Address: licensedProfessional.address || "", // Licensed Professional Address
        Phone: licensedProfessional.phoneNumber || "", // Licensed Professional Phone
        ...teamCommissioningAgent,
      },
      BuildingInfo: {
        Owner: owner.firstName + " " + owner.lastName || "",
        OwnerRepresentative: "",
        ManagementCompany: "",
        ManagementContact: "",
        Phone: owner.phoneNumber || "",
        OperatorName: operator.firstName + " " + operator.lastName || "", // Operator First Name and Last Name
        OperatorCert: operator.qualification || "", // Operator Qualification
        OperatorLicenseNo: operator.certificateNumber || "", // Operator Certificate Number
        State: operator.certificationState || "", // Operator Certification State
      },
      Projects: action.projects.map(({ _id }) => {
        const { initialValues = {} } = _id;
        return {
          Name: _id.displayName || "",
          Compliant: initialValues.compliant || "",
          Notes: initialValues.notes || "", // If Yes is selected under Compliant column, enter "No deficiency observed" OR "Deficiency observed and corrected". If N/A is selected under Compliant column then provide reasons.
          DeficiencyCorrected: "", // Enter N/A if "No deficiency is observed or if "N/A" is selected under "Compliant" and reasons are provided under "Notes".
          ApproachToCompliance: initialValues.approach || "",
          ImplementationCost: initialValues.implementationCost || "",
          Electricity: initialValues.electric || "",
          Gas: initialValues.gas || "",
          Oil: initialValues.oil || "",
          Steam: initialValues.steam || "",
          Other: initialValues.other || "",
          AnnualEnergySavings: initialValues.totalSavings || "",
          AnnualCostSavings: initialValues.totalCostSavings || "",
        };
      }),
    };
  });
};
/**
 * Generate NYC excel report from JSON blob
 */
exports.getNYCExcelData = function (req, res, next) {
  const d = new Date();
  const hr = d.getHours();
  let min = d.getMinutes();
  if (min < 10) {
    min = "0" + min;
  }
  const date = d.getDate();
  const month = d.getMonth() + 1;
  const year = d.getFullYear();

  const opts = {
    filename:
      "NYCExcelReport_" + month + "." + date + "." + year + "_" + hr + "." + min,
  };

  const { action } = req.query;
  const { buildingId, userId } = req.params;
  getNYCRCxData(buildingId, action, userId).then(body => {
    opts.body = body;

    excelReportClient.getNYCExcelReport(opts, function (err, report) {
      if (err) {
        res.cookie('downloading', 'finished', { path: '/' });
        return util.sendError(
          "Issues generating excel report.",
          400,
          req,
          res,
          next
        );
      }

      // Set header data for file type and filename
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        "attachment; " + "filename=" + report.filename + ".xls"
      );

      res.cookie('downloading', 'finished', { path: '/' });

      return res.send(report.buffer || "");
    });
  });
};

// Generate BSXML excel report from buildee blob
exports.getBSXMLExcelData = async function (req, res, next) {
  const d = new Date();
  const hr = d.getHours();
  let min = d.getMinutes();
  if (min < 10) {
    min = "0" + min;
  }
  const date = d.getDate();
  const month = d.getMonth() + 1;
  const year = d.getFullYear();

  const { buildingId } = req.params;
  const building = await Building.findById(buildingId)
    .lean()
    .exec();

  const { action } = req.query;

  const buildingEquipment = await BuildingEquipment.find({
    building: buildingId,
  })
    .populate(["libraryEquipment"])
    .lean()
    .exec();

  const buildingLocations = await Building.findById(buildingId)
    .populate(["locations.location"])
    .lean()
    .exec();

  const buildingConstructions = await Building.findById(buildingId)
    .populate(["constructions.construction"])
    .lean()
    .exec();

  const buildingUtilities = await Building.findById(buildingId)
    .populate(["utilityIds"])
    .lean()
    .exec();

  const buildingProjects = await Building.findById(buildingId, {
    projectIds: 1,
  })
    .populate(["projectIds"])
    .lean()
    .exec();

  const buildingAction = await Action.findById(action);

  const translatorBuilding = { building };
  console.log("TRANSLATOR BUILDING:", buildingId);
  console.log(JSON.stringify(translatorBuilding));
  const translatorLocations = {
    data: {
      building: {
        _id: buildingLocations._id,
        locations: buildingLocations.locations,
      },
    },
  };
  console.log("TRANSLATOR LOCATIONS:", buildingId);
  console.log(JSON.stringify(translatorLocations));

  const translatorEquipment = { data: { buildingEquipment } };
  console.log("TRANSLATOR EQUIPMENT:", buildingId);
  console.log(JSON.stringify(translatorEquipment));

  const translatorConstructions = {
    data: {
      building: {
        _id: buildingConstructions._id,
        constructions: buildingConstructions.constructions,
      },
    },
  };
  console.log("TRANSLATOR CONSTRUCTIONS:", buildingId);
  console.log(JSON.stringify(translatorConstructions));

  console.log("TRANSLATOR ACTIONS:", buildingId);
  console.log(JSON.stringify(buildingAction));

  const translatorUtilities = {
    utilities: buildingUtilities.utilityIds,
  };
  console.log("TRANSLATOR UTILITIES:", buildingId);
  console.log(JSON.stringify(translatorUtilities));

  const translatorProjects = {
    building: { projects: buildingProjects.projectIds },
  };
  console.log("TRANSLATOR PROJECTS:", buildingId);
  console.log(JSON.stringify(translatorProjects));

  const XML = translator.createFacility(
    translatorBuilding,
    translatorLocations,
    translatorEquipment,
    translatorConstructions,
    buildingAction,
    translatorUtilities,
    translatorProjects
  );

  res.setHeader("Content-Type", "application/xml");
  res.setHeader(
    "Content-Disposition",
    "attachment; " +
      "filename=" +
      `BSXMLExcelReport_${month}.${date}.${year}_${hr}.${min}` +
      ".xml"
  );

  res.cookie('downloading', 'finished', { path: '/' });

  return res.send(XML);
};
