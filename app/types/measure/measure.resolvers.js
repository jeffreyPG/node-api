const { Measure } = require("../../models/measure.server.model");

const createMeasure = (_, { measure }, ctx) => {
  return Measure.create(measure);
};

const updateMeasure = (_, { measure: { _id, ...updates } }, ctx) => {
  return Measure.findByIdAndUpdate(_id, updates, { new: true })
    .lean()
    .exec();
};

const deleteMeasure = (_, { measure: { _id } }, ctx) => {
  return Measure.findByIdAndRemove(_id)
    .lean()
    .exec();
};

const getMeasure = (_, { measure }, ctx) => {
  return Measure.findById(measure._id)
    .lean()
    .exec();
};

const getMeasures = (_, { measure = {}, search = {}}, ctx) => {
  let { size, page } = Object.assign({ size: 100, page: 1 }, search);
  return Measure.find(measure)
    .lean()
    .skip((page-1)*size)
    .limit(size)
    .exec();
};

module.exports = {
  Query: {
    measure: getMeasure,
    measures: getMeasures
  },
  Mutation: {
    createMeasure,
    updateMeasure,
    deleteMeasure
  }
};
