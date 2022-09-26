"use strict";

/**
 * Module dependencies.
 */
const mongoose = require("mongoose");
const util = require("./utils/api.utils");

const EquipmentCategorization = mongoose.model("EquipmentCategorization");
const MeasureCategorization = mongoose.model("MeasureCategorization");

const getCategorizations = async (req, res, next) => {
  try {
    let [equipmentCategorizations, measureCategorizations] = await Promise.all([EquipmentCategorization.find()
      .lean()
      .exec(),
      MeasureCategorization.find()
      .lean()
      .exec()
    ])
    measureCategorizations = measureCategorizations.map(item => ({
      ...item,
      category: {
        displayName: item.category.displayName,
        value: item.category.displayName
      },
      application: {
        displayName: item.application.displayName,
        value: item.application.displayName
      },
      technology: {
        displayName: item.technology.displayName,
        value: item.technology.displayName
      }
    }))
    res.sendResult = {
      status: "Success",
      message: "Get Proposals",
      categorizations: {
        equipment: equipmentCategorizations,
        measure: measureCategorizations
      }
    };
    return next();
  } catch (err) {
    return util.sendError(
      "Issues loading categorizations",
      500,
      req,
      res,
      next
    );
  }
};

module.exports = {
  getCategorizations,
};
