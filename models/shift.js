var mongoose = require('mongoose');
db = require('./mong');
var graph = require('fbgraph');
var FB = require('fb');
var request = require('request-promise');

var Schema = mongoose.Schema;

var shiftSchema = mongoose.Schema({
  // start time of shift, JS date object
  startTime: String,

  // end time of shift, JS date object
  endTime:String,

  // array of employees who are signed up for shift
  employees: [{ type: Schema.Types.ObjectId, ref: 'User' }],

  // employees who have been asked to take shift
  messagedEmployees: [{ type: Schema.Types.ObjectId, ref: 'User' }],

  // employees who rejected shift offer
  rejectedEmployees: [{ type: Schema.Types.ObjectId, ref: 'User' }],

  // number of employees needed for shift
  employeeCount:Number,

  // company associated with shift
  company: { type: Schema.Types.ObjectId, ref: 'Company'}
});

var Shift = module.exports = db.model('Shift',shiftSchema);

module.exports.getShifts = function (callback, limit) {
    Shift.find(callback).limit(limit);
};

module.exports.getShiftById = function (id,callback) {
  Shift.findById(id, callback);
};

module.exports.getShiftByFBID = function (id,callback) {
  var query = {fbID:id};
  Shift.findOne(query, callback);
};

module.exports.addShift = function (shift, callback) {
    Shift.create(shift,callback);
};
