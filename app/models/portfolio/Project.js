const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Project extends Model {}
  Project.init(
    {
      // attributes
      _id: {
        type: DataTypes.STRING(512),
        allowNull: false,
        primaryKey: true
      },
      building_id: {
        type: DataTypes.STRING(512),
        reference: {
          model: "Building",
          key: "_id"
        },
        allowNull: true
      },
      created: {
        type: DataTypes.DATE,
        allowNull: true
      },
      createdbyuserid: {
        type: DataTypes.STRING(100),
        allowNull: true
      },
      updated: {
        type: DataTypes.DATE,
        allowNull: true
      },
      displayname: {
        type: DataTypes.STRING(512),
        allowNull: true
      },
      // incentive_utility_company: {
      //   type: DataTypes.STRING(512),
      //   allowNull: true
      // },
      // incentive_rebate_code: {
      //   type: DataTypes.STRING(512),
      //   allowNull: true,
      // },
      metric_annualsavings: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      metric_annualelectricsavings: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      metric_annualgassavings: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      metric_electricsavings: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      metric_energysavings: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      metric_gassavings: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      metric_ghgsavingscost: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      metric_ghgsavings: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      metric_projectcost: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      metric_incentive: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      metric_eul: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      metric_demandsavings: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      initialvalues_maintenance_savings: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      metric_simple_payback: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      project_application: {
        type: DataTypes.STRING(512),
        allowNull: true
      },
      project_category: {
        type: DataTypes.STRING(512),
        allowNull: true
      },
      project_technology: {
        type: DataTypes.STRING(512),
        allowNull: true
      },
      category: {
        type: DataTypes.STRING(512),
        allowNull: true
      },
      fuel: {
        type: DataTypes.STRING(512),
        allowNull: true
      },
      name: {
        type: DataTypes.STRING(512),
        allowNull: true
      },
      originaldisplayname: {
        type: DataTypes.STRING(512),
        allowNull: true
      },
      status: {
        type: DataTypes.STRING(512),
        allowNull: true
      },
      type: {
        type: DataTypes.STRING(100),
        allowNull: true
      }
    },
    {
      modelName: "Project",
      timestamps: false,
      freezeTableName: true,
      tableName: "dw_projects_fact",
      sequelize,
      schema: process.env.POSTGRES_SCHEMA_ONE
      // options
    }
  );

  Project.associate = function(models) {
    Project.belongsTo(models.Building, {
      foreignKey: "building_id",
      as: "building"
    });
  };
  return Project;
};
