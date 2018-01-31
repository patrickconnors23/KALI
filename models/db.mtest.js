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
