const
  request = require('request'),
  config = require('config');

var User = require('../models/user');

// App Secret can be retrieved from the App Dashboard
const APP_SECRET = config.get('appSecret');
// Arbitrary value used to validate a webhook
const VALIDATION_TOKEN = config.get('validationToken');
// Generate a page access token for your page from the App Dashboard
const PAGE_ACCESS_TOKEN = config.get('pageAccessToken');
// URL where the app is running (include protocol). Used to point to scripts and
// assets located at this address.
const SERVER_URL = config.get('serverURL');


var self = {
  sendImageMessage: (recipientId) => {
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

    self.callSendAPI(messageData);
  },

  sendGifMessage: (recipientId) => {
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

    self.callSendAPI(messageData);
  },

  sendAudioMessage: (recipientId) => {
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
    self.callSendAPI(messageData);
  },

  sendVideoMessage: (recipientId) => {
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

    self.callSendAPI(messageData);
  },

  sendFileMessage: (recipientId) => {
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
    self.callSendAPI(messageData);
  },

  sendTextMessage: (recipientId, messageText, lastMessageID) => {
    var messageData = {
      recipient: {
        id: recipientId
      },
      message: {
        text: messageText,
        metadata: "DEVELOPER_DEFINED_METADATA"
      }
    };

    self.callSendAPI(messageData, lastMessageID);
  },

  sendButtonMessage: (recipientId,buttons,text,lastMessageID) => {
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

    self.callSendAPI(messageData,lastMessageID);
  },

  sendGenericMessage: (recipientId) => {
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

    self.callSendAPI(messageData);
  },

  sendReceiptMessage: (recipientId) => {
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

    self.callSendAPI(messageData);
  },

  sendQuickReply: (recipientId,quickReplies,text,lastMessageID) => {
    var messageData = {
      recipient: {
        id: recipientId
      },
      message: {
        text: text,
        quick_replies: quickReplies
      }
    };

    self.callSendAPI(messageData,lastMessageID);
  },

  sendReadReceipt: (recipientId) => {
    console.log("Sending a read receipt to mark message as seen");

    var messageData = {
      recipient: {
        id: recipientId
      },
      sender_action: "mark_seen"
    };

    self.callSendAPI(messageData);
  },

  sendTypingOn: (recipientId) => {
    console.log("Turning typing indicator on");

    var messageData = {
      recipient: {
        id: recipientId
      },
      sender_action: "typing_on"
    };

    self.callSendAPI(messageData);
  },

  sendTypingOff: (recipientId) => {
    console.log("Turning typing indicator off");

    var messageData = {
      recipient: {
        id: recipientId
      },
      sender_action: "typing_off"
    };

    self.callSendAPI(messageData);
  },

  sendAccountLinking: (recipientId) =>{
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

    self.callSendAPI(messageData);
  },

  callSendAPI: async(messageData,lastMessageID) => {
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

    }, async function (error, response, body) {
      if (!error && response.statusCode == 200) {
        var recipientId = body.recipient_id;
        var messageId = body.message_id;
        var user = await User.getUserByFBID(recipientId);

        console.log(messageData.recipient.id);
        if(!user){
          request({
            uri: 'https://graph.facebook.com/v2.6/'+
            messageData.recipient.id+
            '?fields=first_name,last_name,profile_pic,locale,timezone,gender&access_token='+
            PAGE_ACCESS_TOKEN,
            method: 'GET',
            json: messageData

          }, (err,res,bodyUser) =>{
            console.log("RESPONSE",bodyUser);
            // first_name,last_name,timezone,profile_pic
            User.addUser(
            {
              fbID:recipientId,
              lastMessage:"[]",
              firstName:bodyUser.first_name,
              lastName:bodyUser.last_name,
              timeZone:bodyUser.timezone,
              profilePic:bodyUser.profile_pic,
              takesShifts:true,
            },(error,response)=>{
              if(error){
                console.log("Create",error);
              }else{
                response.lastMessage = text;
                response.save();
              }
            });
          })

          }else{
            user.lastMessage = lastMessageID;
            user.save();
          }

        if (messageId) {
          // console.log("Successfully sent message with id %s to recipient %s",
            // messageId, recipientId);
        } else {
        // console.log("Successfully called Send API for recipient %s",
          // recipientId);
        }
      }
    })
  },
}

module.exports = self;
