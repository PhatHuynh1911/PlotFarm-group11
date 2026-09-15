const { sql, getPool } = require('../config/db');

// Helper chuẩn hóa dữ liệu ô đất
const formatPlot = (plot) => {
    const rawImage = plot.hinh_anh_o_dat || plot.image_url || plot.image || null;
    const posX = plot.position_x != null ? Number(plot.position_x) : 50.0;
    const posY = plot.position_y != null ? Number(plot.position_y) : 50.0;

    return {
        ...plot,
        id: plot.ma_o_dat,
        farmId: plot.ma_nong_trai,
        code: plot.so_hieu_o,
        name: plot.ten_o_dat,
        area: Number(plot.dien_tich_m2),
        price: Number(plot.gia_thue_thang),
        status: plot.trang_thai,
        soil: plot.loai_dat || 'Đất thịt phù sa giàu mùn',
        location: plot.ten_nong_trai || 'Vườn PlotFarm',
        description: plot.mo_ta_chi_tiet || '',
        position_x: posX,
        position_y: posY,
        coord_x: posX,
        coord_y: posY,
        hinh_anh_o_dat: rawImage,
        image: rawImage,
        image_url: rawImage
    };
};

// Lấy danh sách tất cả các ô đất từ bảng ODat kèm tọa độ bản đồ và ảnh
const getAllPlots = async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`
            SELECT o.ma_o_dat, o.ma_nong_trai, o.so_hieu_o, o.ten_o_dat, 
                   o.dien_tich_m2, o.gia_thue_thang, o.trang_thai, o.loai_dat,
                   o.position_x, o.position_y, o.hinh_anh_o_dat, o.mo_ta_chi_tiet,
                   n.ten_nong_trai, n.dia_chi AS dia_chi_nong_trai
            FROM ODat o
            LEFT JOIN NongTrai n ON n.ma_nong_trai = o.ma_nong_trai
            ORDER BY o.so_hieu_o ASC
        `);
        
        const formatted = result.recordset.map(formatPlot);

        res.status(200).json({
            success: true,
            count: formatted.length,
            data: formatted
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
            data: formatPlot(plot)
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

module.exports = { getAllPlots, getPlotByIdOrCode, updatePlotStatus, formatPlot };
