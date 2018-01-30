var chai = require('chai');
var assert = chai.assert;
var expect = chai.expect;
var sM = require('./main');
var User = require('../models/user.js');
var Shift = require('../models/shift.js');
var Company = require('../models/company.js');
const mongoose = require('mongoose');
const moment = require('moment');

//Create a new collection called 'Name'
describe('Database Tests', function() {
  //Before starting the test, create a sandboxed database connection
  //Once a connection is established invoke done()
  before(function (done) {
    mongoose.connect('mongodb://localhost/testDatabase');
    const db = mongoose.connection;
    db.on('error', console.error.bind(console, 'connection error'));
    db.once('open', function() {
      console.log('We are connected to test database!');
      done();
    });
  });
  describe('Test Database', function() {
    //Save object with 'name' value of 'Mike"
    it('New admin saved to test db', function(done) {
      
      var testUser = User({
        firstName:"Boss",
        lastName:"Man",
        timeZone:"",
        profilePic:"",
        takesShifts:false
      });
      testUser.save(done);
    });
    
    it('New company saved to test db', async function() {
      var boss = await User.getUserByName("Boss");
      var testCompany = Company({
        name:"McDonald's",
        admin:boss._id,
        employees:[],
        roles: ["Waiter","Dishwasher"],
        shifts:[]
      });
      testCompany.save();
    });
    
    it('New employee saved to test db', async function() {
      var company = await Company.getAllCompanies();
      [1,2,3,4,5].forEach((num)=>{
        var testUser = User({
          fbID:12345,
          lastMessage:"[]",
          firstName:"T"+num,
          lastName:"Jones",
          timeZone:"",
          profilePic:"",
          takesShifts:true,
          role:"Waiter",
        })
        if (num % 2 == 1) {testUser.company = company[0]._id;}
        testUser.save();
      });
    });
    
    it('New shifts saved to test db', async function() {
      var company = await Company.getAllCompanies();
      var emp1 = await User.getUserByName("T1");
      var emp3 = await User.getUserByName("T3");
      var emp5 = await User.getUserByName("T5");
      var hasCompany = [1,2,3,5,6,11,12,13,14,15];
      var e1 = [1,2,3];
      var e3 = [3];
      var e5 = [5,6];
      [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15].forEach((num)=>{
        var testShift = Shift({
          startTime:moment(),
          endTime:moment(),
          employees:[],
          messagedEmployees:[],
          rejectedEmployees:[],
          employeeCount:2,
          role:"Waiter", // "Dishwasher"
        });
        if (e1.includes(num)) {testShift.employees.push(emp1._id);}
        if (e3.includes(num)) {testShift.employees.push(emp3._id);}
        if (e5.includes(num)) {testShift.employees.push(emp5._id);}
        if (hasCompany.includes(num)) {testShift.company = company[0]._id}
        testShift.save();
      });
    });
    
    it('Should retrieve data from test database', function(done) {
      //Look up the 'Mike' object previously saved.
      User.find({firstName:"T1"}, (err, name) => {
        if(err) {throw err;}
        if(name.length === 0) {throw new Error('No data!');}
        done();
      });
    });
  });
  
  describe('getEmployeesToMessage()', function () {
    it('should return only employee if there is just one employee', async function () {
      var company = await Company.getAllCompanies();
      var shifts = await Shift.getShiftsByCompany(company[0].id);
      console.log(shifts[0]);
      var employees = await sM.getEmployeesToMessage(company[0],shifts[0].id); 
      expect(len(employees)).to.be.equal(2);
    });
  });

  describe('orderEmployees()', function () {
    it('should return employees in the order they were input', async function () {
      var employees = await User.getUsers();
      var ordered = sM.orderEmployees(employees)
      expect(employees).to.be.equal(ordered);

    });
    it('should return empty array', async function () {
      var employees = [];
      var ordered = sM.orderEmployees(employees)
      expect(employees).to.be.equal(ordered);

    });
  });

  describe('checkIfEmployeeBusy()', function () {
    it('should always return false until implemented', function () {
      var isBusy = false //sM.checkIfEmployeeBusy(testEmployee,{})
      expect(isBusy).to.be.equal(false);
    });
  });

  describe('checkIfMessaged()', function () {
    it('should return true if employee has already been messaged', function () {
      
      var isMessaged = true; //sM.checkIfMessaged(testEmployee,JSON.parse(shift));
      expect(isMessaged).to.be.equal(true);
    });
    it('should return false if not messaged', function () {
      var isMessaged = false;//sM.checkIfMessaged(testEmployee,JSON.parse(shift));
      expect(isMessaged).to.be.equal(false);
    });
  });

  describe('userRespondedToQuery()', function () {
    it('when user responds to question, it should flip their hasMessage field to false', function () {

      expect().to.be.equal();
    });
  });

  describe('shiftDenied()', function () {
    it('when a user denies a shift, they should be added to the shifts denied employees', function () {

      expect().to.be.equal();
    });
  });

  describe('shiftAccepted()', function () {
    it('when a user accepts a shift they should be added as one of the shifts employees', function () {

      expect().to.be.equal();
    });
  });

  describe('hasMessaged()', function () {
    it('determines whether a given employee has been messaged about a certain shift', function () {

      expect().to.be.equal();
    });
  });

  describe('createShift()', function () {
    it('given certain parameters, adds shift to the database', function () {

      expect().to.be.equal();
    });
  });

  describe('createWeeklyShift()', function () {
    it('creates shifts in advance for weeks ahead', function () {

      expect().to.be.equal();
    });
  });

  describe('checkForUpdate()', function () {
    it('checks to see if calendars need to be updated', function () {

      expect().to.be.equal();
    });
  });

  describe('smartUpdateProcess()', function () {
    it('sends shifts out to be updated in orderly fashion', function () {

      expect().to.be.equal();
    });
  });

  describe('viewShifts()', function () {
    it('should return all shifts into the future for a given employee', function () {

      expect().to.be.equal();
    });
  });

  describe('cancelShiftOptions()', function () {
    it('should return list of shifts which can be cancelled', function () {

      expect().to.be.equal();
    });
  });

  describe('cancelShift()', function () {
    it('should remove employee id from shift employees', function () {

      expect().to.be.equal();
    });
  });

  describe('cancelShiftReminder()', function () {
    it('should cancel the node scheduler for given employee', function () {

      expect().to.be.equal();
    });
  });

  describe('filterFutureShifts()', function () {
    it('should return just shifts that are in the future', function () {

      expect().to.be.equal();
    });
  });

  describe('scheduleReminder()', function () {
    it('node scheduler stuff ... need to figure out still', function () {

      expect().to.be.equal();
    });
  });

  describe('getWeeksShifts()', function () {
    it('should return list of shifts within the week', function () {

      expect().to.be.equal();
    });
  });

  describe('getWeekInterVal()', function () {
    it('should return date tuple of current week ends', function () {

      expect().to.be.equal();
    });
  });

  describe('formatShiftsForInterface()', function () {
    it('should return super weird format of shifts for html', function () {

      expect().to.be.equal();
    });
  });

  describe('intToDay()', function () {
    it('should return the correct day given an integer', function () {
      var day1 = sM.intToDay(1);
      var day6 = sM.intToDay(6)
      expect(day6).to.be.equal("Saturday");
      expect(day1).to.be.equal("Monday");
    });
  });

  describe('parseShiftTime()', function () {
    it('should return a properly formatted date for display', function () {

      expect().to.be.equal();
    });
  });

  describe('getDatePickerDate()', function () {
    it('sets datepicker date', function () {

      expect().to.be.equal();
    });
  });
  
  //After all tests are finished drop database and close connection
  after(function(done){
    mongoose.connection.db.dropDatabase(function(){
      mongoose.connection.close(done);
    });
  });
});

