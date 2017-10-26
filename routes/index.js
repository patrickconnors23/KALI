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
		res.render('index', {});
	});

  router.get('/home',async (req,res) => {
		console.log("GOT HERE");
		shiftManagerAPI.checkForUpdate();

		const userCompany = await Company.getCompanyByAdmin(req.user._id);

		if (userCompany == null){
			res.redirect('/createCompany');
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
		const data = req.body;
		const newCompany = {
			name:data.company,
			industry:data.industry,
			admin:req.user._id,
			estimatedEmployeeCount: data.employeeCount
		};
		Company.addCompany(newCompany,(error,response)=>{
			if(error){
				console.log(error);
			} else {
				res.redirect('/companyCode');
			}
		})
  });

	router.get('/companyCode', (req,res) => {
		res.render('secretCodeForm',{});
	})

	router.post('/companyCode',async (req,res) => {
		const data = req.body;
		Company.findOne({admin:req.user._id},(error,userCompany) => {
			userCompany.secretCode = data.secretCode;
			userCompany.roles.push("Any");
			userCompany.save();
			res.redirect('/companyRoles');
		})
	});

	router.get('/companyRoles', (req,res) => {
		res.render('companyRolesForm',{});
	});

	router.post('/companyRoles',async (req,res) => {
		const data = req.body;
		console.log(data);
		Company.findOne({admin:req.user._id},(error,userCompany) => {
			if (data.roles.constructor === Array) {
				data.roles.forEach((role)=>{
					userCompany.roles.push(role);
				})
			} else { userCompany.roles.push(data.roles);}
			userCompany.save();
			console.log(userCompany);
			res.redirect('/home');
		})
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
		console.log(req.user);
		const company = await Company.getCompanyByAdmin(req.user._id);
		console.log(company);
		res.send(company);
	});

  return router
}
