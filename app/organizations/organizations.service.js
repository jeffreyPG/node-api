const repository = require("../repository");

exports.getBuildingIds = (organizationIds, buildingIds) => {
  if (organizationIds) {
    return repository.organizations.findByIdsWithBuildings(organizationIds).then(organizations => {
      let organizationsBuildingIds = organizations && organizations.map(org => org.buildingIds).map(value => value && value.toString()) || null;
      if (organizationsBuildingIds && organizationsBuildingIds.length === 1 && organizationsBuildingIds[0].indexOf(",") !== -1) organizationsBuildingIds = organizationsBuildingIds[0].split(",");
      return Object.assign(buildingIds || [], organizationsBuildingIds);
    });
  } else if (buildingIds) {
    return Promise.resolve(buildingIds || []);
  }
};