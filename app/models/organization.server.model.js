"use strict";

/**
 * Module dependencies.
 */
const mongoose = require("mongoose");
const { PARTITION_KEYS } = require("../../config/realm");
const Schema = mongoose.Schema;
const {
  USERROLES,
  ORGTYPES
} = require("../controllers/api/utils/api.validation");

/**
 * User Schema
 */
const SubUserSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User"
    },
    userRole: {
      type: String,
      trim: true,
      default: "",
      required: 'Field "userRole" is required.',
      enum: {
        values: USERROLES,
        message: 'Field "userRole" is invalid.'
      }
    },
    buildingIds: [
      {
        type: Schema.Types.Mixed
      }
    ],
    templateIds: [
      {
        type: Schema.Types.Mixed
      }
    ]
  },
  { _id: false }
);

/**
 * Salesforce Connected Accounts Authorizations
 */
const SFConnectedAuthorizationsSchema = new Schema({
  username: {
    type: String,
    required: 'Field "username" is required.'
  },
  aud: {
    type: String
  },
  tokenUrl: {
    type: String
  }
});


/**
 * Salesforce Connected Accounts Schema
 */
const SFConnectedAccountsSchema = new Schema({
    username: {
        type: String,
        required: 'Field "username" is required.'
    },
    sObjectId: {
        type: String,
        required: 'Field "sObjectId" is required.'
    }
});

/**
 * Organization Schema
 */
const OrganizationSchema = new Schema(
  {
    name: {
      type: String,
      trim: true,
      default: "",
      required: 'Field "name" is required.'
    },
    users: [SubUserSchema],
    orgType: {
      type: String,
      trim: true,
      default: "",
      required: 'Field "orgTypes" is required.',
      enum: {
        values: ORGTYPES,
        message: 'Field "orgTypes" is invalid.'
      }
    },
    projectIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "Project"
      }
    ],
    buildingIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "Building"
      }
    ],
    templateIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "Template"
      }
    ],
    themeId: {
      type: Schema.Types.ObjectId,
      ref: "Organizationthemes"
    },
    reportThemeId: {
      type: Schema.Types.ObjectId,
      ref: "Organizationthemes"
    },
    firebaseOrgId: {
      type: String,
      trim: true,
      default: ""
    },
    portfolioSyncHistory: {
      export: {
        type: Array,
        default: []
      },
      import: {
        type: Array,
        default: []
      }
    },
    targets: {
      type: Array,
      default: []
    },
    passwordExpiry: {
      days: {
        type: Number,
        default: null
      },
      enabledRoles: {
        type: Array,
        default: []
      }
    },
    imageURL: {
      type: String,
      trim: true,
      default: ""
    },
    salesforce: {
      enabled: {
        type: Boolean,
        default: false
      },
      nycEnabled: {
        type: Boolean,
        default: false
      },
      paused: {
        type: Boolean,
        default: false
      },
      connectedAccounts: {
        type: [String],
        default: []
      },
      authorizations: {
        type: [SFConnectedAuthorizationsSchema],
        default: []
      },
      connectedObjects: {
        type: [SFConnectedAccountsSchema],
        default: []
      }
    },
    updated: {
      type: Date
    },
    created: {
      type: Date,
      default: Date.now
    },
    sampleBuilding: {
      type: Schema.Types.ObjectId,
      ref: "Building"
    },
    options: {
      disabledCreateBuildingPages: {
        type: Array,
        default: []
      },
      disabledCreateBuildingFields: {
        type: Array,
        default: []
      },
      disabledBuildingUseType: {
        type: Array,
        default: []
      },
      onlyAvailableBuildingUseType: {
        type: Array,
        default: []
      },
      availableUtilityTypes: {
        type: Array,
        default: []
      },
      enabledBuildingFields: {
        type: Array,
        default: []
      },
      newCreateBuildingFields: {
        type: Array,
        default: []
      },
      hasUtility: {
        type: Boolean,
        default: false
      },
      hasUtilityInput: {
        type: Boolean,
        default: false
      },
      contactRoleOptions: {
        type: Array,
        default: []
      },
      stateOptions: {
        type: Array,
        default: []
      },
      countryOptions: {
        type: Array,
        default: []
      },
      simuwattOrg: {
        type: Boolean,
        default: false
      },
      isCustomForm: {
        type: Boolean,
        default: false
      },
      labels: {
        default: {}
      }
    },
    blendedRates: {
      type: Schema.Types.Mixed,
      default: {}
    },
    survey: {
      type: Schema.Types.Mixed,
      default: {}
    },
    commoditySettings: {
      type: Schema.Types.Mixed,
      default: {}
    },
    _partition: {
      type: String,
      default: PARTITION_KEYS.ORGANIZATION_LIST
    },
    sharedMeasureOrgs: {
      type: Array,
      default: []
    },
    sharedTemplateOrgs: {
      type: Array,
      default: []
    },
    isArchived: {
      type: Boolean,
      default: false
    },
    simuwattOrg: {
      type: Boolean,
      default: false
    }
  },
  { usePushEach: true }
);

/**
 * Hook a pre save method to set partition key
 */
OrganizationSchema.pre("save", function(next) {
  this._partition = PARTITION_KEYS.ORGANIZATION_LIST;
  next();
});

const Organization = mongoose.model("Organization", OrganizationSchema);

module.exports = OrganizationSchema;
module.exports.Organization = Organization;
