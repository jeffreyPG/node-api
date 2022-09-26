/**
 * SalesForce Sync functions that can be re-purposed for syncing different documents
 */
"use strict";

/**
 * Module dependencies.
 */
let salesforceAuth = require("./salesforce.auth");


/**
 * Updates documents to store synced salesforce object ids. Mostly for debugging purposes
 * @param sfIdMap
 * @param buildeeObjectMap
 * @param sfUsername
 * @private
 */
const syncSFIds = function(sfIdMap, buildeeObjectMap, sfUsername) {
    if (!sfUsername) { return console.error("[WARNING] No sfUsername given to sync with! This is ok, but can make debugging in the future more difficult."); }

    const usernameMatch = (x) => { return x.username === sfUsername; };

    for (const buildeeId in buildeeObjectMap) {
        let document = buildeeObjectMap[buildeeId];
        let sObjectId = sfIdMap[buildeeId];
        if (!sObjectId) {
            // console.log("[WARNING] sObjectId was not found. This is ok, but can make debugging in the future more difficult.");
            continue;
        }

        let oldMapIndex = document.salesforce.connectedObjects.findIndex(usernameMatch);
        if (oldMapIndex >= 0) {
            if (document.salesforce.connectedObjects[oldMapIndex].sObjectId === sObjectId) continue;
            document.salesforce.connectedObjects.splice(oldMapIndex, 1);
        }

        document.salesforce.connectedObjects.push(
            {
                username: sfUsername,
                sObjectId: sObjectId
            }
        );

        document.markModified("salesforce.connectedObjects");
        document.save(function (err) {
            if (err) { console.error(`Failed to save SalesForce Object ID: ${sfIdMap[buildeeId]} Buildee Document ID: ${buildeeId}`, err); }
        });
    }
};

/**
 * Inserts/Updates objects in salesforce
 * @param documents
 * @param organization
 * @param syncFunction
 * @param mapFunction
 * @param sfAccountToUpdate If not empty, only this salesforce account/instance will be synced. Else all will.
 */
const updateDocuments = async function(documents, organization, syncFunction, mapFunction, sfAccountToUpdate="") {
    if (!salesforceAuth.isEnabled(organization)) { return Promise.resolve(); }

    let accounts = sfAccountToUpdate ? [sfAccountToUpdate] : organization.salesforce.connectedAccounts;

    return accounts.reduce((p, account) => {
            // Retrieve non-standard authentication endpoints
            let aud = "https://login.salesforce.com";
            let tokenUrl = aud;
            let accountAuth = organization.salesforce.authorizations.find(a => a.username === account);
            if (accountAuth) {
                aud = accountAuth.aud || aud;
                tokenUrl = accountAuth.tokenUrl || aud;
            }

            return p.then(_ => salesforceAuth.getConnection(account, aud, tokenUrl).then(conn => {
                return (async (resolve, reject) => {
                    let i = 0;
                    let len = documents.length;

                    let documentPage = [];
                    let documentPageObjects = {};
                    for (; i < len; i++) {
                        let document = documents[i];
                        let d;
                        try {
                            d = await mapFunction(document, organization);
                        } catch (e) {
                            console.error("Failed to map document to salesforce object!", e);
                            continue;
                        }

                        documentPage.push(d);
                        documentPageObjects[document._id] = document;

                        if (documentPage.length >= 49) {
                            await syncFunction(conn, documentPage, documentPageObjects, account);
                            documentPageObjects = {};
                            documentPage = [];
                        }
                    }
                    if (documentPage.length > 0) {
                        await syncFunction(conn, documentPage, documentPageObjects, account);
                    }
                })();
            })).catch(err => console.error(`[ERROR] Failed to update building into salesforce with account ${account}`, err))
        }
        , Promise.resolve());
};


module.exports = {
    updateDocuments,
    syncSFIds
};