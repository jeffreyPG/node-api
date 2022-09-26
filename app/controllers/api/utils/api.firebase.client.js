"use strict";

const util = require("./api.utils");
const firebaseAdmin = require("firebase-admin");
const unirest = require("unirest");
const config = require("../../../../config/config");

const MOCK = Boolean(process.env.NODE_ENV === "test" || config.firebase.disable);

const MOCK_RESPONSE = {
  getAudit: {
    name: "Mocked Audit",
    info: {
      yearBuilt: 1984,
    },
    levels: [{ name: "Mocked Level Name" }],
    mocked: true,
  },
  getImageList: {
    imageUrls: {
      building: { imageUrls: ["http://cdn.testing.com/a/url/path/image1.jpg"] },
      notes: { imageUrls: ["http://cdn.testing.com/a/url/path/image2.jpg"] },
      measures: { imageUrls: ["http://cdn.testing.com/a/url/path/image3.jpg"] },
    },
    mocked: true,
  },
  getOrganization: {},
};

/* let connectionString = config.firebase.uri + '/';
if (config.firebase.parentPath) {
  connectionString += config.firebase.parentPath;
} */

let SERVICE_ACCOUNT;
// Init Firebase connection
try {
  if (config.firebase.serviceAccountFilename) {
    SERVICE_ACCOUNT = require("../../../../config/firebase/" + config.firebase.serviceAccountFilename);
  } else {
    SERVICE_ACCOUNT = {
      type: "service_account",
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: process.env.FIREBASE_AUTH_URI,
      token_uri: process.env.FIREBASE_TOKEN_URI,
      auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_CERT_URL,
      client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL,
    };
  }
} catch (err) {}
if (!SERVICE_ACCOUNT) {
  console.error("\n", "Missing service account info to connect to the Firebase Database!", "\n");
}

// Only connect to remote database when not running tests
if (MOCK === false) {
  firebaseAdmin.initializeApp({
    credential: firebaseAdmin.credential.cert(SERVICE_ACCOUNT),
    databaseURL: config.firebase.uri,
  });
  const FIREBASE = firebaseAdmin.database();
  if (!FIREBASE) {
    console.error("\n", "Could not connect to Firebase Database!", "\n");
  }
  // firebaseAdmin.database.enableLogging(DEBUG);
}

// Setup common references
// var parentRef = (config.firebase.parentPath) ? FIREBASE.ref(config.firebase.parentPath) : FIREBASE.ref();
const snapshots = {};

/**
 * Create cache of firebase data
 * - Now any *.once() will pull from cached data instead of making a clean request each time
 */
// parentRef.child('organizations').on('value', function(snapshot) {
//   if (DEBUG) console.log('\n', 'Firebase - Organizations snapshot updated.', '\n');
//   snapshots.organizations = snapshot;
// });

/**
 * Trim out the connection string (firebase domain and parent path) and send back only the remaining path
 */
/* const _trimPath = function (path) {
  return path.substr(connectionString.length);
}; */
/**
 * Verify that a path exists in the database
 */
/* const _verifyPathExists = function (options, done) {
  // Only verify if there was a path supplied
  if (!options.verifyPath) {
    return done(null, true);
  }
  if (!snapshots[options.snapshot || '']) {
    return done('No snapshot to run verify path against.', null);
  }
  snapshots[options.snapshot].ref.child(options.verifyPath).once('value').then(function (snapshot) {
    const existsBool = Boolean(snapshot.exists());
    done(null, (existsBool && options.returnSnapshot) ? snapshot : existsBool);
  }).catch(function (err) { done(err, null); });
}; */

/**
 * Firebase client used to perform actions against the REST API
 */
const _authRestRequest = function (options, done) {
  const opts = {
    parentPath: (config.firebase.parentPath) ? config.firebase.parentPath + "/" : "/",
    method: options.method || "GET",
    path: options.path || "",
  };

  // Get the token info, the sdk will automatically grab a new token if expired
  firebaseAdmin.credential.cert(SERVICE_ACCOUNT).getAccessToken().then(function (accessToken) {
    // Setup the Request object
    const Request = unirest(opts.method, config.firebase.uri + "/" + opts.parentPath + opts.path + ".json");
    Request.timeout(1000 * 1000);
    // Setup the auth headers
    Request.headers({
      Authorization: "Bearer " + accessToken.access_token,
    });

    // Send off the request
    Request.end(function (response) {
      if (response.ok && response.body) {
        return done(null, response.body);
      }
      return done("Issues contacting REST server.", null);
    });
  }).catch(function (err) {
    done("Issues with token information.", null);
  });
};

/**
 * Firebase client used to perform read actions against currently cached snapshot data
 * -- options.method
 *   - post - push list data to source
 *   - put - set data to source
 *   - patch - update data to source
 *   - delete - remove data to source
 */
const _readSnapshot = function (options, done) {
  if (!options.snapshot) {
    return done("A \"snapshot\" name is required.", null);
  }

  // Check snapshot cache is available
  if (!snapshots[options.snapshot]) {
    return done("Issues finding data source.", null);
  }

  // Check if there is a child path, request if specified
  if (!options.path) {
    // No path provided in options, so request parent
    snapshots[options.snapshot].ref.once("value", function (snapshot) {
      done(null, snapshot);
    });
  } else {
    // Query for the child per the options
    snapshots[options.snapshot].ref.child(options.path).once("value").then(function (snapshot) {
      done(null, snapshot);
    }).catch(function (err) { done(err, null); });
  }
};

/**
 * Firebase client used to perform modifications to the currently cached snapshot data, which updates the source database
 * -- options.method - These are mapped from the REST actions -> snapshot functions
 *   - post -> 'push' list data to source
 *   - put -> 'set' data to source
 *   - patch -> 'update' data to source
 *   - delete -> 'remove' data to source
 */
/* const _modifySnapshot = function (options, done) {
  if (!options.snapshot) {
    return done('A "snapshot" name is required.', null);
  }
  if (!options.method) {
    return done('A "method" is required.', null);
  }
  if (typeof options.method !== 'string') {
    return done('Option "method" must be a string.', null);
  }

  // Check snapshot cache is available
  if (!snapshots[options.snapshot] || (snapshots[options.snapshot] && !snapshots[options.snapshot].ref)) {
    return done('Issues retrieving data.', null);
  }

  // Normalize and validate method
  options.method = options.method.toLowerCase();
  if ((options.method === 'post' || options.method === 'put' || options.method === 'patch') && !options.body) {
    return done('A "body" is required for this method type.', null);
  }

  // Firebase REST api method -> Firebase function name refs
  const fbFunctionMap = {
    post: 'push',
    put: 'set',
    patch: 'update',
    delete: 'remove',
  };
  const firebaseProcessRef = snapshots[options.snapshot].ref;
  if (typeof firebaseProcessRef[fbFunctionMap[options.method]] !== 'function') {
    return done('Option "method" is invalid.', null);
  }

  // Check if a path needs to be verified before making commit
  _verifyPathExists(options, function (err, exists) {
    if (err) {
      return done(err, null);
    }

    if (!exists) {
      return done('Invalid path specified.', null);
    }

    // Check if there is a child path, request if specified
    if (!options.path) {
      // No path provided in options, pass in body of request if it is not delete
      firebaseProcessRef[fbFunctionMap[options.method]](
        (options.method !== 'delete') ? options.body : undefined
      ).then(function (result) {
        return done(null, (result) ? { id: result.key, path: _trimPath(result.toString()) } : 'success');
      }).catch(function (err) { done(err, null); });
    } else {
      // Path provided to target child, pass in body of request if it is not delete
      firebaseProcessRef.child(options.path)[fbFunctionMap[options.method]](
        (options.method !== 'delete') ? options.body : undefined
      ).then(function (result) {
        return done(null, (result) ? { id: result.key, path: _trimPath(result.toString()) } : 'success');
      }).catch(function (err) { done(err, null); });
    }
  });
}; */

/**
 * Get Firebase audit info per the provided path
 */
exports.getAudit = function (options, done) {
  if (MOCK) {
    return done(null, MOCK_RESPONSE.getAudit);
  }

  let ret = {};

  // Clean any leading "/"
  if (options.path && options.path.startsWith("/")) {
    options.path = options.path.substr(1);
  }

  const opts = {
    path: options.path || "",
    verifyPath: options.path,
    includeKey: Boolean(options.path && options.includeKey),
    snapshot: "organizations",
  };

  // Get audit data via firebase REST call
  _authRestRequest(opts, function (err, response) {
    if (err) {
      return done(err, null);
    }

    // Check for special formatting
    if (options.formatter === "report") {
      ret = util.cleanFirebaseAuditForReport(response);
    } else if (options.formatter === "measuresMap") {
      ret = util.cleanFirebaseAuditForMeasuresMap(response);
    } else {
      ret = response;
    }

    return done(null, ret);
  });
};

/**
 * Get Firebase images saved to EA per provided path and buildingId
 */
exports.getImageList = function (options, done) {
  if (MOCK) {
    return done(null, MOCK_RESPONSE.getImageList);
  }

  let ret = {};

  // Clean any leading "/"
  if (options.path && options.path.startsWith("/")) {
    options.path = options.path.substr(1);
  }

  if (!options.orgId || !options.buildingId) return done("Firebase \"orgId\" and \"buildingId\" required.", null);

  // Get a list of clients, locate the buildingId within to find the appropriate clientId
  const opts = {
    path: options.path || "",
    verifyPath: options.path,
    includeKey: Boolean(options.path && options.includeKey),
    snapshot: "organizations",
  };

  const clientsPath = options.orgId + "/clients";
  _authRestRequest({
    path: clientsPath,
    verifyPath: clientsPath,
    snapshot: "organizations",
  }, function (err, responseClients) {
    if (err) {
      return done(err, null);
    }

    const clientId = util.locateFirebaseClientId(options.buildingId, responseClients);
    if (!clientId) {
      return done("Issues locating Firebase \"clientId\" per passed Firebase \"buildingId\".");
    }

    _authRestRequest(opts, function (err, responseAudits) {
      if (err) {
        return done(err, null);
      }

      ret = util.locateFirebaseFileUrls(options.orgId, clientId, options.buildingId, responseAudits);

      return done(null, ret);
    });
  });
};

/**
 * Get Firebase organization info per the provided path
 */
exports.getOrganization = function (options, done) {
  if (MOCK) {
    return done(null, MOCK_RESPONSE.getOrganization);
  }

  let ret = {};
  let val;

  // Clean any leading "/"
  if (options.path && options.path.startsWith("/")) {
    options.path = options.path.substr(1);
  }

  const opts = {
    path: options.path || "",
    verifyPath: options.path,
    includeKey: Boolean(options.path && options.includeKey),
    snapshot: "organizations",
  };

  // Read via cached data snapshot
  _readSnapshot(opts, function (err, snapshot) {
    if (err) {
      return done(err, null);
    }

    // Check see the requested format of return data
    // Do not send back the key info if there was no result from request
    val = snapshot.val();
    if (val && opts.includeKey) {
      ret[snapshot.key] = val;
    } else {
      ret = val;
    }

    return done(null, ret);
  });
};
