var sendAPI = require('./send.js');
var mAPI = require('./controller.js');
var messageIDs = require('./messageIDs.js');
var User = require('../models/user');
var Company = require('../models/company.js');
const shiftManagerAPI = require('../shiftManagerAPI/main');

var self =  {

  printD: (word)=>{
    console.log("FINALY GOT DIS TO WORK",word);
  },
  //LANGUAGE PROCESSING METHODS
  getStartedProcess: (formattedText,senderID) => {
    var text = "Hi👋 I'm Kali. I'll help make sure you never miss a shift. Ready to get started?";
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
    var text = "Let's get working 🔨 Please type the secret code that I emailed/ texted you 👍";
    sendAPI.sendTextMessage(senderID,text,messageIDs.QUERY_COMPANY);
  },

  receiveCompanyCodeProcess: async(text,senderID) => {
    const DNE = "🤔 That code doesn't match one I've sent recently. Try double checking your email and typing it again 🔍";
    var company = await Company.getCompanyByCode(text);

    if (company == null) {
      sendAPI.sendTextMessage(senderID,DNE,messageIDs.QUERY_COMPANY)
    } else {

      var user = await User.getUserByFBID(senderID);

      if (user.company != null) {
        if (user.company.toString() != company._id.toString()){
          company.employees.push(user._id);
          company.save();
        }
      }

      user.company = company._id;
      user.save();

      sendAPI.sendTextMessage(senderID,
        ("We've connected your account with "+company.name+"'s ✅ Whenever they need you for a shift, I'll send you a message. You can view your messages and shifts via the bottom menu ⬇️"),
        messageIDs.COMPANY_CONFIRMED);
      setTimeout(function(){ self.roleQueryProcess(senderID);}, 1000);

    }

  },

  roleQueryProcess: async(senderID) => {
    var text = "What's your role 👷 within the company?";
    var quickReplies = [];
    var user = await User.getUserByFBID(senderID);
    var company = await Company.getCompanyById(user.company);

    company.roles.forEach((role)=>{
      var newQR = {
        "content_type":"text",
        "title":role,
        "payload":"ROLE:"+role
      };
      quickReplies.push(newQR);
    });

    sendAPI.sendQuickReply(senderID,quickReplies,text,messageIDs.QUERY_ROLE);
  },

  // process the role which the user selected
  receivedRoleProcess: async(rolePrefix,role,senderID) => {
    var user = await User.getUserByFBID(senderID);
    var company = await Company.getCompanyById(user.company);

    // text to send
    const text = "👌 Cool, I'll send you a message whenever "+
      company.name+" needs a "+role+"!";

    sendAPI.sendTextMessage(senderID,text);

    // save the user's selected role in the db
    user.role = role;
    user.save();
  },

  queryShiftProcess: (context,senderID) => {
    var text = "Hi 👋 can you work for "+context.company+
      " on "+context.date+" from "+context.startTime+" to "+context.endTime+"?";
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
    // save the fact that the user responded in the db
    shiftManagerAPI.userRespondedToQuery(senderID);
    // process what the input was
    switch (replyText) {
      case "CAN_WORK":
        shiftManagerAPI.shiftAccepted(shiftID,senderID);
        sendAPI.sendTextMessage(senderID,"👌 Great, you're confirmed for the shift 🎉🎉🎉","CAN_WORK");
        break;
      case "CAN_NOT_WORK":
        shiftManagerAPI.shiftDenied(shiftID,senderID);
        sendAPI.sendTextMessage(senderID,"😕 That's too bad, maybe next time.","CAN_NOT_WORK");
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
    sendAPI.sendTextMessage(senderID,"That's too bad 😒 this will make it less likely for us to pick you for shifts in the future.");
  },

  shiftReminderProces: (context,senderID)=>{
    console.log("reminder");
    var message = "😎 Just wanted to remind you that you're scheduled to work at "+
      context.company+" today from "+context.startTime+" to "+context.endTime;
    sendAPI.sendTextMessage(senderID,message);
  }

}

module.exports = self;