"use strict";

/**
 * Module dependencies.
 */
const util = require("./utils/api.utils");
const analysisClient = require("./utils/api.analysis.client");

const ANALYSIS_TYPE_MAPPER = analysisClient.getAnalysisTypeMap();

/**
 * Get full benchmark results per building details
 */
exports.getFullAnalysisBenchmark = function(req, res, next) {
  const building = req.building;
  const benchmarkRequest = {
    occupancy: building.buildingUse,
    size: building.squareFeet,
    zipcode: building.location.zipCode,
    open24: building.open247,
    stories: building.floorCount,
    vintage: building.buildYear,
    wwr: 0.3
  };

  // if building default values don't exist
  if (
    !building.buildingUse ||
    !building.squareFeet ||
    !building.location.zipCode ||
    !building.open247 ||
    !building.floorCount ||
    !building.buildYear
  ) {
    return util.sendError(
      "Please enter all building info before retrieving benchmark analysis.",
      400,
      req,
      res,
      next
    );
  }

  analysisClient.getFullBenchmark(benchmarkRequest, function(err, response) {
    if (err || !response) {
      return util.sendError(
        "Issues getting building full benchmark.",
        400,
        req,
        res,
        next
      );
    }

    const benchmark = {
      general:
        response && response[ANALYSIS_TYPE_MAPPER.general]
          ? response[ANALYSIS_TYPE_MAPPER.general]
          : 0,
      heating:
        response && response[ANALYSIS_TYPE_MAPPER.heating]
          ? response[ANALYSIS_TYPE_MAPPER.heating]
          : 0,
      cooling:
        response && response[ANALYSIS_TYPE_MAPPER.cooling]
          ? response[ANALYSIS_TYPE_MAPPER.cooling]
          : 0,
      lighting:
        response && response[ANALYSIS_TYPE_MAPPER.lighting]
          ? response[ANALYSIS_TYPE_MAPPER.lighting]
          : 0,
      dhw:
        response && response[ANALYSIS_TYPE_MAPPER.dhw]
          ? response[ANALYSIS_TYPE_MAPPER.dhw]
          : 0,
      water:
        response && response[ANALYSIS_TYPE_MAPPER.water]
          ? response[ANALYSIS_TYPE_MAPPER.water]
          : 0,
      portfolioManager: building.benchmark.portfolioManager || "",
      pmScores: building.benchmark.pmScores || []
    };

    // Check for special case of overwriting water score
    if (benchmarkRequest.size < 200000) {
      benchmark.water = {};
    }

    building.benchmark = benchmark;
    // reset flag back to false since benchmark has been ran
    building.rerunAnalyses = false;

    building.save(function(err) {
      if (err) {
        return util.sendError(err, 400, req, res, next);
      }

      // Return the benchmark object
      res.sendResult = {
        status: "Success",
        message: "Retrieved Building Benchmark (Building Updated)",
        benchmark: benchmark,
        building: building
      };
      return next();
    });
  });
};

exports.getFullAnalysisBenchmarkUtil = function(req, res, next) {
  const building = req.building;
  const benchmarkRequest = {
    occupancy: building.buildingUse,
    size: building.squareFeet,
    zipcode: building.location.zipCode,
    open24: building.open247,
    stories: building.floorCount,
    vintage: building.buildYear,
    wwr: 0.3,
    electric: req.query.utils?.electric || 0,
    gas: req.query.utils?.["natural-gas"] || 0,
    "total-cost": req.query.totalCost || 0
  };

  // if building default values don't exist
  if (
    !building.buildingUse ||
    !building.squareFeet ||
    !building.location.zipCode ||
    !building.open247 ||
    !building.floorCount ||
    !building.buildYear
  ) {
    return util.sendError(
      "Please enter all building info before retrieving benchmark analysis.",
      400,
      req,
      res,
      next
    );
  }

  analysisClient.getFullBenchmarkUtil(benchmarkRequest, function(err, resp) {
    if (err || !resp) {
      return util.sendError(
        "Issues getting building full benchmark.",
        400,
        req,
        res,
        next
      );
    }

    let response = {};
    try {
      response = typeof resp === "string" ? JSON.parse(resp) : resp;
    } catch (error) {
      console.log("error - stringify", resp);
    }

    const benchmark = {
      general:
        response && response[ANALYSIS_TYPE_MAPPER.general]
          ? response[ANALYSIS_TYPE_MAPPER.general]
          : 0,
      heating:
        response && response[ANALYSIS_TYPE_MAPPER.heating]
          ? response[ANALYSIS_TYPE_MAPPER.heating]
          : 0,
      cooling:
        response && response[ANALYSIS_TYPE_MAPPER.cooling]
          ? response[ANALYSIS_TYPE_MAPPER.cooling]
          : 0,
      lighting:
        response && response[ANALYSIS_TYPE_MAPPER.lighting]
          ? response[ANALYSIS_TYPE_MAPPER.lighting]
          : 0,
      dhw:
        response && response[ANALYSIS_TYPE_MAPPER.dhw]
          ? response[ANALYSIS_TYPE_MAPPER.dhw]
          : 0,
      water:
        response && response[ANALYSIS_TYPE_MAPPER.water]
          ? response[ANALYSIS_TYPE_MAPPER.water]
          : 0,
      portfolioManager: building.benchmark.portfolioManager || "",
      pmScores: building.benchmark.pmScores || []
    };

    // Check for special case of overwriting water score
    if (benchmarkRequest.size < 200000) {
      benchmark.water = {};
    }

    building.benchmark = benchmark;
    // reset flag back to false since benchmark has been ran
    building.rerunAnalyses = false;

    building.save(function(err) {
      if (err) {
        return util.sendError(err, 400, req, res, next);
      }

      // Return the benchmark object
      res.sendResult = {
        status: "Success",
        message: "Retrieved Building Benchmark (Building Updated)",
        benchmark: benchmark,
        building: building
      };
      return next();
    });
  });
};
