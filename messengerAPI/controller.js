const
  bodyParser = require('body-parser'),
  config = require('config'),
  crypto = require('crypto'),
  express = require('express'),
  https = require('https'),
  request = require('request');

var processAPI = require('./processinput.js');
var sendAPI = require('./send.js');
var messageIDs = require('./messageIDs.js');

const APP_SECRET = (process.env.MESSENGER_APP_SECRET) ?
  process.env.MESSENGER_APP_SECRET :
  config.get('appSecret');

// Arbitrary value used to validate a webhook
const VALIDATION_TOKEN = (process.env.MESSENGER_VALIDATION_TOKEN) ?
  (process.env.MESSENGER_VALIDATION_TOKEN) :
  config.get('validationToken');

// Generate a page access token for your page from the App Dashboard
const PAGE_ACCESS_TOKEN = (process.env.MESSENGER_PAGE_ACCESS_TOKEN) ?
  (process.env.MESSENGER_PAGE_ACCESS_TOKEN) :
  config.get('pageAccessToken');

// URL where the app is running (include protocol). Used to point to scripts and
// assets located at this address.
const SERVER_URL = (process.env.SERVER_URL) ?
  (process.env.SERVER_URL) :
  config.get('serverURL');

var self = {

  verifyRequestSignature: (req, res, buf) => {
    var signature = req.headers["x-hub-signature"];

    if (!signature) {
      // For testing, let's log an error. In production, you should throw an
      // error.
      console.error("Couldn't validate the signature.");
    } else {
      var elements = signature.split('=');
      var method = elements[0];
      var signatureHash = elements[1];

      var expectedHash = crypto.createHmac('sha1', APP_SECRET)
                          .update(buf)
                          .digest('hex');

      if (signatureHash != expectedHash) {
        throw new Error("Couldn't validate the request signature.");
      }
    }
  },

  receivedAuthentication: (event) => {
    var senderID = event.sender.id;
    var recipientID = event.recipient.id;
    var timeOfAuth = event.timestamp;

    // The 'ref' field is set in the 'Send to Messenger' plugin, in the 'data-ref'
    // The developer can set this to an arbitrary value to associate the
    // authentication callback with the 'Send to Messenger' click event. This is
    // a way to do account linking when the user clicks the 'Send to Messenger'
    // plugin.
    var passThroughParam = event.optin.ref;

    console.log("Received authentication for user %d and page %d with pass " +
      "through param '%s' at %d", senderID, recipientID, passThroughParam,
      timeOfAuth);

    // When an authentication is received, we'll send a message back to the sender
    // to let them know it was successful.
    sendAPI.sendTextMessage(senderID, "Authentication successful");
  },

  receivedDeliveryConfirmation: (event) => {
    var senderID = event.sender.id;
    var recipientID = event.recipient.id;
    var delivery = event.delivery;
    var messageIDs = delivery.mids;
    var watermark = delivery.watermark;
    var sequenceNumber = delivery.seq;

    if (messageIDs) {
      messageIDs.forEach(function(messageID) {
        console.log("Received delivery confirmation for message ID: %s",
          messageID);
      });
    }

    console.log("All message before %d were delivered.", watermark);
  },

  receivedMessageRead: (event) => {
    var senderID = event.sender.id;
    var recipientID = event.recipient.id;

    // All messages before watermark (a timestamp) or sequence have been seen.
    var watermark = event.read.watermark;
    var sequenceNumber = event.read.seq;

    console.log("Received message read event for watermark %d and sequence " +
      "number %d", watermark, sequenceNumber);
  },

  receivedAccountLink: (event) => {
    var senderID = event.sender.id;
    var recipientID = event.recipient.id;

    var status = event.account_linking.status;
    var authCode = event.account_linking.authorization_code;

    console.log("Received account link event with for user %d with status %s " +
      "and auth code %s ", senderID, status, authCode);
  },

  receivedMessage: (event) => {
    console.log("EVENT",event);
    var senderID = event.sender.id;
    var recipientID = event.recipient.id;
    var timeOfMessage = event.timestamp;
    var message = event.message;

    console.log("Received message for user %d and page %d at %d with message:",
      senderID, recipientID, timeOfMessage);
    console.log(JSON.stringify(message));

    var isEcho = message.is_echo;
    var messageId = message.mid;
    var appId = message.app_id;
    var metadata = message.metadata;

    // You may get a text or attachment but not both
    var messageText = message.text;
    var messageAttachments = message.attachments;
    var quickReply = message.quick_reply;

    if (quickReply) {
      var quickReplyPayload = quickReply.payload;
      console.log("QUICK",quickReply.payload);

      self.processQuickReply(senderID,quickReply.payload);
      return;
    }

    else if (messageText) {
      self.processTextMessage(senderID,messageText);
    } else if (messageAttachments) {
      sendAPI.sendTextMessage(senderID, "Message with attachment received");
    }
  },

  processQuickReply: (senderID,quickReply) => {
    var formattedReply = quickReply.split(':');
    switch (formattedReply[0]) {
      case "YES_START":
        processAPI.companyQueryProcess(senderID);
        break;
      case "NO_START":

        break;
      case "CAN_WORK":
        processAPI.canWorkProcesss(formattedReply[0],formattedReply[1],senderID);
        break;
      case "CAN_NOT_WORK":
        processAPI.canWorkProcesss(formattedReply[0],formattedReply[1],senderID);
        break;
      case "CANCEL_SHIFT_ID":
        processAPI.cancellationProcess(formattedReply[0],formattedReply[1],senderID);
        break;
      case "ROLE":
        processAPI.receivedRoleProcess(formattedReply[0],formattedReply[1],senderID);
      default:

    }
  },

  processTextMessage: (senderID,messageText) => {
    User.getUserByFBID(senderID, (error,user) => {
      if(error){
        console.log(error);
      }else{
        // console.log("USER",user);
        const lastMessage = user.lastMessage;
        self.processText(senderID,messageText,lastMessage);
      }
    });
  },

  processText: (senderID,messageText,lastMessage) => {
    const formattedText = messageText.toLowerCase();
    // console.log("LAST",lastMessage);
    switch (lastMessage) {
      case "ASK_IF_USER_AVAILABLE_TO_WORK":
        processAPI.canWorkProcesss(messageText,senderID);
        break;
      case messageIDs.QUERY_COMPANY:
        processAPI.receiveCompanyCodeProcess(messageText,senderID);
        break;
      default:
        sendAPI.sendTextMessage(senderID,
          "Sorry, I didn't understand that.","CANT_UNDERSTAND");
        break;

    }
  },

  receivedPostback: (event) => {
    var senderID = event.sender.id;
    var recipientID = event.recipient.id;
    var timeOfPostback = event.timestamp;

    // The 'payload' param is a developer-defined field which is set in a postback
    // button for Structured Messages.
    var payload = event.postback.payload;

    console.log("Received postback for user %d and page %d with payload '%s' " +
      "at %d", senderID, recipientID, payload, timeOfPostback);

    switch (payload) {
      case 'GET_STARTED':
        console.log("Hit get started");
        processAPI.getStartedProcess("",senderID);
        break;
      case 'VIEW_SHIFTS':
        processAPI.viewShiftProcess(senderID);
        break;
      case 'CANCEL_SHIFT':
        processAPI.cancelShiftProcess(senderID);
      default:
        var buttons = [{
          type: "postback",
          title: "Yes",
          payload: "DEFAULT"
        }];
        sendAPI.sendTextMessage(senderID, buttons, "Postback called");
    }
  },

  setGreetingText: () => {
    var greetingData = {
      setting_type: "greeting",
      greeting:{
        text:"Hi, I'm a ShiftBot, I'll help you manage your work schedule."
      }
    };
    self.createGreetingApi(greetingData);
  },

  createGreetingApi: (data) => {
    request({
      uri: 'https://graph.facebook.com/v2.6/me/thread_settings',
      qs: { access_token: PAGE_ACCESS_TOKEN },
      method: 'POST',
      json: data

    }, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        console.log("Greeting set successfully!");
      } else {
        console.error("Failed calling Thread Reference API", response.statusCode,     response.statusMessage, body.error);
      }
    });
  }

};

module.exports = self;
