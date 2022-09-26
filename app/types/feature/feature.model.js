const { Schema, model } = require("mongoose");

const validateName = async function (value) {
  console.log(value);
  const count = await this.model("Feature").count({ name: value });
  if (count > 0) {
    return Promise.reject(new Error("name already exists"));
  } else {
    Promise.resolve(true);
  }
};

const featureSchema = new Schema(
  {
    name: {
      type: String,
      trim: true,
      validate: validateName
    },
    enabled: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

module.exports.Feature = model("Feature", featureSchema);
