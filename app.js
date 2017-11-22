/* jshint node: true, devel: true */
'use strict';

const
  bodyParser = require('body-parser'),
  config = require('config'),
  crypto = require('crypto'),
  express = require('express'),
  // nodemailer = require("nodemailer"),
  https = require('https'),
  request = require('request');

var cookieParser = require('cookie-parser');
var cookieSession = require('cookie-session')

require('dotenv').config();

var app = express();
var authConfig = require('./config.js').get(process.env.NODE_ENV);
var mAPI = require('./messengerAPI/controller.js');
app.set('port', process.env.PORT || 7000);
app.set('view engine', 'ejs');
app.use(bodyParser());
app.use(bodyParser.json({ verify: mAPI.verifyRequestSignature }));
app.use(express.static('public'));

var User = require('./models/user.js');
app.use(cookieSession({
  name: 'session',
  keys: ["dsafdfdfs"],
  maxAge: 24 * 60 * 60 * 1000 // 24 hours
}));
var passport = require('passport');
app.use(passport.initialize());
app.use(passport.session());
var initPassport = require('./passport/init');
initPassport(passport);

var routes = require('./routes/index.js')(passport);
var messengerRoutes = require('./routes/messengerRoutes.js')
app.use('/', routes);
app.use('/messenger',messengerRoutes);

// App Secret can be retrieved from the App Dashboard
const APP_SECRET = config.get('appSecret');
// Arbitrary value used to validate a webhook
const VALIDATION_TOKEN = config.get('validationToken');
// Generate a page access token for your page from the App Dashboard
const PAGE_ACCESS_TOKEN = config.get('pageAccessToken');
// URL where the app is running (include protocol). Used to point to scripts and
// assets located at this address.
const SERVER_URL = config.get('serverURL');

if (!(APP_SECRET && VALIDATION_TOKEN && PAGE_ACCESS_TOKEN && SERVER_URL)) {
  console.error("Missing config values");
  process.exit(1);
}
app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
  mAPI.setGreetingText();
});

module.exports = app;
