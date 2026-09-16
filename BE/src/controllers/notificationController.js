const { sql, getPool } = require('../config/db');

// Helper: Tạo một thông báo cho người dùng cụ thể
const createNotification = async (userId, title, content, type = 'he_thong', link = null) => {
    try {
        const pool = await getPool();
        await pool.request()
            .input('userId', sql.Int, Number(userId))
            .input('title', sql.NVarChar(150), title)
            .input('content', sql.NVarChar(500), content)
            .input('type', sql.VarChar(50), type)
            .input('link', sql.VarChar(255), link)
            .query(`
                INSERT INTO ThongBao (ma_nguoi_dung, tieu_de, noi_dung, loai_thong_bao, lien_ket, da_doc)
                VALUES (@userId, @title, @content, @type, @link, 0)
            `);
        return true;
    } catch (error) {
        console.error('Lỗi tạo thông báo:', error);
        return false;
    }
};

// Helper: Bắn thông báo cho toàn bộ Admin
const notifyAdmins = async (title, content, type = 'he_thong', link = null) => {
    try {
        const pool = await getPool();
        const admins = await pool.request()
            .query(`SELECT ma_nguoi_dung FROM NguoiDung WHERE vai_tro = 'quan_tri' AND trang_thai = 'hoat_dong'`);
        
        for (const admin of admins.recordset) {
            await createNotification(admin.ma_nguoi_dung, title, content, type, link);
        }
        return true;
    } catch (error) {
        console.error('Lỗi gửi thông báo cho admin:', error);
        return false;
    }
};

// Lấy danh sách thông báo của người dùng hiện tại
const getNotifications = async (req, res) => {
    try {
        const userId = Number(req.user.sub);
        const unreadOnly = req.query.unreadOnly === 'true';
        const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
        const pool = await getPool();

        const [listResult, unreadResult] = await Promise.all([
            pool.request()
                .input('userId', sql.Int, userId)
                .input('limit', sql.Int, limit)
                .query(`
                    SELECT TOP (@limit) ma_thong_bao, tieu_de, noi_dung, loai_thong_bao, lien_ket, da_doc, ngay_tao
                    FROM ThongBao
                    WHERE ma_nguoi_dung = @userId ${unreadOnly ? 'AND da_doc = 0' : ''}
                    ORDER BY ngay_tao DESC
                `),
            pool.request()
                .input('userId', sql.Int, userId)
                .query(`
                    SELECT COUNT(*) AS unreadCount
                    FROM ThongBao
                    WHERE ma_nguoi_dung = @userId AND da_doc = 0
                `)
        ]);

        const unreadCount = unreadResult.recordset[0]?.unreadCount || 0;

        return res.json({
            success: true,
            unreadCount,
            count: listResult.recordset.length,
            data: listResult.recordset
        });
    } catch (error) {
        console.error('Lỗi lấy danh sách thông báo:', error);
        return res.status(500).json({ success: false, message: 'Không thể tải danh sách thông báo' });
    }
};

// Đánh dấu một thông báo là đã đọc
const markAsRead = async (req, res) => {
    try {
        const userId = Number(req.user.sub);
        const notificationId = Number(req.params.id);

        const pool = await getPool();
        const result = await pool.request()
            .input('id', sql.Int, notificationId)
            .input('userId', sql.Int, userId)
            .query(`
                UPDATE ThongBao
                SET da_doc = 1
                WHERE ma_thong_bao = @id AND ma_nguoi_dung = @userId
            `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy thông báo hoặc bạn không có quyền' });
        }

        return res.json({ success: true, message: 'Đã đánh dấu thông báo là đã đọc' });
    } catch (error) {
        console.error('Lỗi cập nhật trạng thái thông báo:', error);
        return res.status(500).json({ success: false, message: 'Không thể cập nhật thông báo' });
    }
};

// Đánh dấu tất cả thông báo của người dùng là đã đọc
const markAllAsRead = async (req, res) => {
    try {
        const userId = Number(req.user.sub);
        const pool = await getPool();
        await pool.request()
            .input('userId', sql.Int, userId)
            .query(`
                UPDATE ThongBao
                SET da_doc = 1
                WHERE ma_nguoi_dung = @userId AND da_doc = 0
            `);

        return res.json({ success: true, message: 'Đã đánh dấu tất cả thông báo là đã đọc' });
    } catch (error) {
        console.error('Lỗi cập nhật tất cả thông báo:', error);
        return res.status(500).json({ success: false, message: 'Không thể cập nhật thông báo' });
    }
};

module.exports = {
    createNotification,
    notifyAdmins,
    getNotifications,
    markAsRead,
    markAllAsRead
};
