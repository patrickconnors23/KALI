// curl -X POST -H "Content-Type: application/json" -d '{
//   "persistent_menu":[
//     {
//       "locale":"default",
//       "composer_input_disabled":false,
//       "call_to_actions":[
//         {
//           "title":"View Shifts",
//           "type":"postback",
//           "payload":"VIEW_SHIFTS"
//         },
//         {
//           "title":"Cancel Shifts",
//           "type":"postback",
//           "payload":"CANCEL_SHIFT"
//         },
//         {
//           "title":"Update Availability",
//           "type":"postback",
//           "payload":"UPDATE_PREFERENCES"
//         }
//       ]
//     },
//     {
//       "locale":"zh_CN",
//       "composer_input_disabled":false
//     }
//   ]
// }' "https://graph.facebook.com/v2.6/me/messenger_profile?access_token=EAAb8mFlZBi80BAIc4xsAxgb9yeLOZCLaYJa7SoB3WG85lmVlpO38O4bJhGcQMBFCXMVRGzP352j2uEyESCT43YgE25zFaX7EM8gfWcB8BiMjRLFzk3v2LzRRPWhuMQIcfzZCldLjcBY5l8MOLcRrM0g5MHPJmpSFk4HxAPgUAZDZD"
