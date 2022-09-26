const mongoose = require("mongoose");
const Project = mongoose.model("Project");

async function getProjects(idList) {
  return Project.find({ _id: { $in: idList } });
}

async function getProjectById(id) {
  return Project.findById(id);
}

module.exports = {
  getProjects,
  getProjectById
};
