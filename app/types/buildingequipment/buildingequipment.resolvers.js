"use strict";

const mongoose = require("mongoose");
const { Building } = require("../../models/building.server.model");
const { BuildingSchema } = require("../equipment/equipmentSchema.model");
const { BuildingEquipment } = require("./buildingequipment.model");
const { Equipment } = require("../equipment/equipment.model");
const { ImageSync } = require("./imagesync.model");
const Organization = mongoose.model("Organization");
const { Location } = require("../../models/location.server.model");
const { Project } = require("../../models/project.server.model");
const { Schedule } = require("../../models/operations.server.model");
const salesforce = require("../../salesforce/salesforce.equipment");
const { PARTITION_KEYS } = require("../../../config/realm");

const addBuildingEquipment = async (_, { input }, ctx) => {
  try {
    const { user } = ctx;
    let result = await BuildingEquipment.create({
      building: input.buildingId,
      libraryEquipment: input.libraryEquipmentId,
      quantity: input.quantity,
      comments: input.comments,
      images: input.images,
      location: input.location,
      projects: input.projects,
      configs: input.configs,
      operations: input.operations,
      operation: input.operation,
      createdByUserId: user._id
    });
    let operationId = input.operation.id;
    let originalBuilding = await Building.findById(input.buildingId);
    let operations = (originalBuilding && originalBuilding.operations) || [];
    let operationIndex = operations.findIndex(
      operation => operation._id.toString() === operationId
    );
    if (operationIndex !== -1) {
      let originalEquipmentIds =
        (operations[operationIndex] &&
          operations[operationIndex].equipmentIds) ||
        [];
      originalEquipmentIds = originalEquipmentIds.map(id => id.toString());
      originalEquipmentIds.push(result._id.toString());
      originalEquipmentIds = [...new Set(originalEquipmentIds)];
      operations[operationIndex].equipmentIds = originalEquipmentIds;
      originalBuilding.operations = operations;
      originalBuilding.markModified("operations");
      await originalBuilding.save();
    }

    Organization.findOne({ buildingIds: result.building }, function(err, org) {
      // For SalesForce
      if (err) {
        console.error(
          "Failed to update salesforce with new project",
          result._id
        );
        return;
      }

      try {
        salesforce.updateEquipment([result], org);
      } catch (err) {
        console.error("SalesForce was not updated:", err);
      }
    });
    Equipment.findByIdAndUpdate(input.libraryEquipmentId, {
      $inc: { useCount: 1 }
    });
    return result;
  } catch (error) {
    console.log("error", error);
    return error;
  }
};

const buildingEquipment = (_, { buildingId }, ctx) => {
  return BuildingEquipment.aggregate([
    {
      $match: {
        building: mongoose.Types.ObjectId(buildingId),
        isArchived: { $in: [null, false] }
      }
    },
    {
      $lookup: {
        from: "users",
        localField: "createdByUserId",
        foreignField: "_id",
        as: "createdByUser"
      }
    },
    {
      $unwind: {
        path: "$createdByUser",
        preserveNullAndEmptyArrays: true
      }
    }
  ]).exec();
};

const recentBuildingEquipment = async (
  _,
  { buildingId, recentEquipment = {} },
  ctx
) => {
  const match = Object.entries(recentEquipment).reduce((acc, [key, value]) => {
    if (value === null || value === undefined || value.length === 0) {
      return { ...acc };
    }
    return { ...acc, [key]: value };
  }, {});

  const results = await BuildingEquipment.aggregate([
    {
      $match: {
        building: mongoose.Types.ObjectId(buildingId),
        isArchived: { $in: [null, false] }
      }
    }
  ])
    .sort({ updatedAt: -1 })
    .lookup({
      from: "equipment",
      localField: "libraryEquipment",
      foreignField: "_id",
      as: "libraryEquipmentDocs"
    })
    .unwind("$libraryEquipmentDocs")
    .replaceRoot("$libraryEquipmentDocs")
    .match(match)
    .limit(10)
    .exec();

  return results;
};

const copyBuildingEquipment = async (_, { input }, ctx) => {
  let buildingEquipmentToCopy = await BuildingEquipment.findById(
    input._id
  ).select(
    "building quantity libraryEquipment location configs salesforce operation"
  );
  buildingEquipmentToCopy._id = mongoose.Types.ObjectId();
  buildingEquipmentToCopy.isNew = true;
  buildingEquipmentToCopy.salesforce.connectedObjects = [];
  try {
    let result = await buildingEquipmentToCopy.save();
    let operationId =
      buildingEquipmentToCopy.operation && buildingEquipmentToCopy.operation.id;
    if (operationId) {
      let originalBuilding = await Building.findById(
        buildingEquipmentToCopy.building
      );
      let operations = (originalBuilding && originalBuilding.operations) || [];
      let operationIndex = operations.findIndex(
        operation => operation._id.toString() === operationId
      );
      if (operationIndex !== -1) {
        let originalEquipmentIds =
          (operations[operationIndex] &&
            operations[operationIndex].equipmentIds) ||
          [];
        originalEquipmentIds = originalEquipmentIds.map(id => id.toString());
        originalEquipmentIds.push(result._id.toString());
        originalEquipmentIds = [...new Set(originalEquipmentIds)];
        operations[operationIndex].equipmentIds = originalEquipmentIds;
        originalBuilding.operations = operations;
        originalBuilding.markModified("operations");
        await originalBuilding.save();
      }
    }

    Organization.findOne({ buildingIds: result.building }, function(err, org) {
      // For SalesForce
      if (err) {
        console.error(
          "Failed to update salesforce with new project",
          result._id
        );
        return;
      }

      try {
        salesforce.updateEquipment([result], org);
      } catch (err) {
        console.error("SalesForce was not updated:", err);
      }
    });
    return result;
  } catch (error) {
    console.log("error", error);
    return error;
  }
};

const building = ({ building }, args, ctx) => {
  return Building.findById(building);
};

const libraryEquipment = ({ libraryEquipment }, args, ctx) => {
  return Equipment.findById(libraryEquipment);
};

const location = ({ location }, args, ctx) => {
  return Location.findById(location);
};

const operations = ({ operations }, args, ctx) => {
  return Schedule.find({ _id: { $in: operations } });
};

const projects = ({ projects }, args, ctx) => {
  return Project.find({ _id: { $in: projects } });
};

const updateBuildingLocations = async input => {
  try {
    const {
      buildingId,
      equipmentId,
      mode = "remove",
      newLocationId = "",
      oldLocationId = ""
    } = input;
    const building = await Building.findById(buildingId)
      .lean()
      .exec();
    let locations = [...building.locations] || [];
    let newLocations = [];
    for (let location of locations) {
      let equipment = location.equipment || [];
      if (mode === "remove") {
        equipment = [
          ...equipment.filter(
            item => item.toString() !== equipmentId.toString()
          )
        ];
      } else {
        let currentLocationId = location.location;
        console.log(
          "currentLocationId",
          currentLocationId && currentLocationId.toString()
        );
        console.log("oldLocationId", oldLocationId && oldLocationId.toString());
        console.log("newLocationId", newLocationId && newLocationId.toString());
        if (
          oldLocationId &&
          currentLocationId &&
          currentLocationId.toString() === oldLocationId.toString()
        ) {
          equipment = [
            ...equipment.filter(
              item => item.toString() !== equipmentId.toString()
            )
          ];
        }
        if (
          newLocationId &&
          currentLocationId &&
          currentLocationId.toString() === newLocationId.toString()
        )
          equipment = [
            ...equipment.filter(
              item => item.toString() !== equipmentId.toString()
            ),
            equipmentId
          ];
      }
      newLocations.push({
        ...location,
        equipment: equipment.filter(item => !!item)
      });
    }
    const buildingUpdate = await Building.findById(buildingId);
    buildingUpdate.locations = newLocations;
    buildingUpdate.markModified("locations");
    await buildingUpdate.save();
  } catch (error) {
    console.log("----error-----", error);
  }
};

const removeBuildingEquipment = async (_, { input }, ctx) => {
  const result = await BuildingEquipment.findOneAndUpdate(
    { _id: input._id },
    { isArchived: true, comments: "Dummy123" },
    { new: true }
  );
  await updateBuildingLocations({
    buildingId: input.building,
    equipmentId: input._id
  });
  return result;
};

const removeBuildingEquipments = async (_, { input }, ctx) => {
  const equipmentToRemove = await input.buildingEquipmentIds.map(equip =>
    mongoose.Types.ObjectId(equip)
  );
  try {
    await BuildingEquipment.updateMany(
      { _id: { $in: equipmentToRemove } },
      { isArchived: true },
      { passRawResult: true }
    );
    return { deletedIds: equipmentToRemove };
  } catch (err) {
    return err;
  }
};

const updateBuildingEquipment = async (_, { input }, ctx) => {
  const { user } = ctx;
  let set = {};

  const updateKeys = [
    "quantity",
    "comments",
    "configs",
    "maintenances",
    "images",
    "projects",
    "operations",
    "operation",
    "libraryEquipmentId"
  ];

  const nullableKeys = ["location"];

  updateKeys.forEach(key => {
    if (key === "libraryEquipmentId" && input[key]) {
      set["libraryEquipment"] = input[key];
    } else if (input[key]) {
      set[key] = input[key];
    }
  });

  nullableKeys.forEach(key => {
    set[key] = input[key];
  });
  try {
    let previousBuildingEquipment = await BuildingEquipment.findById(input._id);
    let originalBuilding = await Building.findById(
      previousBuildingEquipment.building
    );
    const oldBuildingEquipment = await BuildingEquipment.findById(input._id)
      .lean()
      .exec();
    const oldLocationId = oldBuildingEquipment?.location;

    return BuildingEquipment.findByIdAndUpdate(
      { _id: input._id },
      { $set: set },
      { new: true }
    )
      .exec()
      .then(async e => {
        Organization.findOne({ buildingIds: e.building }, function(err, org) {
          // For SalesForce
          if (err) {
            console.error(
              "Failed to update salesforce with new project",
              e._id
            );
            return;
          }

          try {
            salesforce.updateEquipment([e], org);
          } catch (err) {
            console.error("SalesForce was not updated:", err);
          }
        });
        try {
          await updateBuildingOperations(e.building, input);
          await updateBuildingLocations({
            buildingId: e.building,
            equipmentId: input._id,
            newLocationId: input.location,
            mode: "update",
            oldLocationId
          });
          if (input.images && input.images.length > 0) {
            const images = await ImageSync.find({ sourceIdentity: input._id });
            input.images.forEach(async imageUrl => {
              if (!images.find(syncedImage => syncedImage.uri === imageUrl)) {
                await ImageSync.create({
                  filePath: imageUrl,
                  sourceObject: "BuildingEquipment",
                  sourceIdentity: input._id,
                  sourcePartition: e._partition,
                  uri: imageUrl,
                  createdByUserId: user._id
                });
              }
            });
          }
        } catch (error) {}
        return e;
      });
  } catch (error) {
    console.log("error", error);
    return error;
  }
};

const updateBuildingOperations = async (buildingId, input) => {
  const building = await Building.findById(buildingId)
    .lean()
    .exec();
  let operations = [...building.operations] || [];
  const equipmentId = input && input._id;
  const operationId = input && input.operation && input.operation.id;
  const newOperations = [];
  if (equipmentId) {
    for (let operation of operations) {
      if (operation._id.toString() !== operationId) {
        const equipmentIds = operation.equipmentIds || [];
        newOperations.push({
          ...operation,
          equipmentIds: equipmentIds.filter(
            item => item.toString() !== equipmentId
          )
        });
      } else {
        const equipmentIds = operation.equipmentIds || [];
        newOperations.push({
          ...operation,
          equipmentIds: [
            ...equipmentIds.filter(item => item.toString() !== equipmentId),
            equipmentId
          ]
        });
      }
    }
    const buildingUpdate = await Building.findById(buildingId);
    buildingUpdate.operations = newOperations;
    buildingUpdate.markModified("operations");
    await buildingUpdate.save();
  }
};

const searchBuildingEquipment = async (
  _,
  { buildingId, equipment = {}, search = {} },
  ctx
) => {
  const { page, size, value } = Object.assign({ size: 100, page: 1 }, search);
  const match = Object.entries(equipment).reduce((acc, [key, value]) => {
    if (value === null || value === undefined || value.length === 0) {
      return { ...acc };
    }
    return { ...acc, [key]: value };
  }, {});
  const cursor = await BuildingEquipment.aggregate([
    {
      $match: {
        buildingId: mongoose.Types.ObjectId(buildingId)
      }
    }
  ])
    .lookup({
      from: "equipments",
      localField: "libraryEquipment",
      foreignField: "_id",
      as: "libraryEquipmentDocs"
    })
    .unwind("$libraryEquipmentDocs")
    .match({ equipment_docs: match })
    .skip((page - 1) * size)
    .limit(size)
    .cursor({ useMongooseAggCursor: true, batchSize: size })
    .exec();
  const searchResults = await cursor.next();
  return searchResults ? searchResults.equipment_docs : [];
};

module.exports = {
  BuildingEquipment: {
    building,
    libraryEquipment,
    location,
    operations,
    projects
  },
  Query: {
    buildingEquipment,
    searchBuildingEquipment,
    recentBuildingEquipment
  },
  Mutation: {
    addBuildingEquipment,
    copyBuildingEquipment,
    removeBuildingEquipment,
    removeBuildingEquipments,
    updateBuildingEquipment
  }
};
