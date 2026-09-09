const { sql } = require('../config/db');

// Lấy danh sách tất cả các ô đất từ bảng ODat
const getAllPlots = async (req, res) => {
    try {
        const pool = await sql.connect();
        // Truy vấn chính xác tên bảng và cột theo script SQL của nhóm
        const result = await pool.request().query(`
            SELECT ma_o_dat, ma_nong_trai, so_hieu_o, ten_o_dat, 
                   dien_tich_m2, gia_thue_thang, trang_thai, hinh_anh_o_dat, mo_ta_chi_tiet 
            FROM ODat
        `);
        
        res.status(200).json({
            success: true,
            count: result.recordset.length,
            data: result.recordset
        });
    } catch (error) {
        console.error('Lỗi khi lấy danh sách ô đất:', error);
        res.status(500).json({ success: false, message: 'Lỗi server nội bộ' });
    }
};

module.exports = { getAllPlots };