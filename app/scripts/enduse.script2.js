"use strict";

const fs = require("fs");
const path = require("path");

const _ = require("lodash");
const moment = require("moment");
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;
const request = require("request-promise");

const { Building } = require("../models/building.server.model");
const { MonthlyUtilities } = require("../models/monthlyutility.script.model");
const { MonthlyEndUse } = require("../models/monthlyenduse.script.model");
const { YearlyEndUse } = require("../models/yearlyenduse.script.model");

const endUse = async (options) => {
    try {
        console.log("Script Started...");
        const buildingIds = options && options.buildingIds || null;
        const years = options && options.years || null;
        const months = options && options.months || null;
        const yearly = options && options.yearly || false;
        const buildings = await getBuildings(buildingIds);
        for (let building of buildings) {
            const buildingId = building && building._id || null;
            
        }
    } catch (error) {
        console.error(error);
    } finally {
        console.log("Script Ended...");
    }
};

const getBuildings = async (buildingIds = null) => {
    try {
        buildingIds = buildingIds && buildingIds.map(bid => ObjectId(bid)) || null;
        const filter = {};
        if (buildingIds && buildingIds.length > 0) {
            filter["_id"] = {
                "$in": buildingIds
            };
        }
        const buildings = await Building.find(filter).exec();
        return Promise.resolve(buildings || []);
    } catch (error) {
        return Promise.resolve([]);
    }
};

module.exports = {
    endUse
}