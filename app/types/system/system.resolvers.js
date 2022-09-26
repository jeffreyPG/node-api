const { System } = require("../../models/system.server.model");

const createSystem = async (_, { system }, ctx) => {
  const { user } = ctx;
  const created = await System.create({
    ...system,
    createdByUserId: user._id
  });
  return created
  .populate({path: 'createdByUserId', select: { 'name': 1 }})
  .populate("template").execPopulate();
};

const updateSystem = (_, { system: { _id, ...updates } }, ctx) => {
  return System.findByIdAndUpdate(_id, updates, { new: true })
    .populate({path: 'createdByUserId', select: { 'name': 1 }})
    .populate("template")
    .lean()
    .exec();
};

const deleteSystem = (_, { system: { _id } }, ctx) => {
  return System.findByIdAndRemove(_id)
    .populate({path: 'createdByUserId', select: { 'name': 1 }})
    .populate("template")
    .lean()
    .exec();
};

const getSystem = (_, { system }, ctx) => {
  return System.findById(system._id)
    .populate({path: 'createdByUserId', select: { 'name': 1 }})
    .populate("template")
    .lean()
    .exec();
};

const getSystems = (_, { system = {}, search = {} }, ctx) => {
  let { size, page } = Object.assign({ size: 100, page: 1 }, search);
  return System.find(system)
    .populate("template")
    .populate({path: 'createdByUserId', select: { 'name': 1 }})
    .skip((page - 1) * size)
    .limit(size)
    .lean()
    .exec();
};

module.exports = {
  Query: {
    system: getSystem,
    systems: getSystems
  },
  Mutation: {
    createSystem,
    updateSystem,
    deleteSystem
  }
};
