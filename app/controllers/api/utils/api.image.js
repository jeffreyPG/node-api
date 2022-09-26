"use strict";

const _ = require("lodash");
const s3upload = require("./api.s3.client");
const imageUtil = require("./api.image");
const lwip = {};

exports.fixImage = function(buffer, maxWidth, maxHeight, exifData, next) {
  lwip.open(buffer, "jpg", function(err, image) {
    if (err) {
      return next(err, null);
    }
    let rotation = 0;
    // we may have to rotate the image if the exif data holds orientation information
    if (exifData && exifData.image && exifData.image.Orientation) {
      switch (exifData.image.Orientation) {
        case 6:
          rotation = 90;
          break;
        case 3:
          rotation = 180;
          break;
        case 8:
          rotation = 270;
      }
    }
    image.rotate(rotation, function(err, image) {
      if (err) {
        return next(err, null);
      }
      // get the image size to calculate the "size" to resize to
      const height = image.height();
      const width = image.width();
      let newWidth, newHeight;
      if (height > width) {
        newWidth = maxWidth;
        newHeight = (height / width) * newWidth;
      } else {
        newHeight = maxHeight;
        newWidth = (width / height) * newHeight;
      }
      image.resize(newWidth, newHeight, function(err, image) {
        if (err) {
          return next(err, null);
        }

        // Return the image buffer
        image.toBuffer("jpg", function(err, buffer) {
          if (err) {
            return next(err, null);
          }
          return next(null, buffer);
        });
      });
    });
  });
};

exports.getFixedImageBuffers = function(imageDataArr, done) {
  const iterators = [];
  let errors = [];
  const imageBuffers = [];
  // Loop thru the image data to create the fixed image(s)
  // Send back any errors generated and any image buffers
  imageDataArr.forEach(function(imageData, index) {
    imageUtil.fixImage(
      imageData.buffer,
      imageData.dimWidth,
      imageData.dimHeight,
      imageData.exifData,
      function(err, buffer) {
        iterators.push(index);
        if (err) errors.push(err);
        if (buffer)
          imageBuffers.push({ buffer: buffer, filename: imageData.filename });
        if (iterators.length === imageDataArr.length) {
          // If no errors, send back the standard null error
          if (_.isEmpty(errors)) errors = null;
          return done(errors, imageBuffers);
        }
      }
    );
  });
};

exports.uploadS3Images = function(imageBuffersArr, done) {
  const iterators = [];
  let errors = [];
  let urlsRet = [];
  let options;
  imageBuffersArr.forEach(function(imageBuffer, index) {
    options = {
      image: imageBuffer.buffer,
      filename: imageBuffer.filename,
      mock: process.env.NODE_ENV === "test"
    };
    s3upload.s3ImageUpload(options, function(err, data) {
      iterators.push(index);
      if (err) errors.push(err);
      if (data && data.Location) urlsRet.push(data.Location);
      if (iterators.length === imageBuffersArr.length) {
        // If no errors, send back the standard null error
        if (_.isEmpty(errors)) errors = null;
        // If there was only one image uploaded, send back a string instead of an array
        if (urlsRet.length === 1) urlsRet = urlsRet[0];
        return done(errors, urlsRet);
      }
    });
  });
};

exports.deleteS3Images = function(imageUrls, done) {
  const images = typeof imageUrls === "string" ? [imageUrls] : imageUrls;
  const options = {
    imageUrls: images,
    mock: process.env.NODE_ENV === "test"
  };
  s3upload.s3ImageDelete(options, function(err, data) {
    if (err) {
      return done(err, null);
    }
    return done(null, data);
  });
};
