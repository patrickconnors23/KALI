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

module.exports.getAllCompanies = function () {
  return Company.find({}).exec()
    .then((companies) => {
      return companies;
    })
    .catch((err) => {
      return ("THIS ERROR "+err);
    });
}

module.exports.getCompanyById = function (id) {
  return Company.findOne({_id:id}).exec()
    .then((company) => {
      return company;
    })
    .catch((err) => {
      return ("THIS ERROR "+err);
    });
};

module.exports.getCompanyByCode = function (code) {
  return Company.findOne({secretCode:code}).exec()
    .then((company) => {
      return company;
    })
    .catch((err) => {
      return ("THIS ERROR "+err);
    });
};

module.exports.getCompanyByAdmin = (userID) => {
  return Company.findOne({admin:userID}).exec()
    .then(async(company) => {
      return company;
    })
    .catch((err) => {
      return 'THAT ERROR '+err;
    });
},

module.exports.addCompany = function (company, callback) {
    Company.create(company,callback);
};

// return a company's employees with their shifts
module.exports.getEmployees = (companyID) => {

  // return shift given employee
  function shift(employeeID) {
    return Shift.find({employees:employeeID}).exec()
      .then((shifts) => {
        return shifts;
      })
      .catch((err) => {
        return ("error occured "+err);
      });
  };

  function rejectedShifts(employeeID){
    return Shift.find({rejectedEmployees:employeeID}).exec()
      .then((shifts) => {
        return shifts;
      })
      .catch((err) => {
        return ("THIS ERROR "+err);
      });
  };

  // loop through employees and add their shifts
  async function loop(employees) {
      var holder = [];
      for (let i = 0; i < employees.length; i++) {
          try {
            var shifts = await shift(employees[i]._id);
          } catch (e) {
            console.log(e);
          }
          try {
            var rShifts = await rejectedShifts(employees[i]._id);
          } catch (e) {
            console.log(e);
          }
          var employeeObj = {
              _id: employees[i]._id,
              fbID: employees[i].fbID,
              firstName: employees[i].firstName,
              lastName: employees[i].lastName,
              timeZone: employees[i].timeZone,
              profilePic: employees[i].profilePic,
              __v: employees[i].__v,
              company: employees[i].company,
              role: employees[i].role,
              hasMessage: employees[i].hasMessage,
              lastMessage: employees[i].lastMessage,
              shifts: shifts,
              rejectedShifts:rShifts,
          };
          holder.push(employeeObj);
      }
      return holder;
  };

  // query company for employees
  return User.find({company:companyID,takesShifts:true}).exec()
    .then(async(employees) => {
      try {
        var employeesWithShifts = await loop(employees);
      } catch (e) {
        console.log(e);
      }
      return employeesWithShifts;
    })
    .catch((err) => {
      return 'THAT ERROR '+err;
    });
};
