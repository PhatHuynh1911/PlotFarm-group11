const express = require('express');
const router = express.Router();
const { getFarmWeather, getYieldEstimate } = require('../controllers/weatherController');

router.get('/current', getFarmWeather);
router.get('/yield-estimate', getYieldEstimate);
router.get('/', getFarmWeather);

module.exports = router;
