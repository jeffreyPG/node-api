"use strict";

module.exports = function(app) {
  const api = require("../../app/controllers/api.server.controller");
  const monthlyUtilitiesRoutes = require("../monthlyutilities/monthlyutilities.routes");
  const weatherRoutes = require("../weather/weather.routes");
  const cron = require("node-cron");
  monthlyUtilitiesRoutes(app);
  weatherRoutes(app);
  /**
   * Email Endpoints
   */
  app.route("/emailstatus").post(api.processEmailNotification, api.log);

  /**
   * Token Endpoints
   */
  app
    .route("/auth/token")
    .get(
      api.authRequireBasic,
      api.authUserCheck,
      api.tokenCreateSecret,
      api.log
    )
    .delete(
      api.authRequireAuth0,
      api.authUserCheck,
      api.tokenRemoveSecret,
      api.log
    );
  app
    .route("/auth/mobile/token")
    .get(
      api.authRequireBasic,
      api.authUserCheck,
      api.tokenCreateSignedJwt,
      api.log
    );

  /**
   * Account Endpoints
   */
  app.route("/account/verify/:verifyCode").get(api.verifyUser, api.log);
  app
    .route("/account/verify")
    .post(
      api.authRequireAuth0,
      api.authUserCheck,
      api.createUserVerifyCode,
      api.log
    );

  /**
   * Admin Endpoints
   */
  app
    .route("/admin/user")
    // update anything on an existing user
    .put(api.authRequireBasic, api.authUserCheck, api.adminUpdateUser, api.log);
  app
    .route("/admin/users")
    // get multiple user objects
    .post(api.authRequireBasic, api.authUserCheck, api.adminGetUsers, api.log);
  app
    .route("/admin/v2/users")
    // get multiple user objects
    .get(api.authRequireAuth0, api.authUserCheck, api.adminGetUsersV2, api.log)
    .post(api.authRequireAuth0, api.authUserCheck, api.createUser, api.log);
  app
    .route("/admin/v2/users/:userId")
    .get(api.authRequireAuth0, api.authUserCheck, api.getUserV2, api.log);

  app
    .route("/admin/v2/users/activate")
    .get(api.authRequireAuth0, api.authUserCheck, api.activateUser, api.log);

  app
    .route("/admin/user/getOrganizations")
    // get a user's organizations
    .post(
      api.authRequireBasic,
      api.authUserCheck,
      api.adminGetUsersOrganizations,
      api.log
    );
  // batch create users in organization
  app
    .route("/admin/user/batch")
    .post(
      api.authRequireBasic,
      api.authUserCheck,
      api.batchCreateUsersInOrganization,
      api.log
    );
  // batch add users to organization
  app
    .route("/admin/user/batch/:organizationId")
    .post(
      api.authRequireBasic,
      api.authUserCheck,
      api.addNewUserToExistingOrg,
      api.log
    );

  // Get organizations by name
  app
    .route("/admin/organizations")
    .post(
      api.authRequireBasic,
      api.authUserCheck,
      api.adminGetOrganizations,
      api.log
    );
  app
    .route("/admin/v2/organizations")
    // get multiple user objects
    .get(
      api.authRequireAuth0,
      api.authUserCheck,
      api.adminGetOrganizationsV2,
      api.log
    )
    .post(api.authRequireAuth0, api.authUserCheck, api.createUser, api.log);

  // Change a user's role on the organization object
  app
    .route("/admin/organization/:organizationId/userRole")
    .put(
      api.authRequireBasic,
      api.authUserCheck,
      api.adminUpdateUsersRoles,
      api.log
    );
  // Remove a user from the organization object
  app
    .route("/admin/organization/:organizationId/userRemove")
    .put(api.authRequireBasic, api.adminRemoveUserFromOrg, api.log);
  // Add an existing user to an existing organization
  app
    .route("/admin/organization/:organizationId/userAdd")
    .put(api.authRequireBasic, api.adminAddUserToOrg, api.log);
  app
    .route("/admin/v2/organization/:organizationId/user/:userId")
    .post(api.adminAddUserToOrgV2, api.log);
  // Remove a user from the database
  app
    .route("/admin/userRemove")
    .delete(api.authRequireBasic, api.adminRemoveUserFromDB, api.log);
  // Remove an organization
  app
    .route("/admin/organization/:organizationId/remove")
    .delete(api.authRequireBasic, api.adminRemoveOrg, api.log);
  app
    .route("/admin/feature")
    .get(
      api.authRequireBasic,
      api.authAdminTokenCheck,
      api.authUserCheck,
      api.adminGetFeatures,
      api.log
    )
    .post(
      api.authRequireBasic,
      api.authAdminTokenCheck,
      api.authUserCheck,
      api.adminCreateFeature,
      api.log
    );
  app
    .route("/admin/feature/:featureId")
    .put(
      api.authRequireBasic,
      api.authAdminTokenCheck,
      api.authUserCheck,
      api.adminUpdateFeature,
      api.log
    )
    .delete(
      api.authRequireBasic,
      api.authAdminTokenCheck,
      api.authUserCheck,
      api.adminDeleteFeature,
      api.log
    );
  app
    .route("/admin/feature/user")
    .get(
      api.authRequireBasic,
      api.authAdminTokenCheck,
      api.authUserCheck,
      api.adminGetFeatureUsers,
      api.log
    )
    .post(
      api.authRequireBasic,
      api.authAdminTokenCheck,
      api.authUserCheck,
      api.adminCreateFeatureUser,
      api.log
    );
  app
    .route("/admin/feature/user/batch")
    .post(
      api.authRequireBasic,
      api.authAdminTokenCheck,
      api.authUserCheck,
      api.adminBatchCreateFeatureUsers,
      api.log
    )
    .delete(
      api.authRequireBasic,
      api.authAdminTokenCheck,
      api.authUserCheck,
      api.adminBatchDeleteFeatureUsers,
      api.log
    );
  app
    .route("/admin/feature/user/:featureuserId")
    .delete(
      api.authRequireBasic,
      api.authAdminTokenCheck,
      api.authUserCheck,
      api.adminDeleteFeatureUser,
      api.log
    );

  /**
   * User Endpoints
   */
  app
    .route("/user")
    .post(api.createUser, api.log)
    .get(api.authRequireAuth0, api.authUserCheck, api.getUser, api.log)
    .put(api.authRequireAuth0, api.authUserCheck, api.updateUser, api.log);

  app
    .route("/userById")
    .get(api.authRequireAuth0, api.authUserCheck, api.getUserById, api.log);

  // User - Password
  app
    .route("/user/password")
    .get(api.requestForgottenPassword, api.log)
    .put(api.authRequireBasic, api.updateUserPassword, api.log);

  app.route("/user/profile").put(api.updateProfile, api.log);

  app
    .route("/user/:userId/organizations")
    .get(
      api.authRequireAuth0,
      api.authUserCheck,
      api.getUsersOrganizations,
      api.log
    );

  app
    .route("/user/createBuildingGroup")
    .post(
      api.authRequireAuth0,
      api.authUserCheck,
      api.createBuildingGroup,
      api.log
    );
  app
    .route("/user/buildingGroups")
    .get(
      api.authRequireAuth0,
      api.authUserCheck,
      api.fetchBuildingGroup,
      api.log
    );
  app
    .route("/user/buildingGroup/:buildingGroupId")
    .post(
      api.authRequireAuth0,
      api.authUserCheck,
      api.updateBuildingGroup,
      api.log
    )
    .delete(
      api.authRequireAuth0,
      api.authUserCheck,
      api.deleteBuildingGroup,
      api.log
    );

  /**
   * Organization Endpoints
   */
  app
    .route("/organization")
    .post(
      api.authRequireAuth0,
      api.authUserCheck,
      api.createOrganization,
      api.log
    );
  app
    .route("/organization/:organizationId")
    .get(api.authRequireAuth0, api.authUserCheck, api.getOrganization, api.log)
    .put(
      api.authRequireAuth0,
      api.authUserCheck,
      api.updateOrganization,
      api.log
    );

  app
    .route("/organization/:organizationId/archive")
    .post(
      api.authRequireAuth0,
      api.authUserCheck,
      api.archiveOrganization,
      api.log
    );
  // updating /admin/v2 routes for testing buildee-admin app
  app
    .route("/admin/v2/organization/:organizationId/user")
    .get(
      api.authRequireAuth0,
      api.authUserCheck,
      api.getOrganizationUsers,
      api.log
    )
    .post(
      api.authRequireAuth0,
      api.authUserCheck,
      api.addOrganizationUser,
      api.log
    );
  app
    .route("/admin/v2/organization/:organizationId/user/:userId")
    .get(
      api.authRequireAuth0,
      api.authUserCheck,
      api.getOrganizationUsers,
      api.log
    )
    .put(
      api.authRequireAuth0,
      api.authUserCheck,
      api.updateOrganizationUser,
      api.log
    )
    .delete(
      api.authRequireAuth0,
      api.authUserCheck,
      api.deleteOrganizationUser,
      api.log
    );
  // Organization - user management Endpoints
  app
    .route("/organization/:organizationId/user")
    .get(
      api.authRequireAuth0,
      api.authUserCheck,
      api.getOrganizationUsers,
      api.log
    )
    .post(
      api.authRequireAuth0,
      api.authUserCheck,
      api.addOrganizationUser,
      api.log
    );
  app
    .route("/organization/user/all")
    .get(
      api.authRequireAuth0,
      api.authUserCheck,
      api.getAllOrganizationUsers,
      api.log
    );
  app
    .route("/organization/:organizationId/user/:userId")
    .put(
      api.authRequireAuth0,
      api.authUserCheck,
      api.updateOrganizationUser,
      api.log
    )
    .delete(
      api.authRequireAuth0,
      api.authUserCheck,
      api.deleteOrganizationUser,
      api.log
    );
  app
    .route("/organization/:organizationId/confirmUser/:confirmationCode")
    .get(api.confirmUser, api.log);

  app
    .route("/organization/:organizationId/existingUser")
    .post(
      api.authRequireAuth0,
      api.authUserCheck,
      api.addOrganizationExistingUser,
      api.log
    );

  /**
   * Project Endpoints
   */
  app
    .route("/project")
    .get(api.authRequireAuth0, api.authUserCheck, api.getAllMeasures, api.log);
  app
    .route("/measure")
    .get(api.authenticate, api.authUserCheck, api.getOnlyMeasures, api.log);
  app
    .route(
      "/organization/:organizationId/project/:projectId/building/:buildingId"
    )
    .delete(
      api.authRequireAuth0,
      api.authUserCheck,
      api.deleteProject,
      api.log
    );
  app
    .route("/measureOrProjectById")
    .get(api.authRequireJwt, api.getMeasureOrProjectById, api.log);
  app
    .route("/survey/:buildingId/project/:projectId/run") // Used for Survey App
    .post(api.authRequireJwt, api.runPrescriptiveProject, api.log);

  app
    .route("/organization/:organizationId/project")
    .post(
      api.authRequireAuth0,
      api.authUserCheck,
      api.createOrganizationProject,
      api.log
    )
    .get(
      api.authRequireAuth0,
      api.authUserCheck,
      api.getOrganizationProject,
      api.log
    );
  app
    .route("/organization/project/all")
    .get(
      api.authRequireAuth0,
      api.authUserCheck,
      api.getAllOrganizationProject,
      api.log
    );

  app
    .route("/organization/:organizationId/project/:projectId")
    .delete(
      api.authRequireAuth0,
      api.authUserCheck,
      api.deleteOrganizationProject,
      api.log
    )
    .put(
      api.authRequireAuth0,
      api.authUserCheck,
      api.editOrganizationProject,
      api.log
    );

  /**
   * Building Endpoints
   */
  app
    .route("/organization/:organizationId/building")
    .get(api.authenticate, api.authUserCheck, api.getBuildings, api.log)
    .post(api.authRequireAuth0, api.authUserCheck, api.createBuilding, api.log);
  app
    .route("/survey/organization/:organizationId/building")
    .get(api.authRequireJwt, api.getBuildings, api.log)
    .post(api.authRequireJwt, api.createBuilding, api.log);
  app
    .route("/organization/:organizationId/building/batch")
    .post(
      api.authRequireAuth0,
      api.authUserCheck,
      api.batchCreateBuildings,
      api.log
    );
  app
    .route("/admin/organization/:organizationId/building/:buildingId/sync")
    .get(api.authRequireBasic, api.authUserCheck, api.syncNewBuilding, api.log);
  app
    .route("/organization/:organizationId/building/:buildingId")
    .get(api.authRequireAuth0, api.authUserCheck, api.getBuilding, api.log)
    .put(api.authRequireAuth0, api.authUserCheck, api.updateBuilding, api.log)
    .delete(
      api.authRequireAuth0,
      api.authUserCheck,
      api.deleteBuilding,
      api.log
    );
  app
    .route("/survey/organization/:organizationId/building/:buildingId")
    .get(api.authRequireJwt, api.getBuilding, api.log)
    .put(api.authRequireJwt, api.updateBuilding, api.log);
  app
    .route("/organization/:organizationId/sampleBuilding")
    .post(
      setConnectionTimeout(120000), // 2 minutes
      api.authRequireAuth0,
      api.authUserCheck,
      api.createSampleBuilding,
      api.log
    );
  // Building Rate
  app
    .route("/organization/:organizationId/building/:buildingId/rate")
    .get(api.authRequireAuth0, api.authUserCheck, api.getBuildingRate, api.log);
  // Building - Project
  app
    .route("/building/:buildingId/project")
    .post(api.authRequireJwt, api.addBuildingProject, api.log);
  app
    .route("/building/:buildingId/project/:projectId")
    .put(
      api.authRequireAuth0,
      api.authUserCheck,
      api.addIncompleteProject,
      api.log
    );
  app
    .route("/building/:buildingId/projectBulkAdd")
    .put(api.authRequireAuth0, api.authUserCheck, api.bulkAddProjects, api.log);
  app
    .route("/building/:buildingId/projectBulkEvaluate")
    .put(
      api.authRequireAuth0,
      api.authUserCheck,
      api.bulkEvaluateProjects,
      api.log
    );
  app
    .route("/building/:buildingId/measure/:measureId")
    .post(
      api.authRequireAuth0,
      api.authUserCheck,
      api.addIncompleteProject,
      api.log
    );
  app.route("/building/:buildingId/project/:projectId/run").put(
    setConnectionTimeout(43200000), // 12 hours
    api.authRequireAuth0,
    api.authUserCheck,
    api.runPrescriptiveProject,
    api.log
  );
  app
    .route("/building/:buildingId/measure/:measureId/run")
    .post(
      api.authRequireAuth0,
      api.authUserCheck,
      api.runPrescriptiveProject,
      api.log
    );

  // Building - Project Analysis
  app
    .route("/building/:buildingId/project/:projectId/analysis")
    .post(api.authenticate, api.createProjectAnalysis, api.log);

  // Building - Project Simulation
  app
    .route("/building/:buildingId/project_simulation")
    .post(api.authRequireJwt, api.createProjectSimulation, api.log);
  app
    .route("/building/:buildingId/project_simulation/:projectSimulationId")
    .get(api.authRequireJwt, api.getProjectSimulation, api.log);

  // Building - Project with subProject Analaysis

  app.route("/building/:buildingId/analysisProjectWithSubProject").post(
    setConnectionTimeout(43200000), // 12 hours
    api.authRequireAuth0,
    api.authUserCheck,
    api.analysisProjectWithSubProject,
    api.log
  );

  // remove subProject

  app
    .route("/project/subProject")
    .delete(
      api.authRequireAuth0,
      api.authUserCheck,
      api.removeSubProjects,
      api.log
    );

  app
    .route("/project/subProject/:projectId")
    .delete(
      api.authRequireAuth0,
      api.authUserCheck,
      api.removeSubProject,
      api.log
    );

  app.route("/building/:buildingId/createProjectWithSubProject").post(
    setConnectionTimeout(43200000), // 12 hours
    api.authRequireAuth0,
    api.authUserCheck,
    api.createProjectWithSubProject,
    api.log
  );

  // Building - Benchmarks
  app
    .route("/building/:buildingId/fullbenchmark")
    .get(
      api.authRequireAuth0,
      api.authUserCheck,
      api.getFullAnalysisBenchmark,
      api.log
    );
  app
    .route("/building/:buildingId/fullbenchmarkUtil")
    .get(
      api.authRequireAuth0,
      api.authUserCheck,
      api.getFullAnalysisBenchmarkUtil,
      api.log
    );

  // currently uses /eub from benchmarking api
  app
    .route("/building/:buildingId/enduse")
    .get(api.authRequireAuth0, api.authUserCheck, api.getEndUse, api.log);

  // currently uses simple cbecs (estimated end use)
  app
    .route("/building/:buildingId/enduseUtil")
    .get(api.authRequireAuth0, api.authUserCheck, api.getEndUseUtil, api.log);
  app
    .route("/building/:buildingId/enduse/estimated")
    .get(api.authRequireAuth0, api.authUserCheck, api.getEndUseUtil, api.log);

  // currently uses /eub from benchmarking api
  app
    .route("/building/:buildingId/enduseActualUtil")
    .get(api.getEndUseActualUtil, api.log);

  /**
   * Utility Endpoints
   */
  app
    .route("/building/:buildingId/utility")
    .get(api.authRequireAuth0, api.authUserCheck, api.getUtilities, api.log)
    .post(
      api.authRequireAuth0,
      api.authUserCheck,
      api.createUtility,
      api.syncEndUse,
      api.log
    );
  app
    .route("/building/:buildingId/utility/weather")
    .post(api.authRequireAuth0, api.authUserCheck, api.getWeather, api.log);
  app
    .route("/building/:buildingId/utility/changePointAnalysis")
    .post(
      api.authRequireAuth0,
      api.authUserCheck,
      api.getChangePointAnalysis,
      api.log
    );
  app
    .route("/building/:buildingId/utility/csv")
    .post(
      api.authRequireAuth0,
      api.authUserCheck,
      api.processCsvUtility,
      api.syncEndUse,
      api.log
    );
  app
    .route("/building/:buildingId/utility/:utilityId")
    .put(
      api.authRequireAuth0,
      api.authUserCheck,
      api.editUtility,
      api.syncEndUse,
      api.log
    )
    .delete(
      api.authRequireAuth0,
      api.authUserCheck,
      api.deleteUtility,
      api.syncEndUse,
      api.log
    );

  /**
   * Template Endpoints
   */
  app
    .route("/organization/:organizationId/template")
    .get(api.authRequireAuth0, api.authUserCheck, api.getOrgTemplates, api.log)
    .post(
      api.authRequireAuth0,
      api.authUserCheck,
      api.createOrgTemplate,
      api.log
    );
  app
    .route("/organization/template/all")
    .get(
      api.authRequireAuth0,
      api.authUserCheck,
      api.getAllOrgTemplates,
      api.log
    );
  app
    .route("/organization/:organizationId/template/:templateId")
    .get(api.authRequireAuth0, api.authUserCheck, api.getOrgTemplate, api.log)
    .put(
      api.authRequireAuth0,
      api.authUserCheck,
      api.updateOrgTemplates,
      api.log
    )
    .delete(
      api.authRequireAuth0,
      api.authUserCheck,
      api.deleteOrgTemplate,
      api.log
    );

  // organization measure v2

  app
    .route("/organization/:organizationId/analysisProjectWithSubProject")
    .get(
      api.authRequireAuth0,
      api.authUserCheck,
      api.analysisProjectWithSubProject,
      api.log
    )
    .post(
      api.authRequireAuth0,
      api.authUserCheck,
      api.createOrgTemplate,
      api.log
    );

  app
    .route("/organization/:organizationId/copyProjectWithSubProject")
    .post(
      api.authRequireAuth0,
      api.authUserCheck,
      api.copyProjectWithSubProject,
      api.log
    );

  app.route("/organization/:organizationId/createProjectWithSubProject").post(
    setConnectionTimeout(43200000), // 12 hours
    api.authRequireAuth0,
    api.authUserCheck,
    api.updateOrganizationProjectWithSubProject,
    api.log
  );

  // Report Endpoints
  app
    .route("/report/user/:userId/building/:buildingId/template/:templateId")
    .get(
      setConnectionTimeout(600000), // 10 minutes
      api.getTemplateReport,
      api.log
    );
  app
    .route("/report/user/:userId/sendEmail")
    .post(
      api.authRequireAuth0,
      api.authUserCheck,
      api.sendReportEmail,
      api.log
    );

  app
    .route(
      "/report/user/:userId/building/:buildingId/template/:templateId/enduse"
    )
    .post(api.addReportEndUse, api.log);

  app
    .route("/report/user/:userId/building/:buildingId/nycExcel")
    .get(api.getNYCExcelData, api.log);

  app
    .route("/report/user/:userId/building/:buildingId/bsxml")
    .get(api.getBSXMLExcelData, api.log);

  // PDF reports Endpoitns

  app.route("/pdf/export").get(
    setConnectionTimeout(600000), // 10 minutes
    api.getPDFReport,
    api.log
  );
  /**
   * Portfolio Manager Endpoints
   */
  // Integration Endpoints
  app
    .route("/portfolio/propertyList")
    .get(
      api.authRequireAuth0,
      api.authUserCheck,
      api.getPortfolioPropertyList,
      api.log
    );

  app
    .route("/organization/:organizationId/portfolio/property/import")
    .post(api.authRequireAuth0, api.authUserCheck, api.pmImport, api.log);
  app
    .route("/organization/:organizationId/portfolio/property/syncScore")
    .post(api.authRequireAuth0, api.authUserCheck, api.updatePMScore, api.log);
  app
    .route("/organization/:organizationId/portfolio/property/import/update")
    .post(api.authRequireAuth0, api.authUserCheck, api.pmImportUpdate, api.log);
  app
    .route("/organization/:organizationId/portfolio/property/export")
    .post(api.authRequireAuth0, api.authUserCheck, api.pmExport, api.log);
  app
    .route("/organization/:organizationId/portfolio/property/export/update")
    .post(api.authRequireAuth0, api.authUserCheck, api.pmExportUpdate, api.log);
  app
    .route("/organization/:organizationId/portfolio/property/link")
    .post(
      api.authRequireAuth0,
      api.authUserCheck,
      api.linkToBuildeeBuilding,
      api.log
    );

  app
    .route("/portfolio/account")
    .get(
      api.authRequireAuth0,
      api.authUserCheck,
      api.getPortfolioAccountList,
      api.log
    );
  app
    .route("/portfolio/account/add")
    .post(
      api.authRequireAuth0,
      api.authUserCheck,
      api.addPortfolioAccount,
      api.log
    );

  app
    .route("/portfolio/account/delete")
    .post(
      api.authRequireAuth0,
      api.authUserCheck,
      api.deletePortfolioConnection,
      api.log
    );

  // User Sync
  app
    .route("/portfolio/account/sync")
    .post(
      api.authRequireAuth0,
      api.authUserCheck,
      api.getPortfolioAccountSync,
      api.log
    );
  app
    .route("/portfolio/property/sync")
    .post(
      api.authRequireAuth0,
      api.authUserCheck,
      api.getPortfolioPropertySync,
      api.log
    );
  app
    .route("/portfolio/meter/sync")
    .post(
      api.authRequireAuth0,
      api.authUserCheck,
      api.getPortfolioMeterSync,
      api.log
    );

  /**
   * Firebase Integration Endpoints
   */
  app
    .route("/firebase/changeAudit")
    .get(
      api.authRequireAuth0,
      api.authUserCheck,
      api.changeFirebaseAudit,
      api.log
    );
  app
    .route("/organization/:organizationId/firebase/orgBuildings")
    .get(
      api.authRequireAuth0,
      api.authUserCheck,
      api.getFirebaseBuildings,
      api.log
    );
  app
    .route("/firebase/component")
    .get(
      api.authRequireAuth0,
      api.authUserCheck,
      api.getFirebaseComponent,
      api.log
    );

  app
    .route("/firebase/query/images")
    .get(api.authRequireAuth0, api.authUserCheck, api.getImageList, api.log);
  app
    .route("/firebase/building")
    .post(
      api.authRequireAuth0,
      api.authUserCheck,
      api.createFirebaseBuilding,
      api.log
    );

  /**
   * Asset Endpoints
   */
  app
    .route("/publicAssets")
    .get(api.authRequireAuth0, api.authUserCheck, api.getPublicAssets, api.log);
  app
    .route("/building/:buildingId/asset")
    .get(api.authRequireAuth0, api.authUserCheck, api.getAssets, api.log)
    .post(api.authRequireAuth0, api.authUserCheck, api.createAsset, api.log);
  app
    .route("/building/:buildingId/asset/:assetId")
    .get(api.authRequireAuth0, api.authUserCheck, api.getAsset, api.log)
    .put(api.authRequireAuth0, api.authUserCheck, api.updateAsset, api.log)
    .delete(api.authRequireAuth0, api.authUserCheck, api.deleteAsset, api.log);
  app
    .route("/building/:buildingId/download/assets")
    .get(api.downloadAssets, api.log);
  /**
   * Upload Endpoints
   */
  app.route("/upload/image").post(api.imageUpload, api.log);
  app.route("/upload/file/word").post(api.fileWordUpload, api.log);
  app.route("/upload/file/pdf").post(api.filePdfUpload, api.log);

  /**
   * Excel Export Endpoints
   */
  app
    .route("/spreadsheet/template")
    .get(
      api.authRequireAuth0,
      api.authUserCheck,
      api.getSpreadsheetTemplate,
      api.log
    )
    .post(
      api.authRequireAuth0,
      api.authUserCheck,
      api.saveSpreadsheetTemplate,
      api.log
    );
  app
    .route("/spreadsheet/template/all")
    .get(
      api.authRequireAuth0,
      api.authUserCheck,
      api.getAllOrgSpreadsheetTemplate,
      api.log
    );

  app
    .route("/spreadsheet/template/:spreadsheetId")
    .get(
      api.authRequireAuth0,
      api.authUserCheck,
      api.getSpreadsheetTemplateById,
      api.log
    )
    .put(
      api.authRequireAuth0,
      api.authUserCheck,
      api.updateSpreadsheetTemplate,
      api.log
    )
    .delete(
      api.authRequireAuth0,
      api.authUserCheck,
      api.deleteSpreadsheetTemplate,
      api.log
    );

  /**
   * Data sources Endpoints
   */
  app
    .route("/datasource")
    .get(api.authRequireAuth0, api.authUserCheck, api.getDatasources, api.log);

  // Excel Report Download Endpoints
  app
    .route("/building/:buildingId/spreadsheet/report/:spreadsheetId")
    .get(api.getExcelReportDownload, api.log);

  /** -------------------------------------------------------------------------------------------------------------- **/

  // Library Key Access Endpoints
  app
    .route("/library/key")
    .post(
      api.authRequireBasic,
      api.authUserCheck,
      api.adminUpdateUser,
      api.userLibraryKey,
      api.log
    );

  app
    .route("/key")
    .post(
      api.authRequireBasic,
      api.authUserCheck,
      api.adminUpdateUser,
      api.apiKey,
      api.log
    );

  // Library Endpoints - Components
  app
    .route("/library/component/:componentType")
    .get(
      api.authRequireKey,
      api.authKeyCheck,
      api.getLibraryComponents,
      api.log
    )
    .post(
      api.authRequireKey,
      api.authKeyCheck,
      api.createLibraryComponent,
      api.log
    )
    .delete(
      api.authRequireKey,
      api.authKeyCheck,
      api.deleteLibraryComponent,
      api.log
    );
  app
    .route("/library/component/update/:componentType")
    .put(
      api.authRequireKey,
      api.authKeyCheck,
      api.updateLibraryComponent,
      api.log
    );

  // Library Endpoints - Public Components
  app
    .route("/library/public/component/:componentType")
    .get(
      api.authRequireKey,
      api.authKeyCheck,
      api.getPublicComponents,
      api.log
    );
  app
    .route("/library/public/measure")
    .get(api.authRequireKey, api.authKeyCheck, api.getPublicMeasures, api.log);

  // Library Endpoints - Measures
  app
    .route("/library/measure")
    .get(api.authRequireKey, api.authKeyCheck, api.getLibraryMeasures, api.log)
    .post(
      api.authRequireKey,
      api.authKeyCheck,
      api.createLibraryMeasure,
      api.log
    )
    .delete(
      api.authRequireKey,
      api.authKeyCheck,
      api.deleteLibraryMeasure,
      api.log
    );
  app
    .route("/library/measure/update")
    .put(
      api.authRequireKey,
      api.authKeyCheck,
      api.updateLibraryMeasure,
      api.log
    );

  // Library Search Endpoints
  app
    .route("/library/search/measure")
    .get(
      api.authRequireKey,
      api.authKeyCheck,
      api.searchLibraryMeasure,
      api.log
    );
  app
    .route("/library/search/component/:componentType")
    .get(
      api.authRequireKey,
      api.authKeyCheck,
      api.searchLibraryComponent,
      api.log
    );

  // Library Query Proxy Endpoints
  app
    .route("/library/query")
    .post(api.authRequireKey, api.authKeyCheck, api.queryLibraryProxy, api.log);

  // Library Offline Sync Endpoints
  app
    .route("/library/sync")
    .get(api.authRequireKey, api.authKeyCheck, api.syncLibrary, api.log);
  app
    .route("/library/public/sync")
    .get(api.authRequireKey, api.authKeyCheck, api.syncPublicLibrary, api.log);

  // Library Upload Endpoints
  app
    .route("/library/csv/upload")
    .post(
      api.authRequireKey,
      api.authKeyCheck,
      api.processLibraryCsvUpload,
      api.log
    );

  // Charts EndPoints
  app.route("/chart").get(api.getViews, api.log);
  app
    .route("/building/:buildingId/chart/:viewId/preview")
    .get(api.getPreview, api.log);

  // Scripts EndPoint
  app.route("/scripts/enduse").post(api.enduse, api.log);
  app.route("/scripts/projectV2").post(api.projectV2, api.log);
  app.route("/scripts/projectghg").post(api.projectghg, api.log);
  app.route("/scripts/projectSync").post(api.projectSync, api.log);
  app.route("/scripts/projectMetric").post(api.projectMetric, api.log);
  app.route("/scripts/scenarioMetric").post(api.scenarioMetric, api.log);
  app.route("/scripts/scenarioghg").post(api.scenarioGhg, api.log);
  app.route("/scripts/packageMetric").post(api.packageMetric, api.log);
  app.route("/scripts/featureSync").post(api.featureSync, api.log);
  app.route("/scripts/featureUpdate").post(api.featureUpdate, api.log);
  app.route("/scripts/chart").post(api.chartUpdate, api.log);
  app.route("/scripts/chartV2").post(api.chartUpdateV2, api.log);
  app.route("/scripts/buildingSync").post(api.buildingSync, api.log);
  app
    .route("/scripts/measureTemplate")
    .post(api.measureTemplateUpdate, api.log);
  app
    .route("/scripts/organizationUserTemplateSync")
    .post(api.organizationUserTemplateSync, api.log);
  app
    .route("/scripts/organizationSharedSync")
    .post(api.organizationSharedSync, api.log);

  // Portfolio Dashboard EndPoints
  app.route("/portfolio/dashboard").post(
    setConnectionTimeout(43200000), // 12 hours
    api.authenticate,
    api.authUserCheck,
    api.getPortfolioDashboard,
    api.log
  );
  app
    .route("/portfolio/building")
    .post(
      api.authenticate,
      api.authUserCheck,
      api.getPortfolioBuilding,
      api.log
    );

  // Portfolio Scenario EndPoints
  app
    .route("/portfolio/scenarios")
    .get(
      api.authenticate,
      api.authUserCheck,
      api.getPortfolioScenarios,
      api.log
    )
    .post(
      setConnectionTimeout(43200000),
      api.authRequireAuth0,
      api.authUserCheck,
      api.createPortfolioScenario,
      api.log
    );
  app.route("/portfolio/scenario/check").get(api.checkScenarioSynced, api.log);
  app
    .route("/portfolio/scenario/:scenarioId")
    .put(
      setConnectionTimeout(43200000), // 12 hours
      api.authRequireAuth0,
      api.authUserCheck,
      api.updatePortfolioScenario,
      api.log
    )
    .delete(
      api.authRequireAuth0,
      api.authUserCheck,
      api.removePortfolioScenario,
      api.log
    );

  app
    .route("/portfolio/scenario/project/measure/:measureId")
    .post(
      api.authRequireAuth0,
      api.authUserCheck,
      api.addScenarioIncompleteProject,
      api.log
    );
  app
    .route("/portfolio/scenario/project/:projectId")
    .put(
      api.authRequireAuth0,
      api.authUserCheck,
      api.addScenarioIncompleteProject,
      api.log
    );

  // Scenario Convert Project
  app
    .route("/portfolio/scenario/convert/:scenarioId")
    .post(
      api.authRequireAuth0,
      api.authUserCheck,
      api.convertScenarioProject,
      api.log
    );

  // Scenario Measure Package
  app
    .route("/portfolio/scenario/measurePackage")
    .post(
      api.authRequireAuth0,
      api.authUserCheck,
      api.addScenarioMeasurePackage,
      api.log
    );
  // Portfolio Tableau Token
  app
    .route("/portfolio/tableauToken")
    .post(
      api.authRequireAuth0,
      api.authUserCheck,
      api.getTableauToken,
      api.log
    );

  // Project Package (Project v2.0)
  app
    .route("/building/:buildingId/projectPackage")
    .get(api.authenticate, api.authUserCheck, api.getProjectPackages, api.log)
    .post(
      api.authRequireAuth0,
      api.authUserCheck,
      api.createProjectPackage,
      api.log
    );

  app
    .route("/building/:buildingId/projectPackage/cancel")
    .delete(
      api.authRequireAuth0,
      api.authUserCheck,
      api.deleteBulkMeasureForProject,
      api.log
    );
  app
    .route("/building/:buildingId/projectPackage/:projectPackageId")
    .put(
      api.authRequireAuth0,
      api.authUserCheck,
      api.updateProjectPackage,
      api.log
    )
    .delete(
      api.authRequireAuth0,
      api.authUserCheck,
      api.removeProjectPackage,
      api.log
    );

  app
    .route("/building/:buildingId/packageproject/:projectId")
    .put(
      api.authRequireAuth0,
      api.authUserCheck,
      api.addIncompleteProjectPackage,
      api.log
    );

  app
    .route("/building/:buildingId/packagemeasure/:measureId")
    .put(
      api.authRequireAuth0,
      api.authUserCheck,
      api.addIncompleteProjectPackage,
      api.log
    );
  app
    .route("/cashflow")
    .post(api.authRequireAuth0, api.authUserCheck, api.getCashFlow, api.log);

  app
    .route("/building/:buildingId/reRunProjects")
    .post(
      api.authRequireAuth0,
      api.authUserCheck,
      api.reRunProjectsByIds,
      api.log
    );

  app
    .route("/building/:buildingId/reRunProjectPackage")
    .post(
      api.authRequireAuth0,
      api.authUserCheck,
      api.reRunProjectPackage,
      api.log
    );
  app
    .route("/portfolio/proposal/projects")
    .post(
      api.authRequireAuth0,
      api.authUserCheck,
      api.getPortfolioProjects,
      api.log
    );
  app
    .route("/portfolio/proposal/projects/refresh")
    .post(
      api.authRequireAuth0,
      api.authUserCheck,
      api.getRefetchPortfolioProjects,
      api.log
    );
  app
    .route("/portfolio/proposal/project/:projectId")
    .get(
      api.authRequireAuth0,
      api.authUserCheck,
      api.getProposalProject,
      api.log
    );
  app
    .route("/portfolio/proposal/projectPackages")
    .post(
      api.authRequireAuth0,
      api.authUserCheck,
      api.getPortfolioProjectPackages,
      api.log
    );

  app
    .route("/portfolio/proposal")
    .post(
      api.authRequireAuth0,
      api.authUserCheck,
      api.createPortfolioProposal,
      api.log
    );

  app
    .route("/portfolio/proposal/:proposalId")
    .put(
      api.authRequireAuth0,
      api.authUserCheck,
      api.updatePortfolioProposal,
      api.log
    )
    .delete(
      api.authRequireAuth0,
      api.authUserCheck,
      api.deletePortfolioProposal,
      api.log
    );

  // Measure Package (Project v2.0)
  app
    .route("/building/:buildingId/measurePackage")
    .get(api.authenticate, api.authUserCheck, api.getMeasurePackages, api.log)
    .post(
      api.authRequireAuth0,
      api.authUserCheck,
      api.createMeasurePackage,
      api.log
    );
  app
    .route("/building/:buildingId/measurePackage/measure/:projectId")
    .put(
      api.authRequireAuth0,
      api.authUserCheck,
      api.createMeasurePackageMeasure,
      api.log
    );
  app
    .route("/building/:buildingId/measurePackage/measure/:measureId")
    .post(
      api.authRequireAuth0,
      api.authUserCheck,
      api.createMeasurePackageMeasure,
      api.log
    );
  app
    .route("/building/:buildingId/measurePackage/:measurePackageId")
    .put(
      api.authRequireAuth0,
      api.authUserCheck,
      api.updateMeasurePackage,
      api.log
    )
    .delete(
      api.authRequireAuth0,
      api.authUserCheck,
      api.removeMeasurePackage,
      api.log
    );
  app
    .route("/building/:buildingId/reRunMeasurePackage")
    .post(
      api.authenticate,
      api.authUserCheck,
      api.createTempMeasurePackage,
      api.log
    );

  /* Proposal */
  app
    .route("/building/:buildingId/proposal")
    .get(api.authenticate, api.authUserCheck, api.getProposals, api.log)
    .post(api.authRequireAuth0, api.authUserCheck, api.createProposal, api.log);

  app
    .route("/building/:buildingId/proposal/:proposalId")
    .put(api.authRequireAuth0, api.authUserCheck, api.updateProposal, api.log)
    .delete(
      api.authRequireAuth0,
      api.authUserCheck,
      api.removeProposal,
      api.log
    );

  /* Proposal Template */
  app
    .route("/organization/:organizationId/proposalTemplates")
    .get(
      api.authenticate,
      api.authUserCheck,
      api.getProposalTemplates,
      api.log
    );

  /* SalesForce */
  app
    .route("/salesforce/connect")
    .put(
      api.authRequireAuth0,
      api.authUserCheck,
      api.connectSFAccount,
      api.log
    );
  app
    .route("/salesforce/test")
    .put(api.authRequireAuth0, api.authUserCheck, api.testSync, api.log);
  app
    .route("/salesforce/disconnect")
    .put(
      api.authRequireAuth0,
      api.authUserCheck,
      api.disconnectSFAccount,
      api.log
    );
  app.route("/salesforce/sync").put(
    setConnectionTimeout(43200000), // 12 hours
    api.authRequireAuth0,
    api.authUserCheck,
    api.forceSyncSFAccount,
    api.log
  );

  /* Portfolio Building Import */
  app
    .route("/portfolio/buildingImportSync")
    .post(
      api.authRequireAuth0,
      api.authUserCheck,
      api.portfolioBuildingImportSync,
      api.log
    );

  /* DocuSign */
  // Use refresh tokens to keep the access tokens fresh
  cron.schedule("0 0 * * *", async () => {
    await api.dsRefreshAuth();
  });
  cron.schedule("0 6 * * *", async () => {
    await api.dsRefreshAuth();
  });
  cron.schedule("0 12 * * *", async () => {
    await api.dsRefreshAuth();
  });
  cron.schedule("0 18 * * *", async () => {
    await api.dsRefreshAuth();
  });
  app
    .route("/ds/getAuthCodeGrantUri")
    .get(
      api.authRequireAuth0,
      api.authUserCheck,
      api.dsGetAuthCodeGrantUri,
      api.log
    );
  app
    .route("/ds/login")
    .put(api.authRequireAuth0, api.authUserCheck, api.dsLogin, api.log);
  app
    .route("/ds/logout")
    .put(api.authRequireAuth0, api.authUserCheck, api.dsLogout, api.log);
  app
    .route("/ds/loginStatus")
    .get(api.authRequireAuth0, api.authUserCheck, api.dsLoginStatus, api.log);
  app
    .route("/ds/sendEmail")
    .put(api.authRequireAuth0, api.authUserCheck, api.dsSendEmail, api.log);
  app
    .route("/ds/sendEmail/admin")
    .put(
      api.authRequireAuth0,
      api.authUserCheck,
      api.dsSendEmailAdmin,
      api.log
    );
  app
    .route("/ds/embeddedSign")
    .put(api.authRequireAuth0, api.authUserCheck, api.dsEmbeddedSign, api.log);
  app
    .route("/ds/listTemplates")
    .get(api.authRequireAuth0, api.authUserCheck, api.dsListTemplates, api.log);
  app
    .route("/ds/listTemplates/admin")
    .get(
      api.authRequireAuth0,
      api.authUserCheck,
      api.dsListAdminTemplates,
      api.log
    );
  app
    .route("/ds/listEnvelopes")
    .get(api.authRequireAuth0, api.authUserCheck, api.dsListEnvelopes, api.log);
  app
    .route("/ds/listLinkedEnvelopes")
    .get(
      api.authRequireAuth0,
      api.authUserCheck,
      api.dsGetLinkedEnvelopes,
      api.log
    );
  app
    .route("/ds/listEnvelopeDocuments")
    .get(
      api.authRequireAuth0,
      api.authUserCheck,
      api.dsListEnvelopeDocuments,
      api.log
    );
  app
    .route("/ds/downloadEnvelopeDocument")
    .get(api.dsDownloadEnvelopeDocument, api.log);
  app.route("/ds/downloadEnvelope").get(api.dsDownloadEnvelope, api.log);
  app
    .route("/ds/downloadEnvelope/admin")
    .get(api.dsDownloadEnvelopeAdmin, api.log);
  app
    .route("/ds/unlinkEnvelope")
    .put(
      api.authRequireAuth0,
      api.authUserCheck,
      api.dsUnlinkEnvelope,
      api.log
    );
  app
    .route("/ds/deleteEnvelope")
    .put(
      api.authRequireAuth0,
      api.authUserCheck,
      api.dsDeleteEnvelope,
      api.log
    );
  app
    .route("/ds/embeddedEnvelope")
    .put(
      api.authRequireAuth0,
      api.authUserCheck,
      api.dsEmbeddedEnvelope,
      api.log
    );
  app
    .route("/categorization")
    .get(
      api.authRequireAuth0,
      api.authUserCheck,
      api.getCategorizations,
      api.log
    );

  /**
   * Public API v1 Endpoints
   */
  /* Organization */
  app
    .route("/v1/user/:userId/organizations")
    .get(
      api.authRequireAuth0,
      api.authUserCheck,
      api.getUsersOrganizations,
      api.log
    );
  /* Users */
  app
    .route("/v1/organization/:organizationId/user")
    .get(
      api.authRequireAuth0,
      api.authUserCheck,
      api.getOrganizationUsers,
      api.log
    );
  /* Buildings */
  app
    .route("/v1/organization/:organizationId/building")
    .get(api.authenticate, api.authUserCheck, api.getBuildings, api.log)
    .post(api.authRequireAuth0, api.authUserCheck, api.createBuilding, api.log);
  app
    .route("/v1/organization/:organizationId/building/:buildingId")
    .get(api.authRequireAuth0, api.authUserCheck, api.getBuilding, api.log)
    .put(api.authRequireAuth0, api.authUserCheck, api.updateBuilding, api.log);
  /* Measures */
  app.route("/v1/building/:buildingId/measure/custom").put(
    setConnectionTimeout(43200000), // 12 hours
    api.authRequireAuth0,
    api.authUserCheck,
    api.runCustomMeasure,
    api.log
  );
  app.route("/v1/building/:buildingId/measure/custom/:projectId").put(
    setConnectionTimeout(43200000), // 12 hours
    api.authRequireAuth0,
    api.authUserCheck,
    api.runCustomMeasure,
    api.log
  );
  /* Projects */
  app
    .route("/v1/building/:buildingId/projectPackage")
    .get(api.authenticate, api.authUserCheck, api.getProjectPackages, api.log)
    .post(
      api.authRequireAuth0,
      api.authUserCheck,
      api.createProjectPackage,
      api.log
    );
  app
    .route("/v1/building/:buildingId/projectPackage/:projectPackageId")
    .put(
      api.authRequireAuth0,
      api.authUserCheck,
      api.updateProjectPackage,
      api.log
    );
  /* Equipment */
  app
    .route("/v1/equipment/categorizations")
    .get(
      api.authRequireAuth0,
      api.authUserCheck,
      api.getCategorizations,
      api.log
    );

  /* Users */

  app
    .route("/users")
    .get(api.authRequireAuth0, api.authUserCheck, api.getAllUsers, api.log);

  app.route("/user/activate").post(api.activateUser, api.log);

  app
    .route("/organizations")
    .get(
      api.authRequireAuth0,
      api.authUserCheck,
      api.getOrganizationsV2,
      api.log
    );

  app
    .route("/organizations/users")
    .get(
      api.authRequireAuth0,
      api.authUserCheck,
      api.getOrganizationsUsersV2,
      api.log
    );

  app
    .route("/userManage/user")
    .get(api.authRequireAuth0, api.authUserCheck, api.getUserV2, api.log)
    .delete(api.authRequireAuth0, api.authUserCheck, api.removeUserV2, api.log)
    .put(api.authRequireAuth0, api.authUserCheck, api.updateUserV2, api.log);

  app
    .route("/userManage/userInvite")
    .post(api.authRequireAuth0, api.authUserCheck, api.inviteUserV2, api.log);

  app
    .route("/featureFlag")
    .get(
      api.authRequireAuth0,
      api.authUserCheck,
      api.getFeatureFlagList,
      api.log
    );

  app
    .route("/featureFlag/user")
    .get(
      api.authRequireAuth0,
      api.authUserCheck,
      api.getUserListWithFeatureFlag,
      api.log
    );
  app
    .route("/featureFlag/:featureId/user")
    .post(
      api.authRequireAuth0,
      api.authUserCheck,
      api.updateUserFeatureFlag,
      api.log
    );

  // API Middlewares
  app.param("buildingId", api.buildingById);
  app.param("utilityId", api.utilityById);
  app.param("userId", api.userById);
  app.param("assetId", api.assetById);
  app.param("projectId", api.projectById);
  app.param("templateId", api.templateById);
  app.param("measureId", api.measureById);
  app.param("organizationId", api.organizationById);
  app.param("scenarioId", api.scenarioById);
  app.param("projectPackageId", api.projectPackageById);
  app.param("measurePackageId", api.measurePackageById);
  app.param("proposalId", api.proposalById);
  app.param("featureId", api.featureById);
};

function setConnectionTimeout(milliseconds) {
  return function(req, res, next) {
    res.connection.setTimeout(milliseconds);
    next();
  };
}
