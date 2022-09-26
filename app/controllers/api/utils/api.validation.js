"use strict";

const _ = require("lodash");
const moment = require("moment");

/* const _filterFloat = function (value) {
  if (/^(\-|\+)?([0-9]+(\.[0-9]+)?|Infinity)$/.test(value)) return Number(value);
  return NaN;
}; */

const PANDOCTYPES = [
  "docx",
  "html",
  "html5",
  // 'json',
  "markdown",
  "markdown_github",
  "markdown_mmd",
  "markdown_strict"
  // 'plain'
];

exports.ORGTYPES = ["root", "group"];

const USERTYPES = ["buildingOwner", "serviceProvider"];

exports.USERROLES = ["owner", "admin", "editor", "user", "guest"];

const BENCHMARKTYPES = [
  "general",
  "heating",
  "cooling",
  "lighting",
  "dhw",
  "water"
];

const PROJECTTYPES = [
  "lighting",
  "water",
  "mechanical",
  "occupancy",
  "nve",
  "building"
];

const DATASOURCES = [
  "Project",
  "Overview & Property",
  "Utilities",
  "Operation",
  "Equipment",
  "Locations",
  "Systems",
  "Construction"
];
const SPREADSHEETTYPES = ["building", "project"];

const CONTACTROLES = [
  "Premises",
  "Occupant",
  "Agency",
  "Owner",
  "Customer",
  "Customer Agreement",
  "Administrator",
  "Qualified Assessor",
  "Contributor",
  "Property Management Company",
  "Operator",
  "Energy Auditor",
  "Energy Modeler",
  "Contractor",
  "Implementer",
  "Financier",
  "Commissioning Agent",
  "MV Agent",
  "Evaluator",
  "Builder",
  "Service",
  "Billing",
  "Architect",
  "Mechanical Engineer",
  "Energy Consultant",
  "Service and Product Provider",
  "Authority Having Jurisdiction",
  "Utility",
  "Power Plant",
  "Electric Distribution Utility (EDU)",
  "ESCO",
  "Facilitator",
  "Facility Manager",
  "Trainer",
  "Electrical Engineer",
  "Controls Engineer",
  "Lender",
  "Servicer",
  "Originator",
  "Other",
  ""
];

const CONTACTQUALIFICATION = [
  "Professional Engineer (PE)",
  "Registered Architect (RA)",
  "Certified Energy Manager (CEM)",
  "Certified Energy Auditor (CEA)",
  "ASHRAE Building Energy Assessment Professional (BEAP)",
  "High-Performance Building Design Professional (HBDP)",
  "Building Performance Institute: Multifamily Building Analyst",
  "Building Performance Institute (BPI) Certification",
  "Building Operator Certification (BOC)",
  "Building Performance Institute: Building Analyst (BA)",
  "Refrigerating System Operating Engineer",
  "High Pressure Boiler Operating Engineer",
  "Certified Commissioning Professional (CCP)",
  "Associate Commissioning Professional (ACP)",
  "Existing Building Commissioning Professional (EBCP)",
  "Commissioning Process Management Professional (CPMP)",
  "Accredited Commissioning Process Authority Professional (CxAP)",
  ""
];

const BUILDINGUSES = [
  "adult-education",
  "aquarium",
  "automobile-dealership",
  "bank-branch",
  "bar",
  "barracks",
  "bowling-alley",
  "casino",
  "college",
  "convenience-store-gas",
  "convenience-store",
  "convention-center",
  "courthouse",
  "data-center",
  "distribution-center",
  "water-treatment",
  "enclosed-mall",
  "energy-station",
  "fast-food",
  "financial-office",
  "fire-station",
  "fitness-center",
  "food-sales",
  "food-services",
  "hospital",
  "hotel",
  "ice-rink",
  "indoor-arena",
  "school",
  "laboratory",
  "library",
  "lifestyle-center",
  "mailing-center",
  "manufacturing-plant",
  "medical-office",
  "microbreweries",
  "mixed-use",
  "movie-theater",
  "multifamily-housing",
  "museum",
  "non-refrigerated",
  "office",
  "other-education",
  "other-entertainment",
  "other-lodging/Residential",
  "other-office",
  "other-other",
  "other-public",
  "other-recreation",
  "other-restaurant",
  "other-retail",
  "other-services",
  "other-hospital",
  "other-stadium",
  "other-technology",
  "other-utility",
  "outpatient-rehabilitation",
  "performing-arts",
  "personal-services",
  "police-station",
  "pre-school",
  "prison",
  "race-track",
  "refrigerated-warehouse",
  "repair-services",
  "residential-care",
  "residential-hall",
  "restaurants",
  "retail-store",
  "roller-rink",
  "self-storage",
  "senior-care",
  "single-family",
  "social-hall",
  "stadium-closed",
  "stadium-open",
  "strip-mall",
  "supermarket",
  "transportation-terminal",
  "urgent-care",
  "veterinary-office",
  "vocational-school",
  "wastewater-treatment-plant",
  "wholesale-club",
  "worship-facility",
  "zoo",
  "parking",
  "mobile-home",
  "single-family-detached",
  "single-family-attached",
  "apartment-small",
  "apartment-medium",
  ""
];

const COMPONENTTAGSMAP = {
  constructions: "Construction",
  lightfixture: "Electric Lighting",
  plugload: "Plug Load",
  processload: "Process Load",
  waterfixture: "Water Fixture",
  window: "Window",
  door: "Door",
  coolingtowers: "Cooling Tower",
  chiller: "Chiller",
  boiler: "Boiler",
  dhw: "Hot Water Heater",
  pump: "Pump",
  fan: "Fans",
  terminal: "Terminal",
  occupant: "Occupant"
};

const OPEN247 = ["yes", "no"];

const UTILITY_TYPES = {
  ELECTRICITY: 'electric',
  ELECTRICITY_DEMAND: 'electricityDemand',
  SOLAR: 'solar',
  NATURAL_GAS: 'naturalgas',
  STEAM: 'steam',
  FUEL_OIL_1: 'fueloil1',
  FUEL_OIL_2: 'fueloil2',
  FUEL_OIL_4: 'fueloil4',
  FUEL_OIL_56: 'fueloil56',
  DIESEL: 'diesel',
  PROPANE: 'propane',
  KEROSENE: 'kerosene',
  DISTRICT_HOT_WATER: 'districtHotWater',
  DISTRICT_CHILLED_WATER_ELECTRIC_METER: 'districtChilledWaterElectricMeter',
  DISTRICT_CHILLED_WATER_ABSORPTION_METER: 'districtChilledWaterAbsorptionMeter',
  DISTRICT_CHILLED_WATER_ENGINE_METER: 'districtChilledWaterEngineMeter',
  DISTRICT_CHILLED_WATER_OTHER_METER: 'districtChilledWaterOtherMeter',
  WIND: 'wind',
  WOOD: 'wood',
  OTHER: 'other'
}

const CUSTOMUTILITYDATEREGEX = new RegExp(
  /^([0-9]{2})([\/\-])([0-9]{2})([\/\-])([0-9]{4})$/
);
const CUSTOMDATEREGEX = new RegExp(
  /^([0-9]{4})[-]([0-9]{2})[-]([0-9]{2})$|^([0-9]{8})$/
);
const CSVLINEITEMREGEX = new RegExp(
  /^\s*(?:'[^'\\]*(?:\\[\S\s][^'\\]*)*'|"[^"\\]*(?:\\[\S\s][^"\\]*)*"|[^,'"\s\\]*(?:\s+[^,'"\s\\]+)*)\s*(?:,\s*(?:'[^'\\]*(?:\\[\S\s][^'\\]*)*'|"[^"\\]*(?:\\[\S\s][^"\\]*)*"|[^,'"\s\\]*(?:\s+[^,'"\s\\]+)*)\s*)*$/
);

const LIBRARYITEMS = ["component", "measure"];
const LIBRARYMEASURETYPES = ["measure"];
const LIBRARYCOMPONENTTYPES = [
  "lightfixture",
  "plugload",
  "processload",
  "waterfixture",
  "window",
  "door"
];
const LIBRARYTYPES = _.concat(LIBRARYMEASURETYPES, LIBRARYCOMPONENTTYPES);

const FILEREGEX = new RegExp(/(.jpg|.png|.jpeg)$/);
const IMAGEVARIATIONS = {
  user: [{ suffix: "_icon", dim: { height: 80, width: 80 } }]
};

const libraryTypeMap = {
  measure: LIBRARYMEASURETYPES,
  component: LIBRARYCOMPONENTTYPES
};

exports.getComponentsMap = function() {
  return COMPONENTTAGSMAP;
};

exports.getFileExtensionRegex = function() {
  return FILEREGEX;
};
exports.getImageVariations = function() {
  return IMAGEVARIATIONS;
};

exports.getUserTypes = function() {
  return USERTYPES;
};

exports.getProjectTypes = function() {
  return PROJECTTYPES;
};
exports.getBuildingUses = function() {
  return BUILDINGUSES;
};

exports.getContactRoles = function() {
  return CONTACTROLES;
};

exports.getContactQualification = function() {
  return CONTACTQUALIFICATION;
};

exports.getOpen247 = function() {
  return OPEN247;
};
exports.getUtilityTypes = function() {
  return Object.values(UTILITY_TYPES);
};

/* const _checkEmpty = function (prop) {
  // For a Number value of 0, try to convert to string and check length
  return (prop && (typeof prop.toString === 'function' && prop.toString().length > 0));
}; */
const _checkMongoId = function(id) {
  return /^[0-9a-fA-F]{24}$/.test(id);
};
const _checkZipCode = function(zip) {
  return /^\d{5}(?:[-\s]\d{4})?$/.test(zip);
};
const _checkEmailAddress = function(email) {
  return /.+\@.+\..+/.test(email);
};

// Validate a Mongo Obj _id
exports.valMongoObjId = function(id) {
  return _checkMongoId(id);
};

exports.valEmailAddress = function(email) {
  return _checkEmailAddress(email);
};

exports.valExpertZipCode = function(zip) {
  if (!zip) {
    return false;
  }
  return _checkZipCode(zip);
};

exports.valZipCode = function(zip) {
  return _checkZipCode(zip);
};

exports.valVerificationCode = function(code) {
  return /^([a-zA-Z0-9]){30}$/.test(code);
};

exports.valUtilType = function(type) {
  return Object.values(UTILITY_TYPES).indexOf(type.toLowerCase()) !== -1;
};
exports.valUtilityDateString = function(date) {
  // if (_.isEmpty(date)) return true;
  return CUSTOMUTILITYDATEREGEX.test(date);
};

exports.valCsvLineItem = function(csvLineItem) {
  return CSVLINEITEMREGEX.test(csvLineItem);
};

exports.valFirebaseId = function(firebaseId) {
  return /^[a-zA-Z0-9\-\_]{15,25}$/.test(firebaseId);
};

exports.valPandocDocType = function(docType) {
  return PANDOCTYPES.indexOf(docType) !== -1;
};

exports.valBenchmarkType = function(type) {
  return BENCHMARKTYPES.indexOf(type.toLowerCase()) !== -1;
};

exports.valLibraryItem = function(item) {
  return LIBRARYITEMS.indexOf(item.toLowerCase()) !== -1;
};
exports.valLibraryType = function(type) {
  return LIBRARYTYPES.indexOf(type.toLowerCase()) !== -1;
};
exports.valLibraryTypePerItem = function(item, type) {
  if (!libraryTypeMap[item.toLowerCase()]) {
    return false;
  }
  return libraryTypeMap[item].indexOf(type.toLowerCase()) !== -1;
};

exports.valCsvLineItem = function(csvLineItem) {
  return CSVLINEITEMREGEX.test(csvLineItem);
};

/**
 * Validation Functions
 */
exports.isValidDate = function(date) {
  let ret = false;
  try {
    ret = moment(date).isValid();
  } catch (err) {
    ret = false;
  }
  return ret;
};

exports.isFutureDate = function(date) {
  if (_.isEmpty(date)) return true;

  if (CUSTOMDATEREGEX.test(date)) {
    return moment(date).isAfter();
  }
  return false;
};

exports.customDateFormat = function(date) {
  if (_.isEmpty(date)) return true;

  return CUSTOMDATEREGEX.test(date);
};

exports.userPassword = function(pass) {
  return typeof pass === "string" && pass.length >= 6;
};

exports.userUsername = function(username) {
  return typeof username === "string" && username.length >= 6;
};

exports.maxLengthValidation = function(maxLength) {
  if (typeof maxLength !== "number") {
    return false;
  }
  return function(prop) {
    return prop && typeof prop.toString === "function"
      ? prop.toString().length <= maxLength
      : true;
  };
};

exports.valComponentType = function(componentType) {
  return componentType && COMPONENTTAGSMAP[componentType];
};

exports.getDataSources = function() {
  return DATASOURCES;
};

exports.getSpreadSheetTypes = function() {
  return SPREADSHEETTYPES;
};
