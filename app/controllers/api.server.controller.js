"use strict";

/**
 * Module dependencies.
 */
const _ = require("lodash");

/**

 * Extend API controller
 */
module.exports = _.extend(
  require("./api/api.apiKey.server.controller"),
  require("./api/api.token.server.controller"),
  require("./api/api.user.server.controller"),
  require("./api/api.library.server.controller"),
  require("./api/api.building.server.controller"),
  require("./api/api.admin.server.controller"),
  require("./api/api.asset.server.controller"),
  require("./api/api.analysis.server.controller"),
  require("./api/api.report.server.controller"),
  require("./api/api.report.enduse.server.controller"),
  require("./api/api.template.server.controller"),
  require("./api/api.excel.report.server.controller"),
  require("./api/api.portfolio.export.server.controller"),
  require("./api/api.portfolio.import.server.controller"),
  require("./api/api.portfolio.server.controller"),
  require("./api/api.portfolio.scenario.server.controller"),
  require("./api/api.project.server.controller"),
  require("./api/api.projectAnalysis.server.controller"),
  require("./api/api.projectSimulation.server.controller"),
  require("./api/api.organization.server.controller"),
  require("./email.server.controller"),
  require("./api/admin/api.feature.server.controller"),
  require("./api/api.csv.utility.server.controller"),
  require("./api/api.csv.upload.server.controller"),
  require("./api/api.image.upload.server.controller"),
  require("./api/api.firebase.server.controller"),
  require("./api/api.project.package.server.controller"),
  require("./api/api.measure.package.server.controller"),
  require("../salesforce/salesforce.controller"),
  require("./api/api.proposal.server.controller"),
  require("./api/api.proposalTemplate.server.controller"),
  require("../docusign/ds.controller"),
  require("./api/api.categorization.server.controller"),
  require("./api/api.organizationManage.server.controller"),
  require("./api/api.featureflag.server.controller"),

  // Load utils files
  require("./api/utils/api.logger"),
  require("./api/utils/api.auth"),
  require("./api/spreadsheetTemplate"),
  require("./api/datasource"),
  require("./api/spreadsheetReport"),
  require("./api/chartsReport"),
  require("./api/scripts.controller")
);
