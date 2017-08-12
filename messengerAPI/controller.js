const
  bodyParser = require('body-parser'),
  config = require('config'),
  crypto = require('crypto'),
  express = require('express'),
  https = require('https'),
  request = require('request');

var processAPI = require('./processinput.js');
var sendAPI = require('./send.js');

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

    if (isEcho) {
      // Just logging message echoes to console
      console.log("Received echo for message %s and app %d with metadata %s",
        messageId, appId, metadata);
      return;
    } else if (quickReply) {
      var quickReplyPayload = quickReply.payload;
      console.log("Quick reply for message %s with payload %s",
        messageId, quickReplyPayload);

      sendAPI.sendTextMessage(senderID, "Quick reply tapped");
      return;
    }

    if (messageText) {
      self.processTextMessage(senderID,messageText);
    } else if (messageAttachments) {
      sendAPI.sendTextMessage(senderID, "Message with attachment received");
    }
  },

  processTextMessage: (senderID,messageText) => {
    User.getUserByFBID(senderID, (error,user) => {
      if(error){
        console.log(error);
      }else{
        console.log("USER",user);
        const lastMessage = user.lastMessage;
        self.processText(senderID,messageText,lastMessage);
      }
    });
  },

  processText: (senderID,messageText,lastMessage) => {
    const formattedText = messageText.toLowerCase();
    switch (lastMessage) {
      case 'What state are you from? Type your state or postal code.':
        processAPI.stateSelectorProcess(formattedText,senderID);
        break;
      case 'Sorry, I didn\'t understand that.':
        console.log("Caught a message");
        break;
      case 'Register in Ohio':
        processAPI.registrationLinkProcess(formattedText,senderID);
        break;
      case 'You better be... How else can I help you?':
        processAPI.moreActionsProcess(formattedText,senderID);
        break;
      case 'Let\'s get you registered! First, take a second to check out our privacy policy {link}. We don\'t share your info or data with anyone. Ready to get started?':
        processAPI.privacyConfirmationProcess(formattedText,senderID);
        break;
      case "Hi, I\'m DataGenomix\'s vote bot. Are you registered to vote?":
        processAPI.isRegisteredProcess(formattedText,senderID);
        break;
      case "Head back to the main menu?":
        processAPI.privacyDenialProcess(formattedText,senderID);
        break;
      case "Early Voting in Ohio":
        processAPI.earlyVotingProcess(formattedText,senderID);
        break;
      case 'Here\'s what I found for early voting in Ohio':
        processAPI.earlyVotingProcess(formattedText,senderID);
        break;
      default:
        sendAPI.sendTextMessage(senderID, "Sorry, I didn't understand that.");
        break;

    }
  },

  earlyVotingInfoButton: (senderID,state) => {
    var messageData = {
      recipient: {
        id: senderID
      },
      message: {
        attachment: {
          type: "template",
          payload: {
            template_type: "generic",
            elements: [{
              title: "Early Voting in "+state,
              item_url: "https://register2.rockthevote.com/registrants/new/OH/",
              buttons: [{
                type: "web_url",
                url: "https://register2.rockthevote.com/registrants/new/OH/",
                title: "Vote Early"
              }]
            }]
          }
        }
      }
    };
    sendAPI.callSendAPI(messageData);
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
        processAPI.getStartedProcess("",senderID)
        break;
      case 'IS_REGISTERED':
        processAPI.isRegisteredProcess("yes",senderID);
        break;
      case 'NOT_REGISTERED':
        processAPI.isRegisteredProcess("no",senderID);
        break;
      case 'UNSURE_IF_REGISTERED':
        processAPI.isRegisteredProcess("know",senderID);
        break;
      case 'PERMISSION_TO_HELP':
        processAPI.privacyConfirmationProcess('yes',senderID);
        break;
      case 'PERMISSION_DENIED':
        processAPI.privacyConfirmationProcess('no',senderID);
        break;
      case "FIND_POLL":
        processAPI.moreActionsProcess('poll',senderID);
        break;
      case "FIND_EARLY_VOTING":
        processAPI.moreActionsProcess('early',senderID);
        break;
      case "FIND_ABSENTEE_BALLOT":
        processAPI.moreActionsProcess('absentee',senderID);
        break;
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
        text:"Hi, I'm Data Genomix's voter bot, let's get you registered to vote!"
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
