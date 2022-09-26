"use strict";

const AWS = require("aws-sdk");
const url = require("url");
const config = require("../../../../config/config");
const s3Zip = require('s3-zip')

const ACCESS_KEY_SECRET = process.env.AWS_SECRET_ACCESS_KEY || "";
const ACCESS_KEY = process.env.AWS_ACCESS_KEY || "";

if (!ACCESS_KEY_SECRET || !ACCESS_KEY) {
  console.error("\n", "Missing credentials to connect to AWS!", "\n");
}

AWS.config.update({
  accessKeyId: ACCESS_KEY,
  secretAccessKey: ACCESS_KEY_SECRET,
  bucket: config.aws.bucket,
  region: config.aws.region
});

const getBucketObj = function(timeout = 120000) {
  return new AWS.S3({
    params: {
      Bucket: config.aws.bucket
    },
    httpOptions: {
      timeout
    }
  });
};

/**
 * Perform image upload to s3 bucket
 * @param  {Object}   imageObj The image object to upload
 * @param  {Function} callback The callback
 * @return {Function}          callback
 */
const _s3UploadImage = function(imageObj, callback) {
  const bucket = getBucketObj();

  const params = {
    ACL: "public-read",
    Key: `public/${imageObj.filename}.jpg`,
    Body: imageObj.image,
    ContentType: "image/jpeg"
  };

  bucket.upload(params, function(err, data) {
    if (err) {
      console.log(err);
      return callback(err, null);
    }

    // we now have a URL for the image
    const urlParse = url.parse(data.Location);
    data.urlRelative = url.parse("/" + urlParse.path, false, true);

    return callback(null, data);
  });
};

const _s3UploadFile = function(fileObj, callback) {
  const bucket = getBucketObj();
  const params = {
    Key: fileObj.filename,
    Body: fileObj.file,
    ContentType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  };

  bucket.upload(params, function(err, data) {
    if (err) {
      console.log(err);
      return callback(err, null);
    }

    // we now have a URL for the image
    const urlParse = url.parse(data.Location);
    data.urlRelative = url.parse("/" + urlParse.path, false, true);

    return callback(null, data);
  });
};

exports.s3ImageUpload = function(opts, done) {
  if (!opts.image || !opts.filename) {
    throw "Missing required options in s3 image upload process. Check options.image or options.filename";
  }

  if (opts.mock || (config.s3Disable && config.s3Disable.upload)) {
    return done(null, {
      Location: "https://s3bucket.s3-us-west-2.amazonaws.com/testImageName.jpg"
    });
  }

  return _s3UploadImage(opts, done);
};

exports.s3ImageUploadAsync = async function({ image, filename }) {
  if (!image || !filename) {
    throw "Missing required options in s3 image upload process. Check options.image or options.filename";
  }

  const bucket = getBucketObj();
  const params = {
    Key: filename + ".jpg",
    Body: image,
    ContentType: "image/jpeg"
  };

  try {
    const upload = await bucket.upload(params);
    const data = await upload.promise();
    return data.Location;
  } catch (err) {
    console.error(err);
  }
};

exports.s3FileUpload = function(opts, done) {
  if (!opts.file || !opts.filename) {
    throw "Missing required options in s3 file upload process. Check options.file or options.filename";
  }

  if (opts.mock || (config.s3Disable && config.s3Disable.upload)) {
    return done(null, {
      Location: "https://s3bucket.s3-us-west-2.amazonaws.com/testWordDoc.docx"
    });
  }

  return _s3UploadFile(opts, done);
};

exports.downloadAssets = function(images, archievedFiles) {
  const bucket = getBucketObj();
  return s3Zip.archive({ s3: bucket, region: config.aws.region, bucket: config.aws.bucket }, '', images, archievedFiles)
}
