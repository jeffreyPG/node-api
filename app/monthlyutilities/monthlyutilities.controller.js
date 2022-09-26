const service = require("./monthlyutilities.service");

exports.monthlyUtilities = async (req, res, next) => {
  try {
      const options = req.body;
      service.generate(options);
      res.setHeader(
          "Content-Type",
          "application/json"
      );
      res.sendResult = {
          status: "Success",
          message: "started monthlyutilities script"
      };
      return next();
  } catch (error) {
      return util.sendError(error, 500, req, res, next);
  }
};