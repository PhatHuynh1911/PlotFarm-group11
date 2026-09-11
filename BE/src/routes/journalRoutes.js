const express = require('express');
const router = express.Router();
const { createJournal, getJournalsByRental, updateJournal } = require('../controllers/journalController');

// Soft auth: Nếu có Bearer token thì giải mã vào req.user
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

router.post('/', softAuth, createJournal);
router.patch('/:id', softAuth, updateJournal);
router.get('/rental/:rentalId', softAuth, getJournalsByRental);

module.exports = router;
