const express = require('express');
const router = express.Router();
const { getStreamUrl, getCameraByPlot } = require('../controllers/cameraController');

router.get('/stream/:plotId', getStreamUrl);
router.get('/plot/:plotId', getCameraByPlot);

module.exports = router;
