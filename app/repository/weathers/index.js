
const noSQL = require("./weathers.mongo");
const _ = require("lodash");
exports.weathers = _.extend(noSQL);