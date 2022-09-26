const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Utility extends Model {}
  Utility.init(
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
      year: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true
      },
      annual_energy_use: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      energy_use_intensity: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      annual_energy_cost: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      energy_cost_intensity: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      annual_ghg_emissions: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      ghg_intensity: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      annual_electricity_use: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      annual_electricity_cost: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      annual_electricity_demand_use: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      annual_electricity_demand_cost: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      annual_natural_gas_use: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      annual_natural_gas_cost: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      annual_water_use: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      annual_water_cost: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      water_use_intensity: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      annual_fuel_oil2_use: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      annual_fuel_oil2_cost: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      annual_fuel_oil4_use: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      annual_fuel_oil4_cost: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      annual_fuel_oil56_use: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      annual_fuel_oil56_cost: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      annual_steam_use: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      annual_steam_cost: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      annual_diesel_use: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      annual_diesel_cost: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      _sdc_batched_at: {
        type: DataTypes.DATE,
        allowNull: true
      },
      year_type: {
        type: DataTypes.STRING(20),
        allowNull: true,
        primaryKey: true
      }
    },
    {
      modelName: "Utility",
      timestamps: false,
      freezeTableName: true,
      tableName: "dw_annual_utilities_fact",
      sequelize,
      schema: process.env.POSTGRES_SCHEMA_ONE
      // options
    }
  );

  // Utility.associate = function(models){
  //   Utility.belongsTo(models.Building)
  // }

  return Utility;
};
