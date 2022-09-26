"use strict";

/**
 * Module dependencies.
 */
const _ = require("lodash");
const mongoose = require("mongoose");
const ProposalTemplate = mongoose.model("ProposalTemplate");
const util = require("./utils/api.utils");

const getProposalTemplates = async (req, res, next) => {
  try {
    let defaultProposalTemplates = await ProposalTemplate.find({
      isDefault: true
    });
    let proposalTemplates = await ProposalTemplate.find({
      organization: req.organization._id
    });
    res.sendResult = {
      status: "Success",
      message: "Get Proposal Templates",
      proposalTemplates: [...defaultProposalTemplates, ...proposalTemplates]
    };
    return next();
  } catch (err) {
    console.log(err);
    return util.sendError(
      "Issues loading the proposal templates",
      500,
      req,
      res,
      next
    );
  }
};

module.exports = {
  getProposalTemplates
};
