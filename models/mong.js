var mongoose = require('mongoose');

//DEVELOPMENT
// mongoose.connect('mongodb://localhost/messenger');

//PRODUCTION
var uri = 'mongodb://heroku_rbsxvd96:lp4utjrv73set8djgtrh1okfml@ds163612.mlab.com:63612/heroku_rbsxvd96';
mongoose.connect(uri);

var db = module.exports = mongoose.connection;
