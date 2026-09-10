const express = require('express');
const router = express.Router();
const { getAllCrops, getCropById } = require('../controllers/cropController');

router.get('/', getAllCrops);
router.get('/:id', getCropById);

module.exports = router;
