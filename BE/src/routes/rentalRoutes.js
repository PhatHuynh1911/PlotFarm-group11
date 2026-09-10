const express = require('express');
const router = express.Router();
const { createRental, getAllRentals, getRentalsByUser, getActiveRentals, getRentalById } = require('../controllers/rentalController');

router.post('/', createRental);
router.get('/', getAllRentals);
router.get('/active', getActiveRentals);
router.get('/user/:userId', getRentalsByUser);
router.get('/:id', getRentalById);

module.exports = router;