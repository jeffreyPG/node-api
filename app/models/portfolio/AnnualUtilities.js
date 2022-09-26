const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class AnnualUtilities extends Model {}
  AnnualUtilities.init(
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
      organization_id: {
        type: DataTypes.STRING(50),
        reference: {
          model: "Organization",
          key: "_id"
        },
        allowNull: true
      },
      util_type: {
        type: DataTypes.STRING(50)
      },
      year: {
        type: DataTypes.DOUBLE
      },
      annual_cost: {
        type: DataTypes.DOUBLE
      },
      annual_usage: {
        type: DataTypes.DOUBLE
      },
      demand_cost: {
        type: DataTypes.DOUBLE
      },
      demand_usage: {
        type: DataTypes.DOUBLE
      },
      year_type: {
        type: DataTypes.STRING(50)
      },
      usage_to_kbtu_rate: {
        type: DataTypes.DOUBLE
      },
      total_usage_kbtu: {
        type: DataTypes.DOUBLE
      },
      cost_per_unit: {
        type: DataTypes.DOUBLE
      },
      data_type: {
        type: DataTypes.STRING(50)
      }
    },
    {
      modelName: "AnnualUtilities",
      timestamps: false,
      freezeTableName: true,
      tableName: "dw_annual_utilities_pivot_fact_actual",
      sequelize,
      schema: process.env.POSTGRES_SCHEMA_ONE
      // options
    }
  );

  AnnualUtilities.associate = function(models) {
    AnnualUtilities.belongsTo(models.Organization, {
      foreignKey: "organization_id",
      as: "organization"
    });
    AnnualUtilities.belongsTo(models.Building, {
      foreignKey: "building_id",
      as: "building"
    });
  };
  return AnnualUtilities;
};
