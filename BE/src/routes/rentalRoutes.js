const express = require('express');
const router = express.Router();
const {
    createRental,
    getAllRentals,
    getRentalsByUser,
    getActiveRentals,
    getRentalById,
    updateCultivationStatus,
    getPaymentInfo,
    confirmPayment,
    markHarvestReady,
    getHarvestDeliveriesForFarmer,
    getHarvestDeliveriesForUser,
    chooseHarvestDelivery,
    handoverHarvestDelivery
} = require('../controllers/rentalController');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { getAssignments, respondToAssignment } = require('../controllers/assignmentController');

// Soft auth: Nếu có Bearer token thì giải mã vào req.user, nếu không thì vẫn cho qua để test Swagger
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

router.post('/', softAuth, createRental);
router.get('/', softAuth, getAllRentals);
router.get('/active', softAuth, getActiveRentals);
router.get('/assignments/mine', authenticate, authorize('nong_dan'), getAssignments);
router.patch('/assignments/:id/respond', authenticate, authorize('nong_dan'), respondToAssignment);
router.get('/harvest-deliveries/mine', authenticate, authorize('nong_dan'), getHarvestDeliveriesForFarmer);
router.get('/harvest-deliveries/user', authenticate, authorize('khach_hang'), getHarvestDeliveriesForUser);
router.patch('/:id/harvest-ready', authenticate, authorize('nong_dan'), markHarvestReady);
router.post('/:id/harvest-delivery', authenticate, authorize('khach_hang'), chooseHarvestDelivery);
router.patch('/harvest-deliveries/:id/handover', authenticate, authorize('nong_dan'), handoverHarvestDelivery);
router.get('/:id/payment-info', softAuth, getPaymentInfo);
router.post('/:id/confirm-payment', softAuth, confirmPayment);
router.patch('/:id/payment-status', softAuth, confirmPayment);
router.patch('/:id/cultivation-status', authenticate, authorize('nong_dan'), updateCultivationStatus);
router.get('/user/:userId', softAuth, getRentalsByUser);
router.get('/:id', softAuth, getRentalById);

module.exports = router;
