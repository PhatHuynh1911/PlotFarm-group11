const { sql, getPool } = require('../config/db');

// Lấy danh mục các loại dịch vụ chăm sóc
const getServiceTypes = async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`
            SELECT * FROM LoaiDichVu WHERE dang_hoat_dong = 1 ORDER BY ma_loai_dich_vu ASC
        `);

        res.status(200).json({
            success: true,
            count: result.recordset.length,
            data: result.recordset
        });
    } catch (error) {
        console.error('Lỗi lấy danh mục dịch vụ:', error);
        res.status(500).json({ success: false, message: 'Lỗi server nội bộ' });
    }
};

// Khách hàng gửi yêu cầu dịch vụ chăm sóc
const createServiceRequest = async (req, res) => {
    try {
        const { ma_hop_dong, ma_loai_dich_vu, ngay_yeu_cau_thuc_hien, ghi_chu_cua_khach } = req.body;
        const ma_khach_hang = Number(req.user.sub);

        if (!ma_hop_dong || !ma_khach_hang || !ma_loai_dich_vu) {
            return res.status(400).json({ success: false, message: 'Thiếu thông tin hợp đồng, khách hàng hoặc loại dịch vụ' });
        }

        const so_phieu = `YCDV-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
        const ngayThucHien = ngay_yeu_cau_thuc_hien || new Date().toISOString().split('T')[0];

        const pool = await getPool();
        const ownership = await pool.request()
            .input('contractId', sql.Int, parseInt(ma_hop_dong, 10))
            .input('customerId', sql.Int, parseInt(ma_khach_hang, 10))
            .query(`
                SELECT p.ma_nong_dan
                FROM HopDongThue h
                LEFT JOIN PhanCongNongDan p ON p.ma_hop_dong = h.ma_hop_dong AND p.trang_thai = 'da_chap_nhan'
                WHERE h.ma_hop_dong = @contractId AND h.ma_nguoi_dung = @customerId AND h.trang_thai_hop_dong = 'hieu_luc'
            `);
        const contract = ownership.recordset[0];
        if (!contract) return res.status(403).json({ success: false, message: 'Hợp đồng không thuộc tài khoản hoặc không còn hiệu lực' });
        if (!contract.ma_nong_dan) return res.status(400).json({ success: false, message: 'Ô đất này chưa có nông dân nhận phân công' });
        const result = await pool.request()
            .input('so_phieu', sql.VarChar(50), so_phieu)
            .input('ma_hop_dong', sql.Int, parseInt(ma_hop_dong, 10))
            .input('ma_khach_hang', sql.Int, parseInt(ma_khach_hang, 10))
            .input('ma_loai_dich_vu', sql.Int, parseInt(ma_loai_dich_vu, 10))
            .input('ngay_thuc_hien', sql.Date, ngayThucHien)
            .input('ghi_chu', sql.NVarChar(sql.MAX), ghi_chu_cua_khach || '')
            .input('farmerId', sql.Int, contract.ma_nong_dan)
            .query(`
                INSERT INTO YeuCauDichVu (so_phieu_yeu_cau, ma_hop_dong, ma_khach_hang, ma_loai_dich_vu, ma_nong_dan_phu_trach, ngay_yeu_cau_thuc_hien, ghi_chu_cua_khach, trang_thai_xu_ly)
                OUTPUT INSERTED.*
                VALUES (@so_phieu, @ma_hop_dong, @ma_khach_hang, @ma_loai_dich_vu, @farmerId, @ngay_thuc_hien, @ghi_chu, 'cho_tiep_nhan')
            `);

        res.status(201).json({
            success: true,
            message: 'Đã gửi yêu cầu chăm sóc thành công',
            data: result.recordset[0]
        });
    } catch (error) {
        console.error('Lỗi gửi yêu cầu chăm sóc:', error);
        res.status(500).json({ success: false, message: 'Lỗi server nội bộ' });
    }
};

// Lấy danh sách yêu cầu của khách hàng
const getRequestsByUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const pool = await getPool();
        const result = await pool.request()
            .input('userId', sql.Int, parseInt(userId, 10))
            .query(`
                SELECT y.*, d.ten_dich_vu, d.don_gia, d.don_vi_tinh,
                       o.so_hieu_o, o.ten_o_dat, u.ho_va_ten AS ten_nong_dan_xu_ly
                FROM YeuCauDichVu y
                LEFT JOIN LoaiDichVu d ON d.ma_loai_dich_vu = y.ma_loai_dich_vu
                JOIN HopDongThue h ON h.ma_hop_dong = y.ma_hop_dong
                JOIN ODat o ON o.ma_o_dat = h.ma_o_dat
                LEFT JOIN NguoiDung u ON u.ma_nguoi_dung = y.ma_nong_dan_phu_trach
                WHERE y.ma_khach_hang = @userId
                ORDER BY y.ngay_gui_yeu_cau DESC
            `);

        res.status(200).json({
            success: true,
            count: result.recordset.length,
            data: result.recordset
        });
    } catch (error) {
        console.error('Lỗi lấy danh sách yêu cầu của khách:', error);
        res.status(500).json({ success: false, message: 'Lỗi server nội bộ' });
    }
};

// Lấy toàn bộ yêu cầu (cho Nông dân & Admin)
const getAllRequests = async (req, res) => {
    try {
        const pool = await getPool();
        const request = pool.request();
        let farmerFilter = '';
        if (req.user?.role === 'nong_dan') {
            request.input('farmerId', sql.Int, Number(req.user.sub));
            farmerFilter = 'AND y.ma_nong_dan_phu_trach = @farmerId';
        }
        const result = await request.query(`
            SELECT y.*, d.ten_dich_vu, d.don_gia,
                   o.so_hieu_o, o.ten_o_dat,
                   k.ho_va_ten AS ten_khach_hang, k.so_dien_thoai AS sdt_khach_hang,
                   n.ho_va_ten AS ten_nong_dan_xu_ly
            FROM YeuCauDichVu y
            LEFT JOIN LoaiDichVu d ON d.ma_loai_dich_vu = y.ma_loai_dich_vu
            JOIN HopDongThue h ON h.ma_hop_dong = y.ma_hop_dong
            JOIN ODat o ON o.ma_o_dat = h.ma_o_dat
            JOIN NguoiDung k ON k.ma_nguoi_dung = y.ma_khach_hang
            LEFT JOIN NguoiDung n ON n.ma_nguoi_dung = y.ma_nong_dan_phu_trach
            WHERE 1 = 1 ${farmerFilter}
            ORDER BY y.ngay_gui_yeu_cau DESC
        `);

        res.status(200).json({
            success: true,
            count: result.recordset.length,
            data: result.recordset
        });
    } catch (error) {
        console.error('Lỗi lấy tất cả yêu cầu chăm sóc:', error);
        res.status(500).json({ success: false, message: 'Lỗi server nội bộ' });
    }
};

// Nông dân/Admin cập nhật trạng thái yêu cầu
const updateRequestStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, ma_nong_dan_xu_ly, phan_hoi_cua_nong_dan, phan_hoi_cua_nha_vuon, hinh_anh_nghiem_thu, chi_phi_phat_sinh } = req.body;

        if (!['cho_tiep_nhan', 'da_tiep_nhan', 'dang_thuc_hien', 'hoan_thanh', 'tu_choi'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Trạng thái yêu cầu không hợp lệ' });
        }

        const pool = await getPool();
        const access = await pool.request()
            .input('id', sql.Int, parseInt(id, 10))
            .input('farmerId', sql.Int, Number(req.user?.sub))
            .query(`SELECT ma_nong_dan_phu_trach FROM YeuCauDichVu WHERE ma_yeu_cau = @id`);
        if (!access.recordset[0]) return res.status(404).json({ success: false, message: 'Không tìm thấy yêu cầu chăm sóc' });
        if (req.user?.role === 'nong_dan' && access.recordset[0].ma_nong_dan_phu_trach !== Number(req.user.sub)) return res.status(403).json({ success: false, message: 'Bạn không được xử lý yêu cầu này' });
        await pool.request()
            .input('id', sql.Int, parseInt(id, 10))
            .input('status', sql.VarChar(20), status)
            .input('nongDanId', sql.Int, ma_nong_dan_xu_ly ? parseInt(ma_nong_dan_xu_ly, 10) : null)
            .input('phanHoi', sql.NVarChar(sql.MAX), phan_hoi_cua_nong_dan || phan_hoi_cua_nha_vuon || null)
            .input('hinhAnh', sql.VarChar(500), hinh_anh_nghiem_thu || null)
            .query(`
                UPDATE YeuCauDichVu 
                SET trang_thai_xu_ly = @status,
                    ma_nong_dan_phu_trach = COALESCE(@nongDanId, ma_nong_dan_phu_trach),
                    phan_hoi_cua_nha_vuon = COALESCE(@phanHoi, phan_hoi_cua_nha_vuon),
                    hinh_anh_nghiem_thu = COALESCE(@hinhAnh, hinh_anh_nghiem_thu),
                    ngay_hoan_thanh = CASE WHEN @status = 'hoan_thanh' THEN SYSDATETIME() ELSE ngay_hoan_thanh END
                WHERE ma_yeu_cau = @id
            `);

        res.status(200).json({
            success: true,
            message: 'Đã cập nhật trạng thái yêu cầu chăm sóc'
        });
    } catch (error) {
        console.error('Lỗi cập nhật yêu cầu:', error);
        res.status(500).json({ success: false, message: 'Lỗi server nội bộ' });
    }
};

module.exports = { getServiceTypes, createServiceRequest, getRequestsByUser, getAllRequests, updateRequestStatus };
