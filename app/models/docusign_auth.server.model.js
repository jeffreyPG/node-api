"use strict";

/**
 * Module dependencies.
 */
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const DocusignAuthSchema = new Schema({
    organizationId: {
        type: Schema.Types.ObjectId,
        ref: "Organization",
        required: 'Field "organizationId" is required.',
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: "User"
    },
    authType: {
        type: String,
        trim: true,
        required: 'Field "name" is required.',
        enum: ["jwt", "grant", "user"],
        default: "grant",
    },
    clientId: {
        type: String,
        trim: true,
    },
    impersonatedUserGuid: {
        type: String,
        trim: true,
    },
    privateKey: {
        type: String,
        trim: false
    },
    secretKey: {
        type: String,
        trim: false
    },
    accessToken: {
        type: String,
        trim: false
    },
    refreshToken: {
        type: String,
        trim: false
    },
    accountId: {
        type: String,
        trim: false
    },
    dsUserId: {
        type: String,
        trim: false
    },
    accountName: {
        type: String,
        trim: false
    },
    basePath: {
        type: String,
        trim: false
    },
    expiresIn: {
        type: Number,
    },
    authHeader: {
        type: String,
    },
    dsOauthServer: {
        type: String,
        trim: true,
        enum: ['https://account.docusign.com', 'https://account-d.docusign.com'],
        required: true,
        default: 'https://account-d.docusign.com'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {collection: 'docusign_auths'});

module.exports.Building = mongoose.model("DocuSignAuth", DocusignAuthSchema);