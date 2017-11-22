// var config = require('./config.js').get(process.env.NODE_ENV);
var config = require('config');
var express = require('express');
var router = express.Router();
var mAPI = require('../messengerAPI/controller')
User = require('../models/user');

// Arbitrary value used to validate a webhook
const VALIDATION_TOKEN = config.get('validationToken');

router.get('/webhook', function(req, res) {
  console.log("HIT WEBHOOK");
  if (req.query['hub.mode'] === 'subscribe' &&
      req.query['hub.verify_token'] === VALIDATION_TOKEN) {
    console.log("Validating webhook");
    res.status(200).send(req.query['hub.challenge']);
  } else {
    console.error("Failed validation. Make sure the validation tokens match.");
    res.sendStatus(403);
  }
});

router.post('/webhook', function (req, res) {
  var data = req.body;

  // Make sure this is a page subscription
  if (data.object == 'page') {
    // Iterate over each entry
    // There may be multiple if batched
    data.entry.forEach(function(pageEntry) {
      var pageID = pageEntry.id;
      var timeOfEvent = pageEntry.time;

      // Iterate over each messaging event
      pageEntry.messaging.forEach(function(messagingEvent) {
        if (messagingEvent.optin) {
          mAPI.receivedAuthentication(messagingEvent);
        } else if (messagingEvent.message) {
          mAPI.receivedMessage(messagingEvent);
        } else if (messagingEvent.delivery) {
          mAPI.receivedDeliveryConfirmation(messagingEvent);
        } else if (messagingEvent.postback) {
          mAPI.receivedPostback(messagingEvent);
        } else if (messagingEvent.read) {
          mAPI.receivedMessageRead(messagingEvent);
        } else if (messagingEvent.account_linking) {
          mAPI.receivedAccountLink(messagingEvent);
        } else {
          console.log("Webhook received unknown messagingEvent: ", messagingEvent);
        }
      });
    });

    // Assume all went well.
    //
    // You must send back a 200, within 20 seconds, to let us know you've
    // successfully received the callback. Otherwise, the request will time out.
    res.sendStatus(200);
  }
});

router.get('/authorize', function(req, res) {
  var accountLinkingToken = req.query.account_linking_token;
  var redirectURI = req.query.redirect_uri;

  // Authorization Code should be generated per user by the developer. This will
  // be passed to the Account Linking callback.
  var authCode = "1234567890";

  // Redirect users to this URI on successful login
  var redirectURISuccess = redirectURI + "&authorization_code=" + authCode;

  res.render('authorize', {
    accountLinkingToken: accountLinkingToken,
    redirectURI: redirectURI,
    redirectURISuccess: redirectURISuccess
  });
});

module.exports = router;
