const moment = require("moment");
const _ = require("lodash");
const mongoose = require("mongoose");
const Chart = mongoose.model("Chart");
const queryString = require("querystring");

const displayNameRegex = new RegExp(/last (\d+) months/i);
const monthRangeCustomRegex = new RegExp(/custom/i);

const getRelativeChartURL = requestUrl => {
  const url = new URL(requestUrl);
  if (process.env.TABLEAU_IP) {
    url.hostname = process.env.TABLEAU_IP;
  }
  return url.toString();
};

const getChartImage = async ({
  url,
  urlQueryString,
  buildingId,
  themeId,
  monthRange,
  yearOption,
  customDate,
  startMonth,
  startYear,
  endMonth,
  endYear,
  reportName,
  other
}) => {
  let host = url.split("?")[0];
  const params = queryString.parse(urlQueryString, ",");
  params.vf_building_id = buildingId;
  let chart = await Chart.findOne({ reportName: reportName });
  if (yearOption === "SetOnExport" && customDate) {
    const { customStartDate, customEndDate } = customDate;
    params.vf_start_month = customStartDate.month() + 1;
    params.vf_start_year = customStartDate.year();
    params.vf_end_month = customEndDate.month() + 1;
    params.vf_end_year = customEndDate.year();
    let urls = chart.urls || [];
    let key = "Custom";
    let monthdiff = customEndDate
      .clone()
      .add(1, "days")
      .diff(customStartDate, "month");
    if (customEndDate.diff(moment(), "month") === 0) {
      if (monthdiff === 12) key = "Last 12 months";
      else if (monthdiff === 24) key = "Last 24 months";
      else if (monthdiff === 36) key = "Last 36 months";
    }
    let customURL = _.find(urls, { key: key });
    if (customURL) {
      host = customURL.value.split("?")[0];
    }
    params.vf_months = monthdiff;
  } else if (monthRangeCustomRegex.test(monthRange)) {
    params.vf_start_month = getMonthAsNumber(startMonth);
    params.vf_start_year = startYear;
    params.vf_end_month = getMonthAsNumber(endMonth);
    params.vf_end_year = endYear;
  } else {
    params.vf_months = getMonths({
      monthRange,
      startMonth,
      startYear,
      endMonth,
      endYear
    });
  }
  if (themeId) params.vf_color = themeId;
  else params.vf_color = "";

  params.refresh = true;

  if (
    params.vf_format_type &&
    chart.chartTypes &&
    chart.chartTypes[params.vf_format_type]
  ) {
    host = host.replace(
      /^(.*)\/views\/(.*)\/(.*)$/gm,
      `$1/views/${chart.chartTypes[params.vf_format_type]}/$3`
    );
  }
  const timestamp = new Date().getTime();
  const chartUrl = getRelativeChartURL(
    `${host}?${queryString.stringify(params)}&vf_time=${timestamp}`
  );
  console.log("CHART URL", chartUrl);
  const imgSrc = `http://localhost/api/charts?url=${chartUrl}`;
  return `<p><img src="${imgSrc}" width="600" alt="chartImg"/></p>`;
};

const getMonths = ({
  monthRange,
  startMonth,
  startYear,
  endMonth,
  endYear
}) => {
  const startDate = getStartDate({
    monthRange,
    month: startMonth,
    year: startYear
  });
  const endDate = getEndDate({ monthRange, month: endMonth, year: endYear });

  return endDate.diff(startDate, "months");
};

const getStartDate = ({ monthRange, month, year }) => {
  let startDate = moment();

  if (monthRange === "Custom") {
    startDate
      .month(month)
      .year(year)
      .startOf("month");
  } else if (displayNameRegex.test(monthRange)) {
    const match = displayNameRegex.exec(monthRange);
    startDate.subtract(match[1], "months").startOf("month");
  } else {
    startDate.subtract(monthRange, "months").startOf("month");
  }
  return startDate;
};

const getEndDate = ({ monthRange, month, year }) => {
  let endDate = moment();

  if (monthRange === "Custom") {
    endDate
      .month(month)
      .year(year)
      .endOf("month");
  } else {
    endDate.endOf("month");
  }
  return endDate;
};

const getMonthAsNumber = monthName =>
  moment()
    .month(monthName)
    .month() + 1;

module.exports = {
  getChartImage,
  getStartDate,
  getEndDate,
  getMonths
};
