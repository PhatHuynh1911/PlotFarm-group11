const express = require('express');
const router = express.Router();
const { getAllPlots } = require('../controllers/plotController');

router.get('/', getAllPlots);

module.exports = router;