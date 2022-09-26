"use strict";

/**
 * Module dependencies.
 */
const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const validate = require("../controllers/api/utils/api.validation");

/**
 * Body Schema
 */
const SubBodySchema = new Schema(
  {
    type: {
      type: String
    },
    styleFormat: {
      type: String
    },
    target: {
      type: String
    },
    content: {
      type: String
    },
    ele: {
      type: String
    },
    headingEle: {
      type: String
    },
    tableType: {
      type: String
    },
    tableLayout: {
      type: String
    },
    organize: {
      type: String
    },
    metaData: {},
    fields: {
      type: Array
    },
    customLabels: {
      type: Array,
      default: []
    },
    projectConfig: {
      type: Schema.Types.Mixed,
      default: {}
    },
    equipmentConfig: {
      type: Schema.Types.Mixed,
      default: {}
    },
    dividerConfig: {
      type: Schema.Types.Mixed,
      default: {}
    },
    applicationType: {
      type: String
    },
    dataLabels: {
      type: String,
      default: "show"
    },
    metaData: {
      type: Schema.Types.Mixed,
      default: {}
    },
    options: {
      type: Schema.Types.Mixed,
      default: {}
    },
    layoutOption: {
      type: String,
      default: ""
    }
  },
  { _id: false, minimize: false }
);

/**
 * Template Schema
 */
const TemplateSchema = new Schema(
  {
    name: {
      type: String,
      default: "",
      required: 'Field "name" is required.',
      validate: [
        validate.maxLengthValidation(100),
        'Field "name" cannot exceed 100 characters in length.'
      ]
    },
    styledDoc: {
      type: String,
      default: ""
    },
    attachments: {
      type: Array,
      default: [],
    },
    header: {
      text: {
        type: String
      },
      position: {
        type: String
      },
      image: {
        type: String
      },
      dividerConfig: {
        type: Schema.Types.Mixed
      }
    },
    body: [SubBodySchema],
    footer: {
      text: {
        type: String
      },
      position: {
        type: String
      },
      image: {
        type: String
      },
      dividerConfig: {
        type: Schema.Types.Mixed
      }
    },
    config: {
      tableOfContents: {
        type: Boolean
      },
      tableOfContentsDepth: {
        type: Number
      },
      pageNumbers: {
        type: Boolean
      },
      numberPosition: {
        type: String
      }
    },
    updated: {
      type: Date
    },
    createdByUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: 'Field "createdByUserId" is required.'
    }
  },
  { usePushEach: true, timestamps: true }
);

module.exports.Template = mongoose.model("Template", TemplateSchema);
