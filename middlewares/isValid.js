const { check, body } = require('express-validator/check');
const User = require('../models/User');

exports.checkSignup = [
     // validation
     check('email')
          .isEmail()
          .withMessage('Please enter valid email address!')
          .custom((value, {req}) => {
               if(value === 'test@test.com') {
                    throw new Error('This email address is forbidden!');
               }
               return true;
          })
          // .custom((value, {err}) => {
          //      return User.findOne({ email: value})
          //           .then(user => {
          //                if(user) {
          //                     return Promise.reject('User with this email already exists!');
          //                }
          //           });
          //      }),
     // sanitization     
     .normalizeEmail({ gmail_remove_dots: false }),
     body('password', 'Please enter a password at least 5 characters long and with only numbers and letters!')
          .trim()
          .isLength({min: 5, max: 20})
          .isAlphanumeric(),
     body('confirmPassword')
          .trim()
          .custom((value, {req}) => {
               if(value !== req.body.password) {
                    throw new Error('Passwords have to match!');
               }
               return true;
          }),
     // callback function
     (req, res, next) => {
          next();
     }
];

exports.checkLogin = [
     // validation
     body('email')
          .isEmail()
          .withMessage('Please enter valid email address!')
          // .custom((value, {err}) => {
          //      return User.findOne({ email: value})
          //           .then(user => {
          //                if(!user) {
          //                     return Promise.reject('User with this email does not exist!');
          //                }
          //           });
          //      }),
     // sanitization     
          .normalizeEmail({ gmail_remove_dots: false }),
     body('password', 'Please enter a password at least 5 characters long and with only numbers and letters!')
          .trim()
          .isLength({min: 5, max: 20})
          .isAlphanumeric(),
     // callback function
     (req, res, next) => {
          next();
     }
];

exports.checkProductValues = [
     body('title')
          .isString()
          .trim()
          .isLength({min: 3, max: 30})
          .withMessage('Please enter product title at least 3 and max 20 characters long!'),
     // body('imageUrl')
     //      .isURL()
     //      .withMessage('Please enter a valid URL for product image!'),
     body('price')
          .isFloat()
          .withMessage('Please enter a valid number!'),
     body('description')
          .trim()
          .isLength({min: 5, max: 400})
          .withMessage('Please enter product description at least 5 characters long!'),
     (req, res, next) => {
          next();
     }
];