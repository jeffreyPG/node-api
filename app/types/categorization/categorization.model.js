const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  category: {
    displayName: String,
    value: String
  },
  application: {
    displayName: String,
    value: String
  },
  technology: {
    displayName: String,
    value: String
  },
  type: {
    displayName: String,
    value: String
  }
});

module.exports.Categorization = mongoose.model("Categorization", schema);
