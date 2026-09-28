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
    handoverHarvestDelivery,
    extendRental,
    chooseNewCrop,
    cancelRental,
    expirePendingRentals
} = require('../controllers/rentalController');
const {
    readyToHarvest,
    registerDelivery,
    getHarvestByRental
} = require('../controllers/harvestController');
const { authenticate, authorize, requireSelfOrAdmin } = require('../middleware/authMiddleware');
const { getAssignments, respondToAssignment } = require('../controllers/assignmentController');

// Soft auth: Nếu có Bearer token thì giải mã vào req.user, nếu không thì vẫn cho qua để test Swagger

router.post('/', authenticate, authorize('khach_hang'), createRental);
router.get('/', authenticate, authorize('quan_tri'), getAllRentals);
router.get('/active', authenticate, authorize('nong_dan'), getActiveRentals);
router.post('/expire-pending', authenticate, authorize('quan_tri'), expirePendingRentals);
router.get('/assignments/mine', authenticate, authorize('nong_dan'), getAssignments);
router.patch('/assignments/:id/respond', authenticate, authorize('nong_dan'), respondToAssignment);
router.get('/harvest-deliveries/mine', authenticate, authorize('nong_dan'), getHarvestDeliveriesForFarmer);
router.get('/harvest-deliveries/user', authenticate, authorize('khach_hang'), getHarvestDeliveriesForUser);
router.patch('/:id/harvest-ready', authenticate, authorize('nong_dan'), markHarvestReady);
router.post('/:id/harvest-delivery', authenticate, authorize('khach_hang'), chooseHarvestDelivery);
router.patch('/harvest-deliveries/:id/handover', authenticate, authorize('nong_dan'), handoverHarvestDelivery);
router.get('/:id/payment-info', authenticate, authorize('khach_hang'), getPaymentInfo);
router.post('/:id/confirm-payment', authenticate, authorize('khach_hang'), confirmPayment);
router.patch('/:id/payment-status', authenticate, authorize('khach_hang'), confirmPayment);
router.patch('/:id/cultivation-status', authenticate, authorize('nong_dan'), updateCultivationStatus);
router.post('/:id/ready-to-harvest', authenticate, authorize('nong_dan'), readyToHarvest);
router.get('/:id/harvest', authenticate, getHarvestByRental);
router.post('/:id/gia-han', authenticate, authorize('khach_hang'), extendRental);
router.post('/:id/extend', authenticate, authorize('khach_hang'), extendRental);
router.post('/:id/chon-cay-moi', authenticate, authorize('khach_hang'), chooseNewCrop);
router.post('/:id/new-crop', authenticate, authorize('khach_hang'), chooseNewCrop);
router.post('/:id/huy', authenticate, authorize('khach_hang', 'quan_tri'), cancelRental);
router.post('/:id/cancel', authenticate, authorize('khach_hang', 'quan_tri'), cancelRental);
router.get('/user/:userId', authenticate, requireSelfOrAdmin, getRentalsByUser);
router.get('/:id', authenticate, getRentalById);

module.exports = router;
