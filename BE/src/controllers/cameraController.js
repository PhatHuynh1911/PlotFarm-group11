const { sql, getPool } = require('../config/db');

// Lấy luồng phát trực tiếp camera theo mã ô đất hoặc số hiệu ô
const getStreamUrl = async (req, res) => {
    try {
        const { plotId } = req.params;
        const pool = await getPool();
        const isNumeric = /^\d+$/.test(plotId);

        let query = `
            SELECT c.*, o.so_hieu_o, o.ten_o_dat
            FROM CameraODat c
            JOIN ODat o ON o.ma_o_dat = c.ma_o_dat
            WHERE `;

        const request = pool.request();
        if (isNumeric) {
            query += `c.ma_o_dat = @plotId`;
            request.input('plotId', sql.Int, parseInt(plotId, 10));
        } else {
            query += `o.so_hieu_o = @plotId`;
            request.input('plotId', sql.VarChar(20), plotId.trim());
        }

        const result = await request.query(query);
        const camera = result.recordset[0];

        if (!camera) {
            // Trả về luồng mẫu mặc định nếu ô đất chưa gắn camera thực
            return res.status(200).json({
                success: true,
                message: 'Luồng camera mô phỏng theo thời gian thực',
                data: {
                    ma_camera: 0,
                    ten_camera: `Camera Giám Sát Ô ${plotId}`,
                    luong_truc_tuyen_url: `https://camera.plotfarm.vn/live/${plotId.toString().toLowerCase()}/index.m3u8`,
                    trang_thai: 'hoat_dong',
                    is_simulated: true
                }
            });
        }

        res.status(200).json({
            success: true,
            data: camera
        });
    } catch (error) {
        console.error('Lỗi khi lấy luồng camera:', error);
        res.status(500).json({ success: false, message: 'Lỗi server nội bộ' });
    }
};

// Lấy tất cả camera của ô đất
const getCameraByPlot = async (req, res) => {
    try {
        const { plotId } = req.params;
        const pool = await getPool();
        const isNumeric = /^\d+$/.test(plotId);

        let query = `SELECT * FROM CameraODat WHERE `;
        const request = pool.request();

        if (isNumeric) {
            query += `ma_o_dat = @plotId`;
            request.input('plotId', sql.Int, parseInt(plotId, 10));
        } else {
            query += `ma_o_dat IN (SELECT ma_o_dat FROM ODat WHERE so_hieu_o = @plotId)`;
            request.input('plotId', sql.VarChar(20), plotId.trim());
        }

        const result = await request.query(query);
        res.status(200).json({
            success: true,
            count: result.recordset.length,
            data: result.recordset
        });
    } catch (error) {
        console.error('Lỗi lấy camera:', error);
        res.status(500).json({ success: false, message: 'Lỗi server nội bộ' });
    }
};

module.exports = { getStreamUrl, getCameraByPlot };
