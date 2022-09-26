const service = require("./weather.service");
const mongoose = require("mongoose");
const Organization = mongoose.model("Organization");
const _ = require("lodash");
const util = require("../controllers/api/utils/api.utils");

exports.generateWeather = async (req, res, next) => {
  try {
    let options = req.body;
    if (
      _.isEmpty(options?.organizationIds || []) &&
      _.isEmpty(options?.buildingIds || [])
    ) {
      const allOrganizations = await Organization.find()
        .lean()
        .exec();
      options.organizationIds = allOrganizations.map(org => org._id.toString());
    }
    service.generate(options);
    res.setHeader("Content-Type", "application/json");
    res.sendResult = {
      status: "Success",
      message: "Started weather script"
    };
    return next();
  } catch (error) {
    console.log("error", error);
    return util.sendError(error, 500, req, res, next);
  }
};
