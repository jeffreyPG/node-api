"use strict";

/**
 * Module dependencies.
 */
const util = require("./utils/api.utils");
const fileImageUtil = require("./utils/api.image");
const fileUploadUtil = require("./utils/api.upload");
const Busboy = require("busboy");

const busboyOptions = {
  limits: {
    files: 1,
    fileSize: 500000,
  },
};

/**
 * Upload image
 */
exports.imageUpload = function (req, res, next) {
  // Respond quickly with an error if it is a ~empty request
  if (req.headers["content-length"] < 100) {
    return util.sendError("Invalid request.", 400, req, res, next);
  }

  busboyOptions.headers = req.headers;
  busboyOptions.limits.fileSize = 20000000;
  const busboy = new Busboy(busboyOptions);

  // Send back error if to many files are provided in the request
  busboy.on("filesLimit", function () {
    return util.sendError("Request has too many files.", 400, req, res, next);
  });

  // Send back error if to many fields are provided in the request
  busboy.on("fieldsLimit", function () {
    return util.sendError("Request has too many fields.", 400, req, res, next);
  });

  // Send back error if to many parts (files + fields) are provided in the request
  busboy.on("partsLimit", function () {
    return util.sendError("Request is not properly formated.", 400, req, res, next);
  });

  // Hold the databits, to be converted to a buffer
  const fileData = [];
  let err;
  // var fileChunksStrArr;
  busboy.on("file", function (fieldname, file, filename, encoding, mimetype) {
    // Only allow certain image files
    if (mimetype.indexOf("image") === -1) {
      err = "Unsupported file type.";
      file.resume();
    }

    // On receiving file data
    file.on("data", function (data) {
      fileData.push(data);
    });

    // After file has finished uploading
    file.on("end", function () {
      if (err) {
        return util.sendError(err, 400, req, res, next);
      }
      if (file.truncated) {
        return util.sendError("The file is too large. Max size of 500kb.", 400, req, res, next);
      }

      // Store file data to a buffer
      const fileBuffer = Buffer.concat(fileData);

      // Create an array of fixed image buffers
      const imageName = Date.now() + util.generateRandomString(12);
      // imageVariations.template.forEach(function(variation) {
      //   imageDataArr.push({ buffer: fileBuffer, dimWidth: variation.dim.width, dimHeight: variation.dim.height, exifData: null, filename: imageName + variation.suffix });
      // });
      // fileImageUtil.getFixedImageBuffers(imageDataArr, function(err, imageBuffersArr) {
      //   if (err) {
      //     return util.sendError(err, 400, req, res, next);
      //   }
      // Add the original image to upload process
      // imageBuffersArr.push({ buffer: fileBuffer, filename: imageName });
      // Upload...
      // fileImageUtil.uploadS3Images(imageBuffersArr, function(err, imageUrls) {
      fileImageUtil.uploadS3Images([{ buffer: fileBuffer, filename: imageName }], function (err, imageUrls) {
        if (err) {
          return util.sendError("Issues uploading files.", 400, req, res, next);
        }
        // Store and remove the original file name for the return urls
        // var orginalFilename = _.remove(imageUrls, function (data) { return (data.indexOf('_') === -1); });
        res.sendResult = {
          status: "Success",
          message: "Photo uploaded.",
          fileLocation: imageUrls,
        };
        return next();
      });
      // });
    });
  });
  req.pipe(busboy);
};

/**
 * Upload file (word doc)
 */
exports.fileWordUpload = function (req, res, next) {
  // Respond quickly with an error if it is a ~empty request
  if (req.headers["content-length"] < 100) {
    return util.sendError("Invalid request.", 400, req, res, next);
  }

  busboyOptions.headers = req.headers;
  busboyOptions.limits.fileSize = 2000000;
  const busboy = new Busboy(busboyOptions);

  // Send back error if to many files are provided in the request
  busboy.on("filesLimit", function () {
    return util.sendError("Request has too many files.", 400, req, res, next);
  });

  // Send back error if to many fields are provided in the request
  busboy.on("fieldsLimit", function () {
    return util.sendError("Request has too many fields.", 400, req, res, next);
  });

  // Send back error if to many parts (files + fields) are provided in the request
  busboy.on("partsLimit", function () {
    return util.sendError("Request is not properly formated.", 400, req, res, next);
  });

  // Hold the databits, to be converted to a buffer
  const fileData = [];
  let err;
  // var fileChunksStrArr;
  busboy.on("file", function (fieldname, file, filename, encoding, mimetype) {
    // Only allow certain image files
    const supportedFileTypes = ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/msword"];
    if (supportedFileTypes.indexOf(mimetype) < 0) {
      err = "Unsupported file type.";
      file.resume();
    }

    // On receiving file data
    file.on("data", function (data) {
      fileData.push(data);
    });

    // After file has finished uploading
    file.on("end", function () {
      if (err) {
        return util.sendError(err, 400, req, res, next);
      }
      if (file.truncated) {
        return util.sendError("The file is too large. Max size of 2MB.", 400, req, res, next);
      }

      // Store file data to a buffer
      const currentdate = new Date();
      const datetime = (currentdate.getMonth()+1) + "_" + currentdate.getDate() + "_" + currentdate.getFullYear() + "-" + currentdate.getHours() + "_" + currentdate.getMinutes() + "_" + currentdate.getSeconds();
      const fileBuffer = Buffer.concat(fileData);
      const fileName = datetime + "-" + filename;

      fileUploadUtil.uploadS3Files([{ buffer: fileBuffer, filename: fileName }], function (err, fileUrls) {
        if (err) {
          return util.sendError("Issues uploading files.", 400, req, res, next);
        }
        res.sendResult = {
          status: "Success",
          message: "File uploaded.",
          fileLocation: fileUrls,
        };
        return next();
      });
    });
  });
  req.pipe(busboy);
};

/**
 * Upload file (pdf doc)
 */
 exports.filePdfUpload = function (req, res, next) {
  
  busboyOptions.headers = req.headers;
  busboyOptions.limits.fileSize = 10000000;
  const busboy = new Busboy(busboyOptions);

  // Send back error if to many files are provided in the request
  busboy.on("filesLimit", function () {
    return util.sendError("Request has too many files.", 400, req, res, next);
  });

  // Send back error if to many fields are provided in the request
  busboy.on("fieldsLimit", function () {
    return util.sendError("Request has too many fields.", 400, req, res, next);
  });

  // Send back error if to many parts (files + fields) are provided in the request
  busboy.on("partsLimit", function () {
    return util.sendError("Request is not properly formated.", 400, req, res, next);
  });

  // Hold the databits, to be converted to a buffer
  const fileData = [];
  let err;
  // var fileChunksStrArr;
  busboy.on("file", function (fieldname, file, filename, encoding, mimetype) {

    // On receiving file data
    file.on("data", function (data) {
      fileData.push(data);
    });

    // After file has finished uploading
    file.on("end", function () {
      if (err) {
        return util.sendError(err, 400, req, res, next);
      }
      if (file.truncated) {
        return util.sendError("The file is too large. Max size of 2MB.", 400, req, res, next);
      }

      // Store file data to a buffer
      const currentdate = new Date();
      const datetime = (currentdate.getMonth()+1) + "_" + currentdate.getDate() + "_" + currentdate.getFullYear() + "-" + currentdate.getHours() + "_" + currentdate.getMinutes() + "_" + currentdate.getSeconds();
      const fileBuffer = Buffer.concat(fileData);
      const fileName = datetime + "-" + filename;

      fileUploadUtil.uploadS3Files([{ buffer: fileBuffer, filename: fileName }], function (err, fileUrls) {
        if (err) {
          return util.sendError("Issues uploading files.", 400, req, res, next);
        }
        res.sendResult = {
          status: "Success",
          message: "File uploaded.",
          fileLocation: fileUrls,
        };
        return next();
      });
    });
  });
  req.pipe(busboy);
};