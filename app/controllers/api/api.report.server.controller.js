"use strict";

/**
 * Module dependencies.
 */
const _ = require("lodash");
const moment = require("moment-timezone");
const mongoose = require("mongoose");
const Proposal = mongoose.model("Proposal");
const MonthlyUtility = mongoose.model("MonthlyUtility");
const Handlebars = require("handlebars");
const requestImageSize = require("request-image-size");
const {
  allowInsecurePrototypeAccess
} = require("@handlebars/allow-prototype-access");
const util = require("./utils/api.utils");
const querystring = require("querystring");
const config = require("../../../config/config");
const reportClient = require("./utils/api.report.client");
const reportUtilityClient = require("./utils/api.report.utility.client");
const sanitizeHtml = require("sanitize-html");
const projectUtils = require("./utils/report/project");
const chartUtils = require("./utils/report/chart");
const endUseUtils = require("./utils/report/enduse");
const fieldUtils = require("./utils/report/field");
const tableUtils = require("./utils/report/table");
const dateUtils = require("./utils/report/date");
const utilityUtils = require("./utils/report/utility");
const {
  calculateAverageRate,
  buildingTypes
} = require("./utils/api.building.util");
const { linebreak, removeHTMLTags } = require("./utils/project.calculations");
const { getProjectIdsFromProposal } = require("./utils/api.project.util.js");
const { capitalize } = require("./utils/string.helpers");
const { findByZipCodes } = require("../../repository/weathers/weathers.mongo");
const { Organization } = require("../../models/organization.server.model");
const sampleBuildingUseTypes = require("../../static/building-use-types.js");
const emailClient = require("./utils/api.smtp.client");
const {
  addReportEndUseUtil
} = require("./api.report.enduse.server.controller");
const TARGETFIELDSARR = reportClient.targetFieldsArr;
const HTMLTYPEMAP = reportClient.htmlTypeMapper;

const GOOGLE_MAPS_API_KEY =
  config.googleMap && config.googleMap.apiKey ? config.googleMap.apiKey : "";
const GOOGLE_MAPS_URI =
  config.googleMap && config.googleMap.uri ? config.googleMap.uri : "";

if (!GOOGLE_MAPS_API_KEY || !GOOGLE_MAPS_URI) {
  console.error("\n", "Missing apiKey for Google Maps!", "\n");
}

const IMAGE_WIDTH = 200;

function escapeHtml(html) {
  return sanitizeHtml(html, { allowedAttributes: false, allowedTags: false });
}

const extendedHandlebars = allowInsecurePrototypeAccess(Handlebars);

extendedHandlebars.registerHelper("list", function(items, options) {
  if (!items || items.length === 0) {
    const text = options.fn();
    return `<span>${text}</span>`;
  }
  const itemsText = items.reduce((acc, item) => {
    const value = options.fn(item);
    if (value) acc.push(value);
    return acc;
  }, []);
  return `<span>${itemsText.join(", ")}</span>`;
});

extendedHandlebars.registerHelper("isEqual", function(lhs, rhs, opts) {
  if (lhs == rhs) {
    return opts.fn(this);
  } else {
    return opts.inverse(this);
  }
});

function formatEditorText(content = "") {
  content = content.replace(/(?:\r\n|\r|\n)/g, "<br>") || "-";
  content = content.replace(/&lt;/g, "<");
  content = content.replace(/&gt;/g, ">");
  content = content.replace(/<p><br><\/p>/g, "<p> </p>");
  return content;
}

/*
 * Convert a dot-notation, camel-case string to title case.
 */
const _formatDotNotationLabel = function(label, includeParent) {
  const ret = [];
  let tmp;
  label.split(".").map(function(ele) {
    tmp = ele.replace(/([A-Z])/g, " $1");
    ret.push(tmp.charAt(0).toUpperCase() + tmp.slice(1));
  });
  return !includeParent ? ret[ret.length - 1] : ret.join(" - ");
};

const _formatHeaderForLocation = function(field) {
  if (field === "Usetype") {
    return "Use Type";
  } else if (field.includes("Percentof")) {
    return field.replace("Percentof", "% of");
  } else {
    return field;
  }
};

const _formatDotNotationfield = function(label, includeParent) {
  const ret = [];
  let tmp;
  label.split(".").map(function(ele) {
    tmp = ele; // ele.replace(/([A-Z])/g, ' $1');
    ret.push(tmp.charAt(0) + tmp.slice(1));
  });
  return !includeParent ? ret[ret.length - 1] : ret.join(" - ");
};

/*
 * Return the top-level key (target), and a dot-notation path (pathsArr)
 */
const _getParsedTargetPaths = function(fields) {
  const ret = { target: null, pathsArr: [] };
  let target;

  if (!fields || typeof fields.map !== "function") return ret;

  fields.map(function(field) {
    if (!target) ret.target = field.substring(0, field.indexOf("."));
    ret.pathsArr.push(field.substring(field.indexOf(".") + 1));
  });
  return ret;
};
/*
 * Convert a camel string to title case with spaces.
 */
const _formatCamelCaseNotationLabel = function(field) {
  if (typeof field !== "string") return field;
  const tmp = field.replace(/([A-Z])/g, " $1");
  const ret = tmp.charAt(0).toUpperCase() + tmp.slice(1);
  return ret;
};

const _formatCamelCaseNotationField = function(field) {
  if (typeof field !== "string") return field;
  const tmp = field; // field.replace(/([A-Z])/g, ' $1');
  const ret = tmp.charAt(0).toUpperCase() + tmp.slice(1);
  return ret;
};

function timeConvert(time) {
  // Check correct time format and split into components
  time = time.toString().match(/^([01]\d|2[0-3])(:)([0-5]\d)(:[0-5]\d)?$/) || [
    time
  ];

  if (time.length > 1) {
    // If time format correct
    time = time.slice(1); // Remove full string match value
    time[5] = +time[0] < 12 ? " AM" : " PM"; // Set AM/PM
    time[0] = +time[0] % 12 || 12; // Adjust hours
  }
  let str = time.join(""); // return adjusted time or original string
  if (!str.includes("PM") && !str.includes("AM")) {
    str = str + " AM";
  }
  return str;
}
/*
 * Generate html elements
 */
const _getElement = async function(elementObj, data, customDate, building) {
  if (elementObj.ele === "header" || elementObj.ele === "footer") {
    return (
      "<!-- <" +
      elementObj.ele +
      ">" +
      (elementObj.content || "") +
      "</" +
      elementObj.ele +
      "> -->"
    );
  }
  if (elementObj.ele && elementObj.isComment) {
    if (elementObj.ele === "header-image") {
      let width = await getImageWidth(elementObj.content);
      width = Math.min(width, 250);
      return (
        "<!-- <" +
        elementObj.ele +
        ` width="${width}"` +
        ">" +
        (elementObj.content || "-") +
        "</" +
        elementObj.ele +
        "> -->"
      );
    } else {
      return (
        "<!-- <" +
        elementObj.ele +
        ">" +
        (elementObj.content || "-") +
        "</" +
        elementObj.ele +
        "> -->"
      );
    }
  }
  if (elementObj.ele === "p") {
    if (customDate) {
      const { start, end } = dateUtils.getYearRangeDates(
        elementObj.metaData || {},
        customDate
      );
      const { utilities } = await reportUtilityClient.getUtilities(
        building,
        start,
        end
      );
      data = {
        ...data,
        utilities,
        ...reportClient.getOverview({ building, utilities })
      };
    }
    let content = elementObj.content || "";
    content = formatEditorText(content);
    const template = extendedHandlebars.compile(content);
    let compiledData = template(data);
    compiledData = compiledData.replace(/\&\#x27\;/g, `'`);
    compiledData = compiledData.replace(/\&quot;/g, `"`);
    return (
      "<" + elementObj.ele + ">" + compiledData + "</" + elementObj.ele + ">"
    );
  }
  if (elementObj.ele) {
    return (
      "<" +
      elementObj.ele +
      ">" +
      (elementObj.content || "-") +
      "</" +
      elementObj.ele +
      ">"
    );
  }
  return "";
};

const getBuildingCustomHandler = function(target) {
  const buildingUseTypes = (target && target.buildingUseTypes) || [];
  const getAddress = function() {
    if (target.location) {
      const location = util.getValueFromObjPerPath.call(target, "location");
      const address =
        location.address +
        ", " +
        location.city +
        ", " +
        location.state +
        " " +
        location.zipCode;
      return address;
    }
  };
  const getUseList = function() {
    const useTypes = _.uniq(
      buildingUseTypes.map(bUseType => {
        let filteredUseType = _.find(sampleBuildingUseTypes, {
          value: bUseType.use
        });
        if (filteredUseType) {
          return filteredUseType.name;
        }
        return capitalize(bUseType.use);
      })
    );
    return useTypes.join(", ");
  };
  const getSquareFeet = function() {
    if (!target) return;
    return `${Number(target.squareFeet).toLocaleString() || "-"} sq.ft.`;
  };
  const getListSquareFeet = function() {
    let returnString = "Use Type: Square Feet. ";
    buildingUseTypes.forEach(bUseType => {
      const use = (bUseType && bUseType.use) || "";
      const sqft = (bUseType && bUseType.squareFeet) || "";
      returnString += `${capitalize(use) || "-"}: ${Number(
        sqft
      ).toLocaleString() || "-"} sq.ft. `;
    });
    return returnString;
  };
  const getBuildingUse = function() {
    let useType = util.getValueFromObjPerPath.call(target, "buildingUse");
    let filteredUseType = _.find(sampleBuildingUseTypes, { value: useType });
    if (filteredUseType) {
      return filteredUseType.name;
    }
    return capitalize(useType);
  };
  const getBuildingClientName = function() {
    return target.clientName && target.clientName.length > 0
      ? target.clientName
      : null;
  };
  return {
    address: getAddress(),
    useList: getUseList(),
    listSquareFeet: getListSquareFeet(),
    squareFeet: getSquareFeet(),
    buildingUse: getBuildingUse(),
    clientName: getBuildingClientName()
  };
};

const _getKeyValuePairs = function(
  target,
  fields,
  type,
  dataLabels,
  user,
  location,
  customLabels = []
) {
  const buildingUseTypes = (target && target.buildingUseTypes) || [];
  return (
    "<div>" +
    fields
      .map(field => {
        let label = "";
        switch (type) {
          case "benchmark":
            label = reportClient.formatBenchmarkFields(field, customLabels);
            break;
          case "overview":
            label = fieldUtils.getLabel(field, customLabels);
            break;
          case "utility":
            label = reportClient.formatUtilityFields(field, customLabels);
            break;
          default:
            const customLabel = _.find(customLabels, { field });
            label = customLabel
              ? customLabel.value
              : _formatDotNotationLabel(field);
        }
        if (user.products && user.products.buildeeNYC === "access") {
          if (field === "borough") {
            return (
              "<p>" +
                fieldUtils.getLabelIfShown({ label, option: dataLabels }) +
                (typeof target.nycFields.borough === "undefined"
                  ? "-"
                  : target.nycFields.borough) || "-" + "</p>"
            );
          }
          if (field === "block") {
            return (
              "<p>" +
                fieldUtils.getLabelIfShown({ label, option: dataLabels }) +
                (typeof target.nycFields.block === "undefined"
                  ? "-"
                  : target.nycFields.block) || "-" + "</p>"
            );
          }
          if (field === "bin") {
            return (
              "<p>" +
                fieldUtils.getLabelIfShown({ label, option: dataLabels }) +
                (typeof target.nycFields.bin === "undefined"
                  ? "-"
                  : target.nycFields.bin) || "-" + "</p>"
            );
          }
          if (field === "eer") {
            return (
              "<p>" +
                fieldUtils.getLabelIfShown({
                  label: "EER",
                  option: dataLabels
                }) +
                (typeof target.nycFields.eer === "undefined"
                  ? "-"
                  : target.nycFields.eer) || "-" + "</p>"
            );
          }
          if (field === "taxLot") {
            return (
              "<p>" +
                fieldUtils.getLabelIfShown({ label, option: dataLabels }) +
                (typeof target.nycFields.taxLot === "undefined"
                  ? "-"
                  : target.nycFields.taxLot) || "-" + "</p>"
            );
          }
        } else {
          if (
            field === "borough" ||
            field === "block" ||
            field === "bbl" ||
            field === "bin" ||
            field === "eer" ||
            field === "taxLot"
          ) {
            return "";
          }
        }
        if (label === "Open247") {
          return (
            "<p>" +
            fieldUtils.getLabelIfShown({
              label: "Open24/7",
              option: dataLabels
            }) +
            (util.getValueFromObjPerPath.call(target, field) || "-") +
            "</p>"
          );
        }
        if (field === "address") {
          if (target.location) {
            const location = util.getValueFromObjPerPath.call(
              target,
              "location"
            );
            const address =
              location.country +
              ", " +
              location.address +
              ", " +
              location.city +
              ", " +
              location.state +
              " " +
              location.zipCode;
            return (
              "<p>" +
              fieldUtils.getLabelIfShown({ label, option: dataLabels }) +
              (address || "-") +
              "</p>"
            );
          }
        }
        if (field === "createdDate") {
          const today = new Date();
          const months = [
            "January",
            "February",
            "March",
            "April",
            "May",
            "June",
            "July",
            "August",
            "September",
            "October",
            "November",
            "December"
          ];
          const curMonth = months[today.getMonth()];
          const curDay = today.getDate();
          const curYear = today.getFullYear();
          const createdDate = curMonth + " " + curDay + ", " + curYear;
          return (
            "<p>" +
            fieldUtils.getLabelIfShown({ label, option: dataLabels }) +
            (createdDate || "-") +
            "</p>"
          );
        }
        if (field === "locationBuildingUse") {
          const array = _getLocationBuildingUse(location);
          let strField = "";
          array.forEach(eleVal => {
            let strVal = "";
            if (fields.includes("squareFeet")) {
              strVal =
                _formatCamelCaseNotationLabel(eleVal.usetype) +
                ", " +
                eleVal.area +
                " sq.ft.";
            } else {
              strVal = _formatCamelCaseNotationLabel(eleVal.usetype);
            }
            strField +=
              "<p>" +
                fieldUtils.getLabelIfShown({ label, option: dataLabels }) +
                +strVal || "-" + "</p>";
          });
          return strField;
        }
        if (field === "buildingUse") {
          return (
            "<p>" +
            "Building Use : " +
            (capitalize(util.getValueFromObjPerPath.call(target, field)) ||
              "-") +
            "</p>"
          );
        }
        if (field === "listSquareFeet") {
          let returnString = "<p>Use Type: Square Feet</p>";
          buildingUseTypes.forEach(bUseType => {
            const use = (bUseType && bUseType.use) || "";
            const sqft = (bUseType && bUseType.squareFeet) || "";
            returnString += `<p>${capitalize(use) || "-"}: ${Number(
              sqft
            ).toLocaleString() || "-"} sq.ft.</p>`;
          });
          return returnString;
        }
        if (field === "useList") {
          const useTypes = _.uniq(
            buildingUseTypes.map(bUseType => capitalize(bUseType.use))
          );
          return `<p>Use Types: ${useTypes.join(", ")}</p>`;
        }
        return (
          "<p>" +
          fieldUtils.getLabelIfShown({ label, option: dataLabels }) +
          (field === "squareFeet"
            ? Number(
                util.getValueFromObjPerPath.call(target, field)
              ).toLocaleString() + "sq.ft."
            : util.getValueFromObjPerPath.call(target, field) || "-") +
          "</p>"
        );
      })
      .join("") +
    "</div>"
  );
};

const _getList = function(
  target,
  fields,
  listType,
  type,
  dataLabels,
  styleFormat,
  customLabels = []
) {
  if (listType === "ul") {
    styleFormat = styleFormat || "disc";
  }
  if (listType === "ol") {
    styleFormat = styleFormat || "decimal";
  }
  const formatType = ' style="list-style-type:' + styleFormat + ';"';
  return (
    "<" +
    listType +
    formatType +
    ">" +
    fields
      .map(function(field) {
        let label = "";
        switch (type) {
          case "benchmark":
            label = reportClient.formatBenchmarkFields(field, customLabels);
            break;
          case "overview":
            label = fieldUtils.getLabel(field, customLabels);
            break;
          case "utility":
            label = reportClient.formatUtilityFields(field, customLabels);
            break;
          default:
            const customLabel = _.find(customLabels, { field });
            label = customLabel
              ? customLabel.value
              : _formatDotNotationLabel(field, customLabels);
        }
        return (
          "<li>" +
          fieldUtils.getLabelIfShown({ label, option: dataLabels }) +
          (util.getValueFromObjPerPath.call(target, field) || "-") +
          "</li>"
        );
      })
      .join("") +
    "</" +
    listType +
    ">"
  );
};
const _getTextList = function(fields, listType, styleFormat) {
  if (listType === "ul") {
    styleFormat = styleFormat || "disc";
  }
  if (listType === "ol") {
    styleFormat = styleFormat || "decimal";
  }
  const type = ' style="list-style-type:' + styleFormat + ';"';
  return (
    "<" +
    listType +
    type +
    ">" +
    fields
      .map(function(field) {
        return "<li>" + field + "</li>";
      })
      .join("") +
    "</" +
    listType +
    ">"
  );
};

const sortNumber = function(a, b) {
  return a - b;
};

const isValid = val => {
  if (val == null || val == undefined || isNaN(val)) {
    return false;
  } else {
    return true;
  }
};

const _getTable = async function({
  target,
  fields,
  dataSource,
  schedule,
  customLabels = [],
  equipmentConfig,
  building,
  locationSummaryBy,
  projectConfig,
  equipment,
  type,
  layout = "horizontal",
  monthlyUtilities = [],
  htmlObj = {},
  metaData = {},
  organize = "CY",
  customDate,
  timeZone
}) {
  const {
    buildingEquipment,
    equipmentCategories,
    equipmentSchemas
  } = equipment;
  try {
    let targetRows = _.isArray(target) ? target : [target];
    let namespace;
    // heading column background color - #4F81BC
    // table alternate color - #D7E3BD
    if (dataSource === "benchmark") {
      return (
        '<table><thead><tr style="background-color:#4F81BC; ">' +
        "<th>" +
        _formatCamelCaseNotationLabel(fields[0].split(".")[0]) +
        "</th>" +
        "<th></th>" +
        "</tr></thead>" +
        "<tbody>" +
        targetRows
          .map(row => {
            return fields
              .map(field => {
                // For component tables, try to access .info namespace
                namespace = dataSource && row.info ? row.info : row;
                return (
                  "<tr>" +
                  "<td><b>" +
                  reportClient.formatBenchmarkFieldsTable(field.split(".")[1]) +
                  "</b></td>" +
                  "<td>" +
                  (util.getValueFromObjPerPath.call(namespace || row, field) ||
                    "-") +
                  "</td>" +
                  "</tr>"
                );
              })
              .join("");
          })
          .join("") +
        "</tbody></table><p></p>"
      );
    } else if (dataSource === "utility" || dataSource === "overview") {
      let newMonthlyUtilities = [...monthlyUtilities];
      try {
        newMonthlyUtilities = await MonthlyUtility.find({
          building: building._id
        }).exec();
        if (customDate?.customStartDate && customDate?.customEndDate) {
          newMonthlyUtilities = newMonthlyUtilities.filter(utility => {
            const date = moment(utility.date);
            const { customStartDate, customEndDate } = customDate;
            return (
              date.isSameOrAfter(moment(customStartDate)) &&
              date.isSameOrBefore(customEndDate)
            );
          });
        }
      } catch (error) {
        console.log("error", error);
      }
      const utilityData = utilityUtils.getData({
        utilities: newMonthlyUtilities,
        organize,
        metaData,
        customDate
      });
      const { fieldHeadings, data, utilityTable } = utilityUtils.getTable({
        utilities: utilityData,
        fields: htmlObj.fields,
        customLabels,
        type,
        building
      });
      const { start, end } = dateUtils.getYearRangeDates(metaData, customDate);
      // HACK: there are no portfolio manager score set per month or year at the moment so we're using the fixed ones set within the building
      if (
        fields &&
        fields.length > 0 &&
        fields[0].indexOf("portfolioManager.") !== -1 &&
        building.benchmark &&
        building.benchmark.pmScores &&
        building.benchmark.pmScores.length > 0
      ) {
        for (let i = 0; i < data.length; i++) {
          for (let h = 0; h < fieldHeadings.length; h++) {
            if (fieldHeadings[h].name === "#empty") continue;
            if (data[i]["#empty"] === "Average") {
              data[i][fieldHeadings[h].label] = _.mean(
                data
                  .filter(entry => entry["#empty"] !== "Average")
                  .map(entry => entry[fieldHeadings[h].label])
              );
              continue;
            }
            switch (organize) {
              case "FY":
                let numOfMonthsYear1 = 6;
                let numOfMonthsYear2 = 6;
                if (
                  start.year() ===
                    parseInt("20" + data[i]["#empty"].replace("FY", "")) &&
                  start.month() + 1 > 7
                ) {
                  numOfMonthsYear1 = 6 - start.month();
                } else if (
                  start.year() ===
                  parseInt("20" + data[i]["#empty"].replace("FY", "")) + 1
                ) {
                  numOfMonthsYear1 = 0;
                  numOfMonthsYear2 = 6 - start.month();
                }
                if (
                  end.year() ===
                    parseInt("20" + data[i]["#empty"].replace("FY", "")) + 1 &&
                  end.month() + 1 < 6
                ) {
                  numOfMonthsYear2 = end.month() + 1;
                } else if (
                  end.year() ===
                  parseInt("20" + data[i]["#empty"].replace("FY", ""))
                ) {
                  numOfMonthsYear1 = end.month() + 1 - 6;
                  numOfMonthsYear2 = 0;
                }
                const foundScoreYear1 = building.benchmark.pmScores.find(
                  entry =>
                    entry.year.toString() ===
                    "20" + data[i]["#empty"].replace("FY", "")
                );
                const foundScoreYear2 = building.benchmark.pmScores.find(
                  entry =>
                    entry.year ===
                    parseInt("20" + data[i]["#empty"].replace("FY", "")) + 1
                );
                const totalScoreYear1 =
                  (foundScoreYear1 &&
                    (foundScoreYear1.score / 12) * numOfMonthsYear1) ||
                  null;
                const totalScoreYear2 =
                  (foundScoreYear2 &&
                    (foundScoreYear2.score / 12) * numOfMonthsYear2) ||
                  null;
                if (_.isNumber(totalScoreYear1)) {
                  if (!_.isNumber(data[i][fieldHeadings[h].label]))
                    data[i][fieldHeadings[h].label] = 0;
                  data[i][fieldHeadings[h].label] += totalScoreYear1;
                }
                if (_.isNumber(totalScoreYear2)) {
                  if (!_.isNumber(data[i][fieldHeadings[h].label]))
                    data[i][fieldHeadings[h].label] = 0;
                  data[i][fieldHeadings[h].label] += totalScoreYear2;
                }
                break;
              default:
                let numOfMonths = 12;
                if (start.year().toString() === data[i]["#empty"]) {
                  numOfMonths -= start.month();
                }
                if (end.year().toString() === data[i]["#empty"]) {
                  numOfMonths = end.month() + 1;
                }
                const foundScore = building.benchmark.pmScores.find(
                  entry => entry.year.toString() === data[i]["#empty"]
                );
                data[i][fieldHeadings[h].label] =
                  (foundScore && (foundScore.score / 12) * numOfMonths) || "-";
                break;
            }
          }
        }
      }
      if (fields && fields.length > 0 && fields[0].indexOf("rates.") !== -1) {
        let ratesArray = [];
        for (let i = 0; i < data.length; i++) {
          let row = data[i];
          let year = row["#empty"];
          let originalStartDate, originalEndDate;
          let rates = {};
          if (year === "Average") {
            const keys = [
              "electric",
              "gas",
              "water",
              "steam",
              "fuelOil2",
              "fuelOil4",
              "fuelOil56",
              "diesel",
              "other"
            ];
            for (let key of keys) {
              let value = 0;
              let valueList = ratesArray.map(item => item[key] || 0);
              valueList = valueList.filter(item => !!item);
              if (valueList.length)
                value =
                  valueList.reduce((prev, curr) => prev + curr) /
                  valueList.length;
              rates[key] = value;
            }
          } else {
            if (organize === "FY") {
              year = year.replace("FY", 20);
              year = Number(year);
              originalStartDate = moment()
                .year(year)
                .month(6)
                .startOf("month");
              originalEndDate = moment()
                .year(year + 1)
                .month(5)
                .startOf("month");
            } else {
              originalStartDate = moment(year).startOf("year");
              if (start.diff(originalStartDate) > 0)
                originalStartDate = moment(start);
              originalEndDate = moment(year)
                .endOf("year")
                .startOf("month");
              if (originalEndDate.diff(end) > 0) originalEndDate = moment(end);
            }
            rates = await calculateAverageRate(
              building._id,
              originalStartDate,
              originalEndDate,
              organize
            );
            ratesArray.push(rates);
          }
          for (let h = 0; h < fieldHeadings.length; h++) {
            if (fieldHeadings[h].name === "#empty") continue;
            if (fieldHeadings[h].name.split(".")[0] === "rates") {
              let property = fieldHeadings[h].name.split(".")[1];
              property = property === "electricity" ? "electric" : property;
              data[i][fieldHeadings[h].label] = rates[property] || 0;
            }
          }
        }
      }
      // HACK: Pulls out weather data (hdd and cdd) and applies it to the table
      if (
        fields &&
        fields.length > 0 &&
        fields.find(field => field.indexOf("degree.") !== -1)
      ) {
        const weatherData = await findByZipCodes(building.location.zipCode);

        for (let i = 0; i < data.length; i++) {
          for (let h = 0; h < fieldHeadings.length; h++) {
            if (fieldHeadings[h].name === "#empty") continue;
            if (fieldHeadings[h].name.split(".")[0] === "degree") {
              if (data[i]["#empty"] === "Average") {
                data[i][fieldHeadings[h].label] = _.mean(
                  data
                    .filter(entry => entry["#empty"] !== "Average")
                    .map(entry => entry[fieldHeadings[h].label])
                );
                continue;
              }

              const degreeType = fieldHeadings[h].name
                .split(".")[1]
                .toLowerCase();
              const year = data[i]["#empty"];

              const total = weatherData
                .filter(weatherItem => {
                  // Filter out dates outside the report range
                  const weatherDate = moment(weatherItem.date);
                  const insideOfRange =
                    weatherDate.isAfter(start) && weatherDate.isBefore(end);
                  if (!insideOfRange) {
                    return false;
                  }

                  // Fiscal year
                  if (year.indexOf("FY") >= 0) {
                    return year === dateUtils.getFiscalYear(weatherItem.date);
                  }

                  // Regular year
                  return weatherItem.year === year;
                })
                .reduce((total, weatherItem) => {
                  return total + weatherItem[degreeType];
                }, 0);

              data[i][fieldHeadings[h].label] = total;
            }
          }
        }
      }
      // END OF HACK
      return utilityTable
        ? utilityTable
        : tableUtils.generateTable(layout, fieldHeadings, data, null) + "<br/>";
    } else if (dataSource === "operation") {
      let counter = 0;
      const scheduleType = fields ? fields[0] : "";
      if (!scheduleType) {
        return "";
      }
      const list = schedule.filter(function(sch) {
        return sch.scheduleType === scheduleType;
      });
      // targetRows.sort('startdate');
      let str = "";
      let prevSunday = "";
      let prevMonday = "";
      let prevTuesday = "";
      let prevWednesday = "";
      let prevThursday = "";
      let prevFriday = "";
      let prevSaturday = "";
      str += "<table>";
      str +=
        '<thead><tr style="background-color:#4F81BC; "> <th>Schedule Name</th><th></th><th>Sunday</th><th>Monday</th><th>Tuesday</th><th>Wednesday</th><th>Thursday</th><th>Friday</th><th>Saturday</th></tr></thead><tbody>';
      const finalArray = [];
      targetRows.map(row => {
        list.map(sch => {
          if (row.schedule.equals(sch._id)) {
            finalArray.push(row);
          }
        });
      });
      _sort(finalArray, "ascending", "hour");
      finalArray.map(row => {
        counter++;
        const hours = [];
        row.sunday.forEach(sun => {
          hours.push(sun.hour);
        });

        row.monday.forEach(mon => {
          if (hours.indexOf(mon.hour) < 0) {
            hours.push(mon.hour);
          }
        });

        row.tuesday.forEach(tue => {
          if (hours.indexOf(tue.hour) < 0) {
            hours.push(tue.hour);
          }
        });

        row.wednesday.forEach(wed => {
          if (hours.indexOf(wed.hour) < 0) {
            hours.push(wed.hour);
          }
        });

        row.thursday.forEach(thur => {
          if (hours.indexOf(thur.hour) < 0) {
            hours.push(thur.hour);
          }
        });

        row.friday.forEach(fri => {
          if (hours.indexOf(fri.hour) < 0) {
            hours.push(fri.hour);
          }
        });

        row.saturday.forEach(sat => {
          if (hours.indexOf(sat.hour) < 0) {
            hours.push(sat.hour);
          }
        });

        if (counter % 2 === 0) {
          str += '<tr style="background-color:#D7E3BD;">';
        } else {
          str += "<tr>";
        }

        str +=
          "<td>" +
          row.scheduleName +
          "</td><td>Period:" +
          row.startDate +
          "-" +
          row.endDate +
          "</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>";

        hours.sort(sortNumber);
        for (const val of hours) {
          counter++;
          if (counter % 2 === 0) {
            str += '<tr style="background-color:#D7E3BD;">';
          } else {
            str += "<tr>";
          }
          const unitSymbol = "%";
          let dayVal = row.sunday
            .filter(function(x) {
              return x.hour === val;
            })
            .map(function(x) {
              return x.value;
            });
          prevSunday = dayVal > 0 ? dayVal : prevSunday;
          dayVal = row.monday
            .filter(function(x) {
              return x.hour === val;
            })
            .map(function(x) {
              return x.value;
            });
          prevMonday = dayVal.length > 0 ? dayVal : prevMonday;
          dayVal = row.tuesday
            .filter(function(x) {
              return x.hour === val;
            })
            .map(function(x) {
              return x.value;
            });
          prevTuesday = dayVal.length > 0 ? dayVal : prevTuesday;
          dayVal = row.wednesday
            .filter(function(x) {
              return x.hour === val;
            })
            .map(function(x) {
              return x.value;
            });
          prevWednesday = dayVal.length > 0 ? dayVal : prevWednesday;
          dayVal = row.thursday
            .filter(function(x) {
              return x.hour === val;
            })
            .map(function(x) {
              return x.value;
            });
          prevThursday = dayVal.length > 0 ? dayVal : prevThursday;
          dayVal = row.friday
            .filter(function(x) {
              return x.hour === val;
            })
            .map(function(x) {
              return x.value;
            });
          prevFriday = dayVal.length > 0 ? dayVal : prevFriday;
          dayVal = row.saturday
            .filter(function(x) {
              return x.hour === val;
            })
            .map(function(x) {
              return x.value;
            });
          prevSaturday = dayVal.length > 0 ? dayVal : prevSaturday;
          str +=
            "<td></td><td>" +
            timeConvert(val.length < 2 ? "0" + val : val + ":00") +
            "</td><td>" +
            (prevSunday > 0 ? prevSunday + unitSymbol : prevSunday) +
            "</td>";
          str +=
            "<td>" +
            (prevMonday > 0 ? prevMonday + unitSymbol : prevMonday) +
            "</td>";
          str +=
            "<td>" +
            (prevTuesday > 0 ? prevTuesday + unitSymbol : prevTuesday) +
            "</td>";
          str +=
            "<td>" +
            (prevWednesday > 0 ? prevWednesday + unitSymbol : prevWednesday) +
            "</td>";
          str +=
            "<td>" +
            (prevThursday > 0 ? prevThursday + unitSymbol : prevThursday) +
            "</td>";
          str +=
            "<td>" +
            (prevFriday > 0 ? prevFriday + unitSymbol : prevFriday) +
            "</td>";
          str +=
            "<td>" +
            (prevSaturday > 0 ? prevSaturday + unitSymbol : prevSaturday) +
            "</td></tr>";
        }
      });
      str += "</tbody></table>";
      return str;
    } else if (dataSource === "construction") {
      const tableCaption = "Construction";
      const hideData =
        (projectConfig &&
          projectConfig.data &&
          projectConfig.data.displayData === "hide") ||
        false;
      const format = (projectConfig &&
        projectConfig.data &&
        projectConfig.data.format) || ["images, table"];
      let imgStr = "";
      const fieldHeadings = [];
      const data = [];
      fieldHeadings.push({ name: "application", label: "Application" });
      fields.forEach(field => {
        const customLabel = _.find(customLabels, { field });
        const name = _formatDotNotationfield(field);
        let label = customLabel
          ? customLabel.value
          : _formatDotNotationLabel(field);
        if (!customLabel) {
          if (label === "Rvalue") {
            label = "R-Value";
          } else if (label === "Uvalue") {
            label = "U-Value";
          }
        }
        fieldHeadings.push({ name, label });
      });
      const types = {
        wall: ["wall"],
        roof: ["roof"],
        window: ["window"],
        interior_floor: ["interior_floor"],
        exterior_floor: ["exterior_floor"],
        foundation: ["foundation"]
      };
      let applicationType = fields.length > 0 && fields[0].split(".")[0];
      const applicationTypes = types[applicationType] || "";
      targetRows = targetRows.filter(
        tr =>
          tr.application &&
          applicationTypes.indexOf(tr.application.toLowerCase()) !== -1
      );
      const isDataAvailable = (targetRows && targetRows.length) || false;
      targetRows = _sortTable(targetRows, projectConfig);
      targetRows.forEach(row => {
        let images = (row && row.images) || [];
        images =
          images &&
          images.map(url => `<img src="${url}" width="${IMAGE_WIDTH}" />`);
        images = images.join("");
        imgStr += images;
        if (typeof row.application !== "undefined") {
          const obj = {};
          // For component tables, try to access .info namespace
          namespace = dataSource && row.info ? row.info : row;
          fieldHeadings.forEach(fHeading => {
            const label = fHeading.label;
            const name = fHeading.name;
            const value =
              util.getValueFromObjPerPath.call(namespace || row, name) || "-";
            obj[label] = value;
          });
          obj["Application"] = _.startCase(
            row.application.trim().toLowerCase()
          );
          data.push(obj);
        }
      });

      if (!isDataAvailable && hideData) return "";
      let returnHtml = "";
      if (format.includes("images")) {
        returnHtml += (imgStr && `<div></div>${imgStr}<div></div>`) || "";
      }
      if (format.includes("table")) {
        const table =
          tableUtils.generateTable(layout, fieldHeadings, data, null) + "<br/>";
        returnHtml += table;
      }
      return returnHtml;
    } else if (dataSource === "equipmentBlock") {
      let { category, application, technology } = equipmentConfig;
      const headingUnits = true; // (future use) boolean value which tells where should we show the units, either heading or in the value fields.
      const equipmentConfigFields = equipmentConfig.fields || [];
      const equipmentConfigs = equipmentConfig.configs || [];
      const equipmentConfigsOrder = equipmentConfig.order || [
        ...equipmentConfigFields,
        ...equipmentConfigs
      ];
      const sortedBuildingEquipment = _sortTable(
        buildingEquipment,
        projectConfig
      ).filter(be => {
        const { libraryEquipment } = be;
        if (!libraryEquipment) return false;
        return (
          (!application || libraryEquipment.application === application) &&
          (!category || libraryEquipment.category === category) &&
          (!technology || libraryEquipment.technology === technology)
        );
      });
      let imageStr = "";
      const isDataAvailable = sortedBuildingEquipment.length > 0;
      const hideData =
        (equipmentConfig.displayData &&
          equipmentConfig.displayData === "hide") ||
        false;
      if (equipmentConfig.format && equipmentConfig.format.includes("images")) {
        const showTimestamp =
          equipmentConfig.subFormat && equipmentConfig.subFormat.timestamp;
        for (let i = 0; i < sortedBuildingEquipment.length; i++) {
          const equip = sortedBuildingEquipment[i];
          let imageData = [];
          if (showTimestamp && timeZone) {
            imageData = await reportClient.getBuildingEquipmentImageData(
              equip._id
            );
          }
          for (let j = 0; j < equip.images.length; j++) {
            const url = equip.images[j];
            if (url) {
              let timeZoneStr = "";
              if (showTimestamp) {
                const syncedData = imageData.find(image => image.uri === url);
                let timestamp = null;
                if (syncedData) {
                  timestamp = syncedData.createdAt;
                } else {
                  timestamp = equip.createdAt;
                }
                if (timestamp) {
                  timeZoneStr = `data-timestamp="${moment(timestamp)
                    .tz(timeZone)
                    .format("MM/DD/YYYY h:mm a")}"`;
                }
              }
              imageStr += `<img src="${url}" ${timeZoneStr} width="${IMAGE_WIDTH}" />`;
            }
          }
        }
      }
      if (imageStr) {
        imageStr = "<div></div>" + imageStr + "<div></div>";
      }
      let fields = [];
      let configFields = [];
      equipmentSchemas.forEach(es => {
        fields.push(es.fields);
        configFields.push(es.configs);
      });
      fields = _.flatten(fields);
      configFields = _.flatten(configFields);
      application = equipmentCategories.find(
        ec => ec.application["value"] === application
      );
      application =
        (application && application.application["displayName"]) || "";
      technology = equipmentCategories.find(
        ec => ec.technology["value"] === technology
      );
      technology = (technology && technology.technology["displayName"]) || "";
      category = equipmentCategories.find(
        ec => ec.category["value"] === category
      );
      category = (category && category.category["displayName"]) || "";
      const label = [category, application, technology]
        .filter(displayName => displayName && displayName.length)
        .join(" / ");
      const tableCaption = label;
      const tableFieldHeadings = [];
      const data = [];
      if (equipmentConfigsOrder) {
        equipmentConfigsOrder.forEach(field => {
          field = fields.find(fld => fld.field === field) || {
            field,
            fieldDisplayName: _formatCamelCaseNotationLabel(field).replace(
              /\./g,
              " "
            )
          };
          const displayName =
            field.fieldDisplayName || _formatCamelCaseNotationLabel(field);
          const units = headingUnits && field.units;
          tableFieldHeadings.push({
            name: field.field,
            label: `${displayName}${(units && " (" + units + ")") || ""}`
          });
        });
      }
      if (isDataAvailable) {
        sortedBuildingEquipment.map((be, index) => {
          const obj = {};
          const { libraryEquipment, configs, location } = be;

          equipmentConfigFields.forEach(fieldName => {
            let field =
              fieldName === "totalWattage" ? "totalInputPower" : fieldName;
            const esfield = fields.find(fld => fld.field === field);
            let units = !headingUnits && esfield.units;
            units = (units && ` (${units})`) || "";

            let fieldValue = "-";
            if (libraryEquipment && libraryEquipment.fields) {
              if (Object.keys(libraryEquipment.fields || {}).includes(field)) {
                fieldValue = libraryEquipment.fields[field].value || "-";
              } else if (libraryEquipment[field]) {
                fieldValue = libraryEquipment[field] || "-";
              } else {
                fieldValue = _.get(be, field, "-");
              }
            }

            if (
              field === "totalInputPower" &&
              (fieldValue === "-" || !fieldValue)
            ) {
              let lampInputPower =
                (libraryEquipment &&
                  libraryEquipment.fields &&
                  libraryEquipment.fields["lampInputPower"] &&
                  libraryEquipment.fields["lampInputPower"].value) ||
                0;

              let numberOfLamps =
                (libraryEquipment &&
                  libraryEquipment.fields &&
                  libraryEquipment.fields["numberOfLamps"] &&
                  libraryEquipment.fields["numberOfLamps"].value) ||
                1;
              let ballastFactor =
                (libraryEquipment &&
                  libraryEquipment.fields &&
                  libraryEquipment.fields["ballastFactor"] &&
                  libraryEquipment.fields["ballastFactor"].value) ||
                1;
              fieldValue =
                lampInputPower * numberOfLamps * ballastFactor || "-";
            }
            if (field.includes("location")) {
              let item = field.substr(field.indexOf("location.") + 9);
              fieldValue = (location && location[item]) || "-";
            }

            let label = tableFieldHeadings.find(tfh => tfh.name === fieldName);
            label = (label && label.label) || "-";
            obj[label] = fieldValue + units;
          });

          if (equipmentConfigs) {
            equipmentConfigs.forEach(config => {
              const esconfig = configFields.find(cnfg => cnfg.field === config);
              let units = !headingUnits && esconfig.units;
              units = (units && ` (${units})`) || "";
              let configDetail = configs.find(cofig => cofig.field === config);
              configDetail = (configDetail && configDetail.value) || "-";
              let label = tableFieldHeadings.find(tfh => tfh.name === config);
              label = (label && label.label) || "-";
              obj[label] = configDetail + units;
            });
          }

          data.push(obj);
        });
      }
      if (!isDataAvailable && hideData) {
        return "";
      }
      return (
        imageStr +
        tableUtils.generateTable(layout, tableFieldHeadings, data) +
        "<br/>"
      );
    } else if (dataSource === "contact") {
      targetRows = _sortTable(targetRows, projectConfig);
      const fieldHeadings = [];
      const data = [];
      fields.forEach(field => {
        const customLabel = _.find(customLabels, { field });
        fieldHeadings.push({
          name: field,
          label: customLabel
            ? customLabel.value
            : _formatDotNotationLabel(field)
        });
      });
      targetRows.map(row => {
        const obj = {};
        fields.forEach(field => {
          let label = fieldHeadings.find(fh => fh.name === field);
          label = (label && label.label) || "";
          // For component tables, try to access .info namespace
          namespace = dataSource && row.info ? row.info : row;
          obj[label] = _formatCamelCaseNotationField(
            util.getValueFromObjPerPath.call(
              namespace || row,
              _formatDotNotationfield(field)
            ) || "-"
          );
        });
        data.push(obj);
      });
      return (
        tableUtils.generateTable(layout, fieldHeadings, data, null) + "<br/>"
      );
    } else if (dataSource === "location") {
      if (fields[0].split(".")[0] === "details") {
        const fieldHeadings = [];
        const data = [];
        targetRows = building.buildingUseTypes || [];
        targetRows = targetRows.map(row => {
          return {
            usetype: row.use,
            area: row.squareFeet
          };
        });
        if (targetRows.length === 0) {
          targetRows = [
            {
              usetype: building.buildingUse,
              area: building.squareFeet
            }
          ];
        }
        targetRows = _sortTable(targetRows, projectConfig);
        fields.forEach(field => {
          const customLabel = _.find(customLabels, { field });
          const label = customLabel
            ? customLabel.value
            : _formatDotNotationLabel(field);
          fieldHeadings.push({
            name: field,
            label: _formatHeaderForLocation(label)
          });
        });
        targetRows.forEach(row => {
          const obj = {};
          fields.forEach(field => {
            let label = fieldHeadings.find(fh => fh.name === field);
            label = label && label.label;
            // For component tables, try to access .info namespace
            namespace = dataSource && row.info ? row.info : row;
            if (_formatDotNotationfield(field) === "area") {
              obj[label] =
                _formatCamelCaseNotationField(
                  util.getValueFromObjPerPath.call(
                    namespace || row,
                    _formatDotNotationfield(field)
                  ) || "0"
                ) + " ft<sup>2</sup>";
            } else if (_formatDotNotationfield(field) === "floor") {
              let florVal = util.getValueFromObjPerPath.call(
                namespace || row,
                _formatDotNotationfield(field)
              );
              florVal = florVal ? florVal.toString().replace("-", "B") : "";
              obj[label] = _formatCamelCaseNotationField(florVal || "-");
            } else if (_formatDotNotationfield(field) === "useType") {
              let typeObject = buildingTypes.find(
                type => type.value === row.usetype
              );
              obj[label] = (typeObject && typeObject.name) || "";
            } else {
              obj[label] = _formatCamelCaseNotationField(
                util.getValueFromObjPerPath.call(
                  namespace || row,
                  _formatDotNotationfield(field)
                ) || "-"
              );
            }
          });
          data.push(obj);
        });
        let total = {};
        fields.forEach(field => {
          let label = fieldHeadings.find(fh => fh.name === field);
          label = label && label.label;
          let fieldValues = data.map(item => item[label]);
          let flag = 0;
          fieldValues = fieldValues.map(item => {
            let value = item;
            if (_formatDotNotationfield(field) === "area") {
              value = item.split(" ft<sup>2</sup>");
              value = value.length ? +value[0] : 0;
            } else if (
              _formatDotNotationfield(field) === "length" ||
              _formatDotNotationfield(field) === "width" ||
              _formatDotNotationfield(field) === "height"
            ) {
              value = value === "-" ? 0 : +value;
            }
            if (value != +value) flag = 1;
            else value = +value;
            return value;
          });
          if (!flag) {
            fieldValues = fieldValues.map(item => +item);
            fieldValues =
              fieldValues.reduce((prev, curr) => prev + curr, 0) || 0;
            fieldValues = _.round(fieldValues, 4);
            if (_formatDotNotationfield(field) === "area") {
              total[label] = (fieldValues || "0") + " ft<sup>2</sup>";
            } else if (
              _formatDotNotationfield(field) === "length" ||
              _formatDotNotationfield(field) === "width" ||
              _formatDotNotationfield(field) === "height"
            ) {
              total[label] = fieldValues || "-";
            }
          } else {
            total[label] = "-";
          }
          if (field === fields[0]) total[label] = "Total";
        });
        data.push(total);
        return tableUtils.generateTable(layout, fieldHeadings, data, null);
      } else if (fields[0].split(".")[0] === "summary") {
        const fieldHeadings = [];
        const data = [];
        // summary location

        let _useType = "";
        let _spaceType = "";
        let _lstUseType = "";
        let _lstSpaceType = "";
        let _lstTenantArea = 0;
        let _lstOwnerArea = 0;
        let _lstCondArea = 0;
        let _lstUncondArea = 0;
        let _area = 0;
        let _lstArea = 0;
        let _tenantArea = 0;
        let _condArea = 0;
        let _uncondArea = 0;
        let _ownerArea = 0;
        const summary = [];
        let counter = 0;
        let summaryDetail = [];
        if (locationSummaryBy === "usetype") {
          targetRows.sort(function(a, b) {
            const nameA = a.usetype.toLowerCase();
            const nameB = b.usetype.toLowerCase();
            if (nameA < nameB) {
              // sort string ascending
              return -1;
            }
            if (nameA > nameB) return 1;
            return 0; // default return value (no sorting)
          });
          targetRows.forEach(function(ele) {
            _useType = ele.usetype;
            counter++;
            const areaVal = isNaN(ele.area) ? 0 : ele.area;
            if (
              _lstUseType === "" ||
              (_lstUseType && _lstUseType === ele.usetype)
            ) {
              _area += areaVal;
              _spaceType = _spaceType + " , " + ele.spaceType;
              if (ele.user === "owner") {
                _ownerArea += areaVal;
              } else if (ele.user === "tenant") {
                _tenantArea += areaVal;
              }
              if (ele.conditioning === "unconditioned") {
                _uncondArea += areaVal;
              } else {
                _condArea += areaVal;
              }

              if (counter === targetRows.length) {
                summary.push({
                  usetype: _useType,
                  spaceType: _spaceType,
                  tenantArea: _tenantArea,
                  ownerArea: _ownerArea,
                  area: _area,
                  conditionedArea: _condArea,
                  unconditionedArea: _uncondArea
                });
              }
            } else {
              summary.push({
                usetype: _lstUseType,
                spaceType: _spaceType,
                tenantArea: _tenantArea,
                ownerArea: _ownerArea,
                area: _area,
                conditionedArea: _condArea,
                unconditionedArea: _uncondArea
              });
              _useType = "";
              _spaceType = "";
              _area = 0;
              _tenantArea = 0;
              _ownerArea = 0;
              _condArea = 0;
              _uncondArea = 0;

              _area = areaVal;
              if (ele.user === "owner") {
                _ownerArea = areaVal;
              } else if (ele.user === "tenant") {
                _tenantArea = areaVal;
              }
              if (ele.conditioning === "unconditioned") {
                _uncondArea = areaVal;
              } else {
                _condArea = areaVal;
              }
            }
            _lstUseType = ele.usetype;
            _lstSpaceType = ele.spaceType;
            _lstArea = areaVal;
            _lstOwnerArea = 0;
            _lstTenantArea = 0;
            _lstUncondArea = 0;
            _lstCondArea = 0;
            if (ele.user === "owner") {
              _lstOwnerArea = areaVal;
            } else if (ele.user === "tenant") {
              _lstTenantArea = areaVal;
            }
            if (ele.conditioning === "unconditioned") {
              _lstUncondArea = areaVal;
            } else {
              _lstCondArea = areaVal;
            }
          });
          if (_useType === "") {
            summary.push({
              usetype: _lstUseType,
              spaceType: _lstSpaceType,
              tenantArea: _lstTenantArea,
              ownerArea: _lstOwnerArea,
              area: _lstArea,
              conditionedArea: _lstCondArea,
              unconditionedArea: _lstUncondArea
            });
          }

          let percentageFloorArea = 0;
          let percentageCommonArea = 0;
          let percentageTenantArea = 0;
          let percentageConditionedArea = 0;
          let percentageUnconditionedArea = 0;

          summary.forEach(element => {
            percentageFloorArea = 0;
            percentageCommonArea = 0;
            percentageTenantArea = 0;
            percentageConditionedArea = 0;
            percentageUnconditionedArea = 0;
            if (building.squareFeet > 0) {
              percentageFloorArea = (element.area / building.squareFeet) * 100;
              percentageCommonArea =
                (element.ownerArea / building.squareFeet) * 100;
              percentageTenantArea =
                (element.tenantArea / building.squareFeet) * 100;
              percentageConditionedArea =
                (element.conditionedArea / building.squareFeet) * 100;
              percentageUnconditionedArea =
                (element.unconditionedArea / building.squareFeet) * 100;
            } else {
              percentageFloorArea = 0;
              percentageCommonArea = 0;
              percentageTenantArea = 0;
              percentageConditionedArea = 0;
              percentageUnconditionedArea = 0;
            }
            let spaceTypeFlag = {};
            let typeObject = buildingTypes.find(
              type => type.value === element.usetype
            );
            const _useType = typeObject ? typeObject.name : "Undefined";
            const _spaceType = element.spaceType
              ? element.spaceType
                  .split(" , ")
                  .filter(item => {
                    if (spaceTypeFlag[item] === undefined && item) {
                      spaceTypeFlag[item] = true;
                      return true;
                    }
                    return false;
                  })
                  .map(item => _formatDotNotationLabel(item))
                  .join(" , ")
              : "";
            const _userTypeArea = element.area;
            summaryDetail.push({
              usetype: _useType,
              spaceType: _spaceType,
              grossUseTypeArea: _userTypeArea,
              percentofUseTypeArea: percentageFloorArea,
              percentofCommonArea: percentageCommonArea.toFixed(2),
              percentofTenantArea: percentageTenantArea.toFixed(2),
              percentofConditionedArea: percentageConditionedArea.toFixed(2),
              percentofUnconditionedArea: percentageUnconditionedArea.toFixed(2)
            });
          });
        } else {
          targetRows.sort(function(a, b) {
            const nameA = a.floor;
            const nameB = b.floor;
            if (nameA < nameB) {
              // sort string ascending
              return -1;
            }
            if (nameA > nameB) return 1;
            return 0; // default return value (no sorting)
          });

          let _lstFloor = "";
          let _floor = "";
          targetRows.forEach(function(ele) {
            _floor = ele.floor;
            counter++;
            if (_lstFloor == "" || (_lstFloor && _lstFloor == ele.floor)) {
              _area += ele.area;
              _spaceType = _spaceType + "" + ele.spaceType;
              if (_lstFloor != "" && counter === targetRows.length) {
                summary.push({ floor: _floor, area: _area });
              }
            } else {
              summary.push({ floor: _lstFloor, area: _area });
              _area = ele.area;
              _spaceType = ele.spaceType;
            }
            _lstArea = ele.area;
            _lstFloor = isValid(ele.floor) ? ele.floor.toString() : "";
          });

          if (_floor === "") {
            summary.push({ floor: _lstFloor, area: _lstArea });
          }
          summaryDetail = [];
          summary.sort((lhs, rhs) => lhs.floor > rhs.floor);
          let percentageFloorArea = 0;
          summary.forEach(element => {
            percentageFloorArea = 0;
            if (element.area > 0 && building.squareFeet > 0) {
              percentageFloorArea = (element.area / building.squareFeet) * 100;
            }

            summaryDetail.push({
              floor: element.floor.toString().replace("-", "B"),
              grossFloorArea: element.area,
              percentofFloorArea: Number(percentageFloorArea.toFixed(2))
            });
          });
        }

        let buildingUses = [...(building.buildingUseTypes || [])];
        if (buildingUses.length === 0) {
          buildingUses = [
            {
              use: building.buildingUse,
              squareFeet: building.squareFeet
            }
          ];
        }
        summaryDetail = buildingUses.map(item => {
          let typeObject = buildingTypes.find(type => type.value === item.use);
          let useType = (typeObject && typeObject.name) || "";
          return {
            usetype: useType,
            spaceType: "",
            grossUseTypeArea: item.squareFeet,
            percentofUseTypeArea: building.squareFeet
              ? (item.squareFeet / building.squareFeet) * 100
              : 0,
            percentofCommonArea: 0,
            percentofTenantArea: 0,
            percentofConditionedArea: 0,
            percentofUnconditionedArea: 0
          };
        });
        summaryDetail = _sortTable(summaryDetail, projectConfig);
        fields.forEach(field => {
          const customLabel = _.find(customLabels, { field });
          fieldHeadings.push({
            name: field,
            label: customLabel
              ? customLabel.value
              : _formatHeaderForLocation(_formatDotNotationLabel(field))
          });
        });
        summaryDetail.forEach(row => {
          const obj = {};
          fields.forEach(field => {
            let label = fieldHeadings.find(fh => fh.name === field);
            label = (label && label.label) || "";
            // For component tables, try to access .info namespace
            let fieldValue = _formatCamelCaseNotationField(
              util.getValueFromObjPerPath.call(
                row,
                _formatDotNotationfield(field)
              ) || ""
            );
            if (_formatDotNotationfield(field).includes("percentof")) {
              fieldValue = _.round(fieldValue, 4);
              obj[label] = (fieldValue || "0") + "%";
            } else if (_formatDotNotationfield(field) === "grossFloorArea") {
              fieldValue = _.round(fieldValue, 4);
              obj[label] = (fieldValue || "0") + " ft<sup>2</sup>";
            } else {
              obj[label] = fieldValue || "0";
            }
          });
          data.push(obj);
        });
        const total = {};
        fields.forEach(field => {
          let label = fieldHeadings.find(fh => fh.name === field);
          label = (label && label.label) || "";
          // For component tables, try to access .info namespace
          let fieldValues = data.map(item => item[label]) || [];
          let flag = 0;
          fieldValues =
            fieldValues.map(item => {
              let value = item;
              if (_formatDotNotationfield(field).includes("percentof")) {
                value = +item.split("%")[0];
              }
              if (_formatDotNotationfield(field) === "grossFloorArea") {
                value = +item.split(" ft<sup>2</sup>")[0];
              }
              if (value != +value) flag = 1;
              else value = +value;
              return value;
            }) || [];
          if (!flag) {
            fieldValues = fieldValues.map(item => +item);
            fieldValues =
              fieldValues.reduce((prev, curr) => prev + curr, 0) || 0;
            fieldValues = _.round(fieldValues, 4);
            if (_formatDotNotationfield(field).includes("percentof")) {
              total[label] = (fieldValues || "0") + "%";
            } else if (_formatDotNotationfield(field) === "grossFloorArea") {
              total[label] = (fieldValues || "0") + " ft<sup>2</sup>";
            } else {
              total[label] = fieldValues || "0";
            }
          } else {
            total[label] = "";
          }
          if (field === fields[0]) total[label] = "Total";
        });
        data.push(total);
        return tableUtils.generateTable(layout, fieldHeadings, data, null);
      }
    } else if (dataSource === "endusebreakdown") {
      return await endUseUtils.getTable({
        building,
        metaData,
        projectConfig,
        customLabels,
        customDate
      });
    } else {
      const fieldHeadings = [];
      const data = [];
      fields.forEach(field => {
        const customLabel = _.find(customLabels, { field });
        fieldHeadings.push({
          name: field,
          label: customLabel
            ? customLabel.value
            : _formatDotNotationLabel(field)
        });
      });
      targetRows
        .filter(row => row !== undefined && row !== null)
        .forEach(row => {
          const obj = {};
          fields.forEach(field => {
            // For component tables, try to access .info namespace
            namespace = dataSource && row.info ? row.info : row;
            let label = fieldHeadings.find(fh => fh.name === field);
            label = (label && label.label) || "";
            obj[label] =
              util.getValueFromObjPerPath.call(namespace || row, field) || "-";
          });
          data.push(obj);
        });
      return tableUtils.generateTable(layout, fieldHeadings, data, null);
    }
  } catch (error) {
    console.error("Error generating table block");
    console.error(error);
  }
};

const _getLocationBuildingUse = function(targetRows) {
  try {
    let _useType = "";
    let _lstUseType = "";
    let _area = 0;
    let _lstArea = 0;
    const summary = [];
    let counter = 0;
    targetRows.sort(function(a, b) {
      const nameA = a.usetype;
      const nameB = b.usetype;
      if (nameA < nameB) {
        // sort string ascending
        return -1;
      }
      if (nameA > nameB) return 1;
      return 0; // default return value (no sorting)
    });
    targetRows.forEach(function(ele) {
      _useType = ele.usetype;
      counter++;
      const areaVal = isNaN(ele.area) ? 0 : ele.area;
      if (_lstUseType === "" || (_lstUseType && _lstUseType === ele.usetype)) {
        _area += areaVal;

        if (counter === targetRows.length) {
          summary.push({ usetype: _useType, area: _area });
        }
      } else {
        summary.push({ usetype: _lstUseType, area: _area });
        _useType = "";
        _area = 0;
        _area = areaVal;
      }
      _lstUseType = ele.usetype;
      _lstArea = areaVal;
    });
    if (_useType === "") {
      summary.push({ usetype: _lstUseType, area: _lstArea });
    }
    return summary;
  } catch (error) {
    console.error(error);
    return new Error(error);
  }
};

const _getAuditList = function(target, fields, listType, type) {
  const targetElements = _.isArray(target) ? target : [target];
  return (
    "<" +
    listType +
    ">" +
    targetElements
      .map(function(ele) {
        return (
          fields
            .map(function(field) {
              if (field === "componentCount" || field === "comment") return ""; // Skip count and comment fields
              return (
                "<li><b>" +
                _formatDotNotationLabel(field) +
                " : </b>" +
                (util.getValueFromObjPerPath.call(ele, field) || "-") +
                (ele.componentCount
                  ? "<br>&nbsp;&nbsp; - Components: " + ele.componentCount
                  : "") +
                (ele.comment
                  ? "<br>&nbsp;&nbsp; - Comment: " + ele.comment
                  : "") +
                "</li>"
              );
            })
            .join("") + ""
        );
      })
      .join("") +
    "</" +
    listType +
    ">"
  );
};

const getImageWidth = async function(url) {
  try {
    if (!url) return 0;
    const size = await requestImageSize(url);
    return size.width;
  } catch (err) {
    console.log("error", error);
    return 0;
  }
};

const _getImage = async function(src, fields, building) {
  let imgSrc = "";
  let maxWidth = 0;
  if (fields && building && building.buildingImage !== "") {
    imgSrc = building.buildingImage;
    maxWidth = 600;
  } else if (src) {
    imgSrc = src;
  }
  if (!imgSrc) return "";
  const width = await getImageWidth(imgSrc);
  if (width === 0) return "";
  return `<img src="${imgSrc}" width="${Math.min(width, maxWidth)}" />`;
};

const _getDivider = dividerConfig => {
  const { width, color } = dividerConfig;
  return `<p><line color="${color.substring(1)}" thickness="${width}" /></p>`;
};

const _getGoogleMapImage = function(target) {
  if (!GOOGLE_MAPS_API_KEY || !GOOGLE_MAPS_URI) return "";

  if (target.location) {
    const location = util.getValueFromObjPerPath.call(target, "location");
    const address =
      location.address +
      ", " +
      location.city +
      ", " +
      location.state +
      " " +
      location.zipCode;

    const imgSrc = querystring.stringify({
      center: address || "US",
      zoom: address ? "18" : "3", // If there is a specific address, then zoom in
      size: "600x300",
      maptype: "satellite",
      markers: address || "US",
      key: GOOGLE_MAPS_API_KEY
    });

    return `<img src="${GOOGLE_MAPS_URI}?${imgSrc}" width="${IMAGE_WIDTH}" />`;
  }
};

const replaceAll = function(str, search, replace) {
  if (replace === undefined) {
    return str.toString();
  }
  return str.split(search).join(replace);
};

const getReportDates = function(building, customDate) {
  return {
    createdDate: moment().format("MMMM D, YYYY"),
    startDate: customDate
      ? customDate.customStartDate.format("MMMM YYYY")
      : null,
    endDate: customDate ? customDate.customEndDate.format("MMMM YYYY") : null
  };
};

const trimStringsInObject = function(data) {
  if (!data) return;
  Object.entries(data).forEach(([key, value]) => {
    if (typeof value === "object" && !Array.isArray(value)) {
      trimStringsInObject(value);
    } else if (typeof value === "string") {
      data[key] = value.trim().length > 0 ? value : null;
    }
  });
};

/**
 * Generate a report (html -> doc) based off stored template info
 */
exports.getTemplateReport = async (req, res, next) => {
  // increase the timeout to 10 minutes
  req.setTimeout(600000);
  const userId = req.params.userId;
  const building = req.building;
  const format = req.query.format || "word";
  const organization = await Organization.findOne({
    buildingIds: { $in: [building._id] }
  });
  let template = req.template;
  const {
    startDate,
    endDate,
    customStartDate,
    customEndDate,
    proposalId = "",
    timeZone
  } = req.query;
  let customDate = null;
  if (customStartDate && customEndDate) {
    customDate = {
      customStartDate: moment(customStartDate).startOf("month"),
      customEndDate: moment(customEndDate).endOf("month")
    };
  }
  let documentArr = [];
  let hasTwoColumnTable = false;
  const reqDocTo =
    req.query.docTo && typeof req.query.docTo === "string"
      ? req.query.docTo.toLowerCase()
      : null;

  template = template.toJSON();

  // Ensure we have the required data before continuing
  if (!template.body) {
    return util.sendError(
      "Template missing required data to generate html.",
      400,
      req,
      res,
      next
    );
  }
  try {
    // Assemble the full document for header/footer/meta/body
    documentArr.push({
      content:
        template.header && template.header.text ? template.header.text : "",
      ele: "header",
      isComment: true
    });
    documentArr.push({
      content:
        template.header && template.header.image ? template.header.image : "",
      ele: "header-image",
      isComment: true
    });
    documentArr.push({
      content:
        template.footer && template.footer.text ? template.footer.text : "",
      ele: "footer",
      isComment: true
    });
    documentArr.push({
      content:
        template.config && template.config.tableOfContents
          ? String(template.config.tableOfContents)
          : "false",
      ele: "config-toc",
      isComment: true
    });
    documentArr.push({
      content:
        template.config &&
        template.config.tableOfContents &&
        template.config.tableOfContentsDepth
          ? String(template.config.tableOfContentsDepth)
          : "false",
      ele: "config-toc-depth",
      isComment: true
    });
    documentArr.push({
      content:
        template.config && template.config.pageNumbers
          ? String(template.config.pageNumbers)
          : "false",
      ele: "config-pagenum",
      isComment: true
    });
    documentArr.push({
      content:
        template.config && template.config.numberPosition
          ? String(template.config.numberPosition)
          : "outside",
      ele: "config-pagenum-pos",
      isComment: true
    });
    documentArr.push(template.body);
    documentArr = _.flatten(documentArr);

    const tableOfContent =
      template.config && template.config.tableOfContents
        ? String(template.config.tableOfContents)
        : "false";
    const pageNumbers =
      template.config && template.config.pageNumbers
        ? String(template.config.pageNumbers)
        : "false";
    const tableOfContentsDepth =
      template.config &&
      template.config.tableOfContents &&
      template.config.tableOfContentsDepth
        ? String(template.config.tableOfContentsDepth)
        : "3";
    let numberPosition =
      template.config && template.config.numberPosition
        ? String(template.config.numberPosition)
        : "Center";
    let PageNumberDisplayOnHeader = "false";
    if (
      numberPosition === "headerRight" ||
      numberPosition === "headerCenter" ||
      numberPosition === "headerLeft"
    ) {
      PageNumberDisplayOnHeader = "true";
      numberPosition = numberPosition.replace("header", "");
    }
    numberPosition = numberPosition === "inside" ? "left" : numberPosition;
    numberPosition = numberPosition === "outside" ? "right" : numberPosition;
    const headerText =
      template.header && template.header.text
        ? String(template.header.text)
        : "";
    const headerPosition =
      template.header && template.header.position
        ? String(template.header.position)
        : "";
    const headerImage =
      template.header && template.header.image
        ? String(template.header.image)
        : "";
    const headerDivider =
      template.header && template.header.dividerConfig
        ? _getDivider(template.header.dividerConfig)
        : "";
    const footerText =
      template.footer && template.footer.text
        ? String(template.footer.text)
        : "";
    const footerImage =
      template.footer && template.footer.image
        ? String(template.footer.image)
        : "";
    const footerPosition =
      template.footer && template.footer.position
        ? String(template.footer.position)
        : "";
    const footerDivider =
      template.footer && template.footer.dividerConfig
        ? _getDivider(template.footer.dividerConfig)
        : "";

    const constructionFields = documentArr.filter(function(x) {
      return x.type === "table" && x.target === "construction";
    });

    let project = await reportClient.getProject(building.projectIds);
    project = project.map(item => ({
      ...item,
      project_category:
        (item.project_category && item.project_category.trim()) || "",
      project_application:
        (item.project_application && item.project_application.trim()) || "",
      project_technology:
        (item.project_technology && item.project_technology.trim()) || "",
      category: (item.category && item.category.trim()) || ""
    }));
    const {
      utilities,
      monthlyUtilities
    } = await reportUtilityClient.getUtilities(
      building,
      moment([startDate, 0, 1]),
      moment([endDate, 0, 1]),
      customStartDate,
      customEndDate
    );
    const benchmark = reportClient.getBenchmark(building);
    const user = await reportClient.getUser(userId);
    const schedule = await reportClient.getOperation(building);
    const construction = await reportClient.getConstruction(building);
    const measure = projectUtils.getMeasuresData(project, building);
    construction.forEach(row => {
      building.constructions.forEach(brow => {
        if (brow.construction.equals(row._id)) {
          brow.name = row.name;
          brow.rvalue =
            (row.fields && row.fields.rValue && row.fields.rValue.value) || "";
          brow.uvalue =
            (row.fields && row.fields.uvalue && row.fields.uvalue.value) || "";
          brow.application = row.application;
        }
      });
    });
    let isInclude = false;
    if (constructionFields.length > 0) {
      constructionFields[0].fields.forEach(element => {
        if (element.includes("comments")) {
          isInclude = true;
        }
      });
      if (!isInclude) {
        building.constructions = [];
        construction.forEach((row, i) => {
          const a = {};
          a.name = row.name;
          a.rvalue = row.rvalue;
          a.uvalue = row.uvalue;
          a.application = row.application;
          building.constructions.push(a);
        });
      }
    }

    // proposal field values

    let proposal = null;
    let proposalFieldValues = {};
    let proposalProjects = [];

    if (proposalId) {
      proposal = await Proposal.findById(proposalId)
        .lean()
        .exec();
      let fieldValues = (proposal && proposal.fieldValues) || {};
      for (let key in fieldValues) {
        let updatedKey = key.replace(
          /[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi,
          " "
        );
        updatedKey = updatedKey.split(" ").join("-");
        let value = fieldValues[key] || "";
        if (value.includes("<p")) {
          value = linebreak(value);
          value = formatEditorText(value);
          value = removeHTMLTags(value);
        }
        proposalFieldValues[updatedKey] = value;
      }
      let proposalProjectIds = await getProjectIdsFromProposal(proposal);
      proposalProjects = await reportClient.getProject(proposalProjectIds);

      proposalProjects = proposalProjects.map(project => ({
        ...project,
        project_category:
          (project.project_category && project.project_category.trim()) || "",
        project_application:
          (project.project_application && project.project_application.trim()) ||
          "",
        project_technology:
          (project.project_technology && project.project_technology.trim()) ||
          "",
        category: (project.category && project.category.trim()) || ""
      }));
    }

    try {
      await addReportEndUseUtil({
        buildingId: building._id,
        templateId: template._id,
        customDate
      });
    } catch (error) {
      console.log("error", error);
    }

    const buildingEquipment = await reportClient.getBuildingEquipment(building);
    const location = await reportClient.getLocation(building);
    const report = getReportDates(building, customDate);
    const {
      equipmentCategories,
      equipmentSchemas
    } = await reportClient.getEquipmentCategorization();

    // get audit from building, no need to make an extra call
    // run through the 'cleanFirebaseAuditForReport' call to get extra information, like counts, components, etc.
    let audit = util.cleanFirebaseAuditForReport(building.eaAudit);
    // Clean any empty fields present in the result, with 'util.cleanEmptyProps(audit)'
    audit = util.cleanEmptyProps(audit);

    let targets = {
      benchmark: benchmark || {},
      audit: audit || {},
      project: project || [],
      user: user || [],
      operation: building.operations || {},
      construction: building.constructions || {},
      contact: building.contacts || [],
      location: location || {},
      measure: measure || {},
      report: report || {},
      proposalFieldValues: proposalFieldValues,
      ...reportClient.getOverview({ building, utilities })
    };
    const customHandlers = getBuildingCustomHandler(building);
    const endUseHandelbars = await endUseUtils.getEndUseHandleBars({
      building,
      customDate
    });
    const buildingJson = building ? building.toJSON() : {};
    trimStringsInObject(buildingJson);
    const userData = user.toJSON();
    userData.currentOrganizationName = organization.name;
    trimStringsInObject(userData);
    targets = {
      ...targets,
      user: userData,
      building: {
        ...buildingJson,
        ...customHandlers
      },
      ...endUseHandelbars
    };
    const tmpHtmlEleArr = [];
    let htmlObj;

    // Create the html array of elements
    for (let i = 0; i < documentArr.length; i += 1) {
      htmlObj = documentArr[i];

      // Get the top-level parent key (generally the type of component)
      // and all the dot-notation paths for fields from audit data
      const tmpParsedResult = _getParsedTargetPaths(htmlObj.fields);

      // If there is no specific element, then fall to the default for the type
      if (!htmlObj.ele && htmlObj.type && HTMLTYPEMAP[htmlObj.type]) {
        htmlObj.ele = HTMLTYPEMAP[htmlObj.type] || null;
      }
      let projectConfig = htmlObj.projectConfig || {};
      // Catch special cases first
      if (htmlObj.target === "audit") {
        if (!tmpParsedResult) return;

        if (
          htmlObj.type === "table" &&
          htmlObj.ele === "table" &&
          htmlObj.fields
        ) {
          if (targets.audit && targets.audit.components) {
            tmpHtmlEleArr.push(
              await _getTable({
                target:
                  targets.audit.components[tmpParsedResult.target] ||
                  targets.audit[tmpParsedResult.target] ||
                  [],
                fields: tmpParsedResult.pathsArr || [],
                customLabels: htmlObj.customLabels,
                dataSource: tmpParsedResult.target,
                schedule,
                equipmentConfig: htmlObj.equipmentConfig,
                building,
                locationSummaryBy: htmlObj.tableType,
                projectConfig,
                equipment: {
                  buildingEquipment,
                  equipmentCategories,
                  equipmentSchemas
                },
                htmlObj,
                timeZone
              })
            );
            continue;
          }
        }
        if (htmlObj.ele === "ul" || htmlObj.ele === "ol") {
          tmpHtmlEleArr.push(
            _getAuditList(
              targets.audit[tmpParsedResult.target] || [],
              tmpParsedResult.pathsArr || [],
              htmlObj.ele,
              tmpParsedResult.target
            )
          );
          continue;
        }
      }

      // For all project tables
      if (htmlObj.target === "measure" && htmlObj.ele === "table") {
        // project details option
        if (
          htmlObj.projectConfig &&
          htmlObj.projectConfig.format === "bulletedList"
        ) {
          let type = htmlObj.projectConfig && htmlObj.projectConfig.type;
          let projects =
            type === "proposal" ? proposalProjects : targets.project;
          tmpHtmlEleArr.push(
            await projectUtils.getProjectBulletedList(
              projects || [],
              htmlObj.projectConfig,
              targets.building || "",
              timeZone
            )
          );
          continue;
        }
        if (
          htmlObj.projectConfig &&
          htmlObj.projectConfig.format === "summaryTable"
        ) {
          let type = htmlObj.projectConfig && htmlObj.projectConfig.type;
          let projects =
            type === "proposal" ? proposalProjects : targets.project;
          tmpHtmlEleArr.push(
            projectUtils.getProjectSummaryTable(
              projects || [],
              htmlObj.projectConfig,
              targets.building || "",
              htmlObj.tableLayout
            )
          );
          continue;
        }
        if (
          htmlObj.projectConfig &&
          htmlObj.projectConfig.format === "fullDetails"
        ) {
          let type = htmlObj.projectConfig && htmlObj.projectConfig.type;
          let projects =
            type === "proposal" ? proposalProjects : targets.project;
          tmpHtmlEleArr.push(
            await projectUtils.getFullProjectDetails(
              projects || [],
              htmlObj.projectConfig,
              targets.building || "",
              null,
              timeZone
            )
          );
          continue;
        }
        if (
          htmlObj.projectConfig &&
          (htmlObj.projectConfig.format === "endUseTable" ||
            htmlObj.projectConfig.format === "energyTable")
        ) {
          tmpHtmlEleArr.push({
            metadata: htmlObj.metaData,
            building,
            projectConfig
          });
          continue;
        }
        if (htmlObj.projectConfig && htmlObj.projectConfig.format === "card") {
          hasTwoColumnTable = true;
          let type = htmlObj.projectConfig && htmlObj.projectConfig.type;
          let projects =
            type === "proposal" ? proposalProjects : targets.project;
          tmpHtmlEleArr.push(
            projectUtils.getProjectCardTable(
              projects || [],
              htmlObj.projectConfig,
              targets.building || ""
            )
          );
          continue;
        }
      }

      if (
        htmlObj.type === "ordered-list-text" ||
        htmlObj.type === "unordered-list-text"
      ) {
        tmpHtmlEleArr.push(
          _getTextList(htmlObj.fields, htmlObj.ele, htmlObj.styleFormat)
        );
        continue;
      }
      if (htmlObj.type === "address") {
        tmpHtmlEleArr.push(_getGoogleMapImage(targets.building));
        continue;
      }
      if (htmlObj.type === "chart" && htmlObj.ele === "img") {
        let themeId =
          (organization &&
            organization.reportThemeId &&
            organization.reportThemeId.toString()) ||
          "";
        if (htmlObj.layoutOption == "One Column") {
          let chartFields = htmlObj.options[0].fields;
          const tmpParsedResult = _getParsedTargetPaths(chartFields);
          chartFields = tmpParsedResult["pathsArr"];
          const {
            yearRange,
            yearOption,
            selectedStartMonth,
            selectedStartYear,
            selectedEndMonth,
            selectedEndYear,
            ...rest
          } = htmlObj.options[0].metaData;
          const parsedFields = fieldUtils.getParsedKeyValues(chartFields);
          let chartImage = await chartUtils.getChartImage({
            urlQueryString: parsedFields["param"],
            url: parsedFields["Url"],
            buildingId: building._id.toString(),
            themeId: themeId,
            monthRange: yearRange,
            yearOption,
            customDate,
            startMonth: selectedStartMonth,
            startYear: selectedStartYear,
            endMonth: selectedEndMonth,
            endYear: selectedEndYear,
            reportName: parsedFields["reportName"],
            other: rest
          });
          tmpHtmlEleArr.push(chartImage);
        } else if (htmlObj.layoutOption === "Two Columns") {
          let chartImages = [];
          for (let i = 0; i < 2; i++) {
            let chartFields = htmlObj.options[i].fields;
            if (chartFields.length == 0) {
              chartImages.push("");
              continue;
            }
            const tmpParsedResult = _getParsedTargetPaths(chartFields);
            chartFields = tmpParsedResult["pathsArr"];
            const {
              yearRange,
              yearOption,
              selectedStartMonth,
              selectedStartYear,
              selectedEndMonth,
              selectedEndYear,
              ...rest
            } = htmlObj.options[i].metaData;
            const parsedFields = fieldUtils.getParsedKeyValues(chartFields);
            let chartImage = await chartUtils.getChartImage({
              urlQueryString: parsedFields["param"],
              url: parsedFields["Url"],
              buildingId: building._id.toString(),
              themeId: themeId,
              monthRange: yearRange,
              yearOption,
              customDate,
              startMonth: selectedStartMonth,
              startYear: selectedStartYear,
              endMonth: selectedEndMonth,
              endYear: selectedEndYear,
              reportName: parsedFields["reportName"],
              other: rest
            });
            chartImage =
              (chartImage &&
                chartImage.replace('width="600"', 'width="300"')) ||
              "";
            chartImage = chartImage.replace("<p>", "");
            chartImage = chartImage.replace("</p>", "");
            chartImages.push(chartImage);
          }
          hasTwoColumnTable = true;
          if (chartImages[0] == "") {
            tmpHtmlEleArr.push(
              `<table id="twoColumn" border="0"><tr><td width="25%"></td><td width="50%">${chartImages[1]}</td><td width="25%"></td></tr></table>`
            );
          } else if (chartImages[1] == "") {
            tmpHtmlEleArr.push(
              `<table id="twoColumn" border="0"><tr><td width="25%"></td><td width="50%">${chartImages[0]}</td><td width="25%"></td></tr></table>`
            );
          } else {
            tmpHtmlEleArr.push(
              `<table id="twoColumn" border="0"><tr><td>${chartImages[0]}</td><td>${chartImages[1]}</td></tr></table>`
            );
          }
        } else if (!htmlObj.layoutOption) {
          const chartFields = tmpParsedResult["pathsArr"];
          if (chartFields) {
            console.log("chartFields", chartFields);
            const {
              yearRange,
              yearOption,
              selectedStartMonth,
              selectedStartYear,
              selectedEndMonth,
              selectedEndYear,
              ...rest
            } = htmlObj.metaData;
            const parsedFields = fieldUtils.getParsedKeyValues(chartFields);
            let chartImage = await chartUtils.getChartImage({
              urlQueryString: parsedFields["param"],
              url: parsedFields["Url"],
              buildingId: building._id.toString(),
              themeId: themeId,
              monthRange: yearRange,
              yearOption,
              customDate,
              startMonth: selectedStartMonth,
              startYear: selectedStartYear,
              endMonth: selectedEndMonth,
              endYear: selectedEndYear,
              reportName: parsedFields["reportName"],
              other: rest
            });
            tmpHtmlEleArr.push(chartImage);
          }
        }
        continue;
      }
      if (htmlObj.type === "image" && htmlObj.fields[0] === "buildingImage") {
        const image = await _getImage(
          htmlObj.content,
          htmlObj.fields,
          targets.building
        );
        tmpHtmlEleArr.push(image);
        continue;
      }

      if (htmlObj.type === "image" && htmlObj.fields[0] === "imageUpload") {
        const image = await _getImage(htmlObj.content);
        tmpHtmlEleArr.push(image);
        continue;
      }
      if (
        htmlObj.type === "divider" &&
        htmlObj.target === "divider" &&
        htmlObj.dividerConfig
      ) {
        tmpHtmlEleArr.push(_getDivider(htmlObj.dividerConfig));
        continue;
      }
      if (htmlObj.type === "table" && htmlObj.target === "endusebreakdown") {
        tmpHtmlEleArr.push({
          metadata: htmlObj.metaData,
          building,
          projectConfig: {
            format: "endUseTable",
            data: {
              fields: htmlObj.fields
            }
          }
        });
        continue;
      }
      // If no special cases, continue on
      // If matching an element, then run its special html generator function
      if (TARGETFIELDSARR.indexOf(htmlObj.ele) !== -1) {
        if (htmlObj.ele === "div") {
          if (htmlObj.target === "overview") {
            tmpHtmlEleArr.push(
              fieldUtils.getHtml({
                target: reportClient.getOverview({ building, utilities }),
                fields: htmlObj.fields,
                customLabels: htmlObj.customLabels,
                dataLabelsOption: htmlObj.dataLabels
              })
            );
          } else {
            tmpHtmlEleArr.push(
              _getKeyValuePairs(
                targets[htmlObj.target],
                htmlObj.fields,
                htmlObj.target,
                htmlObj.dataLabels,
                user,
                location,
                htmlObj.customLabels
              )
            );
          }
        } else if (htmlObj.ele === "ul" || htmlObj.ele === "ol") {
          tmpHtmlEleArr.push(
            _getList(
              targets[htmlObj.target],
              htmlObj.fields,
              htmlObj.ele,
              htmlObj.target,
              htmlObj.dataLabels,
              htmlObj.styleFormat,
              htmlObj.customLabels
            )
          );
        } else if (htmlObj.ele === "table") {
          const table = await _getTable({
            target: targets[htmlObj.target] || [],
            fields: htmlObj.fields || [],
            dataSource: htmlObj.target,
            customLabels: htmlObj.customLabels,
            schedule,
            equipmentConfig: htmlObj.equipmentConfig,
            building,
            locationSummaryBy: htmlObj.tableType,
            projectConfig,
            equipment: {
              buildingEquipment,
              equipmentCategories,
              equipmentSchemas
            },
            monthlyUtilities,
            htmlObj,
            layout: htmlObj.tableLayout,
            type: htmlObj.tableType,
            metaData: htmlObj.metaData,
            organize: htmlObj.organize,
            customDate,
            timeZone
          });
          tmpHtmlEleArr.push(table);
        }
        continue;
      }
      // Simple HeadingEle with content provided, let empty comments thru
      if (htmlObj.ele && (htmlObj.content || htmlObj.isComment)) {
        if (htmlObj.type === "title" && htmlObj.headingEle) {
          htmlObj.ele = htmlObj.headingEle;
        }
        tmpHtmlEleArr.push(
          await _getElement(htmlObj, targets, customDate, building)
        );
      }
    }

    await fillEnduseData(tmpHtmlEleArr, 0, customDate);

    // remove all special characters so it doesn't break
    template.name = template.name.replace(/[^A-Za-z0-9 ]+/g, "");

    const currentdate = new Date();
    const datetime =
      currentdate.getMonth() +
      1 +
      "_" +
      currentdate.getDate() +
      "_" +
      currentdate.getFullYear() +
      "-" +
      currentdate.getHours() +
      "_" +
      currentdate.getMinutes() +
      "_" +
      currentdate.getSeconds();
    const includeDummyImage = [
      "image_and_text",
      "image_and_pagenumber",
      "text_and_image",
      "image_center"
    ].includes(headerPosition);
    const dummyImageTag = includeDummyImage
      ? '<img width="0px" height="0px" src="https://buildee-test.s3.us-west-2.amazonaws.com/public/white-square.png">'
      : "";
    const opts = {
      docToType: reqDocTo || "docx",
      filename: template.name.replace(/\ /g, "_") + "-" + datetime,
      body:
        "<html><style>p {margin: 0px}</style><body>" +
        dummyImageTag +
        tmpHtmlEleArr.join("") +
        "</body></html>"
    };

    const tocOpts = {
      // Set Toc and page no.
      tableOfContent: tableOfContent,
      pageNumbers: pageNumbers,
      tableOfContentsDepth: tableOfContentsDepth,
      numberPosition: numberPosition,
      PageNumberDisplayOnHeader: PageNumberDisplayOnHeader,
      // set Header and footer
      headerText,
      headerPosition,
      headerImage,
      headerDivider,
      footerText,
      footerPosition,
      footerImage,
      footerDivider,
      reportStyles: user.products.reportStyles,
      format
    };
    // opts.body = escapeHtml(opts.body);
    opts.body = replaceAll(opts.body, "<%fahrenheit%>", "&#8457;");
    reportClient.getWordReport(opts, tocOpts, function(err, report) {
      if (err) {
        res.cookie("downloading", "finished", { path: "/" });
        return util.sendError("Issues generating report.", 400, req, res, next);
      }
      // if the user supplies a styled document
      if (template.styledDoc && template.styledDoc !== "") {
        report.styledDoc = template.styledDoc;
        if (
          template.attachments === undefined ||
          template.attachments.length == 0
        ) {
          report.attachments = [];
        } else {
          report.attachments = template.attachments;
        }
        report.reportStyles = user.products.reportStyles ? 1 : 0; // pass 1 = if reportstyles = true and vice-versa
        if (hasTwoColumnTable) report.reportStyles = 1;
        reportClient.getWordReportStyles(report, tocOpts, function(
          err,
          styledReport
        ) {
          if (err) {
            console.log("err", err);
            return util.sendError(
              "Issues styling report.",
              400,
              req,
              res,
              next
            );
          }
          if (tocOpts.format == "pdf" && report.attachments.length > 0) {
            reportClient.mergeWordPdf(report, tocOpts, styledReport, function(
              err,
              merged
            ) {
              if (err) {
                console.log("err", err);
                return util.sendError(
                  "Issues styling report.",
                  400,
                  req,
                  res,
                  next
                );
              }
              // Set header data for file type and filename
              res.setHeader("Content-Type", merged.contentType);
              res.setHeader(
                "Content-Disposition",
                "attachment; " +
                  "filename=" +
                  merged.filename +
                  "." +
                  merged.fileExtension
              );
              res.cookie("downloading", "finished", { path: "/" });
              return res.send(merged.buffer || "");
            });
          } else {
            // Set header data for file type and filename
            res.setHeader("Content-Type", styledReport.contentType);
            res.setHeader(
              "Content-Disposition",
              "attachment; " +
                "filename=" +
                styledReport.filename +
                "." +
                styledReport.fileExtension
            );
            res.cookie("downloading", "finished", { path: "/" });
            return res.send(styledReport.buffer || "");
          }
        });
        // just return the generated document if they don't provide a styled document
      } else {
        // Set header data for file type and filename
        res.setHeader("Content-Type", report.contentType);
        res.setHeader(
          "Content-Disposition",
          "attachment; " +
            "filename=" +
            report.filename +
            "." +
            report.fileExtension
        );
        res.cookie("downloading", "finished", { path: "/" });
        return res.send(report.buffer || "");
      }
    });
  } catch (error) {
    console.log(error);
    res.cookie("downloading", "finished", { path: "/" });
    return util.sendError(error, 400, req, res, next);
  }
};

exports.sendReportEmail = function(req, res, next) {
  const { subject, sendTo, cc, message } = req.body;
  const user = req.user;
  if (!user) {
    return util.sendError("Invalid User.", 400, req, res, next);
  }

  if (!sendTo) {
    return util.sendError("Send to email id required", 400, req, res, next);
  }

  var options = {
    to: sendTo,
    subject: subject,
    cc: cc || null,
    replyTo: [user.email],
    from: "noreply@buildee.com"
  };

  const messageObj = {
    text: message,
    html: `<div>${message}</div>`
  };

  emailClient.sendEmail(options, messageObj, function(err) {
    if (err) {
      return util.sendError(err, 400, req, res, next);
    }

    // Email success message
    res.sendResult = {
      status: "Success",
      message: "Report document emailed"
    };
    return next();
  });
};

const fillEnduseData = async (tmpHtmlEleArr, index, customDate) => {
  if (index < tmpHtmlEleArr.length) {
    let ele = tmpHtmlEleArr[index];
    if (typeof ele == "string") {
      index++;
      return fillEnduseData(tmpHtmlEleArr, index, customDate);
    }
    if (typeof ele == "object") {
      const enduseTable = await endUseUtils.getTable({
        metaData: ele.metadata,
        building: ele.building,
        projectConfig: ele.projectConfig,
        customLabels:
          (ele.projectConfig &&
            ele.projectConfig.data &&
            ele.projectConfig.data.customLabels) ||
          [],
        customDate
      });
      tmpHtmlEleArr[index] = enduseTable;
      index++;
      return fillEnduseData(tmpHtmlEleArr, index, customDate);
    }
  } else {
    return tmpHtmlEleArr;
  }
};

const _sortTable = function(array, projectConfig) {
  // Sort projects array by projectConfig settings
  const direction =
    (projectConfig && projectConfig.data && projectConfig.data.order) ||
    "ascending";
  const key =
    (projectConfig && projectConfig.data && projectConfig.data.orderBy) || "";
  array = _sort(array, direction, key);
  return array;
};

const _sort = function(array, direction, key) {
  if (!key) {
    return array;
  }
  if (array.length < 2) {
    return array;
  }
  if (key.includes(".") && key.split(".")[1]) {
    key = key.split(".")[1];
  }
  array.sort((a, b) => {
    const aKey = isNaN(a[key]) ? a[key] : Number(a[key]);
    const bKey = isNaN(b[key]) ? b[key] : Number(b[key]);

    if (direction === "ascending") return aKey > bKey ? 1 : -1;
    if (direction === "descending") return aKey < bKey ? 1 : -1;
  });
  return array;
};
