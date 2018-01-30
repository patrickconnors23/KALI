var config = require('config');
var express = require('express');
var router = express.Router();
var mAPI = require('../messengerAPI/controller')
var shiftManagerAPI = require('../shiftManagerAPI/main');
var schedule = require('node-schedule');
const moment = require('moment');
const nodemailer = require("nodemailer");
var smtpTransport = require('nodemailer-smtp-transport');
// var mailInfo = require('../config/mail.json');
var randomNumber = require('random-number');
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
	res.redirect('/signin');
}

module.exports = function(passport){

	router.get('/',(req,res)=>{
		res.render("splash",{});
	});

  router.get('/login/facebook',
    passport.authenticate('facebook', { scope : ['email','user_friends', 'publish_actions'] }
  ));

  // handle the callback after facebook has authenticated the user
  router.get('/login/facebook/callback',
    passport.authenticate('facebook', {
      successRedirect : '/home',
      failureRedirect : '/signin'
    })
  );

  router.get('/signin', async (req, res) => {
		res.render('index', {});
	});

	// router.get('/update', (req,res)=>{
	// 	shiftManagerAPI.checkForUpdate();
	// 	res.json({});
	// });

  router.get('/home',async (req,res) => {
		shiftManagerAPI.checkForUpdate();

		try {
			var userCompany = await Company.getCompanyByAdmin(req.user._id);
		} catch (e) {
			console.log(e);
		}

		if (userCompany == null){
			res.redirect('/personalInfo');
		}

		try {
			var shifts = await Shift.getShiftsByCompany(userCompany._id);
		} catch (e) {
			console.log(e);
		}try {
			var weekShifts = await shiftManagerAPI.getWeeksShifts(shifts);
		} catch (e) {
			console.log(e);
		}try {
			var employees = await User.getUserByCompany(userCompany._id);
		} catch (e) {
			console.log(e);
		}

		const weekInterval = shiftManagerAPI.getWeekInterVal();

		const formattedShifts = shiftManagerAPI.formatShiftsForInterface(weekShifts,weekInterval);

		const dateForDatePicker = shiftManagerAPI.getDatePickerDate();

		res.render('home', {
			hasCompany:true,
			company:userCompany,
			shiftDays:formattedShifts,
			employees:employees,
			weekInterval:weekInterval,
			roles:userCompany.roles,
			num:3.75,
			datePickerDate:dateForDatePicker,
		});
  });

	// renders the personal info page
	router.get('/personalInfo',(req,res) => {
		res.render('personalInfoForm',{});
	});

	// receives personal info and then renders company info form
	// needs to save personal info
	router.post('/personalInfo',(req,res) => {
		const data = req.body;
		var user = req.user;

		if (data.email != data.emailConfirm) {
			res.redirect('/personalInfo');
		} else if (data.password != data.passwordConfirm) {
			res.redirect('/personalInfo');
		} else if (data.email == "") {
			res.redirect('/personalInfo');
		} else if (data.firstName == "") {
			res.redirect('/personalInfo');
		} else if (data.lastName == "") {
			res.redirect('/personalInfo');
		} else if (data.password == "") {
			res.redirect('/personalInfo');
		}

		user.email = req.body.email;
		user.firstName = req.body.firstName;
		user.lastName = req.body.lastName;
		user.takesShifts = false;
		user.save();
		res.redirect('/createCompany');
	})

	router.get('/createCompany', (req,res) => {
		res.render('companyInfoForm',{});
	})

  router.post('/createCompany', (req,res) => {
		var data = req.body;

		if (data.employeeCount == "tiny") {
			data.employeeCount = 5;
		} else if (data.employeeCount == "small") {
			data.employeeCount = 15;
		} else if (data.employeeCount == "medium") {
			data.employeeCount = 35;
		} else {
			data.employeeCount = 75;
		}

		var options = {
		  min:  10000,
			max:  99999,
			integer: true
		}
		var secretCode = String(randomNumber(options));

		const newCompany = {
			name:data.company,
			industry:data.industry,
			admin:req.user._id,
			employeeCount: data.employeeCount,
			secretCode:secretCode
		};

		Company.addCompany(newCompany,(error,response)=>{
			if(error){
				console.log(error,"ERRRROR");
			} else {
				res.redirect('/companyRoles');
			}
		})
  });

	router.get('/companyRoles', (req,res) => {
		res.render('companyRolesForm',{});
	});

	router.post('/companyRoles',async (req,res) => {
		const data = req.body;

		try {
			var userCompany = await Company.getCompanyByAdmin(req.user._id);
		} catch (e) {
			console.log(e);
		}

		Object.keys(data).forEach(key => {
				if (!userCompany.roles.includes(data[key])) {
					userCompany.roles.push(data[key]);
				}
		});

		userCompany.save();

		res.redirect('/home');
	});

	// creates a new shift
  router.post('/createShift',async(req,res) => {
    var hasCompany = false;
    const data = req.body;
    const user = req.user._id;
    shiftManagerAPI.createShift(user,data);
    res.redirect('/home');
  });

	router.post('/invite',async(req,res) => {
		try {
			var company = await Company.getCompanyByAdmin(req.user._id);
		} catch (e) {
			console.log(e);
		}
		var smtpTransport = nodemailer.createTransport({
		    service: "gmail",
		    host: "smtp.gmail.com",
		    auth: {
		        user: "hikalibot@gmail.com",
		        pass: "7jdbj4D8l"
		    }
		});

		var toField = []
		// add email addresses to List
		Object.keys(req.body).forEach(key => {
			if (req.body[key] != "") {
				toField.push(req.body[key]);
			}
		});

		var subjectLine = req.user.firstName+" "+req.user.lastName+" from "
			+company.name+" has invited you to join Kali"

		var mailOptions={
		   to : toField,
		   subject : subjectLine,
		   text : "Come Join Kali: http://m.me/HiKaliBot. Your invite code is "+company.secretCode
		};

		smtpTransport.sendMail(mailOptions, function(error, response){
			if(error){
				res.end("error");
			}else{
				res.end("sent");
			}
		});

		res.redirect('/home');
	});

  return router
}
