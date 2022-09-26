const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Scenario extends Model {}
  Scenario.init(
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
      _sdc_batched_at: {
        type: DataTypes.DATE,
        primaryKey: true
      },
      _sdc_received_at: {
        type: DataTypes.DATE,
        primaryKey: true
      },
      _sdc_sequence: {
        type: DataTypes.DOUBLE
      },
      _sdc_table_version: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      value: {
        type: DataTypes.STRING(512),
        allowNull: true
      }
    },
    {
      modelName: "OrganizationBuilding",
      timestamps: false,
      freezeTableName: true,
      tableName: "organizations__buildingIds_loaded_from_api",
      sequelize,
      schema: process.env.POSTGRES_SCHEMA_TWO
    }
  );

  return Scenario;
};
