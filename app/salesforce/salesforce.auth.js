"use strict";

/**
 * Module dependencies.
 */
let jwt = require("jsonwebtoken");
let querystring = require("querystring");
let fs = require("fs");
const path = require("path");
let moment = require("moment");
let url = require("url");
let jsforce = require("jsforce");
let axios = require("axios");


/**
 * Create jsforce connection for user. Requires
 * @param userEmail
 * @param aud
 * @param tokenUrl
 * @returns {Promise<module.exports>}
 */
const getConnection = async function(userEmail, aud = "https://login.salesforce.com", tokenUrl="") {
  let privateKey = fs.readFileSync(path.join(__dirname, "./salesforce_cert.key"));

  if (!tokenUrl) {
    tokenUrl = aud;
  }

  let jwtparams = {
    iss: "3MVG9Kip4IKAZQEVlhKXyOPkzIfgnSRYLIuIjL7QyE0SzpvmKzoJfxHMkfhXu_oGC8NmMvTzEjtR7RV34C9Pb",
    prn: userEmail,
    aud: aud,
    exp: parseInt(moment().add(2, "minutes").format("X"))
  };

  let token = jwt.sign(jwtparams, privateKey, { algorithm: "RS256" });
  let params = {
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion: token
  };
  let token_url = new url.URL("/services/oauth2/token", tokenUrl).toString();

  return axios.post(token_url, querystring.stringify(params))
    .then(function (res) {
      return new jsforce.Connection({
        instanceUrl: res.data.instance_url,
        accessToken: res.data.access_token
      });
    }).catch(err => { console.error("[ERROR] SalesForce Authentication Failed: ", err); });
};


const isEnabled = function(org) {
  if (!org) {
    return false;
  }

  return org.salesforce && org.salesforce.enabled && org.salesforce.connectedAccounts && !org.salesforce.paused;
};


module.exports = {
  getConnection,
  isEnabled
};
