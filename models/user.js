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
  email:String,

  // facebook id only associated with manager who has logged into Kali via web interface
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
  // tells us whether an employee has an active shift request
  // we don't want to send multiple requests at once
  hasMessage: Boolean,

  // company that user works for
  company: { type: Schema.Types.ObjectId, ref: 'Company' },

  // specifies the user's role within the company
  // this determines which roles the employee can be assigned to
  role: String,

  // determines whether employee signed up via messenger
  takesShifts: Boolean,
});
//

var User = module.exports = db.model('User',userSchema);

module.exports.getUsers = function (callback, limit) {
    User.find(callback).limit(limit);
};

module.exports.getUserById = function (id) {
  return User.findOne({_id:id}).exec()
    .then((user) => {
      return user;
    })
    .catch((err) => {
      return 'error occured';
    });
};

module.exports.getUsersFromArray = function (ids) {
  return User.find({_id:{$in:ids}}).exec()
    .then((users) => {
      return users;
    })
    .catch((err) => {
      return 'error occured';
    });
};

module.exports.getUserByFBID = function (id) {
  return User.findOne({fbID:id}).exec()
    .then((user) => {
      return user;
    })
    .catch((err) => {
      return 'error occured';
    });
};

module.exports.addUser = function (user, callback) {
    User.create(user,callback);
};

module.exports.getUserByCompany = (companyID) => {
  return User.find({company:companyID}).exec()
    .then((employees) => {
      return employees;
    })
    .catch((err) => {
      return 'error occured';
    });
};
