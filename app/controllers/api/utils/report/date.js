const _ = require("lodash");
const moment = require("moment");

const getYearRangeDates = (metadata, customDate) => {
  if (!metadata) {
    return { start: null, end: null };
  }
  const { yearRange, yearOption } = metadata;
  if (yearOption === "SetOnExport" && customDate) {
    const { customStartDate, customEndDate } = customDate;
    return { start: customStartDate, end: customEndDate };
  }
  let start = null;
  let end = null;
  switch (yearRange) {
    case "12":
      start = moment()
        .utc()
        .subtract(12, "months")
        .startOf("month");
      end = moment()
        .utc()
        .subtract(1, "month")
        .endOf("month");
      break;
    case "24":
      start = moment()
        .utc()
        .subtract(24, "months")
        .startOf("month");
      end = moment()
        .utc()
        .subtract(1, "month")
        .endOf("month");
      break;
    case "36":
      start = moment()
        .utc()
        .subtract(36, "months")
        .startOf("month");
      end = moment()
        .utc()
        .subtract(1, "month")
        .endOf("month");
      break;
    case "Custom": {
      let customStartMonth =
        (metadata && metadata.customStartMonth) ||
        metadata.selectedStartMonth ||
        "January";
      let customEndMonth =
        (metadata && metadata.customEndMonth) ||
        metadata.selectedEndMonth ||
        "December";
      let customStartYear =
        (metadata && metadata.customStartYear) ||
        metadata.selectedStartYear ||
        "2015";
      customStartYear = Number(customStartYear) || 2015;
      let customEndYear =
        (metadata && metadata.customEndYear) ||
        metadata.selectedEndYear ||
        moment().year();
      customEndYear = Number(customEndYear) || moment().year();
      start = moment()
        .utc()
        .set({ year: customStartYear, month: customStartMonth })
        .startOf("month");
      end = moment()
        .utc()
        .set({ year: customEndYear, month: customEndMonth })
        .endOf("month");
      break;
    }
    default: {
      start = moment()
        .utc()
        .startOf("year");
      end = moment()
        .utc()
        .subtract(1, "month")
        .endOf("month");
    }
  }
  return { start, end };
};

const getFiscalYear = date => {
  const startDate = moment(date)
    .utc()
    .month(6)
    .startOf("month");
  const endDate = moment(date)
    .utc()
    .add(1, "year")
    .month(5)
    .endOf("month");
  if (
    moment(date).isSameOrAfter(startDate) &&
    moment(date).isSameOrBefore(endDate)
  ) {
    return `FY${moment(date).format("YY")}`;
  } else if (moment(date).isBefore(startDate)) {
    return `FY${moment(date)
      .subtract(1, "year")
      .format("YY")}`;
  } else {
    return null;
  }
};

const get12Year = date => {
  const startMonth = moment()
    .utc()
    .subtract(12, "months")
    .month();
  const endMonth =
    moment()
      .utc()
      .month() - 1;
  const startDate = moment(date)
    .utc()
    .month(startMonth)
    .startOf("month");
  const endDate = moment(date)
    .utc()
    .add(1, "year")
    .month(endMonth)
    .endOf("month");
  if (
    moment(date).isSameOrAfter(startDate, "month") &&
    moment(date).isSameOrBefore(endDate, "month")
  ) {
    return `${moment(startDate).format("MMM")}${moment(startDate).format(
      "YY"
    )} - ${moment(endDate).format("MMM")}${moment(endDate).format("YY")}`;
  } else if (moment(date).isBefore(startDate, "month")) {
    return `${moment(startDate).format("MMM")}${moment(startDate)
      .subtract(1, "year")
      .format("YY")} - ${moment(endDate).format("MMM")}${moment(endDate)
      .subtract(1, "year")
      .format("YY")}`;
  } else if (moment(date).isAfter(endDate, "month")) {
    return `${moment(startDate).format("MMM")}${moment(startDate)
      .add(1, "year")
      .format("YY")} - ${moment(endDate).format("MMM")}${moment(endDate)
      .add(1, "year")
      .format("YY")}`;
  } else {
    return null;
  }
};

const getMonthOrder = option => {
  switch (option) {
    case "CY":
      return [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec"
      ];
    case "FY":
      return [
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun"
      ];
    case "12": {
      const today = moment().utc();
      const startday = moment()
        .utc()
        .subtract(12, "months");
      const months = [];
      while (startday.isSameOrBefore(today)) {
        const month = startday.format("MMM");
        months.push(month);
        startday.add(1, "month");
      }
      return _.uniq(months);
    }
    default:
      return [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec"
      ];
  }
};

module.exports = { getYearRangeDates, getFiscalYear, getMonthOrder, get12Year };
