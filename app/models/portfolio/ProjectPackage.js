const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ProjectPackage extends Model {}
  ProjectPackage.init(
    {
      // attributes
      _id: {
        type: DataTypes.STRING(512),
        allowNull: false,
        primaryKey: true
      },

      buildingid: {
        type: DataTypes.STRING(512),
        reference: {
          model: "Building",
          key: "_id"
        },
        allowNull: true
      },

      organization_id: {
        type: DataTypes.STRING(50),
        reference: {
          model: "Organization",
          key: "_id"
        },
        allowNull: true
      },

      status: {
        type: DataTypes.STRING(512),
        defaultValue: "Identified",
        allowNull: true
      },

      constructionstatus: {
        type: DataTypes.STRING(512),
        defaultValue: "Conceptual design",
        allowNull: true
      },

      name: {
        type: DataTypes.STRING(512),
        defaultValue: "",
        allowNull: true
      },

      description: {
        type: DataTypes.STRING(512),
        defaultValue: "",
        allowNull: true
      },

      estimatedstartdate: {
        type: DataTypes.DATE,
        allowNull: true
      },

      estimatedcompletiondate: {
        type: DataTypes.DATE,
        allowNull: true
      },

      actualstartdate: {
        type: DataTypes.DATE,
        allowNull: true
      },

      actualcompletiondate: {
        type: DataTypes.DATE,
        allowNull: true
      },

      created: {
        type: DataTypes.DATE,
        allowNull: true
      },

      updated: {
        type: DataTypes.DATE,
        allowNull: true
      },

      createdbyuserid: {
        type: DataTypes.STRING(100),
        allowNull: true
      },

      total_projectcost: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },

      total_incentive: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },

      total_annualsavings: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },

      total_annualelectricsavings: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },

      total_annualgassavings: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },

      total_electric: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },

      total_gassavings: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },

      total_ghgsavings: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },

      total_ghgsavingscost: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },

      total_watersavings: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },

      total_simplepayback: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },

      total_npv: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },

      total_sir: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },

      total_calculationtype: {
        type: DataTypes.STRING(512),
        allowNull: true
      },

      total_eul: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },

      total_demandsavings: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },

      total_demandsavings: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },

      total_maintenancesavings: {
        type: DataTypes.DOUBLE,
        allowNull: true
      }
    },
    {
      modelName: "ProjectPackage",
      timestamps: false,
      freezeTableName: true,
      tableName: "dw_projectpackages_dim",
      sequelize,
      schema: process.env.POSTGRES_SCHEMA_ONE
      // options
    }
  );

  ProjectPackage.associate = function(models) {
    ProjectPackage.belongsTo(models.Building, {
      foreignKey: "buildingid",
      as: "building"
    });
  };
  return ProjectPackage;
};
