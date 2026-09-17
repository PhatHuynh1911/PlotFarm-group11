const express = require('express');
const router = express.Router();
const { createComplaint, getComplaintsByUser, getAllComplaints, updateComplaintStatus } = require('../controllers/complaintController');
const { authenticate, authorize, requireSelfOrAdmin } = require('../middleware/authMiddleware');

router.post('/', authenticate, authorize('khach_hang'), createComplaint);
router.get('/user/:userId', authenticate, requireSelfOrAdmin, getComplaintsByUser);
router.get('/all', authenticate, authorize('quan_tri'), getAllComplaints);
router.patch('/:id/status', authenticate, authorize('quan_tri'), updateComplaintStatus);

module.exports = router;
