const mongoose = require("mongoose");
const { Building } = require("../../models/building.server.model");
const { Location } = require("../../models/location.server.model");
const {
  BuildingEquipment
} = require("../buildingequipment/buildingequipment.model");
const { runOperationScript } = require("../../scripts/operation.script");
const { PARTITION_KEYS } = require("../../../config/realm");
const uniqBy = require("lodash/uniqBy");

const building = async (_, args) => {
  // Script for ScheduleName Sync
  await runOperationScript(args.id);
  let building = await Building.findById(args.id)
    .populate({
      path: "locations.location",
      populate: { path: "createdByUserId", select: { name: 1 } }
    })
    .populate({
      path: "constructions.construction"
    })
    .populate([
      "locations.equipment",
      "operations.schedule",
      "operations.createdByUserId",
      "constructions.createdByUserId"
    ])
    .lean();
  return building;
};

const addBuildingConstruction = (_, { input }, ctx) => {
  const { user } = ctx;
  return Building.findOneAndUpdate(
    { _id: input.building },
    {
      $addToSet: {
        constructions: {
          construction: input.construction,
          comments: input.comments,
          images: input.images,
          createdByUserId: user._id
        }
      }
    }
  )
    .populate({
      path: "constructions.construction",
      populate: { path: "createdByUserId", select: { name: 1 } }
    })
    .lean();
};

const removeBuildingConstruction = (_, { input }, ctx) => {
  return Building.findOneAndUpdate(
    { _id: input.building },
    {
      $pull: {
        constructions: {
          _id: input._id
        }
      }
    }
  )
    .populate(["constructions.construction"])
    .lean();
};

const updateBuildingConstruction = (_, { input }, ctx) => {
  let set = {
    "constructions.$.updatedAt": Date.now()
  };

  if (input.construction) {
    set["constructions.$.construction"] = input.construction;
  }

  if (input.comments) {
    set["constructions.$.comments"] = input.comments;
  }

  if (input.images) {
    set["constructions.$.images"] = input.images;
  }

  return Building.findOneAndUpdate(
    { _id: input.building, "constructions._id": input._id },
    {
      $set: set
    }
  )
    .populate({
      path: "constructions.construction",
      populate: { path: "createdByUserId", select: { name: 1 } }
    })
    .lean();
};

const addBuildingOperation = async (_, { input }, ctx) => {
  try {
    const { user } = ctx;
    let result = await Building.findOneAndUpdate(
      { _id: input.building },
      {
        $addToSet: {
          operations: {
            schedule: input.schedule,
            scheduleName: input.scheduleName,
            monday: input.monday || undefined,
            tuesday: input.tuesday || undefined,
            wednesday: input.wednesday || undefined,
            thursday: input.thursday || undefined,
            friday: input.friday || undefined,
            saturday: input.saturday || undefined,
            sunday: input.sunday || undefined,
            holiday: input.holiday || undefined,
            applicableHolidays: input.applicableHolidays || undefined,
            startDate: input.startDate || undefined,
            endDate: input.endDate || undefined,
            comments: input.comments || undefined,
            weeklyHours: input.weeklyHours,
            holidays: input.holidays,
            annualHours: input.annualHours,
            equipmentIds: input.equipmentIds || [],
            createdByUserId: user._id,
            createdAt: Date.now(),
            updatedAt: Date.now()
          }
        }
      }
    ).populate("operations.schedule");
    let originalBuilding = await Building.findById(input.building)
      .lean()
      .exec();
    let operation = (originalBuilding && originalBuilding.operations) || [];
    if (operation && operation.length)
      operation = operation[operation.length - 1];
    else operaiton = null;
    let equipmentIds = input.equipmentIds || [];
    for (let equipment of equipmentIds) {
      let buildingEquipment = await BuildingEquipment.findById(equipment);
      if (buildingEquipment) {
        buildingEquipment.operation = {
          id: operation && operation._id,
          name: input.scheduleName
        };
        buildingEquipment.markModified("operation");
        await buildingEquipment.save();
      }
    }
    return result;
  } catch (error) {
    console.log("error", error);
    return {};
  }
};

const removeBuildingOperation = (_, { input }, ctx) => {
  return Building.findOneAndUpdate(
    { _id: input.building },
    {
      $pull: {
        operations: {
          _id: input._id
        }
      }
    }
  ).populate("operations.schedule");
};

const updateBuildingOperation = async (_, { input }, ctx) => {
  let set = {};
  let updateKeys = [
    "schedule",
    "scheduleName",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
    "holiday",
    "applicableHolidays",
    "startDate",
    "endDate",
    "comments",
    "weeklyHours",
    "holidays",
    "annualHours",
    "equipmentIds"
  ];

  updateKeys.forEach(key => {
    if (
      input[key] ||
      key === "weeklyHours" ||
      key === "annualHours" ||
      key === "holidays" ||
      key === "equipmentIds"
    ) {
      set[`operations.$.${key}`] = input[key];
    }
  });
  set[`operations.$.updatedAt`] = Date.now();

  try {
    let originalBuilding = await Building.findById(input.building)
      .lean()
      .exec();
    let operations = (originalBuilding && originalBuilding.operations) || [];
    let operation = operations.filter(
      operation => operation._id.toString() === input._id
    );
    if (operation && operation.length) operation = operation[0];
    else operaiton = null;
    let originalEquipmentIds = (operation && operation.equipmentIds) || [];
    originalEquipmentIds = originalEquipmentIds.map(id => id.toString());
    let equipmentIds = input.equipmentIds || [];
    originalEquipmentIds = originalEquipmentIds.filter(
      id => !equipmentIds.includes(id)
    );
    let result = await Building.findOneAndUpdate(
      { _id: input.building, "operations._id": input._id },
      {
        $set: set
      }
    ).populate("operations.schedule");
    for (let equipment of originalEquipmentIds) {
      let buildingEquipment = await BuildingEquipment.findById(equipment);
      if (buildingEquipment) {
        buildingEquipment.operation = {
          id: "",
          name: ""
        };
        buildingEquipment.markModified("operation");
        await buildingEquipment.save();
      }
    }
    for (let equipment of equipmentIds) {
      let buildingEquipment = await BuildingEquipment.findById(equipment);
      if (buildingEquipment) {
        buildingEquipment.operation = {
          id: operation && operation._id,
          name: input.scheduleName || ""
        };
        buildingEquipment.markModified("operation");
        await buildingEquipment.save();
      }
    }
    await updateOtherBuildingEquipments({
      buildingId: input.building,
      operationId: input._id,
      equipmentIds
    });
    return result;
  } catch (error) {
    console.log("error", error);
    return {};
  }
};

const updateOtherBuildingEquipments = async input => {
  try {
    const building = await Building.findById(input.buildingId)
      .lean()
      .exec();
    let operations = [...building.operations] || [];
    let equipmentIds = (input && input.equipmentIds) || [];
    equipmentIds = equipmentIds.map(item => item.toString());
    const operationId = input && input.operationId;
    const newOperations = [];
    if (equipmentIds.length && operationId) {
      for (let operation of operations) {
        if (operation._id.toString() !== operationId) {
          const equipmentIds = operation.equipmentIds || [];
          newOperations.push({
            ...operation,
            equipmentIds: equipmentIds.filter(
              item => !equipmentIds.includes(item.toString())
            )
          });
        } else {
          newOperations.push(operation);
        }
      }
      const buildingUpdate = await Building.findById(input.buildingId);
      buildingUpdate.operations = newOperations;
      buildingUpdate.markModified("operations");
      await buildingUpdate.save();
    }
  } catch (error) {
    console.log("error", error);
  }
};

const addBuildingLocation = async (_, { input }, ctx) => {
  input._partition = `${PARTITION_KEYS.BUILDING_EQUIPMENT_LIST}=${input.buildingId}`;
  const { user } = ctx;
  const location = await Location.create({
    ...input,
    createdByUserId: user._id
  });
  location.createdByUserId = user;
  await Building.findOneAndUpdate(
    { _id: input.buildingId },
    {
      $addToSet: {
        locations: {
          location: location._id,
          equipment: input.equipment
        }
      }
    }
  );
  await findAndUpdateOtherLocationWithSameEquipment({
    ...input,
    locationId: location._id.toString()
  });
  return location;
};

const addBuildingLocations = async (_, { input }, ctx) => {
  let newBuildingLocations = [];
  const { user } = ctx;

  const building = await Building.findById(input.buildingId)
    .populate(["locations.location"])
    .lean();

  const existingLocationNames = building.locations.map(
    buildingLocation => buildingLocation.location.name
  );
  const locationPartition = `${PARTITION_KEYS.BUILDING_EQUIPMENT_LIST}=${input.buildingId}`;
  for (let index = input.namefrom; index <= input.nameto; index++) {
    if (!existingLocationNames.includes(index)) {
      newBuildingLocations.push({
        usetype: input.usetype,
        spaceType: input.spaceType,
        name: index.toString(),
        floor: input.floor || null,
        conditioning: input.conditioning || null,
        user: input.user || null,
        _partition: locationPartition,
        createdByUserId: user._id
      });
    }
  }

  if (newBuildingLocations.length > 0) {
    const createdLocations = await Location.insertMany(newBuildingLocations);

    const createdBuildingLocations = createdLocations.map(location => {
      return {
        location: location._id,
        equipment: []
      };
    });

    return Building.findOneAndUpdate(
      { _id: input.buildingId },
      {
        $push: {
          locations: { $each: createdBuildingLocations }
        }
      },
      { new: true }
    ).populate(["locations.location", "locations.equipment"]);
  } else {
    return building;
  }
};

const copyBuildingLocations = async (_, { input }, ctx) => {
  let newBuildingLocations = [];
  const { user } = ctx;

  const building = await Building.findById(input.buildingId)
    .populate(["locations.location"])
    .lean();

  const existingLocationNames = building.locations.map(
    buildingLocation => buildingLocation.location.name
  );

  const buildingLocation = building.locations.find(
    ({ _id }) => _id.toString() === input.buildingLocationId
  );
  let existingLocation;
  if (buildingLocation)
    existingLocation = await Location.findById(buildingLocation.location);
  const locationPartition = `${PARTITION_KEYS.BUILDING_EQUIPMENT_LIST}=${input.buildingId}`;
  for (let index = input.namefrom; index <= input.nameto; index++) {
    if (!existingLocationNames.includes(index)) {
      newBuildingLocations.push({
        usetype: input.usetype,
        spaceType: input.spaceType,
        name: index.toString(),
        area: existingLocation ? existingLocation.area : 0,
        floor: input.floor || null,
        conditioning: input.conditioning || null,
        user: input.user || null,
        _partition: locationPartition,
        createdByUserId: user._id
      });
    }
  }

  if (newBuildingLocations.length > 0) {
    const createdLocations = await Location.insertMany(newBuildingLocations);
    const createdBuildingLocations = await Promise.all(
      createdLocations.map(async location => {
        const equipment = await Promise.all(
          uniqBy(buildingLocation.equipment, id => id.toString()).map(
            buildingEquipmentId =>
              BuildingEquipment.clone(buildingEquipmentId, {
                replaceKeys: { location: location._id, images: [] }
              })
          )
        );

        return {
          location: location._id,
          equipment: equipment.map(e => e._id)
        };
      })
    );

    return Building.findOneAndUpdate(
      { _id: input.buildingId },
      {
        $push: {
          locations: { $each: createdBuildingLocations }
        }
      },
      { new: true }
    ).populate(["locations.location", "locations.equipment"]);
  } else {
    return building;
  }
};

const findAndUpdateOtherLocationWithSameEquipment = async ({
  buildingId,
  locationId: currentLocationId,
  equipment: newEquipmentIds
}) => {
  try {
    const building = await Building.findById(buildingId);
    const buildingJSON = await Building.findById(buildingId)
      .lean()
      .exec();
    const locations = buildingJSON?.locations || [];
    let updatedLocations = [];
    let needSave = false;
    for (let location of locations) {
      let { equipment = [], location: locationId } = location;
      if (locationId.toString() !== currentLocationId.toString()) {
        let equipmentIds = equipment.map(item => item.toString());
        let currentEquipmentIds = newEquipmentIds.map(item => item.toString());
        if (equipmentIds.some(id => currentEquipmentIds.includes(id))) {
          equipmentIds = equipmentIds.filter(
            item => !currentEquipmentIds.includes(item)
          );
          needSave = true;
          equipment = equipmentIds;
        }
      }
      updatedLocations.push({
        equipment,
        _id: location._id,
        location: locationId
      });
    }
    if (needSave) {
      building.locations = updatedLocations;
      building.markModified("locations");
      await building.save();
    }
    await BuildingEquipment.updateMany(
      { _id: { $in: newEquipmentIds } },
      { $set: { location: currentLocationId } }
    );
  } catch (error) {
    console.log("error", error);
  }
};

const updateBuildingLocation = async (_, { input }, ctx) => {
  let set = {};

  let updateKeys = [
    "usetype",
    "spaceType",
    "name",
    "floor",
    "conditioning",
    "user",
    "area",
    "length",
    "width",
    "height"
  ];

  updateKeys.forEach(key => {
    if (input[key] || input[key] === 0) {
      set[`${key}`] = input[key];
    }
  });

  const location = await Location.findOneAndUpdate(
    { _id: input.locationId },
    { $set: set },
    { new: true }
  );

  await Building.findOneAndUpdate(
    { _id: input.buildingId, "locations._id": input._id },
    { $set: { "locations.$.equipment": input.equipment } },
    { new: true }
  );

  await findAndUpdateOtherLocationWithSameEquipment(input);

  return location;
};

const removeBuildingLocation = async (_, { input }, ctx) => {
  await BuildingEquipment.updateMany(
    { location: input.locationId },
    { $set: { location: null } }
  );
  await Location.findByIdAndDelete(input.locationId);
  return Building.findOneAndUpdate(
    { _id: input.buildingId },
    {
      $pull: {
        locations: {
          _id: input._id
        }
      }
    }
  );
};

const addBuildingLocationEquipment = async (_, { input }, ctx) => {
  const location = await Location.findById(input.locationId);

  const building = await Building.findOneAndUpdate(
    { _id: input.buildingId, "locations.location": input.locationId },
    {
      $push: {
        "locations.$.equipment": input.buildingEquipmentId
      }
    },
    { new: true }
  ).populate(["locations.location", "locations.equipment"]);

  return building.locations.find(
    buildingLocation =>
      buildingLocation.location &&
      buildingLocation.location._id.toString() === input.locationId
  );
};

const removeBuildingLocationEquipment = async (_, { input }, ctx) => {
  const building = await Building.findOneAndUpdate(
    { _id: input.buildingId, "locations.location": input.locationId },
    {
      $pull: { "locations.$.equipment": input.equipmentId }
    },
    { new: true }
  ).populate(["locations.location", "locations.equipment"]);

  return building.locations.find(
    buildingLocation =>
      buildingLocation.location &&
      buildingLocation.location._id.toString() === input.locationId
  );
};

module.exports = {
  Query: {
    building
  },
  Mutation: {
    addBuildingConstruction,
    removeBuildingConstruction,
    updateBuildingConstruction,
    addBuildingOperation,
    removeBuildingOperation,
    updateBuildingOperation,
    addBuildingLocation,
    updateBuildingLocation,
    removeBuildingLocation,
    addBuildingLocations,
    copyBuildingLocations,
    addBuildingLocationEquipment,
    removeBuildingLocationEquipment
  }
};
