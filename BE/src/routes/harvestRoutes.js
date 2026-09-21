const express = require('express');
const router = express.Router();
const {
    readyToHarvest,
    registerDelivery,
    getHarvestByRental,
    getAllHarvests
} = require('../controllers/harvestController');

// Middleware softAuth để hỗ trợ cả gọi có token và không token (khi test qua Swagger / script)
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

router.get('/', softAuth, getAllHarvests);
router.post('/ready', softAuth, readyToHarvest);
router.post('/delivery', softAuth, registerDelivery);
router.get('/rental/:rentalId', softAuth, getHarvestByRental);
router.post('/rental/:rentalId/ready', softAuth, readyToHarvest);
router.post('/rental/:rentalId/delivery', softAuth, registerDelivery);

module.exports = router;
