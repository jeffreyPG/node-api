"use strict";

/**
 * Module dependencies.
 */
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const DocusignEnvSchema = new Schema({
    organizationId: {
        type: Schema.Types.ObjectId,
        ref: "Organization",
        required: 'Field "organizationId" is required.',
    },
    createdByUserId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: 'Field "createdByUserId" is required.',
    },
    envelopeId: {
        type: String,
        required: 'Field "envelopeId" is required.',
    },
    envelopeName: {
        type: String,
        required: 'Field "envelopeName" is required.',
    },
    dsAuthorName: {
        type: String,
        required: 'Field "dsAuthorName" is required.',
    },
    dsAuthorId: {
        type: String,
        required: 'Field "dsAuthorId" is required.',
    },
    createdType: {
        type: String,
        required: 'Field "createdType" is required.',
        default: 'USER',
        enum: ['ADMIN', 'USER'],
    },
    measureId: {
        type: Schema.Types.ObjectId,
    },
    projectId: {
        type: Schema.Types.ObjectId,
    },
    proposalId: {
        type: Schema.Types.ObjectId,
    },
    buildingId: {
        type: Schema.Types.ObjectId,
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {collection: 'docusign_envelopes'});

module.exports.Building = mongoose.model("DocuSignEnv", DocusignEnvSchema);