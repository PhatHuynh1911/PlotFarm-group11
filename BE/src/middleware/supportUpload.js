const multer = require('multer');
const path = require('node:path');
const fs = require('node:fs/promises');
const { randomUUID } = require('node:crypto');

const directory = path.join(__dirname, '../../uploads');
const types = { 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'], 'image/webp': ['.webp'], 'image/gif': ['.gif'] };
const parser = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024, files: 1 },
    fileFilter(req, file, done) {
        if (!types[file.mimetype]?.includes(path.extname(file.originalname).toLowerCase())) {
            return done(new Error('Chỉ chấp nhận ảnh JPG, PNG, WEBP hoặc GIF.'));
        }
        done(null, true);
    },
}).single('image');

function hasImageSignature(buffer, type) {
    if (type === 'image/png') return buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    if (type === 'image/jpeg') return buffer.length >= 3 && buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255;
    if (type === 'image/gif') return ['GIF87a', 'GIF89a'].includes(buffer.toString('ascii', 0, 6));
    if (type === 'image/webp') return buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP';
    return false;
}

const uploadSupportImage = (req, res, next) => parser(req, res, async (error) => {
    if (error) return res.status(400).json({ success: false, message: error.code === 'LIMIT_FILE_SIZE' ? 'Mỗi ảnh không được vượt quá 5 MB.' : error.message });
    if (!req.file) return res.status(400).json({ success: false, message: 'Vui lòng chọn ảnh để tải lên.' });
    if (!hasImageSignature(req.file.buffer, req.file.mimetype)) return res.status(400).json({ success: false, message: 'Nội dung tệp không phải ảnh hợp lệ.' });
    try {
        const extension = types[req.file.mimetype][0];
        const filename = `support-${Number(req.user.sub)}-${randomUUID()}${extension}`;
        await fs.mkdir(directory, { recursive: true });
        await fs.writeFile(path.join(directory, filename), req.file.buffer, { flag: 'wx' });
        req.file.filename = filename;
        delete req.file.buffer;
        next();
    } catch (writeError) {
        console.error('Lỗi lưu ảnh đính kèm:', writeError);
        res.status(500).json({ success: false, message: 'Không thể lưu ảnh. Vui lòng thử lại.' });
    }
});

async function validateAttachments(value, userId) {
    if (value == null) return [];
    if (!Array.isArray(value) || value.length > 3) throw new Error('Mỗi yêu cầu được đính kèm tối đa 3 ảnh.');
    const pattern = new RegExp(`^/uploads/support-${Number(userId)}-[a-f0-9-]{36}\\.(jpg|png|webp|gif)$`);
    const unique = [...new Set(value)];
    for (const image of unique) {
        if (typeof image !== 'string' || !pattern.test(image)) throw new Error('Ảnh đính kèm không thuộc tài khoản của bạn.');
        try { await fs.access(path.join(directory, path.basename(image))); }
        catch { throw new Error('Ảnh đính kèm không tồn tại. Vui lòng tải lại ảnh.'); }
    }
    return unique;
}

module.exports = { uploadSupportImage, validateAttachments };
