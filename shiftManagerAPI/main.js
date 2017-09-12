const processAPI = require('../messengerAPI/processInput');
const sendAPI = require('../messengerAPI/send');
var User = require('../models/user.js');
var Shift = require('../models/shift.js');
var Company = require('../models/company.js');
const moment = require('moment');
var schedule = require('node-schedule');

var self = {
  sendMessages: (company,shift)=>{
    // console.log(shift);
    console.log("Ripped a message send",company.name,shift);
    var fmtTimes = self.parseShiftTime(shift.startTime,shift.endTime);
    const context = {company:company.name,date:fmtTimes.date,startTime:fmtTimes.startTime,endTime:fmtTimes.endTime,shiftID:shift._id};

    // get all users associated with the company
    User.find({company:company._id},(error,employees)=>{
      // total number of employees needed
      var shiftSpots = shift.employeeCount;

      // init messsaged vars
      var messagedInit = 0;
      var deniedInit = 0;

      // set number of employees messaged in the past
      if (shift.messagedEmployees != null) {
        messagedInit = shift.messagedEmployees.length;
      }
      if (shift.rejectedEmployees != null) {
        deniedInit = shift.rejectedEmployees.length;
      }

      // check how many people have accepted plus messages are out there
      var employeesMessaged = messagedInit - deniedInit;

      // ordered list of employees

      // iterate through list of employees and message them
      employees.forEach((employee)=>{
        console.log("EMPLOYEE");
        if (shift.messagedEmployees != null && shift.messagedEmployees.length > 0) {
          console.log("have employees");
          var alreadyMessaged = false;
          var counter = 0
          // console.log("HIT not null");
          shift.messagedEmployees.forEach((id)=>{
            counter++;
            if (id.toString() == employee._id) {
              console.log("FOUND MESSAGED WORKER");
              alreadyMessaged = true;
            }
            if (counter == shift.messagedEmployees.length) {
              // console.log("RETURNING",alreadyMessaged);
              if (!alreadyMessaged) {
                // console.log("MESSAGING FROM HASMESSAGED");
                if(employeesMessaged < shiftSpots){
                  employeesMessaged++;
                  shift.messagedEmployees.push(employee._id);
                  shift.save();
                  processAPI.queryShiftProcess(context,employee.fbID);
                }
              }
            }
          })

        } else {
          console.log("HIT NEW BRANCH",employeesMessaged,shiftSpots)
          if(employeesMessaged < shiftSpots){
            employeesMessaged++;
            shift.messagedEmployees.push(employee._id);
            shift.save();
            processAPI.queryShiftProcess(context,employee.fbID);
          }
        }
      })
    })
  },

  shiftDenied: (shiftID,userMessengerID) => {
    Shift.findOne({_id:shiftID},(error,shift) => {
      User.findOne({fbID:userMessengerID},(error,user) => {
        Company.findOne({_id:shift.company},(error,company) => {
          shift.rejectedEmployees.push(user._id);
          shift.save();
          self.sendMessages(company,shift);
        })
      })
    })
  },

  shiftAccepted: (shiftID,senderID) => {
    Shift.findOne({_id:shiftID},(error,shift)=>{
      User.findOne({fbID:senderID},(error,user)=>{
        Company.findOne({_id:shift.company},(error,company) => {
          var fmtTimes = self.parseShiftTime(shift.startTime,shift.endTime);
          const context = {company:company.name,date:fmtTimes.date,startTime:fmtTimes.startTime,endTime:fmtTimes.endTime,shiftID:shift._id};
          self.scheduleReminder(context,shift.startTime,user.fbID);
          shift.employees.push(user._id);
          shift.save();
        })
      })
    })
  },

  hasMessaged: async(employeeID,messagedList) => {
    console.log("HIT HAS MESSAGED");
    const formattedID = employeeID.toString();
    var alreadyMessaged = false;
    var counter = 0
    messagedList.forEach((id)=>{
      counter++;
      if (id.toString() == formattedID) {
        console.log("FOUND MESSAGED WORKER");
        alreadyMessaged = true;
      }
      if (counter == messagedList.length) {
        console.log("RETURNING",alreadyMessaged);
        return alreadyMessaged;
      }
    })
  },

  createShift: (userID,formData) => {
    Company.findOne({admin:userID},(error,company) => {

      var startDate = formData.bootDate[0];
      var endDate = formData.bootDate[1];

      // create shift object
      const newShift = {
        employeeCount:formData.workersCount,
        startTime:moment(startDate),
        endTime:moment(endDate),
        company:company._id
      };

      Shift.create(newShift,(error,response)=>{
        if (error){
          console.log("error");
        } else {
          console.log("should send");
          self.sendMessages(company,response);
          self.createWeeklyShift(newShift);
        }
      })
      // console.log("test");
    })
  },

  // recurseively create shifts into the future
  createWeeklyShift: (shift) => {
    var counter = 0;
    for (var i = 0;i < 200;i++){
      counter++;
      var newShiftStart = moment(shift.startTime);
      var newShiftEnd = moment(shift.endTime);
      newShiftStart.add(counter,"weeks");
      newShiftEnd.add(counter,'weeks');
      var newShift = {
        employeeCount:shift.employeeCount,
        startTime:newShiftStart,
        endTime:newShiftEnd,
        company:shift.company,
      };
      Shift.create(newShift,(error,response)=>{
        if (error){
          console.log("error");
        } else {
          console.log("should send",response);
        }
      })
    }
  },

  // check to see if we need to send a message out
  // hardcoded time that we should start looking for workers, will change
  // currently two weeks
  checkForUpdate: () => {
    Shift.find({},(error,shifts)=>{
      var futureShifts = self.filterShifts(shifts);
      var currentDate = moment();
      futureShifts.forEach((shift)=>{
        if (currentDate.diff(shift.startTime,'weeks') > -2) {
          console.log("SHIFT",shift.company);
          Company.findOne({_id:shift.company},(error,company) => {
            console.log("COMPANY",company)
            self.sendMessages(company,shift);
          })
        }
      })
    })
  },

  // return future shifts for a user
  viewShifts: (messengerID) => {
    User.findOne({fbID:messengerID},(error,user) => {
        console.log("USER",user);
      Shift.find({employees:user._id},async(error,shifts) => {
        if(shifts != null) {
          var message = "I found your upcoming shifts: \n\n";
          var counter = 0;
          var futureShifts = await self.filterShifts(shifts);
          if (futureShifts.length > 0){
            futureShifts.forEach((shift)=>{
              var fmtTimes = self.parseShiftTime(shift.startTime,shift.endTime);

              // add shift to message
              message += ("➡️ "+fmtTimes.date+
              " from "+
              fmtTimes.startTime+
              " to "+
              fmtTimes.endTime+
              "\n\n");
              counter++;

              if (counter == futureShifts.length) {
                sendAPI.sendTextMessage(messengerID,message);
              }
            })
          } else{
            sendAPI.sendTextMessage(messengerID,"Looks like your not signed up for any shifts.");
          }


        } else {
          sendAPI.sendTextMessage(messengerID,"Looks like you don't have any shifts.")
        }
      })
    })
  },

  cancelShiftOptions: (messengerID) => {
    User.findOne({fbID:messengerID},(error,user) => {
        console.log("USER",user);
      Shift.find({employees:user._id},async(error,shifts) => {
        if(shifts != null) {
          var message = "Which shift would you like to cancel?";
          var quickReplies = [];
          var counter = 0;
          var futureShifts = await self.filterShifts(shifts);
          if (futureShifts.length != 0) {
            // iterate through shifts
            futureShifts.forEach((shift)=>{
              console.log("FUTURE",shift);
              var fmtTimes = self.parseShiftTime(shift.startTime,shift.endTime);
              quickReplies.push(
                {
                  "content_type":"text",
                  "title":fmtTimes.date,
                  "payload":"CANCEL_SHIFT_ID:"+shift._id
                }
              );
              counter++;
              if (counter == futureShifts.length) {
                sendAPI.sendQuickReply(messengerID,quickReplies,message);
              }
            })
          } else {
            sendAPI.sendTextMessage(messengerID,"Looks like you don't have any shifts scheduled.")
          }

        } else {
          sendAPI.sendTextMessage(messengerID,"Looks like you don't have any shifts scheduled.")
        }
      })
    })
  },

  cancelShift: (shiftID,messengerID) => {
    Shift.findOne({_id:shiftID},(error,shift)=>{
      User.findOne({fbID:messengerID},(error,user)=>{
        Company.findOne({_id:shift.company},(error,company)=>{
          var newEmployees = shift.employees.filter((employee)=>{
            return (employee.toString() != user._id.toString());
          })
          shift.employees = newEmployees;
          shift.rejectedEmployees.push(user._id);
          shift.save();
          self.sendMessages(company,shift);
          self.cancelShiftReminder(shiftID,messengerID);
          console.log("MATCH",shift.employees,user._id,newEmployees);
        })
      })
    })
  },

  cancelShiftReminder: (shiftID,messengerID) => {
    var my_job = schedule.scheduledJobs[shiftID+'/'+messengerID];
    if (my_job) {
      my_job.cancel();
    } else {
      console.log("JOB UNDEFINED");
    }
  },

  // return only shifts that are in the future
  filterShifts: (shifts) => {
    var futureShifts = shifts.filter((shift)=>{
      const today = moment();
      return (today.diff(shift.startTime,'seconds') < 0);
    });
    return futureShifts;
  },

  scheduleReminder: (context,startTime,messengerID) => {
    // const context = {company:company.name,date:fmtTimes.date,startTime:fmtTimes.startTime,endTime:fmtTimes.endTime,shiftID:shift._id};
    var jobName = context.shiftID+'/'+messengerID;
    var date = moment(startTime);
    console.log('init',date,date.toDate());
    var sendDate = date.subtract(2,'h');
    console.log("sennnnndnddd",sendDate,sendDate.toDate());
    var formattedSendDate = new Date(
      sendDate.year(),
      sendDate.month(),
      sendDate.date(),
      sendDate.hours(),
      sendDate.minutes()
    );
    console.log("sseendfdd",formattedSendDate);
    var j = schedule.scheduleJob(jobName,formattedSendDate, function(){
      processAPI.shiftReminderProces(context,messengerID);
    });
  },

  parseShiftTime: (startTime,endTime) => {
    var formattedDate = moment(startTime).format("dddd, M/DD");
    var formattedStart = moment(startTime).format("h:mm a");
    var formattedEnd = moment(endTime).format("h:mm a");
    return {date:formattedDate,startTime:formattedStart,endTime:formattedEnd};
  }
}

module.exports = self;
