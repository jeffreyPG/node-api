const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class BuildingActualEndUse extends Model {}
  BuildingActualEndUse.init(
    {
      // attributes
      __v: {
        type: DataTypes.STRING(512),
        allowNull: true
      },
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
      base_eub_end_air__estimated_consumption: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      base_eub_end_air__percentage: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      base_eub_end_cook__estimated_consumption: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      base_eub_end_cook__percentage: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      base_eub_end_cool__estimated_consumption: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      base_eub_end_cool__percentage: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      base_eub_end_heat__estimated_consumption: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      base_eub_end_heat__percentage: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      base_eub_end_hw__estimated_consumption: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      base_eub_end_hw__percentage: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      base_eub_end_light__estimated_consumption: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      base_eub_end_light__percentage: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      base_eub_end_plug__estimated_consumption: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      base_eub_end_plug__percentage: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      base_eub_end_proc__estimated_consumption: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      base_eub_end_proc__percentage: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      base_eub_end_water__estimated_consumption: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      base_eub_end_water__percentage: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      base_eub_end_conv__estimated_consumption: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      base_eub_end_conv__percentage: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      base_eub_end_ref__estimated_consumption: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      base_eub_end_ref__percentage: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      base_eub_end_it__estimated_consumption: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      base_eub_end_it__percentage: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      base_eub_end_other__estimated_consumption: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      base_eub_end_other__percentage: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      base_eub_end_vent__estimated_consumption: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      base_eub_end_vent__percentage: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      base_eub_fuel_elec_heat__estimated_consumption: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      base_eub_fuel_elec_heat__percentage: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      base_eub_fuel_elec_air__estimated_consumption: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      base_eub_fuel_elec_air__percentage: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      base_eub_fuel_elec_cool__estimated_consumption: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      base_eub_fuel_elec_cool__percentage: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      base_eub_fuel_elec_light__estimated_consumption: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      base_eub_fuel_elec_light__percentage: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      base_eub_fuel_elec_plug__estimated_consumption: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      base_eub_fuel_elec_plug__percentage: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      base_eub_fuel_elec_proc__estimated_consumption: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      base_eub_fuel_elec_proc__percentage: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      base_eub_fuel_elec_water__estimated_consumption: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      base_eub_fuel_elec_water__percentage: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      base_eub_fuel_elec_hw__estimated_consumption: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      base_eub_fuel_elec_hw__percentage: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      base_eub_fuel_elec_conv__estimated_consumption: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      base_eub_fuel_elec_conv__percentage: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      base_eub_fuel_elec_ref__estimated_consumption: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      base_eub_fuel_elec_ref__percentage: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      base_eub_fuel_elec_it__estimated_consumption: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      base_eub_fuel_elec_it__percentage: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      base_eub_fuel_elec_other__estimated_consumption: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      base_eub_fuel_elec_other__percentage: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      base_eub_fuel_elec_vent__estimated_consumption: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      base_eub_fuel_elec_vent__percentage: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      base_eub_fuel_gas_cook__estimated_consumption: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      base_eub_fuel_gas_cook__percentage: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      base_eub_fuel_gas_heat__estimated_consumption: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      base_eub_fuel_gas_heat__percentage: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      base_eub_fuel_gas_hw__estimated_consumption: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      base_eub_fuel_gas_hw__percentage: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      base_eub_fuel_gas_proc__estimated_consumption: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      base_eub_fuel_gas_proc__percentage: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      base_eub_fuel_gas_ref__estimated_consumption: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      base_eub_fuel_gas_ref__percentage: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      base_eub_fuel_gas_other__estimated_consumption: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      base_eub_fuel_gas_other__percentage: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      base_eui: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      base_total_cost__electric: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      base_total_cost__gas: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      base_total_energy__total_kbtu: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      base_total_energy__total_kwh: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      base_total_energy__total_therm: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      base_total_ghg__electric: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      base_total_ghg__gas: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      building: {
        type: DataTypes.STRING(512),
        allowNull: true
      },
      buildingid: {
        type: DataTypes.STRING(512),
        allowNull: true
      },
      createdat: {
        type: DataTypes.DATE,
        allowNull: true
      },
      enddate: {
        type: DataTypes.DATE,
        allowNull: true
      },
      startdate: {
        type: DataTypes.DATE,
        allowNull: true
      },
      updatedat: {
        type: DataTypes.DATE,
        allowNull: true
      },
      prop_eub_end_air__estimated_consumption: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      prop_eub_end_air__percentage: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      prop_eub_end_cook__estimated_consumption: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      prop_eub_end_cook__percentage: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      prop_eub_end_cool__estimated_consumption: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      prop_eub_end_cool__percentage: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      prop_eub_end_heat__estimated_consumption: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      prop_eub_end_heat__percentage: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      prop_eub_end_hw__estimated_consumption: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      prop_eub_end_hw__percentage: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      prop_eub_end_light__estimated_consumption: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      prop_eub_end_light__percentage: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      prop_eub_end_plug__estimated_consumption: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      prop_eub_end_plug__percentage: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      prop_eub_end_proc__estimated_consumption: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      prop_eub_end_proc__percentage: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      prop_eub_end_water__estimated_consumption: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      prop_eub_end_water__percentage: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      prop_eub_end_conv__estimated_consumption: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      prop_eub_end_conv__percentage: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      prop_eub_end_ref__estimated_consumption: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      prop_eub_end_ref__percentage: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      prop_eub_end_it__estimated_consumption: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      prop_eub_end_it__percentage: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      prop_eub_end_other__estimated_consumption: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      prop_eub_end_other__percentage: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      prop_eub_end_vent__estimated_consumption: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      prop_eub_end_vent__percentage: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      prop_eub_fuel_elec_air__estimated_consumption: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      prop_eub_fuel_elec_air__percentage: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      prop_eub_fuel_elec_cool__estimated_consumption: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      prop_eub_fuel_elec_cool__percentage: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      prop_eub_fuel_elec_light__estimated_consumption: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      prop_eub_fuel_elec_light__percentage: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      prop_eub_fuel_elec_plug__estimated_consumption: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      prop_eub_fuel_elec_plug__percentage: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      prop_eub_fuel_elec_proc__estimated_consumption: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      prop_eub_fuel_elec_proc__percentage: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      prop_eub_fuel_elec_heat__estimated_consumption: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      prop_eub_fuel_elec_heat__percentage: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      prop_eub_fuel_elec_water__estimated_consumption: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      prop_eub_fuel_elec_water__percentage: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      prop_eub_fuel_elec_hw__estimated_consumption: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      prop_eub_fuel_elec_hw__percentage: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      prop_eub_fuel_elec_conv__estimated_consumption: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      prop_eub_fuel_elec_conv__percentage: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      prop_eub_fuel_elec_ref__estimated_consumption: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      prop_eub_fuel_elec_ref__percentage: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      prop_eub_fuel_elec_cook__estimated_consumption: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      prop_eub_fuel_elec_cook__percentage: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      prop_eub_fuel_elec_it__estimated_consumption: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      prop_eub_fuel_elec_it__percentage: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      prop_eub_fuel_elec_other__estimated_consumption: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      prop_eub_fuel_elec_other__percentage: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      prop_eub_fuel_elec_vent__estimated_consumption: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      prop_eub_fuel_elec_vent__percentage: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      prop_eub_fuel_gas_cook__estimated_consumption: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      prop_eub_fuel_gas_cook__percentage: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      prop_eub_fuel_gas_heat__estimated_consumption: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      prop_eub_fuel_gas_heat__percentage: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      prop_eub_fuel_gas_hw__estimated_consumption: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      prop_eub_fuel_gas_hw__percentage: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      prop_eub_fuel_gas_proc__estimated_consumption: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      prop_eub_fuel_gas_proc__percentage: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      prop_eub_fuel_gas_ref__estimated_consumption: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      prop_eub_fuel_gas_ref__percentage: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      prop_eub_fuel_gas_other__estimated_consumption: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      prop_eub_fuel_gas_other__percentage: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      prop_eui: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      prop_total_cost__electric: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      prop_total_cost__gas: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      prop_total_energy__total_kbtu_proposed: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      prop_total_energy__total_kwh_proposed: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      prop_total_energy__total_therm_proposed: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      prop_total_ghg__electric: {
        type: DataTypes.DOUBLE,
        allowNull: true
      },
      prop_total_ghg__gas: {
        type: DataTypes.DOUBLE,
        allowNull: true
      }
    },
    {
      modelName: "BuildingActualEndUse",
      timestamps: false,
      freezeTableName: true,
      tableName: "actualenduses_v",
      sequelize,
      schema: process.env.POSTGRES_SCHEMA_TWO
      // options
    }
  );

  return BuildingActualEndUse;
};
