var mongoose = require('mongoose');

// DEVELOPMENT
// mongoose.connect('mongodb://localhost/shiftBot');
// mongoose.Promise = global.Promise;

// // PRODUCTION
var uri = 'mongodb://heroku_j7pqr1r7:92qpv9f2g5ucftqnu8a5ob6j85@ds131900.mlab.com:31900/heroku_j7pqr1r7';
mongoose.connect(uri);

var db = module.exports = mongoose.connection;
 
