const { sql, getPool } = require('../config/db');

const dashboard = async (req, res) => {
    try {
        const pool = await getPool();
        const [stats, monthly] = await Promise.all([
            pool.request().query(`
                SELECT
                    (SELECT COUNT(*) FROM NguoiDung) AS totalUsers,
                    (SELECT COUNT(*) FROM NguoiDung WHERE trang_thai = 'hoat_dong') AS activeUsers,
                    (SELECT COUNT(*) FROM NguoiDung WHERE vai_tro = 'nong_dan' AND trang_thai = 'hoat_dong') AS totalFarmers,
                    (SELECT COUNT(*) FROM ODAT WHERE trang_thai = 'trong') AS availablePlots,
                    (SELECT COUNT(*) FROM ODAT WHERE trang_thai = 'da_thue') AS rentedPlots,
                    (SELECT COUNT(*) FROM HopDongThue WHERE ngay_tao >= DATEADD(day, -7, SYSDATETIME())) AS newOrders,
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

const formatAdminPlot = (row) => {
    const rawImage = row.hinh_anh_o_dat || row.image_url || row.image || null;
    const posX = row.position_x != null ? Number(row.position_x) : 50.0;
    const posY = row.position_y != null ? Number(row.position_y) : 50.0;
    return {
        id: row.ma_o_dat || row.id,
        farmId: row.ma_nong_trai || row.farmId,
        code: row.so_hieu_o || row.code,
        name: row.ten_o_dat || row.name,
        area: Number(row.dien_tich_m2 != null ? row.dien_tich_m2 : row.area),
        price: Number(row.gia_thue_thang != null ? row.gia_thue_thang : row.price),
        status: row.trang_thai || row.status,
        image: rawImage,
        image_url: rawImage,
        hinh_anh_o_dat: rawImage,
        position_x: posX,
        position_y: posY,
        coord_x: posX,
        coord_y: posY,
        description: row.mo_ta_chi_tiet || row.description || ''
    };
};

const plots = async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`
            SELECT ma_o_dat, ma_nong_trai, so_hieu_o, ten_o_dat, 
                   dien_tich_m2, gia_thue_thang, trang_thai, 
                   hinh_anh_o_dat, position_x, position_y, mo_ta_chi_tiet 
            FROM ODat 
            ORDER BY so_hieu_o
        `);
        const formatted = result.recordset.map(formatAdminPlot);
        return res.json({ success: true, data: formatted });
    } catch (error) { 
        console.error('Lỗi tải danh sách ô đất:', error);
        return res.status(500).json({ success: false, message: 'Không thể tải danh sách ô đất' }); 
    }
};

const createPlot = async (req, res) => {
    try {
        const { farmId, code, name, area, price, status = 'trong', description = '', position_x, position_y } = req.body;
        if (!farmId || !code || !name || !area || !price) {
            return res.status(400).json({ success: false, message: 'Vui lòng nhập đủ thông tin ô đất' });
        }
        const pool = await getPool();
        const image = req.file ? `/uploads/${req.file.filename}` : (req.body.image || req.body.image_url || req.body.hinh_anh_o_dat || null);
        const posX = position_x != null ? Number(position_x) : 50.0;
        const posY = position_y != null ? Number(position_y) : 50.0;

        const result = await pool.request()
            .input('farmId', sql.Int, Number(farmId))
            .input('code', sql.VarChar(20), code)
            .input('name', sql.NVarChar(100), name)
            .input('area', sql.Decimal(6, 2), Number(area))
            .input('price', sql.Decimal(14, 2), Number(price))
            .input('status', sql.VarChar(20), status)
            .input('image', sql.VarChar(500), image)
            .input('posX', sql.Decimal(5, 2), posX)
            .input('posY', sql.Decimal(5, 2), posY)
            .input('description', sql.NVarChar(sql.MAX), description)
            .query(`
                INSERT INTO ODat (ma_nong_trai, so_hieu_o, ten_o_dat, dien_tich_m2, gia_thue_thang, trang_thai, hinh_anh_o_dat, position_x, position_y, mo_ta_chi_tiet)
                OUTPUT INSERTED.*
                VALUES (@farmId, @code, @name, @area, @price, @status, @image, @posX, @posY, @description)
            `);

        const newPlot = formatAdminPlot(result.recordset[0]);
        return res.status(201).json({ success: true, message: 'Đã thêm ô đất', data: newPlot });
    } catch (error) { 
        console.error('Lỗi thêm ô đất:', error);
        return res.status(500).json({ success: false, message: 'Không thể thêm ô đất' }); 
    }
};

const updatePlot = async (req, res) => {
    try {
        const { code, name, area, price, status, description = '', position_x, position_y } = req.body;
        const pool = await getPool();
        const image = req.file ? `/uploads/${req.file.filename}` : (req.body.image || req.body.image_url || req.body.hinh_anh_o_dat || null);

        const request = pool.request()
            .input('id', sql.Int, Number(req.params.id))
            .input('code', sql.VarChar(20), code)
            .input('name', sql.NVarChar(100), name)
            .input('area', sql.Decimal(6, 2), area != null ? Number(area) : null)
            .input('price', sql.Decimal(14, 2), price != null ? Number(price) : null)
            .input('status', sql.VarChar(20), status)
            .input('image', sql.VarChar(500), image)
            .input('posX', sql.Decimal(5, 2), position_x != null ? Number(position_x) : null)
            .input('posY', sql.Decimal(5, 2), position_y != null ? Number(position_y) : null)
            .input('description', sql.NVarChar(sql.MAX), description);

        const result = await request.query(`
            UPDATE ODat 
            SET so_hieu_o = COALESCE(@code, so_hieu_o),
                ten_o_dat = COALESCE(@name, ten_o_dat),
                dien_tich_m2 = COALESCE(@area, dien_tich_m2),
                gia_thue_thang = COALESCE(@price, gia_thue_thang),
                trang_thai = COALESCE(@status, trang_thai),
                hinh_anh_o_dat = COALESCE(@image, hinh_anh_o_dat),
                position_x = COALESCE(@posX, position_x),
                position_y = COALESCE(@posY, position_y),
                mo_ta_chi_tiet = COALESCE(@description, mo_ta_chi_tiet),
                ngay_cap_nhat = SYSDATETIME()
            OUTPUT INSERTED.*
            WHERE ma_o_dat = @id
        `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy ô đất' });
        }

        const updatedPlot = formatAdminPlot(result.recordset[0]);
        return res.json({ success: true, message: 'Đã cập nhật ô đất', data: updatedPlot });
    } catch (error) { 
        console.error('Lỗi cập nhật ô đất:', error);
        return res.status(500).json({ success: false, message: 'Không thể cập nhật ô đất' }); 
    }
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
        const [services, contacts] = await Promise.all([
            pool.request().query(`
                SELECT y.ma_yeu_cau AS id, y.so_phieu_yeu_cau AS code, y.ngay_yeu_cau_thuc_hien AS scheduledAt,
                       y.ngay_gui_yeu_cau AS createdAt, y.trang_thai_xu_ly AS status, y.ghi_chu_cua_khach AS note,
                       u.ho_va_ten AS customer, d.ten_dich_vu AS service, o.so_hieu_o AS plot, 'service' AS source
                FROM YeuCauDichVu y JOIN NguoiDung u ON u.ma_nguoi_dung = y.ma_khach_hang
                LEFT JOIN LoaiDichVu d ON d.ma_loai_dich_vu = y.ma_loai_dich_vu
                JOIN HopDongThue h ON h.ma_hop_dong = y.ma_hop_dong JOIN ODat o ON o.ma_o_dat = h.ma_o_dat
            `),
            pool.request().query(`
                SELECT l.ma_lien_he AS id, CONCAT('TV-', l.ma_lien_he) AS code, l.ngay_gui AS scheduledAt,
                       l.ngay_gui AS createdAt, l.trang_thai_lien_he AS status, l.noi_dung_tu_van AS note,
                       l.ho_va_ten AS customer, N'Tư vấn miễn phí' AS service,
                       COALESCE(l.so_hieu_o_quan_tam, N'Khách vãng lai') AS plot, 'contact' AS source
                FROM LienHeTuVan l
            `)
        ]);
        const data = [...services.recordset, ...contacts.recordset].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        return res.json({ success: true, data });
    } catch (error) { return res.status(500).json({ success: false, message: 'Không thể tải yêu cầu chăm sóc' }); }
};

const updateRequest = async (req, res) => {
    try {
        const { status, source = 'service' } = req.body;
        const pool = await getPool();
        if (source === 'contact') {
            if (!['moi', 'da_lien_he', 'thanh_cong', 'that_bai'].includes(status)) return res.status(400).json({ success: false, message: 'Trạng thái liên hệ không hợp lệ' });
            await pool.request().input('id', sql.Int, Number(req.params.id)).input('status', sql.VarChar(20), status).query(`UPDATE LienHeTuVan SET trang_thai_lien_he = @status, ngay_cap_nhat = SYSDATETIME() WHERE ma_lien_he = @id`);
        } else {
            if (!['cho_tiep_nhan', 'da_tiep_nhan', 'dang_thuc_hien', 'hoan_thanh', 'tu_choi'].includes(status)) return res.status(400).json({ success: false, message: 'Trạng thái yêu cầu không hợp lệ' });
            await pool.request().input('id', sql.Int, Number(req.params.id)).input('status', sql.VarChar(20), status).query(`UPDATE YeuCauDichVu SET trang_thai_xu_ly = @status, ngay_hoan_thanh = CASE WHEN @status = 'hoan_thanh' THEN SYSDATETIME() ELSE ngay_hoan_thanh END WHERE ma_yeu_cau = @id`);
        }
        return res.json({ success: true, message: 'Đã cập nhật yêu cầu' });
    } catch (error) { return res.status(500).json({ success: false, message: 'Không thể cập nhật yêu cầu' }); }
};

module.exports = { dashboard, users, updateUser, plots, createPlot, updatePlot, rentals, requests, updateRequest };
