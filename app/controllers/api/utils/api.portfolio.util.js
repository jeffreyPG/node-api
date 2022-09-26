const requestpn = require("request-promise-native");
const config = require("../../../../config/config");
const xml2js = require("xml2js");
const builder = new xml2js.Builder();

const USER = process.env.PORTFOLIO_MANAGER_USER || "";
const PASS = process.env.PORTFOLIO_MANAGER_PASS || "";
const SERVER_URI = (config.portfolioManager && config.portfolioManager.uri) ? config.portfolioManager.uri : null;

if (!USER || !PASS || !SERVER_URI) {
  console.error("\n", "Missing credentials/URI to connect to the Portfolio Manager System!", "\n");
}

const DEBUG = false;
const MOCK_ALL_REPSONSE = Boolean(
  process.env.NODE_ENV === "test" || (process.env.NODE_ENV === "development" && config.portfolioManager.mockResponse)
);

const MOCK_RESPONSE = {
  getPendingAccountConnections: "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><pendingList><account><accountId>1</accountId><accountInfo><address address1=\"3000 Main St\" address2=\"Suite 123\" city=\"Denver\" state=\"CO\" postalCode=\"80205\" country=\"US\"/><email>tester@test.com</email><firstName>Dev</firstName><phone>1231231234</phone><lastName>Test</lastName><jobTitle>Tester</jobTitle><organization>test company Inc.</organization></accountInfo><connectionAudit><createdBy>tester</createdBy><createdByAccountId>1</createdByAccountId><createdDate>2018-01-22T09:40:45.000-05:00</createdDate><lastUpdatedBy>tester</lastUpdatedBy><lastUpdatedByAccountId>1</lastUpdatedByAccountId><lastUpdatedDate>2018-01-22T09:40:45.000-05:00</lastUpdatedDate></connectionAudit></account></pendingList>",
  acceptAccountInvite: "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><response status=\"Error\"><errors><error errorNumber=\"-200\" errorDescription=\"The pending request doesn't exist or has been fulfilled\"/></errors></response>",
  getCustomerAccount: "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><customer><username>tester</username><includeTestPropertiesInGraphics>true</includeTestPropertiesInGraphics><accountInfo><address address1=\"3000 Main St\" city=\"Denver\" state=\"CO\" postalCode=\"80205\" country=\"US\"/><email>tester@test.com</email><firstName>Dev</firstName><phone>1231231234</phone><lastName>Test</lastName><jobTitle>Tester</jobTitle><organization>test company Inc.</organization></accountInfo></customer>",

  getPendingPropertyInvites: "<pendingList><property><propertyId>2</propertyId><customFieldList><customField name=\"Lot Number\">987</customField></customFieldList><accessLevel>Read Write</accessLevel><accountId>1</accountId><propertyInfo><name>Broadway Elementary</name><address address1=\"91 Broadway Street\" city=\"Arlington\" postalCode=\"20221\" state=\"VA\" country=\"US\"/><numberOfBuildings>0</numberOfBuildings><constructionStatus>Existing</constructionStatus><primaryFunction>Office</primaryFunction><yearBuilt>2000</yearBuilt><grossFloorArea units=\"Square Feet\" temporary=\"false\" default=\"N/A\"><value>10000</value></grossFloorArea><occupancyPercentage>90</occupancyPercentage><isFederalProperty>false</isFederalProperty><audit><createdBy>vaschools</createdBy><createdByAccountId>87656</createdByAccountId><createdDate>2012-08-02T18:32:24-04:00</createdDate><lastUpdatedBy>vaschools</lastUpdatedBy><lastUpdatedByAccountId>87656</lastUpdatedByAccountId><lastUpdatedDate>2012-08-02T18:33:16-04:00</lastUpdatedDate></audit></propertyInfo><shareAudit><createdBy>acme_school</createdBy><createdByAccountId>87656</createdByAccountId><createdDate>2014-12-03T11:29:54.000-05:00</createdDate><lastUpdatedBy>acme_school</lastUpdatedBy><lastUpdatedByAccountId>87656</lastUpdatedByAccountId><lastUpdatedDate>2014-12-03T16:29:54.000-05:00</lastUpdatedDate></shareAudit></property></pendingList>",
  acceptPropertyInvites: "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><response status=\"Error\"><errors><error errorNumber=\"-200\" errorDescription=\"The pending request doesn't exist or has been fulfilled\"/></errors></response>",
  getCustomerPropertyList: "<response status=\"Ok\"><links><link id=\"100\" httpMethod=\"GET\" link=\"/building/100\" linkDescription=\"This is the GET url for this Building.\" hint=\"Simuwatt Test Building 100\"/><link id=\"101\" httpMethod=\"GET\" link=\"/building/101\" linkDescription=\"This is the GET url for this Building.\" hint=\"Simuwatt Test Building 101\"/><link id=\"102\" httpMethod=\"GET\" link=\"/building/102\" linkDescription=\"This is the GET url for this Building.\" hint=\"Simuwatt Test Building 102\"/><link id=\"103\" httpMethod=\"GET\" link=\"/building/103\" linkDescription=\"This is the GET url for this Building.\" hint=\"Simuwatt Test Building 103\"/></links></response>",
  getCustomerProperty: "<property><name>Simuwatt Test Building 100</name><primaryFunction>Refrigerated Warehouse</primaryFunction><address address1=\"5300 Richmond Road\" city=\"Bedford Heights\" postalCode=\"44146\" state=\"OH\" country=\"US\"/><numberOfBuildings>1</numberOfBuildings><yearBuilt>1992</yearBuilt><constructionStatus>Existing</constructionStatus><grossFloorArea units=\"Square Feet\" temporary=\"false\"><value>856655</value></grossFloorArea><occupancyPercentage>10</occupancyPercentage><isFederalProperty>true</isFederalProperty><agency name=\"Advisory Council on Historic Preservation (ACHP)\" code=\"ACHP\" id=\"1\" country=\"US\"/><agencyDepartmentRegion>region update</agencyDepartmentRegion><federalCampus>campus update</federalCampus><notes>Notes update</notes><accessLevel>Read Write</accessLevel><audit><createdBy>DUNAYT</createdBy><createdByAccountId>-14</createdByAccountId><createdDate>2012-08-16T17:04:57-04:00</createdDate><lastUpdatedBy>DUNAYT</lastUpdatedBy><lastUpdatedByAccountId>-14</lastUpdatedByAccountId><lastUpdatedDate>2012-08-16T17:09:35-04:00</lastUpdatedDate></audit></property>",

  getPendingMeterInvites: "<pendingList><meter><meterId>3</meterId><propertyId>2</propertyId><accountId>1</accountId><customFieldList><customField name=\"Meter Number\">123</customField></customFieldList><accessLevel>Read Write</accessLevel><propertyInfo><name>Broadway Elementary</name><address address1=\"91 Broadway Street\" city=\"Arlington\" postalCode=\"20221\" state=\"VA\" country=\"US\"/><numberOfBuildings>0</numberOfBuildings><constructionStatus>Existing</constructionStatus><primaryFunction>Office</primaryFunction><yearBuilt>2000</yearBuilt><grossFloorArea units=\"Square Feet\" temporary=\"false\" default=\"N/A\"><value>10000</value></grossFloorArea><occupancyPercentage>90</occupancyPercentage><isFederalProperty>false</isFederalProperty><audit><createdBy>vaschools</createdBy><createdByAccountId>87656</createdByAccountId><createdDate>2012-08-02T18:32:24-04:00</createdDate><lastUpdatedBy>vaschools</lastUpdatedBy><lastUpdatedByAccountId>87656</lastUpdatedByAccountId><lastUpdatedDate>2012-08-02T18:33:16-04:00</lastUpdatedDate></audit></propertyInfo><meterInfo><name>Electric Grid Meter</name><metered>true</metered><firstBillDate>2000-01-01</firstBillDate><inUse>true</inUse><audit><createdBy>vaschools</createdBy><createdByAccountId>87656</createdByAccountId><createdDate>2012-08-02T18:33:41-04:00</createdDate><lastUpdatedBy>vaschools</lastUpdatedBy><lastUpdatedByAccountId>87656</lastUpdatedByAccountId><lastUpdatedDate>2012-08-02T18:33:41-04:00</lastUpdatedDate></audit><type>Electric</type><unitOfMeasure>kWh (thousand Watt-hours)</unitOfMeasure></meterInfo><shareAudit><createdBy>acme_school</createdBy><createdByAccountId>87656</createdByAccountId><createdDate>2014-12-03T11:29:54.000-05:00</createdDate><lastUpdatedBy>acme_school</lastUpdatedBy><lastUpdatedByAccountId>87656</lastUpdatedByAccountId><lastUpdatedDate>2014-12-03T16:29:54.000-05:00</lastUpdatedDate></shareAudit></meter></pendingList>",
  acceptMeterInvites: "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><response status=\"Error\"><errors><error errorNumber=\"-200\" errorDescription=\"The pending request doesn't exist or has been fulfilled\"/></errors></response>",
  getPropertyMeterList: "<response status=\"Ok\"><links><link httpMethod=\"GET\" link=\"/meter/200\" linkDescription=\"This is the GET url for this Meter.\" hint=\"Simuwatt Meter 200\"/><link httpMethod=\"GET\" link=\"/meter/201\" linkDescription=\"This is the GET url for this Meter.\" hint=\"Simuwatt Meter 201\"/><link httpMethod=\"GET\" link=\"/meter/202\" linkDescription=\"This is the GET url for this Meter.\" hint=\"Simuwatt Meter 202\"/><link httpMethod=\"GET\" link=\"/meter/203\" linkDescription=\"This is the GET url for this Meter.\" hint=\"Simuwatt Meter 203\"/></links></response>",
  getMeter: "<meter><id>200</id><type>Electric</type><name>Electric Main Meter</name><unitOfMeasure>kBtu (thousand Btu)</unitOfMeasure><metered>true</metered><firstBillDate>2010-01-01</firstBillDate><inUse>true</inUse><accessLevel>Read</accessLevel><audit><createdBy>DUNAYT</createdBy><createdByAccountId>-14</createdByAccountId><createdDate>2012-08-16T17:04:57-04:00</createdDate><lastUpdatedBy>DUNAYT</lastUpdatedBy><lastUpdatedByAccountId>-14</lastUpdatedByAccountId><lastUpdatedDate>2012-08-16T17:09:35-04:00</lastUpdatedDate></audit></meter>",
  deleteMethod: "<?xml version=\"1.0\" encoding=\"UTF-8\"?><response status=\"Ok\"/>",
};

/**
 * Client used to perform actions against the Portfolio Manager API
 */
const request = async function (options) {
  if (options.mock && MOCK_RESPONSE[options.mock]) {
    // Return the mock xml -> object for the mock
    return xml2js.parseStringPromise(MOCK_RESPONSE[options.mock], { object: true, trim: true, coerce: true });
  }

  const opts = {
    method: options.method || "GET",
    url: `${SERVER_URI}${options.url}`,
    body: options.body,
    headers: options.headers || [],
    auth: {
      user: USER,
      pass: PASS,
    },
  };

  // Modify the Request object per the options
  if (opts.body) {
    opts.headers["content-type"] = "application/xml";
  }
  // Send off the request
  const response = await requestpn(opts);

  if (DEBUG && !response) console.log("\n", "response.body (" + opts.url + ")", response, "\n");

  if (response) {
    try {
      return xml2js.parseStringPromise(response, { mergeAttrs: true, explicitArray: false });
    } catch (err) {
      throw new Error("There was an error converting xml to json");
    }
  }
  throw new Error("Issues contacting Portfolio server.");
};

/*
 * Create an xml blob via object
 */

function getXMLString (xmlObj) {
  if (!xmlObj) {
    throw new Error("No body to generate xml.");
  }
  if (typeof xmlObj !== "object") {
    throw new Error("Invalid data type to generate xml.");
  }

  let xml = "";
  try {
    xml = builder.buildObject(xmlObj);
  } catch (err) {
    throw new Error("There was an error parsing the xml object");
  }

  return xml;
}

// check and convert object to array if it's not
function arrayify (obj) {
  if (!obj) return [];
  if (obj instanceof Array) {
    return obj;
  } else {
    return [obj];
  }
}

function getBuildingUse (origin, whichToReturn, use) {
  const buildingUses = [
    {
      pm: "Bank Branch",
      buildee: "bank-branch",
      xml: "bankBranch",
    },
    {
      pm: "Financial Office",
      buildee: "financial-office",
      xml: "financialOffice",
    },
    {
      pm: "Adult Education",
      buildee: "adult-education",
      xml: "adultEducation",
    },
    {
      pm: "College/University",
      buildee: "college",
      xml: "collegeUniversity",
    },
    {
      pm: "K-12 School",
      buildee: "school",
      xml: "k12School",
    },
    {
      pm: "Pre-School/Daycare",
      buildee: "pre-school",
      xml: "preschoolDaycare",
    },
    {
      pm: "Vocational School",
      buildee: "vocational-school",
      xml: "vocationalSchool",
    },
    {
      pm: "Stadium Indoor Arena",
      buildee: "indoor-arena",
      xml: "indoorArena",
    },
    {
      pm: "Race Track",
      buildee: "race-track",
      xml: "raceTrack",
    },
    {
      pm: "Stadium (Closed)",
      buildee: "stadium-closed",
      xml: "stadiumClosed",
    },
    {
      pm: "Stadium (Open)",
      buildee: "stadium-open",
      xml: "stadiumOpen",
    },
    {
      pm: "Other - Stadium",
      buildee: "other-stadium",
      xml: "otherStadium",
    },
    {
      pm: "Convention Center",
      buildee: "convention-center",
      xml: "conventionCenter",
    },
    {
      pm: "Fitness Center/Health Club/Gym",
      buildee: "fitness-center",
      xml: "fitnessCenterHealthClubGym",
    },
    {
      pm: "Swimming Pool",
      buildee: "other-recreation",
      xml: "swimmingPool",
    },
    {
      pm: "Ice/Curling Rink",
      buildee: "ice-rink",
      xml: "iceCurlingRink",
    },
    {
      pm: "Roller Rink",
      buildee: "roller-rink",
      xml: "rollerRink",
    },
    {
      pm: "Bowling Alley",
      buildee: "bowling-alley",
      xml: "bowlingAlley",
    },
    {
      pm: "Other - Recreation",
      buildee: "other-recreation",
      xml: "otherRecreation",
    },
    {
      pm: "Movie Theater",
      buildee: "movie-theater",
      xml: "movieTheater",
    },
    {
      pm: "Museum",
      buildee: "museum",
      xml: "museum",
    },
    {
      pm: "Performing Arts",
      buildee: "performing-arts",
      xml: "performingArts",
    },
    {
      pm: "Social/Meeting Hall",
      buildee: "social-hall",
      xml: "socialMeetingHall",
    },
    {
      pm: "Aquarium",
      buildee: "aquarium",
      xml: "aquarium",
    },
    {
      pm: "Bar/Nightclub",
      buildee: "bar",
      xml: "barNightclub",
    },
    {
      pm: "Casino",
      buildee: "casino",
      xml: "casino",
    },
    {
      pm: "Zoo",
      buildee: "zoo",
      xml: "zoo",
    },
    {
      pm: "Other - Entertainment/Public Assembly",
      buildee: "other-entertainment",
      xml: "otherEntertainmentPublicAssembly",
    },
    {
      pm: "Other - Public Services",
      buildee: "other-public",
      xml: "otherPublicServices",
    },
    {
      pm: "Convenience Store with Gas Station",
      buildee: "convenience-store-gas",
      xml: "convenienceStoreWithGasStation",
    },
    {
      pm: "Convenience Store without Gas Station",
      buildee: "convenience-store",
      xml: "convenienceStoreWithoutGasStation",
    },
    {
      pm: "Supermarket/Grocery Store",
      buildee: "supermarket",
      xml: "supermarket",
    },
    {
      pm: "Wholesale Club/Supercenter",
      buildee: "wholesale-club",
      xml: "wholesaleClubSupercenter",
    },
    {
      pm: "Food Sales",
      buildee: "food-sales",
      xml: "foodSales",
    },
    {
      pm: "Food Service",
      buildee: "food-services",
      xml: "foodService",
    },
    {
      pm: "Hospital (General Medical & Surgical)",
      buildee: "hospital",
      xml: "hospital",
    },
    {
      pm: "Other/Specialty Hospital",
      buildee: "other-hospital",
      xml: "otherSpecialityHospital",
    },
    {
      pm: "Outpatient Rehabilitation/Physical Therapy",
      buildee: "outpatient-rehabilitation",
      xml: "outpatientRehabilitationPhysicalTherapy",
    },
    {
      pm: "Residential Care Facility",
      buildee: "residential-care",
      xml: "residentialCareFacility",
    },
    {
      pm: "Senior Care Community",
      buildee: "senior-care",
      xml: "seniorCareCommunity",
    },
    {
      pm: "Urgent Care/Clinic/Other Outpatient",
      buildee: "urgent-care",
      xml: "urgentCareClinicOtherOutpatient",
    },
    {
      pm: "Barracks",
      buildee: "barracks",
      xml: "barracks",
    },
    {
      pm: "Hotel",
      buildee: "hotel",
      xml: "hotel",
    },
    {
      pm: "Multifamily Housing",
      buildee: "multifamily-housing",
      xml: "multifamilyHousing",
    },
    {
      pm: "Prison/Incarceration",
      buildee: "prison",
      xml: "prison",
    },
    {
      pm: "Residence Hall/Dormitory",
      buildee: "residential-hall",
      xml: "residenceHallDormitory",
    },
    {
      pm: "Single Family Home",
      buildee: "single-family",
      xml: "singleFamilyHome",
    },
    {
      pm: "Manufacturing/Industrial Plant",
      buildee: "manufacturing-plant",
      xml: "manufacturingIndustrialPlant",
    },
    {
      pm: "Mixed Use Property",
      buildee: "mixed-use",
      xml: "other",
    },
    {
      pm: "Medical Office",
      buildee: "medical-office",
      xml: "medicalOffice",
    },
    {
      pm: "Office",
      buildee: "office",
      xml: "office",
    },
    {
      pm: "Veterinary Office",
      buildee: "veterinary-office",
      xml: "veterinaryOffice",
    },
    {
      pm: "Courthouse",
      buildee: "courthouse",
      xml: "courthouse",
    },
    {
      pm: "Drinking Water Treatment & Distribution",
      buildee: "water-treatment",
      xml: "drinkingWaterTreatmentAndDistribution",
    },
    {
      pm: "Fire Station",
      buildee: "fire-station",
      xml: "fireStation",
    },
    {
      pm: "Library",
      buildee: "library",
      xml: "library",
    },
    {
      pm: "Mailing Center/Post Office",
      buildee: "mailing-center",
      xml: "mailingCenterPostOffice",
    },
    {
      pm: "Police Station",
      buildee: "police-station",
      xml: "policeStation",
    },
    {
      pm: "Transportation Terminal/Station",
      buildee: "transportation-terminal",
      xml: "transportationTerminalStation",
    },
    {
      pm: "Wastewater Treatment Plant",
      buildee: "wastewater-treatment-plant",
      xml: "wastewaterTreatmentPlant",
    },
    {
      pm: "Worship Facility",
      buildee: "worship-facility",
      xml: "worshipFacility",
    },
    {
      pm: "Automobile Dealership",
      buildee: "automobile-dealership",
      xml: "automobileDealership",
    },
    {
      pm: "Enclosed Mall",
      buildee: "enclosed-mall",
      xml: "enclosedMall",
    },
    {
      pm: "Strip Mall",
      buildee: "strip-mall",
      xml: "stripMall",
    },
    {
      pm: "Lifestyle Center",
      buildee: "lifestyle-center",
      xml: "lifestyleCenter",
    },
    {
      pm: "Retail Store",
      buildee: "retail-store",
      xml: "retail",
    },
    {
      pm: "Data Center",
      buildee: "data-center",
      xml: "dataCenter",
    },
    {
      pm: "Laboratory",
      buildee: "laboratory",
      xml: "laboratory",
    },
    {
      pm: "Personal Services (Health/Beauty, Dry Cleaning, etc)",
      buildee: "personal-services",
      xml: "personalServices",
    },
    {
      pm: "Repair Services (Vehicle, Shoe, Locksmith, etc)",
      buildee: "repair-services",
      xml: "repairServices",
    },
    {
      pm: "Energy/Power Station",
      buildee: "energy-station",
      xml: "energyPowerStation",
    },
    {
      pm: "Self-Storage Facility",
      buildee: "self-storage",
      xml: "selfStorageFacility",
    },
    {
      pm: "Distribution Center",
      buildee: "distribution-center",
      xml: "distributionCenter",
    },
    {
      pm: "Non-Refrigerated Warehouse",
      buildee: "non-refrigerated",
      xml: "nonRefrigeratedWarehouse",
    },
    {
      pm: "Refrigerated Warehouse",
      buildee: "refrigerated-warehouse",
      xml: "refrigeratedWarehouse",
    },
    {
      pm: "Fast Food Restaurant",
      buildee: "fast-food",
      xml: "fastFoodRestaurant",
    },
    {
      pm: "Parking",
      buildee: "parking",
      xml: "parking",
    },
  ];

  if (origin === "buildee" && whichToReturn === "pm" && use === "microbreweries") {
    return "Manufacturing/Industrial Plant";
  } else if (origin === "buildee" && whichToReturn === "pm") {
    const buildeeBuildingUse = buildingUses.find(function (obj) { return obj.buildee === use; });
    if (buildeeBuildingUse && buildeeBuildingUse.pm) {
      return buildeeBuildingUse.pm;
    } else {
      return "Office";
    }
  } else if (origin === "pm" && whichToReturn === "buildee") {
    const pmBuildingUse = buildingUses.find(function (obj) { return obj.pm === use; });
    if (pmBuildingUse && pmBuildingUse.buildee) {
      return pmBuildingUse.buildee;
    } else {
      return "office";
    }
  } else if (origin === "buildee" && whichToReturn === "xml" && use === "microbreweries") {
    return "other";
  } else if (origin === "buildee" && whichToReturn === "xml") {
    const xmlBuildingUse = buildingUses.find(function (obj) { return obj.buildee === use; });
    if (xmlBuildingUse && xmlBuildingUse.xml) {
      return xmlBuildingUse.xml;
    } else {
      return "office";
    }
  } else if (origin === "xml" && whichToReturn === "buildee") {
    const xmlBuildingUse = buildingUses.find(function (obj) { return obj.xml === use; });
    if (xmlBuildingUse && xmlBuildingUse.buildee) {
      return xmlBuildingUse.buildee;
    } else {
      return "office";
    }
  }
}

module.exports = {
  MOCK_ALL_REPSONSE,
  request,
  getXMLString,
  arrayify,
  getBuildingUse,
};
