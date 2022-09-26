"use strict";

const _ = require("lodash");
const s3upload = require("./api.s3.client.js");

exports.uploadS3Files = function (fileBuffersArr, done) {
  const iterators = [];
  let errors = [];
  let urlsRet = [];
  let options;
  fileBuffersArr.forEach(function (fileBuffer, index) {
    options = { file: fileBuffer.buffer, filename: fileBuffer.filename, mock: (process.env.NODE_ENV === "test") };
    s3upload.s3FileUpload(options, function (err, data) {
      iterators.push(index);
      if (err) errors.push(err);
      if (data && data.Location) urlsRet.push(data.Location);
      if (iterators.length === fileBuffersArr.length) {
        // If no errors, send back the standard null error
        if (_.isEmpty(errors)) errors = null;
        // If there was only one image uploaded, send back a string instead of an array
        if (urlsRet.length === 1) urlsRet = urlsRet[0];
        return done(errors, urlsRet);
      }
    });
  });
};

exports.deleteS3Files = function (fileUrls, done) {
  const files = (typeof fileUrls === "string") ? [fileUrls] : fileUrls;
  const options = {
    fileUrls: files,
    mock: (process.env.NODE_ENV === "test"),
  };
  s3upload.s3FileDelete(options, function (err, data) {
    if (err) {
      return done(err, null);
    }
    return done(null, data);
  });
};
