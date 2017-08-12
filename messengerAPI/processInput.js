var sendAPI = require('./send.js');
var mAPI = require('./controller.js');

const config = require('config');

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
  //LANGUAGE PROCESSING METHODS
  getStartedProcess: (formattedText,senderID) => {
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
    }];
    sendAPI.sendButtonMessage(senderID,buttons,text);
  },

  isRegisteredProcess: (formattedText,senderID) => {
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
        sendAPI.sendButtonMessage(senderID,buttons,text);
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
        sendAPI.sendButtonMessage(senderID,buttons,text);
        break;
      default:
        if (formattedText.includes("know") || formattedText.includes("sure")){
          sendAPI.sendTextMessage(senderID,"What state are you from? Type your state or postal code.");
        } else {
          sendAPI.sendTextMessage(senderID,"Sorry, I didn't get that, try clicking one of the buttons below the last message.");
        }
        break;
    }
  },

  stateSelectorProcess: (formattedText,senderID) => {
    switch (formattedText) {
      case 'oh':
        sendAPI.sendTextMessage(senderID,"Good Choice");
        break;
      case 'ohio':
        sendAPI.sendTextMessage(senderID,"Good Choice");
        break;
      default:
        sendAPI.sendTextMessage(senderID, "Sorry, we currently only have support for Ohio.");
      }
  },

  privacyConfirmationProcess: (formattedText,senderID) => {
    switch (formattedText) {
      case 'yes':
        sendAPI.sendTextMessage(senderID,"What state are you from? Type your state or postal code.");
        break;
      case 'no':
        var text = "Head back to the main menu?";
        var buttons = [{
          type: "postback",
          title: "Yes",
          payload: "RESTART"
        }]
        sendAPI.sendButtonMessage(senderID,buttons,text);
        break;
      default:
        sendAPI.sendTextMessage(senderID,"Sorry, I didn't get that, try clicking one of the buttons below the last message.");
        break;
    }
  },

  privacyDenialProcess: (formattedText,senderID) => {
    sendAPI.sendTextMessage(senderID, "Still working on this part.")
  },

  registrationLinkProcess: (formattedText,senderID) => {
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
      sendAPI.sendButtonMessage(senderID,buttons,text);
    } else {
      sendAPI.sendTextMessage(senderID,"Sorry, I didn't get that, try clicking one of the buttons below the last message.");
    }
  },

  moreActionsProcess: (formattedText,senderID) => {
    switch (formattedText) {
      case 'early':
        sendAPI.sendTextMessage(senderID,"Here's what I found for early voting in Ohio");
        self.earlyVotingInfoButton(senderID,"Ohio");
        break;
      case 'poll':

        break;
      case 'absentee':

        break;
      default:

    }

  },

  earlyVotingProcess: (formattedText,senderID) => {
    var text = ("Here's some other stuff I can help you with:");
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
  },
}

module.exports = self;
