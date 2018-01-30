var mongoose = require('mongoose');
db = require('./mong');
var Company = require('./company');

var Schema = mongoose.Schema;


var userSchema = mongoose.Schema({
  // messenger ID would be a more accurate name
  fbID:{
    type:String,
  },
  // first_name,last_name,timezone,profile_pic
  firstName:String,
  lastName:String,
  timeZone:String,
  profilePic:String,
  lastMessage:{
    type:String,
  },
  fb: {
    id: String,
    access_token: String,
    zip: String,
    phone: String,
    firstName: String,
    lastName: String,
    email: String,
    recentPosts:Object,
    pagePosts:Object,
    pageInfo:Object
  },
  hasMessage: Boolean,
  company: { type: Schema.Types.ObjectId, ref: 'Company' }
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
