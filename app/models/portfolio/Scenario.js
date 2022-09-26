
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Scenario extends Model {}
  Scenario.init({
    // attributes
    _id: {
      type: DataTypes.STRING(512),
      primaryKey: true
    },
    organization_id:{
      type: DataTypes.STRING(512),
    },
    estimatedcompletiondate:{
      type: DataTypes.DATE,
      allowNull: true
    },
    estimatedcompletionyear:{
      type: DataTypes.BIGINT,
      allowNull: true
    },
    util_type:{
      type: DataTypes.STRING(11),
      allowNull: true
    },
    total_usage_savings:{
      type: DataTypes.DECIMAL,
      allowNull: true
    },
    ghg_emissions_savings:{
      type: DataTypes.DECIMAL,
      allowNull: true
    },
  }, {
    modelName: 'Scenario',
    timestamps: false,
    freezeTableName: true,
    tableName: 'dw_scenarios_dim',
    sequelize,
    schema: process.env.POSTGRES_SCHEMA_ONE
    // options
  });

  return Scenario;
}