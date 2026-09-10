const express = require('express');
const router = express.Router();
const { createContact, getAllContacts } = require('../controllers/contactController');

router.post('/', createContact);
router.get('/all', getAllContacts);

module.exports = router;
