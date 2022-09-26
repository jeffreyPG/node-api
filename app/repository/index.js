const utilities = require("./utilities");
const buildings = require("./buildings");
const organizations = require("./organizations");
const monthlyutilities = require("./monthlyutilities");
const weathers = require("./weathers");
const _ = require("lodash");
const entities = _.extend(utilities, buildings, organizations, monthlyutilities, weathers);

exports.init = () => {
  for (key in entities) {
    if (entities[key].init && typeof (entities[key].init) === "function") {
      entities[key].init();
    }
  }
}

module.exports = entities;