const { sql, getPool } = require('../config/db');

const createComplaint = async (req, res) => {
    try {
        const { ma_hop_dong, ma_o_dat, tieu_de, mo_ta_chi_tiet } = req.body;
        const ma_khach_hang = Number(req.user.sub);

        if (!ma_hop_dong || !tieu_de || !mo_ta_chi_tiet) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng nhập mã hợp đồng, tiêu đề và mô tả khiếu nại.'
            });
        }

        const pool = await getPool();
        const contract = await pool.request()
            .input('contractId', sql.Int, Number(ma_hop_dong))
            .input('customerId', sql.Int, ma_khach_hang)
            .query(`
                SELECT h.ma_hop_dong, h.ma_o_dat, h.trang_thai_hop_dong
                FROM HopDongThue h
                WHERE h.ma_hop_dong = @contractId AND h.ma_nguoi_dung = @customerId
            `);

        if (!contract.recordset[0]) {
            return res.status(403).json({
                success: false,
                message: 'Hợp đồng không thuộc tài khoản của bạn hoặc không tồn tại.'
            });
        }

        if (ma_o_dat && Number(ma_o_dat) !== Number(contract.recordset[0].ma_o_dat)) {
            return res.status(400).json({
                success: false,
                message: 'Ô đất liên quan không khớp với hợp đồng được chọn.'
            });
        }

        const result = await pool.request()
            .input('ma_hop_dong', sql.Int, Number(ma_hop_dong))
            .input('ma_khach_hang', sql.Int, ma_khach_hang)
            .input('ma_o_dat', sql.Int, ma_o_dat ? Number(ma_o_dat) : null)
            .input('tieu_de', sql.NVarChar(200), String(tieu_de).trim())
            .input('mo_ta', sql.NVarChar(sql.MAX), String(mo_ta_chi_tiet).trim())
            .query(`
                INSERT INTO KhieuNai (ma_hop_dong, ma_khach_hang, ma_o_dat, tieu_de, mo_ta_chi_tiet, trang_thai_khieu_nai)
                OUTPUT INSERTED.*
                VALUES (@ma_hop_dong, @ma_khach_hang, @ma_o_dat, @tieu_de, @mo_ta, 'dang_tiep_nhan')
            `);

        res.status(201).json({
            success: true,
            message: 'Đã gửi khiếu nại thành công. Admin sẽ xem xét và phản hồi trong thời gian sớm nhất.',
            data: result.recordset[0]
        });
    } catch (error) {
        console.error('Lỗi gửi khiếu nại:', error);
        res.status(500).json({ success: false, message: 'Lỗi server nội bộ' });
    }
};

const getComplaintsByUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const pool = await getPool();
        const result = await pool.request()
            .input('userId', sql.Int, Number(userId))
            .query(`
                SELECT k.*, 'khieu_nai' AS category, 'complaint' AS type, 'complaint' AS source,
                       h.so_hop_dong, o.so_hieu_o, o.ten_o_dat
                FROM KhieuNai k
                LEFT JOIN HopDongThue h ON h.ma_hop_dong = k.ma_hop_dong
                LEFT JOIN ODat o ON o.ma_o_dat = k.ma_o_dat
                WHERE k.ma_khach_hang = @userId
                ORDER BY k.ngay_gui DESC
            `);

        res.status(200).json({
            success: true,
            count: result.recordset.length,
            data: result.recordset
        });
    } catch (error) {
        console.error('Lỗi lấy khiếu nại của khách:', error);
        res.status(500).json({ success: false, message: 'Lỗi server nội bộ' });
    }
};

const getAllComplaints = async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`
            SELECT k.*, 'khieu_nai' AS category, 'complaint' AS type, 'complaint' AS source,
                   u.ho_va_ten AS ten_khach_hang, u.email, u.so_dien_thoai AS sdt_khach_hang,
                   o.so_hieu_o, o.ten_o_dat, h.so_hop_dong
            FROM KhieuNai k
            JOIN NguoiDung u ON u.ma_nguoi_dung = k.ma_khach_hang
            LEFT JOIN HopDongThue h ON h.ma_hop_dong = k.ma_hop_dong
            LEFT JOIN ODat o ON o.ma_o_dat = k.ma_o_dat
            ORDER BY k.ngay_gui DESC
        `);

        res.status(200).json({
            success: true,
            count: result.recordset.length,
            data: result.recordset
        });
    } catch (error) {
        console.error('Lỗi lấy toàn bộ khiếu nại:', error);
        res.status(500).json({ success: false, message: 'Lỗi server nội bộ' });
    }
};

const updateComplaintStatus = async (req, res) => {
    try {
        const { status, phan_hoi_admin } = req.body;
        const allowed = ['dang_tiep_nhan', 'da_giai_quyet', 'tu_choi'];
        if (!allowed.includes(status)) {
            return res.status(400).json({ success: false, message: 'Trạng thái khiếu nại không hợp lệ' });
        }

        const pool = await getPool();
        await pool.request()
            .input('id', sql.Int, Number(req.params.id))
            .input('status', sql.VarChar(30), status)
            .input('phanHoi', sql.NVarChar(sql.MAX), phan_hoi_admin || null)
            .input('adminId', sql.Int, Number(req.user.sub))
            .query(`
                UPDATE KhieuNai
                SET trang_thai_khieu_nai = @status,
                    phan_hoi_admin = COALESCE(@phanHoi, phan_hoi_admin),
                    ma_admin_xu_ly = @adminId,
                    ngay_cap_nhat = SYSDATETIME()
                WHERE ma_khieu_nai = @id
            `);

        res.status(200).json({
            success: true,
            message: 'Đã cập nhật trạng thái khiếu nại'
        });
    } catch (error) {
        console.error('Lỗi cập nhật khiếu nại:', error);
        res.status(500).json({ success: false, message: 'Lỗi server nội bộ' });
    }
};

module.exports = { createComplaint, getComplaintsByUser, getAllComplaints, updateComplaintStatus };
