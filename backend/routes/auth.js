const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authMiddleware } = require('../middleware/auth');

router.post('/student-login', authController.studentLogin);
router.post('/faculty-login', authController.facultyLogin);
router.post('/hod-login', authController.hodLogin);
router.post('/student-signup', authController.studentSignup);
router.post('/staff-signup', authController.staffSignup);
router.post('/hod-signup', authController.hodSignup);
router.get('/me', authMiddleware, authController.getMe);
router.post('/refresh-token', authController.refreshToken);
router.post('/logout', authMiddleware, authController.logout);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

module.exports = router;
