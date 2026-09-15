const path = require('path');

const uploadImage = (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Vui lòng chọn tệp hình ảnh để tải lên' });
        }

        // Tạo URL truy cập ảnh tĩnh
        const fileUrl = `/uploads/${req.file.filename}`;
        const fullUrl = `${req.protocol}://${req.get('host')}${fileUrl}`;

        return res.status(201).json({
            success: true,
            message: 'Tải ảnh lên máy chủ thành công!',
            data: {
                filename: req.file.filename,
                originalname: req.file.originalname,
                mimetype: req.file.mimetype,
                size: req.file.size,
                url: fileUrl,
                fullUrl: fullUrl
            }
        });
    } catch (error) {
        console.error('Lỗi tải ảnh lên:', error);
        return res.status(500).json({ success: false, message: 'Không thể xử lý tệp ảnh' });
    }
};

module.exports = { uploadImage };
