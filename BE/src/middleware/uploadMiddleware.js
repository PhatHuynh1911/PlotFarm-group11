const fs = require('fs');
const path = require('path');
const multer = require('multer');

const uploadDirectory = path.join(__dirname, '../../uploads');
fs.mkdirSync(uploadDirectory, { recursive: true });

const storage = multer.diskStorage({
    destination: uploadDirectory,
    filename: (req, file, callback) => {
        const extension = path.extname(file.originalname).toLowerCase();
        callback(null, `plot-${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`);
    }
});

const uploadPlotImage = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, callback) => {
        if (file.mimetype.startsWith('image/')) return callback(null, true);
        callback(new Error('Chỉ được tải lên tệp hình ảnh'));
    }
});

module.exports = { uploadPlotImage };