const moment = require("moment");

/**
 * Returns array of start and end dates for every year in the given range
 * @param {String | Date Object} startDate 
 * @param {String | Date Object} endDate 
 */
const getYearlyStartAndEndDates = (startDate = null, endDate = null) => {
    try {
        const initialStartDate = startDate && moment(startDate) || moment().utc().startOf("year");
        const initialEndDate = endDate && moment(endDate) || moment().utc().endOf("year");
        const resultArray = [];
        while (initialStartDate.isSameOrBefore(initialEndDate, "year")) {
            const resultObject = {
                start: null, end: null
            };
            resultObject.start = initialStartDate.toISOString();
            let end = moment(initialStartDate).utc().endOf("year");
            if (end.isSame(initialEndDate, "year")) end = initialEndDate;
            resultObject.end = end.toISOString();
            if (!initialStartDate.isSame(end, "day")) resultArray.push(resultObject);
            initialStartDate.add(1, "year").utc().startOf("year");
        }
        return resultArray;
    } catch (error) {
        console.error(error);
        return new Error(error);
    }
};

/**
 * Returns the dateRange as a String formatted <YYYY MMM-MMM>
 * @param {String | Date Object} start 
 * @param {String | Date Object} end 
 */
const getYearRange = (start, end) => {
    return moment(start).get("year").toString() + " " + moment(start).format("MMM").toString() + "-" + moment(end).format("MMM").toString()
};

module.exports = {
    getYearlyStartAndEndDates,
    getYearRange
}