"use strict";

const AWS = require("aws-sdk");
const config = require("../../../../config/config");

const SMTP_FROM_SOURCE = (config.smtp && config.smtp.from) ? config.smtp.from : "buildee Support<support@buildee.com>";

const AWS_SMTP_ACCESS_KEY = process.env.AWS_SMTP_ACCESS_KEY || "";
const AWS_SMTP_SECRET_ACCESS_KEY = process.env.AWS_SMTP_SECRET_ACCESS_KEY || "";

if (!AWS_SMTP_ACCESS_KEY || !AWS_SMTP_SECRET_ACCESS_KEY) {
  console.error("\n", "Missing credentials to connect to AWS SMTP!", "\n");
}

// Overwrite the global AWS configs
const _getEmailObj = function () {
  return new AWS.SES({
    accessKeyId: AWS_SMTP_ACCESS_KEY,
    secretAccessKey: AWS_SMTP_SECRET_ACCESS_KEY,
    region: (config.smtp && config.smtp.region) ? config.smtp.region : "",
    apiVersion: "2010-12-01",
  });
};

/**
 * Send out an AWS SMTP email message
 */
const _sendEmail = function (opts, message, done) {
  const ccArr = (opts && typeof opts.cc === "string") ? [opts.cc] : opts.cc;
  const toArr = (opts && typeof opts.to === "string") ? [opts.to] : opts.to;
  const subject = opts.subject || "A message from buildee";
  const source = opts.from || SMTP_FROM_SOURCE;
  const replyToArr = opts.replyTo || ["buildee Support<support@buildee.com>"];

  const emailer = _getEmailObj();

  const params = {
    Destination: {
      CcAddresses: ccArr,
      ToAddresses: toArr,
    },
    Message: {
      Body: {
        Html: {
          Charset: "UTF-8",
          Data: (message && message.html) ? message.html : "",
        },
        Text: {
          Charset: "UTF-8",
          Data: (message && message.text) ? message.text : "",
        },
      },
      Subject: {
        Charset: "UTF-8",
        Data: subject,
      },
    },
    Source: source,
    ReplyToAddresses: replyToArr,
  };

  emailer.sendEmail(params, function (err, data) {
    if (err) {
      return done(err, null);
    }

    return done(null, data);
  });
};

exports.sendEmail = function (opts, message, done) {
  if (!opts.to || !opts.subject) {
    throw "Missing required options in s3 image upload process. Check options.image or options.filename";
  }
  if (!message || (message && !message.text) || (message && !message.html)) {
    throw "A message is required to send an email.";
  }

  if (opts.mock) {
    return done(null, {
      ResponseMetadata: { RequestId: "ddb40ae4-294b-11e8-90e5-27f949990c3b" },
      MessageId: "01010162302c7f7b-312a68ee-1558-4cbb-82c0-3d09df05c16e-000000",
    });
  }

  return _sendEmail(opts, message, done);
};
