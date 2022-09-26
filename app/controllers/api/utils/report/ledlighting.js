const { indexOf } = require('lodash')

const qualifiedOptions = {
  dlc_qualified: [
    'LED Outdoor Canopy or Soffit lighting 25W - 60W',
    'LED Outdoor Canopy or Soffit lighting 61W - 150W',
    'LED Linear Ambient <=35W (T12 Baseline)',
    'LED Linear Ambient 36-60W (T12 Baseline)',
    'LED Linear Ambient 61-100W (T12 Baseline)',
    'LED High Bay Fixture - 75-94W (HID)',
    'LED High Bay Fixture - 95-189W (HID)',
    'LED High Bay Fixture - 190-290W (HID)',
    'LED High Bay Fixture - 291-464W (HID)',
    'LED High Bay Fixture - 465-625W (HID)',
    'LED High Bay Fixture Kit - 75-94W (HID)',
    'LED High Bay Fixture Kit - 95-189W (HID)',
    'LED High Bay Fixture Kit - 190-290W (HID)',
    'LED High Bay Fixture Kit - 291-464W (HID)',
    'LED High Bay Fixture Kit - 465-625W (HID)',
    'LED High Bay Fixture - 75-94W (Linear Fluorescent)',
    'LED High Bay Fixture - 95-189W (Linear Fluorescent)',
    'LED High Bay Fixture - 190-290W (Linear Fluorescent)',
    'LED High Bay Fixture Kit - 75-94W (Linear Fluorescent)',
    'LED High Bay Fixture Kit - 95-189W (Linear Fluorescent)',
    'LED High Bay Fixture Kit - 190-290W (Linear Fluorescent)',
    'LED Tube Type A, A/B 2 foot',
    'LED Tube Type A, A/B 4 foot',
    'LED Tube Type A, A/B 4 foot (Until 11/20)',
    'LED Tube Type A 8 foot',
    'LED Tube Type B 4 foot',
    'LED Tube Type B 4 foot (Until 11/20)',
    'LED Tube Type B 8 foot',
    'LED Tube Type C 2 foot',
    'LED Tube Type C 4 foot',
    'LED Tube Type C 4 foot (Until 11/20)',
    'LED Tube Type C 8 foot',
    'PLs 2 pin or 4 pin 5-21W',
    'Mogul Base 30-39W (HID)',
    'Mogul Base 40-49W (HID)',
    'Mogul Base 50-79W (HID)',
    'Mogul Base 80-119W (HID)',
    'Mogul Base 120-144W (HID)',
    'Mogul Base 120-230W (HID)',
    'Mogul Base 145-230W (HID)',
    'A19 40W (0-749 lumens)',
    'A19 60W (750-1049 lumens)',
    'A19 75W (1050-1489 lumens)',
    'A19 60W (1490+ lumens)',
    'Decorative (B, BA, BT, C, CA, DC, F, G, P, PS, S, ST, T)',
    'BR30, R30, ER30',
    'BR40, R40, ER40',
    'MR16',
    'PAR16',
    'PAR20, R20',
    'PAR30, PAR30L',
    'PAR38',
    'Interior Screw In Fixture Retrofit',
    'LED Area Lighting - 45-65W',
    'LED Area Lighting - 66-89W',
    'LED Area Lighting - 90-119W',
    'LED Area Lighting - 120-140W',
    'LED Area Lighting - 141-199W',
    'LED Area Lighting - 200-550W',
    'LED Parking Garage Lighting 25W-60W',
    'LED Parking Garage lighting 61W - 83W',
    'LED Parking Garage Wall Pack <= 25W',
    'LED Parking Garage Wall Pack 26W - 60W',
    'LED Parking Garage Wall Pack 61W - 150W',
    "LED Ref and Frz Cases 5' or 6' doors",
    'LED Stairwell Fixture (Linear Fluorescent)',
    'LED Stairwell Fixture (CFL)',
    'LED Stairwell Fixture (HID)',
    'LED Street Lighting - 55-79W',
    'LED Street Lighting - 80-109W',
    'LED Street Lighting - 110-139W',
    'LED Street Lighting - 140-209W',
    'LED Troffer Fixture 1X4',
    'LED Troffer Fixture 2X2',
    'LED Troffer Fixture 2X4',
    'LED Troffer Retrofit Kit 1X4',
    'LED Troffer Retrofit Kit 2X2',
    'LED Troffer Retrofit Kit 2X4',
    'LED Exterior Wall Pack <= 25W',
    'LED Exterior Wall Pack 26W - 60W',
    'LED Exterior Wall Pack 61W - 150W',
    'LED/LEC Exit Sign'
  ],
  energy_star_qualified: [
    'LED Interior Fixture <= 25W',
    'LED Interior Fixture 26W - 50W',
    'LED Interior Fixture <= 25W (CFL Base)',
    'LED Interior Fixture 26W - 50W (CFL Base)'
  ]
}

const qualifiedDefaultValue = [
  {
    name: 'LED Outdoor Canopy or Soffit lighting 25W - 60W',
    incentiveValue: {
      yes: 20,
      no: 15
    },
    cost: 311.25,
    unit: 'fixture'
  },
  {
    name: 'LED Outdoor Canopy or Soffit lighting 61W - 150W',
    incentiveValue: {
      yes: 25,
      no: 18.75
    },
    cost: 200.04,
    unit: 'fixture'
  },
  {
    name: 'LED Linear Ambient <=35W (T12 Baseline)',
    incentiveValue: {
      yes: 15,
      no: 11.25
    },
    cost: 153.91,
    unit: 'fixture'
  },
  {
    name: 'LED Linear Ambient 36-60W (T12 Baseline)',
    incentiveValue: {
      yes: 15,
      no: 11.25
    },
    cost: 185.68,
    unit: 'fixture'
  },
  {
    name: 'LED Linear Ambient 61-100W (T12 Baseline)',
    incentiveValue: {
      yes: 25,
      no: 18.75
    },
    cost: 268.87,
    unit: 'fixture'
  },
  {
    name: 'LED High Bay Fixture - 75-94W (HID)',
    incentiveValue: {
      yes: 75,
      no: 56.25
    },
    unit: 'fixture'
  },
  {
    name: 'LED High Bay Fixture - 95-189W (HID)',
    incentiveValue: {
      yes: 135,
      no: 101.25
    },
    cost: 274.06,
    unit: 'fixture'
  },
  {
    name: 'LED High Bay Fixture - 190-290W (HID)',
    incentiveValue: {
      yes: 150,
      no: 112.5
    },
    cost: 533.43,
    unit: 'fixture'
  },
  {
    name: 'LED High Bay Fixture - 291-464W (HID)',
    incentiveValue: {
      yes: 200,
      no: 150
    },
    cost: 765.0,
    unit: 'fixture'
  },
  {
    name: 'LED High Bay Fixture - 465-625W (HID)',
    incentiveValue: {
      yes: 250,
      no: 187.5
    },
    cost: 1403.23,
    unit: 'fixture'
  },
  {
    name: 'LED High Bay Fixture Kit - 75-94W (HID)',
    incentiveValue: {
      yes: 30,
      no: 22.5
    },
    unit: 'fixture'
  },
  {
    name: 'LED High Bay Fixture Kit - 95-189W (HID)',
    incentiveValue: {
      yes: 40,
      no: 30
    },
    cost: 135.53,
    unit: 'fixture'
  },
  {
    name: 'LED High Bay Fixture Kit - 190-290W (HID)',
    incentiveValue: {
      yes: 50,
      no: 37.5
    },
    unit: 'fixture'
  },
  {
    name: 'LED High Bay Fixture Kit - 291-464W (HID)',
    incentiveValue: {
      yes: 80,
      no: 60
    },
    unit: 'fixture'
  },
  {
    name: 'LED High Bay Fixture Kit - 465-625W (HID)',
    incentiveValue: {
      yes: 160.0,
      no: 120.0
    },
    unit: 'fixture'
  },
  {
    name: 'LED High Bay Fixture - 75-94W (Linear Fluorescent)',
    incentiveValue: {
      yes: 75.0,
      no: 56.25
    },
    unit: 'fixture'
  },
  {
    name: 'LED High Bay Fixture - 95-189W (Linear Fluorescent)',
    incentiveValue: {
      yes: 135.0,
      no: 101.25
    },
    cost: 274.06,
    unit: 'fixture'
  },
  {
    name: 'LED High Bay Fixture - 190-290W (Linear Fluorescent)',
    incentiveValue: {
      yes: 150.0,
      no: 112.5
    },
    cost: 533.43,
    unit: 'fixture'
  },
  {
    name: 'LED High Bay Fixture Kit - 75-94W (Linear Fluorescent)',
    incentiveValue: {
      yes: 30.0,
      no: 22.5
    },
    unit: 'fixture'
  },
  {
    name: 'LED High Bay Fixture Kit - 95-189W (Linear Fluorescent)',
    incentiveValue: {
      yes: 40.0,
      no: 30.0
    },
    cost: 135.53,
    unit: 'fixture'
  },
  {
    name: 'LED High Bay Fixture Kit - 190-290W (Linear Fluorescent)',
    incentiveValue: {
      yes: 50.0,
      no: 37.5
    },
    unit: 'fixture'
  },
  {
    name: 'LED Tube Type A, A/B 2 foot',
    incentiveValue: {
      yes: 2.0,
      no: 1.5
    },
    unit: 'lamp'
  },
  {
    name: 'LED Tube Type A, A/B 4 foot',
    incentiveValue: {
      yes: 2.0,
      no: 1.5
    },
    unit: 'lamp'
  },
  {
    name: 'LED Tube Type A, A/B 4 foot (Until 11/20)',
    incentiveValue: {
      yes: 3.0,
      no: 2.25
    },
    cost: 15.94,
    unit: 'lamp'
  },
  {
    name: 'LED Tube Type A 8 foot',
    incentiveValue: {
      yes: 6.0,
      no: 4.5
    },
    unit: 'lamp'
  },
  {
    name: 'LED Tube Type B 4 foot',
    incentiveValue: {
      yes: 3.0,
      no: 2.25
    },
    unit: 'lamp'
  },
  {
    name: 'LED Tube Type B 4 foot (Until 11/20)',
    incentiveValue: {
      yes: 4.0,
      no: 3.0
    },
    cost: 16.34,
    unit: 'lamp'
  },
  {
    name: 'LED Tube Type B 8 foot',
    incentiveValue: {
      yes: 8.0,
      no: 6.0
    },
    unit: 'lamp'
  },
  {
    name: 'LED Tube Type C 2 foot',
    incentiveValue: {
      yes: 5.0,
      no: 3.75
    },
    unit: 'lamp'
  },
  {
    name: 'LED Tube Type C 4 foot',
    incentiveValue: {
      yes: 5.0,
      no: 3.75
    },
    unit: 'lamp'
  },
  {
    name: 'LED Tube Type C 4 foot (Until 11/20)',
    incentiveValue: {
      yes: 6.0,
      no: 4.5
    },
    cost: 25.08,
    unit: 'lamp'
  },
  {
    name: 'LED Tube Type C 8 foot',
    incentiveValue: {
      yes: 12.0,
      no: 9.0
    },
    unit: 'lamp'
  },
  {
    name: 'PLs 2 pin or 4 pin 5-21W',
    incentiveValue: {
      yes: 7.0,
      no: 5.25
    },
    cost: 18.0,
    unit: 'lamp'
  },
  {
    name: 'Mogul Base 30-39W (HID)',
    incentiveValue: {
      yes: 30.0,
      no: 22.5
    },
    cost: 147.0,
    unit: 'lamp'
  },
  {
    name: 'Mogul Base 40-49W (HID)',
    incentiveValue: {
      yes: 40.0,
      no: 30.0
    },
    cost: 147.0,
    unit: 'lamp'
  },
  {
    name: 'Mogul Base 50-79W (HID)',
    incentiveValue: {
      yes: 50.0,
      no: 37.5
    },
    cost: 147.0,
    unit: 'lamp'
  },
  {
    name: 'Mogul Base 80-119W (HID)',
    incentiveValue: {
      yes: 60.0,
      no: 45.0
    },
    cost: 147.0,
    unit: 'lamp'
  },
  {
    name: 'Mogul Base 120-144W (HID)',
    incentiveValue: {
      yes: 75.0,
      no: 56.25
    },
    unit: 'lamp'
  },
  {
    name: 'Mogul Base 120-230W (HID)',
    incentiveValue: {
      yes: 85.0,
      no: 63.75
    },
    cost: 147.0,
    unit: 'lamp'
  },
  {
    name: 'Mogul Base 145-230W (HID)',
    incentiveValue: {
      yes: 75.0,
      no: 56.25
    },
    unit: 'lamp'
  },
  {
    name: 'A19 40W (0-749 lumens)',
    incentiveValue: {
      yes: 1.0,
      no: 0.75
    },
    cost: 11.0,
    unit: 'lamp'
  },
  {
    name: 'A19 60W (750-1049 lumens)',
    incentiveValue: {
      yes: 3.0,
      no: 2.25
    },
    cost: 11.0,
    unit: 'lamp'
  },
  {
    name: 'A19 75W (1050-1489 lumens)',
    incentiveValue: {
      yes: 4.0,
      no: 3.0
    },
    cost: 11.0,
    unit: 'lamp'
  },
  {
    name: 'A19 60W (1490+ lumens)',
    incentiveValue: {
      yes: 6.0,
      no: 4.5
    },
    cost: 11.0,
    unit: 'lamp'
  },
  {
    name: 'Decorative (B, BA, BT, C, CA, DC, F, G, P, PS, S, ST, T)',
    incentiveValue: {
      yes: 4.0,
      no: 3.0
    },
    cost: 11.0,
    unit: 'lamp'
  },
  {
    name: 'BR30, R30, ER30',
    incentiveValue: {
      yes: 5.0,
      no: 3.75
    },
    cost: 11.0,
    unit: 'lamp'
  },
  {
    name: 'BR40, R40, ER40',
    incentiveValue: {
      yes: 6.0,
      no: 4.5
    },
    cost: 11.0,
    unit: 'lamp'
  },
  {
    name: 'BR40, R40, ER40',
    incentiveValue: {
      yes: 6.0,
      no: 4.5
    },
    cost: 11.0,
    unit: 'lamp'
  },
  {
    name: 'MR16',
    incentiveValue: {
      yes: 5.0,
      no: 3.75
    },
    cost: 11.0,
    unit: 'lamp'
  },
  {
    name: 'PAR16',
    incentiveValue: {
      yes: 3.0,
      no: 2.25
    },
    cost: 11.0,
    unit: 'lamp'
  },
  {
    name: 'PAR20, R20',
    incentiveValue: {
      yes: 4.0,
      no: 3.0
    },
    cost: 11.0,
    unit: 'lamp'
  },
  {
    name: 'PAR30, PAR30L',
    incentiveValue: {
      yes: 5.0,
      no: 3.75
    },
    cost: 11.0,
    unit: 'lamp'
  },
  {
    name: 'PAR38',
    incentiveValue: {
      yes: 10.0,
      no: 7.5
    },
    cost: 11.0,
    unit: 'lamp'
  },
  {
    name: 'Interior Screw In Fixture Retrofit',
    incentiveValue: {
      yes: 9.0,
      no: 6.75
    },
    cost: 23.94,
    unit: 'lamp'
  },
  {
    name: 'LED Area Lighting - 45-65W',
    incentiveValue: {
      yes: 35.0,
      no: 26.25
    },
    cost: 349.6,
    unit: 'fixture'
  },
  {
    name: 'LED Area Lighting - 66-89W',
    incentiveValue: {
      yes: 35.0,
      no: 26.25
    },
    cost: 307.73,
    unit: 'fixture'
  },
  {
    name: 'LED Area Lighting - 90-119W',
    incentiveValue: {
      yes: 40.0,
      no: 30.0
    },
    cost: 422.99,
    unit: 'fixture'
  },
  {
    name: 'LED Area Lighting - 120-140W',
    incentiveValue: {
      yes: 50.0,
      no: 37.5
    },
    cost: 550.2,
    unit: 'fixture'
  },
  {
    name: 'LED Area Lighting - 141-199W',
    incentiveValue: {
      yes: 60.0,
      no: 45.0
    },
    cost: 537.06,
    unit: 'fixture'
  },
  {
    name: 'LED Area Lighting - 200-550W',
    incentiveValue: {
      yes: 90.0,
      no: 67.5
    },
    cost: 910.87,
    unit: 'fixture'
  },
  {
    name: 'LED Parking Garage Lighting 25W-60W',
    incentiveValue: {
      yes: 115.0,
      no: 86.25
    },
    cost: 321.76,
    unit: 'fixture'
  },
  {
    name: 'LED Parking Garage lighting 61W - 83W',
    incentiveValue: {
      yes: 125.0,
      no: 93.75
    },
    cost: 282.31,
    unit: 'fixture'
  },
  {
    name: 'LED Parking Garage Wall Pack <= 25W',
    incentiveValue: {
      yes: 30.0,
      no: 22.5
    },
    cost: 285.16,
    unit: 'fixture'
  },
  {
    name: 'LED Parking Garage Wall Pack 26W - 60W',
    incentiveValue: {
      yes: 60.0,
      no: 45.0
    },
    cost: 281.38,
    unit: 'fixture'
  },
  {
    name: 'LED Parking Garage Wall Pack 61W - 150W',
    incentiveValue: {
      yes: 75.0,
      no: 56.25
    },
    cost: 628.33,
    unit: 'fixture'
  },
  {
    name: "LED Ref and Frz Cases 5' or 6' doors",
    incentiveValue: {
      yes: 45.0,
      no: 33.75
    },
    cost: 158.81,
    unit: 'door'
  },
  {
    name: 'LED Stairwell Fixture (Linear Fluorescent)',
    incentiveValue: {
      yes: 40.0,
      no: 30.0
    },
    cost: 181.11,
    unit: 'fixture'
  },
  {
    name: 'LED Stairwell Fixture (CFL)',
    incentiveValue: {
      yes: 40.0,
      no: 30.0
    },
    cost: 181.11,
    unit: 'fixture'
  },
  {
    name: 'LED Stairwell Fixture (HID)',
    incentiveValue: {
      yes: 40.0,
      no: 30.0
    },
    cost: 181.11,
    unit: 'fixture'
  },
  {
    name: 'LED Street Lighting - 55-79W',
    incentiveValue: {
      yes: 25.0,
      no: 18.75
    },
    cost: 454.87,
    unit: 'fixture'
  },
  {
    name: 'LED Street Lighting - 80-109W',
    incentiveValue: {
      yes: 25.0,
      no: 18.75
    },
    cost: 274.48,
    unit: 'fixture'
  },
  {
    name: 'LED Street Lighting - 110-139W',
    incentiveValue: {
      yes: 40.0,
      no: 30.0
    },
    cost: 555.51,
    unit: 'fixture'
  },
  {
    name: 'LED Street Lighting - 140-209W',
    incentiveValue: {
      yes: 50.0,
      no: 37.5
    },
    cost: 513.36,
    unit: 'fixture'
  },
  {
    name: 'LED Troffer Fixture 1X4',
    incentiveValue: {
      yes: 30.0,
      no: 22.5
    },
    cost: 155.8,
    unit: 'fixture'
  },
  {
    name: 'LED Troffer Fixture 2X2',
    incentiveValue: {
      yes: 30.0,
      no: 22.5
    },
    cost: 121.14,
    unit: 'fixture'
  },
  {
    name: 'LED Troffer Fixture 2X4',
    incentiveValue: {
      yes: 30.0,
      no: 22.5
    },
    cost: 168.08,
    unit: 'fixture'
  },
  {
    name: 'LED Troffer Retrofit Kit 1X4',
    incentiveValue: {
      yes: 30.0,
      no: 22.5
    },
    cost: 142.1,
    unit: 'fixture'
  },
  {
    name: 'LED Troffer Retrofit Kit 2X2',
    incentiveValue: {
      yes: 30.0,
      no: 22.5
    },
    cost: 106.82,
    unit: 'fixture'
  },
  {
    name: 'LED Troffer Retrofit Kit 2X4',
    incentiveValue: {
      yes: 30.0,
      no: 22.5
    },
    cost: 147.49,
    unit: 'fixture'
  },
  {
    name: 'LED Exterior Wall Pack <= 25W',
    incentiveValue: {
      yes: 15.0,
      no: 11.25
    },
    cost: 165.1,
    unit: 'fixture'
  },
  {
    name: 'LED Exterior Wall Pack 26W - 60W',
    incentiveValue: {
      yes: 30.0,
      no: 22.5
    },
    cost: 219.51,
    unit: 'fixture'
  },
  {
    name: 'LED Exterior Wall Pack 61W - 150W',
    incentiveValue: {
      yes: 50.0,
      no: 37.5
    },
    cost: 347.84,
    unit: 'fixture'
  },
  {
    name: 'LED Interior Fixture <= 25W',
    incentiveValue: {
      yes: 35.0,
      no: 26.25
    },
    unit: 'fixture'
  },
  {
    name: 'LED Interior Fixture 26W - 50W',
    incentiveValue: {
      yes: 50.0,
      no: 37.5
    },
    unit: 'fixture'
  },
  {
    name: 'LED Interior Fixture <= 25W (CFL Base)',
    incentiveValue: {
      yes: 25.0,
      no: 18.75
    },
    unit: 'fixture'
  },
  {
    name: 'LED Interior Fixture 26W - 50W (CFL Base)',
    incentiveValue: {
      yes: 35.0,
      no: 26.25
    },
    unit: 'fixture'
  },
  {
    name: 'LED/LEC Exit Sign',
    incentiveValue: {
      yes: 25.0,
      no: 25.0
    },
    cost: 84.05,
    unit: 'fixture'
  }
]

const getQualifiedFlag = (fieldName, rebate) => {
  if (rebate == '') return false
  return qualifiedOptions[fieldName].indexOf(rebate) != -1
}

const getValueFromQualifiedOption = (
  rebate,
  dlc_qualified,
  energy_star_qualified
) => {
  let option = [
    {
      key: 'dlc_qualified',
      value: dlc_qualified
    },
    {
      key: 'energy_star_qualified',
      value: energy_star_qualified
    }
  ]
  let qualifiedOption = option.filter(item =>
    getQualifiedFlag(item.key, rebate)
  )
  let incentiveValue = 0,
    costValue = 0,
    unit = ''
  if (qualifiedOption.length) {
    qualifiedOption = qualifiedOption[0]
    let data = qualifiedDefaultValue.filter(item => item.name === rebate)
    if (data.length) {
      data = data[0]
      incentiveValue = data.incentiveValue[qualifiedOption.value] || 0
      costValue = data.cost || 0
      unit = data.unit
    }
  }
  return {
    incentiveValue,
    costValue,
    unit
  }
}

const calculateAnnualHours = (project) => {
  let value = 0;
  let selectedValue = project.initialValues.xcelLEDlighting_annual_lighting_hours;
  let field = project.fields.filter(item=>item.name === 'xcelLEDlighting_annual_lighting_hours');
  if(!field.length)
    return 0;
  let option = field[0].options;
  // other option
  if(typeof selectedValue === 'string' && selectedValue.split(' - ')[0].toLocaleLowerCase()==='other'){
    value = + selectedValue.split(' - ')[1];
  } else {
    option = option.filter(item => item.value === selectedValue);
    if(option.length){
      value = option[0].annual;
    }
  }
  return value;
}

module.exports = {
  qualifiedOptions,
  qualifiedDefaultValue,
  getQualifiedFlag,
  getValueFromQualifiedOption,
  calculateAnnualHours
};
