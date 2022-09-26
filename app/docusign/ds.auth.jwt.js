/**
 * We don't currently use this, but I am leaving it here just in case.
 *
 * @author Sage Thomas
 */

'use strict';

const moment = require('moment'),
    docusign = require('docusign-esign'),
    tokenReplaceMin = 10; // The accessToken must expire at least this number of


const getUserInfo = async function getUserInfo(docusignAuthConfig, accessToken){

    const dsApi = new docusign.ApiClient(),
        targetAccountId = false,
        baseUriSuffix = '/restapi';

    dsApi.setOAuthBasePath(docusignAuthConfig.dsOauthServer.replace('https://', '')); // it have to be domain name
    const results = await dsApi.getUserInfo(accessToken);

    let accountInfo;
    if (!Boolean(targetAccountId)) {
        // find the default account
        accountInfo = results.accounts.find(account => account.isDefault === "true");
    } else {
        // find the matching account
        accountInfo = results.accounts.find(account => account.accountId == targetAccountId);
    }
    if (typeof accountInfo === 'undefined') {
        throw new Error (`Target account ${targetAccountId} not found!`);
    }

    let accountId = accountInfo.accountId;
    let accountName = accountInfo.accountName;
    let basePath = accountInfo.baseUri + baseUriSuffix;
    return {
        accountId: accountId,
        basePath: basePath,
        accountName: accountName
    };
};

const getDSToken = async function(docusignAuthConfig, user_id) {
    const scopes = 'signature';

    const jwtLifeSec = 10 * 60, // requested lifetime for the JWT is 10 min
        dsApi = new docusign.ApiClient();
    dsApi.setOAuthBasePath(docusignAuthConfig.dsOauthServer.replace('https://', '')); // it should be domain only.
    const results = await dsApi.requestJWTUserToken(docusignAuthConfig.clientId,
        user_id, scopes, docusignAuthConfig.privateKey,
        jwtLifeSec).catch(err => console.log(err));

    const expiresAt = moment().add(results.body.expires_in, 's').subtract(tokenReplaceMin, 'm');

    this.accessToken = results.body.access_token;
    this._tokenExpiration = expiresAt;

    // Get base path
    let userInfo = await getUserInfo(docusignAuthConfig, results.body.access_token);

    return {
        accessToken: results.body.access_token,
        tokenExpirationTimestamp: expiresAt,
        userInfo: userInfo,
    };
};


module.exports = {
    getDSToken
};