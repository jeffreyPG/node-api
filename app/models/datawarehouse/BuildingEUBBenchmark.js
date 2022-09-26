const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class BuildingEUBBenchmark extends Model {}
  BuildingEUBBenchmark.init(
    {
      // attributes
      building_id: {
        type: DataTypes.STRING(512),
        allowNull: true
      },
      created: {
        type: DataTypes.DATE,
        allowNull: true
      },
      'computing-energy-estimate__pct_elec': {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      'computing-energy-estimate__pct_gas': {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      'computing-energy-estimate__percentage': {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      'cooking-energy-estimate__pct_elec': {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      'cooking-energy-estimate__pct_gas': {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      'cooking-energy-estimate__percentage': {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      'cooling-energy-estimate__pct_elec': {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      'cooling-energy-estimate__pct_gas': {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      'cooling-energy-estimate__percentage': {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      'dhw-energy-estimate__pct_elec': {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      'dhw-energy-estimate__pct_gas': {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      'dhw-energy-estimate__percentage': {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      'dishwasher-energy-estimate__pct_elec': {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      'dishwasher-energy-estimate__pct_gas': {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      'dishwasher-energy-estimate__percentage': {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      'fan-energy-estimate__pct_elec': {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      'fan-energy-estimate__pct_gas': {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      'fan-energy-estimate__percentage': {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      'freezer-energy-estimate__pct_elec': {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      'freezer-energy-estimate__pct_gas': {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      'freezer-energy-estimate__percentage': {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      'heating-energy-estimate__pct_elec': {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      'heating-energy-estimate__pct_gas': {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      'heating-energy-estimate__percentage': {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      'hw-energy-estimate__pct_elec': {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      'hw-energy-estimate__pct_gas': {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      'hw-energy-estimate__percentage': {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      'laundry-energy-estimate__pct_elec': {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      'laundry-energy-estimate__pct_gas': {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      'laundry-energy-estimate__percentage': {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      'lighting-energy-estimate__pct_elec': {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      'lighting-energy-estimate__pct_gas': {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      'lighting-energy-estimate__percentage': {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      'microwave-energy-estimate__pct_elec': {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      'microwave-energy-estimate__pct_gas': {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      'microwave-energy-estimate__percentage': {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      'office-equipment-energy-estimate__pct_elec': {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      'office-equipment-energy-estimate__pct_gas': {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      'office-equipment-energy-estimate__percentage': {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      'other-energy-estimate__pct_elec': {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      'other-energy-estimate__pct_gas': {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      'other-energy-estimate__percentage': {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      'other-estimate__pct_elec': {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      'other-estimate__pct_gas': {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      'other-estimate__percentage': {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      'pool-energy-estimate__pct_elec': {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      'pool-energy-estimate__pct_gas': {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      'pool-energy-estimate__percentage': {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      'refrigeration-energy-estimate__pct_elec': {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      'refrigeration-energy-estimate__pct_gas': {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      'refrigeration-energy-estimate__percentage': {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      'tv-energy-estimate__pct_elec': {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      'tv-energy-estimate__pct_gas': {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      'tv-energy-estimate__percentage': {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      'ventilation-estimate__pct_elec': {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      'ventilation-estimate__pct_gas': {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      'ventilation-estimate__percentage': {
        type: DataTypes.DOUBLE,
        allowNull: true
      }
    },
    {
      modelName: "BuildingEUBBenchmark",
      timestamps: false,
      freezeTableName: true,
      tableName: "eub_benchmark_v",
      sequelize,
      schema: process.env.POSTGRES_SCHEMA_TWO
      // options
    }
  );

  BuildingEUBBenchmark.removeAttribute('id')

  return BuildingEUBBenchmark;
};
