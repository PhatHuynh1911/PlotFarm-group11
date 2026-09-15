const { sql, getPool } = require('../config/db');

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

// Lấy danh sách tất cả các nông trại
const getAllFarms = async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`
            SELECT ma_nong_trai, ten_nong_trai, mo_ta, dia_chi, tinh_thanh, quan_huyen,
                   vi_do, kinh_do, tong_dien_tich_ha, dien_tich_kha_dung_ha,
                   so_dien_thoai_lien_he, email_lien_he, gio_mo_cua, hinh_anh, trang_thai
            FROM NongTrai
            ORDER BY ma_nong_trai ASC
        `);
        return res.json({
            success: true,
            count: result.recordset.length,
            data: result.recordset
        });
    } catch (error) {
        console.error('Lỗi khi lấy danh sách nông trại:', error);
        return res.status(500).json({ success: false, message: 'Lỗi server nội bộ' });
    }
};

// Lấy thông tin chi tiết một nông trại
const getFarmById = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await getPool();
        const result = await pool.request()
            .input('id', sql.Int, parseInt(id, 10))
            .query('SELECT * FROM NongTrai WHERE ma_nong_trai = @id');

        const farm = result.recordset[0];
        if (!farm) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy nông trại' });
        }

        return res.json({ success: true, data: farm });
    } catch (error) {
        console.error('Lỗi khi lấy thông tin nông trại:', error);
        return res.status(500).json({ success: false, message: 'Lỗi server nội bộ' });
    }
};

// Lấy toàn bộ ô đất kèm tọa độ (position_x, position_y), trạng thái và ảnh cho bản đồ nông trại
const getPlotsByFarm = async (req, res) => {
    try {
        const { id } = req.params;
        const farmId = parseInt(id, 10);
        const pool = await getPool();

        const [farmResult, plotsResult] = await Promise.all([
            pool.request()
                .input('farmId', sql.Int, farmId)
                .query('SELECT ma_nong_trai, ten_nong_trai, dia_chi, tinh_thanh, hinh_anh FROM NongTrai WHERE ma_nong_trai = @farmId'),
            pool.request()
                .input('farmId', sql.Int, farmId)
                .query(`
                    SELECT o.ma_o_dat, o.ma_nong_trai, o.so_hieu_o, o.ten_o_dat, 
                           o.dien_tich_m2, o.gia_thue_thang, o.trang_thai, o.loai_dat,
                           o.position_x, o.position_y, o.hinh_anh_o_dat, o.mo_ta_chi_tiet,
                           n.ten_nong_trai, n.dia_chi AS dia_chi_nong_trai
                    FROM ODat o
                    LEFT JOIN NongTrai n ON n.ma_nong_trai = o.ma_nong_trai
                    WHERE o.ma_nong_trai = @farmId
                    ORDER BY o.so_hieu_o ASC
                `)
        ]);

        const farm = farmResult.recordset[0] || null;
        const formattedPlots = plotsResult.recordset.map(formatPlot);

        return res.json({
            success: true,
            farm,
            count: formattedPlots.length,
            data: formattedPlots
        });
    } catch (error) {
        console.error('Lỗi khi lấy ô đất bản đồ nông trại:', error);
        return res.status(500).json({ success: false, message: 'Lỗi server nội bộ' });
    }
};

module.exports = { getAllFarms, getFarmById, getPlotsByFarm, formatPlot };
