const express = require('express');
const admin = require('../controllers/adminController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

const router = express.Router();
router.use(authenticate, authorize('quan_tri'));
router.get('/dashboard', admin.dashboard);
router.get('/stats', admin.dashboard);
router.get('/users', admin.users);
router.patch('/users/:id', admin.updateUser);
router.get('/plots', admin.plots);
router.post('/plots', admin.createPlot);
router.patch('/plots/:id', admin.updatePlot);
router.get('/rentals', admin.rentals);
router.get('/requests', admin.requests);
router.patch('/requests/:id', admin.updateRequest);

module.exports = router;
