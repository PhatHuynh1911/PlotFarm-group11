const express = require('express');
const router = express.Router();
const { getAllPlots, getAvailablePlots, getPlotByIdOrCode, updatePlotStatus } = require('../controllers/plotController');
const { readyToHarvest } = require('../controllers/harvestController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

router.get('/', getAllPlots);
router.get('/available-plots', getAvailablePlots);
router.get('/available', getAvailablePlots);
router.get('/:idOrCode', getPlotByIdOrCode);
router.patch('/:id/status', authenticate, authorize('quan_tri'), updatePlotStatus);
router.post('/:id/ready-to-harvest', authenticate, authorize('nong_dan'), readyToHarvest);

module.exports = router;
