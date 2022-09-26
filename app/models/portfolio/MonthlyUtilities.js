const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class MonthlyUtilities extends Model {}
  MonthlyUtilities.init(
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
        allowNull: false
      },
      util_type: {
        type: DataTypes.STRING(50),
        allowNull: false
      },
      month: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      year: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      year_month: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      monthly_cost: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      monthly_usage: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      demand_cost: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      demand_usage: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      usage_to_kbtu_rate: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      total_usage_kbtu: {
        type: DataTypes.DOUBLE,
        allowNull: true
      }
    },
    {
      modelName: "MonthlyUtilities",
      timestamps: false,
      freezeTableName: true,
      tableName: "dw_monthly_utilities_fact",
      sequelize,
      schema: process.env.POSTGRES_SCHEMA_ONE
      // options
    }
  );

  MonthlyUtilities.associate = function(models) {
    MonthlyUtilities.belongsTo(models.Organization, {
      foreignKey: "organization_id",
      as: "organization"
    });
    MonthlyUtilities.belongsTo(models.Building, {
      foreignKey: "building_id",
      as: "building"
    });
  };
  return MonthlyUtilities;
};
