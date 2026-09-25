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

        // Chỉ nông dân đã nhận phân công của chính hợp đồng này mới được
        // chuyển vụ mùa sang trạng thái sẵn sàng thu hoạch.
        if (req.user?.role === 'nong_dan') {
            const assignment = await pool.request()
                .input('rentalId', sql.Int, rentalId)
                .input('farmerId', sql.Int, Number(req.user.sub))
                .query(`
                    SELECT TOP 1 ma_phan_cong
                    FROM PhanCongNongDan
                    WHERE ma_hop_dong = @rentalId
                      AND ma_nong_dan = @farmerId
                      AND trang_thai = 'da_chap_nhan'
                `);
            if (!assignment.recordset[0]) {
                return res.status(403).json({
                    success: false,
                    message: 'Bạn không được phân công phụ trách ô đất này'
                });
            }
        }

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

            if (!rental) {
                return res.status(404).json({ success: false, message: 'Không tìm thấy hợp đồng thuê' });
            }
            if (req.user?.role === 'khach_hang' && Number(rental.ma_nguoi_dung) !== Number(req.user.sub)) {
                return res.status(403).json({ success: false, message: 'Bạn không có quyền cập nhật giao nhận của hợp đồng này' });
            }
            
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
        
        // Chuẩn hóa hình thức nhận hàng sang chuẩn của GiaoNhanThuHoach
        let shippingType = 'giao_tan_noi';
        if (hinh_thuc_nhan_hang === 'nhan_tai_vuon' || hinh_thuc_nhan_hang === 'Nhận tại nông trại' || hinh_thuc_nhan_hang === 'nhan_tai_nong_trai') {
            shippingType = 'nhan_tai_nong_trai';
        }

        // Tạo chuỗi địa chỉ đầy đủ
        let fullAddress = dia_chi_giao_hang || '';
        if (shippingType === 'nhan_tai_nong_trai') {
            fullAddress = 'Nhận trực tiếp tại Nông trại PlotFarm';
        } else {
            const parts = [dia_chi_giao_hang, quan_huyen, tinh_thanh].filter(Boolean);
            if (parts.length > 1) {
                fullAddress = parts.join(', ');
            }
        }

        const recipientName = ten_nguoi_nhan || rental?.ho_va_ten || 'Khách hàng PlotFarm';
        const recipientPhone = so_dien_thoai_nguoi_nhan || rental?.so_dien_thoai || '';

        // Cập nhật hoặc khởi tạo trong bảng chuẩn dbo.GiaoNhanThuHoach (thay thế dbo.GiaoHang)
        let deliveryRecord;
        const checkDelivery = await pool.request()
            .input('rentalId', sql.Int, targetRentalId)
            .query(`SELECT ma_giao_nhan, ma_nong_dan FROM dbo.GiaoNhanThuHoach WHERE ma_hop_dong = @rentalId`);

        if (checkDelivery.recordset[0]) {
            const updateRes = await pool.request()
                .input('deliveryId', sql.Int, checkDelivery.recordset[0].ma_giao_nhan)
                .input('shippingType', sql.VarChar(30), shippingType)
                .input('recipientName', sql.NVarChar(100), recipientName)
                .input('recipientPhone', sql.VarChar(20), recipientPhone)
                .input('deliveryAddress', sql.NVarChar(500), fullAddress)
                .input('notes', sql.NVarChar(1000), ghi_chu || null)
                .query(`
                    UPDATE dbo.GiaoNhanThuHoach
                    SET hinh_thuc_nhan = @shippingType,
                        ten_nguoi_nhan = @recipientName,
                        so_dien_thoai_nhan = @recipientPhone,
                        dia_chi_nhan = @deliveryAddress,
                        ghi_chu_khach = @notes,
                        trang_thai = 'cho_thu_hoach_dong_goi',
                        ngay_khach_chon = SYSDATETIME()
                    OUTPUT INSERTED.*
                    WHERE ma_giao_nhan = @deliveryId
                `);
            deliveryRecord = updateRes.recordset[0];
        } else {
            // Tìm nông dân phụ trách
            let farmerId = 1;
            const assignmentCheck = await pool.request()
                .input('rentalId', sql.Int, targetRentalId)
                .query(`SELECT TOP 1 ma_nong_dan FROM PhanCongNongDan WHERE ma_hop_dong = @rentalId AND trang_thai = 'da_chap_nhan'`);
            if (assignmentCheck.recordset[0]) {
                farmerId = assignmentCheck.recordset[0].ma_nong_dan;
            }

            const insertRes = await pool.request()
                .input('rentalId', sql.Int, targetRentalId)
                .input('farmerId', sql.Int, farmerId)
                .input('shippingType', sql.VarChar(30), shippingType)
                .input('recipientName', sql.NVarChar(100), recipientName)
                .input('recipientPhone', sql.VarChar(20), recipientPhone)
                .input('deliveryAddress', sql.NVarChar(500), fullAddress)
                .input('notes', sql.NVarChar(1000), ghi_chu || null)
                .query(`
                    INSERT INTO dbo.GiaoNhanThuHoach (
                        ma_hop_dong, ma_nong_dan, hinh_thuc_nhan,
                        ten_nguoi_nhan, so_dien_thoai_nhan, dia_chi_nhan,
                        ghi_chu_khach, trang_thai, ngay_san_sang, ngay_khach_chon
                    )
                    OUTPUT INSERTED.*
                    VALUES (
                        @rentalId, @farmerId, @shippingType,
                        @recipientName, @recipientPhone, @deliveryAddress,
                        @notes, 'cho_thu_hoach_dong_goi', SYSDATETIME(), SYSDATETIME()
                    )
                `);
            deliveryRecord = insertRes.recordset[0];
        }

        // Cập nhật trạng thái đợt thu hoạch trong dbo.ThuHoach (nếu có)
        if (harvestId) {
            await pool.request()
                .input('harvestId', sql.Int, harvestId)
                .query(`UPDATE dbo.ThuHoach SET trang_thai = 'da_len_lich_giao' WHERE ma_thu_hoach = @harvestId`);
        }

        // Bắn thông báo cho Admin
        const plotCode = rental?.so_hieu_o || 'ô đất';
        await notifyAdmins(
            `Đăng ký nhận nông sản: Ô ${plotCode}`,
            `Khách hàng ${recipientName} đã đăng ký hình thức: ${shippingType === 'nhan_tai_nong_trai' ? 'Nhận tại nông trại' : 'Giao tận nơi (' + fullAddress + ')'}.`,
            'giao_hang',
            '/admin?tab=rentals'
        );

        // Bắn thông báo cho Farmer phụ trách
        if (deliveryRecord?.ma_nong_dan) {
            await createNotification(
                deliveryRecord.ma_nong_dan,
                `Khách đăng ký nhận nông sản: Ô ${plotCode}`,
                `Khách hàng đã đăng ký hình thức nhận nông sản (${shippingType === 'nhan_tai_nong_trai' ? 'Tại nông trại' : 'Giao tận nơi'}). Hãy tiến hành đóng gói và bàn giao.`,
                'thu_hoach',
                '/farmer?tab=harvest'
            );
        }

        const formattedDelivery = {
            ...deliveryRecord,
            ma_giao_hang: deliveryRecord?.ma_giao_nhan,
            hinh_thuc_nhan_hang: deliveryRecord?.hinh_thuc_nhan,
            dia_chi_giao_hang: deliveryRecord?.dia_chi_nhan,
            trang_thai_giao_hang: deliveryRecord?.trang_thai,
            so_dien_thoai_nguoi_nhan: deliveryRecord?.so_dien_thoai_nhan,
        };

        return res.status(200).json({
            success: true,
            message: 'Đăng ký hình thức nhận nông sản thành công!',
            data: formattedDelivery
        });
    } catch (error) {
        console.error('Lỗi đăng ký nhận nông sản:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi máy chủ nội bộ khi đăng ký nhận hàng',
            error: error.message
        });
    }
};

/**
 * Lấy chi tiết thông tin thu hoạch và giao hàng theo mã hợp đồng
 * GET /api/harvest/rental/:id
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
                    h.ma_nguoi_dung, h.trang_thai_canh_tac, h.trang_thai_hop_dong,
                    o.so_hieu_o, o.ten_o_dat,
                    u.ho_va_ten AS ten_khach_hang,
                    f.ho_va_ten AS ten_nong_dan,
                    g.ma_giao_nhan,
                    g.ma_giao_nhan AS ma_giao_hang,
                    g.hinh_thuc_nhan,
                    g.hinh_thuc_nhan AS hinh_thuc_nhan_hang,
                    g.ten_nguoi_nhan,
                    g.so_dien_thoai_nhan,
                    g.so_dien_thoai_nhan AS so_dien_thoai_nguoi_nhan,
                    g.dia_chi_nhan,
                    g.dia_chi_nhan AS dia_chi_giao_hang,
                    g.ghi_chu_khach,
                    g.trang_thai AS trang_thai_giao_nhan,
                    g.trang_thai AS trang_thai_giao_hang,
                    g.ngay_san_sang,
                    g.ngay_khach_chon,
                    g.ngay_ban_giao
                FROM dbo.ThuHoach t
                JOIN HopDongThue h ON h.ma_hop_dong = t.ma_hop_dong
                JOIN ODat o ON o.ma_o_dat = h.ma_o_dat
                JOIN NguoiDung u ON u.ma_nguoi_dung = h.ma_nguoi_dung
                JOIN NguoiDung f ON f.ma_nguoi_dung = t.ma_nong_dan
                LEFT JOIN dbo.GiaoNhanThuHoach g ON g.ma_hop_dong = h.ma_hop_dong
                WHERE t.ma_hop_dong = @rentalId
                ORDER BY t.ma_thu_hoach DESC
            `);

        const harvest = result.recordset[0] || null;
        if (harvest && req.user?.role === 'khach_hang' && Number(harvest.ma_nguoi_dung) !== Number(req.user.sub)) {
            return res.status(403).json({ success: false, message: 'Bạn không có quyền xem đợt thu hoạch này' });
        }
        if (harvest && req.user?.role === 'nong_dan' && Number(harvest.ma_nong_dan) !== Number(req.user.sub)) {
            return res.status(403).json({ success: false, message: 'Bạn không được phân công đợt thu hoạch này' });
        }

        return res.json({
            success: true,
            data: harvest
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
                g.ma_giao_nhan,
                g.ma_giao_nhan AS ma_giao_hang,
                g.hinh_thuc_nhan,
                g.hinh_thuc_nhan AS hinh_thuc_nhan_hang,
                g.ten_nguoi_nhan,
                g.so_dien_thoai_nhan,
                g.so_dien_thoai_nhan AS so_dien_thoai_nguoi_nhan,
                g.dia_chi_nhan,
                g.dia_chi_nhan AS dia_chi_giao_hang,
                g.ghi_chu_khach,
                g.trang_thai AS trang_thai_giao_nhan,
                g.trang_thai AS trang_thai_giao_hang,
                g.ngay_san_sang,
                g.ngay_khach_chon,
                g.ngay_ban_giao
            FROM dbo.ThuHoach t
            JOIN HopDongThue h ON h.ma_hop_dong = t.ma_hop_dong
            JOIN ODat o ON o.ma_o_dat = h.ma_o_dat
            JOIN NguoiDung u ON u.ma_nguoi_dung = h.ma_nguoi_dung
            JOIN NguoiDung f ON f.ma_nguoi_dung = t.ma_nong_dan
            LEFT JOIN dbo.GiaoNhanThuHoach g ON g.ma_hop_dong = h.ma_hop_dong
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
