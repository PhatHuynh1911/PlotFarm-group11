const { sql, getPool } = require('../config/db');
const { createNotification, notifyAdmins } = require('./notificationController');

/**
 * Nông dân bấm nút "Sẵn sàng thu hoạch" cho một ô đất / hợp đồng
 * POST /api/harvest/ready hoặc POST /api/rentals/:id/ready-to-harvest hoặc POST /api/plots/:id/ready-to-harvest
 */
const readyToHarvest = async (req, res) => {
    try {
        const pool = await getPool();
        const body = req.body || {};
        const paramId = req.params.id || body.rentalId || body.plotId || body.ma_hop_dong || body.ma_o_dat;
        
        if (!paramId) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng cung cấp mã hợp đồng hoặc mã ô đất'
            });
        }

        // Tìm hợp đồng đang hiệu lực dựa trên ID (có thể là ma_hop_dong hoặc ma_o_dat hoặc so_hieu_o)
        let rentalQuery = await pool.request()
            .input('paramId', sql.VarChar(50), String(paramId))
            .query(`
                SELECT TOP 1 
                    h.ma_hop_dong, h.ma_o_dat, h.ma_nguoi_dung, h.trang_thai_hop_dong, 
                    h.trang_thai_canh_tac, h.ngay_bat_dau, h.ngay_ket_thuc,
                    o.so_hieu_o, o.ten_o_dat, o.dien_tich_m2,
                    u.ho_va_ten AS ten_khach_hang, u.email AS email_khach_hang,
                    c.ten_cay_trong, c.nang_suat_du_kien_kg_m2
                FROM HopDongThue h
                JOIN ODat o ON o.ma_o_dat = h.ma_o_dat
                JOIN NguoiDung u ON u.ma_nguoi_dung = h.ma_nguoi_dung
                LEFT JOIN CayTrong c ON c.ma_cay_trong = h.ma_cay_trong
                WHERE (
                    h.ma_hop_dong = TRY_CAST(@paramId AS INT) 
                    OR h.ma_o_dat = TRY_CAST(@paramId AS INT)
                    OR o.so_hieu_o = @paramId
                )
                AND h.trang_thai_hop_dong = 'hieu_luc'
                ORDER BY h.ngay_tao DESC
            `);

        const rental = rentalQuery.recordset[0];
        if (!rental) {
            return res.status(404).json({
                success: false,
                message: `Không tìm thấy hợp đồng thuê đang hiệu lực cho định danh [${paramId}]`
            });
        }

        const rentalId = rental.ma_hop_dong;
        const customerId = rental.ma_nguoi_dung;
        const plotCode = rental.so_hieu_o;

        // Xác định nông dân phụ trách (từ bảng PhanCongNongDan hoặc từ req.user nếu là nong_dan, hoặc mặc định)
        let farmerId = req.user && req.user.role === 'nong_dan' ? Number(req.user.sub) : null;
        if (!farmerId) {
            const assignmentCheck = await pool.request()
                .input('rentalId', sql.Int, rentalId)
                .query(`
                    SELECT TOP 1 ma_nong_dan 
                    FROM PhanCongNongDan 
                    WHERE ma_hop_dong = @rentalId AND trang_thai = 'da_chap_nhan'
                    ORDER BY ngay_phan_hoi DESC
                `);
            if (assignmentCheck.recordset[0]) {
                farmerId = assignmentCheck.recordset[0].ma_nong_dan;
            } else {
                // Lấy 1 nông dân bất kỳ trong hệ thống làm người phụ trách
                const anyFarmer = await pool.request().query(`
                    SELECT TOP 1 ma_nguoi_dung FROM NguoiDung WHERE vai_tro = 'nong_dan' AND trang_thai = 'hoat_dong'
                `);
                farmerId = anyFarmer.recordset[0]?.ma_nguoi_dung || 2;
            }
        }

        // Cập nhật trạng thái canh tác của Hợp đồng sang 'san_sang_thu_hoach'
        await pool.request()
            .input('rentalId', sql.Int, rentalId)
            .query(`
                UPDATE HopDongThue
                SET trang_thai_canh_tac = 'san_sang_thu_hoach',
                    ngay_cap_nhat = SYSDATETIME()
                WHERE ma_hop_dong = @rentalId
            `);

        // Tính sản lượng ước tính nếu có
        const estimatedYield = Number(body.san_luong_du_kien) 
            || Number(body.san_luong_thuc_te_kg) 
            || (Number(rental.nang_suat_du_kien_kg_m2 || 1) * Number(rental.dien_tich_m2 || 15)) 
            || 15.0;

        // Kiểm tra xem đã có bản ghi trong dbo.ThuHoach chưa
        const checkHarvest = await pool.request()
            .input('rentalId', sql.Int, rentalId)
            .query(`
                SELECT TOP 1 ma_thu_hoach, trang_thai 
                FROM dbo.ThuHoach 
                WHERE ma_hop_dong = @rentalId
            `);

        let harvestRecord;
        if (checkHarvest.recordset[0]) {
            // Đã có bản ghi -> Cập nhật trạng thái sang 'cho_thu_hoach' nếu chưa hoàn thành
            const updateHarvest = await pool.request()
                .input('harvestId', sql.Int, checkHarvest.recordset[0].ma_thu_hoach)
                .input('farmerId', sql.Int, farmerId)
                .input('yield', sql.Decimal(8, 2), estimatedYield)
                .query(`
                    UPDATE dbo.ThuHoach
                    SET ma_nong_dan = @farmerId,
                        san_luong_thuc_te_kg = @yield,
                        trang_thai = CASE WHEN trang_thai = 'da_thu_hoach' THEN trang_thai ELSE 'cho_thu_hoach' END
                    OUTPUT INSERTED.*
                    WHERE ma_thu_hoach = @harvestId
                `);
            harvestRecord = updateHarvest.recordset[0];
        } else {
            // Tạo mới bản ghi trong dbo.ThuHoach
            const insertHarvest = await pool.request()
                .input('rentalId', sql.Int, rentalId)
                .input('farmerId', sql.Int, farmerId)
                .input('harvestDate', sql.Date, new Date())
                .input('yield', sql.Decimal(8, 2), estimatedYield)
                .input('loss', sql.Decimal(8, 2), 0.0)
                .input('quality', sql.VarChar(10), body.phan_loai_chat_luong || 'Loai_A')
                .input('storage', sql.NVarChar(100), body.phuong_thuc_bao_quan || 'Bảo quản mát 10-15 độ C')
                .input('package', sql.NVarChar(100), body.quy_cach_dong_goi || 'Thùng carton tiêu chuẩn PlotFarm')
                .input('notes', sql.NVarChar(500), body.ghi_chu || `Nông dân đã xác nhận vụ mùa sẵn sàng thu hoạch cho ô ${plotCode}.`)
                .input('image', sql.VarChar(500), body.hinh_anh_thanh_pham || 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80')
                .input('status', sql.VarChar(20), 'cho_thu_hoach')
                .query(`
                    INSERT INTO dbo.ThuHoach (
                        ma_hop_dong, ma_nong_dan, ngay_thu_hoach,
                        san_luong_thuc_te_kg, san_luong_hao_hut_kg, phan_loai_chat_luong,
                        phuong_thuc_bao_quan, quy_cach_dong_goi, ghi_chu,
                        hinh_anh_thanh_pham, trang_thai, ngay_tao
                    )
                    OUTPUT INSERTED.*
                    VALUES (
                        @rentalId, @farmerId, @harvestDate,
                        @yield, @loss, @quality,
                        @storage, @package, @notes,
                        @image, @status, SYSDATETIME()
                    )
                `);
            harvestRecord = insertHarvest.recordset[0];
        }

        // Đồng bộ thêm vào bảng GiaoNhanThuHoach (nếu bảng tồn tại)
        try {
            const checkGNT = await pool.request()
                .input('rentalId', sql.Int, rentalId)
                .query(`SELECT ma_giao_nhan FROM GiaoNhanThuHoach WHERE ma_hop_dong = @rentalId`);
            if (!checkGNT.recordset[0]) {
                await pool.request()
                    .input('rentalId', sql.Int, rentalId)
                    .input('farmerId', sql.Int, farmerId)
                    .query(`INSERT INTO GiaoNhanThuHoach (ma_hop_dong, ma_nong_dan) VALUES (@rentalId, @farmerId)`);
            }
        } catch (_) {}

        // Bắn thông báo cho Khách hàng
        await createNotification(
            customerId,
            `Nông sản ô đất ${plotCode} đã sẵn sàng thu hoạch! 🌾`,
            `Vụ mùa của bạn tại ô ${plotCode} đã đến kỳ thu hoạch. Hãy truy cập tab "Quản lý thu hoạch" để chọn hình thức nhận tại nông trại hoặc giao tận nơi.`,
            'thu_hoach',
            '/user?tab=harvest'
        );

        // Bắn thông báo cho toàn bộ Admin
        await notifyAdmins(
            `Ô đất ${plotCode} đã sẵn sàng thu hoạch`,
            `Nông dân đã xác nhận sẵn sàng thu hoạch cho hợp đồng #${rentalId} (Ô ${plotCode} - Khách: ${rental.ten_khach_hang}).`,
            'thu_hoach',
            '/admin?tab=rentals'
        );

        return res.status(200).json({
            success: true,
            message: `Ô đất ${plotCode} đã chuyển sang trạng thái sẵn sàng thu hoạch thành công!`,
            data: {
                rentalId,
                plotCode,
                trang_thai_canh_tac: 'san_sang_thu_hoach',
                harvest: harvestRecord
            }
        });
    } catch (error) {
        console.error('Lỗi khi kích hoạt sẵn sàng thu hoạch:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi máy chủ nội bộ khi xử lý sẵn sàng thu hoạch',
            error: error.message
        });
    }
};

/**
 * Khách hàng đăng ký hình thức nhận nông sản (tại vườn hoặc giao tận nơi)
 * POST /api/harvest/delivery hoặc POST /api/rentals/:id/harvest-delivery
 */
const registerDelivery = async (req, res) => {
    try {
        const pool = await getPool();
        const {
            ma_hop_dong,
            rentalId,
            ma_thu_hoach,
            hinh_thuc_nhan_hang, // 'giao_tan_noi' hoặc 'nhan_tai_vuon' / 'Nhận tại nông trại' / 'Giao tận nơi'
            ten_nguoi_nhan,
            so_dien_thoai_nguoi_nhan,
            dia_chi_giao_hang,
            tinh_thanh,
            quan_huyen,
            ghi_chu
        } = req.body;

        const targetRentalId = parseInt(req.params.id || ma_hop_dong || rentalId, 10);
        
        // Tìm thông tin hợp đồng và bản ghi thu hoạch
        let harvestId = parseInt(ma_thu_hoach, 10);
        let rental = null;

        if (targetRentalId) {
            const rentalRes = await pool.request()
                .input('rentalId', sql.Int, targetRentalId)
                .query(`
                    SELECT h.ma_hop_dong, h.ma_nguoi_dung, o.so_hieu_o, u.ho_va_ten, u.so_dien_thoai
                    FROM HopDongThue h
                    JOIN ODat o ON o.ma_o_dat = h.ma_o_dat
                    JOIN NguoiDung u ON u.ma_nguoi_dung = h.ma_nguoi_dung
                    WHERE h.ma_hop_dong = @rentalId
                `);
            rental = rentalRes.recordset[0];
            
            if (!harvestId && rental) {
                const harvestRes = await pool.request()
                    .input('rentalId', sql.Int, targetRentalId)
                    .query(`SELECT TOP 1 ma_thu_hoach FROM dbo.ThuHoach WHERE ma_hop_dong = @rentalId ORDER BY ma_thu_hoach DESC`);
                if (harvestRes.recordset[0]) {
                    harvestId = harvestRes.recordset[0].ma_thu_hoach;
                }
            }
        }

        if (!harvestId) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đợt thu hoạch tương ứng để đăng ký nhận hàng. Vui lòng đảm bảo ô đất đã được báo sẵn sàng thu hoạch.'
            });
        }

        const customerId = req.user?.sub ? Number(req.user.sub) : (rental?.ma_nguoi_dung || 1);
        
        // Chuẩn hóa hình thức nhận hàng
        let shippingType = 'giao_tan_noi';
        if (hinh_thuc_nhan_hang === 'nhan_tai_vuon' || hinh_thuc_nhan_hang === 'Nhận tại nông trại') {
            shippingType = 'nhan_tai_vuon';
        }

        // Tạo chuỗi địa chỉ đầy đủ
        let fullAddress = dia_chi_giao_hang || '';
        if (shippingType === 'nhan_tai_vuon') {
            fullAddress = 'Nhận trực tiếp tại Nông trại PlotFarm Củ Chi, TP. Hồ Chí Minh';
        } else {
            const parts = [dia_chi_giao_hang, quan_huyen, tinh_thanh].filter(Boolean);
            if (parts.length > 1) {
                fullAddress = parts.join(', ');
            }
        }

        const recipientName = ten_nguoi_nhan || rental?.ho_va_ten || 'Khách hàng PlotFarm';
        const recipientPhone = so_dien_thoai_nguoi_nhan || rental?.so_dien_thoai || '';

        // Kiểm tra xem đã có bản ghi GiaoHang cho đợt thu hoạch này chưa (ma_thu_hoach là UNIQUE)
        const checkDelivery = await pool.request()
            .input('harvestId', sql.Int, harvestId)
            .query(`SELECT ma_giao_hang FROM dbo.GiaoHang WHERE ma_thu_hoach = @harvestId`);

        let deliveryRecord;
        if (checkDelivery.recordset[0]) {
            const updateRes = await pool.request()
                .input('deliveryId', sql.Int, checkDelivery.recordset[0].ma_giao_hang)
                .input('shippingType', sql.VarChar(30), shippingType)
                .input('recipientName', sql.NVarChar(100), recipientName)
                .input('recipientPhone', sql.VarChar(20), recipientPhone)
                .input('deliveryAddress', sql.NVarChar(255), fullAddress)
                .input('notes', sql.NVarChar(500), ghi_chu || null)
                .query(`
                    UPDATE dbo.GiaoHang
                    SET hinh_thuc_nhan_hang = @shippingType,
                        ten_nguoi_nhan = @recipientName,
                        so_dien_thoai_nguoi_nhan = @recipientPhone,
                        dia_chi_giao_hang = @deliveryAddress,
                        ghi_chu_giao_hang = @notes
                    OUTPUT INSERTED.*
                    WHERE ma_giao_hang = @deliveryId
                `);
            deliveryRecord = updateRes.recordset[0];
        } else {
            const insertRes = await pool.request()
                .input('harvestId', sql.Int, harvestId)
                .input('customerId', sql.Int, customerId)
                .input('shippingType', sql.VarChar(30), shippingType)
                .input('recipientName', sql.NVarChar(100), recipientName)
                .input('recipientPhone', sql.VarChar(20), recipientPhone)
                .input('deliveryAddress', sql.NVarChar(255), fullAddress)
                .input('shippingFee', sql.Decimal(14, 2), 0.0)
                .input('notes', sql.NVarChar(500), ghi_chu || null)
                .query(`
                    INSERT INTO dbo.GiaoHang (
                        ma_thu_hoach, ma_khach_hang, hinh_thuc_nhan_hang,
                        ten_nguoi_nhan, so_dien_thoai_nguoi_nhan, dia_chi_giao_hang,
                        phi_van_chuyen, trang_thai_giao_hang, ghi_chu_giao_hang, ngay_tao
                    )
                    OUTPUT INSERTED.*
                    VALUES (
                        @harvestId, @customerId, @shippingType,
                        @recipientName, @recipientPhone, @deliveryAddress,
                        @shippingFee, 'cho_giao', @notes, SYSDATETIME()
                    )
                `);
            deliveryRecord = insertRes.recordset[0];
        }

        // Bắn thông báo cho Admin
        const plotCode = rental?.so_hieu_o || 'ô đất';
        await notifyAdmins(
            `Đăng ký nhận nông sản: Ô ${plotCode}`,
            `Khách hàng ${recipientName} đã đăng ký hình thức: ${shippingType === 'nhan_tai_vuon' ? 'Nhận tại nông trại' : 'Giao tận nơi (' + fullAddress + ')'}.`,
            'giao_hang',
            '/admin?tab=rentals'
        );

        return res.status(200).json({
            success: true,
            message: 'Đăng ký hình thức nhận nông sản thành công!',
            data: deliveryRecord
        });
    } catch (error) {
        console.error('Lỗi khi đăng ký nhận hàng:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi máy chủ nội bộ khi đăng ký nhận hàng',
            error: error.message
        });
    }
};

/**
 * Lấy chi tiết thu hoạch & giao hàng theo hợp đồng
 * GET /api/harvest/rental/:rentalId
 */
const getHarvestByRental = async (req, res) => {
    try {
        const pool = await getPool();
        const rentalId = parseInt(req.params.rentalId || req.params.id, 10);

        const result = await pool.request()
            .input('rentalId', sql.Int, rentalId)
            .query(`
                SELECT 
                    t.*,
                    h.trang_thai_canh_tac, h.trang_thai_hop_dong,
                    o.so_hieu_o, o.ten_o_dat,
                    u.ho_va_ten AS ten_khach_hang,
                    f.ho_va_ten AS ten_nong_dan,
                    g.ma_giao_hang, g.hinh_thuc_nhan_hang, g.ten_nguoi_nhan,
                    g.so_dien_thoai_nguoi_nhan, g.dia_chi_giao_hang,
                    g.trang_thai_giao_hang, g.ma_van_don, g.don_vi_van_chuyen
                FROM dbo.ThuHoach t
                JOIN HopDongThue h ON h.ma_hop_dong = t.ma_hop_dong
                JOIN ODat o ON o.ma_o_dat = h.ma_o_dat
                JOIN NguoiDung u ON u.ma_nguoi_dung = h.ma_nguoi_dung
                JOIN NguoiDung f ON f.ma_nguoi_dung = t.ma_nong_dan
                LEFT JOIN dbo.GiaoHang g ON g.ma_thu_hoach = t.ma_thu_hoach
                WHERE t.ma_hop_dong = @rentalId
                ORDER BY t.ma_thu_hoach DESC
            `);

        return res.json({
            success: true,
            data: result.recordset[0] || null
        });
    } catch (error) {
        console.error('Lỗi lấy thông tin thu hoạch:', error);
        return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ' });
    }
};

/**
 * Danh sách toàn bộ đợt thu hoạch (dành cho Admin & Nông dân)
 * GET /api/harvest
 */
const getAllHarvests = async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`
            SELECT 
                t.*,
                h.trang_thai_canh_tac,
                o.so_hieu_o, o.ten_o_dat,
                u.ho_va_ten AS ten_khach_hang, u.email AS email_khach_hang,
                f.ho_va_ten AS ten_nong_dan,
                g.ma_giao_hang, g.hinh_thuc_nhan_hang, g.trang_thai_giao_hang,
                g.ten_nguoi_nhan, g.so_dien_thoai_nguoi_nhan, g.dia_chi_giao_hang
            FROM dbo.ThuHoach t
            JOIN HopDongThue h ON h.ma_hop_dong = t.ma_hop_dong
            JOIN ODat o ON o.ma_o_dat = h.ma_o_dat
            JOIN NguoiDung u ON u.ma_nguoi_dung = h.ma_nguoi_dung
            JOIN NguoiDung f ON f.ma_nguoi_dung = t.ma_nong_dan
            LEFT JOIN dbo.GiaoHang g ON g.ma_thu_hoach = t.ma_thu_hoach
            ORDER BY t.ngay_tao DESC
        `);

        return res.json({
            success: true,
            data: result.recordset
        });
    } catch (error) {
        console.error('Lỗi lấy danh sách thu hoạch:', error);
        return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ' });
    }
};

module.exports = {
    readyToHarvest,
    registerDelivery,
    getHarvestByRental,
    getAllHarvests
};
