"use strict";

var fs = require("fs"),
  path = require("path"),
  _ = require("lodash"),
  path = require("path"),
  config = require("../../../config/config"),
  unirest = require("unirest"),
  crypto = require("crypto"),
  mongoose = require("mongoose"),
  moment = require("moment");

var selfModule = this;

var callCount = 0;

var testPath = path.join(__dirname, "..");
var functionalTestPath = testPath + "/api";
var fullTestOutputPath = testPath + "/output/test-output.out";

var REQUESTPATH = "http://localhost:" + config.port;

config.getGlobbedFiles("../../models/**/*.js").forEach(function (modelPath) {
  require(path.resolve(modelPath));
});

/**
 * Helpers
 */
var _createUser = function (opts, callback) {
  var request = opts.request || null;
  if (!request) {
    return callback("A \"request\" must be present in the options.", null);
  }
  var Request = unirest.post(REQUESTPATH + "/user");
  Request.send(request).end(function (response) {
    if (response.body && response.body.user) {
      return callback(null, response.body.user);
    }
    return callback("Create user request failed.", null);
  });
};

var _createUserToken = function (opts, callback) {
  var user = opts.user || null;
  var originalReq = opts.origRequest || null;
  if (!user && originalReq) {
    return callback(
      "Please pass a \"user\" and \"origRequest\" within the options.",
      null
    );
  }
  var Request = unirest.get(REQUESTPATH + "/auth/token");
  Request.auth(originalReq.email, originalReq.password).end(function (response) {
    if (response.body && response.body.secret) {
      return callback(null, response.body.secret);
    }
    return callback("Create user token secret request failed.", null);
  });
};

var _createLibraryKey = function (opts, callback) {
  var request = opts.request || null;
  if (!request) {
    return callback("A \"request\" must be present in the options.", null);
  }
  var Request = unirest.post(REQUESTPATH + "/library/key");
  Request.send(request).end(function (response) {
    if (response.body && response.body.key) {
      return callback(null, response.body.key);
    }
    return callback("Create library key request failed.", null);
  });
};

/**
 * Exposed, public functions
 */
exports.fullUserCreate = function (opts, callback) {
  var done;
  if (arguments.length === 1 && typeof opts === "function") {
    done = opts;
  } else {
    done = callback;
  }

  var request = {
    email: opts.email || process.env.TEST_USER,
    password: opts.password || process.env.TEST_PASSWORD
  };
  _createUser({ request: request }, function (err, userRes) {
    if (err) {
      return done(err, null);
    }
    _createUserToken({ user: userRes, origRequest: request }, function (
      err,
      tokenRes
    ) {
      if (err) {
        return done(err, null);
      }
      return done(null, {
        request: request,
        user: userRes,
        secret: tokenRes
      });
    });
  });
};

exports.libraryKeyCreate = function (opts, callback) {
  var done;
  if (arguments.length === 1 && typeof opts === "function") {
    done = opts;
  } else {
    done = callback;
  }

  var request = opts.request || {
    orgId: "-testY07WQa-Kq9ZTjad",
    userId: "-testCZkGo0O8WOQhknU",
    username: "testlibrarykeygenerate"
  };
  _createLibraryKey({ request: request }, function (err, apiKey) {
    if (err) {
      return done(err, null);
    }

    return done(null, apiKey);
  });
};

exports.getTestImagePath = function () {
  return path.join(__dirname, "..", "images");
};

exports.getTestFilePath = function () {
  return path.join(__dirname, "..", "files");
};

exports.getSessionExpiration = function () {
  return moment()
    .add(5, "hours")
    .valueOf();
};

exports.parseErrorCode = function (errCode) {
  var ret;
  try {
    ret = parseInt(errCode, 10);
  } catch (err) {
    throw new Error(
      "Incorrect api error code format was returned for hmac authentication failure"
    );
  }
  return ret;
};

exports.generateHmacDigest = function (sig, secret, done) {
  if (!sig || !secret) {
    throw new Error("A signature and secret are required to get hmac digest.");
  }
  if (typeof done !== "function") {
    throw new Error("A callback is required to generate hmac digest.");
  }

  var cryptoStream = crypto.createHmac("sha1", secret);
  cryptoStream.end(sig);
  cryptoStream.on("finish", function () {
    done(cryptoStream.read().toString("hex"));
  });
};

exports.genereateDigest = function (method, path, secret) {
  var reqMethod =
    method && typeof method === "string" ? method.toUpperCase() : null;
  var reqPath = path && typeof path === "string" ? path : null;

  if (!reqMethod || !reqPath) {
    throw new Error("Invalid data passed to generate digest string.");
  }

  var _getMomentUnixDate = function () {
    return moment().unix();
  };
  var _getRandomNumber = function () {
    return Math.floor(Math.random() * 1000000);
  };

  var nonce = _getRandomNumber();
  var date = _getMomentUnixDate();
  return {
    string: [reqMethod, reqPath, date, nonce].join("+"),
    nonce: nonce,
    date: date,
    secret: secret
  };
};

// Get a random mongo id generated, or pass a string to convert to mongo id
exports.getMongoId = function (castToId) {
  var createMongoId = castToId || null;

  if (createMongoId !== null && !/^[0-9a-fA-F]{24}$/.test(castToId)) {
    throw new Error("Invalid string passed to convert to mongoId.");
  }

  return mongoose.Types.ObjectId(createMongoId).toString();
};

// Generate a string of random characters
exports.generateRandomString = function (wordLength) {
  wordLength = wordLength || 10;
  var charSet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  var randomString = "";
  for (var i = 0; i < wordLength; i++) {
    var randomPos = Math.floor(Math.random() * charSet.length);
    randomString += charSet.charAt(randomPos);
  }
  return randomString;
};

// Clean the db before calling the callback to proceed with unit tests
exports.cleanModelsBeforeDone = function (modelsArr, done) {
  let Model = {};
  Model.Session = mongoose.model("Session");
  Model.User = mongoose.model("User");
  Model.Key = mongoose.model("Key");
  Model.Measure = mongoose.model("Measure");
  Model.Component = mongoose.model("Component");
  Model.Building = mongoose.model("Building");
  Model.Code = mongoose.model("Code");
  Model.Utility = mongoose.model("Utility");
  Model.Meter = mongoose.model("Meter");
  Model.Analysis = mongoose.model("Analysis");
  Model.PublicComponent = mongoose.model("PublicComponent");
  Model.PublicMeasure = mongoose.model("PublicMeasure");
  Model.Project = mongoose.model("Project");
  Model.ProjectSimulation = mongoose.model("ProjectSimulation");

  if (!_.isArray(modelsArr)) {
    throw new Error(
      "First param must be an array of strings of model names. Ensure correct capitalization."
    );
  }

  var iterators = [];
  for (var i = 0; i < modelsArr.length; i += 1) {
    iterators.push(i);

    if (typeof Model[modelsArr[i]] !== undefined) {
      Model[modelsArr[i]].remove().exec();
    }

    if (iterators.length === modelsArr.length) return done();
  }
};

exports.end = function (err, data, done) {
  callCount += 1;

  if (err) {
    throw err;
  }

  var _checkToClearOutput = function (contents, callback) {
    var _clean = function (cb) {
      fs.writeFile(fullTestOutputPath, "", cb);
    };
    var _write = function (cb) {
      fs.appendFile(fullTestOutputPath, contents, cb);
    };

    if (callCount === 1) {
      _clean(_write(callback));
    } else {
      _write(callback);
    }
  };

  var contents = {
    path: functionalTestPath,
    index: callCount,
    request: {
      meta: {
        method: data.req && data.req.method ? data.req.method : "",
        path: data.req && data.req.path ? data.req.path : ""
      },
      headers: data.req && data.req._headers ? data.req._headers : {},
      body: data.request && data.request._data ? data.request._data : {}
    },
    response: {
      meta: {
        statusCode: data.res && data.res.statusCode ? data.res.statusCode : 0,
        statusMessage:
          data.res && data.res.statusMessage ? data.res.statusMessage : ""
      },
      headers: data.res && data.res.headers ? data.res.headers : {},
      body: data.res && data.res.body ? data.res.body : {}
    }
  };

  try {
    contents = JSON.stringify(contents);
  } catch (err) {
    throw new Error("Issues parsing data for the test output file.");
  }

  contents += "\n";

  _checkToClearOutput(contents, function () {
    return done();
  });
};

exports.getParsedOutput = function () {
  var outputContents = fs.readFileSync(fullTestOutputPath, "utf8");

  // Put contents of file into array
  var tmp = outputContents.split("\n");
  // Remove last element if it is empty
  if (!tmp[tmp.length - 1]) tmp.pop();

  return tmp.map(JSON.parse);
};
