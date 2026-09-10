const { sql, getPool } = require('../config/db');

// Lấy danh sách cây trồng
const getAllCrops = async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`
            SELECT c.*, d.ten_danh_muc
            FROM CayTrong c
            LEFT JOIN DanhMucCayTrong d ON d.ma_danh_muc = c.ma_danh_muc
            ORDER BY c.ten_cay_trong ASC
        `);

        res.status(200).json({
            success: true,
            count: result.recordset.length,
            data: result.recordset
        });
    } catch (error) {
        console.error('Lỗi khi lấy danh sách cây trồng:', error);
        res.status(500).json({ success: false, message: 'Lỗi server nội bộ' });
    }
};

// Chi tiết một loại cây trồng
const getCropById = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await getPool();
        const result = await pool.request()
            .input('id', sql.Int, parseInt(id, 10))
            .query(`
                SELECT c.*, d.ten_danh_muc 
                FROM CayTrong c
                LEFT JOIN DanhMucCayTrong d ON d.ma_danh_muc = c.ma_danh_muc
                WHERE c.ma_cay_trong = @id
            `);

        const crop = result.recordset[0];
        if (!crop) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy loại cây trồng' });
        }

        res.status(200).json({
            success: true,
            data: crop
        });
    } catch (error) {
        console.error('Lỗi khi lấy chi tiết cây trồng:', error);
        res.status(500).json({ success: false, message: 'Lỗi server nội bộ' });
    }
};

module.exports = { getAllCrops, getCropById };
