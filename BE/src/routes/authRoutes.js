const express = require('express');
const router = express.Router();
const { login, register, forgotPassword, resetPassword, getMe, updateMe, getAdminDashboard } = require('../controllers/authController');
const { authenticate } = require('../middleware/authMiddleware');

router.post('/login', login);
router.post('/register', register);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/me', authenticate, getMe);
router.patch('/me', authenticate, updateMe);
router.put('/me', authenticate, updateMe);
router.get('/admin-dashboard', getAdminDashboard);

module.exports = router;
