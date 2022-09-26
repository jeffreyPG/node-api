const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class BuildingPmScore extends Model {}
  BuildingPmScore.init(
    {
      // attributes
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
      score: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      year: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      _sdc_batched_at: {
        type: DataTypes.DATE,
        allowNull: true
      }
    },
    {
      modelName: "BuildingPmScore",
      timestamps: false,
      freezeTableName: true,
      tableName: "dw_buildings_pmscores_fact",
      sequelize,
      schema: process.env.POSTGRES_SCHEMA_ONE
      // options
    }
  );

  return BuildingPmScore;
};
