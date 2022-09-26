const mongoose = require("mongoose");
const ActualEndUse = mongoose.model("ActualEndUse");
const datawarehouseDb = require("../models/datawarehouse");

async function createActualEndUse(data) {
  const actualEndUse = new ActualEndUse(data);
  try {
    console.log(
      "-------------------ActualEndUse data pushed changed to postgres database------------"
    );
    await datawarehouseDb.BuildingActualEndUse.destroy({
      where: {
        _id: data.buildingId,
        startdate: data.startDate,
        enddate: data.endDate
      }
    });
    const { baseline, proposed } = data;
    let body = {
      _id: data.buildingId,
      building: data.buildingId,
      buildingid: data.buildingId,
      startdate: data.startDate,
      enddate: data.endDate,
      __v: 0,
      _sdc_batched_at: Date.now(),
      _sdc_extracted_at: Date.now(),
      _sdc_received_at: Date.now(),
      _sdc_sequence: 0,
      _sdc_table_version: 0,
      createdat: Date.now(),
      updatedat: Date.now(),
      base_eub_end_air__estimated_consumption:
        (baseline &&
          baseline.eubResults &&
          baseline.eubResults.end_uses &&
          baseline.eubResults.end_uses["Air distribution (fans)"] &&
          baseline.eubResults.end_uses["Air distribution (fans)"]
            .estimated_consumption) ||
        0,
      base_eub_end_air__percentage:
        (baseline &&
          baseline.eubResults &&
          baseline.eubResults.end_uses &&
          baseline.eubResults.end_uses["Air distribution (fans)"] &&
          baseline.eubResults.end_uses["Air distribution (fans)"].percentage) ||
        0,
      base_eub_end_cook__estimated_consumption:
        (baseline &&
          baseline.eubResults &&
          baseline.eubResults.end_uses &&
          baseline.eubResults.end_uses["Cooking"] &&
          baseline.eubResults.end_uses["Cooking"].estimated_consumption) ||
        0,
      base_eub_end_cook__percentage:
        (baseline &&
          baseline.eubResults &&
          baseline.eubResults.end_uses &&
          baseline.eubResults.end_uses["Cooking"] &&
          baseline.eubResults.end_uses["Cooking"].percentage) ||
        0,
      base_eub_end_cool__estimated_consumption:
        (baseline &&
          baseline.eubResults &&
          baseline.eubResults.end_uses &&
          baseline.eubResults.end_uses["Space cooling"] &&
          baseline.eubResults.end_uses["Space cooling"]
            .estimated_consumption) ||
        0,
      base_eub_end_cool__percentage:
        (baseline &&
          baseline.eubResults &&
          baseline.eubResults.end_uses &&
          baseline.eubResults.end_uses["Space cooling"] &&
          baseline.eubResults.end_uses["Space cooling"].percentage) ||
        0,
      base_eub_end_heat__estimated_consumption:
        (baseline &&
          baseline.eubResults &&
          baseline.eubResults.end_uses &&
          baseline.eubResults.end_uses["Space heating"] &&
          baseline.eubResults.end_uses["Space heating"]
            .estimated_consumption) ||
        0,
      base_eub_end_heat__percentage:
        (baseline &&
          baseline.eubResults &&
          baseline.eubResults.end_uses &&
          baseline.eubResults.end_uses["Space heating"] &&
          baseline.eubResults.end_uses["Space heating"].percentage) ||
        0,
      base_eub_end_hw__estimated_consumption:
        (baseline &&
          baseline.eubResults &&
          baseline.eubResults.end_uses &&
          baseline.eubResults.end_uses["SHW/DHW"] &&
          baseline.eubResults.end_uses["SHW/DHW"].estimated_consumption) ||
        0,
      base_eub_end_hw__percentage:
        (baseline &&
          baseline.eubResults &&
          baseline.eubResults.end_uses &&
          baseline.eubResults.end_uses["SHW/DHW"] &&
          baseline.eubResults.end_uses["SHW/DHW"].percentage) ||
        0,
      base_eub_end_light__estimated_consumption:
        (baseline &&
          baseline.eubResults &&
          baseline.eubResults.end_uses &&
          baseline.eubResults.end_uses["Lighting"] &&
          baseline.eubResults.end_uses["Lighting"].estimated_consumption) ||
        0,
      base_eub_end_light__percentage:
        (baseline &&
          baseline.eubResults &&
          baseline.eubResults.end_uses &&
          baseline.eubResults.end_uses["Lighting"] &&
          baseline.eubResults.end_uses["Lighting"].percentage) ||
        0,
      base_eub_end_plug__estimated_consumption:
        (baseline &&
          baseline.eubResults &&
          baseline.eubResults.end_uses &&
          baseline.eubResults.end_uses["Plug loads"] &&
          baseline.eubResults.end_uses["Plug loads"].estimated_consumption) ||
        0,
      base_eub_end_plug__percentage:
        (baseline &&
          baseline.eubResults &&
          baseline.eubResults.end_uses &&
          baseline.eubResults.end_uses["Plug loads"] &&
          baseline.eubResults.end_uses["Plug loads"].percentage) ||
        0,
      base_eub_end_proc__estimated_consumption:
        (baseline &&
          baseline.eubResults &&
          baseline.eubResults.end_uses &&
          baseline.eubResults.end_uses["Process loads"] &&
          baseline.eubResults.end_uses["Process loads"]
            .estimated_consumption) ||
        0,
      base_eub_end_proc__percentage:
        (baseline &&
          baseline.eubResults &&
          baseline.eubResults.end_uses &&
          baseline.eubResults.end_uses["Process loads"] &&
          baseline.eubResults.end_uses["Process loads"].percentage) ||
        0,
      base_eub_end_water__estimated_consumption:
        (baseline &&
          baseline.eubResults &&
          baseline.eubResults.end_uses &&
          baseline.eubResults.end_uses["Water Distribution"] &&
          baseline.eubResults.end_uses["Water Distribution"]
            .estimated_consumption) ||
        0,
      base_eub_end_water__percentage:
        (baseline &&
          baseline.eubResults &&
          baseline.eubResults.end_uses &&
          baseline.eubResults.end_uses["Water Distribution"] &&
          baseline.eubResults.end_uses["Water Distribution"].percentage) ||
        0,
      base_eub_end_conv__estimated_consumption:
        (baseline &&
          baseline.eubResults &&
          baseline.eubResults.end_uses &&
          baseline.eubResults.end_uses["Conveyance"] &&
          baseline.eubResults.end_uses["Conveyance"].estimated_consumption) ||
        0,
      base_eub_end_conv__percentage:
        (baseline &&
          baseline.eubResults &&
          baseline.eubResults.end_uses &&
          baseline.eubResults.end_uses["Conveyance"] &&
          baseline.eubResults.end_uses["Conveyance"].percentage) ||
        0,
      base_eub_end_ref__estimated_consumption:
        (baseline &&
          baseline.eubResults &&
          baseline.eubResults.end_uses &&
          baseline.eubResults.end_uses["Refrigeration"] &&
          baseline.eubResults.end_uses["Refrigeration"]
            .estimated_consumption) ||
        0,
      base_eub_end_ref__percentage:
        (baseline &&
          baseline.eubResults &&
          baseline.eubResults.end_uses &&
          baseline.eubResults.end_uses["Refrigeration"] &&
          baseline.eubResults.end_uses["Refrigeration"].percentage) ||
        0,
      base_eub_end_it__estimated_consumption:
        (baseline &&
          baseline.eubResults &&
          baseline.eubResults.end_uses &&
          baseline.eubResults.end_uses["IT"] &&
          baseline.eubResults.end_uses["IT"].estimated_consumption) ||
        0,
      base_eub_end_it__percentage:
        (baseline &&
          baseline.eubResults &&
          baseline.eubResults.end_uses &&
          baseline.eubResults.end_uses["IT"] &&
          baseline.eubResults.end_uses["IT"].percentage) ||
        0,
      base_eub_end_other__estimated_consumption:
        (baseline &&
          baseline.eubResults &&
          baseline.eubResults.end_uses &&
          baseline.eubResults.end_uses["Other"] &&
          baseline.eubResults.end_uses["Other"].estimated_consumption) ||
        0,
      base_eub_end_other__percentage:
        (baseline &&
          baseline.eubResults &&
          baseline.eubResults.end_uses &&
          baseline.eubResults.end_uses["Other"] &&
          baseline.eubResults.end_uses["Other"].percentage) ||
        0,
      base_eub_end_vent__estimated_consumption:
        (baseline &&
          baseline.eubResults &&
          baseline.eubResults.end_uses &&
          baseline.eubResults.end_uses["Ventilation"] &&
          baseline.eubResults.end_uses["Ventilation"].estimated_consumption) ||
        0,
      base_eub_end_vent__percentage:
        (baseline &&
          baseline.eubResults &&
          baseline.eubResults.end_uses &&
          baseline.eubResults.end_uses["Ventilation"] &&
          baseline.eubResults.end_uses["Ventilation"].percentage) ||
        0,
      base_eub_fuel_elec_heat__estimated_consumption:
        (baseline &&
          baseline.eubResults &&
          baseline.eubResults.fuel_uses &&
          baseline.eubResults.fuel_uses.electric &&
          baseline.eubResults.fuel_uses.electric["Space heating"] &&
          baseline.eubResults.fuel_uses.electric["Space heating"]
            .estimated_consumption) ||
        0,
      base_eub_fuel_elec_heat__percentage:
        (baseline &&
          baseline.eubResults &&
          baseline.eubResults.fuel_uses &&
          baseline.eubResults.fuel_uses.electric &&
          baseline.eubResults.fuel_uses.electric["Space heating"] &&
          baseline.eubResults.fuel_uses.electric["Space heating"].percentage) ||
        0,
      base_eub_fuel_elec_air__estimated_consumption:
        (baseline &&
          baseline.eubResults &&
          baseline.eubResults.fuel_uses &&
          baseline.eubResults.fuel_uses.electric &&
          baseline.eubResults.fuel_uses.electric["Air distribution (fans)"] &&
          baseline.eubResults.fuel_uses.electric["Air distribution (fans)"]
            .estimated_consumption) ||
        0,
      base_eub_fuel_elec_air__percentage:
        (baseline &&
          baseline.eubResults &&
          baseline.eubResults.fuel_uses &&
          baseline.eubResults.fuel_uses.electric &&
          baseline.eubResults.fuel_uses.electric["Air distribution (fans)"] &&
          baseline.eubResults.fuel_uses.electric["Air distribution (fans)"]
            .percentage) ||
        0,
      base_eub_fuel_elec_cool__estimated_consumption:
        (baseline &&
          baseline.eubResults &&
          baseline.eubResults.fuel_uses &&
          baseline.eubResults.fuel_uses.electric &&
          baseline.eubResults.fuel_uses.electric["Space cooling"] &&
          baseline.eubResults.fuel_uses.electric["Space cooling"]
            .estimated_consumption) ||
        0,
      base_eub_fuel_elec_cool__percentage:
        (baseline &&
          baseline.eubResults &&
          baseline.eubResults.fuel_uses &&
          baseline.eubResults.fuel_uses.electric &&
          baseline.eubResults.fuel_uses.electric["Space cooling"] &&
          baseline.eubResults.fuel_uses.electric["Space cooling"].percentage) ||
        0,
      base_eub_fuel_elec_light__estimated_consumption:
        (baseline &&
          baseline.eubResults &&
          baseline.eubResults.fuel_uses &&
          baseline.eubResults.fuel_uses.electric &&
          baseline.eubResults.fuel_uses.electric["Lighting"] &&
          baseline.eubResults.fuel_uses.electric["Lighting"]
            .estimated_consumption) ||
        0,
      base_eub_fuel_elec_light__percentage:
        (baseline &&
          baseline.eubResults &&
          baseline.eubResults.fuel_uses &&
          baseline.eubResults.fuel_uses.electric &&
          baseline.eubResults.fuel_uses.electric["Lighting"] &&
          baseline.eubResults.fuel_uses.electric["Lighting"].percentage) ||
        0,
      base_eub_fuel_elec_plug__estimated_consumption:
        (baseline &&
          baseline.eubResults &&
          baseline.eubResults.fuel_uses &&
          baseline.eubResults.fuel_uses.electric &&
          baseline.eubResults.fuel_uses.electric["Plug loads"] &&
          baseline.eubResults.fuel_uses.electric["Plug loads"]
            .estimated_consumption) ||
        0,
      base_eub_fuel_elec_plug__percentage:
        (baseline &&
          baseline.eubResults &&
          baseline.eubResults.fuel_uses &&
          baseline.eubResults.fuel_uses.electric &&
          baseline.eubResults.fuel_uses.electric["Plug loads"] &&
          baseline.eubResults.fuel_uses.electric["Plug loads"].percentage) ||
        0,
      base_eub_fuel_elec_proc__estimated_consumption:
        (baseline &&
          baseline.eubResults &&
          baseline.eubResults.fuel_uses &&
          baseline.eubResults.fuel_uses.electric &&
          baseline.eubResults.fuel_uses.electric["Process loads"] &&
          baseline.eubResults.fuel_uses.electric["Process loads"]
            .estimated_consumption) ||
        0,
      base_eub_fuel_elec_proc__percentage:
        (baseline &&
          baseline.eubResults &&
          baseline.eubResults.fuel_uses &&
          baseline.eubResults.fuel_uses.electric &&
          baseline.eubResults.fuel_uses.electric["Process loads"] &&
          baseline.eubResults.fuel_uses.electric["Process loads"].percentage) ||
        0,
      base_eub_fuel_elec_water__estimated_consumption:
        (baseline &&
          baseline.eubResults &&
          baseline.eubResults.fuel_uses &&
          baseline.eubResults.fuel_uses.electric &&
          baseline.eubResults.fuel_uses.electric["Water Distribution"] &&
          baseline.eubResults.fuel_uses.electric["Water Distribution"]
            .estimated_consumption) ||
        0,
      base_eub_fuel_elec_water__percentage:
        (baseline &&
          baseline.eubResults &&
          baseline.eubResults.fuel_uses &&
          baseline.eubResults.fuel_uses.electric &&
          baseline.eubResults.fuel_uses.electric["Water Distribution"] &&
          baseline.eubResults.fuel_uses.electric["Water Distribution"]
            .percentage) ||
        0,
      base_eub_fuel_elec_hw__estimated_consumption:
        (baseline &&
          baseline.eubResults &&
          baseline.eubResults.fuel_uses &&
          baseline.eubResults.fuel_uses.electric &&
          baseline.eubResults.fuel_uses.electric["SHW/DHW"] &&
          baseline.eubResults.fuel_uses.electric["SHW/DHW"]
            .estimated_consumption) ||
        0,
      base_eub_fuel_elec_hw__percentage:
        (baseline &&
          baseline.eubResults &&
          baseline.eubResults.fuel_uses &&
          baseline.eubResults.fuel_uses.electric &&
          baseline.eubResults.fuel_uses.electric["SHW/DHW"] &&
          baseline.eubResults.fuel_uses.electric["SHW/DHW"].percentage) ||
        0,
      base_eub_fuel_elec_conv__estimated_consumption:
        (baseline &&
          baseline.eubResults &&
          baseline.eubResults.fuel_uses &&
          baseline.eubResults.fuel_uses.electric &&
          baseline.eubResults.fuel_uses.electric["Conveyance"] &&
          baseline.eubResults.fuel_uses.electric["Conveyance"]
            .estimated_consumption) ||
        0,
      base_eub_fuel_elec_conv__percentage:
        (baseline &&
          baseline.eubResults &&
          baseline.eubResults.fuel_uses &&
          baseline.eubResults.fuel_uses.electric &&
          baseline.eubResults.fuel_uses.electric["Conveyance"] &&
          baseline.eubResults.fuel_uses.electric["Conveyance"].percentage) ||
        0,
      base_eub_fuel_elec_ref__estimated_consumption:
        (baseline &&
          baseline.eubResults &&
          baseline.eubResults.fuel_uses &&
          baseline.eubResults.fuel_uses.electric &&
          baseline.eubResults.fuel_uses.electric["Refrigeration"] &&
          baseline.eubResults.fuel_uses.electric["Refrigeration"]
            .estimated_consumption) ||
        0,
      base_eub_fuel_elec_ref__percentage:
        (baseline &&
          baseline.eubResults &&
          baseline.eubResults.fuel_uses &&
          baseline.eubResults.fuel_uses.electric &&
          baseline.eubResults.fuel_uses.electric["Refrigeration"] &&
          baseline.eubResults.fuel_uses.electric["Refrigeration"].percentage) ||
        0,
      base_eub_fuel_elec_it__estimated_consumption:
        (baseline &&
          baseline.eubResults &&
          baseline.eubResults.fuel_uses &&
          baseline.eubResults.fuel_uses.electric &&
          baseline.eubResults.fuel_uses.electric["IT"] &&
          baseline.eubResults.fuel_uses.electric["IT"].estimated_consumption) ||
        0,
      base_eub_fuel_elec_it__percentage:
        (baseline &&
          baseline.eubResults &&
          baseline.eubResults.fuel_uses &&
          baseline.eubResults.fuel_uses.electric &&
          baseline.eubResults.fuel_uses.electric["IT"] &&
          baseline.eubResults.fuel_uses.electric["IT"].percentage) ||
        0,
      base_eub_fuel_elec_other__estimated_consumption:
        (baseline &&
          baseline.eubResults &&
          baseline.eubResults.fuel_uses &&
          baseline.eubResults.fuel_uses.electric &&
          baseline.eubResults.fuel_uses.electric["Other"] &&
          baseline.eubResults.fuel_uses.electric["Other"]
            .estimated_consumption) ||
        0,
      base_eub_fuel_elec_other__percentage:
        (baseline &&
          baseline.eubResults &&
          baseline.eubResults.fuel_uses &&
          baseline.eubResults.fuel_uses.electric &&
          baseline.eubResults.fuel_uses.electric["Other"] &&
          baseline.eubResults.fuel_uses.electric["Other"].percentage) ||
        0,
      base_eub_fuel_elec_vent__estimated_consumption:
        (baseline &&
          baseline.eubResults &&
          baseline.eubResults.fuel_uses &&
          baseline.eubResults.fuel_uses.electric &&
          baseline.eubResults.fuel_uses.electric["Ventilation"] &&
          baseline.eubResults.fuel_uses.electric["Ventilation"]
            .estimated_consumption) ||
        0,
      base_eub_fuel_elec_vent__percentage:
        (baseline &&
          baseline.eubResults &&
          baseline.eubResults.fuel_uses &&
          baseline.eubResults.fuel_uses.electric &&
          baseline.eubResults.fuel_uses.electric["Ventilation"] &&
          baseline.eubResults.fuel_uses.electric["Ventilation"].percentage) ||
        0,
      base_eub_fuel_gas_cook__estimated_consumption:
        (baseline &&
          baseline.eubResults &&
          baseline.eubResults.fuel_uses &&
          baseline.eubResults.fuel_uses.gas &&
          baseline.eubResults.fuel_uses.gas["Cooking"] &&
          baseline.eubResults.fuel_uses.gas["Cooking"].estimated_consumption) ||
        0,
      base_eub_fuel_gas_cook__percentage:
        (baseline &&
          baseline.eubResults &&
          baseline.eubResults.fuel_uses &&
          baseline.eubResults.fuel_uses.gas &&
          baseline.eubResults.fuel_uses.gas["Cooking"] &&
          baseline.eubResults.fuel_uses.gas["Cooking"].percentage) ||
        0,
      base_eub_fuel_gas_heat__estimated_consumption:
        (baseline &&
          baseline.eubResults &&
          baseline.eubResults.fuel_uses &&
          baseline.eubResults.fuel_uses.gas &&
          baseline.eubResults.fuel_uses.gas["Space heating"] &&
          baseline.eubResults.fuel_uses.gas["Space heating"]
            .estimated_consumption) ||
        0,
      base_eub_fuel_gas_heat__percentage:
        (baseline &&
          baseline.eubResults &&
          baseline.eubResults.fuel_uses &&
          baseline.eubResults.fuel_uses.gas &&
          baseline.eubResults.fuel_uses.gas["Space heating"] &&
          baseline.eubResults.fuel_uses.gas["Space heating"].percentage) ||
        0,
      base_eub_fuel_gas_hw__estimated_consumption:
        (baseline &&
          baseline.eubResults &&
          baseline.eubResults.fuel_uses &&
          baseline.eubResults.fuel_uses.gas &&
          baseline.eubResults.fuel_uses.gas["SHW/DHW"] &&
          baseline.eubResults.fuel_uses.gas["SHW/DHW"].estimated_consumption) ||
        0,
      base_eub_fuel_gas_hw__percentage:
        (baseline &&
          baseline.eubResults &&
          baseline.eubResults.fuel_uses &&
          baseline.eubResults.fuel_uses.gas &&
          baseline.eubResults.fuel_uses.gas["SHW/DHW"] &&
          baseline.eubResults.fuel_uses.gas["SHW/DHW"].percentage) ||
        0,
      base_eub_fuel_gas_proc__estimated_consumption:
        (baseline &&
          baseline.eubResults &&
          baseline.eubResults.fuel_uses &&
          baseline.eubResults.fuel_uses.gas &&
          baseline.eubResults.fuel_uses.gas["Process loads"] &&
          baseline.eubResults.fuel_uses.gas["Process loads"]
            .estimated_consumption) ||
        0,
      base_eub_fuel_gas_proc__percentage:
        (baseline &&
          baseline.eubResults &&
          baseline.eubResults.fuel_uses &&
          baseline.eubResults.fuel_uses.gas &&
          baseline.eubResults.fuel_uses.gas["Process loads"] &&
          baseline.eubResults.fuel_uses.gas["Process loads"].percentage) ||
        0,
      base_eub_fuel_gas_ref__estimated_consumption:
        (baseline &&
          baseline.eubResults &&
          baseline.eubResults.fuel_uses &&
          baseline.eubResults.fuel_uses.gas &&
          baseline.eubResults.fuel_uses.gas["Refrigeration"] &&
          baseline.eubResults.fuel_uses.gas["Refrigeration"]
            .estimated_consumption) ||
        0,
      base_eub_fuel_gas_ref__percentage:
        (baseline &&
          baseline.eubResults &&
          baseline.eubResults.fuel_uses &&
          baseline.eubResults.fuel_uses.gas &&
          baseline.eubResults.fuel_uses.gas["Refrigeration"] &&
          baseline.eubResults.fuel_uses.gas["Refrigeration"].percentage) ||
        0,
      base_eub_fuel_gas_other__estimated_consumption:
        (baseline &&
          baseline.eubResults &&
          baseline.eubResults.fuel_uses &&
          baseline.eubResults.fuel_uses.gas &&
          baseline.eubResults.fuel_uses.gas["Other"] &&
          baseline.eubResults.fuel_uses.gas["Other"].estimated_consumption) ||
        0,
      base_eub_fuel_gas_other__percentage:
        (baseline &&
          baseline.eubResults &&
          baseline.eubResults.fuel_uses &&
          baseline.eubResults.fuel_uses.gas &&
          baseline.eubResults.fuel_uses.gas["Other"] &&
          baseline.eubResults.fuel_uses.gas["Other"].percentage) ||
        0,
      base_eui: (baseline && baseline.eui) || 0,
      base_total_cost__electric:
        (baseline && baseline.totalCost && baseline.totalCost.electric) || 0,
      base_total_cost__gas:
        (baseline && baseline.totalCost && baseline.totalCost.gas) || 0,
      base_total_energy__total_kbtu:
        (baseline && baseline.totalEnergy && baseline.totalEnergy.total_kbtu) ||
        0,
      base_total_energy__total_kwh:
        (baseline && baseline.totalEnergy && baseline.totalEnergy.total_kwh) ||
        0,
      base_total_energy__total_therm:
        (baseline &&
          baseline.totalEnergy &&
          baseline.totalEnergy.total_therm) ||
        0,
      base_total_ghg__electric:
        (baseline && baseline.totalGhg && baseline.totalGhg.electric) || 0,
      base_total_ghg__gas:
        (baseline && baseline.totalGhg && baseline.totalGhg.gas) || 0,
      prop_eub_end_air__estimated_consumption:
        (proposed &&
          proposed.eubResults &&
          proposed.eubResults.end_uses &&
          proposed.eubResults.end_uses["Air distribution (fans)"] &&
          proposed.eubResults.end_uses["Air distribution (fans)"]
            .estimated_consumption) ||
        0,
      prop_eub_end_air__percentage:
        (proposed &&
          proposed.eubResults &&
          proposed.eubResults.end_uses &&
          proposed.eubResults.end_uses["Air distribution (fans)"] &&
          proposed.eubResults.end_uses["Air distribution (fans)"].percentage) ||
        0,
      prop_eub_end_cook__estimated_consumption:
        (proposed &&
          proposed.eubResults &&
          proposed.eubResults.end_uses &&
          proposed.eubResults.end_uses["Cooking"] &&
          proposed.eubResults.end_uses["Cooking"].estimated_consumption) ||
        0,
      prop_eub_end_cook__percentage:
        (proposed &&
          proposed.eubResults &&
          proposed.eubResults.end_uses &&
          proposed.eubResults.end_uses["Cooking"] &&
          proposed.eubResults.end_uses["Cooking"].percentage) ||
        0,
      prop_eub_end_cool__estimated_consumption:
        (proposed &&
          proposed.eubResults &&
          proposed.eubResults.end_uses &&
          proposed.eubResults.end_uses["Space cooling"] &&
          proposed.eubResults.end_uses["Space cooling"]
            .estimated_consumption) ||
        0,
      prop_eub_end_cool__percentage:
        (proposed &&
          proposed.eubResults &&
          proposed.eubResults.end_uses &&
          proposed.eubResults.end_uses["Space cooling"] &&
          proposed.eubResults.end_uses["Space cooling"].percentage) ||
        0,
      prop_eub_end_heat__estimated_consumption:
        (proposed &&
          proposed.eubResults &&
          proposed.eubResults.end_uses &&
          proposed.eubResults.end_uses["Space heating"] &&
          proposed.eubResults.end_uses["Space heating"]
            .estimated_consumption) ||
        0,
      prop_eub_end_heat__percentage:
        (proposed &&
          proposed.eubResults &&
          proposed.eubResults.end_uses &&
          proposed.eubResults.end_uses["Space heating"] &&
          proposed.eubResults.end_uses["Space heating"].percentage) ||
        0,
      prop_eub_end_hw__estimated_consumption:
        (proposed &&
          proposed.eubResults &&
          proposed.eubResults.end_uses &&
          proposed.eubResults.end_uses["SHW/DHW"] &&
          proposed.eubResults.end_uses["SHW/DHW"].estimated_consumption) ||
        0,
      prop_eub_end_hw__percentage:
        (proposed &&
          proposed.eubResults &&
          proposed.eubResults.end_uses &&
          proposed.eubResults.end_uses["SHW/DHW"] &&
          proposed.eubResults.end_uses["SHW/DHW"].percentage) ||
        0,
      prop_eub_end_light__estimated_consumption:
        (proposed &&
          proposed.eubResults &&
          proposed.eubResults.end_uses &&
          proposed.eubResults.end_uses["Lighting"] &&
          proposed.eubResults.end_uses["Lighting"].estimated_consumption) ||
        0,
      prop_eub_end_light__percentage:
        (proposed &&
          proposed.eubResults &&
          proposed.eubResults.end_uses &&
          proposed.eubResults.end_uses["Lighting"] &&
          proposed.eubResults.end_uses["Lighting"].percentage) ||
        0,
      prop_eub_end_plug__estimated_consumption:
        (proposed &&
          proposed.eubResults &&
          proposed.eubResults.end_uses &&
          proposed.eubResults.end_uses["Plug loads"] &&
          proposed.eubResults.end_uses["Plug loads"].estimated_consumption) ||
        0,
      prop_eub_end_plug__percentage:
        (proposed &&
          proposed.eubResults &&
          proposed.eubResults.end_uses &&
          proposed.eubResults.end_uses["Plug loads"] &&
          proposed.eubResults.end_uses["Plug loads"].percentage) ||
        0,
      prop_eub_end_proc__estimated_consumption:
        (proposed &&
          proposed.eubResults &&
          proposed.eubResults.end_uses &&
          proposed.eubResults.end_uses["Process loads"] &&
          proposed.eubResults.end_uses["Process loads"]
            .estimated_consumption) ||
        0,
      prop_eub_end_proc__percentage:
        (proposed &&
          proposed.eubResults &&
          proposed.eubResults.end_uses &&
          proposed.eubResults.end_uses["Process loads"] &&
          proposed.eubResults.end_uses["Process loads"].percentage) ||
        0,
      prop_eub_end_water__estimated_consumption:
        (proposed &&
          proposed.eubResults &&
          proposed.eubResults.end_uses &&
          proposed.eubResults.end_uses["Water Distribution"] &&
          proposed.eubResults.end_uses["Water Distribution"]
            .estimated_consumption) ||
        0,
      prop_eub_end_water__percentage:
        (proposed &&
          proposed.eubResults &&
          proposed.eubResults.end_uses &&
          proposed.eubResults.end_uses["Water Distribution"] &&
          proposed.eubResults.end_uses["Water Distribution"].percentage) ||
        0,
      prop_eub_end_conv__estimated_consumption:
        (proposed &&
          proposed.eubResults &&
          proposed.eubResults.end_uses &&
          proposed.eubResults.end_uses["Conveyance"] &&
          proposed.eubResults.end_uses["Conveyance"].estimated_consumption) ||
        0,
      prop_eub_end_conv__percentage:
        (proposed &&
          proposed.eubResults &&
          proposed.eubResults.end_uses &&
          proposed.eubResults.end_uses["Conveyance"] &&
          proposed.eubResults.end_uses["Conveyance"].percentage) ||
        0,
      prop_eub_end_ref__estimated_consumption:
        (proposed &&
          proposed.eubResults &&
          proposed.eubResults.end_uses &&
          proposed.eubResults.end_uses["Refrigeration"] &&
          proposed.eubResults.end_uses["Refrigeration"]
            .estimated_consumption) ||
        0,
      prop_eub_end_ref__percentage:
        (proposed &&
          proposed.eubResults &&
          proposed.eubResults.end_uses &&
          proposed.eubResults.end_uses["Refrigeration"] &&
          proposed.eubResults.end_uses["Refrigeration"].percentage) ||
        0,
      prop_eub_end_it__estimated_consumption:
        (proposed &&
          proposed.eubResults &&
          proposed.eubResults.end_uses &&
          proposed.eubResults.end_uses["IT"] &&
          proposed.eubResults.end_uses["IT"].estimated_consumption) ||
        0,
      prop_eub_end_it__percentage:
        (proposed &&
          proposed.eubResults &&
          proposed.eubResults.end_uses &&
          proposed.eubResults.end_uses["IT"] &&
          proposed.eubResults.end_uses["IT"].percentage) ||
        0,
      prop_eub_end_other__estimated_consumption:
        (proposed &&
          proposed.eubResults &&
          proposed.eubResults.end_uses &&
          proposed.eubResults.end_uses["Other"] &&
          proposed.eubResults.end_uses["Other"].estimated_consumption) ||
        0,
      prop_eub_end_other__percentage:
        (proposed &&
          proposed.eubResults &&
          proposed.eubResults.end_uses &&
          proposed.eubResults.end_uses["Other"] &&
          proposed.eubResults.end_uses["Other"].percentage) ||
        0,
      prop_eub_end_vent__estimated_consumption:
        (proposed &&
          proposed.eubResults &&
          proposed.eubResults.end_uses &&
          proposed.eubResults.end_uses["Ventilation"] &&
          proposed.eubResults.end_uses["Ventilation"].estimated_consumption) ||
        0,
      prop_eub_end_vent__percentage:
        (proposed &&
          proposed.eubResults &&
          proposed.eubResults.end_uses &&
          proposed.eubResults.end_uses["Ventilation"] &&
          proposed.eubResults.end_uses["Ventilation"].percentage) ||
        0,
      prop_eub_fuel_elec_air__estimated_consumption:
        (proposed &&
          proposed.eubResults &&
          proposed.eubResults.fuel_uses &&
          proposed.eubResults.fuel_uses.electric &&
          proposed.eubResults.fuel_uses.electric["Air distribution (fans)"] &&
          proposed.eubResults.fuel_uses.electric["Air distribution (fans)"]
            .estimated_consumption) ||
        0,
      prop_eub_fuel_elec_air__percentage:
        (proposed &&
          proposed.eubResults &&
          proposed.eubResults.fuel_uses &&
          proposed.eubResults.fuel_uses.electric &&
          proposed.eubResults.fuel_uses.electric["Air distribution (fans)"] &&
          proposed.eubResults.fuel_uses.electric["Air distribution (fans)"]
            .percentage) ||
        0,
      prop_eub_fuel_elec_cool__estimated_consumption:
        (proposed &&
          proposed.eubResults &&
          proposed.eubResults.fuel_uses &&
          proposed.eubResults.fuel_uses.electric &&
          proposed.eubResults.fuel_uses.electric["Space cooling"] &&
          proposed.eubResults.fuel_uses.electric["Space cooling"]
            .estimated_consumption) ||
        0,
      prop_eub_fuel_elec_cool__percentage:
        (proposed &&
          proposed.eubResults &&
          proposed.eubResults.fuel_uses &&
          proposed.eubResults.fuel_uses.electric &&
          proposed.eubResults.fuel_uses.electric["Space cooling"] &&
          proposed.eubResults.fuel_uses.electric["Space cooling"].percentage) ||
        0,
      prop_eub_fuel_elec_light__estimated_consumption:
        (proposed &&
          proposed.eubResults &&
          proposed.eubResults.fuel_uses &&
          proposed.eubResults.fuel_uses.electric &&
          proposed.eubResults.fuel_uses.electric["Lighting"] &&
          proposed.eubResults.fuel_uses.electric["Lighting"]
            .estimated_consumption) ||
        0,
      prop_eub_fuel_elec_light__percentage:
        (proposed &&
          proposed.eubResults &&
          proposed.eubResults.fuel_uses &&
          proposed.eubResults.fuel_uses.electric &&
          proposed.eubResults.fuel_uses.electric["Lighting"] &&
          proposed.eubResults.fuel_uses.electric["Lighting"].percentage) ||
        0,
      prop_eub_fuel_elec_plug__estimated_consumption:
        (proposed &&
          proposed.eubResults &&
          proposed.eubResults.fuel_uses &&
          proposed.eubResults.fuel_uses.electric &&
          proposed.eubResults.fuel_uses.electric["Plug loads"] &&
          proposed.eubResults.fuel_uses.electric["Plug loads"]
            .estimated_consumption) ||
        0,
      prop_eub_fuel_elec_plug__percentage:
        (proposed &&
          proposed.eubResults &&
          proposed.eubResults.fuel_uses &&
          proposed.eubResults.fuel_uses.electric &&
          proposed.eubResults.fuel_uses.electric["Plug loads"] &&
          proposed.eubResults.fuel_uses.electric["Plug loads"].percentage) ||
        0,
      prop_eub_fuel_elec_proc__estimated_consumption:
        (proposed &&
          proposed.eubResults &&
          proposed.eubResults.fuel_uses &&
          proposed.eubResults.fuel_uses.electric &&
          proposed.eubResults.fuel_uses.electric["Process loads"] &&
          proposed.eubResults.fuel_uses.electric["Process loads"]
            .estimated_consumption) ||
        0,
      prop_eub_fuel_elec_proc__percentage:
        (proposed &&
          proposed.eubResults &&
          proposed.eubResults.fuel_uses &&
          proposed.eubResults.fuel_uses.electric &&
          proposed.eubResults.fuel_uses.electric["Process loads"] &&
          proposed.eubResults.fuel_uses.electric["Process loads"].percentage) ||
        0,
      prop_eub_fuel_elec_heat__estimated_consumption:
        (proposed &&
          proposed.eubResults &&
          proposed.eubResults.fuel_uses &&
          proposed.eubResults.fuel_uses.electric &&
          proposed.eubResults.fuel_uses.electric["Space heating"] &&
          proposed.eubResults.fuel_uses.electric["Space heating"]
            .estimated_consumption) ||
        0,
      prop_eub_fuel_elec_heat__percentage:
        (proposed &&
          proposed.eubResults &&
          proposed.eubResults.fuel_uses &&
          proposed.eubResults.fuel_uses.electric &&
          proposed.eubResults.fuel_uses.electric["Space heating"] &&
          proposed.eubResults.fuel_uses.electric["Space heating"].percentage) ||
        0,
      prop_eub_fuel_elec_water__estimated_consumption:
        (proposed &&
          proposed.eubResults &&
          proposed.eubResults.fuel_uses &&
          proposed.eubResults.fuel_uses.electric &&
          proposed.eubResults.fuel_uses.electric["Water Distribution"] &&
          proposed.eubResults.fuel_uses.electric["Water Distribution"]
            .estimated_consumption) ||
        0,
      prop_eub_fuel_elec_water__percentage:
        (proposed &&
          proposed.eubResults &&
          proposed.eubResults.fuel_uses &&
          proposed.eubResults.fuel_uses.electric &&
          proposed.eubResults.fuel_uses.electric["Water Distribution"] &&
          proposed.eubResults.fuel_uses.electric["Water Distribution"]
            .percentage) ||
        0,
      prop_eub_fuel_elec_hw__estimated_consumption:
        (proposed &&
          proposed.eubResults &&
          proposed.eubResults.fuel_uses &&
          proposed.eubResults.fuel_uses.electric &&
          proposed.eubResults.fuel_uses.electric["SHW/DHW"] &&
          proposed.eubResults.fuel_uses.electric["SHW/DHW"]
            .estimated_consumption) ||
        0,
      prop_eub_fuel_elec_hw__percentage:
        (proposed &&
          proposed.eubResults &&
          proposed.eubResults.fuel_uses &&
          proposed.eubResults.fuel_uses.electric &&
          proposed.eubResults.fuel_uses.electric["SHW/DHW"] &&
          proposed.eubResults.fuel_uses.electric["SHW/DHW"].percentage) ||
        0,
      prop_eub_fuel_elec_conv__estimated_consumption:
        (proposed &&
          proposed.eubResults &&
          proposed.eubResults.fuel_uses &&
          proposed.eubResults.fuel_uses.electric &&
          proposed.eubResults.fuel_uses.electric["Conveyance"] &&
          proposed.eubResults.fuel_uses.electric["Conveyance"]
            .estimated_consumption) ||
        0,
      prop_eub_fuel_elec_conv__percentage:
        (proposed &&
          proposed.eubResults &&
          proposed.eubResults.fuel_uses &&
          proposed.eubResults.fuel_uses.electric &&
          proposed.eubResults.fuel_uses.electric["Conveyance"] &&
          proposed.eubResults.fuel_uses.electric["Conveyance"].percentage) ||
        0,
      prop_eub_fuel_elec_ref__estimated_consumption:
        (proposed &&
          proposed.eubResults &&
          proposed.eubResults.fuel_uses &&
          proposed.eubResults.fuel_uses.electric &&
          proposed.eubResults.fuel_uses.electric["Refrigeration"] &&
          proposed.eubResults.fuel_uses.electric["Refrigeration"]
            .estimated_consumption) ||
        0,
      prop_eub_fuel_elec_ref__percentage:
        (proposed &&
          proposed.eubResults &&
          proposed.eubResults.fuel_uses &&
          proposed.eubResults.fuel_uses.electric &&
          proposed.eubResults.fuel_uses.electric["Refrigeration"] &&
          proposed.eubResults.fuel_uses.electric["Refrigeration"].percentage) ||
        0,
      prop_eub_fuel_elec_cook__estimated_consumption:
        (proposed &&
          proposed.eubResults &&
          proposed.eubResults.fuel_uses &&
          proposed.eubResults.fuel_uses.electric &&
          proposed.eubResults.fuel_uses.electric["Cooking"] &&
          proposed.eubResults.fuel_uses.electric["Cooking"]
            .estimated_consumption) ||
        0,
      prop_eub_fuel_elec_cook__percentage:
        (proposed &&
          proposed.eubResults &&
          proposed.eubResults.fuel_uses &&
          proposed.eubResults.fuel_uses.electric &&
          proposed.eubResults.fuel_uses.electric["Cooking"] &&
          proposed.eubResults.fuel_uses.electric["Cooking"].percentage) ||
        0,
      prop_eub_fuel_elec_it__estimated_consumption:
        (proposed &&
          proposed.eubResults &&
          proposed.eubResults.fuel_uses &&
          proposed.eubResults.fuel_uses.electric &&
          proposed.eubResults.fuel_uses.electric["IT"] &&
          proposed.eubResults.fuel_uses.electric["IT"].estimated_consumption) ||
        0,
      prop_eub_fuel_elec_it__percentage:
        (proposed &&
          proposed.eubResults &&
          proposed.eubResults.fuel_uses &&
          proposed.eubResults.fuel_uses.electric &&
          proposed.eubResults.fuel_uses.electric["IT"] &&
          proposed.eubResults.fuel_uses.electric["IT"].percentage) ||
        0,
      prop_eub_fuel_elec_other__estimated_consumption:
        (proposed &&
          proposed.eubResults &&
          proposed.eubResults.fuel_uses &&
          proposed.eubResults.fuel_uses.electric &&
          proposed.eubResults.fuel_uses.electric["Other"] &&
          proposed.eubResults.fuel_uses.electric["Other"]
            .estimated_consumption) ||
        0,
      prop_eub_fuel_elec_other__percentage:
        (proposed &&
          proposed.eubResults &&
          proposed.eubResults.fuel_uses &&
          proposed.eubResults.fuel_uses.electric &&
          proposed.eubResults.fuel_uses.electric["Other"] &&
          proposed.eubResults.fuel_uses.electric["Other"].percentage) ||
        0,
      prop_eub_fuel_elec_vent__estimated_consumption:
        (proposed &&
          proposed.eubResults &&
          proposed.eubResults.fuel_uses &&
          proposed.eubResults.fuel_uses.electric &&
          proposed.eubResults.fuel_uses.electric["Ventilation"] &&
          proposed.eubResults.fuel_uses.electric["Ventilation"]
            .estimated_consumption) ||
        0,
      prop_eub_fuel_elec_vent__percentage:
        (proposed &&
          proposed.eubResults &&
          proposed.eubResults.fuel_uses &&
          proposed.eubResults.fuel_uses.electric &&
          proposed.eubResults.fuel_uses.electric["Ventilation"] &&
          proposed.eubResults.fuel_uses.electric["Ventilation"].percentage) ||
        0,
      prop_eub_fuel_gas_cook__estimated_consumption:
        (proposed &&
          proposed.eubResults &&
          proposed.eubResults.fuel_uses &&
          proposed.eubResults.fuel_uses.gas &&
          proposed.eubResults.fuel_uses.gas["Process loads"] &&
          proposed.eubResults.fuel_uses.gas["Process loads"]
            .estimated_consumption) ||
        0,
      prop_eub_fuel_gas_cook__percentage:
        (proposed &&
          proposed.eubResults &&
          proposed.eubResults.fuel_uses &&
          proposed.eubResults.fuel_uses.gas &&
          proposed.eubResults.fuel_uses.gas["Process loads"] &&
          proposed.eubResults.fuel_uses.gas["Process loads"].percentage) ||
        0,
      prop_eub_fuel_gas_heat__estimated_consumption:
        (proposed &&
          proposed.eubResults &&
          proposed.eubResults.fuel_uses &&
          proposed.eubResults.fuel_uses.gas &&
          proposed.eubResults.fuel_uses.gas["Space heating"] &&
          proposed.eubResults.fuel_uses.gas["Space heating"]
            .estimated_consumption) ||
        0,
      prop_eub_fuel_gas_heat__percentage:
        (proposed &&
          proposed.eubResults &&
          proposed.eubResults.fuel_uses &&
          proposed.eubResults.fuel_uses.gas &&
          proposed.eubResults.fuel_uses.gas["Space heating"] &&
          proposed.eubResults.fuel_uses.gas["Space heating"].percentage) ||
        0,
      prop_eub_fuel_gas_hw__estimated_consumption:
        (proposed &&
          proposed.eubResults &&
          proposed.eubResults.fuel_uses &&
          proposed.eubResults.fuel_uses.gas &&
          proposed.eubResults.fuel_uses.gas["SHW/DHW"] &&
          proposed.eubResults.fuel_uses.gas["SHW/DHW"].estimated_consumption) ||
        0,
      prop_eub_fuel_gas_hw__percentage:
        (proposed &&
          proposed.eubResults &&
          proposed.eubResults.fuel_uses &&
          proposed.eubResults.fuel_uses.gas &&
          proposed.eubResults.fuel_uses.gas["SHW/DHW"] &&
          proposed.eubResults.fuel_uses.gas["SHW/DHW"].percentage) ||
        0,
      prop_eub_fuel_gas_proc__estimated_consumption:
        (proposed &&
          proposed.eubResults &&
          proposed.eubResults.fuel_uses &&
          proposed.eubResults.fuel_uses.gas &&
          proposed.eubResults.fuel_uses.gas["Process loads"] &&
          proposed.eubResults.fuel_uses.gas["Process loads"]
            .estimated_consumption) ||
        0,
      prop_eub_fuel_gas_proc__percentage:
        (proposed &&
          proposed.eubResults &&
          proposed.eubResults.fuel_uses &&
          proposed.eubResults.fuel_uses.gas &&
          proposed.eubResults.fuel_uses.gas["Process loads"] &&
          proposed.eubResults.fuel_uses.gas["Process loads"].percentage) ||
        0,
      prop_eub_fuel_gas_ref__estimated_consumption:
        (proposed &&
          proposed.eubResults &&
          proposed.eubResults.fuel_uses &&
          proposed.eubResults.fuel_uses.gas &&
          proposed.eubResults.fuel_uses.gas["Refrigeration"] &&
          proposed.eubResults.fuel_uses.gas["Refrigeration"]
            .estimated_consumption) ||
        0,
      prop_eub_fuel_gas_ref__percentage:
        (proposed &&
          proposed.eubResults &&
          proposed.eubResults.fuel_uses &&
          proposed.eubResults.fuel_uses.gas &&
          proposed.eubResults.fuel_uses.gas["Refrigeration"] &&
          proposed.eubResults.fuel_uses.gas["Refrigeration"].percentage) ||
        0,
      prop_eub_fuel_gas_other__estimated_consumption:
        (proposed &&
          proposed.eubResults &&
          proposed.eubResults.fuel_uses &&
          proposed.eubResults.fuel_uses.gas &&
          proposed.eubResults.fuel_uses.gas["Other"] &&
          proposed.eubResults.fuel_uses.gas["Other"].estimated_consumption) ||
        0,
      prop_eub_fuel_gas_other__percentage:
        (proposed &&
          proposed.eubResults &&
          proposed.eubResults.fuel_uses &&
          proposed.eubResults.fuel_uses.gas &&
          proposed.eubResults.fuel_uses.gas["Other"] &&
          proposed.eubResults.fuel_uses.gas["Other"].percentage) ||
        0,
      prop_eui: (proposed && proposed.eui) || 0,
      prop_total_cost__electric:
        (proposed && proposed.totalCost && proposed.totalCost.electric) || 0,
      prop_total_cost__gas:
        (proposed && proposed.totalCost && proposed.totalCost.gas) || 0,
      prop_total_energy__total_kbtu_proposed:
        (proposed &&
          proposed.totalEnergy &&
          proposed.totalEnergy.total_kbtu_proposed) ||
        0,
      prop_total_energy__total_kwh_proposed:
        (proposed &&
          proposed.totalEnergy &&
          proposed.totalEnergy.total_kwh_proposed) ||
        0,
      prop_total_energy__total_therm_proposed:
        (proposed &&
          proposed.totalEnergy &&
          proposed.totalEnergy.total_therm_proposed) ||
        0,
      prop_total_ghg__electric:
        (proposed && proposed.totalGhg && proposed.totalGhg.electric) || 0,
      prop_total_ghg__gas:
        (proposed && proposed.totalGhg && proposed.totalGhg.gas) || 0
    };
    await datawarehouseDb.BuildingActualEndUse.create(body);
  } catch (error) {
    console.log("error", error);
  }
  await actualEndUse.save();
}

module.exports = {
  createActualEndUse
};
