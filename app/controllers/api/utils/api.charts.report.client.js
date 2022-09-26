"use strict";

var _ = require("lodash"),
    request = require("request"),
    querystring = require("querystring"),
    config = require("../../../../config/config");


/**
 * Client used to perform actions against the Reporting API
 */
const _httpRequest = function (opts, done) {
    try {
        const options = {
            hostname: opts.url,
            port: 8001,
            path: opts.path || "api/charts/views",
            method: opts.method || "GET",
            headers: {
                "Content-Type": "application/json"
            }
        };
        // let uri = `http://${options.hostname}:${options.port}/${opts.path}`;
        let uri = `http://${options.hostname}/${opts.path}`;
        if (opts.params) {
            uri = `${uri}/${opts.params.viewId}/${opts.params.buildingId}`;
            if (opts.query) {
                uri = `${uri}?${querystring.stringify(opts.query)}`;
            }
            return request(uri, { encoding: null }, (err, res, body) => {
                if (err) {
                    throw new Error(err);
                }
                done(null, res.body);
            });
        }

        request(uri, { json: true }, (err, res, body) => {
            if (err) {
                throw new Error(err);
            }
            done(null, body);
        });
    } catch (error) {
        done(error, null);
    }
};
/**
 *  Returning all the Chart Views from tableau server
 */
exports.getViews = (done) => {
    const opts = {
        mock: false,
        method: "GET",
        path: "api/charts/views",
        url: (config.reportsAPI && config.reportsAPI.reportEndpoint) || ""
    };
    _httpRequest(opts, (err, data) => {
        if (err) {
            return done(err, null);
        }
        return done(null, data);
    });
};

exports.getPreview = (params, query, done) => {
    const opts = {
        mock: false,
        method: "GET",
        path: "api/charts",
        url: (config.reportsAPI && config.reportsAPI.reportEndpoint) || "",
        port: 8001,
        contentType: "image/png",
        params,
        query
    };
    _httpRequest(opts, (err, data) => {
        if (err) {
            return done(err, null);
        }
        return done(null, data);
    });
};