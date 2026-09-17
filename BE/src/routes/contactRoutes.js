const express = require('express');
const router = express.Router();
const { createContact, getAllContacts } = require('../controllers/contactController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

router.post('/', createContact);
router.get('/all', authenticate, authorize('quan_tri'), getAllContacts);

module.exports = router;
