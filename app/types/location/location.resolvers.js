const { Location } = require("../../models/location.server.model");

const getLocation = (_, { location }, ctx) => {
  return Location.aggregate([
    { $match: { _id: location._id } },
    {
      $lookup: {
        from: "users",
        localField: "createdByUserId",
        foreignField: "_id",
        as: "createdByUserId",
      }
    },
    {
      $unwind: {
        path: "$createdByUserId",
        preserveNullAndEmptyArrays: true
      }
    }
  ]).lean().exec();
};

const getLocations = (_, { locations = {}, search = {} }, ctx) => {
  let { size, page } = Object.assign({ size: 100, page: 1 }, search);
  return Location.find(locations)
    .lean()
    .skip((page - 1) * size)
    .limit(size)
    .exec();
};

const createLocation = (_, { location }, ctx) => {
  const { user } = ctx;
  return Location.create({
    ...location,
    createdByUserId: user._id
  });
};

const deleteLocation = (_, { location: { _id } }, ctx) => {
  return Location.findByIdAndRemove(_id)
    .lean()
    .exec();
};

const updateLocation = (_, { location: { _id, ...updates } }, ctx) => {
  return Location.findByIdAndUpdate(_id, updates, { new: true })
    .lean()
    .exec();
};

module.exports = {
  Query: {
    location: getLocation,
    locations: getLocations
  },
  Mutation: {
    createLocation: createLocation,
    deleteLocation: deleteLocation,
    updateLocation: updateLocation
  }
};

