var mongoose = require('mongoose');
db = require('./mong');
var graph = require('fbgraph');
var FB = require('fb');
var request = require('request-promise');

var Schema = mongoose.Schema;

var companySchema = mongoose.Schema({
  name: String,
  admin: {type: Schema.Types.ObjectId, ref: 'User'},
  employees: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  secretCode: String,
  shifts: [{type: Schema.Types.ObjectId, ref: 'Shift'}]
});

var Company = module.exports = db.model('Company',companySchema);

module.exports.getCompanies = function (callback, limit) {
    Company.find(callback).limit(limit);
};

module.exports.getCompanyById = function (id,callback) {
  Company.findById(id, callback);
};

module.exports.getCompanyByAdmin = function async(id,callback) {
  var query = {admin:id};
  Company.findOne(query, callback);
};

module.exports.addCompany = function (company, callback) {
    Company.create(company,callback);
};
