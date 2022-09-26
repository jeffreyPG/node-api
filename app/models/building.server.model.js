"use strict";

/**
 * Module dependencies.
 */
const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const validate = require("../controllers/api/utils/api.validation");
const useTypes = require("../static/building-use-types");

const energystarIdsSchema = new Schema(
  {
    accountId: {
      type: Number,
      default: ""
    },
    buildingId: {
      type: Number,
      default: ""
    }
  },
  { _id: false }
);

const pmScoreReasonSchema = new Schema(
  {
    name: {
      type: String,
      default: ""
    },
    description: {
      type: String,
      default: ""
    }
  },
  { _id: false }
);

const pmScoreSchema = new Schema(
  {
    year: {
      type: Number
    },
    score: {
      type: Number,
      default: 0
    },
    reasons: [pmScoreReasonSchema]
  },
  { _id: false }
);

const contacts = new Schema(
  {
    firstName: {
      type: String,
      trim: true,
      required: 'Field "First Name" is invalid.'
    },
    lastName: {
      type: String,
      trim: true
    },
    company: {
      type: String,
      trim: true
    },
    title: {
      type: String,
      trim: true
    },
    role: {
      type: String,
      trim: true,
      enum: {
        values: validate.getContactRoles(),
        message: 'Field "role" is invalid.'
      }
    },
    phoneNumber: {
      type: String,
      trim: true
    },
    emailAddress: {
      type: String,
      trim: true
    },
    qualification: {
      type: String,
      trim: true,
      enum: {
        values: validate.getContactQualification(),
        message: 'Field "qualification" is invalid.'
      }
    },
    certificateNumber: {
      type: String,
      trim: true
    },
    expirationDate: {
      type: String,
      trim: true
    },
    yearsOfExperience: {
      type: Number
    }
  },
  { _id: false }
);

const DaySchedule = {
  hour: {
    type: Number
  },
  period: {
    type: String,
    enum: ["unoccupied", "warmup", "occupied", "cooldown"]
  },
  value: {
    type: Number
  },
  metric: {
    type: String,
    enum: ["fahrenheit"]
  }
};

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
 * Building Schema
 */
const BuildingSchema = new Schema(
  {
    buildingName: {
      type: String,
      trim: true,
      default: "",
      required: 'Field "buildingName" is required.',
      validate: [
        validate.maxLengthValidation(200),
        'Field "buildingName" cannot exceed 200 characters in length.'
      ]
    },
    buildingImage: {
      type: String,
      trim: true,
      default: ""
    },
    location: {
      country: {
        type: String,
        trim: true,
        // required: 'Field "city" is required.',
        default: ""
        // validate: [validate.maxLengthValidation(50), 'Field "city" cannot exceed 50 characters in length.']
      },
      city: {
        type: String,
        trim: true,
        // required: 'Field "city" is required.',
        default: ""
        // validate: [validate.maxLengthValidation(50), 'Field "city" cannot exceed 50 characters in length.']
      },
      state: {
        type: String,
        trim: true,
        // required: 'Field "state" is required.',
        default: ""
        // validate: [validate.stateAbbr, 'Field "state" is invalid.']
      },
      zipCode: {
        type: String,
        trim: true,
        // required: 'Field "zipCode" is required.',
        default: ""
        // validate: [validate.valZipCode, 'Field "zipCode" is invalid.']
      },
      address: {
        type: String,
        trim: true,
        // required: 'Field "address" is required.',
        default: ""
        // validate: [
        //   { validator: validate.maxLengthValidation(50), msg: 'Field "address" cannot exceed 50 characters in length.' },
        //   { validator: validate.valAddress, msg: 'Field "address" is invalid.' }
        // ]
      }
    },
    floorCount: {
      type: Number,
      trim: true,
      default: 0
      // required: 'Field "floorCount" is required.',
    },
    belowGradeFloorCount: {
      type: Number,
      trim: true,
      default: 0
      // required: 'Field "floorCount" is required.',
    },
    squareFeet: {
      type: Number,
      trim: true,
      default: 0
      // required: 'Field "squareFeet" is required.',
    },
    buildYear: {
      type: Number,
      trim: true,
      default: 0
      // required: 'Field "buildYear" is required.',
    },
    open247: {
      type: String,
      trim: true,
      default: ""
      // required: 'Field "open247" is required.',
    },
    buildingUse: {
      type: String,
      trim: true,
      default: "",
      enum: {
        values: validate.getBuildingUses(),
        message: 'Field "buildingUse" is invalid.'
      }
    },
    buildingUseTypes: [
      {
        use: {
          type: String,
          default: "office"
        },
        squareFeet: {
          type: Number,
          default: 0
        },
        eligibleForScore: Number,
        propertyName: String,
        propertyAddress: String,
        minimumGrossFloorAreaSf: Number,
        irrigatedArea: String,
        yearBuiltPlannedForConstructionCompletion: String,
        occupancy: String,
        numberOfOccupancy: Number,
        numberOfBuildings: Number,
        consecutiveMonthsOfEnergyData: String,
        weeklyOperatingHours: Number,
        minimumOperatingHours: Number,
        openOnWeekends: String,
        numberOfWorkers: Number,
        minimumNumberOfWorkersOnMainShift: Number,
        percentCooled: Number,
        percentHeated: Number,
        numberOfResidentialLivingUnits: Number,
        numberOfRooms: Number,
        numberOfComputers: Number,
        cookingFacilities: String,
        numberOfCommercialRefrigerationUnits: Number,
        numberOfWalkInRefrigerationUnits: Number,
        areaOfAllWalkInRefrigerationUnits: Number,
        numberOfOpenClosedRefrigerationUnits: Number,
        lengthOfAllOpenClosedRefrigerationUnits: Number,
        numberOfCashRegisters: Number,
        singleStore: String,
        requiredNumberOfStores: Number,
        exteriorEntranceToThePublic: String,
        minimumNumberOfExteriorEntranceToPublic: String,
        isHighSchool: String,
        schoolDistrict: String,
        studentSeatingCapacity: Number,
        monthsInUse: Number,
        grossFloorAreaUsedForFoodPreparation: Number,
        gymnasiumFloorArea: Number,
        computerLab: String,
        diningHall: String,
        ownedBy: String,
        maximumNumberOfFloors: Number,
        numberOfStaffedBeds: Number,
        minimumNumberOfStaffedBeds: Number,
        numberOfFullTimeEquivalentWorkers: Number,
        numberOfMriMachines: Number,
        surgeryCenterFloorArea: Number,
        numberOfSurgicalOperatingBeds: Number,
        licensedBedCapacity: String,
        onsiteLaundryFacility: String,
        laboratory: String,
        tertiaryCare: String,
        itEnergyConfiguration: String,
        upsSystemRedundancy: String,
        coolingEquipmentRedundancy: String,
        percentUsedForColdStorage: Number,
        clearHeight: Number,
        numberOfGuestMealsServedPerYear: Number,
        hoursPerDayGuestsOnsite: Number,
        typeOfLaundryFacility: String,
        amountOfLaundryProcessedOnsiteAnnually: Number,
        fullserviceSpaFloorArea: Number,
        gymfitnessCenterFloorArea: Number,
        numberOfResidentialLivingUnitsInALowriseSetting: Number,
        numberOfResidentialLivingUnitsInAMidriseSetting: Number,
        numberOfResidentialLivingUnitsInAHighriseSetting: Number,
        numberOfBedrooms: Number,
        residentPopulationType: String,
        governmentSubsidizedHousing: String,
        numberOfLaundryHookupsInAllUnits: Number,
        numberOfLaundryHookupsInCommonAreas: Number,
        maximumResidentCapacity: Number,
        averageNumberOfResidents: Number,
        maximumAverageNumberOfResidents: Number,
        numberOfResidentialWashingMachines: Number,
        numberOfCommercialWashingMachines: Number,
        numberOfResidentialElectronicLiftSystems: Number,
        plantDesignFlowRate: Number,
        minimumPlantDesignFlowRate: Number,
        averageInfluentBiologicalOxygenDemand: Number,
        minimumAverageInfluentBiologicalOxygenDemand: Number,
        averageEffluentBiologicalOxygenDemand: Number,
        minimumAverageEffluentBiologicalOxygenDemand: Number,
        fixedFilmTrickleFiltrationProcess: String,
        nutrientRemoval: String,
        seatingCapacity: Number,
        minimumSeatingCapacity: Number,
        numberOfWeekdaysOpen: Number,
        openFootage: Number,
        partiallyEnclosedFootage: Number,
        completelyEnclosedFootage: Number,
        supplementalHeating: String
      }
    ],
    archived: {
      type: Boolean,
      default: false
    },
    energystar: {
      type: Boolean,
      default: false
    },
    customFields: [
      {
        _id: false,
        key: { type: String, default: "" },
        value: String,
        id: String,
        standardApproved: { type: Boolean, default: false },
        typeId: Number
      }
    ],
    energystarIds: [energystarIdsSchema],
    rates: {
      discountRate: {
        type: Number,
        default: 2.5
      },
      financeRate: {
        type: Number
      },
      inflationRate: {
        type: Number,
        default: 0.5
      },
      reinvestmentRate: {
        type: Number
      },
      investmentPeriod: {
        type: Number,
        default: 10
      },
      electric: {
        type: Number,
        default: 0
      },
      electricGHG: {
        type: Number,
        default: 0.000744
      },
      steam: {
        type: Number,
        default: 0
      },
      steamGHG: {
        type: Number,
        default: 0
      },
      gas: {
        type: Number,
        default: 0
      },
      gasGHG: {
        type: Number,
        default: 0.0053
      },
      water: {
        type: Number,
        default: 0
      },
      fuelOil2: {
        type: Number,
        default: 0
      },
      fuelOil2GHG: {
        type: Number,
        default: 0.01021
      },
      fuelOil4: {
        type: Number,
        default: 0
      },
      fuelOil4GHG: {
        type: Number,
        default: 0.01096
      },
      fuelOil56: {
        type: Number,
        default: 0
      },
      fuelOil56GHG: {
        type: Number,
        default: 0.01021
      },
      diesel: {
        type: Number,
        default: 0
      },
      dieselGHG: {
        type: Number,
        default: 0.01021
      },
      other: {
        type: Number,
        default: 0
      }
    },
    projectRates: {
      fieldsEdited: {
        type: Array,
        default: []
      },
      discountRate: {
        type: Number,
        default: 2.5
      },
      financeRate: {
        type: Number
      },
      inflationRate: {
        type: Number,
        default: 0.5
      },
      reinvestmentRate: {
        type: Number
      },
      investmentPeriod: {
        type: Number,
        default: 10
      },
      electric: {
        type: Number,
        default: 0
      },
      electricGHG: {
        type: Number,
        default: 0.000744
      },
      steam: {
        type: Number,
        default: 0
      },
      steamGHG: {
        type: Number,
        default: 0
      },
      gas: {
        type: Number,
        default: 0
      },
      gasGHG: {
        type: Number,
        default: 0.0053
      },
      water: {
        type: Number,
        default: 0
      },
      fuelOil2: {
        type: Number,
        default: 0
      },
      fuelOil2GHG: {
        type: Number,
        default: 0.01021
      },
      fuelOil4: {
        type: Number,
        default: 0
      },
      fuelOil4GHG: {
        type: Number,
        default: 0.01096
      },
      fuelOil56: {
        type: Number,
        default: 0
      },
      fuelOil56GHG: {
        type: Number,
        default: 0.01021
      },
      diesel: {
        type: Number,
        default: 0
      },
      dieselGHG: {
        type: Number,
        default: 0.01021
      },
      other: {
        type: Number,
        default: 0
      }
    },
    dates: {
      startDate: {
        type: Date
      },
      endDate: {
        type: Date
      }
    },
    benchmark: {
      general: {
        type: Schema.Types.Mixed,
        default: {}
      },
      heating: {
        type: Schema.Types.Mixed,
        default: {}
      },
      cooling: {
        type: Schema.Types.Mixed,
        default: {}
      },
      lighting: {
        type: Schema.Types.Mixed,
        default: {}
      },
      dhw: {
        type: Schema.Types.Mixed,
        default: {}
      },
      water: {
        type: Schema.Types.Mixed,
        default: {}
      },
      portfolioManager: {
        type: Schema.Types.Mixed,
        default: ""
      },
      pmScores: [pmScoreSchema]
    },
    changePointModels: {
      type: Schema.Types.Mixed,
      default: {}
    },
    endUse: {
      type: Schema.Types.Mixed,
      default: {}
    },
    endUseConfiguration: {
      type: Schema.Types.Mixed,
      default: {}
    },
    endUseActual: {
      type: Schema.Types.Mixed,
      default: {}
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
      },
      buildingId: {
        type: String,
        trim: true,
        default: ""
      },
      auditId: {
        type: String,
        trim: true,
        default: ""
      }
    },
    eaAudit: {
      type: Schema.Types.Mixed,
      default: {}
    },
    nycFields: {
      type: Schema.Types.Mixed,
      default: {}
    },
    eaAuditsInfo: {
      type: Array,
      default: []
    },
    utilityIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "Utility"
      }
    ],
    projectIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "Project"
      }
    ],
    measurePackageIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "MeasurePackage"
      }
    ],
    measurePackageMeasureIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "Project"
      }
    ],
    contacts: [contacts],
    equipment: [{ type: Schema.Types.ObjectId, ref: "BuildingEquipment" }],
    constructions: [
      {
        construction: {
          type: Schema.Types.ObjectId,
          ref: "Constructions"
        },
        comments: {
          type: String
        },
        images: [
          {
            type: String
          }
        ],
        createdByUserId: {
          type: Schema.Types.ObjectId,
          ref: "User"
        },
        updatedAt: {
          type: Date,
          default: Date.now
        },
        createdAt: {
          type: Date,
          default: Date.now
        }
      }
    ],
    locations: [
      {
        location: {
          type: Schema.Types.ObjectId,
          ref: "Location"
        },
        equipment: [
          {
            type: Schema.Types.ObjectId,
            ref: "BuildingEquipment"
          }
        ]
      }
    ],
    operations: [
      {
        schedule: {
          type: Schema.Types.ObjectId,
          ref: "Schedule"
        },
        comments: {
          type: String
        },
        scheduleName: {
          type: String
        },
        monday: [DaySchedule],
        tuesday: [DaySchedule],
        wednesday: [DaySchedule],
        thursday: [DaySchedule],
        friday: [DaySchedule],
        saturday: [DaySchedule],
        sunday: [DaySchedule],
        holiday: [DaySchedule],
        applicableHolidays: [
          {
            type: String
          }
        ],
        startDate: {
          type: String
        },
        endDate: {
          type: String
        },
        weeklyHours: Number,
        holidays: Number,
        annualHours: Number,
        equipmentIds: {
          type: Array,
          default: []
        },
        createdByUserId: {
          type: Schema.Types.ObjectId,
          ref: "User"
        },
        updatedAt: {
          type: Date,
          default: Date.now
        },
        createdAt: {
          type: Date,
          default: Date.now
        }
      }
    ],
    clientName: {
      type: String,
      trim: true
    },
    siteName: {
      type: String,
      trim: true
    },
    tags: {
      type: Array,
      default: []
    },
    salesforce: {
      connectedObjects: {
        type: [SFConnectedAccountsSchema],
        default: []
      }
    },
    createdByUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: 'Field "createdByUserId" is required.'
    },
    rerunAnalyses: {
      type: Boolean,
      default: false
    },
    updated: {
      type: Date,
      default: Date.now
    },
    created: {
      type: Date,
      default: Date.now
    },
    utilityTypes: [
      {
        type: String
      }
    ],
    clientIndustry: {
      type: String,
      trim: true
    },
    _partition: {
      type: String
    },
    newFields: {
      type: Array,
      default: []
    },
    newFieldValues: {
      type: Schema.Types.Mixed,
      default: {}
    },
    utilityMonthlyCost: {
      type: Schema.Types.Mixed,
      default: {}
    },
    commoditySettings: {
      type: Schema.Types.Mixed,
      default: {}
    },
  },
  { usePushEach: true, minimize: false }
);

BuildingSchema.statics.getUseTypeName = function(value) {
  const useTypeName = useTypes.find(useType => value == useType.value);
  if (!useTypeName) {
    return null;
  }
  return useTypeName.name;
};

module.exports.Building = mongoose.model("Building", BuildingSchema);
