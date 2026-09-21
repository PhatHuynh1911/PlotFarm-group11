const express = require('express');
const router = express.Router();
const { getAllPlots, getPlotByIdOrCode, updatePlotStatus } = require('../controllers/plotController');
const { readyToHarvest } = require('../controllers/harvestController');

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

router.get('/', getAllPlots);
router.get('/:idOrCode', getPlotByIdOrCode);
router.patch('/:id/status', updatePlotStatus);
router.post('/:id/ready-to-harvest', softAuth, readyToHarvest);

module.exports = router;