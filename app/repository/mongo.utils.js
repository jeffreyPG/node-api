const mongoose = require("mongoose");

exports.mapStringArrayIntoObjectIdArray = array => {
  if (!Array.isArray(array)) array = [array];
  if (array && array.length > 0) {
    return array.map(entry => mongoose.Types.ObjectId(entry));
  }
  throw new Error("Could not map String Array into ObjectId Array", array);
}