const express = require('express');
const router = express.Router();
const { createJournal, getJournalsByRental } = require('../controllers/journalController');

router.post('/', createJournal);
router.get('/rental/:rentalId', getJournalsByRental);

module.exports = router;
