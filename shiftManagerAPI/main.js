// git test
const sendAPI = require('../messengerAPI/send');
var User = require('../models/user.js');
var Shift = require('../models/shift.js');
var Company = require('../models/company.js');
const moment = require('moment');
var processMOD = require('../messengerAPI/test');
var schedule = require('node-schedule');
// var nodemailer = require("nodemailer");

var self = {

  sendMessages: async(company,shiftID)=>{
    try {
      var realShift = await Shift.getShiftById(shiftID);
    } catch (e) {
      console.log(e);
    }
    // format time object in a readable fashion and set context variables for message
    var fmtTimes = self.parseShiftTime(realShift.startTime,realShift.endTime);
    const context = {company:company.name,date:fmtTimes.date,startTime:fmtTimes.startTime,endTime:fmtTimes.endTime,shiftID:realShift._id};

    // get all users associated with the company
    try {
      var employees = await Company.getEmployees(company._id);
    } catch (e) {
      console.log(e);
    }
    // total number of employees needed
    var shiftSpots = realShift.employeeCount;

    // init messsaged vars
    var messagedInit = 0;
    var deniedInit = 0;

    // set number of employees messaged in the past
    if (realShift.messagedEmployees != null) {
      messagedInit = realShift.messagedEmployees.length;
    }
    if (realShift.rejectedEmployees != null) {
      deniedInit = realShift.rejectedEmployees.length;
    }
    // check how many people have accepted plus messages are out there
    var employeesMessaged = messagedInit - deniedInit;

    // Number of employees that we need to reach out to about this shift
    var employeesNeeded = shiftSpots - employeesMessaged;
    // UPDATE WITH ABOVE FUNCTION ONCE FIXED
    var orderedEmployees = self.orderEmployees(employees,realShift.role);
    // ensure that we only message employees who can work at the time
    var availableEmployees = orderedEmployees.filter((employee)=>{
      return !self.checkIfEmployeeBusy(employee,realShift);
    });

    // make sure we don't send to people who haven't responded to last one
    var canMessage = availableEmployees.filter((employee)=>{
      return !employee.hasMessage;
    });

    // ensure that we haven't messaged this employee about the shift yet
    var unRequestedEmployees = canMessage.filter((employee)=>{
      return !self.checkIfMessaged(employee,realShift);
    });

    var correctRoles = unRequestedEmployees.filter((employee)=>{
      return realShift.role == employee.role;
    })

    var employeesToMessage = correctRoles.slice(0,employeesNeeded);

    processMOD.printD("WORD");

    if (orderedEmployees == []) {
      console.log("Returned No Employees");
    } else {
      // iterate through list of employees and message them
      employeesToMessage.forEach(async(employee)=>{
        // current employee object is read only, need actual doc
        try {
          var writeEmployee = await User.getUserById(employee._id);
        } catch (e) {
          console.log(e);
        }
        writeEmployee.hasMessage = true;
        writeEmployee.save();
        employeesMessaged++;
        realShift.messagedEmployees.push(writeEmployee._id);
        realShift.save();
        processMOD.queryShiftProcess(context,writeEmployee.fbID);
      })
    }
  },

  // sort employees by the number of shifts that they've picked up
  // this makes sure we always pick the best employee for the job
  // need to iterate on this algorithm
  orderEmployees: (employees,role) => {
    return employees;
    var employeeOrder = [];
    // iterate through the employees
    employees.forEach((employee)=>{
      // find all the shifts that the employee has accepted vs denied
      // add a point if they accepted the shift and take one if they denied
      var shiftCounter = 0;
      employee.shifts.forEach((shift)=>{
        shiftCounter++;
      });
      employee.rejectedShifts.forEach((rejectedShift)=>{
        shiftCounter--;
      });

      // if the employee has the necesarry job then add them to the order
      if (employee.role == role || role == "Any") {
        employeeOrder.push([shiftCounter,employee]);
      }
    })

    var sortedEmployeeOrder = employeeOrder.sort((a,b)=>{
      return a[0] - b[0];
    })
    // return our sorted list
    return sortedEmployeeOrder;
  },

  // NEED TO IMPLEMENT THIS
  checkIfEmployeeBusy: (employee,shift) => {
    return false;
  },

  // returns true if employee has been messaged for specific shift
  checkIfMessaged: (employee,shift) => {
    var alreadyMessaged = false;
    shift.messagedEmployees.forEach((id)=>{
      if (id.toString() == employee._id) {
        alreadyMessaged = true;
      }
    })
    return alreadyMessaged;
  },

  userRespondedToQuery: async(messengerID) => {
    try {
      var user = await User.getUserByFBID(messengerID);
    } catch (e) {
      console.log(e);
    }
    user.hasMessage = false;
    user.save();
  },

  shiftDenied: async(shiftID,userMessengerID) => {
    try {
      var shift = await Shift.getShiftById(shiftID);
    } catch (e) {
      console.log(e);
    }try {
      var user = await User.getUserByFBID(userMessengerID);
    } catch (e) {
      console.log(e);
    }try {
      var company = await Company.getCompanyById(shift.company);
    } catch (e) {
      console.log(e);
    }

    shift.rejectedEmployees.push(user._id);
    shift.save();
    self.sendMessages(company,shift._id);

  },

  shiftAccepted: async(shiftID,senderID) => {
    try {
      var shift = await Shift.getShiftById(shiftID);
    } catch (e) {
      console.log(e);
    }try {
      var user = await User.getUserByFBID(senderID);
    } catch (e) {
      console.log(e);
    }try {
      var company = await Company.getCompanyById(shift.company);
    } catch (e) {
      console.log(e);
    }

    var fmtTimes = self.parseShiftTime(shift.startTime,shift.endTime);
    const context = {company:company.name,date:fmtTimes.date,startTime:fmtTimes.startTime,endTime:fmtTimes.endTime,shiftID:shift._id};
    self.scheduleReminder(context,shift.startTime,user.fbID);
    shift.employees.push(user._id);
    shift.save();
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

  createShift: async(userID,formData) => {
    try {
      var company = await Company.getCompanyByAdmin(userID);
    } catch (e) {
      console.log(e);
    }

    var dateRange = formData.daterange.split('-');
    var startDate = dateRange[0].trim();;
    var endDate = dateRange[1].trim();;

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
        self.sendMessages(company,response._id);
        self.createWeeklyShift(newShift);
      }
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
  checkForUpdate: async() => {
    try {
      var shifts = await Shift.getAllShifts();
    } catch (e) {

    }
    // only want to deal with shifts that haven't happened yet
    if (shifts) {
      var futureShifts = self.filterShifts(shifts);
    } else{
      return 0;
    }
    // get the current date to compare shifts to
    var currentDate = moment();
    // iterate through all future shifts
    var sortedFutureShifts = futureShifts.sort((a,b) => {
      return a.startTime - b.startTime;
    });

    // shifts that aren't full
    var needUpdateArray = [];
    var counter = 0;

    sortedFutureShifts.forEach((shift)=>{
      counter++;
      // check if shift is coming up soon
      if (currentDate.diff(shift.startTime,'weeks') > -2) {
        needUpdateArray.push([shift.company,shift]);
        if(counter == sortedFutureShifts.length){
          self.smartUpdateProcess(needUpdateArray);
        }
      } else{
        if(counter == sortedFutureShifts.length){
          self.smartUpdateProcess(needUpdateArray);
        }
      }
    })
  },

  smartUpdateProcess: (updateArray) => {
    const companyMessageManager = (shiftObjectArray) => {
      const timer = (shiftObject,index) => {
            setTimeout(function () {
                self.sendMessages(shiftObject[0],shiftObject[1]._id);
            }, index*1000);
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
        var sortedValues = value.sort((a,b)=>{
          return (moment(a[1].startTime).diff(moment(b[1].startTime)));
        });
        companyMessageManager(sortedValues);
    });
  },

  // return future shifts for a user
  viewShifts: async (messengerID) => {
    try {
      var user = await User.getUserByFBID(messengerID);
    } catch (e) {
      console.log(e);
    }
    try {
      var shifts = await Shift.getUserShifts(user._id);
    } catch (e) {
      console.log(e);
    }

    if(shifts != null) {
      var message = "I found your upcoming shifts: \n\n";
      var counter = 0;
      try {
        var futureShifts = await self.filterShifts(shifts);
      } catch (e) {
        console.log(e);
      }
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
        sendAPI.sendTextMessage(messengerID,"🤷‍Looks like you're not signed up for any shifts. I'll message you 💬 if any become available");
      }


    } else {
      sendAPI.sendTextMessage(messengerID,"🤷‍Looks like you're not signed up for any shifts. I'll message you 💬 if any become available")
    }
  },

  cancelShiftOptions: (messengerID) => {
    User.findOne({fbID:messengerID},(error,user) => {
      Shift.find({employees:user._id},async(error,shifts) => {
        if(shifts != null) {
          var message = "Which shift would you like to cancel 🤔? Remember, cancelling a shift too close to its scheduled time will make it less likely for you to be picked later.";
          var quickReplies = [];
          var counter = 0;
          try {
            var futureShifts = await self.filterShifts(shifts);
          } catch (e) {
            console.log(e);
          }
          
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
            sendAPI.sendTextMessage(messengerID,"I didn't find any shifts to cancel. You're all set 😊")
          }

        } else {
          sendAPI.sendTextMessage(messengerID,"I didn't find any shifts to cancel. You're all set 😊")
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
          self.sendMessages(company,shift._id);
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
    console.log("SCHEDULING JOB");
    var formattedSendDate = new Date(
      sendDate.year(),
      sendDate.month(),
      sendDate.date(),
      sendDate.hours(),
      sendDate.minutes()
    );
    var j = schedule.scheduleJob(jobName,formattedSendDate, function(){
      processMOD.shiftReminderProces(context,messengerID);
    });
  },

  getWeeksShifts: (shifts) => {
    var startDate = new moment();
    var today = startDate.day();
    startDate.hour(0);
    startDate.minute(0);
    startDate.second(0);
    startDate.day(startDate.day() - startDate.day());

    var endDate = new moment();
    endDate.hour(23);
    endDate.minute(59);
    endDate.second(59);
    endDate.day(endDate.day() + 6 - endDate.day());

    var weekShifts = shifts.filter(shift=>{
      return moment(shift.startTime).isBetween(startDate, endDate);;
    })

    return weekShifts;
  },

  getWeekInterVal: () => {
    var startDate = new moment();
    var today = startDate.day();
    startDate.hour(0);
    startDate.minute(0);
    startDate.second(0);
    startDate.day(startDate.day() - startDate.day());

    var endDate = new moment();
    endDate.hour(23);
    endDate.minute(59);
    endDate.second(59);
    endDate.day(endDate.day() + 6 - endDate.day());

    return {
      startDate: startDate.format("MM/DD/YY"),
      endDate:endDate.format("MM/DD/YY")
    }
  },

  formatShiftsForInterface: (shifts,weekInterval) => {
    var formattedShifts = [[],[],[],[],[],[],[]];
    var ret = []
    shifts.forEach((shift)=>{
      var date = moment(shift.startTime);
      var endDate = moment(shift.endTime);
			var shiftTimes = self.parseShiftTime(shift.startTime,shift.endTime);
      var isFilled = shift.employees.length == shift.employeeCount ? "shift-filled" : "shift-open";

      var obj = {
				date:shiftTimes.date,
				startTime:shiftTimes.startTime,
				endTime:shiftTimes.endTime,
				employees:shift.employees,
				employeeCount:shift.employeeCount,
        rawStartDate:date,
        rawEndDate:endDate,
        shiftLength:(endDate.hour()-date.hour())*3.75,
        isFilled: isFilled,
        role:shift.role,
        id:shift.id,
			};
			formattedShifts[date.day()].push(obj);
		});
    var counter = 0;
    var initDay = weekInterval.startDate.split('/')[1];

    var initDate = moment(weekInterval.startDate);

    function nth(n){return["st","nd","rd"][((n+90)%100-10)%10-1]||"th"}

    function addSpacing(shiftDays) {
      shiftDays.forEach(day=>{

        var intervalTracker = [];
        var start;
        var end;
        var cursor;
        for (var i = 0; i < day.shifts.length; i++) {
          start = day.shifts[i].rawStartDate.hour();
          end = day.shifts[i].rawEndDate.hour();

          if (i == 0 && start != 0){
            intervalTracker.push(start);
          }

          if (start!=cursor && i > 0) {
            intervalTracker.push(start-cursor);
          }
          intervalTracker.push(day.shifts[i]);
          cursor = end;
        }
        if (isNaN(end)) {
          intervalTracker.push(24);
        } else {
          if (end != 24) {
            intervalTracker.push(24-end);
          }
        }
        day.shifts = intervalTracker;
      });

      return shiftDays;
    }

    formattedShifts.forEach(day=>{

      day.sort(function(a,b) {
        return a.rawStartDate.diff(b.rawStartDate);
      })
      var dateContainer;
      if (counter > 0){
        dateContainer = initDate.add(1,'d').date();
      }else {
        dateContainer = initDate.date();
      }
      var newObj = {
        date: (dateContainer) + nth(dateContainer),
        shifts:day,
        day: self.intToDay(counter),
        overlap:0,
      };
      ret.push(newObj);
      counter++;
    })
    return addSpacing(ret);


  },

  intToDay: (int) => {
    switch (int) {
      case 0:
        return "Sunday";
        break;
      case 1:
        return "Monday";
        break;
      case 2:
        return "Tuesday";
        break;
      case 3:
        return "Wednesday";
        break;
      case 4:
        return "Thursday";
        break;
      case 5:
        return "Friday";
        break;
      case 6:
        return "Saturday"
        break;
    }
  },

  parseShiftTime: (startTime,endTime) => {
    var formattedDate = moment(startTime).format("dddd, M/DD");
    var formattedStart = moment(startTime).format("h:mm a");
    var formattedEnd = moment(endTime).format("h:mm a");
    return {date:formattedDate,startTime:formattedStart,endTime:formattedEnd};
  },

  getDatePickerDate: () => {
    return moment().format("MM/DD/YYYY") + " 12:00 PM - " + moment().format("MM/DD/YYYY") + " 12:01 PM";
  }
}

module.exports = self;
