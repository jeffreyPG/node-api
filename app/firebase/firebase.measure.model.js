"use strict";

var baseFieldMapper = require("./firebase.csvbase.model").csvMap;

var csvMeasure = {
  fieldCount: baseFieldMapper.fieldCount,
  setFields: [
    { fbPath: "measure.ecm.description", value: "custom" },
    { fbPath: "measure.ecm.name", value: "custom" },
    { fbPath: "measure.ecm.attachedTo", value: [
        "building", "levels", "spaces", "constructions", "lightfixtures", "windows", "doors", "plugloads",
        "processloads", "occupants", "waterfixtures", "zones", "terminals", "coolingtowers", "fans", "pumps",
        "customsystemsair", "customsystemshw", "customsystemschw", "coolingcoils", "heatingcoils", "evapcoolers",
        "outdoorairintakes", "chillers", "boilers", "cw", "chw", "dhws", "hw", "packagedunits", "swh", "mvt",
        "mvsb", "mvs", "lvt", "lvsb", "lvp"
      ]
    }
  ]
};

module.exports = { csvMap: csvMeasure };
