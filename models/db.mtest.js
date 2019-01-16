const chai = require('chai');
const expect = chai.expect;
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const User = require('./user.js');
const Shift = require('./shift.js');
const Company = require('./company.js');
const testSchema = new Schema({
  name: { type: String, required: true }
});
//Create a new collection called 'Name'
const Name = mongoose.model('Name', testSchema);
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
    it('Should save new manager to database', function(done) {
      var manager = User({
        fbID:"1234",
        firstName:"Pat",
        lastName:"Connors",
        email:"p@g.com",
        takesShifts:false,
        fb:{
          id:"21345",
          access_token:"klsafjsdks"
        }
      });

      manager.save(done);
    });
    it('Should create new company', async function () {
      var manager = await User.getUserByFBID("1234");
      var company = Company({
        name:"El Jefe's",
        admin:manager._id,
        employees:[],
        roles:['Bartender','Waiter'],
        industry:"Hospitality",
        secretCode:"12345",
        shifts:[],
      });
      company.save();
    });
    it('Should save employees to database', async function() {
      var company = await Company.getCompanyByCode("12345");
      var map = {0:"Bartender",1:"Waiter"};
      for (var i=0;i<10;i++){
        var employee = User({
          fbID:"1234"+i,
          firstName:"Pat"+i,
          lastName:"Connors"+(2*i),
          role:map[i % 2],
          email:"p@g.com",
          takesShifts:true,
          company:company._id
        });
        employee.save();
      }
    });
    it('Should create new shifts without employees',async function () {
      var company = await Company.getCompanyByCode('12345');
      var employees = await User.getUserByCompany(company._id);
      var map = {0:"Bartender",1:"Waiter"};
      for (var i=0;i<4;i++){
        var shift = Shift({
          employees:[],
          employeeCount:3,
          company:company._id,
          role:map[i % 2],
        })
        shift.save();
      }
    });
    it('Should create 3 waiter shifts and assign them to emp1',async function () {
      var company = await Company.getCompanyByCode('12345');
      var employee = await User.getUserByFBID("12340");
      for (var i=0;i<3;i++){
        var shift = Shift({
          employees:[employee._id],
          employeeCount:1,
          company:company._id,
          role:'Bartender',
        });
        shift.save();
      }
      var shifts = await Shift.getUserShifts(employee._id);
      var companyShifts = await Shift.getShiftsByCompany(company._id);
      expect(companyShifts.length).to.equal(7);
      expect(shifts.length).to.equal(3);
    });
    it('Should create new shifts and assign them to existing emps',async function () {
      var company = await Company.getCompanyByCode('12345');
      var employees = await User.getUserByCompany(company._id);
      for (var i=0;i<3;i++){
        var shift = Shift({
          employees:[],
          employeeCount:3,
          company:company._id,
          role:"Bartender",
        })
        shift.save()
      }
    });
    it('Should retrieve data from test database', function(done) {
      //Look up the 'Mike' object previously saved.
      User.find({firstName: 'Pat'}, (err, name) => {
        if(err) {throw err;}
        if(name.length === 0) {throw new Error('No data!');}
        done();
      });
    });
  });
  //After all tests are finished drop database and close connection
  after(function(done){
    mongoose.connection.db.dropDatabase(function(){
      mongoose.connection.close(done);
    });
  });
});
