var mongoose = require('mongoose');
db = require('./mong');
var graph = require('fbgraph');
var FB = require('fb');
var request = require('request-promise');
var Company = require('./company.js');
var User = require('./user.js');

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

  //
  // number of employees needed for shift
  employeeCount:Number,

  // company associated with shift
  company: { type: Schema.Types.ObjectId, ref: 'Company'},

  // type of employee that is needed to fill this shift
  role: String,
});

var Shift = module.exports = db.model('Shift',shiftSchema);

module.exports.getShifts = function (callback, limit) {
    Shift.find(callback).limit(limit);
};

module.exports.getShiftById = function (id) {
  return Shift.findOne({_id:id}).exec()
    .then((shift) => {
      return shift;
    })
    .catch((err) => {
      return ("error occured getting shifts"+err);
    });
};

module.exports.getShiftByFBID = function (id,callback) {
  var query = {fbID:id};
  Shift.findOne(query, callback);
};

module.exports.addShift = function (shift, callback) {
    Shift.create(shift,callback);
};

module.exports.getAllShifts = () => {

  async function loop(shifts) {
      var holder = [];
      try {
        var allCompanies = await Company.getAllCompanies();
      } catch (e) {
        console.log(e);
      }
      var companyDic = {};
      allCompanies.forEach((company)=>{
        companyDic[company._id] = company;
      })
      for (let i = 0; i < shifts.length; i++) {
          // await new Promise(resolve => setTimeout(resolve, 1000));
          var shiftObj = {
            startTime: shifts[i].startTime,
            endTime:shifts[i].endTime,
            employees: shifts[i].employees,
            messagedEmployees: shifts[i].messagedEmployees,
            rejectedEmployees: shifts[i].rejectedEmployees,
            employeeCount:shifts[i].employeeCount,
            company: companyDic[shifts[i].company],
            role: shifts[i].role,
            _id:shifts[i]._id
          };
          holder.push(shiftObj);
      }
      return holder;
  };

  return Shift.find({}).exec()
    .then(async(shifts) => {
      let shiftsWithCompanies;
      try {
        shiftsWithCompanies = await loop(shifts);
      } catch (e) {
        console.log(e);
      }
      return shiftsWithCompanies;
    })
    .catch((err) => {
      return ("error occured "+err);
    });

}

module.exports.getUserShifts = (id) => {
  return Shift.find({employees:id}).exec()
    .then((shifts) => {
      console.log(shifts);
      return shifts;
    })
    .catch((err) => {
      return ("error occured getting shifts"+err);
    });
}

module.exports.getShiftsByCompany = (companyID) => {

  function loop(shifts,employees,company) {
      var holder = [];
      var employeeDic = {};
      employees.forEach((emp)=>{
        employeeDic[emp._id] = emp;
      })
      for (let i = 0; i < shifts.length; i++) {
          var shiftEmployees = [];
          shifts[i].employees.forEach((emp)=> {
            shiftEmployees.push(employeeDic[emp]);
          });
          var shiftObj = {
            startTime: shifts[i].startTime,
            endTime:shifts[i].endTime,
            employees:shiftEmployees,
            messagedEmployees: shifts[i].messagedEmployees,
            rejectedEmployees: shifts[i].rejectedEmployees,
            employeeCount:shifts[i].employeeCount,
            company: company,
            role: shifts[i].role,
            id:shifts[i]._id,
          };
          holder.push(shiftObj);
      }
      return holder;
  };

  return Shift.find({company:companyID}).exec()
    .then(async(shifts) => {
      let sCompany,sEmp;
      try {
        sCompany = await Company.getCompanyById(companyID);
      } catch (e) {
        console.log(e);
      }
      try {
        sEmp = await User.getUserByCompany(sCompany._id);
      } catch (e) {
        console.log(e);
      }
      return loop(shifts,sEmp,sCompany);
    })
    .catch((err) => {
      return ("error occured "+err);
    });

}
