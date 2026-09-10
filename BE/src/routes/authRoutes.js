const express = require('express');
const router = express.Router();
const { login, register, getMe, getAdminDashboard } = require('../controllers/authController');

router.post('/login', login);
router.post('/register', register);
router.get('/me', getMe);
router.get('/admin-dashboard', getAdminDashboard);

module.exports = router;
