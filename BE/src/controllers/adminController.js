const { sql, getPool } = require('../config/db');

const dashboard = async (req, res) => {
    try {
        const pool = await getPool();
        const [stats, monthly] = await Promise.all([
            pool.request().query(`
                SELECT
                    (SELECT COUNT(*) FROM NguoiDung) AS totalUsers,
                    (SELECT COUNT(*) FROM NguoiDung WHERE trang_thai = 'hoat_dong') AS activeUsers,
                    (SELECT COUNT(*) FROM ODAT WHERE trang_thai = 'trong') AS availablePlots,
                    (SELECT COUNT(*) FROM ODAT WHERE trang_thai = 'da_thue') AS rentedPlots,
                    (SELECT COALESCE(SUM(tong_dien_tich_ha), 0) FROM NongTrai WHERE trang_thai = 'hoat_dong') AS greenAreaHa,
                    (SELECT COUNT(*) FROM HopDongThue WHERE trang_thai_hop_dong = 'hieu_luc') AS activeContracts,
                    (SELECT COALESCE(SUM(tong_tien), 0) FROM HopDongThue WHERE trang_thai_thanh_toan = 'da_thanh_toan') AS revenue,
                    (SELECT COUNT(*) FROM YeuCauDichVu WHERE trang_thai_xu_ly IN ('cho_tiep_nhan', 'da_tiep_nhan')) AS pendingRequests
            `),
            pool.request().query(`
                SELECT TOP 6 FORMAT(ngay_tao, 'MM/yyyy') AS month,
                       COALESCE(SUM(tong_tien), 0) AS revenue,
                       COUNT(*) AS rentals
                FROM HopDongThue
                WHERE trang_thai_thanh_toan = 'da_thanh_toan'
                GROUP BY FORMAT(ngay_tao, 'MM/yyyy'), YEAR(ngay_tao), MONTH(ngay_tao)
                ORDER BY YEAR(ngay_tao) DESC, MONTH(ngay_tao) DESC
            `)
        ]);
        return res.json({ success: true, data: { ...stats.recordset[0], monthly: monthly.recordset.reverse() } });
    } catch (error) {
        console.error('Lỗi báo cáo admin:', error);
        return res.status(500).json({ success: false, message: 'Không thể tải báo cáo quản trị' });
    }
};

const users = async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`
            SELECT ma_nguoi_dung AS id, ho_va_ten AS name, email, vai_tro AS role,
                   trang_thai AS status, ngay_tao AS createdAt
            FROM NguoiDung ORDER BY ngay_tao DESC
        `);
        return res.json({ success: true, data: result.recordset });
    } catch (error) { return res.status(500).json({ success: false, message: 'Không thể tải danh sách người dùng' }); }
};

const updateUser = async (req, res) => {
    try {
        const { status } = req.body;
        if (!['hoat_dong', 'bi_khoa'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Trạng thái không hợp lệ' });
        }
        const pool = await getPool();
        await pool.request().input('id', sql.Int, Number(req.params.id)).input('status', sql.VarChar(20), status)
            .query(`UPDATE NguoiDung SET trang_thai = @status, ngay_cap_nhat = SYSDATETIME() WHERE ma_nguoi_dung = @id`);
        return res.json({ success: true, message: 'Đã cập nhật tài khoản' });
    } catch (error) { return res.status(500).json({ success: false, message: 'Không thể cập nhật tài khoản' }); }
};

const plots = async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`SELECT ma_o_dat AS id, ma_nong_trai AS farmId, so_hieu_o AS code, ten_o_dat AS name, dien_tich_m2 AS area, gia_thue_thang AS price, trang_thai AS status, mo_ta_chi_tiet AS description FROM ODat ORDER BY so_hieu_o`);
        return res.json({ success: true, data: result.recordset });
    } catch (error) { return res.status(500).json({ success: false, message: 'Không thể tải danh sách ô đất' }); }
};

const createPlot = async (req, res) => {
    try {
        const { farmId, code, name, area, price, status = 'trong', description = '' } = req.body;
        if (!farmId || !code || !name || !area || !price) return res.status(400).json({ success: false, message: 'Vui lòng nhập đủ thông tin ô đất' });
        const pool = await getPool();
        await pool.request().input('farmId', sql.Int, farmId).input('code', sql.VarChar(20), code).input('name', sql.NVarChar(100), name).input('area', sql.Decimal(6, 2), area).input('price', sql.Decimal(14, 2), price).input('status', sql.VarChar(20), status).input('description', sql.NVarChar(sql.MAX), description)
            .query(`INSERT INTO ODat (ma_nong_trai, so_hieu_o, ten_o_dat, dien_tich_m2, gia_thue_thang, trang_thai, mo_ta_chi_tiet) VALUES (@farmId, @code, @name, @area, @price, @status, @description)`);
        return res.status(201).json({ success: true, message: 'Đã thêm ô đất' });
    } catch (error) { return res.status(500).json({ success: false, message: 'Không thể thêm ô đất' }); }
};

const updatePlot = async (req, res) => {
    try {
        const { code, name, area, price, status, description = '' } = req.body;
        const pool = await getPool();
        await pool.request().input('id', sql.Int, Number(req.params.id)).input('code', sql.VarChar(20), code).input('name', sql.NVarChar(100), name).input('area', sql.Decimal(6, 2), area).input('price', sql.Decimal(14, 2), price).input('status', sql.VarChar(20), status).input('description', sql.NVarChar(sql.MAX), description)
            .query(`UPDATE ODat SET so_hieu_o = @code, ten_o_dat = @name, dien_tich_m2 = @area, gia_thue_thang = @price, trang_thai = @status, mo_ta_chi_tiet = @description, ngay_cap_nhat = SYSDATETIME() WHERE ma_o_dat = @id`);
        return res.json({ success: true, message: 'Đã cập nhật ô đất' });
    } catch (error) { return res.status(500).json({ success: false, message: 'Không thể cập nhật ô đất' }); }
};

const rentals = async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`
            SELECT h.ma_hop_dong AS id, h.so_hop_dong AS code, h.tong_tien AS total,
                   h.trang_thai_hop_dong AS status, h.trang_thai_thanh_toan AS paymentStatus,
                   h.ngay_tao AS createdAt, u.ho_va_ten AS customer, o.so_hieu_o AS plot
            FROM HopDongThue h JOIN NguoiDung u ON u.ma_nguoi_dung = h.ma_nguoi_dung
            JOIN ODat o ON o.ma_o_dat = h.ma_o_dat ORDER BY h.ngay_tao DESC
        `);
        return res.json({ success: true, data: result.recordset });
    } catch (error) { return res.status(500).json({ success: false, message: 'Không thể tải đơn thuê' }); }
};

const requests = async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`
            SELECT y.ma_yeu_cau AS id, y.so_phieu_yeu_cau AS code, y.ngay_yeu_cau_thuc_hien AS scheduledAt,
                   y.trang_thai_xu_ly AS status, y.ghi_chu_cua_khach AS note, u.ho_va_ten AS customer,
                   d.ten_dich_vu AS service, o.so_hieu_o AS plot
            FROM YeuCauDichVu y JOIN NguoiDung u ON u.ma_nguoi_dung = y.ma_khach_hang
            LEFT JOIN LoaiDichVu d ON d.ma_loai_dich_vu = y.ma_loai_dich_vu
            JOIN HopDongThue h ON h.ma_hop_dong = y.ma_hop_dong JOIN ODat o ON o.ma_o_dat = h.ma_o_dat
            ORDER BY y.ngay_gui_yeu_cau DESC
        `);
        return res.json({ success: true, data: result.recordset });
    } catch (error) { return res.status(500).json({ success: false, message: 'Không thể tải yêu cầu chăm sóc' }); }
};

const updateRequest = async (req, res) => {
    try {
        const { status } = req.body;
        if (!['cho_tiep_nhan', 'da_tiep_nhan', 'dang_thuc_hien', 'hoan_thanh', 'tu_choi'].includes(status)) return res.status(400).json({ success: false, message: 'Trạng thái yêu cầu không hợp lệ' });
        const pool = await getPool();
        await pool.request().input('id', sql.Int, Number(req.params.id)).input('status', sql.VarChar(20), status).query(`UPDATE YeuCauDichVu SET trang_thai_xu_ly = @status, ngay_hoan_thanh = CASE WHEN @status = 'hoan_thanh' THEN SYSDATETIME() ELSE ngay_hoan_thanh END WHERE ma_yeu_cau = @id`);
        return res.json({ success: true, message: 'Đã cập nhật yêu cầu' });
    } catch (error) { return res.status(500).json({ success: false, message: 'Không thể cập nhật yêu cầu' }); }
};

module.exports = { dashboard, users, updateUser, plots, createPlot, updatePlot, rentals, requests, updateRequest };
