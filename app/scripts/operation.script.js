const { Building } = require('../models/building.server.model')

const days = [
  { displayValue: 'Sun', value: 'sunday' },
  { displayValue: 'M', value: 'monday' },
  { displayValue: 'T', value: 'tuesday' },
  { displayValue: 'W', value: 'wednesday' },
  { displayValue: 'Th', value: 'thursday' },
  { displayValue: 'F', value: 'friday' },
  { displayValue: 'Sa', value: 'saturday' }
]


const calculate = (sum, x, y, value) => {
  return +(sum + ((x - y) * value) / 100).toFixed(2)
}

const calculateAnnualHours = (values, weeklyHours, holidays) => {
  let sum = 0
  let time
  time = +weeklyHours
  let hours = 0,
    array = values.holiday
  if (array.length == 0) hours = 24
  else if (array.length == 1)
    hours = calculate(hours, 24, array[0].hour, array[0].value)
  else {
    for (let i = 1; i < array.length; i++) {
      hours = calculate(
        hours,
        array[i].hour,
        array[i - 1].hour,
        array[i - 1].value
      )
      if (i == array.length - 1)
        hours = calculate(hours, 24, array[i].hour, array[i].value)
    }
  }
  sum = +(sum + (time * (365 - holidays)) / 7 + hours * holidays).toFixed(2)
  if (weeklyHours === 0 && time == 0 && !array.length) sum = 0
  return sum < 8760 ? sum : 8760
}

const calculateWeeklyHour = values => {
  let weeklyHours = 0
  for (let j = 0; j < days.length; j++) {
    let key = days[j].value
    let array = values[key]

    if (array.length == 1) {
      weeklyHours = calculate(weeklyHours, 24, array[0].hour, array[0].value)
    }
    for (let i = 1; i < array.length; i++) {
      weeklyHours = calculate(
        weeklyHours,
        array[i].hour,
        array[i - 1].hour,
        array[i - 1].value
      )
      if (i == array.length - 1) {
        weeklyHours = calculate(weeklyHours, 24, array[i].hour, array[i].value)
      }
    }
  }
  return weeklyHours
}

const runOperationScript = async id => {
  let result = await Building.findById(id)
    .populate([
      'locations.location',
      'locations.equipment',
      'constructions.construction',
      'operations.schedule'
    ])
    .lean()

  let operations = result.operations || []
  let needUpdateOperations = operations
  .filter(operation => {
    let name = operation.scheduleName || ''
    return name === ''
  })
  let needUpdateIds = operations
    .map((operation, index) => {
      let name = operation.scheduleName || ''
      return name === '' ? index : -1
    })
    .filter(item => item !== -1)
  const length = needUpdateOperations.length
  if(length) {
    let building = await Building.findById(id).lean()
    let originalOperation = building.operations || []
    let setPointIndex = 0, operationalIndex = 0
    for (let i = 0; i < length; i++) {
  
      originalOperation = originalOperation.map((item, index) =>{
        if(index === needUpdateIds[i]){
          let scheduleType =
          needUpdateOperations[i].schedule &&
          needUpdateOperations[i].schedule.scheduleType || ''
          let newScheduleName = ''
          if(scheduleType === 'operational'){
            operationalIndex++
            newScheduleName = `Operational Schedule ${operationalIndex}`
            let { weeklyHours, annualHours, holidays } = item
            if(!holidays)
              holidays = 13
            if(weeklyHours==-1 || !weeklyHours) {
              weeklyHours = calculateWeeklyHour(item)
            }
            if(annualHours==-1 || !annualHours){
              annualHours = calculateAnnualHours(item, weeklyHours, holidays)
            }
            return { ...item, scheduleName: newScheduleName, holidays, weeklyHours, annualHours }
          } else if(scheduleType === 'setpoint'){
            setPointIndex++
            newScheduleName = `SetPoint Schedule ${setPointIndex}`
            return { ...item, scheduleName: newScheduleName }
          }
        } else  
          return item
      }
      )
    }
    building = await Building.findById(id)
    building.operations = originalOperation
    building.markModified('operations')
    await building.save()
  }
}

module.exports = {
  runOperationScript
}