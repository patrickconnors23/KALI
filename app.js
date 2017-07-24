/* jshint node: true, devel: true */
'use strict';

const
  bodyParser = require('body-parser'),
  config = require('config'),
  crypto = require('crypto'),
  express = require('express'),
  https = require('https'),
  request = require('request');

require('dotenv').config();

var app = express();
app.set('port', process.env.PORT || 5000);
app.set('view engine', 'ejs');
app.use(bodyParser.json({ verify: verifyRequestSignature }));
app.use(express.static('public'));
console.log("hIT APP");

var User = require('./models/user.js');
/*
 * Be sure to setup your config values before running this code. You can
 * set them using environment variables or modifying the config file in /config.
 *
 */

// App Secret can be retrieved from the App Dashboard
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

if (!(APP_SECRET && VALIDATION_TOKEN && PAGE_ACCESS_TOKEN && SERVER_URL)) {
  console.error("Missing config values");
  process.exit(1);
}

/*
 * Use your own validation token. Check that the token used in the Webhook
 * setup is the same token used here.
 *
 */
app.get('/webhook', function(req, res) {
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

app.post('/webhook', function (req, res) {
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
          receivedAuthentication(messagingEvent);
          console.log("hook it from 1");
        } else if (messagingEvent.message) {
          receivedMessage(messagingEvent);
          console.log("hook it from 2");
        } else if (messagingEvent.delivery) {
          receivedDeliveryConfirmation(messagingEvent);
          console.log("hook it from 3");
        } else if (messagingEvent.postback) {
          receivedPostback(messagingEvent);
          console.log("hook it from 4");
        } else if (messagingEvent.read) {
          receivedMessageRead(messagingEvent);
          console.log("hook it from 5");
        } else if (messagingEvent.account_linking) {
          receivedAccountLink(messagingEvent);
          console.log("hook it from 6");
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

app.get('/authorize', function(req, res) {
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

/*
 * Verify that the callback came from Facebook. Using the App Secret from
 * the App Dashboard, we can verify the signature that is sent with each
 * callback in the x-hub-signature field, located in the header.
 *
 * https://developers.facebook.com/docs/graph-api/webhooks#setup
 *
 */
function verifyRequestSignature(req, res, buf) {
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
}

function receivedAuthentication(event) {
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
  sendTextMessage(senderID, "Authentication successful");
}

function receivedDeliveryConfirmation(event) {
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
}

function receivedMessageRead(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;

  // All messages before watermark (a timestamp) or sequence have been seen.
  var watermark = event.read.watermark;
  var sequenceNumber = event.read.seq;

  console.log("Received message read event for watermark %d and sequence " +
    "number %d", watermark, sequenceNumber);
}

function receivedAccountLink(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;

  var status = event.account_linking.status;
  var authCode = event.account_linking.authorization_code;

  console.log("Received account link event with for user %d with status %s " +
    "and auth code %s ", senderID, status, authCode);
}

function sendImageMessage(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "image",
        payload: {
          url: SERVER_URL + "/assets/rift.png"
        }
      }
    }
  };

  callSendAPI(messageData);
}

function sendGifMessage(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "image",
        payload: {
          url: SERVER_URL + "/assets/instagram_logo.gif"
        }
      }
    }
  };

  callSendAPI(messageData);
}

function sendAudioMessage(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "audio",
        payload: {
          url: SERVER_URL + "/assets/sample.mp3"
        }
      }
    }
  };
  callSendAPI(messageData);
}

function sendVideoMessage(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "video",
        payload: {
          url: SERVER_URL + "/assets/allofus480.mov"
        }
      }
    }
  };

  callSendAPI(messageData);
}

function sendFileMessage(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "file",
        payload: {
          url: SERVER_URL + "/assets/test.txt"
        }
      }
    }
  };
  callSendAPI(messageData);
}

function setGreetingText() {
  var greetingData = {
    setting_type: "greeting",
    greeting:{
      text:"Hi, I'm Data Genomix's voter bot, let's get you registered to vote!"
    }
  };
  createGreetingApi(greetingData);
}

function sendTextMessage(recipientId, messageText) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: messageText,
      metadata: "DEVELOPER_DEFINED_METADATA"
    }
  };

  callSendAPI(messageData);
}

function sendButtonMessage(recipientId,buttons,text) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "button",
          text: text,
          buttons: buttons
        }
      }
    }
  };

  callSendAPI(messageData);
}

function sendGenericMessage(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "generic",
          elements: [{
            title: "rift",
            subtitle: "Next-generation virtual reality",
            item_url: "https://www.oculus.com/en-us/rift/",
            image_url: SERVER_URL + "/assets/rift.png",
            buttons: [{
              type: "web_url",
              url: "https://www.oculus.com/en-us/rift/",
              title: "Open Web URL"
            }, {
              type: "postback",
              title: "Call Postback",
              payload: "Payload for first bubble",
            }],
          }, {
            title: "touch",
            subtitle: "Your Hands, Now in VR",
            item_url: "https://www.oculus.com/en-us/touch/",
            image_url: SERVER_URL + "/assets/touch.png",
            buttons: [{
              type: "web_url",
              url: "https://www.oculus.com/en-us/touch/",
              title: "Open Web URL"
            }, {
              type: "postback",
              title: "Call Postback",
              payload: "Payload for second bubble",
            }]
          }]
        }
      }
    }
  };

  callSendAPI(messageData);
}

function sendReceiptMessage(recipientId) {
  // Generate a random receipt ID as the API requires a unique ID
  var receiptId = "order" + Math.floor(Math.random()*1000);

  var messageData = {
    recipient: {
      id: recipientId
    },
    message:{
      attachment: {
        type: "template",
        payload: {
          template_type: "receipt",
          recipient_name: "Peter Chang",
          order_number: receiptId,
          currency: "USD",
          payment_method: "Visa 1234",
          timestamp: "1428444852",
          elements: [{
            title: "Oculus Rift",
            subtitle: "Includes: headset, sensor, remote",
            quantity: 1,
            price: 599.00,
            currency: "USD",
            image_url: SERVER_URL + "/assets/riftsq.png"
          }, {
            title: "Samsung Gear VR",
            subtitle: "Frost White",
            quantity: 1,
            price: 99.99,
            currency: "USD",
            image_url: SERVER_URL + "/assets/gearvrsq.png"
          }],
          address: {
            street_1: "1 Hacker Way",
            street_2: "",
            city: "Menlo Park",
            postal_code: "94025",
            state: "CA",
            country: "US"
          },
          summary: {
            subtotal: 698.99,
            shipping_cost: 20.00,
            total_tax: 57.67,
            total_cost: 626.66
          },
          adjustments: [{
            name: "New Customer Discount",
            amount: -50
          }, {
            name: "$100 Off Coupon",
            amount: -100
          }]
        }
      }
    }
  };

  callSendAPI(messageData);
}

function sendQuickReply(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: "What's your favorite movie genre?",
      quick_replies: [
        {
          "content_type":"text",
          "title":"Action",
          "payload":"DEVELOPER_DEFINED_PAYLOAD_FOR_PICKING_ACTION"
        },
        {
          "content_type":"text",
          "title":"Comedy",
          "payload":"DEVELOPER_DEFINED_PAYLOAD_FOR_PICKING_COMEDY"
        },
        {
          "content_type":"text",
          "title":"Drama",
          "payload":"DEVELOPER_DEFINED_PAYLOAD_FOR_PICKING_DRAMA"
        }
      ]
    }
  };

  callSendAPI(messageData);
}

function sendReadReceipt(recipientId) {
  console.log("Sending a read receipt to mark message as seen");

  var messageData = {
    recipient: {
      id: recipientId
    },
    sender_action: "mark_seen"
  };

  callSendAPI(messageData);
}

function sendTypingOn(recipientId) {
  console.log("Turning typing indicator on");

  var messageData = {
    recipient: {
      id: recipientId
    },
    sender_action: "typing_on"
  };

  callSendAPI(messageData);
}

function sendTypingOff(recipientId) {
  console.log("Turning typing indicator off");

  var messageData = {
    recipient: {
      id: recipientId
    },
    sender_action: "typing_off"
  };

  callSendAPI(messageData);
}

function sendAccountLinking(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "button",
          text: "Welcome. Link your account.",
          buttons:[{
            type: "account_link",
            url: SERVER_URL + "/authorize"
          }]
        }
      }
    }
  };

  callSendAPI(messageData);
}

//LANGUAGE PROCESSING METHODS
function isRegisteredProcess(formattedText,senderID) {
  switch (formattedText) {
    case 'yes':
      var text = ("You better be... How else can I help you?");
      var buttons = [{
        type: "postback",
        title: "Find Poll Locations",
        payload: "FIND_POLL"
      },
      {
        type: "postback",
        title: "Early Voting",
        payload: "FIND_EARLY_VOTING"
      },
      {
        type: "postback",
        title: "Absentee Ballots",
        payload: "FIND_ABSENTEE_BALLOT"
      }];
      sendButtonMessage(senderID,buttons,text);
      break;
    case 'IS_REGISTERED':
      var text = ("You better be... How else can I help you?");
      var buttons = [{
        type: "postback",
        title: "Find Poll Locations",
        payload: "FIND_POLL"
      },
      {
        type: "postback",
        title: "Early Voting",
        payload: "FIND_EARLY_VOTING"
      },
      {
        type: "postback",
        title: "Absentee Ballots",
        payload: "FIND_ABSENTEE_BALLOT"
      }];
      sendButtonMessage(senderID,buttons,text);
      break;
    case 'no':
      var text = ("Let's get you registered! First, take a second to check out our privacy policy {link}. We don't share your info or data with anyone. Ready to get started?");
      var buttons = [{
        type: "postback",
        title: "Yes",
        payload: "PERMISSION_TO_HELP"
      },
      {
        type: "postback",
        title: "No",
        payload: "PERMISSION_DENIED"
      }]
      sendButtonMessage(senderID,buttons,text);
      break;
    default:
      if (formattedText.includes("know") || formattedText.includes("sure")){
        sendTextMessage(senderID,"What state are you from? Type your state or postal code.");
      } else {
        sendTextMessage(senderID,"Sorry, I didn't get that, try clicking one of the buttons below the last message.");
      }
      break;
  }
}
function stateSelectorProcess(formattedText,senderID) {
  switch (formattedText) {
    case 'oh':
      stateInfoButton(senderID, "Ohio");
      break;
    case 'ohio':
      stateInfoButton(senderID, "Ohio");
      break;
    default:
      sendTextMessage(senderID, "Sorry, we currently only have support for Ohio.");
    }
}
function privacyConfirmationProcess(formattedText,senderID) {
  switch (formattedText) {
    case 'yes':
      sendTextMessage(senderID,"What state are you from? Type your state or postal code.");
      break;
    case 'no':
      var text = "Head back to the main menu?";
      var buttons = [{
        type: "postback",
        title: "Yes",
        payload: "RESTART"
      }]
      sendButtonMessage(senderID,buttons,text);
      break;
    default:
      sendTextMessage(senderID,"Sorry, I didn't get that, try clicking one of the buttons below the last message.");
      break;
  }
}
function privacyDenialProcess(formattedText,senderID) {
  sendTextMessage(senderID, "Still working on this part.")
}
function registrationLinkProcess(formattedText,senderID) {
  if (formattedText.includes("register") || formattedText.includes("already")) {
    var text = ("You better be... How else can I help you?");
    var buttons = [{
      type: "postback",
      title: "Find Poll Locations",
      payload: "FIND_POLL"
    },
    {
      type: "postback",
      title: "Early Voting",
      payload: "FIND_EARLY_VOTING"
    },
    {
      type: "postback",
      title: "Absentee Ballots",
      payload: "FIND_ABSENTEE_BALLOT"
    }];
    sendButtonMessage(senderID,buttons,text);
  } else {
    sendTextMessage(senderID,"Sorry, I didn't get that, try clicking one of the buttons below the last message.");
  }
}

/*
 * Message Event
 *
 * This event is called when a message is sent to your page. The 'message'
 * object format can vary depending on the kind of message that was received.
 * Read more at https://developers.facebook.com/docs/messenger-platform/webhook-reference/message-received
 *
 * For this example, we're going to echo any text that we get. If we get some
 * special keywords ('button', 'generic', 'receipt'), then we'll send back
 * examples of those bubbles to illustrate the special message bubbles we've
 * created. If we receive a message with an attachment (image, video, audio),
 * then we'll simply confirm that we've received the attachment.
 *
 */
function receivedMessage(event) {
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

    sendTextMessage(senderID, "Quick reply tapped");
    return;
  }

  if (messageText) {
    processTextMessage(senderID,messageText);
  } else if (messageAttachments) {
    sendTextMessage(senderID, "Message with attachment received");
  }
}

function processTextMessage(senderID,messageText) {
  User.getUserByFBID(senderID, (error,user) => {
    if(error){
      console.log(error);
    }else{
      const lastMessage = user.lastMessage;
      processText(senderID,messageText,lastMessage);
    }
  });
}

function processText(senderID,messageText,lastMessage) {
  const formattedText = messageText.toLowerCase();
  switch (lastMessage) {
    case 'What state are you from? Type your state or postal code.':
      stateSelectorProcess(formattedText,senderID);
      break;
    case 'Sorry, I didn\'t understand that.':
      console.log("Caught a message");
      break;
    case 'Register in Ohio':
      registrationLinkProcess(formattedText,senderID);
      break;
    case 'You better be... How else can I help you?':
      console.log("Caught a message");
      break;
    case 'Let\'s get you registered! First, take a second to check out our privacy policy {link}. We don\'t share your info or data with anyone. Ready to get started?':
      privacyConfirmationProcess(formattedText,senderID);
      break;
    case "Hi, I\'m DataGenomix\'s vote bot. Are you registered to vote?":
      isRegisteredProcess(formattedText,senderID);
      break;
    case "Head back to the main menu?":
      privacyDenialProcess(formattedText,senderID);
      break;
    default:
      sendTextMessage(senderID, "Sorry, I didn't understand that.");
      break;

  }
}

function stateInfoButton(senderID,state) {
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
            title: "Register in "+state,
            subtitle: "Next-generation virtual reality",
            item_url: "https://register2.rockthevote.com/registrants/new/OH/",
            // image_url: SERVER_URL + "/assets/rift.png",
            buttons: [{
              type: "web_url",
              url: "https://register2.rockthevote.com/registrants/new/OH/",
              title: "Get Registered"
            }, {
              type: "postback",
              title: "I'm registered",
              payload: "IS_REGISTERED",
            }],
          }]
        }
      }
    }
  };
  callSendAPI(messageData);
}

function receivedPostback(event) {
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
      var text = "Hi, I'm DataGenomix's vote bot. Are you registered to vote?";
      var buttons = [{
        type: "postback",
        title: "Yes",
        payload: "IS_REGISTERED"
      },
      {
        type: "postback",
        title: "No",
        payload: "NOT_REGISTERED"
      },
      {
        type: "postback",
        title: "I don't know",
        payload: "UNSURE_IF_REGISTERED"
      }]
      sendButtonMessage(senderID,buttons,text);
      break;
    case 'IS_REGISTERED':
      // var text = ("You better be... How else can I help you?");
      // var buttons = [{
      //   type: "postback",
      //   title: "Find Poll Locations",
      //   payload: "FIND_POLL"
      // },
      // {
      //   type: "postback",
      //   title: "Early Voting",
      //   payload: "FIND_EARLY_VOTING"
      // },
      // {
      //   type: "postback",
      //   title: "Absentee Ballots",
      //   payload: "FIND_ABSENTEE_BALLOT"
      // }];
      // sendButtonMessage(senderID,buttons,text);
      isRegisteredProcess("IS_REGISTERED",senderID);
      break;
    case 'NOT_REGISTERED':
      var text = ("Let's get you registered! First, take a second to check out our privacy policy {link}. We don't share your info or data with anyone. Ready to get started?");
      var buttons = [{
        type: "postback",
        title: "Yes",
        payload: "PERMISSION_TO_HELP"
      },
      {
        type: "postback",
        title: "No",
        payload: "PERMISSION_DENIED"
      }]
      sendButtonMessage(senderID,buttons,text);
      break;
    case 'UNSURE_IF_REGISTERED':
      sendTextMessage(senderID,"What state are you from? Type your state or postal code.");
      break;
    case 'PERMISSION_TO_HELP':
      sendTextMessage(senderID,"What state are you from? Type your state or postal code.");
      break;
    case 'PERMISSION_DENIED':
      var text = "Head back to the main menu?";
      var buttons = [{
        type: "postback",
        title: "Yes",
        payload: "RESTART"
      }]
      sendButtonMessage(senderID,buttons,text);
      break;
    default:
      var buttons = [{
        type: "postback",
        title: "Yes",
        payload: "DEFAULT"
      }];
      sendTextMessage(senderID, buttons, "Postback called");
  }
}

/*
 * Call the Send API. The message data goes in the body. If successful, we'll
 * get the message id in a response
 *
 */
function callSendAPI(messageData) {
  const message = messageData.message;
  var text = ""
  if (message.attachment) {
    if (message.attachment.payload.text) {
      text = message.attachment.payload.text;
    } else {
      text = message.attachment.payload.elements[0].title;
    }
  } else {
    text = message.text;
  }
  request({
    uri: 'https://graph.facebook.com/v2.6/me/messages',
    qs: { access_token: PAGE_ACCESS_TOKEN },
    method: 'POST',
    json: messageData

  }, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var recipientId = body.recipient_id;
      var messageId = body.message_id;
      User.getUserByFBID(recipientId,(error,user)=>{
        if(error){
          console.log(error);
        }else{
          console.log("User",user);
          if(!user){
            User.addUser({"fbID":senderID,"lastMessage":"[]"},(error,response)=>{
              if(error){
                console.log("Create",error);
              }else{
                response.lastMessage = text;
                response.save();
              }
            });
          }else{
            user.lastMessage = text;
            user.save();
          }
        }
      });

      if (messageId) {
        console.log("Successfully sent message with id %s to recipient %s",
          messageId, recipientId);
      } else {
      console.log("Successfully called Send API for recipient %s",
        recipientId);
      }
    } else {
      console.error("Failed calling Send API", response.statusCode, response.statusMessage, body.error);
    }
  });
}

function createGreetingApi(data) {
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

// Start server
// Webhooks must be available via SSL with a certificate signed by a valid
// certificate authority.
app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
  setGreetingText();
});

module.exports = app;
