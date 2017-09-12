var sendAPI = require('./send.js');
var mAPI = require('./controller.js');
var messageIDs = require('./messageIDs.js');
var User = require('../models/user.js');
var Company = require('../models/company.js');
const Shift = require('../models/shift.js');
const shiftManagerAPI = require('../shiftManagerAPI/main');

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
    var text = "Hi, welcome to ShiftBot. I'll help you manage your shifts. Ready to get started?";
    var quickReplies = [
      {
        "content_type":"text",
        "title":"Yes",
        "payload":"YES_START"
      },
      {
        "content_type":"text",
        "title":"Nope",
        "payload":"NO_START"
      }
    ]
    sendAPI.sendQuickReply(senderID,quickReplies,text,messageIDs.READY_TO_START);
  },

  companyQueryProcess: (senderID) => {
    var text = "Let's get working. Your employer should have given you a code that identifies their company. Please type that code!";
    sendAPI.sendTextMessage(senderID,text,messageIDs.QUERY_COMPANY);
  },

  receiveCompanyCodeProcess: (text,senderID) => {
    const DNE = "We couldn't find a company that matched that code. Make sure you typed it correctly and try again.";
    console.log("TEXTTT",text);
    Company.findOne({secretCode:text},(error,company)=> {
      if(error) {
        console.log(error);
      } else {
        if (company == null) {
          sendAPI.sendTextMessage(senderID,DNE,messageIDs.QUERY_COMPANY)
        } else {
          User.getUserByFBID(senderID,(error,user)=>{
            if(error){
              console.log(error);
            }else{
              //// CHANGE THIS IN PRODUCTION
              if (user.company != null) {
                if (user.company.toString() != company._id.toString()){
                  console.log(user.company,company._id);
                  company.employees.push(user._id);
                  company.save();
                }
              }
              user.company = company._id;
              user.save();

              sendAPI.sendTextMessage(senderID,
                ("We've connected your account with "+company.name+"'s. Whenever they need you for a shift, you'll get a message here. You can view your messages and shifts via the bottom menu."),
                messageIDs.COMPANY_CONFIRMED);
            }
          });
        }
      }
    })
  },

  queryShiftProcess: (context,senderID) => {
    var text = "Hi, can you work for "+context.company+
      " on "+context.date+" from "+context.startTime+" to "+context.endTime;
    var quickReplies = [
      {
        "content_type":"text",
        "title":"Yes",
        "payload":"CAN_WORK:"+context.shiftID
      },
      {
        "content_type":"text",
        "title":"Nope",
        "payload":"CAN_NOT_WORK:"+context.shiftID
      }
    ]

    sendAPI.sendQuickReply(senderID,quickReplies,text,"ASK_IF_USER_AVAILABLE_TO_WORK");
  },

  canWorkProcesss: (replyText,shiftID,senderID) => {
    switch (replyText) {
      case "CAN_WORK":
        shiftManagerAPI.shiftAccepted(shiftID,senderID);
        sendAPI.sendTextMessage(senderID,"Great, you're confirmed for the shift.","CAN_WORK");
        break;
      case "CAN_NOT_WORK":
        shiftManagerAPI.shiftDenied(shiftID,senderID);
        sendAPI.sendTextMessage(senderID,"That's too bad, maybe next time.","CAN_NOT_WORK");
        break;
      default:
        sendAPI.sendTextMessage(senderID,"WHAT?")
    }
  },

  viewShiftProcess: (senderID) => {
    shiftManagerAPI.viewShifts(senderID);
  },
  cancelShiftProcess:(senderID)=>{
    shiftManagerAPI.cancelShiftOptions(senderID);
  },

  cancellationProcess: (replyText,shiftID,senderID)=>{
    console.log("processing cancellation");
    shiftManagerAPI.cancelShift(shiftID,senderID);
    sendAPI.sendTextMessage(senderID,"That's too bad - this will make it less likely for us to pick you for shifts in the future.");
  },

  shiftReminderProces: (context,senderID)=>{
    console.log("reminder");
    var message = "Just wanted to remind you that you're scheduled to work at "+
      context.company+" today from "+context.startTime+" to "+context.endTime;
    sendAPI.sendTextMessage(senderID,message);
  }

}

module.exports = self;
