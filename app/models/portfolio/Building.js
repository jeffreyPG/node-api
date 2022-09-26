const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Building extends Model {}
  Building.init(
    {
      // attributes
      _id: {
        type: DataTypes.STRING(100),
        allowNull: false,
        primaryKey: true
      },
      archived: {
        type: DataTypes.BOOLEAN,
        allowNull: true
      },
      buildingimage: {
        type: DataTypes.STRING(512),
        allowNull: true
      },
      buildingname: {
        type: DataTypes.STRING(1024),
        allowNull: true
      },
      buildinguse: {
        type: DataTypes.STRING(200),
        allowNull: true
      },
      buildyear: {
        type: DataTypes.BIGINT,
        allowNull: true
      },
      clientname: {
        type: DataTypes.STRING(200),
        allowNull: true
      },
      created: {
        type: DataTypes.DATE,
        allowNull: true
      },
      createdbyuserid: {
        type: DataTypes.STRING(100),
        allowNull: true
      },
      energystar: {
        type: DataTypes.BOOLEAN,
        allowNull: true
      },
      floorcount: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      belowgradefloorcount: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      location_address: {
        type: DataTypes.STRING(512),
        allowNull: true
      },
      location_city: {
        type: DataTypes.STRING(100),
        allowNull: true
      },
      location_state: {
        type: DataTypes.STRING(100),
        allowNull: true
      },
      location_zipcode: {
        type: DataTypes.CHAR(20),
        allowNull: true
      },
      nycfields_bin: {
        type: DataTypes.STRING(100),
        allowNull: true
      },
      nycfields_borough: {
        type: DataTypes.STRING(100),
        allowNull: true
      },
      // nycfields_energy_sys_multiple_lots:{
      //   type: DataTypes.STRING(100),
      //   allowNull: true
      // },
      // nycfields_energy_sys_single_lotst:{
      //   type: DataTypes.STRING(100),
      //   allowNull: true
      // },
      nycfields_historicbuilding: {
        type: DataTypes.STRING(100),
        allowNull: true
      },
      nycfields_multitenant: {
        type: DataTypes.STRING(100),
        allowNull: true
      },
      nycfields_percentleased: {
        type: DataTypes.STRING(100),
        allowNull: true
      },
      nycfields_percentowned: {
        type: DataTypes.STRING(100),
        allowNull: true
      },
      nycfields_taxlot: {
        type: DataTypes.STRING(100),
        allowNull: true
      },
      nycfields_block: {
        type: DataTypes.STRING(100),
        allowNull: true
      },
      open247: {
        type: DataTypes.STRING(100),
        allowNull: true
      },
      rates_diesel: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      rates_dieselghg: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      rates_discountrate: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      rates_electric: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      rates_electricghg: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      rates_financerate: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      rates_fuel: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      rates_fueloil2: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      rates_fueloil2ghg: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      rates_fueloil4: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      rates_fueloil4ghg: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      rates_fueloil56: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      rates_fueloil56ghg: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      rates_gas: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      rates_gasghg: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      rates_inflationrate: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      rates_investmentperiod: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      rates_other: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      rates_investmentperiod: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      rates_other: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      rates_reinvestmentrate: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      rates_steam: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      rates_steamghg: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      rates_water: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      sitename: {
        type: DataTypes.STRING(200),
        allowNull: true
      },
      squarefeet: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      updated: {
        type: DataTypes.DATE,
        allowNull: true
      },
      organization_id: {
        type: DataTypes.STRING(50),
        reference: {
          model: "Organization",
          key: "_id"
        },
        allowNull: true
      }
    },
    {
      modelName: "Building",
      timestamps: false,
      freezeTableName: true,
      tableName: "dw_buildings_dim",
      sequelize,
      schema: process.env.POSTGRES_SCHEMA_ONE
      // options
    }
  );

  Building.associate = function(models) {
    Building.belongsTo(models.Organization, {
      foreignKey: "organization_id",
      as: "organization"
    });
    Building.hasMany(models.Utility, {
      foreignKey: "building_id",
      sourceKey: "_id",
      as: "monthlyUtilities"
    });

    Building.hasMany(models.BuildingUseType, {
      foreignKey: "building_id",
      sourceKey: "_id",
      as: "buildingUseTypes"
    });

    Building.hasMany(models.Project, {
      foreignKey: "building_id",
      sourceKey: "_id",
      as: "projects"
    });

    Building.hasMany(models.BuildingPmScore, {
      foreignKey: "building_id",
      sourceKey: "_id",
      as: "buildingPmScores"
    });
  };
  return Building;
};
