"use strict";
const mongoose = require("mongoose");
const { Equipment } = require("./equipment.model");
const { EquipmentSchema } = require("../equipment/equipmentSchema.model");
const {
  EquipmentCategorization
} = require("../equipment/equipmentCategorization.model");
const ObjectId = mongoose.Types.ObjectId;

const removeEmptyValues = input =>
  Object.entries(input).reduce((acc, [key, value]) => {
    if (value === null || value === undefined || value.length === 0) {
      return { ...acc };
    }
    return { ...acc, [key]: value };
  }, {});

const getCategorizationMatchQuery = (categorization, hideNull = false) =>
  Object.entries(categorization).reduce((acc, [key, value]) => {
    if (
      value === "default" ||
      value === null ||
      value === undefined ||
      value.length === 0
    ) {
      if (!hideNull) return { ...acc, [`${key}.value`]: null };
      return { ...acc };
    }
    // EquipmentCategorization schema is { value: "LIGHTING", displayName: "Lighting" }
    else return { ...acc, [`${key}.value`]: value };
  }, {});

const sortCategorization = categorizationArray =>
  categorizationArray
    .filter(({ value }) => value !== null)
    .sort((a, b) => {
      if (a.displayName < b.displayName) {
        return -1;
      }
      if (a.displayName > b.displayName) {
        return 1;
      }
      return 0;
    });

const equipment = (_, args, ctx) => {
  return Equipment.findById(args.id)
    .lean()
    .exec();
};

const organizationEquipment = (_, args, ctx) => {
  return Equipment.find({
    organization: args.organization
  })
    .lean()
    .exec();
};

const addEquipment = async (_, { equipment = {} }, ctx) => {
  const fieldsArray = Object.entries(equipment.fields).map(
    ([fieldName, { displayName, value = null, display }]) => ({
      name: fieldName,
      displayName,
      value,
      display
    })
  );
  let result = await Equipment.create({ ...equipment, fieldsArray });
  return result;
};

const equipments = (_, args, ctx) => {
  return Equipment.find({})
    .lean()
    .exec();
};

const equipmentCategorization = async (_, { categorization = {} }, ctx) => {
  const match = getCategorizationMatchQuery(categorization, true);
  console.log("match", match) || {};
  const results = await EquipmentCategorization.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        categories: { $addToSet: "$category" },
        applications: { $addToSet: "$application" },
        technologies: { $addToSet: "$technology" }
      }
    }
  ]);

  const categorizations = results && results.length === 1 ? results[0] : {};

  const {
    categories = [],
    applications = [],
    technologies = []
  } = categorizations;

  return {
    categories: sortCategorization(categories),
    applications: sortCategorization(applications),
    technologies: sortCategorization(technologies)
  };
};

const equipmentSchema = async (_, { schema }, ctx) => {
  const match = getCategorizationMatchQuery(schema, false);
  if (Object.keys(match).length === 0) return null;
  const categorization = await EquipmentCategorization.findOne(match);
  if (!categorization) return null;
  const { type } = categorization;
  return EquipmentSchema.findOne({ type: type.value })
    .lean()
    .exec();
};

const searchEquipment = async (_, { equipment = {}, search = {} }, ctx) => {
  const { page, size, value } = Object.assign({ size: 100, page: 1 }, search);
  const match = removeEmptyValues(equipment);

  const orgCheck = match.organization
    ? {
        $or: [
          { organization: { $exists: false } },
          { organization: ObjectId(match.organization) }
        ]
      }
    : { organization: { $exists: false } };

  const hiddenCheck = { hide: { $ne: true } };
  const skipCheck = page > 1 ? { $skip: (page - 1) * size } : null;
  delete match.organization;
  let searchQuery = value;
  if (value && value !== "") {
    searchQuery = value.split(" ").reduce((agg, keyword) => {
      if (keyword != "") {
        agg += `\"${keyword}\"`;
      }
      return agg;
    }, "");
  }
  let searchResults;
  try {
    const aggregateQuery = [
      {
        $match: {
          ...orgCheck,
          ...match,
          ...hiddenCheck,
          $text: { $search: searchQuery }
        }
      },
      { $sort: { useCount: -1 } }
    ];
    if (skipCheck) {
      aggregateQuery.push(skipCheck);
    }
    aggregateQuery.push({ $limit: size });
    searchResults = await Equipment.aggregate(aggregateQuery);
  } catch (err) {
    console.error("Search Beta failed");
    console.error(err);
    searchResults = await Equipment.find({
      $text: { $search: searchQuery },
      ...orgCheck,
      ...match,
      ...hiddenCheck
    })
      .sort({ useCount: -1 })
      .skip((page - 1) * size)
      .limit(size)
      .lean();
  }
  let categorizationResult;
  if (value && value !== "") {
    try {
      const categorizationSearchRegex = new RegExp(`^${value}$`, "i");
      categorizationResult = await EquipmentCategorization.find({
        $or: [
          {
            "category.displayName": categorizationSearchRegex
          },
          {
            "application.displayName": categorizationSearchRegex
          },
          {
            "technology.displayName": categorizationSearchRegex
          }
        ]
      }).sort({
        "category.displayName": 1,
        "application.displayName": 1,
        "technology.displayName": 1
      });
    } catch (e) {
      categorizationResult = [];
    }
  }

  return {
    equipments: searchResults,
    categorizations: categorizationResult
  };
};

const updateEquipment = async (_, { equipment }, ctx) => {
  let result = await Equipment.findByIdAndUpdate(equipment._id, equipment, {
    new: true
  })
    .lean()
    .exec();
  return result;
};

const removeEquipment = async (_, { equipment: { _id } }, ctx) => {
  let result = await Equipment.findByIdAndRemove(_id)
    .lean()
    .exec();
  return result;
};

module.exports = {
  ProductFuel: {
    GASEOUS_PROPANE_DEPRECATED: "GASEOUS PROPANE",
    FUEL_OIL_NUMBER_5_DEPRECATED_V1: "FUEL OIL #5 (LIGHT)",
    FUEL_OIL_NUMBER_5_DEPRECATED_V2: "FUEL_OIL_NUMBER_FIVE",
    LIQUID_PROPANE_DEPRECATED: "LIQUID PROPANE",
    N_A_DEPRECATED: "N/A",
    NATURAL_GAS_DEPRECATED: "NATURAL GAS",
    NONE: ""
  },
  Query: {
    equipment,
    equipments,
    searchEquipment,
    equipmentCategorization,
    equipmentSchema,
    organizationEquipment
  },
  Mutation: {
    addEquipment,
    updateEquipment,
    removeEquipment
  }
};
