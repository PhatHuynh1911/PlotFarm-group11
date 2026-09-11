const express = require('express');
const router = express.Router();
const { createRental, getAllRentals, getRentalsByUser, getActiveRentals, getRentalById, updateCultivationStatus } = require('../controllers/rentalController');
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
router.patch('/:id/cultivation-status', softAuth, updateCultivationStatus);
router.get('/user/:userId', softAuth, getRentalsByUser);
router.get('/:id', softAuth, getRentalById);

module.exports = router;
