const express = require('express');
const router = express.Router();
const { getServiceTypes, createServiceRequest, getRequestsByUser, getAllRequests, updateRequestStatus } = require('../controllers/serviceController');
const { authenticate, authorize, requireSelfOrAdmin } = require('../middleware/authMiddleware');

router.get('/types', getServiceTypes);
router.post('/', authenticate, authorize('khach_hang'), createServiceRequest);
router.get('/user/:userId', authenticate, requireSelfOrAdmin, getRequestsByUser);
router.get('/all', authenticate, authorize('nong_dan', 'quan_tri'), getAllRequests);
router.patch('/:id/status', authenticate, authorize('nong_dan', 'quan_tri'), updateRequestStatus);

module.exports = router;
