const express = require('express');
const admin = require('../controllers/adminController');

const router = express.Router();
router.get('/dashboard', admin.dashboard);
router.get('/users', admin.users);
router.patch('/users/:id', admin.updateUser);
router.get('/plots', admin.plots);
router.post('/plots', admin.createPlot);
router.patch('/plots/:id', admin.updatePlot);
router.get('/rentals', admin.rentals);
router.get('/requests', admin.requests);
router.patch('/requests/:id', admin.updateRequest);

module.exports = router;