const express = require('express');
const { getPublicStats } = require('../controllers/authController');

const router = express.Router();

// Chỉ chứa số liệu tổng hợp an toàn để hiển thị ở Homepage, không yêu cầu đăng nhập.
router.get('/stats', getPublicStats);

module.exports = router;
