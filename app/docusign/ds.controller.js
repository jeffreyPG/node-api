/**
 * DocuSign controllers
 * @author Sage Thomas
 */

'use strict';

const dsFunctions = require('./ds.functions'),
    dsSave = require('./ds.save'),
    dsJwt = require('./ds.auth.jwt'),
    docusign = require('docusign-esign'),
    request = require('request'),
    moment = require('moment')
;
const mongoose = require("mongoose");
const DocuSignAuth = mongoose.model("DocuSignAuth");
const User = mongoose.model("User");

/* raise error if token is expired */
const checkToken = function(docusignAuthConfig) {
    let created = moment(docusignAuthConfig.updatedAt);
    let expiresAt = created.add(docusignAuthConfig.expiresIn, 'seconds');
    if (moment().diff(expiresAt, 'seconds') > -10) {
        throw 'User token is expired!';
    }
};

const dsRefreshAuth = async function() {
    console.info("Updating DocuSign access tokens...");
    let authsCursor = DocuSignAuth.find({'authType': 'user'}).cursor();

    for (let auth = await authsCursor.next(); auth != null; auth = await authsCursor.next()) {
        try {
            let url = `${auth.dsOauthServer}/oauth/token`;
            let data = `grant_type=refresh_token&refresh_token=${auth.refreshToken}`;
            let headers = {
                "Authorization": `Basic ${auth.authHeader}`,
                "Content-Type": "application/x-www-form-urlencoded"
            };
            request.post({url: url, form: data, headers: headers}, async function (err, httpResponse, body) {
                if (err) {return console.error('post failed:', err);}
                if (body.error) {return console.error('Unable to update DocuSign access token!', body);}
                body = JSON.parse(body);

                auth.accessToken = body.access_token;
                auth.accessToken = body.refresh_token;
                auth.expiresIn = body.expires_in;
                auth.updatedAt = moment();
                await auth.save();
            });
        } catch (e) {
            // maybe delete?
        }
    }
};

const dsInit = async function(organizationId, userId) {
    let docusignAuthConfig = await DocuSignAuth.findOne({
        'organizationId': organizationId,
        'authType': 'user',
        'userId': userId
    });

    let accessToken = docusignAuthConfig.accessToken;
    checkToken(docusignAuthConfig);
    let dsApiClient = new docusign.ApiClient();
    dsApiClient.setBasePath(docusignAuthConfig.basePath);
    dsApiClient.addDefaultHeader('Authorization', 'Bearer ' + accessToken);

    let userInfo = await dsApiClient.getUserInfo(accessToken);

    return {
        dsApiClient: dsApiClient,
        accountId: docusignAuthConfig.accountId,
        name: userInfo.name,
        email: userInfo.email,
        sub: userInfo.sub
    };
};

const dsGetAuthCodeGrantUri = async function(req, res, next) {
    const { query } = req;

    let docusignAuthConfig = await DocuSignAuth.findOne({'organizationId': query.organizationId, 'authType': 'grant'});
    let uri = `${docusignAuthConfig.dsOauthServer}/oauth/auth?` +
        `response_type=code` +
        `&scope=extended signature` +
        `&state=${query.state}` +
        `&client_id=${docusignAuthConfig.clientId}` +
        `&redirect_uri=${query.callback}`;

    res.sendResult = {
        status: "Success",
        uri: uri
    };
    return next();
};

// const dsGetAdminGrantUri = async function(req, res, next) {
//     const { query } = req;
//
//     let docusignAuthConfig = await DocuSignAuth.findOne({'organizationId': query.organizationId, 'authType': 'jwt'});
//     let uri = `${docusignAuthConfig.dsOauthServer}/oauth/auth?` +
//         `response_type=code` +
//         `&scope=openid` +
//         `&admin_consent_scope=signature impersonation` +
//         `&state=${query.state}` +
//         `&client_id=${docusignAuthConfig.clientId}` +
//         `&redirect_uri=${query.callback}`;
//
//     res.sendResult = {
//         status: "Success",
//         uri: uri
//     };
//     return next();
// };

const dsLogin = async function(req, res, next) {
    const { body } = req;

    let docusignAuthConfig = await DocuSignAuth.findOne({'organizationId': body.organizationId, 'authType': 'grant'});

    let url = `${docusignAuthConfig.dsOauthServer}/oauth/token`;
    let authHeader = Buffer.from(`${docusignAuthConfig.clientId}:${docusignAuthConfig.secretKey}`).toString('base64');
    let data = `grant_type=authorization_code&code=${body.code}`;
    let headers = {
        "Authorization": `Basic ${authHeader}`,
        "Content-Type": "application/x-www-form-urlencoded"
    };

    let userId = body.userId;
    await DocuSignAuth.deleteMany({'organizationId': body.organizationId, 'authType': 'user', 'userId': userId});

    request.post({url:url, form: data, headers: headers}, async function(err, httpResponse, body) {
        if (err) {
            return console.error('post failed:', err);
        }
        body = JSON.parse(body);

        const dsApi = new docusign.ApiClient(), baseUriSuffix = '/restapi';

        dsApi.setOAuthBasePath(docusignAuthConfig.dsOauthServer.replace('https://', '')); // it have to be domain name
        const results = await dsApi.getUserInfo(body.access_token);

        let accountInfo = results.accounts.find(account => docusignAuthConfig.accountId === account.accountId);

        DocuSignAuth.create({
            organizationId: docusignAuthConfig.organizationId,
            userId: userId,
            authType: 'user',
            accessToken: body.access_token,
            refreshToken: body.refresh_token,
            expiresIn: body.expires_in,
            dsOauthServer: docusignAuthConfig.dsOauthServer,
            accountId: accountInfo.accountId,
            accountName: accountInfo.accountName,
            authHeader: authHeader,
            basePath: accountInfo.baseUri + baseUriSuffix
        }, function (err, small) {
            if (err) return console.log(err);

            res.sendResult = {
                status: "Success"
            };
            return next();
        });

    });

};

const dsLogout = async function(req, res, next) {
    const { body } = req;

    await DocuSignAuth.deleteOne({
        'organizationId': body.organizationId,
        'userId': body.userId,
        'authType': 'user'
    });

    res.sendResult = {
        status: "Success"
    };
    return next();
};

const dsLoginStatus = async function(req, res, next) {
    const { body } = req;

    try {
        await dsInit(body.organizationId, body.userId);
    } catch (e) {
        return res.status(403).send("User not logged in!");
    }

    res.sendResult = {
        status: "Success",
        message: "User logged in"
    };

    return next();
};

const dsSendEmail = async function(req, res, next) {
    const { body } = req;

    let authData;
    try {
        authData = await dsInit(body.organizationId, body.userId);
    } catch (e) {
        return res.status(403).send("User not logged in!");
    }

    let envelopeArgs = {
        signers: body.signers,
        cc: body.cc || [],
        emailSubject: body.emailSubject,
        emailBody: body.emailBody
    };
    let envelope = await dsFunctions.sendDSEmail(authData.dsApiClient, envelopeArgs, authData.accountId, body.dsTemplateId);
    let templateName = await dsFunctions.getTemplateName(authData.dsApiClient, authData.accountId, body.dsTemplateId);
    await dsSave.saveEnvelope(envelope, authData.name, authData.sub, templateName, body);
    res.sendResult = {
        status: "Success",
        message: "Sent email",
        envelopeId: envelope.envelopeId
    };

    return next();
};

const dsSendEmailAdmin = async function(req, res, next) {
    const { body } = req;

    let docusignAuthConfig = await DocuSignAuth.findOne({
        'organizationId': body.organizationId,
        'authType': 'jwt',
    });
    let user = await User.findOne({_id: body.userId});
    let authData = await dsJwt.getDSToken(docusignAuthConfig, docusignAuthConfig.impersonatedUserGuid);
    let dsApiClient = new docusign.ApiClient();
    dsApiClient.setBasePath(docusignAuthConfig.basePath);
    dsApiClient.addDefaultHeader('Authorization', 'Bearer ' + authData.accessToken);

    let envelopeArgs = {
        signers: body.signers,
        cc: body.cc || [],
        emailSubject: body.emailSubject,
        emailBody: body.emailBody
    };
    let envelope = await dsFunctions.sendDSEmail(dsApiClient, envelopeArgs, authData.userInfo.accountId, body.dsTemplateId);
    let templateName = await dsFunctions.getTemplateName(dsApiClient, authData.userInfo.accountId, body.dsTemplateId);
    await dsSave.saveEnvelope(envelope, user.name, docusignAuthConfig.impersonatedUserGuid, templateName, body, 'ADMIN');
    res.sendResult = {
        status: "Success",
        message: "Sent email",
        envelopeId: envelope.envelopeId
    };

    return next();
};

const dsEmbeddedSign = async function(req, res, next) {
    const { body } = req;

    let authData;
    try {
        authData = await dsInit(body.organizationId, body.userId);
    } catch (e) {
        return res.status(403).send("User not logged in!");
    }

    let envelopeArgs = {
        signers: [{
            name: authData.name,
            email: authData.email
        }],
        cc: body.cc || [],
        dsReturnUrl: body.returnUrl || ''
    };

    let results = await dsFunctions.embeddedSign(authData.dsApiClient, envelopeArgs, authData.accountId, body.dsTemplateId);
    let templateName = await dsFunctions.getTemplateName(authData.dsApiClient, authData.accountId, body.dsTemplateId);
    await dsSave.saveEnvelope(results.envelope, authData.name, authData.sub, templateName, body);
    res.sendResult = {
        status: "Success",
        message: "Sent email and created link",
        results: results
    };
    return next();
};

const dsListTemplates = async function(req, res, next) {
    const { query } = req;

    let authData;
    try {
        authData = await dsInit(query.organizationId, query.userId);
    } catch (e) {
        return res.status(403).send("User not logged in!");
    }
    let templates = await dsFunctions.listTemplates(authData.dsApiClient, authData.accountId);

    res.sendResult = {
        status: "Success",
        templates: templates
    };

    return next();
};

const dsListAdminTemplates = async function(req, res, next) {
    const { query } = req;

    let docusignAuthConfig = await DocuSignAuth.findOne({
        'organizationId': query.organizationId,
        'authType': 'jwt',
    });
    let authData = await dsJwt.getDSToken(docusignAuthConfig, docusignAuthConfig.impersonatedUserGuid);
    let dsApiClient = new docusign.ApiClient();
    dsApiClient.setBasePath(docusignAuthConfig.basePath);
    dsApiClient.addDefaultHeader('Authorization', 'Bearer ' + authData.accessToken);

    let results = await dsFunctions.listAdminTemplates(dsApiClient, authData.userInfo.accountId);

    res.sendResult = {
        status: "Success",
        results: results
    };

    return next();
};

const dsListEnvelopes = async function(req, res, next) {
    const { query } = req;

    let authData;
    try {
        authData = await dsInit(query.organizationId, query.userId);
    } catch (e) {
        return res.status(403).send("User not logged in!");
    }
    let envelopes = await dsFunctions.listEnvelopes(authData.dsApiClient, authData.accountId);

    res.sendResult = {
        status: "Success",
        envelopes: envelopes
    };
    return next();
};

const dsListEnvelopeDocuments = async function(req, res, next) {
    const { query } = req;

    let authData;
    try {
        authData = await dsInit(query.organizationId, query.userId);
    } catch (e) {
        return res.status(403).send("User not logged in!");
    }
    let documents = await dsFunctions.listEnvelopeDocuments(authData.dsApiClient, authData.accountId, query.envelopeId);

    res.sendResult = {
        status: "Success",
        documents: documents
    };

    return next();
};

const dsUnlinkEnvelope = async function(req, res, next) {
    const { body } = req;

    await dsSave.unlinkEnvelope(body.envelopeId);

    res.sendResult = {
        status: "Success",
    };

    return next();
};

const dsEmbeddedEnvelope = async function(req, res, next) {
    const { body } = req;

    let authData;
    try {
        authData = await dsInit(body.organizationId, body.userId);
    } catch (e) {
        return res.status(403).send("User not logged in!");
    }
    let results = await dsFunctions.embeddedEnvelope(authData.dsApiClient, authData.accountId, body);

    res.sendResult = {
        status: "Success",
        redirectUrl: results.redirectUrl
    };
    return next();
};

const dsDeleteEnvelope = async function(req, res, next) {
    const { body } = req;

    let authData;
    try {
        authData = await dsInit(body.organizationId, body.userId);
    } catch (e) {
        return res.status(403).send("User not logged in!");
    }
    await dsFunctions.deleteEnvelope(authData.dsApiClient, authData.accountId, body);
    await dsSave.unlinkEnvelope(body.envelopeId);

    res.sendResult = {
        status: "Success"
    };
    return next();
};

const dsDownloadEnvelopeDocument = async function(req, res, next) {
    const { query } = req;

    let authData;
    try {
        authData = await dsInit(query.organizationId, query.userId);
    } catch (e) {
        return res.status(403).send("User not logged in!");
    }
    let results = await dsFunctions.downloadEnvelopeDocument(authData.dsApiClient, authData.accountId,
        query.envelopeId, query.documentId);

    res.writeHead(200, {
        'Content-Type': results.mimetype,
        'Content-disposition': 'inline;filename=' + results.docName,
        'Content-Length': results.fileBytes.length
    });

    return res.end(results.fileBytes, 'binary');
};

const dsDownloadEnvelope = async function(req, res, next) {
    const { query } = req;

    let authData;
    try {
        authData = await dsInit(query.organizationId, query.userId);
    } catch (e) {
        return res.status(403).send("User not logged in!");
    }
    let filename = query.filename || query.envelopeId;
    let results = await dsFunctions.downloadEnvelope(authData.dsApiClient, authData.accountId, query.envelopeId, filename);

    res.writeHead(200, {
        'Content-Type': results.mimetype,
        'Content-disposition': 'inline;filename=' + results.docName,
        'Content-Length': results.fileBytes.length
    });

    return res.end(results.fileBytes, 'binary');
};

const dsDownloadEnvelopeAdmin = async function(req, res, next) {
    const { query } = req;

    let docusignAuthConfig = await DocuSignAuth.findOne({
        'organizationId': query.organizationId,
        'authType': 'jwt',
    });
    let authData = await dsJwt.getDSToken(docusignAuthConfig, docusignAuthConfig.impersonatedUserGuid);
    let dsApiClient = new docusign.ApiClient();
    dsApiClient.setBasePath(docusignAuthConfig.basePath);
    dsApiClient.addDefaultHeader('Authorization', 'Bearer ' + authData.accessToken);

    let filename = query.filename || query.envelopeId;
    let results = await dsFunctions.downloadEnvelope(dsApiClient, authData.userInfo.accountId, query.envelopeId, filename);

    res.writeHead(200, {
        'Content-Type': results.mimetype,
        'Content-disposition': 'inline;filename=' + results.docName,
        'Content-Length': results.fileBytes.length
    });

    return res.end(results.fileBytes, 'binary');
};

const dsGetLinkedEnvelopes = async function(req, res, next) {
    const { query } = req;

    let envelopes = await dsSave.getLinkedEnvelopes(query.projectId, query.measureId, query.proposalId)

    res.sendResult = {
        status: "Success",
        envelopes: envelopes
    };
    return next();
};

module.exports = {
    dsSendEmail,
    dsSendEmailAdmin,
    dsListTemplates,
    dsListAdminTemplates,
    dsListEnvelopes,
    dsListEnvelopeDocuments,
    dsDownloadEnvelopeDocument,
    dsEmbeddedSign,
    dsGetAuthCodeGrantUri,
    // dsGetAdminGrantUri,
    dsLogin,
    dsLoginStatus,
    dsDownloadEnvelope,
    dsDownloadEnvelopeAdmin,
    dsLogout,
    dsUnlinkEnvelope,
    dsEmbeddedEnvelope,
    dsDeleteEnvelope,
    dsRefreshAuth,
    dsGetLinkedEnvelopes
};