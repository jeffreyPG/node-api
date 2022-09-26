const path = require("path");
const fs = require("fs");
const { promisify } = require("util");
const {
  extendType,
  objectType,
  arg,
  idArg,
  inputObjectType,
  enumType,
  scalarType,
  makeSchema
} = require("nexus");

const features = require("../../../config/features/index.json");
const { EquipmentSchema } = require("./equipmentSchema.model");
const { EquipmentCategorization } = require("./equipmentCategorization.model");

let EquipmentTechnology;
let ProductApplication;
let ProductCategory;

const Equipment = objectType({
  name: "Equipment",
  definition (t) {
    t.id("_id");
    t.field("application", {
      type: ProductApplication,
      nullable: true
    });
    t.field("category", {
      type: ProductCategory,
      nullable: true
    });
    t.string("description", { nullable: true });
    t.string("name", { nullable: true });
    t.id("organizationId", { nullable: true });
    t.field("technology", {
      type: EquipmentTechnology,
      nullable: true
    });
    t.string("type", { nullable: true });
    t.field("fuel", {
      type: ProductFuel,
      nullable: true
    });
  }
});
const EquipmentCategorizationType = objectType({
  name: "EquipmentCategorization",
  definition (t) {
    t.field("applications", {
      type: EquipmentCategorizationField,
      list: [false],
      nullable: true
    });
    t.field("categories", {
      type: EquipmentCategorizationField,
      list: [false],
      nullable: true
    });
    t.field("technologies", {
      type: EquipmentCategorizationField,
      list: [false],
      nullable: true
    });
    t.field("types", {
      type: EquipmentCategorizationField,
      list: [false],
      nullable: true
    });
  }
});
const EquipmentCategorizationField = objectType({
  name: "EquipmentCategorizationField",
  definition (t) {
    t.string("value", { nullable: true });
    t.string("displayName", { nullable: true });
  }
});
const EquipmentConfig = objectType({
  name: "EquipmentConfig",
  definition (t) {
    t.string("field", {
      deprecation: "Use `fieldName`.",
      nullable: true
    });
    t.string("fieldName", { nullable: true });
    t.string("fieldDisplayName", {
      deprecation: "Use `displayName`.",
      nullable: true
    });
    t.string("displayName");
    t.string("type", { nullable: true });
    t.string("values", {
      list: [false],
      nullable: true
    });
  }
});
const EquipmentField = objectType({
  name: "EquipmentField",
  definition (t) {
    t.string("name");
    t.string("displayName", { nullable: true });
    t.boolean("display", { nullable: true });
    t.string("value", { nullable: true });
  }
});
const EquipmentFieldFloat = objectType({
  name: "EquipmentFieldFloat",
  definition (t) {
    t.string("name");
    t.string("displayName", { nullable: true });
    t.boolean("display", { nullable: true });
    t.float("value", { nullable: true });
  }
});
const EquipmentFieldInt = objectType({
  name: "EquipmentFieldInt",
  definition (t) {
    t.string("name");
    t.string("displayName", { nullable: true });
    t.boolean("display", { nullable: true });
    t.int("value", { nullable: true });
  }
});
const EquipmentFieldString = objectType({
  name: "EquipmentFieldString",
  definition (t) {
    t.string("name");
    t.string("displayName", { nullable: true });
    t.boolean("display", { nullable: true });
    t.string("value", { nullable: true });
  }
});
const EquipmentSchemaType = objectType({
  name: "EquipmentSchema",
  definition (t) {
    t.field("application", {
      type: ProductApplication,
      nullable: true
    });
    t.field("category", {
      type: ProductCategory,
      nullable: true
    });
    t.field("configs", {
      type: EquipmentSchemaConfiguration,
      list: [false],
      nullable: true
    });
    t.field("fields", {
      type: EquipmentSchemaField,
      list: [false],
      nullable: true
    });
    t.field("technology", {
      type: EquipmentTechnology,
      nullable: true
    });
    t.string("type", { nullable: true });
  }
});
const EquipmentSchemaConfiguration = objectType({
  name: "EquipmentSchemaConfiguration",
  definition (t) {
    t.string("field");
    t.string("fieldDisplayName");
    t.boolean("display", { nullable: true });
    t.string("type");
    t.string("units", { nullable: true });
    t.string("values", {
      list: [false],
      nullable: true
    });
  }
});
const EquipmentSchemaField = objectType({
  name: "EquipmentSchemaField",
  definition (t) {
    t.string("field");
    t.string("fieldDisplayName");
    t.boolean("display", { nullable: true });
    t.string("type");
    t.string("units", { nullable: true });
    t.string("values", {
      list: [false],
      nullable: true
    });
  }
});
const Mutation = objectType({
  name: "Mutation",
  definition (t) {
    t.field("updateEquipment", {
      type: Equipment,
      args: {
        equipment: arg({
          type: UpdateEquipmentInput,
          required: true
        })
      }
    });
    t.field("removeEquipment", {
      type: Equipment,
      args: {
        equipment: arg({
          type: RemoveEquipmentInput,
          required: true
        })
      }
    });
  }
});
const Query = objectType({
  name: "Query",
  definition (t) {
    t.field("equipments", {
      type: Equipment,
      list: [false]
    });
    t.field("equipment", {
      type: Equipment,
      args: {
        id: idArg({ required: true })
      }
    });
    t.field("equipmentCategorization", {
      type: EquipmentCategorizationType,
      nullable: true,
      args: {
        categorization: arg({ type: EquipmentCategorizationInput })
      }
    });
    t.field("equipmentSchema", {
      type: EquipmentSchemaType,
      nullable: true,
      args: {
        schema: arg({ type: EquipmentSchemaInput })
      }
    });
    t.field("searchEquipment", {
      type: Equipment,
      list: [false],
      nullable: true,
      args: {
        equipment: arg({ type: SearchEquipmentInput }),
        search: arg({ type: SearchInput })
      }
    });
  }
});
const SearchInput = inputObjectType({
  name: "SearchInput",
  definition (t) {
    t.int("page", { nullable: true });
    t.int("size", { nullable: true });
    t.string("value", { nullable: true });
  }
});

const EquipmentCategorizationInput = inputObjectType({
  name: "EquipmentCategorizationInput",
  definition (t) {
    t.string("application");
    t.string("category");
    t.string("technology");
  }
});
const EquipmentConfigInput = inputObjectType({
  name: "EquipmentConfigInput",
  definition (t) {
    t.string("field");
    t.string("fieldName");
    t.string("fieldDisplayName");
    t.string("displayName", { required: true });
    t.string("type");
    t.string("values", { list: [false] });
  }
});
const EquipmentFieldFloatInput = inputObjectType({
  name: "EquipmentFieldFloatInput",
  definition (t) {
    t.string("name");
    t.string("displayName");
    t.boolean("display");
    t.float("value");
  }
});
const EquipmentFieldIntInput = inputObjectType({
  name: "EquipmentFieldIntInput",
  definition (t) {
    t.string("name");
    t.string("displayName");
    t.boolean("display");
    t.int("value");
  }
});
const EquipmentFieldStringInput = inputObjectType({
  name: "EquipmentFieldStringInput",
  definition (t) {
    t.string("name");
    t.string("displayName");
    t.boolean("display");
    t.string("value");
  }
});
const EquipmentSchemaInput = inputObjectType({
  name: "EquipmentSchemaInput",
  definition (t) {
    t.string("application");
    t.string("category");
    t.string("technology");
    t.string("type");
  }
});
const RemoveEquipmentInput = inputObjectType({
  name: "RemoveEquipmentInput",
  definition (t) {
    t.id("_id", { required: true });
  }
});
const SearchEquipmentInput = inputObjectType({
  name: "SearchEquipmentInput",
  definition (t) {
    t.id("_id");
    t.string("name");
    t.string("category");
    t.string("application");
    t.string("technology");
    t.id("organization");
  }
});
const UpdateEquipmentInput = inputObjectType({
  name: "UpdateEquipmentInput",
  definition (t) {
    t.id("_id", { required: true });
    t.string("name");
  }
});

const ProductFuel = enumType({
  name: "ProductFuel",
  members: [
    "ELECTRIC",
    "FUEL_OIL_NUMBER_TWO",
    "FUEL_OIL_NUMBER_4",
    "FUEL_OIL_NUMBER_FIVE",
    "FUEL_OIL_NUMBER_5",
    "FUEL_OIL_NUMBER_5_DEPRECATED_V1",
    "FUEL_OIL_NUMBER_5_DEPRECATED_V2",
    "FUEL_OIL_NUMBER_FIVE_AND_SIX",
    "FUEL_OIL_NUMBER_6",
    "GAS",
    "GASEOUS_PROPANE",
    "GASEOUS_PROPANE_DEPRECATED",
    "LIQUID_PROPANE",
    "LIQUID_PROPANE_DEPRECATED",
    "NA",
    "N_A_DEPRECATED",
    "NATURAL_GAS",
    "NATURAL_GAS_DEPRECATED",
    "NONE",
    "OIL",
    "OTHER",
    "WATER"
  ]
});

const readFileAsync = promisify(fs.readFile);

const equipmentFieldType = type => {
  switch (type) {
    case "string":
      return EquipmentFieldString;
    case "float":
      return EquipmentFieldFloat;
    case "integer":
      return EquipmentFieldInt;
    default:
      return EquipmentFieldString;
  }
};
const equipmentFieldInputType = type => {
  switch (type) {
    case "string":
      return EquipmentFieldStringInput;
    case "float":
      return EquipmentFieldFloatInput;
    case "integer":
      return EquipmentFieldIntInput;
    default:
      return EquipmentFieldStringInput;
  }
};

const schema = async () => {
  if (features.makeSchemas === false || !features.makeSchemas) {
    return readFileAsync(path.join(__dirname, "./generated/schema.gql"), {
      encoding: "utf-8"
    });
  }

  const fields = await EquipmentSchema.aggregate([
    { $unwind: "$fields" },
    { $group: { _id: { field: "$fields.field", type: "$fields.type" } } },
    { $project: { field: "$_id.field", type: "$_id.type" } },
    { $sort: { field: 1 } }
  ]);

  const deprecatedFields = [{ field: "heaterType", type: "string" }];

  const EquipmentFields = objectType({
    name: "EquipmentFields",
    definition (t) {
      fields.forEach(({ field, type }) =>
        t.field(field, {
          type: equipmentFieldType(type),
          nullable: true
        })
      );
      deprecatedFields.forEach(({ field, type }) =>
        t.field(field, {
          type: equipmentFieldType(type),
          nullable: true,
          deprecation: "This field has been removed."
        })
      );
    }
  });

  const EquipmentFieldsInput = inputObjectType({
    name: "EquipmentFieldsInput",
    definition (t) {
      fields.forEach(({ field, type }) =>
        t.field(field, {
          type: equipmentFieldInputType(type),
          nullable: true
        })
      );
      deprecatedFields.forEach(({ field, type }) =>
        t.field(field, {
          type: equipmentFieldInputType(type),
          nullable: true,
          deprecation: "This input field has been removed."
        })
      );
    }
  });

  const EquipmentWithFields = extendType({
    type: "Equipment",
    definition: t => {
      t.field("fields", {
        type: EquipmentFields,
        nullable: true
      });
    }
  });

  const categories = await EquipmentCategorization.aggregate([
    { $unwind: "$category" },
    {
      $group: {
        _id: {
          description: "$category.displayName",
          name: "$category.value",
          value: "$category.value"
        }
      }
    },
    {
      $project: {
        description: "$_id.description",
        name: "$_id.name",
        value: "$_id.value"
      }
    },
    { $sort: { value: 1 } }
  ]);

  const deprecatedCategories = [
    {
      description: "Envelope",
      name: "ENVELOPE",
      value: "ENVELOPE"
    }
  ];

  ProductCategory = enumType({
    name: "ProductCategory",
    members: categories
      .map(({ description, name, value }) => ({
        description,
        name,
        value
      }))
      .filter(({ value }) => value !== null)
      .concat(
        deprecatedCategories.map(deprecated => ({
          ...deprecated,
          deprecation: "This category has been removed"
        }))
      )
  });

  const applications = await EquipmentCategorization.aggregate([
    { $unwind: "$application" },
    {
      $group: {
        _id: {
          description: "$application.displayName",
          name: "$application.value",
          value: "$application.value"
        }
      }
    },
    {
      $project: {
        description: "$_id.description",
        name: "$_id.name",
        value: "$_id.value"
      }
    },
    { $sort: { value: 1 } }
  ]);

  const deprecatedApplications = [
    {
      description: "Hot Water Heater",
      name: "HOT_WATER_HEATER",
      value: "HOT_WATER_HEATER"
    }
  ];

  ProductApplication = enumType({
    name: "ProductApplication",
    members: applications
      .filter(({ value }) => value !== null)
      .map(({ description, name, value }) => ({
        description,
        name,
        value
      }))
      .concat(
        deprecatedApplications.map(deprecated => ({
          ...deprecated,
          deprecation: "This application has been removed"
        }))
      )
  });

  const technologies = await EquipmentCategorization.aggregate([
    { $unwind: "$technology" },
    {
      $group: {
        _id: {
          description: "$technology.displayName",
          name: "$technology.value",
          value: "$technology.value"
        }
      }
    },
    {
      $project: {
        description: "$_id.description",
        name: "$_id.name",
        value: "$_id.value"
      }
    },
    { $sort: { value: 1 } }
  ]);

  const deprecatedTechnologies = [
    {
      description: "Other",
      name: "OTHER",
      value: "OTHER"
    },
    {
      description: "Insulation",
      name: "INSULATION",
      value: "INSULATION"
    },
    {
      description: "Variable Refrigerant Flow (VRF)",
      name: "VARIABLE_REFRIGERANT_FLOW",
      values: "VARIABLE_REFRIGERANT_FLOW"
    }
  ];

  EquipmentTechnology = enumType({
    name: "EquipmentTechnology",
    members: technologies
      .concat(deprecatedTechnologies)
      .filter(({ value }) => value !== null)
      .map(({ description, name, value }) => ({
        description,
        name,
        value
      }))
      .concat(
        deprecatedTechnologies.map(deprecated => ({
          ...deprecated,
          deprecation: "This technology has been removed"
        }))
      )
  });

  const CreateEquipmentInput = inputObjectType({
    name: "CreateEquipmentInput",
    definition (t) {
      t.field("application", { type: ProductApplication });
      t.field("category", { type: ProductCategory });
      t.field("fields", { type: EquipmentFieldsInput });
      t.string("name");
      t.id("organization", { required: true });
      t.field("technology", { type: EquipmentTechnology });
      t.field("fuel", { type: ProductFuel });
      t.string("type");
    }
  });

  const MutationWithAdd = extendType({
    type: "Mutation",
    definition (t) {
      t.field("addEquipment", {
        type: Equipment,
        args: {
          equipment: arg({
            type: CreateEquipmentInput,
            required: true
          })
        }
      });
    }
  });

  makeSchema({
    types: [
      Query,
      Mutation,
      MutationWithAdd,
      Equipment,
      EquipmentWithFields,
      EquipmentSchemaType,
      EquipmentSchemaInput,
      EquipmentCategorizationType,
      EquipmentCategorizationInput,
      EquipmentCategorizationField,
      EquipmentFields,
      EquipmentFieldsInput,
      EquipmentFieldString,
      EquipmentFieldStringInput,
      EquipmentFieldFloat,
      EquipmentFieldFloatInput,
      EquipmentFieldInt,
      SearchEquipmentInput,
      SearchInput,
      EquipmentFieldIntInput,
      ProductApplication,
      ProductCategory,
      EquipmentTechnology,
      ProductFuel,
      EquipmentSchemaConfiguration,
      EquipmentSchemaField,
      CreateEquipmentInput,
      UpdateEquipmentInput,
      RemoveEquipmentInput
    ],
    outputs: {
      schema: __dirname + "/generated/schema.gql",
      typegen: __dirname + "/generated/typings.ts"
    },
    shouldGenerateArtifacts: true
  });

  return readFileAsync(path.join(__dirname, "./generated/schema.gql"), {
    encoding: "utf-8"
  });
};

module.exports = { schema };
