const { Project } = require("../../models/project.server.model");

const sortCategorization = categorizationArray =>
  categorizationArray
    .filter(value => value !== null)
    .sort((a, b) => {
      if (a < b) {
        return -1;
      }
      if (a > b) {
        return 1;
      }
      return 0;
    });

const createProject = (_, { project }, ctx) => {
  return Project.create(project);
};

const updateProject = (_, { project: { _id, ...updates } }, ctx) => {
  return Project.findByIdAndUpdate(_id, updates, { new: true })
    .lean()
    .exec();
};

const deleteProject = (_, { project: { _id } }, ctx) => {
  return Project.findByIdAndRemove(_id)
    .lean()
    .exec();
};

const getProject = (_, { project }, ctx) => {
  return Project.findById(project._id)
    .lean()
    .exec();
};

const getProjects = (_, { project = {}, search = {} }, ctx) => {
  let { size, page } = Object.assign({ size: 100, page: 1 }, search);
  return Project.find(project)
    .lean()
    .skip((page - 1) * size)
    .limit(size)
    .exec();
};

const projectCategorization = async (_, { categorization = {} }, ctx) => {
  const match = Object.entries(categorization).reduce((acc, [key, value]) => {
    if (value === null || value === undefined || value.length === 0) {
      return { ...acc };
    }
    return { ...acc, [key]: value };
  }, {});

  const results = await Project.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        categories: { $addToSet: "$project_category" },
        applications: { $addToSet: "$project_application" },
        technologies: { $addToSet: "$project_technology" }
      }
    }
  ]);

  const categorizations = results && results.length === 1 ? results[0] : {};

  const {
    categories = [],
    applications = [],
    technologies = []
  } = categorizations;

  return {
    categories: sortCategorization(categories),
    applications: sortCategorization(applications),
    technologies: sortCategorization(technologies)
  };
};

module.exports = {
  Query: {
    project: getProject,
    projects: getProjects,
    projectCategorization
  },
  Mutation: {
    createProject,
    updateProject,
    deleteProject
  }
};
