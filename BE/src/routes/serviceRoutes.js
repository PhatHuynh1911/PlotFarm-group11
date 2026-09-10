const express = require('express');
const router = express.Router();
const { getServiceTypes, createServiceRequest, getRequestsByUser, getAllRequests, updateRequestStatus } = require('../controllers/serviceController');

router.get('/types', getServiceTypes);
router.post('/', createServiceRequest);
router.get('/user/:userId', getRequestsByUser);
router.get('/all', getAllRequests);
router.patch('/:id/status', updateRequestStatus);

module.exports = router;
