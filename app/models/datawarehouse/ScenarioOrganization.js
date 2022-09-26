const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ScenarioOrganization extends Model {}
  ScenarioOrganization.init(
    {
      // attributes
      _sdc_source_key__id: {
        type: DataTypes.STRING(512),
        primaryKey: true
      },
      _sdc_level_0_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        allowNull: false
      },
      buildingid: {
        type: DataTypes.STRING(512),
        primaryKey: true
      },
      organization__id: {
        type: DataTypes.STRING(512),
        allowNull: true
      },
      organization_name: {
        type: DataTypes.STRING(512),
        allowNull: true
      }
    },
    {
      modelName: "ScenarioOrganization",
      timestamps: false,
      freezeTableName: true,
      tableName: "scenarios_organizations_loaded_from_api",
      sequelize,
      schema: process.env.POSTGRES_SCHEMA_TWO
      // options
    }
  );

  return ScenarioOrganization;
};
