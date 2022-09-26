const { SystemType } = require("../../models/systemtype.server.model");

const createSystemType = (_, { systemType }, ctx) => {
  return SystemType.create(systemType);
};

const updateSystemType = (_, { systemType: { _id, ...updates } }, ctx) => {
  return SystemType.findByIdAndUpdate(_id, updates, { new: true })
    .lean()
    .exec();
};

const deleteSystemType = (_, { systemType: { _id } }, ctx) => {
  return SystemType.findByIdAndRemove(_id)
    .lean()
    .exec();
};

const getSystemType = (_, { systemType }, ctx) => {
  return SystemType.findById(systemType._id)
    .lean()
    .exec();
};

const getSystemTypes = (_, { systemType = {}, search = {} }, ctx) => {
  let { size, page } = Object.assign({ size: 100, page: 1 }, search);
  return SystemType.find(systemType)
    .lean()
    .sort({ order: 1 })
    .skip((page - 1) * size)
    .limit(size)
    .exec();
};

module.exports = {
  Query: {
    systemType: getSystemType,
    systemTypes: getSystemTypes
  },
  Mutation: {
    createSystemType,
    updateSystemType,
    deleteSystemType
  }
};
