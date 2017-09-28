const processAPI = require('../messengerAPI/processInput');
const sendAPI = require('../messengerAPI/send');
var User = require('../models/user.js');
var Shift = require('../models/shift.js');
var Company = require('../models/company.js');
const moment = require('moment');
var schedule = require('node-schedule');

var self = {
  sendMessages: (company,shift)=>{
    console.log("Called send messages");
    // format time object in a readable fashion and set context variables for message
    var fmtTimes = self.parseShiftTime(shift.startTime,shift.endTime);
    const context = {company:company.name,date:fmtTimes.date,startTime:fmtTimes.startTime,endTime:fmtTimes.endTime,shiftID:shift._id};

    // get all users associated with the company
    User.find({company:company._id},async(error,employees)=>{
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
      var orderedEmployees = await self.orderEmployees(employees,shift.role);
      // console.log("REEEETURNING THESE EMPLOOOOYEEES",orderedEmployees);
      // self.orderEmployees2(company._id);
      var employees = await Company.getEmployees(company._id);
      console.log("THIS MIGHT JUST WORK",employees);
      // make sure we have at least one employee to message
      if (orderedEmployees == []) {
        console.log("Returned No Employees");
      } else {

        // iterate through list of employees and message them
        orderedEmployees.forEach((employee)=>{
          // check whether we've messaged anyone yet
          if (shift.messagedEmployees != null && shift.messagedEmployees.length > 0) {
            var alreadyMessaged = false;
            var counter = 0;

            // iterate through list of employees we've messaged
            shift.messagedEmployees.forEach((id)=>{
              counter++;

              //check whether we've messaged this employee
              if (id.toString() == employee._id) {
                alreadyMessaged = true;
              }
              // if we are at the end of the list of messaged employees
              if (counter == shift.messagedEmployees.length) {

                // and we haven't already messaged this employee
                if (!alreadyMessaged) {

                  // if this employee doesn't have an active shift request
                  if (!employee.hasMessage) {

                    // and we haven't messaged too many people
                    if(employeesMessaged < shiftSpots){
                      employee.hasMessage = true;
                      employee.save();
                      employeesMessaged++;
                      console.log(employee);
                      shift.messagedEmployees.push(employee._id);
                      shift.save();
                      processAPI.queryShiftProcess(context,employee.fbID);
                    }
                  }
                }
              }
            })
          // if we haven't messaged anyone yet
          } else {
            if(employeesMessaged < shiftSpots){
              // if this employee doesn't have an active shift request
              if (!employee.hasMessage) {
                employee.hasMessage = true;
                employee.save();
                employeesMessaged++;
                console.log(employee);
                shift.messagedEmployees.push(employee._id);
                shift.save();
                processAPI.queryShiftProcess(context,employee.fbID);
              }
            }
          }
        })
      }
    })
  },

  // sort employees by the number of shifts that they've picked up
  // this makes sure we always pick the best employee for the job
  // need to iterate on this algorithm
  orderEmployees: (employees,role) => {
    var employeeOrder = [];
    // console.log(employees,role);
    // iterate through the employees
    employees.forEach((employee)=>{
      // console.log("ITS NOT THIS FOREACH LOOP")
      // find all the shifts that the employee has accepted vs denied
      Shift.find({employees:employee._id},(error,shifts)=>{
        Shift.find({rejectedEmployees:employee._id},(error,rejectedShifts)=>{

          // add a point if they accepted the shift and take one if they denied
          var shiftCounter = 0;
          shifts.forEach((shift)=>{
            shiftCounter++;
          });
          rejectedShifts.forEach((rejectedShift)=>{
            shiftCounter--;
          });

          // if the employee has the necesarry job then add them to the order
          if (employee.role == role || role == "Any") {
            employeeOrder.push([shiftCounter,employee]);
          }

          // sort the employees by their score
          if (employeeOrder.length == employees.length) {
            var sortedEmployeeOrder = employeeOrder.sort((a,b)=>{
              return a[0] - b[0];
            })
            // console.log(role=="Any",sortedEmployeeOrder,"TEEEEEEEEEST");
            // return our sorted list
            return sortedEmployeeOrder;
          }
        })
      });
    })

    // if something goes wroing just return all da employees
    return employees;
  },

  orderEmployees2: async(company) => {
    var employees = await self.orderEmployees3(company);
    console.log(employees,"PRRRROMMISSSES");
  },

  orderEmployees3: (company) => {
    return User.find({company:company}).exec()
      .then((employees) => {
        console.log(employees,"PROMES IN DA LOOP");
        return employees;
      })
      .catch((err) => {
        return 'error occured';
      });
  },

  userRespondedToQuery: (messengerID) => {
    User.findOne({fbID:messengerID},(error,user)=>{
      user.hasMessage = false;
      user.save();
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

  // check whether a user has been messaged
  hasMessaged: async(employeeID,messagedList) => {
    const formattedID = employeeID.toString();
    var alreadyMessaged = false;
    var counter = 0
    messagedList.forEach((id)=>{
      counter++;
      if (id.toString() == formattedID) {
        alreadyMessaged = true;
      }
      if (counter == messagedList.length) {
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
        company:company._id,
        role:formData.workerType
      };

      Shift.create(newShift,(error,response)=>{
        if (error){
          console.log("error");
        } else {
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
        role:shift.role
      };
      Shift.create(newShift,(error,response)=>{
        if (error){
          console.log("error");
        }
      })
    }
  },

  // check to see if we need to send a message out
  // hardcoded time that we should start looking for workers, will change
  // currently two weeks
  checkForUpdate: () => {
    Shift.find({},(error,shifts)=>{
      // only want to deal with shifts that haven't happened yet
      var futureShifts = self.filterShifts(shifts);
      var currentDate = moment();
      // iterate through all future shifts
      var sortedFutureShifts = futureShifts.sort((a,b) => {
        return a.startTime - b.startTime;
      });

      var needUpdateArray = [];
      var counter = 0;
      sortedFutureShifts.forEach((shift)=>{
        counter++;
        if (currentDate.diff(shift.startTime,'weeks') > -2) {
          Company.findOne({_id:shift.company},(error,company) => {
            needUpdateArray.push([company,shift]);
            if(counter == sortedFutureShifts.length){
              self.smartUpdateProcess(needUpdateArray);
            }
          })
        } else{
          if(counter == sortedFutureShifts.length){
            self.smartUpdateProcess(needUpdateArray);
          }
        }
      })
    })
  },

  smartUpdateProcess: (updateArray) => {
    const companyMessageManager = (shiftObjectArray) => {
      const timer = (shiftObject,index) => {
            setTimeout(function () {
                self.sendMessages(shiftObject[0],shiftObject[1]);
            }, index*500);
        }
      shiftObjectArray.forEach((shiftObject,index)=>{
        timer(shiftObject,index)
      })
    };
    var sendObj = {};
    // sort shifts by company
    updateArray.forEach((shiftSend)=> {
      var objectField = shiftSend[0]._id;
      if(sendObj[objectField]) {
        sendObj[objectField].push(shiftSend);
      } else {
        sendObj[objectField] = [shiftSend];
      }
    });

    Object.entries(sendObj).forEach(([key, value]) => {
        companyMessageManager(value);
    });

    console.log("shiftsssdfdafdssss",sendObj);
  },

  // return future shifts for a user
  viewShifts: (messengerID) => {
    User.findOne({fbID:messengerID},(error,user) => {
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
      Shift.find({employees:user._id},async(error,shifts) => {
        if(shifts != null) {
          var message = "Which shift would you like to cancel?";
          var quickReplies = [];
          var counter = 0;
          var futureShifts = await self.filterShifts(shifts);
          if (futureShifts.length != 0) {
            // iterate through shifts
            futureShifts.forEach((shift)=>{
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
    var jobName = context.shiftID+'/'+messengerID;
    var date = moment(startTime);
    var sendDate = date.subtract(2,'h');
    var formattedSendDate = new Date(
      sendDate.year(),
      sendDate.month(),
      sendDate.date(),
      sendDate.hours(),
      sendDate.minutes()
    );
    var j = schedule.scheduleJob(jobName,formattedSendDate, function(){
      processAPI.shiftReminderProces(context,messengerID);
    });
  },

  parseShiftTime: (startTime,endTime) => {
    var formattedDate = moment(startTime).format("dddd, M/DD");
    var formattedStart = moment(startTime).format("h:mm a");
    var formattedEnd = moment(endTime).format("h:mm a");
    return {date:formattedDate,startTime:formattedStart,endTime:formattedEnd};
  },
}

module.exports = self;
