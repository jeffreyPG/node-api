const mongoose = require("mongoose");
const PortfolioSync = mongoose.model("PortfolioSync");

async function getPortfolioSyncByMail (email) {
  return PortfolioSync.findOne({ email });
}

async function getPortfolioSyncByMailUsername (email, username) {
  return PortfolioSync.findOne({ email, username });
}

async function getPortfolioSyncByOrganization (organizationId) {
  return PortfolioSync.find({ orgsWithAccess: organizationId });
}

async function getPortfolioSyncByAccountId (accountId) {
  return PortfolioSync.findOne({ accountId });
}

async function getPortfolioSyncById (id) {
  return PortfolioSync.findById(id);
}

async function savePortfolioSync (portfolioSyncObject) {
  const portfolioSync = new PortfolioSync(portfolioSyncObject);
  return portfolioSync.save();
}

module.exports = {
  getPortfolioSyncByMail,
  getPortfolioSyncByMailUsername,
  getPortfolioSyncByOrganization,
  getPortfolioSyncByAccountId,
  getPortfolioSyncById,
  savePortfolioSync,
};
