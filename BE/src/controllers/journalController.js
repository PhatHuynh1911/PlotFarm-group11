const { sql, getPool } = require('../config/db');

// Nông dân thêm bài viết nhật ký canh tác mới
const createJournal = async (req, res) => {
    try {
        const {
            ma_hop_dong,
            ma_nong_dan,
            giai_doan_sinh_truong,
            tieu_de,
            noi_dung,
            hinh_anh,
            luong_nuoc_tuoi_lit,
            loai_phan_bon,
            ghi_chu_sau_benh
        } = req.body;

        if (!ma_hop_dong || !tieu_de || !noi_dung) {
            return res.status(400).json({ success: false, message: 'Vui lòng cung cấp mã hợp đồng, tiêu đề và nội dung nhật ký' });
        }

        const pool = await getPool();
        const result = await pool.request()
            .input('ma_hop_dong', sql.Int, parseInt(ma_hop_dong, 10))
            .input('ma_nong_dan', sql.Int, ma_nong_dan ? parseInt(ma_nong_dan, 10) : null)
            .input('giai_doan_sinh_truong', sql.NVarChar(50), giai_doan_sinh_truong || 'Sinh trưởng')
            .input('tieu_de', sql.NVarChar(200), tieu_de.trim())
            .input('noi_dung', sql.NVarChar(sql.MAX), noi_dung.trim())
            .input('hinh_anh', sql.VarChar(500), hinh_anh || null)
            .input('luong_nuoc_tuoi_lit', sql.Decimal(5, 2), luong_nuoc_tuoi_lit ? parseFloat(luong_nuoc_tuoi_lit) : null)
            .input('loai_phan_bon', sql.NVarChar(100), loai_phan_bon || null)
            .input('ghi_chu_sau_benh', sql.NVarChar(255), ghi_chu_sau_benh || null)
            .query(`
                INSERT INTO NhatKyCanhTac (ma_hop_dong, ma_nong_dan, giai_doan_sinh_truong, tieu_de, noi_dung, hinh_anh, luong_nuoc_tuoi_lit, loai_phan_bon, ghi_chu_sau_benh)
                OUTPUT INSERTED.*
                VALUES (@ma_hop_dong, @ma_nong_dan, @giai_doan_sinh_truong, @tieu_de, @noi_dung, @hinh_anh, @luong_nuoc_tuoi_lit, @loai_phan_bon, @ghi_chu_sau_benh)
            `);

        res.status(201).json({
            success: true,
            message: 'Đã thêm nhật ký canh tác thành công',
            data: result.recordset[0]
        });
    } catch (error) {
        console.error('Lỗi khi thêm nhật ký canh tác:', error);
        res.status(500).json({ success: false, message: 'Lỗi server nội bộ' });
    }
};

// Lấy lịch sử nhật ký theo mã hợp đồng
const getJournalsByRental = async (req, res) => {
    try {
        const { rentalId } = req.params;
        const pool = await getPool();
        const result = await pool.request()
            .input('ma_hop_dong', sql.Int, parseInt(rentalId, 10))
            .query(`
                SELECT j.*, u.ho_va_ten AS ten_nong_dan
                FROM NhatKyCanhTac j
                LEFT JOIN NguoiDung u ON u.ma_nguoi_dung = j.ma_nong_dan
                WHERE j.ma_hop_dong = @ma_hop_dong
                ORDER BY j.ngay_ghi_nhat_ky DESC, j.ngay_tao DESC
            `);

        res.status(200).json({
            success: true,
            count: result.recordset.length,
            data: result.recordset
        });
    } catch (error) {
        console.error('Lỗi khi lấy nhật ký canh tác:', error);
        res.status(500).json({ success: false, message: 'Lỗi server nội bộ' });
    }
};

module.exports = { createJournal, getJournalsByRental };
