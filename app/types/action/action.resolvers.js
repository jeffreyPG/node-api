"use strict";

const { Action, ActionTemplate } = require("../../models/action.server.model");
const { Measure } = require("../../models/measure.server.model");
const { Project } = require("../../models/project.server.model");

const getAction = (_, { action }, ctx) => {
  return Action.findById(action._id)
    .lean()
    .exec();
};

const getActions = (_, { action = {}, search = {} }, ctx) => {
  let { size, page } = Object.assign({ size: 100, page: 1 }, search);
  return Action.find(Object.assign({ projects: { $type: "array" } }, action))
    .populate("projects._id")
    .lean()
    .skip((page - 1) * size)
    .limit(size)
    .exec()
    .then(actions =>
      actions.map(action =>
        Object.assign(action, {
          projects: action.projects.map(project =>
            Object.assign(project, project._id)
          )
        })
      )
    );
};

const getActionTemplate = (_, { actionTemplate }, ctx) => {
  return ActionTemplate.findById(actionTemplate._id)
    .populate("measures._id")
    .lean()
    .exec();
};

const getActionTemplates = (_, { actionTemplate = {}, search = {} }, ctx) => {
  let { size, page } = Object.assign({ size: 100, page: 1 }, search);
  return ActionTemplate.find(actionTemplate)
    .populate("measures._id")
    .lean()
    .skip((page - 1) * size)
    .limit(size)
    .exec()
    .then(templates =>
      templates.map(template =>
        Object.assign(template, {
          measures: template.measures.map(measure => measure._id)
        })
      )
    );
};

const createAction = (_, { action }, ctx) => {
  const actionTemplate = ActionTemplate.findById(action.templateId)
    .lean()
    .exec();

  console.log("FOUND ACTION CREATE");
  console.log(actionTemplate);
  return actionTemplate.then(template => {
    if (!action.templateId) {
      return null;
    }

    const defaults = {
      contacts: template.contacts,
      description: template.description,
      fields: template.fields,
      name: template.name,
      type: template.type
    };

    if (action.projects) {
      const projects = action.projects;

      return Promise.all(
        projects.reduce((promises, project) => {
          if (project.measureId && !project._id) {
            promises.push(
              Measure.findById(project.measureId)
                .lean()
                .exec()
                .then(measure => {
                  if (measure) {
                    return Project.create({
                      applicable_building_types:
                        measure.applicable_building_types,
                      category: measure.category,
                      description: measure.description,
                      displayName: measure.displayName,
                      originalDisplayName: measure.displayName,
                      eaAttachedTo: measure.eaAttachedTo,
                      fields: measure.fields,
                      fuel: measure.fuel,
                      incentive: measure.incentive,
                      name: measure.name,
                      project_application: measure.project_application,
                      project_category: measure.project_category,
                      project_technology: measure.project_technology,
                      source: measure.source
                    }).then(newProject => {
                      return {
                        _id: newProject._id,
                        displayName: project.displayName || measure.name,
                        measureId: measure._id,
                        status: "NOT_STARTED"
                      };
                    });
                  }
                })
            );
          } else {
            promises.push(Promise.resolve(project));
          }
          return promises;
        }, [])
      ).then(projects => {
        action.projects = projects;
        return Action.create(Object.assign(defaults, action));
      });
    } else {
      return Action.create(Object.assign(defaults, action));
    }
  });
};

const createActionTemplate = (_, { actionTemplate }, ctx) => {
  return ActionTemplate.create(actionTemplate);
};

const deleteAction = (_, { action: { _id } }, ctx) => {
  return Action.findByIdAndRemove(_id)
    .populate("projects._id")
    .lean()
    .exec()
    .then(action =>
      Object.assign(action, {
        projects: action.projects.map(project =>
          Object.assign(project, project._id)
        )
      })
    );
};

const deleteActionTemplate = (_, { actionTemplate: { _id } }, ctx) => {
  return ActionTemplate.findByIdAndRemove(_id)
    .populate("measures._id")
    .lean()
    .exec()
    .then(templates =>
      templates.map(template =>
        Object.assign(template, {
          measures: template.measures.map(measure => measure._id)
        })
      )
    );
};

const updateAction = (_, { action: { _id, ...updates } }, ctx) => {
  return Action.findByIdAndUpdate(_id, updates, { new: true })
    .populate("projects._id")
    .lean()
    .exec()
    .then(action =>
      Object.assign(action, {
        projects: action.projects.map(project =>
          Object.assign(project, project._id)
        )
      })
    );
};

const updateActionTemplate = (
  _,
  { actionTemplate: { _id, ...updates } },
  ctx
) => {
  return ActionTemplate.findByIdAndUpdate(_id, updates, { new: true })
    .populate("measures._id")
    .lean()
    .exec()
    .then(templates =>
      templates.map(template =>
        Object.assign(template, {
          measures: template.measures.map(measure => measure._id)
        })
      )
    );
};

module.exports = {
  Query: {
    action: getAction,
    actions: getActions,
    actionTemplate: getActionTemplate,
    actionTemplates: getActionTemplates
  },
  Mutation: {
    createAction,
    createActionTemplate,
    deleteAction,
    deleteActionTemplate,
    updateAction,
    updateActionTemplate
  }
};
