const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class OrganizationTarget extends Model {}
  OrganizationTarget.init(
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
      name: {
        type: DataTypes.STRING(512),
        allowNull: true
      },
      description: {
        type: DataTypes.STRING(512),
        allowNull: true
      },
      baselineyear: {
        type: DataTypes.STRING(512),
        allowNull: true
      },
      targetyear: {
        type: DataTypes.STRING(512),
        allowNull: true
      },
      reduction: {
        type: DataTypes.STRING(512),
        allowNull: true
      }
    },
    {
      modelName: "OrganizationTarget",
      timestamps: false,
      freezeTableName: true,
      tableName: "organizations_targets_loaded_from_api",
      sequelize,
      schema: process.env.POSTGRES_SCHEMA_TWO
      // options
    }
  );

  return OrganizationTarget;
};
