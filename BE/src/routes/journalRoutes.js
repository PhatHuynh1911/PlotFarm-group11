const express = require('express');
const router = express.Router();
const { createJournal, getJournalsByRental, updateJournal, deleteJournal } = require('../controllers/journalController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// Soft auth helper cho route đọc nếu cần
const softAuth = (req, res, next) => {
    const authHeader = req.headers.authorization || '';
    if (authHeader.startsWith('Bearer ')) {
        try {
            const jwt = require('jsonwebtoken');
            req.user = jwt.verify(authHeader.slice(7), process.env.JWT_SECRET || 'plotfarm_jwt_secret_key_2026');
        } catch (e) {}
    }
    next();
};

// Viết nhật ký: Nông dân phụ trách hoặc Quản trị viên
router.post('/', authenticate, authorize('nong_dan', 'quan_tri'), createJournal);
router.patch('/:id', authenticate, authorize('nong_dan', 'quan_tri'), updateJournal);
router.delete('/:id', authenticate, authorize('nong_dan', 'quan_tri'), deleteJournal);

// Xem lịch sử nhật ký của hợp đồng thuê: Người dùng đã đăng nhập hoặc khách hàng
router.get('/rental/:rentalId', softAuth, getJournalsByRental);

module.exports = router;
