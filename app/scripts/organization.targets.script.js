"use strict";

const fs = require("fs");
const path = require("path");

const _ = require("lodash");
const moment = require("moment");
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;
const Organization = mongoose.model('Organization');
const datawarehouseDb = require('../models/datawarehouse')

const { horizontalLine } = require("./utils/log.utils");

const logFilePath = path.join(__dirname, '/logs/organization.targets.logs');

const sync = async (options = null) => {
    let successfullIds = [];
    let failedIds = [];
    try {
        fs.appendFileSync(logFilePath, `\n${horizontalLine(120, "-")}\n${moment().utc().toLocaleString()} Script Started\n${horizontalLine(120, "-")}\n`);
        const organizationIds = options && options.organizationIds || [];
        const organizations = await getOrganizations(organizationIds);
        for(let organization of organizations) {
          let targets = organization.targets || []
          await datawarehouseDb.OrganizationTarget.destroy({
            where: { _sdc_source_key__id: organization._id.toString() }
          })
          for (let i = 0 ; i < targets.length ; i++) {
            await datawarehouseDb.OrganizationTarget.create({
							_sdc_source_key__id: organization._id.toString(),
							_sdc_level_0_id: i,
							name: targets[i].name,
							description: targets[i].description,
							baselineyear: targets[i].baselineYear,
							targetyear: targets[i].targetYear,
							reduction: targets[i].reduction
            })
          }
          successfullIds.push(organization._id.toString())
        }
    } catch (error) {
        console.error(error);
        console.log(error);
    } finally {
        successfullIds = [... new Set(successfullIds)];
        failedIds = [... new Set(failedIds)];
        fs.appendFileSync(logFilePath, `Successfully updated projects for Ids: ${successfullIds}\n`);
        fs.appendFileSync(logFilePath, `Failed update projects for Ids: ${failedIds}\n`);
        fs.appendFileSync(logFilePath, `Script Ended...\n`);
    }
};

const getOrganizations = async (organizationIds = []) => {
    try {
        fs.appendFileSync(logFilePath, `Getting Organization Data...\n`);
        const filter = {
            "buildingIds.0": {
                "$exists": true
            }
        };
        if (organizationIds && organizationIds.length) {
            organizationIds = organizationIds.map(bid => ObjectId(bid));
            filter["_id"] = {
                "$in": organizationIds
            }
        }
        const organizations = await Organization.find(filter).exec();
        return Promise.resolve(organizations);
    } catch (error) {
        fs.appendFileSync(logFilePath, `Error: ${error}\n`);
        return Promise.resolve([]);
    }
};

module.exports = {
    sync
};