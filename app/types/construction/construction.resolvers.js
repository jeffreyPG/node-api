const { Construction } = require("../../models/constructions.server.model");

const getConstruction = (_, { construction }, ctx) => {
  return Construction.findById(construction.id)
    .lean()
    .exec();
};

const getConstructions = (_, { constructions = {}, search = {}}, ctx) => {
  let { size, page } = Object.assign({ size: 100, page: 1 },search);
  return Construction.find(constructions)
    .lean()
    .skip((page-1)*size)
    .limit(size)
    .exec();
};

const createConstruction = (_, { construction }) => {
  return Construction.create(construction);
};

const deleteConstruction = (_, { construction: { _id } }) => {
  return Construction.findByIdAndRemove(_id)
    .lean()
    .exec();
};

const updateConstruction = (_, { construction: { _id, ...updates } }, ctx) => {
  return Construction.findByIdAndUpdate(_id, updates, { new: true })
    .lean()
    .exec();
};

module.exports = {
  Query: {
    construction: getConstruction,
    constructions: getConstructions
  },
  Mutation: {
    createConstruction: createConstruction,
    deleteConstruction: deleteConstruction,
    updateConstruction: updateConstruction
  }
};

