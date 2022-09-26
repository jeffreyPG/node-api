"use strict";

/**
 * Module dependencies.
 */
const _ = require("lodash");
const mongoose = require("mongoose");
const Blacklist = mongoose.model("Blacklist");

const _sendResponse = function (res, next) {
  res.sendResult = {
    status: "Success",
    message: "Received message.",
  };

  return next();
};

exports.processEmailNotification = function (req, res, next) {
  // parse the message
  let notification = req.body;

  if (typeof req.body === "string") {
    try {
      notification = JSON.parse(req.body);
    } catch (err) {}
  }

  // process the request and generate the blacklist entry
  let emails = [];

  if (notification && notification.SubscribeURL) {
    console.log("Subcribe URL: ", notification.SubscribeURL);
  }

  if (notification && notification.Message && notification.Message.notificationType) {
    notification = notification.Message;
  }

  if (notification.notificationType === "Bounce") {
    emails = _.map(notification.bounce.bouncedRecipients, function (recipient) {
      if (recipient.emailAddress) {
        return { email: recipient.emailAddress, permanent: true };
      }
      return false;
    });
  } else if (notification.notificationType === "Complaint") {
    emails = _.map(notification.complaint.complainedRecipients, function (recipient) {
      if (recipient.emailAddress) {
        return { email: recipient.emailAddress, permanent: false };
      }
      return false;
    });
  }

  const iterators = [];

  const failedLoop = _.each(emails, function (email, index, emails) {
    if (email) {
      Blacklist.find({ email: email.emailAddress }).lean(true).exec(function (err, blacklist) {
        if (err) {
          return false;
        } else {
          if (blacklist.length === 0) {
            blacklist = new Blacklist(email);
            blacklist.save(function (err) {
              iterators.push(email.emailAddress);
              if (iterators.length === emails.length) {
                return _sendResponse(res, next);
              }
            });
          } else {
            iterators.push(email.emailAddress);
            if (iterators.length === emails.length) {
              return _sendResponse(res, next);
            }
          }
        }
      });
    } else {
      iterators.push(emails.emailAddress);
      if (iterators.length === emails.length) {
        return _sendResponse(res, next);
      }
    }
  });

  if (!failedLoop) {
    return _sendResponse(res, next);
  }

  if (emails.length === 0) {
    res.sendResult = {
      status: "Success",
      message: "Received message.",
      notification: notification,
    };

    return next();
  }
};
