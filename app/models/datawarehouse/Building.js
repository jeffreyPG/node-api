const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Scenario extends Model {}
  Scenario.init(
    {
      // attributes
      _id: {
        type: DataTypes.STRING(512),
        primaryKey: true
      },
      _sdc_batched_at: {
        type: DataTypes.DATE,
        allowNull: true
      },
      _sdc_extracted_at: {
        type: DataTypes.DATE,
        allowNull: true
      },
      _sdc_received_at: {
        type: DataTypes.DATE,
        allowNull: true
      },
      _sdc_sequence: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      _sdc_table_version: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      archived: {
        type: DataTypes.BOOLEAN,
        allowNull: true
      },
      buildYear: {
        type: DataTypes.BIGINT,
        allowNull: true
      },
      buildingImage: {
        type: DataTypes.STRING(512),
        allowNull: true
      },
      buildingName: {
        type: DataTypes.STRING(1024),
        allowNull: true
      },
      buildingUse: {
        type: DataTypes.STRING(200),
        allowNull: true
      },
      clientName: {
        type: DataTypes.STRING(200),
        allowNull: true
      },
      created: {
        type: DataTypes.DATE,
        allowNull: true
      },
      createdByUserId: {
        type: DataTypes.STRING(100),
        allowNull: true
      },
      energystar: {
        type: DataTypes.BOOLEAN,
        allowNull: true
      },
      floorCount: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      belowgradefloorcount: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      location__address: {
        type: DataTypes.STRING(512),
        allowNull: true
      },
      location__city: {
        type: DataTypes.STRING(100),
        allowNull: true
      },
      location__state: {
        type: DataTypes.STRING(100),
        allowNull: true
      },
      location__zipCode: {
        type: DataTypes.CHAR(20),
        allowNull: true
      },
      nycFields__bin: {
        type: DataTypes.STRING(100),
        allowNull: true
      },
      nycFields__borough: {
        type: DataTypes.STRING(100),
        allowNull: true
      },
      nycFields__historicBuilding: {
        type: DataTypes.STRING(100),
        allowNull: true
      },
      nycFields__multiTenant: {
        type: DataTypes.STRING(100),
        allowNull: true
      },
      nycFields__percentLeased: {
        type: DataTypes.STRING(100),
        allowNull: true
      },
      nycFields__percentOwned: {
        type: DataTypes.STRING(100),
        allowNull: true
      },
      nycFields__taxLot: {
        type: DataTypes.STRING(100),
        allowNull: true
      },
      nycFields__block: {
        type: DataTypes.STRING(100),
        allowNull: true
      },
      open247: {
        type: DataTypes.STRING(100),
        allowNull: true
      },
      rates__diesel: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      rates__dieselGHG: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      rates__discountRate: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      rates__electric: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      rates__electricGHG: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      rates__financeRate: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      rates__fuel: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      rates__fuelOil2: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      rates__fuelOil2GHG: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      rates__fuelOil4: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      rates__fuelOil4GHG: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      rates__fuelOil56: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      rates__fuelOil56GHG: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      rates__gas: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      rates__gasGHG: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      rates__inflationRate: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      rates__investmentPeriod: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      rates__other: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      rates__reinvestmentRate: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      rates__steam: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      rates__steamGHG: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      rerunAnalyses: {
        type: DataTypes.BOOLEAN,
        allowNull: true
      },
      siteName: {
        type: DataTypes.STRING(200),
        allowNull: true
      },
      squareFeet: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      updated: {
        type: DataTypes.DATE,
        allowNull: true
      },
      "changePointModels__natural-gas__baseload": {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      changePointModels__electric__cooling_sensitivity: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      "changePointModels__natural-gas__heating_sensitivity": {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      changePointModels__steam__baseload: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      changePointModels__electric__heating_sensitivity: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      changePointModels__electric__baseload: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      changePointModels__electric__heating_change_point: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      changePointModels__steam__heating_sensitivity: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      "changePointModels__natural-gas__heating_change_point": {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      changePointModels__steam__heating_change_point: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      changePointModels__electric__cooling_change_point: {
        type: DataTypes.DOUBLE,
        allowNull: true
      }
    },
    {
      modelName: "Building",
      timestamps: false,
      freezeTableName: true,
      tableName: "buildings_loaded_from_api",
      sequelize,
      schema: process.env.POSTGRES_SCHEMA_TWO
      // options
    }
  );

  return Scenario;
};
