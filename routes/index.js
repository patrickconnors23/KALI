var config = require('config');
var express = require('express');
var router = express.Router();
var mAPI = require('../messengerAPI/controller')
var processAPI = require('../messengerAPI/processInput');
var shiftManagerAPI = require('../shiftManagerAPI/main');
var schedule = require('node-schedule');
const moment = require('moment');
const nodemailer = require("nodemailer");
var smtpTransport = require('nodemailer-smtp-transport')
var mailInfo = require('../config/mail.json');
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
		res.render('index', {});
	});

  router.get('/home',async (req,res) => {
		shiftManagerAPI.checkForUpdate();
		const userCompany = await Company.getCompanyByAdmin(req.user._id);

		if (userCompany == null){
			res.redirect('/personalInfo');
		}

		const shifts = await Shift.getShiftsByCompany(userCompany._id);
		const employees = await User.getUserByCompany(userCompany._id);
		const formattedShifts = shiftManagerAPI.formatShiftsForInterface(shifts);

		res.render('home', {
			hasCompany:true,
			company:userCompany,
			shifts:formattedShifts,
			employees:employees,
			roles:userCompany.roles
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

		console.log(data);

		const newCompany = {
			name:data.company,
			industry:data.industry,
			admin:req.user._id,
			employeeCount: data.employeeCount,
			secretCode:1234
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

		var userCompany = await Company.getCompanyByAdmin(req.user._id);

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
    res.render('thanks', {});
  });

	router.post('/invite',async(req,res) => {
		const company = await Company.getCompanyByAdmin(req.user._id);
		console.log(mailInfo.emailUsername,mailInfo.emailPassword);
		var smtpTransport = nodemailer.createTransport({
		    service: "gmail",
		    host: "smtp.gmail.com",
		    auth: {
		        user: mailInfo.emailUsername,
		        pass: mailInfo.emailPassword
		    }
		});

		var mailOptions={
		   to : "patrickconnors@college.harvard.edu",
		   subject : "Join Kali",
		   text : "Come Join Kali"
		}
		console.log(mailOptions);

		smtpTransport.sendMail(mailOptions, function(error, response){
			if(error){
				console.log(error);
				res.end("error");
			}else{
				console.log("Message sent: " + response.message);
				res.end("sent");
			}
		});

		res.send(company);
	});

  return router
}