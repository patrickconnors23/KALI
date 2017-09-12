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
// }' "https://graph.facebook.com/v2.6/me/messenger_profile?access_token=EAABkBQRZBqQ4BAPZA8jSpCa2FPSB7E5a6ZB2GiKUyUBSEIZBMjEKqHiIPJgpt0zXwgXAiGSXFrGT7IAA1rEJd7MIE54ouaXbHJsUvrWK9fyGZCF3aN8ycvydVUG5GS7R4Sz5WtluWQhAXAHgc7jxCZAG62qAkGgttuC90iFqUqaN3ysmvmqAWN"
