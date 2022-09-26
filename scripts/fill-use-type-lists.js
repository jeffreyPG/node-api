'use strict';
console.log(__dirname);
const	config = require('../config/config');
const	mongoose = require('mongoose');
const BuildingSchema = require('../app/models/building.server.model');

mongoose.Promise = global.Promise;
fillUseTypes().then(() => {});
async function fillUseTypes() {
  let Building;
  try {
    console.log(config.db.uri, config.db.options);
    const db = await mongoose.connect(config.db.uri, config.db.options);
    Building = db.model('Building');
  } catch (e) {
    console.log(e);
  }
  const buildings = await Building.find();
  const updatedBuildings = buildings.map(async building => {
    if (!building.buildingUseTypes || building.buildingUseTypes.length === 0) {
      building.buildingUseTypes.push({
        use: building.buildingUse,
        squareFeet: building.squareFeet,
      });
    } else {
      const primaryUseType = building.buildingUseTypes.find(type => type.use === building.buildingUse);
      if (!primaryUseType) {
        const currentTotalArea = building.buildingUseTypes.reduce((a, b) => a + Number(b.squareFeet), 0);
        // set area of primary to building area minus total area of existing uses
        let areaOfPrimary = building.squareFeet - currentTotalArea;
        // if it's less than or equal to zero set it as the same as total building.
        if (areaOfPrimary <= 0) {
          areaOfPrimary = building.squareFeet;
        }
        building.buildingUseTypes.push({
          use: building.buildingUse,
          squareFeet: areaOfPrimary,
        });
      }
    }
    try {
      console.log('SAVING BUILDING', building._id)
      const savedBuilding = await building.save()
      return savedBuilding
    } catch (err) {
      console.log("COULD NOT UPDATE BUILDING:", building._id)
      return Promise.resolve(true)
    }
  })
  return Promise.all(updatedBuildings);
}

