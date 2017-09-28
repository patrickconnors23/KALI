var mongoose = require('mongoose');
db = require('./mong');
var graph = require('fbgraph');
var FB = require('fb');
var request = require('request-promise');

var Schema = mongoose.Schema;

var companySchema = mongoose.Schema({

  // company name
  name: String,

  // user who has control over this company account
  // should add support for multiple users
  admin: {type: Schema.Types.ObjectId, ref: 'User'},

  // employees whose messenger accounts are connected to this company
  employees: [{ type: Schema.Types.ObjectId, ref: 'User' }],

  // employee classes, used to determine who the employer needs
  roles: [String],

  // industry that the company is associated with
  industry: String,

  // qualitative field that describes roughly how big a company is
  estimatedEmployeeCount: Number,

  // code used to authenticate user to this company
  secretCode: String,

  // shifts associated with the company
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

module.exports.getEmployees = (companyID) => {

  function shift(employeeID) {
    return Shift.find({employees:employeeID}).exec()
      .then((shifts) => {
        console.log(shifts,employeeID,"IN QUERYYYYYY")
        return shifts;
      })
      .catch((err) => {
        return 'error occured';
      });
  };

  async function loop(employees) {
      var holder = [];
      for (let i = 0; i < employees.length; i++) {
          // await new Promise(resolve => setTimeout(resolve, 1000));
          const test = await shift(employees[i]._id);
          console.log(test,"TEEEESTsadfdsafsd");
          employees[i].shifts = test;
          employees[i].save();
          // console.log(employees[i],"THIS IS HERE");
          holder.push(employees[i]);
      }
      return holder;
  };

  return User.find({company:companyID}).exec()
    .then(async(employees) => {
      const test = await loop(employees);
      // console.log(test,"The real deal");
      return employees;
    })
    .catch((err) => {
      return 'error occured';
    });
};
