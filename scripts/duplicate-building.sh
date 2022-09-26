#!/bin/bash

BUILDING_ID=someobjectid

building = db.buildings.findOne({_id: ${BUILDING_ID}})
delete building._id
building.buildingName = "Copied Building"
building.projectIds = []
building.utilityIds = []
inserted = db.buildings.insert(building)
db.organizations.update({_id: ObjectId(${BUILDING_ID})}, { $push: { buildingIds: inserted._id } })