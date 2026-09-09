const express = require('express');
const router = express.Router();
const rentalController = require('../controllers/rentalController');

// Đảm bảo trong rentalController có các hàm này
router.get('/', rentalController.getAllRentals);
router.post('/', rentalController.createRental);

module.exports = router;