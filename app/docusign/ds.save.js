/**
 * DocuSign functions to save sent envelope data to measures, projects, and proposals
 * @author Sage Thomas
 */

'use strict';

const docusign = require('docusign-esign'),
    moment = require('moment'),
    dsFunctions = require('./ds.functions')
;
const mongoose = require("mongoose");
const DocuSignEnv = mongoose.model("DocuSignEnv");

const saveEnvelope = async function(envelope, authorName, authorSub, templateName, data, createdType) {
    createdType = typeof createdType  !== 'undefined' ? createdType : 'USER';

    let envLink = {
        organizationId: data.organizationId,
        createdByUserId: data.userId,
        envelopeId: envelope.envelopeId,
        envelopeName: templateName,
        dsAuthorName: authorName,
        dsAuthorId: authorSub,
    };
    if (data.measureId) envLink.measureId = data.measureId;
    if (data.projectId) envLink.projectId = data.projectId;
    if (data.proposalId) envLink.proposalId = data.proposalId;
    if (data.authorId) envLink.authorId = data.authorId;

    await DocuSignEnv.create(envLink);
};

const unlinkEnvelope = async function(envelopeId) {
    await DocuSignEnv.deleteOne({envelopeId: envelopeId});
};

const getLinkedEnvelopes = async function(projectId=null, measureId=null, proposalId=null) {
    let query = {};
    if (projectId) query.projectId = projectId;
    if (measureId) query.measureId = measureId;
    if (proposalId) query.proposalId = proposalId;
    return await DocuSignEnv.find(query);
};

module.exports = {
    saveEnvelope,
    unlinkEnvelope,
    getLinkedEnvelopes
};