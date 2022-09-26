 const UTILITY_TYPES = {
    ELECTRICITY: 'eletricity',
    ELECTRICITY_DEMAND: 'electricityDemand',
    SOLAR: 'solar',
    NATURAL_GAS: 'natural-gas',
    STEAM: 'steam',
    FUEL_OIL_1: 'fueloil1',
    FUEL_OIL_2: 'fueloil2',
    FUEL_OIL_4: 'fueloil4',
    FUEL_OIL_56: 'fueloil56',
    DIESEL: 'diesel',
    PROPANE: 'propane',
    KEROSENE: 'kerosene',
    DISTRICT_HOT_WATER: 'districtHotWater',
    DISTRICT_CHILLED_WATER_ELECTRIC_METER: 'districtChilledWaterElectricMeter',
    DISTRICT_CHILLED_WATER_ABSORPTION_METER:
      'districtChilledWaterAbsorptionMeter',
    DISTRICT_CHILLED_WATER_ENGINE_METER: 'districtChilledWaterEngineMeter',
    DISTRICT_CHILLED_WATER_OTHER_METER: 'districtChilledWaterOtherMeter',
    WIND: 'wind',
    WOOD: 'wood',
    WATER: 'water',
    OTHER: 'other'
  }
  
   const UNIT_TYPES = {
    kWH: 'kWh',
    kW: 'kW',
    KG: 'kg',
    KLBS: 'kLbs',
    THERMS: 'therms',
    MLB: 'Mlb',
    GAL: 'Gal',
    GAL_UK: 'Gallons (UK)',
    GAL_US: 'Gallons (US)',
    CCF: 'ccf',
    CF: 'cf',
    CM: 'cm',
    CGAL_UK: 'cGal (UK)',
    CGAL_US: 'cGal (US)',
    GJ: 'GJ',
    kBTU: 'kBtu',
    kCF: 'kcf',
    kCM: 'kcm',
    kGAL_UK: 'kGal (UK)',
    kGAL_US: 'kGal (US)',
    MBTU: 'MBtu',
    MMBTU: 'MMBtu',
    MLBS: 'MLbs',
    MWH: 'MWh',
    DTH: 'Dth',
    MCF: 'Mcf',
    MGAL_UK: 'MGal (UK)',
    MGAL_US: 'MGal (US)',
    LITERS: 'Liters',
    LBS: 'Lbs',
    TONNES: 'Tonnes',
    TONS: 'Tons',
    TON_HOURS: 'ton hours'
  }
  
   const UTILITY_UNITS_OPTIONS = {
    [UTILITY_TYPES.ELECTRICITY]: [
      UNIT_TYPES.GJ,
      UNIT_TYPES.kBTU,
      UNIT_TYPES.kWH,
      UNIT_TYPES.MWH,
      UNIT_TYPES.MBTU,
      UNIT_TYPES.MMBTU,
      UNIT_TYPES.DTH
    ],
    [UTILITY_TYPES.ELECTRICITY_DEMAND]: [UNIT_TYPES.kW, UNIT_TYPES.MWH],
    [UTILITY_TYPES.SOLAR]: [
      UNIT_TYPES.GJ,
      UNIT_TYPES.kBTU,
      UNIT_TYPES.kWH,
      UNIT_TYPES.MWH,
      UNIT_TYPES.MBTU,
      UNIT_TYPES.MMBTU,
      UNIT_TYPES.DTH
    ],
    [UTILITY_TYPES.WIND]: [
      UNIT_TYPES.GJ,
      UNIT_TYPES.kBTU,
      UNIT_TYPES.kWH,
      UNIT_TYPES.MWH,
      UNIT_TYPES.MBTU,
      UNIT_TYPES.MMBTU,
      UNIT_TYPES.DTH
    ],
    [UTILITY_TYPES.NATURAL_GAS]: [
      UNIT_TYPES.CCF,
      UNIT_TYPES.CF,
      UNIT_TYPES.CM,
      UNIT_TYPES.GJ,
      UNIT_TYPES.kBTU,
      UNIT_TYPES.kCF,
      UNIT_TYPES.MBTU,
      UNIT_TYPES.MMBTU,
      UNIT_TYPES.DTH,
      UNIT_TYPES.MCF,
      UNIT_TYPES.THERMS
    ],
    [UTILITY_TYPES.STEAM]: [
      UNIT_TYPES.GJ,
      UNIT_TYPES.kBTU,
      UNIT_TYPES.KG,
      UNIT_TYPES.KLBS,
      UNIT_TYPES.MLBS,
      UNIT_TYPES.LBS,
      UNIT_TYPES.THERMS,
      UNIT_TYPES.MBTU,
      UNIT_TYPES.MMBTU,
      UNIT_TYPES.DTH
    ],
    [UTILITY_TYPES.FUEL_OIL_1]: [
      UNIT_TYPES.GAL,
      UNIT_TYPES.GJ,
      UNIT_TYPES.kBTU,
      UNIT_TYPES.LITERS,
      UNIT_TYPES.MBTU,
      UNIT_TYPES.MMBTU,
      UNIT_TYPES.DTH
    ],
    [UTILITY_TYPES.FUEL_OIL_2]: [
      UNIT_TYPES.GAL,
      UNIT_TYPES.GJ,
      UNIT_TYPES.kBTU,
      UNIT_TYPES.LITERS,
      UNIT_TYPES.MBTU,
      UNIT_TYPES.MMBTU,
      UNIT_TYPES.DTH
    ],
    [UTILITY_TYPES.FUEL_OIL_4]: [
      UNIT_TYPES.GAL,
      UNIT_TYPES.GJ,
      UNIT_TYPES.kBTU,
      UNIT_TYPES.LITERS,
      UNIT_TYPES.MBTU,
      UNIT_TYPES.MMBTU,
      UNIT_TYPES.DTH
    ],
    [UTILITY_TYPES.FUEL_OIL_56]: [
      UNIT_TYPES.GAL,
      UNIT_TYPES.GJ,
      UNIT_TYPES.kBTU,
      UNIT_TYPES.LITERS,
      UNIT_TYPES.MBTU,
      UNIT_TYPES.MMBTU,
      UNIT_TYPES.DTH
    ],
    [UTILITY_TYPES.DIESEL]: [
      UNIT_TYPES.GAL,
      UNIT_TYPES.GJ,
      UNIT_TYPES.kBTU,
      UNIT_TYPES.LITERS,
      UNIT_TYPES.MBTU,
      UNIT_TYPES.MMBTU,
      UNIT_TYPES.DTH
    ],
    [UTILITY_TYPES.PROPANE]: [
      UNIT_TYPES.CCF,
      UNIT_TYPES.CF,
      UNIT_TYPES.GAL,
      UNIT_TYPES.GJ,
      UNIT_TYPES.kBTU,
      UNIT_TYPES.kCF,
      UNIT_TYPES.LITERS,
      UNIT_TYPES.MBTU,
      UNIT_TYPES.MMBTU,
      UNIT_TYPES.DTH
    ],
    [UTILITY_TYPES.KEROSENE]: [
      UNIT_TYPES.GAL,
      UNIT_TYPES.GJ,
      UNIT_TYPES.kBTU,
      UNIT_TYPES.LITERS,
      UNIT_TYPES.MBTU,
      UNIT_TYPES.MMBTU,
      UNIT_TYPES.DTH
    ],
    [UTILITY_TYPES.DISTRICT_HOT_WATER]: [
      UNIT_TYPES.GJ,
      UNIT_TYPES.kBTU,
      UNIT_TYPES.THERMS,
      UNIT_TYPES.MBTU,
      UNIT_TYPES.MMBTU,
      UNIT_TYPES.DTH
    ],
    [UTILITY_TYPES.DISTRICT_CHILLED_WATER_ELECTRIC_METER]: [
      UNIT_TYPES.GJ,
      UNIT_TYPES.kBTU,
      UNIT_TYPES.MBTU,
      UNIT_TYPES.MMBTU,
      UNIT_TYPES.DTH,
      UNIT_TYPES.TON_HOURS
    ],
    [UTILITY_TYPES.DISTRICT_CHILLED_WATER_ABSORPTION_METER]: [
      UNIT_TYPES.GJ,
      UNIT_TYPES.kBTU,
      UNIT_TYPES.MBTU,
      UNIT_TYPES.MMBTU,
      UNIT_TYPES.DTH,
      UNIT_TYPES.TON_HOURS
    ],
    [UTILITY_TYPES.DISTRICT_CHILLED_WATER_ENGINE_METER]: [
      UNIT_TYPES.GJ,
      UNIT_TYPES.kBTU,
      UNIT_TYPES.MBTU,
      UNIT_TYPES.MMBTU,
      UNIT_TYPES.DTH,
      UNIT_TYPES.TON_HOURS
    ],
    [UTILITY_TYPES.DISTRICT_CHILLED_WATER_OTHER_METER]: [
      UNIT_TYPES.GJ,
      UNIT_TYPES.kBTU,
      UNIT_TYPES.MBTU,
      UNIT_TYPES.MMBTU,
      UNIT_TYPES.DTH,
      UNIT_TYPES.TON_HOURS
    ],
    [UTILITY_TYPES.WOOD]: [
      UNIT_TYPES.GJ,
      UNIT_TYPES.kBTU,
      UNIT_TYPES.MBTU,
      UNIT_TYPES.MMBTU,
      UNIT_TYPES.DTH,
      UNIT_TYPES.TONNES,
      UNIT_TYPES.TONS
    ],
    [UTILITY_TYPES.WATER]: [
      UNIT_TYPES.CCF,
      UNIT_TYPES.CF,
      UNIT_TYPES.CGAL_UK,
      UNIT_TYPES.CGAL_US,
      UNIT_TYPES.CM,
      UNIT_TYPES.GAL_UK,
      UNIT_TYPES.GAL_US,
      UNIT_TYPES.kCF,
      UNIT_TYPES.kCM,
      UNIT_TYPES.kGAL_UK,
      UNIT_TYPES.kGAL_US,
      UNIT_TYPES.LITERS,
      UNIT_TYPES.MCF,
      UNIT_TYPES.MGAL_UK,
      UNIT_TYPES.MGAL_US
    ]
  }
  
   const UNIT_DETAILS = {
    [UTILITY_TYPES.ELECTRICITY]: {
      icon: 'flash_on',
      title: 'Electricity',
      defaultUnit: UNIT_TYPES.kWH,
      isConsumption: true
    },
    [UTILITY_TYPES.ELECTRICITY_DEMAND]: {
      icon: 'flash_on',
      title: 'Electricity Demand',
      defaultUnit: UNIT_TYPES.kW,
      isConsumption: true
    },
    [UTILITY_TYPES.SOLAR]: {
      icon: 'flash_on',
      title: 'Solar Generation',
      defaultUnit: UNIT_TYPES.kWH,
      isConsumption: true
    },
    [UTILITY_TYPES.WIND]: {
      icon: 'flash_on',
      title: 'On-Site Wind Generation',
      defaultUnit: UNIT_TYPES.kWH
    },
    [UTILITY_TYPES.NATURAL_GAS]: {
      icon: 'whatshot',
      title: 'Natural Gas',
      defaultUnit: UNIT_TYPES.THERMS,
      isConsumption: true
    },
    [UTILITY_TYPES.STEAM]: {
      icon: 'scatter_plot',
      title: 'District Steam',
      defaultUnit: UNIT_TYPES.MLBS,
      isConsumption: true
    },
    [UTILITY_TYPES.FUEL_OIL_1]: {
      title: 'Fuel Oil 1',
      isFuel: true,
      defaultUnit: UNIT_TYPES.GAL,
      isConsumption: false
    },
    [UTILITY_TYPES.FUEL_OIL_2]: {
      title: 'Fuel Oil 2',
      isFuel: true,
      defaultUnit: UNIT_TYPES.GAL,
      isConsumption: false
    },
    [UTILITY_TYPES.FUEL_OIL_4]: {
      title: 'Fuel Oil 4',
      isFuel: true,
      defaultUnit: UNIT_TYPES.GAL,
      isConsumption: false
    },
    [UTILITY_TYPES.FUEL_OIL_56]: {
      title: 'Fuel Oil 5 & 6',
      isFuel: true,
      defaultUnit: UNIT_TYPES.GAL,
      isConsumption: false
    },
    [UTILITY_TYPES.DIESEL]: {
      title: 'Diesel',
      isFuel: true,
      defaultUnit: UNIT_TYPES.GAL,
      isConsumption: false
    },
    [UTILITY_TYPES.KEROSENE]: {
      title: 'Kerosene',
      isFuel: true,
      defaultUnit: UNIT_TYPES.GAL,
      isConsumption: false
    },
    [UTILITY_TYPES.PROPANE]: {
      title: 'Propane',
      isFuel: true,
      defaultUnit: UNIT_TYPES.GAL,
      isConsumption: false
    },
    [UTILITY_TYPES.DISTRICT_HOT_WATER]: {
      icon: 'water',
      title: 'District Hot Water',
      defaultUnit: UNIT_TYPES.kBTU,
      isConsumption: true
    },
    [UTILITY_TYPES.DISTRICT_CHILLED_WATER_ELECTRIC_METER]: {
      icon: 'water',
      title: 'District Chilled Water Electric Meter',
      defaultUnit: UNIT_TYPES.TON_HOURS,
      isConsumption: true
    },
    [UTILITY_TYPES.DISTRICT_CHILLED_WATER_ABSORPTION_METER]: {
      icon: 'water',
      title: 'District Chilled Water Absorption Meter',
      defaultUnit: UNIT_TYPES.TON_HOURS,
      isConsumption: true
    },
    [UTILITY_TYPES.DISTRICT_CHILLED_WATER_ENGINE_METER]: {
      icon: 'water',
      title: 'District Chilled Water Engine Meter',
      defaultUnit: UNIT_TYPES.TON_HOURS,
      isConsumption: true
    },
    [UTILITY_TYPES.DISTRICT_CHILLED_WATER_OTHER_METER]: {
      icon: 'water',
      title: 'District Chilled Water Other Meter',
      defaultUnit: UNIT_TYPES.TON_HOURS,
      isConsumption: true
    },
    [UTILITY_TYPES.WOOD]: {
      icon: 'forest',
      title: 'Wood',
      defaultUnit: UNIT_TYPES.TONS,
      isConsumption: true
    },
    [UTILITY_TYPES.WATER]: {
      icon: 'water',
      title: 'Water',
      defaultUnit: UNIT_TYPES.CCF,
      isConsumption: true
    }
  }
  
   const getDefaultCommoditySettings = () => {
    return Object.entries(UNIT_DETAILS).reduce((agg, [commodity, details]) => {
      agg[commodity] = {
        unit: details.defaultUnit,
        siteEmissionFactor: 0,
        sourceEmissionFactor: 0
      }
      return agg
    }, {})
  }

module.exports = {
    UTILITY_TYPES,
    UNIT_DETAILS,
    getDefaultCommoditySettings
};
  