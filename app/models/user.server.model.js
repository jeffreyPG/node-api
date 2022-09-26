"use strict";

/**
 * Module dependencies.
 */
const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const crypto = require("crypto");
const validate = require("../controllers/api/utils/api.validation");
const { PARTITION_KEYS } = require("../../config/realm");

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
 * User Schema
 */
const UserSchema = new Schema(
  {
    name: {
      type: String,
      trim: true,
      validate: [
        validate.maxLengthValidation(50),
        'Field "name" cannot exceed 50 characters in length.'
      ]
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      unique: true,
      required: 'Field "email" is required.',
      validate: [
        validate.valEmailAddress,
        "Please provide a valid email address."
      ]
    },
    username: {
      type: String,
      default: "",
      unique: true
    },
    company: {
      type: String,
      default: "",
      validate: [
        validate.maxLengthValidation(50),
        'Field "company" cannot exceed 50 characters in length.'
      ]
    },
    password: {
      type: String,
      default: "",
      validate: [
        validate.userPassword,
        'Field "password" must be 6 characters long.'
      ]
    },
    salt: {
      type: String
    },
    roles: {
      type: [
        {
          type: String,
          enum: ["user", "verified", "expert"]
        }
      ],
      default: ["user"]
    },
    acceptedTerms: {
      type: Boolean,
      default: false
    },
    type: {
      type: String,
      trim: true,
      required: 'Field "type" is required.',
      default: "buildingOwner",
      enum: {
        values: validate.getUserTypes(),
        message: 'Field "type" is invalid.'
      }
    },
    apiKeyId: {
      type: Schema.Types.ObjectId,
      ref: "Key"
    },
    firebaseRefs: {
      orgId: {
        type: String,
        trim: true,
        default: ""
      },
      userId: {
        type: String,
        trim: true,
        default: ""
      }
    },
    portfolio: {
      id: {
        type: Number
      },
      username: {
        type: String
      },
      email: {
        type: String
      },
      firstName: {
        type: String
      },
      lastName: {
        type: String
      },
      phone: {
        type: String
      },
      jobTitle: {
        type: String
      },

      organization: {
        name: {
          type: String
        }
      },

      location: {
        city: {
          type: String
        },
        state: {
          type: String
        },
        zip: {
          type: String
        },
        address: {
          type: String
        },
        country: {
          type: String
        }
      },
      updated: {
        type: Date
      },
      created: {
        type: Date,
        default: Date.now
      }
    },
    orgIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "Organization"
      }
    ],
    buildingGroupIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "BuildingGroup"
      }
    ],
    rootOrg: {
      type: Schema.Types.ObjectId,
      ref: "Organization"
    },
    resetPassword: {
      type: String
    },
    resetPasswordExpires: {
      type: Date
    },
    lastPasswordReset: {
      type: Date,
      default: Date.now
    },
    settings: {
      leanOrganizations: [
        {
          type: Schema.Types.ObjectId,
          ref: "Organization"
        }
      ]
    },
    expert: {
      radius: {
        type: Number,
        validate: [
          validate.maxLengthValidation(5),
          'Field "expert.radius" cannot exceed 5 characters in length.'
        ]
      },
      serviceZipCode: {
        type: Number,
        validate: [validate.valExpertZipCode, "Please enter a valid zip code."]
      },
      projectTypes: [
        {
          type: String,
          enum: validate.getProjectTypes()
        }
      ]
    },
    products: {
      trend: {
        type: String,
        default: "" // to give full access, value is "show"
      },
      reports: {
        type: String,
        default: "generic" // to give full access, value is "custom"
      },
      buildeeAPI: {
        type: String,
        default: "" // to give full access, value is "access"
      },
      buildeeNYC: {
        type: String,
        default: "hide" // to give menu option, value is "show", to give full access, the value is "access"
      },
      reportStyles: {
        type: Boolean,
        default: false
      }
    },
    features: [
      {
        name: String,
        enabled: {
          type: Boolean,
          default: false
        },
        active: {
          type: Boolean,
          default: false
        }
      }
    ],
    updated: {
      type: Date
    },
    created: {
      type: Date,
      default: Date.now
    },
    isAdmin: {
      type: Boolean,
      default: false
    },
    phoneNumber: {
      type: String,
      default: ""
    },
    bio: {
      type: String,
      default: ""
    },
    image: {
      type: String,
      default: ""
    },
    license: {
      type: String,
      default: "ACTIVE",
      enum: ['ACTIVE', 'DEACTIVATED']
    },
    simuwattRole: {
      type: String,
      default: "",
      enum: ['SUPPORT', 'DEVELOPER', 'SALES', 'ADMIN', '']
    },
    _partition: {
      type: String
    },
    license: {
      type: String,
      default: "ACTIVE",
      enum: ["ACTIVE", "DEACTIVATED"]
    },
    simuwattRole: {
      type: String,
      default: "",
      enum: ["", "SUPPORT", "DEVELOPER", "ADMIN", "SALES"]
    },
    enableMFA: {
      type: Boolean,
      default: false
    },
    archived: {
      type: Boolean,
      default: false
    },
    salesforce: {
      connectedObjects: {
        type: [SFConnectedAccountsSchema],
        default: []
      }
    },
  },
  { usePushEach: true }
);

/**
 * Hook a pre save method to hash the password
 * Set the display-friendly date and unix timestamp for user birthDate and walletItem expirations
 */
UserSchema.pre("save", function(next) {
  // Dont overwrite existing salt/passwords
  // To reset password, send new password and an undefined salt value
  if (this.password && !this.salt) {
    this.salt = crypto.randomBytes(16).toString("base64");
    this.password = this.hashPassword(this.password);
  }
  this._partition = `${PARTITION_KEYS.USER}=${this._id.toString()}`;

  next();
});

/**
 * Create instance method for hashing a password
 */
UserSchema.methods.hashPassword = function(password) {
  if (this.salt && password) {
    return crypto
      .pbkdf2Sync(
        password,
        Buffer.from(this.salt, "base64"),
        10000,
        64,
        "sha256"
      )
      .toString("base64");
  } else {
    return password;
  }
};

/**
 * Create instance method for authenticating user
 */
UserSchema.methods.authenticate = function(password) {
  if (this.password === this.hashPassword(password)) {
    return true;
  }
  // Check if user is in the middle of a password reset flow
  return (
    password === this.resetPassword && this.resetPasswordExpires > new Date()
  );
};

/**
 * Strictly validate the password
 */
UserSchema.methods.validatePassword = function(checkPassword) {
  return this.password === this.hashPassword(checkPassword);
};

const User = mongoose.model("User", UserSchema);

module.exports = UserSchema;
module.exports.User = User;
