var config = require('config');
var express = require('express');
var router = express.Router();
var mAPI = require('../messengerAPI/controller')
var processAPI = require('../messengerAPI/processInput');
var shiftManagerAPI = require('../shiftManagerAPI/main');
var schedule = require('node-schedule');
const moment = require('moment');
User = require('../models/user');
Company = require('../models/company');
Shift = require('../models/shift');

var FB = require('fb');

var isAuthenticated = function (req, res, next) {
	// if user is authenticated in the session, call the next() to call the next request handler
	// Passport adds this method to request object. A middleware is allowed to add properties to
	// request and response objects
	if (req.isAuthenticated())
		return next();
	// if the user is not authenticated then redirect him to the login page
	res.redirect('/');
}

module.exports = function(passport){

  router.get('/login/facebook',
    passport.authenticate('facebook', { scope : ['email','user_friends', 'publish_actions'] }
  ));

  // handle the callback after facebook has authenticated the user
  router.get('/login/facebook/callback',
    passport.authenticate('facebook', {
      successRedirect : '/home',
      failureRedirect : '/'
    })
  );

  router.get('/', async (req, res) => {
    console.log(req.user);
		res.render('index', {});
	});

  router.get('/home',async (req,res) => {
    var hasCompany = false;

		//check whether user has added a company
    Company.getCompanyByAdmin(req.user._id,(error,userCompany)=>{
      if (error) {
        console.log(error);
      } else {
				shiftManagerAPI.checkForUpdate();
				// if the user has a company
        if (userCompany!=null){
          hasCompany=true;
					// find the company's shifts
          Shift.find({company:userCompany._id},async(error,shifts)=>{
            var formattedShifts = [];
            var counter = 0;
            if (shifts.length > 0) {
              shifts.forEach((shift)=>{
                var shiftTimes = shiftManagerAPI.parseShiftTime(shift.startTime,shift.endTime);
                User.find({_id:shift.employees},(error,employeeList)=>{
                  counter++;
                  var obj = {
                    date:shiftTimes.date,
                    startTime:shiftTimes.startTime,
                    endTime:shiftTimes.endTime,
                    employees:employeeList,
                    employeeCount:shift.employeeCount
                  };
                  formattedShifts.push(obj);
                  if (counter == shifts.length) {
                    User.find({company:userCompany._id},(error,employees)=>{
                      res.render('home', {
                        hasCompany:hasCompany,
                        company:userCompany,
                        shifts:formattedShifts,
                        employees:employees,
                      });
                    })
                  }
                })
              })
						// if the user has no shifts
            } else {
              console.log("HITITIT");
              res.render('home', {
                hasCompany:hasCompany,
                company:userCompany,
                shifts:[],
                employees:[],
              });
            }

          })
				// if the user has no company
        } else {
          res.render('home', {
            hasCompany:hasCompany,
            company:userCompany,
          });
        }
      }
    })
  });

	// add company to user profile
  router.post('/createCompany',async (req,res) => {
    const data = req.body;
    const newCompany = {name:data.company,secretCode:data.secret,admin:req.user._id};
    Company.addCompany(newCompany,(error,response)=>{
      if(error){
        console.log(error);
      } else {
        res.render('thanks',{});
      }
    })
  });

	// creates a new shift
  router.post('/createShift',async(req,res) => {
    var hasCompany = false;
    const data = req.body;
    console.log("BOOOODY",req.body);
    const user = req.user._id;
    shiftManagerAPI.createShift(user,data);
    res.render('thanks', {});

  })

  return router
}
