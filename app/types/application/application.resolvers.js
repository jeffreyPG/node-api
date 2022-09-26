"use strict";

const {
  EquipmentCategorization
} = require("../equipment/equipmentCategorization.model");

const application = async (_, { value }, ctx) => {
  return EquipmentCategorization.find({ application: { value } })
    .lean()
    .exec();
};

const applications = async (_, {}, ctx) => {
  const cursor = EquipmentCategorization.aggregate([
    {
      $group: {
        _id: null,
        applications: { $addToSet: "$application" }
      }
    }
  ])
    .cursor()
    .exec();

  const { applications } = await cursor.next();
  return applications;
};

module.exports = {
  Query: {
    application,
    applications
  }
};
