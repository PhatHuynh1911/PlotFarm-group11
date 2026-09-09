const { sql } = require('../config/db');

// Tạo hợp đồng thuê đất mới
const createRental = async (req, res) => {
    const transaction = new sql.Transaction();

    try {
        const { so_hop_dong, ma_nguoi_dung, ma_o_dat, ma_cay_trong, ngay_bat_dau, ngay_ket_thuc, thoi_han_thang } = req.body;

        if (!so_hop_dong || !ma_nguoi_dung || !ma_o_dat || !ngay_bat_dau || !ngay_ket_thuc || !thoi_han_thang) {
            return res.status(400).json({ success: false, message: 'Thiếu thông tin bắt buộc để tạo hợp đồng' });
        }

        await transaction.begin();

        // 1. Kiểm tra ô đất còn trống + lấy giá thật từ DB
        const checkResult = await new sql.Request(transaction)
            .input('ma_o_dat', sql.Int, ma_o_dat)
            .query(`SELECT trang_thai, gia_thue_thang FROM ODat WHERE ma_o_dat = @ma_o_dat`);

        const oDat = checkResult.recordset[0];

        if (!oDat) {
            await transaction.rollback();
            return res.status(404).json({ success: false, message: 'Không tìm thấy ô đất' });
        }

        if (oDat.trang_thai !== 'trong') {
            await transaction.rollback();
            return res.status(400).json({ success: false, message: 'Ô đất không còn trống, không thể tạo hợp đồng' });
        }

        const donGiaThang = oDat.gia_thue_thang;
        const tongTien = donGiaThang * thoi_han_thang;

        // 2. Thêm hợp đồng
        await new sql.Request(transaction)
            .input('so_hop_dong', sql.VarChar, so_hop_dong)
            .input('ma_nguoi_dung', sql.Int, ma_nguoi_dung)
            .input('ma_o_dat', sql.Int, ma_o_dat)
            .input('ma_cay_trong', sql.Int, ma_cay_trong || null)
            .input('ngay_bat_dau', sql.Date, ngay_bat_dau)
            .input('ngay_ket_thuc', sql.Date, ngay_ket_thuc)
            .input('thoi_han_thang', sql.Int, thoi_han_thang)
            .input('don_gia_thang', sql.Decimal(14, 2), donGiaThang)
            .input('tong_tien', sql.Decimal(14, 2), tongTien)
            .query(`
                INSERT INTO HopDongThue (so_hop_dong, ma_nguoi_dung, ma_o_dat, ma_cay_trong, ngay_bat_dau, ngay_ket_thuc, thoi_han_thang, don_gia_thang, tong_tien, trang_thai_hop_dong)
                VALUES (@so_hop_dong, @ma_nguoi_dung, @ma_o_dat, @ma_cay_trong, @ngay_bat_dau, @ngay_ket_thuc, @thoi_han_thang, @don_gia_thang, @tong_tien, 'hieu_luc')
            `);

        // 3. Cập nhật trạng thái ô đất thành đã thuê
        await new sql.Request(transaction)
            .input('ma_o_dat', sql.Int, ma_o_dat)
            .query(`UPDATE ODat SET trang_thai = 'da_thue' WHERE ma_o_dat = @ma_o_dat`);

        await transaction.commit();

        res.status(201).json({
            success: true,
            message: 'Tạo hợp đồng thuê đất thành công và cập nhật trạng thái ô đất!',
            tongTien
        });
    } catch (error) {
        await transaction.rollback();
        console.error('Lỗi khi tạo hợp đồng thuê:', error);
        res.status(500).json({ success: false, message: 'Lỗi server nội bộ' });
    }
};

// Lấy danh sách tất cả hợp đồng thuê đất
const getAllRentals = async (req, res) => {
    try {
        const pool = await sql.connect();
        const result = await pool.request().query(`
            SELECT * FROM HopDongThue
        `);

        res.status(200).json({
            success: true,
            data: result.recordset
        });
    } catch (error) {
        console.error('Lỗi khi lấy danh sách hợp đồng:', error);
        res.status(500).json({ success: false, message: 'Lỗi server nội bộ' });
    }
};

const getRentalsByUser = async (req, res) => {
    try {
        const pool = await sql.connect();
        const result = await pool.request()
            .input('ma_nguoi_dung', sql.Int, Number(req.params.userId))
            .query(`
                SELECT h.ma_hop_dong, h.so_hop_dong, h.ngay_bat_dau, h.ngay_ket_thuc,
                       h.tong_tien, h.trang_thai_hop_dong, o.so_hieu_o, o.ten_o_dat
                FROM HopDongThue h
                INNER JOIN ODat o ON o.ma_o_dat = h.ma_o_dat
                WHERE h.ma_nguoi_dung = @ma_nguoi_dung
                ORDER BY h.ngay_tao DESC
            `);
        return res.json({ success: true, data: result.recordset });
    } catch (error) {
        console.error('Lỗi khi lấy hợp đồng của người dùng:', error);
        return res.status(500).json({ success: false, message: 'Không thể tải hợp đồng' });
    }
};

module.exports = { createRental, getAllRentals, getRentalsByUser };