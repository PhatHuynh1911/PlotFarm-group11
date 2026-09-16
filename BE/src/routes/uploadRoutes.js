const express = require('express');
const router = express.Router();
const upload = require('../middleware/uploadMiddleware');
const { uploadImage } = require('../controllers/uploadController');

// Upload ảnh/video đơn
router.post('/', (req, res, next) => {
    upload.single('image')(req, res, function (err) {
        if (err) {
            return res.status(400).json({ success: false, message: err.message });
        }
        uploadImage(req, res);
    });
});

router.post('/video', (req, res, next) => {
    upload.single('video')(req, res, function (err) {
        if (err) {
            return res.status(400).json({ success: false, message: err.message });
        }
        uploadImage(req, res);
    });
});

module.exports = router;
