const {
  request,
  arrayify,
} = require("./api.portfolio.util");

async function getPortfolioScore (year, propertyId) {
  try {
    const opts = {
      method: "GET",
      url: `/property/${propertyId}/metrics?year=${year}&month=12`,
      headers: { "PM-Metrics": "score" },
    };
    let score;
    // Perform the /account server request
    const response = await request(opts);
    if (response &&
      response.propertyMetrics &&
      response.propertyMetrics.metric &&
      response.propertyMetrics.metric.value &&
      typeof response.propertyMetrics.metric.value !== "object") {
      score = Number(response.propertyMetrics.metric.value);
    }
    if (score) {
      return {
        year,
        score,
        reasons: [],
      };
    } else {
      const reasonRequetOpts = {
        method: "GET",
        url: `/property/${propertyId}/reasonsForNoScore?year=${year}&month=12`,
      };
      const reasonResponse = await request(reasonRequetOpts);
      return {
        year,
        score: 0,
        reasons: arrayify(reasonResponse.alerts.alert),
      };
    }
  } catch (err) {
    return {
      year,
      score: 0,
      reasons: [{
        name: "Error during connection to PM",
        description: err,
      }],
    };
  }
};

module.exports = {
  getPortfolioScore,
};
