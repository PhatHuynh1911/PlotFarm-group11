const express = require('express');
const router = express.Router();
const {
    readyToHarvest,
    registerDelivery,
    getHarvestByRental,
    getAllHarvests
} = require('../controllers/harvestController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// Các route cũ được giữ để tương thích URL, nhưng không còn cho phép gọi ẩn danh.
router.get('/', authenticate, authorize('quan_tri'), getAllHarvests);
router.post('/ready', authenticate, authorize('nong_dan'), readyToHarvest);
router.post('/delivery', authenticate, authorize('khach_hang'), registerDelivery);
router.get('/rental/:rentalId', authenticate, getHarvestByRental);
router.post('/rental/:rentalId/ready', authenticate, authorize('nong_dan'), readyToHarvest);
router.post('/rental/:rentalId/delivery', authenticate, authorize('khach_hang'), registerDelivery);

module.exports = router;
