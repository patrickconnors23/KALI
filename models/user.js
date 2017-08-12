var mongoose = require('mongoose');
db = require('./mong');

var Schema = mongoose.Schema;


var userSchema = mongoose.Schema({
  fbID:{
    type:String,
    required:true
  },
  lastMessage:{
    type:String,
  }
});
//

var User = module.exports = db.model('User',userSchema);

module.exports.getUsers = function (callback, limit) {
    User.find(callback).limit(limit);
};

module.exports.getUserById = function (id,callback) {
  User.findById(id, callback);
};

module.exports.getUserByFBID = function (id,callback) {
  var query = {fbID:id};
  User.findOne(query, callback);
};

module.exports.addUser = function (user, callback) {
    User.create(user,callback);
};
