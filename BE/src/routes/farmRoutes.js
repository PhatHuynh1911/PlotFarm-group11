const express = require('express');
const router = express.Router();
const { getAllFarms, getFarmById, getPlotsByFarm } = require('../controllers/farmController');

router.get('/', getAllFarms);
router.get('/:id', getFarmById);
router.get('/:id/plots', getPlotsByFarm);

module.exports = router;
