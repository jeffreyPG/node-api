"use strict";

const chartsReportClient = require("../api/utils/api.charts.report.client");
const util = require("./utils/api.utils");
const { Chart } = require("../../models/chart.server.model");

/**
 *  Get all the chart views
 */
exports.getViews = async (req, res, next) => {
    try {
        const Charts = await Chart.find();
        // Set header data for file type and filename
        res.setHeader(
            "Content-Type",
            "application/json"
        );
        res.sendResult = {
            status: "Success",
            message: "Retrieved Chart views",
            views: Charts
        };
        return next();
    } catch (err) {
        return util.sendError(err, 500, req, res, next);
    }
};

/**
 *  get the preview of a chart by viewId
 */
exports.getPreview = async (req, res, next) => {
    try {
        chartsReportClient.getPreview(req.params, req.query, function (err, data) {
            if (err) {
                return util.sendError(
                    "Issue getting preview",
                    400,
                    req,
                    res,
                    next
                );
            }
            res.setHeader(
                "Content-Type",
                "image/png"
            );
            res.sendResult = data;
            return next();
        });
    } catch (err) {
        return util.sendError(err, 500, req, res, next);
    }
};