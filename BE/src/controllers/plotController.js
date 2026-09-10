const { sql, getPool } = require('../config/db');

// Lấy danh sách tất cả các ô đất từ bảng ODat
const getAllPlots = async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`
            SELECT o.ma_o_dat, o.ma_nong_trai, o.so_hieu_o, o.ten_o_dat, 
                   o.dien_tich_m2, o.gia_thue_thang, o.trang_thai, o.hinh_anh_o_dat, o.mo_ta_chi_tiet,
                   n.ten_nong_trai, n.dia_chi AS dia_chi_nong_trai
            FROM ODat o
            LEFT JOIN NongTrai n ON n.ma_nong_trai = o.ma_nong_trai
            ORDER BY o.so_hieu_o ASC
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

// Lấy chi tiết một ô đất theo ID hoặc số hiệu ô (VD: 1 hoặc B-07)
const getPlotByIdOrCode = async (req, res) => {
    try {
        const { idOrCode } = req.params;
        const pool = await getPool();
        const isNumeric = /^\d+$/.test(idOrCode);

        let query = `
            SELECT o.*, n.ten_nong_trai, n.dia_chi AS dia_chi_nong_trai, n.so_dien_thoai_lien_he
            FROM ODat o
            LEFT JOIN NongTrai n ON n.ma_nong_trai = o.ma_nong_trai
            WHERE `;

        const request = pool.request();
        if (isNumeric) {
            query += `o.ma_o_dat = @idOrCode`;
            request.input('idOrCode', sql.Int, parseInt(idOrCode, 10));
        } else {
            query += `o.so_hieu_o = @idOrCode`;
            request.input('idOrCode', sql.VarChar(20), idOrCode.trim());
        }

        const result = await request.query(query);
        const plot = result.recordset[0];

        if (!plot) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy ô đất' });
        }

        res.status(200).json({
            success: true,
            data: plot
        });
    } catch (error) {
        console.error('Lỗi khi lấy chi tiết ô đất:', error);
        res.status(500).json({ success: false, message: 'Lỗi server nội bộ' });
    }
};

// Cập nhật trạng thái ô đất
const updatePlotStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['trong', 'dang_chon', 'da_thue', 'bao_tri'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Trạng thái ô đất không hợp lệ' });
        }

        const pool = await getPool();
        await pool.request()
            .input('id', sql.Int, parseInt(id, 10))
            .input('status', sql.VarChar(20), status)
            .query(`UPDATE ODat SET trang_thai = @status, ngay_cap_nhat = SYSDATETIME() WHERE ma_o_dat = @id`);

        res.status(200).json({
            success: true,
            message: 'Cập nhật trạng thái ô đất thành công'
        });
    } catch (error) {
        console.error('Lỗi khi cập nhật trạng thái ô đất:', error);
        res.status(500).json({ success: false, message: 'Lỗi server nội bộ' });
    }
};

module.exports = { getAllPlots, getPlotByIdOrCode, updatePlotStatus };