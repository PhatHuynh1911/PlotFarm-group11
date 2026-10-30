const express = require('express');
const router = express.Router();
const { login, register, forgotPassword, resetPassword, changePassword, getMe, updateMe, getAdminDashboard } = require('../controllers/authController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

router.post('/login', login);
router.post('/register', register);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.patch('/change-password', authenticate, changePassword);
router.get('/me', authenticate, getMe);
router.patch('/me', authenticate, updateMe);
router.put('/me', authenticate, updateMe);
router.get('/admin-dashboard', authenticate, authorize('quan_tri'), getAdminDashboard);

module.exports = router;
