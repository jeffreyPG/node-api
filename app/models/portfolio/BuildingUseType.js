const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class BuildingUseType extends Model {}
  BuildingUseType.init(
    {
      // attributes
      _id: {
        type: DataTypes.STRING(50),
        allowNull: false
      },
      building_id: {
        type: DataTypes.STRING(50),
        allowNull: false,
        primaryKey: true,
        reference: {
          model: "Building",
          key: "_id"
        }
      },
      _sdc_level_0_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true
      },
      use: {
        type: DataTypes.STRING(100),
        allowNull: true
      },
      squarefeet: {
        type: DataTypes.INTEGER,
        allowNull: true
      }
    },
    {
      modelName: "BuildingUseType",
      timestamps: false,
      freezeTableName: true,
      tableName: "dw_building_usetype_dim",
      sequelize,
      schema: process.env.POSTGRES_SCHEMA_ONE
      // options
    }
  );

  return BuildingUseType;
};
