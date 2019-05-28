const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const sendgrid = require('nodemailer-sendgrid-transport');
const crypto = require('crypto');
const { validationResult } = require('express-validator/check');

const transporter = nodemailer.createTransport(sendgrid({
     auth: {api_key: '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'}
     })
);

const User = require('../models/User');
const isError = require('../middlewares/isError');

exports.getLoginPage = (req, res, next) => {
     res.render('auth/login', {
          pageTitle: 'Login',
          path: '/login',
          oldInput: {email: '', password: ''},
          validationErrors: []
     });
}

exports.postLogin = (req, res, next) => {
     const email = req.body.email;
     const password = req.body.password;
     const errors = validationResult(req);
     if(!errors.isEmpty()) {
          // req.flash('message', errors.array()[0].msg);
          console.log(errors.array());
          return res.status(422).render('auth/login', {
               pageTitle: 'Login',
               path: '/login',
               oldInput:{email: email, password: password},
               validationErrors: errors.array()
          });  
     }
     User.findOne({email: email})
          .then(user => {
               if(!user) {
                    req.flash('message', 'User with this email does not exist!');
                    console.log('User does not exist!');
                    return res.status(422).redirect('/login');
           }
               return bcrypt.compare(password, user.password)
                    .then(doMatch => {
                         if(!doMatch) {
                              req.flash('message', 'Invalid email or password!');
                              console.log('Password is incorrect!');
                              return res.redirect('/login');
                         }
                         req.session.isLoggedIn = true;
                         req.session.user = user;
                         req.session.save(err => {
                              console.log(err);
                              console.log('User logged in!');
                              res.redirect('/');
                         });
                    });
          })
          .catch(isError.errorHandler(next)); 
}	
     
exports.postLogout = (req, res, next) => {
     req.session.destroy(err => {
          // console.log(err);
          console.log('User logged out!');
          // res.send('You successfully logged out!');
          res.redirect('/');
     });
}

exports.getSignupPage = (req, res, next) => {
     res.render('auth/signup', {
          pageTitle: 'Signup',
          path: '/signup',
          oldInput: {email: '', password: '', confirmPassword: ''},
          validationErrors: []
     });
}

exports.postSignup = (req, res, next) => {
     const email = req.body.email;
     const password = req.body.password;
     const errors = validationResult(req);
     if(!errors.isEmpty()) {
          // req.flash('message', errors.array()[0].msg);
          console.log(errors.array());
          return res.status(422).render('auth/signup', {
               pageTitle: 'Signup',
               path: '/signup',
               oldInput:{email: email, password: password, confirmPassword: req.body.confirmPassword},
               validationErrors: errors.array()
          });
     }
     User.findOne({email: email})
          .then(user => {
               if(user) {
                    req.flash('message', 'User with this email already exists!');
                    console.log('User already exists!');
                    return res.redirect('/signup');
               }
               bcrypt.hash(password, 12)
                    .then(hashedPassword => {
                         const userObject = new User({
                              email: email,
                              password: hashedPassword,
                              cart: {items: []}
                         });
                         return userObject.save();
                    })
                    .then(result => {
                         console.log('New user created!');
                         res.redirect('/login');
                         return transporter.sendMail({
                              to: email,
                              from: 'shop@shop.com',
                              subject: 'Signup succeeded!',
                              html: '<h2>You have successfully signed up to shop.com!</h2>'
                         });
                    })
                    .then(result => console.log('Confirmation email sent!'))
                    .catch(err => console.log(err));
          })
          .catch(isError.errorHandler(next)); 
}

exports.getResetPasswordPage = (req, res, next) => {
     res.render('auth/reset-password', {
          pageTitle: 'Reset Password',
          path: '/reset-password',
     });
}

exports.postResetPassword = (req, res, next) => {
     crypto.randomBytes(32, (err, buffer) => {
          if(err) {
               console.log(err);
               return res.redirect('/reset-password');
          }
          const token = buffer.toString('hex');
          User.findOne({ email: req.body.email })
               .then(user => {
                    if(!user) {
                         req.flash('message', 'Entered email is incorrect!');
                         console.log('Entered email is incorrect!');
                         return res.redirect('/reset-password');
                    }
                    user.resetToken = token;
                    user.resetTokenExpiration = Date.now() + 3600000;
                    return user.save()
                         .then(result => {
                              req.flash('message', 'Reset password token has been sent to your email address!')
                              res.redirect('/reset-password');
                              return transporter.sendMail({
                                   to: req.body.email,
                                   from: 'shop@shop.com',
                                   subject: 'Reset your password at shop.com',
                                   html: `<p>You have requested a password reset.</p>
                                        <p>Click this <a href="http://localhost:3000/new-password/${ token }">link</a> to reset your password!</p> `
                              });     
                         })
                         .then(result => console.log("Reset email token sent to user's email!"))
                         .catch(isError.errorHandler(next));
               });
     });
}  

exports.getNewPasswordPage = (req, res, next) => {
     const token = req.params.token;
     User.findOne({resetToken: token, resetTokenExpiration: {$gt: Date.now()} })
          .then(user => {
               if(!user) {
                    console.log('User not found!');
                    res.redirect('/reset-password');
               }
               res.render('auth/new-password', {
                    userId: user._id.toString(),
                    passwordToken: token,
                    pageTitle: 'New Password',
                    path: '/new-password'
               });
          })
          .catch(isError.errorHandler(next)); 
}

exports.postNewPassword = (req, res, next) => {
     const newPassword = req.body.password;
     const userId = req.body.userId;
     const token = req.body.passwordToken;
     User.findOne({_id: userId, resetToken: token, resetTokenExpiration: {$gt: Date.now()} })
          .then(user => {
               if(!user) {
                    req.flash('message', 'Your reset password token has expired!');
                    console.log("User's token expired!");
                    return res.redirect('/reset-password');
               }
               return bcrypt.hash(newPassword, 12)
                    .then(hashedNewPassword => {
                         user.password = hashedNewPassword;
                         user.resetToken = undefined;
                         user.resetTokenExpiration = undefined;
                         return user.save();
                    })
                    .then(result => {
                         console.log("User's password has been reset!");
                         res.redirect('/login');
                    })
                    .catch(err => console.log(err));
               })
               .catch(isError.errorHandler(next));
}