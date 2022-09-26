/**
 * DocuSign useful functions
 * @author Sage Thomas
 */

'use strict';

const docusign = require('docusign-esign'),
    moment = require('moment')
;

function makeEmailEnvelopeFromId(templateId, envelopeArgs, email=false) {
    let env = new docusign.EnvelopeDefinition();
    env.templateId = templateId;

    let signers = [];
    let id = 1;
    for (let signer of envelopeArgs.signers) {
        let role = {
            email: signer.email,
            name: signer.name,
            roleName: 'signer',
        };
        if (!email) {
            role.clientUserId = id;
            role.recipientId = id;
        }
        signers.push(docusign.TemplateRole.constructFromObject(role));
        id += 1;
    }
    let ccs = [];
    for (let cc of envelopeArgs.cc) {
        ccs.push(docusign.TemplateRole.constructFromObject({
            email: cc.email,
            name: cc.name,
            roleName: 'cc'
        }));
    }

    env.templateRoles = signers.concat(ccs);
    env.status = "sent";
    if (envelopeArgs.emailSubject) {
        env.emailSubject = envelopeArgs.emailSubject;
    }
    if (envelopeArgs.emailBody) {
        env.emailBlurb = envelopeArgs.emailBody;
    }

    return env;
}

const listTemplates = async function(dsApiClient, accountId) {
    let templatesApi = new docusign.TemplatesApi(dsApiClient);
    let results = await templatesApi.listTemplates(accountId);

    if (results.resultSetSize === 0 || results.totalSetSize == 0) return [];

    let templates = [];
    for (let template of results.envelopeTemplates) {
        templates.push(template);
    }
    return templates;
};

const listAdminTemplates = async function(dsApiClient, accountId) {
    let templatesApi = new docusign.TemplatesApi(dsApiClient);
    let templates = [];
    let results = await templatesApi.listTemplates(accountId, {userFilter: 'shared_with_me'}).catch(err => console.log(err));
    if (results && results.totalSetSize !== '0') {
        for (let t of results.envelopeTemplates) {
            templates.push(t);
        }
    }
    results = await templatesApi.listTemplates(accountId, {sharedByMe: 'true'}).catch(err => console.log(err));
    if (results && results.totalSetSize !== '0') {
        for (let t of results.envelopeTemplates) {
            if (t.shared === 'true') templates.push(t);
        }
    }
    return templates;
};

const getTemplateName = async function(dsApiClient, accountId, templateId) {
    let templatesApi = new docusign.TemplatesApi(dsApiClient);
    let template = await templatesApi.get(accountId, templateId);
    return template.name;
};

const listEnvelopes = async function(dsApiClient, accountId) {
    let envelopesApi = new docusign.EnvelopesApi(dsApiClient);
    let options = {fromDate: moment().subtract(30, 'days').format()};
    return await envelopesApi.listStatusChanges(accountId, options);
};

const listEnvelopeDocuments = async function(dsApiClient, accountId, envelopeId) {
    let envelopesApi = new docusign.EnvelopesApi(dsApiClient);
    return envelopesApi.listDocuments(accountId, envelopeId);
};

const sendDSEmail = async function(dsApiClient, envelopeArgs, accountId, templateId) {
    envelopeArgs.status = 'sent';
    let envelopesApi = new docusign.EnvelopesApi(dsApiClient);
    let envelope = makeEmailEnvelopeFromId(templateId, envelopeArgs, true);
    return await envelopesApi.createEnvelope(accountId, {envelopeDefinition: envelope});
};

function makeSenderViewRequest(args) {
    let viewRequest = new docusign.ReturnUrlRequest();
    viewRequest.returnUrl = args.dsReturnUrl;
    return viewRequest;
}

const embeddedSend = async function(dsApiClient, envelopeArgs, accountId, templateId) {
    let envelopesApi = new docusign.EnvelopesApi(dsApiClient);

    // Step 1. Make the envelope with "created" (draft) status
    envelopeArgs.status = 'created'; // We want a draft envelope
    let envelope = makeEmailEnvelopeFromId(templateId, envelopeArgs);
    let envResults = await envelopesApi.createEnvelope(accountId, {envelopeDefinition: envelope}).catch(err => console.log(err));
    let envelopeId = envResults.envelopeId;

    // Step 2. create the sender view
    let viewRequest = makeSenderViewRequest(envelopeArgs);
    // Call the CreateSenderView API
    // Exceptions will be caught by the calling function
    let results = await envelopesApi.createSenderView(
        accountId, envelopeId,
        {returnUrlRequest: viewRequest}).catch(err=>console.log(err));

    // Switch to Recipient and Documents view if requested by the user
    let url = results.url;
    console.log (`startingView: ${envelopeArgs.startingView}`);
    if (envelopeArgs.startingView === "recipient") { // can also be tagging
        url = url.replace('send=1', 'send=0');
    }

    return ({envelopeId: envelopeId, redirectUrl: url});
};

function makeRecipientViewRequest(args, email, username) {
    let viewRequest = new docusign.RecipientViewRequest();
    viewRequest.returnUrl = args.dsReturnUrl;
    viewRequest.authenticationMethod = 'none';
    viewRequest.email = email;
    viewRequest.userName = username;
    viewRequest.clientUserId = 1;
    return viewRequest;
}

const embeddedSign = async function(dsApiClient, envelopeArgs, accountId, templateId) {
    let envelopesApi = new docusign.EnvelopesApi(dsApiClient);

    envelopeArgs.status = 'created';
    let envelope = makeEmailEnvelopeFromId(templateId, envelopeArgs);
    let envResults = await envelopesApi.createEnvelope(accountId, {envelopeDefinition: envelope}).catch(err => console.log(err));
    let envelopeId = envResults.envelopeId;

    let viewRequest = makeRecipientViewRequest(envelopeArgs, envelopeArgs.signers[0].email, envelopeArgs.signers[0].name);
    let results = await envelopesApi.createRecipientView(
        accountId, envelopeId,
        {recipientViewRequest: viewRequest}).catch(err=>console.log(err));
    let url = results.url;

    return ({envelopeId: envelopeId, redirectUrl: url, envelope: envResults});
};

function makeConsoleViewRequest(args) {
    let viewRequest = new docusign.ConsoleViewRequest();
    viewRequest.returnUrl = args.dsReturnUrl;
    viewRequest.envelopeId = args.envelopeId;
    return viewRequest;
}

const embeddedEnvelope = async function(dsApiClient, accountId, envelopeArgs) {
    let envelopesApi = new docusign.EnvelopesApi(dsApiClient);
    let viewRequest = makeConsoleViewRequest(envelopeArgs);
    let results = await envelopesApi.createConsoleView(
        accountId, {consoleViewRequest: viewRequest}).catch(err => console.log(err));
    let url = results.url;
    return ({redirectUrl: url});
};

const deleteEnvelope = async function(dsApiClient, accountId, envelopeArgs) {
    let foldersApi = new docusign.FoldersApi(dsApiClient);
    let foldersRequest = new docusign.FoldersRequest();
    foldersRequest.envelopeIds = [envelopeArgs.envelopeId];
    await foldersApi.moveEnvelopes(accountId, 'recyclebin', {foldersRequest: foldersRequest}).catch(err => console.log(err));
};

const downloadEnvelopeDocument = async function(dsApiClient, accountId, envelopeId, documentId) {
    let envelopesApi = new docusign.EnvelopesApi(dsApiClient);
    let results = await envelopesApi.getDocument(accountId, envelopeId, documentId, null).catch(err => console.log(err));
    let envelopeDocuments = await listEnvelopeDocuments(dsApiClient, accountId, envelopeId);

    let docItem = envelopeDocuments.envelopeDocuments.find(item => item.documentId === documentId),
        docName = docItem.name,
        hasPDFsuffix = docName.substr(docName.length - 4).toUpperCase() === 'PDF',
        pdfFile = hasPDFsuffix;

    if ((docItem.type === "content" || docItem.type === "summary") && !hasPDFsuffix){
        docName += ".pdf";
        pdfFile = true;
    }
    // Add .zip as appropriate
    if (docItem.type === "zip") {
        docName += ".zip";
    }

    // Return the file information
    // See https://stackoverflow.com/a/30625085/64904
    let mimetype;
    if (pdfFile) {
        mimetype = 'application/pdf';
    } else if (docItem.type === 'zip') {
        mimetype = 'application/zip';
    } else {
        mimetype = 'application/octet-stream';
    }

    return ({mimetype: mimetype, docName: docName, fileBytes: results});
};

const downloadEnvelope = async function(dsApiClient, accountId, envelopeId, filename) {
    let envelopesApi = new docusign.EnvelopesApi(dsApiClient);
    let results = await envelopesApi.getDocument(accountId, envelopeId, 'archive', null).catch(err => console.log(err));

    return ({mimetype: 'application/zip', docName: `${filename}.zip`, fileBytes: results});
};

const listUsers = async function(dsApiClient, accountId) {
    let usersApi = new docusign.UsersApi(dsApiClient);
    let results = await usersApi.list(accountId).catch(err => console.log(err));
    console.log("USERS: ", results)
};

module.exports = {
    sendDSEmail,
    listTemplates,
    listEnvelopes,
    listEnvelopeDocuments,
    downloadEnvelopeDocument,
    embeddedSign,
    downloadEnvelope,
    getTemplateName,
    embeddedEnvelope,
    deleteEnvelope,
    listAdminTemplates,
    listUsers
};