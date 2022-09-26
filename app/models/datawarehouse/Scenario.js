const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Scenario extends Model {}
  Scenario.init(
    {
      // attributes
      _id: {
        type: DataTypes.STRING(512),
        primaryKey: true
      },
      name: {
        type: DataTypes.STRING(512),
        allowNull: true
      },
      description: {
        type: DataTypes.STRING(512),
        allowNull: true
      },
      createdbyuserid: {
        type: DataTypes.STRING(512),
        allowNull: true
      },
      updated: {
        type: DataTypes.DATE,
        allowNull: true
      },
      created: {
        type: DataTypes.DATE,
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
      metric_projectcost: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      metric_annualsavings: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      metric_electricsavings: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      metric_gassavings: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      metric_ghgsavings: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      metric_ghgsavingscost: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      metric_energysavings: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      metric_watersavings: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      metric_incentive: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      metric_roi: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      metric_simple_payback: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      metric_npv: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      metric_sir: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      metric_demandsavings: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      metric_eul: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      metric_maintenancesavings: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      metric_ghgelectric: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      metric_ghggas: {
        type: DataTypes.DOUBLE,
        allowNull: true
      }
    },
    {
      modelName: "Scenario",
      timestamps: false,
      freezeTableName: true,
      tableName: "scenarios_loaded_from_api",
      sequelize,
      schema: process.env.POSTGRES_SCHEMA_TWO
      // options
    }
  );

  return Scenario;
};
