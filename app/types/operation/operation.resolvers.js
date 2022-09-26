const { Schedule } = require("../../models/operations.server.model");

const getSchedule = (_, { schedule }, ctx) => {
  return Schedule.findById(schedule.id)
    .lean()
    .exec();
};

const getSchedules = (_, { schedules = {}, search = {}}, ctx) => {
  let { size, page } = Object.assign({ size: 100, page: 1 },search);
  return Schedule.find(schedules)
    .lean()
    .skip((page-1)*size)
    .limit(size)
    .exec();
};

const createSchedule = (_, { schedule }, ctx) => {
  return Schedule.create(schedule);
};

const deleteSchedule = (_, { schedule: { _id } }, ctx) => {
  return Schedule.findByIdAndRemove(_id)
    .lean()
    .exec();
};

const updateSchedule = (_, { schedule: { _id, ...updates } }, ctx) => {
  return Schedule.findByIdAndUpdate(_id, updates, { new: true })
    .lean()
    .exec();
};

module.exports = {
  Query: {
    schedule: getSchedule,
    schedules: getSchedules
  },
  Mutation: {
    createSchedule: createSchedule,
    deleteSchedule: deleteSchedule,
    updateSchedule: updateSchedule
  }
};

