const express = require('express');
const router = express.Router();
const { getAllPlots, getPlotByIdOrCode, updatePlotStatus } = require('../controllers/plotController');

router.get('/', getAllPlots);
router.get('/:idOrCode', getPlotByIdOrCode);
router.patch('/:id/status', updatePlotStatus);

module.exports = router;