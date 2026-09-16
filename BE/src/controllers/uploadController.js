const path = require('path');

const uploadImage = (req, res) => {
    try {
        const uploadedFile = req.file || (req.files && req.files[0]);
        if (!uploadedFile) {
            return res.status(400).json({ success: false, message: 'Vui lòng chọn tệp để tải lên' });
        }

        const fileUrl = `/uploads/${uploadedFile.filename}`;
        const fullUrl = `${req.protocol}://${req.get('host')}${fileUrl}`;

        return res.status(201).json({
            success: true,
            message: 'Tải tệp lên máy chủ thành công!',
            data: {
                filename: uploadedFile.filename,
                originalname: uploadedFile.originalname,
                mimetype: uploadedFile.mimetype,
                size: uploadedFile.size,
                url: fileUrl,
                fullUrl: fullUrl
            }
        });
    } catch (error) {
        console.error('Lỗi tải tệp lên:', error);
        return res.status(500).json({ success: false, message: 'Không thể xử lý tệp tải lên' });
    }
};

module.exports = { uploadImage };
