const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const isValid = require('../middlewares/isValid');

router.get('/login', authController.getLoginPage);
router.post('/login', isValid.checkLogin, authController.postLogin);

router.post('/logout', authController.postLogout);

router.get('/signup', authController.getSignupPage);
router.post('/signup', isValid.checkSignup, authController.postSignup);

router.get('/reset-password', authController.getResetPasswordPage);
router.post('/reset-password', authController.postResetPassword);
router.get('/new-password/:token', authController.getNewPasswordPage);
router.post('/new-password', authController.postNewPassword);

module.exports = router;