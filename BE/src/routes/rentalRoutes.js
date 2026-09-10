const express = require('express');
const router = express.Router();
const rentalController = require('../controllers/rentalController');
const { authenticate, authorize, requireSelfOrAdmin } = require('../middleware/authMiddleware');

// Đảm bảo trong rentalController có các hàm này
router.get('/', authenticate, authorize('quan_tri'), rentalController.getAllRentals);
router.get('/user/:userId', authenticate, requireSelfOrAdmin, rentalController.getRentalsByUser);
router.post('/', authenticate, authorize('khach_hang'), rentalController.createRental);

module.exports = router;
