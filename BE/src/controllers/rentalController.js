const { sql, getPool } = require('../config/db');
const { notifyAdmins, createNotification } = require('./notificationController');

// Hàm hỗ trợ sinh dữ liệu thanh toán VietQR chuẩn Napas247
const generateVietQR = (soHopDong, amount) => {
    const bankId = 'MB'; // MBBank - Ngân hàng Quân Đội
    const bankName = 'MBBank (Ngân hàng TMCP Quân Đội)';
    const accountNo = '0905123456';
    const accountName = 'PLOTFARM VIETNAM';
    const addInfo = `PFTHUE ${soHopDong}`;
    const roundedAmount = Math.round(Number(amount) || 0);
    const qrCodeUrl = `https://img.vietqr.io/image/${bankId}-${accountNo}-compact2.png?amount=${roundedAmount}&addInfo=${encodeURIComponent(addInfo)}&accountName=${encodeURIComponent(accountName)}`;

    return {
        bank_id: bankId,
        bank_name: bankName,
        account_no: accountNo,
        account_name: accountName,
        amount: roundedAmount,
        transfer_content: addInfo,
        qr_code_url: qrCodeUrl
    };
};

// Tạo hợp đồng thuê đất mới
const createRental = async (req, res) => {
    const pool = await getPool();
    const transaction = new sql.Transaction(pool);

    try {
        let { so_hop_dong, ma_nguoi_dung, ma_o_dat, ma_cay_trong, ngay_bat_dau, ngay_ket_thuc, thoi_han_thang } = req.body;
        if (!ma_nguoi_dung && req.user?.sub) {
            ma_nguoi_dung = req.user.sub;
        }

        if (!ma_nguoi_dung || !ma_o_dat || !thoi_han_thang) {
            return res.status(400).json({ success: false, message: 'Thiếu thông tin bắt buộc để tạo hợp đồng' });
        }

        thoi_han_thang = parseInt(thoi_han_thang, 10);
        if (!so_hop_dong) {
            so_hop_dong = `HDT-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
        }

        if (!ngay_bat_dau) {
            ngay_bat_dau = new Date().toISOString().split('T')[0];
        }

        if (!ngay_ket_thuc) {
            const endDate = new Date(ngay_bat_dau);
            endDate.setMonth(endDate.getMonth() + thoi_han_thang);
            ngay_ket_thuc = endDate.toISOString().split('T')[0];
        }

        await transaction.begin();

        // 1. Kiểm tra thời gian sinh trưởng cây trồng vs Thời hạn thuê
        const rentalDays = thoi_han_thang * 30;
        if (ma_cay_trong) {
            const cropCheck = await new sql.Request(transaction)
                .input('cropId', sql.Int, parseInt(ma_cay_trong, 10))
                .query(`SELECT ma_cay_trong, ten_cay_trong, thoi_gian_sinh_truong_ngay FROM CayTrong WHERE ma_cay_trong = @cropId`);

            const crop = cropCheck.recordset[0];
            if (crop && crop.thoi_gian_sinh_truong_ngay > rentalDays) {
                // Lấy danh sách cây trồng thay thế hợp lệ (thoi_gian_sinh_truong_ngay <= rentalDays)
                const altCropsReq = await new sql.Request(transaction)
                    .input('maxDays', sql.Int, rentalDays)
                    .query(`
                        SELECT ma_cay_trong, ten_cay_trong, thoi_gian_sinh_truong_ngay, hinh_anh_cay, gia_cay, do_kho
                        FROM CayTrong 
                        WHERE thoi_gian_sinh_truong_ngay <= @maxDays
                        ORDER BY thoi_gian_sinh_truong_ngay DESC
                    `);

                await transaction.rollback();
                const minMonths = Math.ceil(crop.thoi_gian_sinh_truong_ngay / 30);
                return res.status(400).json({
                    success: false,
                    code: 'GROWTH_TIME_EXCEEDS_RENTAL',
                    message: `Thời gian sinh trưởng của cây "${crop.ten_cay_trong}" (${crop.thoi_gian_sinh_truong_ngay} ngày) vượt quá thời hạn thuê (${rentalDays} ngày / ${thoi_han_thang} tháng). Bạn cần thuê tối thiểu ${minMonths} tháng hoặc chọn loại cây trồng khác phù hợp.`,
                    data: {
                        crop_id: crop.ma_cay_trong,
                        crop_name: crop.ten_cay_trong,
                        growth_days: crop.thoi_gian_sinh_truong_ngay,
                        rental_days: rentalDays,
                        rental_months: thoi_han_thang,
                        min_months_required: minMonths,
                        suggested_crops: altCropsReq.recordset
                    }
                });
            }
        }

        // 2. Kiểm tra ô đất còn trống + lấy giá thật từ DB
        const checkResult = await new sql.Request(transaction)
            .input('ma_o_dat', sql.Int, parseInt(ma_o_dat, 10))
            .query(`SELECT so_hieu_o, ten_o_dat, trang_thai, gia_thue_thang FROM ODat WHERE ma_o_dat = @ma_o_dat`);

        const oDat = checkResult.recordset[0];

        if (!oDat) {
            await transaction.rollback();
            return res.status(404).json({ success: false, message: 'Không tìm thấy ô đất' });
        }

        // Kiểm tra xem ô đất có hợp đồng đang còn hiệu lực không (ngay_ket_thuc >= ngày hiện tại)
        const activeContractCheck = await new sql.Request(transaction)
            .input('ma_o_dat', sql.Int, parseInt(ma_o_dat, 10))
            .query(`
                SELECT TOP 1 ma_hop_dong, so_hop_dong, ngay_ket_thuc, trang_thai_hop_dong
                FROM HopDongThue
                WHERE ma_o_dat = @ma_o_dat
                  AND trang_thai_hop_dong NOT IN ('da_ket_thuc', 'da_huy')
                  AND ngay_ket_thuc >= CAST(GETDATE() AS DATE)
            `);

        if (activeContractCheck.recordset.length > 0) {
            await new sql.Request(transaction)
                .input('ma_o_dat', sql.Int, parseInt(ma_o_dat, 10))
                .query(`UPDATE ODat SET trang_thai = 'da_thue' WHERE ma_o_dat = @ma_o_dat AND trang_thai <> 'da_thue'`);

            await transaction.rollback();
            const activeContract = activeContractCheck.recordset[0];
            return res.status(400).json({
                success: false,
                code: 'PLOT_HAS_ACTIVE_CONTRACT',
                message: `Ô đất ${oDat.so_hieu_o} hiện đang có hợp đồng thuê (${activeContract.so_hop_dong}) còn hiệu lực đến ngày ${new Date(activeContract.ngay_ket_thuc).toLocaleDateString('vi-VN')}. Không thể tạo hợp đồng thuê mới đè lên.`
            });
        }

        if (oDat.trang_thai !== 'trong') {
            await transaction.rollback();
            return res.status(400).json({ success: false, message: 'Ô đất không còn trống, không thể tạo hợp đồng' });
        }

        const donGiaThang = oDat.gia_thue_thang;
        const tongTien = donGiaThang * thoi_han_thang;

        // 2. Thêm hợp đồng với trạng thái chờ thanh toán
        const insertResult = await new sql.Request(transaction)
            .input('so_hop_dong', sql.VarChar(50), so_hop_dong)
            .input('ma_nguoi_dung', sql.Int, parseInt(ma_nguoi_dung, 10))
            .input('ma_o_dat', sql.Int, parseInt(ma_o_dat, 10))
            .input('ma_cay_trong', sql.Int, ma_cay_trong ? parseInt(ma_cay_trong, 10) : null)
            .input('ngay_bat_dau', sql.Date, ngay_bat_dau)
            .input('ngay_ket_thuc', sql.Date, ngay_ket_thuc)
            .input('thoi_han_thang', sql.Int, thoi_han_thang)
            .input('don_gia_thang', sql.Decimal(14, 2), donGiaThang)
            .input('tong_tien', sql.Decimal(14, 2), tongTien)
            .query(`
                INSERT INTO HopDongThue (so_hop_dong, ma_nguoi_dung, ma_o_dat, ma_cay_trong, ngay_bat_dau, ngay_ket_thuc, thoi_han_thang, don_gia_thang, tong_tien, trang_thai_hop_dong, trang_thai_thanh_toan, trang_thai_canh_tac)
                OUTPUT INSERTED.*
                VALUES (@so_hop_dong, @ma_nguoi_dung, @ma_o_dat, @ma_cay_trong, @ngay_bat_dau, @ngay_ket_thuc, @thoi_han_thang, @don_gia_thang, @tong_tien, 'cho_thanh_toan', 'cho_thanh_toan', 'cho_gieo_trong')
            `);

        // 3. Cập nhật trạng thái ô đất thành dang_chon (giữ chỗ chờ thanh toán)
        await new sql.Request(transaction)
            .input('ma_o_dat', sql.Int, parseInt(ma_o_dat, 10))
            .query(`UPDATE ODat SET trang_thai = 'dang_chon', ngay_cap_nhat = SYSDATETIME() WHERE ma_o_dat = @ma_o_dat`);

        await transaction.commit();

        const createdContract = insertResult.recordset[0];
        const paymentInfo = generateVietQR(so_hop_dong, tongTien);

        // 4. Bắn thông báo tự động cho Admin
        const plotCode = oDat.so_hieu_o || `Ô #${ma_o_dat}`;
        notifyAdmins(
            `Đơn thuê mới chờ thanh toán: ${plotCode}`,
            `Hợp đồng ${so_hop_dong} vừa được khởi tạo cho ô đất ${plotCode}. Thời hạn: ${thoi_han_thang} tháng, Tổng tiền: ${Number(tongTien).toLocaleString('vi-VN')} đ. Đang chờ thanh toán VietQR.`,
            'thue_dat',
            '/admin?tab=rentals'
        ).catch((err) => console.error('Lỗi bắn thông báo admin:', err));

        res.status(201).json({
            success: true,
            message: 'Tạo hợp đồng thuê đất thành công! Vui lòng thanh toán qua mã VietQR.',
            data: {
                ...createdContract,
                so_hop_dong,
                donGiaThang,
                thoi_han_thang,
                tongTien,
                payment_info: paymentInfo,
                qr_code_url: paymentInfo.qr_code_url,
                transfer_content: paymentInfo.transfer_content,
                bank_info: paymentInfo
            }
        });
    } catch (error) {
        try { await transaction.rollback(); } catch (rbErr) {}
        console.error('Lỗi khi tạo hợp đồng thuê:', error);
        res.status(500).json({ success: false, message: 'Lỗi server nội bộ khi tạo hợp đồng' });
    }
};

// Lấy danh sách tất cả hợp đồng thuê đất
const getAllRentals = async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`
            SELECT h.*, u.ho_va_ten AS ten_khach_hang, u.email AS email_khach_hang,
                   o.so_hieu_o, o.ten_o_dat, c.ten_cay_trong
            FROM HopDongThue h
            JOIN NguoiDung u ON u.ma_nguoi_dung = h.ma_nguoi_dung
            JOIN ODat o ON o.ma_o_dat = h.ma_o_dat
            LEFT JOIN CayTrong c ON c.ma_cay_trong = h.ma_cay_trong
            ORDER BY h.ngay_tao DESC
        `);

        res.status(200).json({
            success: true,
            count: result.recordset.length,
            data: result.recordset
        });
    } catch (error) {
        console.error('Lỗi khi lấy danh sách hợp đồng:', error);
        res.status(500).json({ success: false, message: 'Lỗi server nội bộ' });
    }
};

// Lấy danh sách hợp đồng của người dùng
const getRentalsByUser = async (req, res) => {
    try {
        const pool = await getPool();
        const targetUserId = req.user?.role === 'khach_hang' ? req.user.sub : (req.params.userId || req.user?.sub);
        const result = await pool.request()
            .input('ma_nguoi_dung', sql.Int, parseInt(targetUserId, 10))
            .query(`
                SELECT h.ma_hop_dong, h.so_hop_dong, h.ngay_bat_dau, h.ngay_ket_thuc,
                       h.tong_tien, h.trang_thai_hop_dong, h.trang_thai_thanh_toan, h.trang_thai_canh_tac, h.yeu_cau_dac_biet,
                       o.ma_o_dat, o.so_hieu_o, o.ten_o_dat, o.dien_tich_m2, o.chieu_dai_m, o.chieu_rong_m,
                       o.loai_dat, o.he_thong_tuoi, o.huong_anh_sang, o.gia_thue_thang, o.mo_ta_chi_tiet,
                       o.hinh_anh_o_dat, o.trang_thai AS trang_thai_o_dat,
                      c.ma_cay_trong, c.ten_cay_trong, c.hinh_anh_cay,
                      nt.ten_nong_trai, nt.dia_chi AS dia_chi_nong_trai, nt.tinh_thanh, nt.quan_huyen,
                      n.ho_va_ten AS ten_nong_dan, n.so_dien_thoai AS sdt_nong_dan, p.trang_thai AS trang_thai_phan_cong
                FROM HopDongThue h
                INNER JOIN ODat o ON o.ma_o_dat = h.ma_o_dat
                INNER JOIN NongTrai nt ON nt.ma_nong_trai = o.ma_nong_trai
                LEFT JOIN CayTrong c ON c.ma_cay_trong = h.ma_cay_trong
                  LEFT JOIN PhanCongNongDan p ON p.ma_hop_dong = h.ma_hop_dong AND p.trang_thai = 'da_chap_nhan'
                  LEFT JOIN NguoiDung n ON n.ma_nguoi_dung = p.ma_nong_dan
                WHERE h.ma_nguoi_dung = @ma_nguoi_dung
                ORDER BY h.ngay_tao DESC
            `);
        return res.json({ success: true, count: result.recordset.length, data: result.recordset });
    } catch (error) {
        console.error('Lỗi khi lấy hợp đồng của người dùng:', error);
        return res.status(500).json({ success: false, message: 'Không thể tải hợp đồng' });
    }
};

// Lấy danh sách ô đất đang canh tác hiệu lực (Dành cho Nông dân)
const getActiveRentals = async (req, res) => {
    try {
        const pool = await getPool();
        const request = pool.request();
        let farmerFilter = '';
        if (req.user?.role === 'nong_dan') {
            request.input('farmerId', sql.Int, Number(req.user.sub));
            farmerFilter = `AND EXISTS (SELECT 1 FROM PhanCongNongDan p WHERE p.ma_hop_dong = h.ma_hop_dong AND p.ma_nong_dan = @farmerId AND p.trang_thai = 'da_chap_nhan')`;
        }
        const result = await request.query(`
            SELECT h.ma_hop_dong, h.so_hop_dong, h.ngay_bat_dau, h.ngay_ket_thuc,
                   o.ma_o_dat, o.so_hieu_o, o.ten_o_dat, o.dien_tich_m2,
                   h.trang_thai_thanh_toan, h.trang_thai_canh_tac, h.yeu_cau_dac_biet,
                   u.ho_va_ten AS ten_khach_hang, u.so_dien_thoai AS sdt_khach_hang,
                   c.ma_cay_trong, c.ten_cay_trong, c.thoi_gian_sinh_truong_ngay,
                   g.trang_thai AS trang_thai_giao_nhan,
                   DATEDIFF(day, h.ngay_bat_dau, SYSDATETIME()) AS so_ngay_da_trong
            FROM HopDongThue h
            JOIN ODat o ON o.ma_o_dat = h.ma_o_dat
            JOIN NguoiDung u ON u.ma_nguoi_dung = h.ma_nguoi_dung
            LEFT JOIN CayTrong c ON c.ma_cay_trong = h.ma_cay_trong
            LEFT JOIN GiaoNhanThuHoach g ON g.ma_hop_dong = h.ma_hop_dong
            WHERE h.trang_thai_hop_dong = 'hieu_luc' AND (g.trang_thai IS NULL OR g.trang_thai <> 'da_ban_giao_van_chuyen') ${farmerFilter}
            ORDER BY o.so_hieu_o ASC
        `);

        return res.json({ success: true, count: result.recordset.length, data: result.recordset });
    } catch (error) {
        console.error('Lỗi lấy danh sách ô đất đang canh tác:', error);
        return res.status(500).json({ success: false, message: 'Lỗi server nội bộ' });
    }
};

// Nông dân xác nhận đã nhận giống và bắt đầu gieo trồng
const updateCultivationStatus = async (req, res) => {
    try {
        const status = req.body.status || 'dang_canh_tac';
        if (!['dang_canh_tac', 'san_sang_thu_hoach'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Trạng thái canh tác không hợp lệ' });
        }

        const pool = await getPool();
        const result = await pool.request()
            .input('id', sql.Int, parseInt(req.params.id, 10))
            .input('status', sql.VarChar(30), status)
            .input('farmerId', sql.Int, Number(req.user.sub))
            .query(`
                UPDATE HopDongThue
                SET trang_thai_canh_tac = @status, ngay_cap_nhat = SYSDATETIME()
                OUTPUT INSERTED.ma_hop_dong, INSERTED.trang_thai_canh_tac
                WHERE ma_hop_dong = @id AND trang_thai_hop_dong = 'hieu_luc'
                  AND EXISTS (
                    SELECT 1 FROM PhanCongNongDan p
                    WHERE p.ma_hop_dong = HopDongThue.ma_hop_dong
                      AND p.ma_nong_dan = @farmerId AND p.trang_thai = 'da_chap_nhan'
                  )
            `);

        if (!result.recordset[0]) return res.status(404).json({ success: false, message: 'Không tìm thấy hợp đồng đang hoạt động' });
        return res.json({ success: true, message: 'Đã cập nhật trạng thái canh tác', data: result.recordset[0] });
    } catch (error) {
        console.error('Lỗi cập nhật trạng thái canh tác:', error);
        return res.status(500).json({ success: false, message: 'Lỗi server nội bộ' });
    }
};

const markHarvestReady = async (req, res) => {
    const pool = await getPool();
    const transaction = new sql.Transaction(pool);
    try {
        const contractId = Number(req.params.id);
        const farmerId = Number(req.user.sub);
        await transaction.begin();
        const detailResult = await new sql.Request(transaction)
            .input('contractId', sql.Int, contractId).input('farmerId', sql.Int, farmerId)
            .query(`
                SELECT h.ma_hop_dong, h.ma_nguoi_dung, o.so_hieu_o, c.ten_cay_trong
                FROM HopDongThue h JOIN ODat o ON o.ma_o_dat = h.ma_o_dat
                LEFT JOIN CayTrong c ON c.ma_cay_trong = h.ma_cay_trong
                WHERE h.ma_hop_dong = @contractId AND h.trang_thai_hop_dong = 'hieu_luc'
                  AND EXISTS (SELECT 1 FROM PhanCongNongDan p WHERE p.ma_hop_dong = h.ma_hop_dong AND p.ma_nong_dan = @farmerId AND p.trang_thai = 'da_chap_nhan')
            `);
        const detail = detailResult.recordset[0];
        if (!detail) {
            await transaction.rollback();
            return res.status(403).json({ success: false, message: 'Bạn không được phụ trách hợp đồng này hoặc hợp đồng không còn hiệu lực' });
        }
        await new sql.Request(transaction).input('contractId', sql.Int, contractId).query(`
            UPDATE HopDongThue SET trang_thai_canh_tac = 'san_sang_thu_hoach', ngay_cap_nhat = SYSDATETIME() WHERE ma_hop_dong = @contractId
        `);
        const existing = await new sql.Request(transaction).input('contractId', sql.Int, contractId)
            .query(`SELECT ma_giao_nhan FROM GiaoNhanThuHoach WHERE ma_hop_dong = @contractId`);
        if (existing.recordset[0]) {
            await new sql.Request(transaction).input('contractId', sql.Int, contractId).input('farmerId', sql.Int, farmerId).query(`
                UPDATE GiaoNhanThuHoach SET ma_nong_dan = @farmerId, hinh_thuc_nhan = NULL, ten_nguoi_nhan = NULL,
                so_dien_thoai_nhan = NULL, dia_chi_nhan = NULL, ghi_chu_khach = NULL, trang_thai = 'cho_khach_chon',
                ngay_san_sang = SYSDATETIME(), ngay_khach_chon = NULL, ngay_ban_giao = NULL WHERE ma_hop_dong = @contractId
            `);
        } else {
            await new sql.Request(transaction).input('contractId', sql.Int, contractId).input('farmerId', sql.Int, farmerId).query(`
                INSERT INTO GiaoNhanThuHoach (ma_hop_dong, ma_nong_dan, trang_thai, ngay_san_sang)
                VALUES (@contractId, @farmerId, 'cho_khach_chon', SYSDATETIME())
            `);
        }
        try {
            const existingThuHoach = await new sql.Request(transaction).input('contractId', sql.Int, contractId)
                .query(`SELECT ma_thu_hoach FROM dbo.ThuHoach WHERE ma_hop_dong = @contractId`);
            if (!existingThuHoach.recordset[0]) {
                await new sql.Request(transaction).input('contractId', sql.Int, contractId).input('farmerId', sql.Int, farmerId)
                    .query(`
                        INSERT INTO dbo.ThuHoach (
                            ma_hop_dong, ma_nong_dan, ngay_thu_hoach,
                            san_luong_thuc_te_kg, san_luong_hao_hut_kg, phan_loai_chat_luong,
                            phuong_thuc_bao_quan, quy_cach_dong_goi, ghi_chu,
                            trang_thai, ngay_tao
                        ) VALUES (
                            @contractId, @farmerId, CAST(SYSDATETIME() AS DATE),
                            15.0, 0.0, 'Loai_A',
                            N'Bảo quản mát 10-15 độ C', N'Thùng carton tiêu chuẩn PlotFarm',
                            N'Nông dân đã xác nhận vụ mùa sẵn sàng thu hoạch.',
                            'cho_thu_hoach', SYSDATETIME()
                        )
                    `);
            }
        } catch (_) {}
        await transaction.commit();
        createNotification(detail.ma_nguoi_dung, `Mùa vụ ${detail.so_hieu_o} đã sẵn sàng thu hoạch`, `Nông sản ${detail.ten_cay_trong || 'của bạn'} đã sẵn sàng. Vui lòng chọn hình thức nhận hàng.`, 'thu_hoach', '/user?tab=harvest').catch(() => {});
        return res.json({ success: true, message: 'Đã báo khách hàng chọn hình thức nhận nông sản' });
    } catch (error) {
        try { await transaction.rollback(); } catch (_) {}
        console.error('Lỗi báo sẵn sàng thu hoạch:', error);
        return res.status(500).json({ success: false, message: 'Không thể cập nhật trạng thái thu hoạch' });
    }
};

const getHarvestDeliveriesForUser = async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().input('userId', sql.Int, Number(req.user.sub)).query(`
            SELECT g.*, h.so_hop_dong, o.so_hieu_o, o.ten_o_dat, o.dien_tich_m2, c.ten_cay_trong
            FROM GiaoNhanThuHoach g JOIN HopDongThue h ON h.ma_hop_dong = g.ma_hop_dong
            JOIN ODat o ON o.ma_o_dat = h.ma_o_dat LEFT JOIN CayTrong c ON c.ma_cay_trong = h.ma_cay_trong
            WHERE h.ma_nguoi_dung = @userId ORDER BY g.ngay_san_sang DESC
        `);
        return res.json({ success: true, data: result.recordset });
    } catch (error) {
        console.error('Lỗi lấy giao nhận cho khách:', error);
        return res.status(500).json({ success: false, message: 'Không thể tải thông tin nhận nông sản' });
    }
};

const chooseHarvestDelivery = async (req, res) => {
    try {
        const { hinh_thuc_nhan, ten_nguoi_nhan, so_dien_thoai_nhan, dia_chi_nhan, ghi_chu_khach } = req.body;
        if (!['giao_tan_noi', 'nhan_tai_nong_trai'].includes(hinh_thuc_nhan) || !ten_nguoi_nhan?.trim() || !so_dien_thoai_nhan?.trim() || (hinh_thuc_nhan === 'giao_tan_noi' && !dia_chi_nhan?.trim())) return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ thông tin nhận nông sản' });
        const pool = await getPool();
        const result = await pool.request().input('contractId', sql.Int, Number(req.params.id)).input('userId', sql.Int, Number(req.user.sub))
            .input('method', sql.VarChar(30), hinh_thuc_nhan).input('name', sql.NVarChar(100), ten_nguoi_nhan.trim()).input('phone', sql.VarChar(20), so_dien_thoai_nhan.trim())
            .input('address', sql.NVarChar(500), dia_chi_nhan?.trim() || null).input('note', sql.NVarChar(1000), ghi_chu_khach?.trim() || null)
            .query(`
                UPDATE g SET hinh_thuc_nhan = @method, ten_nguoi_nhan = @name, so_dien_thoai_nhan = @phone, dia_chi_nhan = @address,
                ghi_chu_khach = @note, trang_thai = 'cho_thu_hoach_dong_goi', ngay_khach_chon = SYSDATETIME()
                OUTPUT INSERTED.ma_giao_nhan, INSERTED.ma_nong_dan FROM GiaoNhanThuHoach g JOIN HopDongThue h ON h.ma_hop_dong = g.ma_hop_dong
                WHERE g.ma_hop_dong = @contractId AND h.ma_nguoi_dung = @userId AND g.trang_thai = 'cho_khach_chon'
            `);
        const delivery = result.recordset[0];
        if (!delivery) return res.status(409).json({ success: false, message: 'Yêu cầu này chưa sẵn sàng hoặc đã được xác nhận' });
        createNotification(delivery.ma_nong_dan, 'Yêu cầu đóng gói & giao hàng mới', 'Khách hàng đã chọn hình thức nhận nông sản. Vui lòng thu hoạch, đóng gói và bàn giao vận chuyển.', 'thu_hoach', '/farmer?tab=harvest').catch(() => {});
        return res.json({ success: true, message: 'Đã gửi yêu cầu giao nhận tới nông dân' });
    } catch (error) {
        console.error('Lỗi khách chọn giao nhận:', error);
        return res.status(500).json({ success: false, message: 'Không thể lưu hình thức nhận nông sản' });
    }
};

const getHarvestDeliveriesForFarmer = async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().input('farmerId', sql.Int, Number(req.user.sub)).query(`
            SELECT g.*, h.so_hop_dong, o.so_hieu_o, o.ten_o_dat, o.dien_tich_m2, c.ten_cay_trong, u.ho_va_ten AS ten_khach_hang
            FROM GiaoNhanThuHoach g JOIN HopDongThue h ON h.ma_hop_dong = g.ma_hop_dong JOIN ODat o ON o.ma_o_dat = h.ma_o_dat
            JOIN NguoiDung u ON u.ma_nguoi_dung = h.ma_nguoi_dung LEFT JOIN CayTrong c ON c.ma_cay_trong = h.ma_cay_trong
            WHERE g.ma_nong_dan = @farmerId ORDER BY g.ngay_san_sang DESC
        `);
        return res.json({ success: true, data: result.recordset });
    } catch (error) {
        console.error('Lỗi lấy yêu cầu giao nhận cho nông dân:', error);
        return res.status(500).json({ success: false, message: 'Không thể tải yêu cầu giao nhận' });
    }
};

const handoverHarvestDelivery = async (req, res) => {
    const pool = await getPool();
    const transaction = new sql.Transaction(pool);
    try {
        await transaction.begin();

        const handoverReq = new sql.Request(transaction);
        const result = await handoverReq
            .input('id', sql.Int, Number(req.params.id))
            .input('farmerId', sql.Int, Number(req.user.sub))
            .query(`
                UPDATE GiaoNhanThuHoach 
                SET trang_thai = 'da_ban_giao_van_chuyen', ngay_ban_giao = SYSDATETIME() 
                OUTPUT INSERTED.ma_hop_dong, INSERTED.ma_giao_nhan
                WHERE ma_giao_nhan = @id AND ma_nong_dan = @farmerId AND trang_thai = 'cho_thu_hoach_dong_goi'
            `);

        if (!result.recordset[0]) {
            await transaction.rollback();
            return res.status(409).json({ success: false, message: 'Yêu cầu không hợp lệ hoặc đã được bàn giao' });
        }

        const maHopDong = result.recordset[0].ma_hop_dong;

        // 1. Kiểm tra hợp đồng thuê và ngày hết hạn
        const checkContractReq = new sql.Request(transaction);
        const contractRes = await checkContractReq
            .input('maHopDong', sql.Int, maHopDong)
            .query(`
                SELECT h.ma_hop_dong, h.ma_o_dat, h.ma_nguoi_dung, h.so_hop_dong, h.ngay_ket_thuc, o.so_hieu_o
                FROM HopDongThue h
                JOIN ODat o ON o.ma_o_dat = h.ma_o_dat
                WHERE h.ma_hop_dong = @maHopDong
            `);

        const rentalInfo = contractRes.recordset[0];
        const isStillActive = rentalInfo && new Date(rentalInfo.ngay_ket_thuc) > new Date();

        // Cập nhật hợp đồng thuê: Nếu còn hạn -> cho_chon_cay_moi và giữ hieu_luc. Nếu đã hết hạn -> da_thu_hoach và da_ket_thuc
        const rentalReq = new sql.Request(transaction);
        await rentalReq
            .input('maHopDong', sql.Int, maHopDong)
            .input('canhTac', sql.VarChar(30), isStillActive ? 'cho_chon_cay_moi' : 'da_thu_hoach')
            .input('trangThaiHD', sql.VarChar(30), isStillActive ? 'hieu_luc' : 'da_ket_thuc')
            .query(`
                UPDATE HopDongThue
                SET trang_thai_canh_tac = @canhTac,
                    trang_thai_hop_dong = @trangThaiHD,
                    ngay_cap_nhat = SYSDATETIME()
                WHERE ma_hop_dong = @maHopDong
            `);

        if (rentalInfo && rentalInfo.ma_o_dat) {
            // 2. Cập nhật Ô đất:
            // - Nếu còn hạn thuê: Ô đất VẪN LÀ 'da_thue', trạng thái vụ mùa là 'cho_chon_cay_moi' (TUYỆT ĐỐI không giải phóng về 'trong')
            // - Nếu đã hết hạn thuê: Giải phóng về 'trong' và trạng thái vụ mùa là 'san_sang'
            const plotReq = new sql.Request(transaction);
            await plotReq
                .input('maODat', sql.Int, rentalInfo.ma_o_dat)
                .input('plotStatus', sql.VarChar(30), isStillActive ? 'da_thue' : 'trong')
                .input('seasonStatus', sql.VarChar(50), isStillActive ? 'cho_chon_cay_moi' : 'san_sang')
                .query(`
                    UPDATE ODat 
                    SET trang_thai = @plotStatus,
                        trang_thai_vu_mua = @seasonStatus,
                        ngay_cap_nhat = SYSDATETIME() 
                    WHERE ma_o_dat = @maODat
                `);

            // 3. Cập nhật trạng thái phân công nông dân hoàn thành vụ mùa này
            const assignReq = new sql.Request(transaction);
            await assignReq
                .input('maHopDong', sql.Int, maHopDong)
                .query(`UPDATE PhanCongNongDan SET trang_thai = 'hoan_thanh' WHERE ma_hop_dong = @maHopDong`);

            // 4. Cập nhật ThuHoach nếu có bản ghi
            const harvestReq = new sql.Request(transaction);
            await harvestReq
                .input('maHopDong', sql.Int, maHopDong)
                .query(`UPDATE ThuHoach SET trang_thai = 'da_thu_hoach' WHERE ma_hop_dong = @maHopDong`);
        }

        await transaction.commit();

        // 5. Gửi thông báo cho khách hàng và Admin
        if (rentalInfo) {
            try {
                const notifContent = isStillActive
                    ? `Đơn thu hoạch cho hợp đồng ${rentalInfo.so_hop_dong} (${rentalInfo.so_hieu_o}) đã hoàn tất bàn giao. Hợp đồng của bạn vẫn còn hạn thuê, bạn có thể chọn cây trồng mới cho vụ tiếp theo bất cứ lúc nào!`
                    : `Đơn thu hoạch cho hợp đồng ${rentalInfo.so_hop_dong} (${rentalInfo.so_hieu_o}) đã được bàn giao vận chuyển và ô đất đã hoàn tất mùa vụ.`;

                createNotification(
                    rentalInfo.ma_nguoi_dung,
                    'Nông sản của bạn đã được bàn giao',
                    notifContent,
                    'giao_hang',
                    '/user'
                ).catch(e => console.error('Lỗi thông báo KH:', e));

                notifyAdmins(
                    'Thu hoạch & bàn giao hoàn tất',
                    `Hợp đồng ${rentalInfo.so_hop_dong} (${rentalInfo.so_hieu_o}) đã hoàn tất bàn giao vận chuyển. ${isStillActive ? 'Ô đất vẫn thuộc quyền thuê của user (chờ vụ mới).' : 'Ô đất đã được giải phóng về trạng thái trống.'}`,
                    'thu_hoach',
                    '/admin'
                ).catch(e => console.error('Lỗi thông báo Admin:', e));
            } catch (notifErr) {
                console.error('Lỗi gửi thông báo bàn giao thu hoạch:', notifErr);
            }
        }

        return res.json({ success: true, message: 'Đã bàn giao nông sản cho vận chuyển và giải phóng ô đất thành công' });
    } catch (error) {
        try { await transaction.rollback(); } catch (rbErr) {}
        console.error('Lỗi bàn giao thu hoạch:', error);
        return res.status(500).json({ success: false, message: 'Không thể xác nhận bàn giao' });
    }
};

// Chi tiết một hợp đồng
const getRentalById = async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('id', sql.Int, parseInt(req.params.id, 10))
            .query(`
                SELECT h.*, u.ho_va_ten AS ten_khach_hang, u.email AS email_khach_hang, u.so_dien_thoai AS sdt_khach_hang,
                       o.so_hieu_o, o.ten_o_dat, o.dien_tich_m2, o.gia_thue_thang,
                       c.ten_cay_trong, c.thoi_gian_sinh_truong_ngay
                FROM HopDongThue h
                JOIN NguoiDung u ON u.ma_nguoi_dung = h.ma_nguoi_dung
                JOIN ODat o ON o.ma_o_dat = h.ma_o_dat
                LEFT JOIN CayTrong c ON c.ma_cay_trong = h.ma_cay_trong
                WHERE h.ma_hop_dong = @id
            `);

        const rental = result.recordset[0];
        if (!rental) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy hợp đồng' });
        }

        return res.json({ success: true, data: rental });
    } catch (error) {
        console.error('Lỗi khi lấy chi tiết hợp đồng:', error);
        return res.status(500).json({ success: false, message: 'Lỗi server nội bộ' });
    }
};

// Lấy thông tin thanh toán VietQR của hợp đồng
const getPaymentInfo = async (req, res) => {
    try {
        const pool = await getPool();
        const id = parseInt(req.params.id, 10);
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query(`
                SELECT h.ma_hop_dong, h.so_hop_dong, h.tong_tien, h.trang_thai_thanh_toan, h.trang_thai_hop_dong,
                       o.so_hieu_o, o.ten_o_dat, u.ho_va_ten AS ten_khach_hang, u.email AS email_khach_hang
                FROM HopDongThue h
                JOIN ODat o ON o.ma_o_dat = h.ma_o_dat
                JOIN NguoiDung u ON u.ma_nguoi_dung = h.ma_nguoi_dung
                WHERE h.ma_hop_dong = @id
            `);

        const rental = result.recordset[0];
        if (!rental) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy hợp đồng' });
        }

        const paymentInfo = generateVietQR(rental.so_hop_dong, rental.tong_tien);

        return res.json({
            success: true,
            data: {
                ...rental,
                payment_info: paymentInfo,
                qr_code_url: paymentInfo.qr_code_url,
                transfer_content: paymentInfo.transfer_content,
                bank_info: paymentInfo
            }
        });
    } catch (error) {
        console.error('Lỗi khi lấy thông tin thanh toán:', error);
        return res.status(500).json({ success: false, message: 'Lỗi server nội bộ' });
    }
};

// Xác nhận thanh toán hợp đồng thuê đất
const confirmPayment = async (req, res) => {
    const pool = await getPool();
    const transaction = new sql.Transaction(pool);

    try {
        const id = parseInt(req.params.id, 10);
        await transaction.begin();

        const rentalCheck = await new sql.Request(transaction)
            .input('id', sql.Int, id)
            .query(`
                SELECT h.ma_hop_dong, h.so_hop_dong, h.ma_nguoi_dung, h.ma_o_dat, h.tong_tien,
                       h.trang_thai_thanh_toan, h.trang_thai_hop_dong, o.so_hieu_o, o.ten_o_dat
                FROM HopDongThue h
                JOIN ODat o ON o.ma_o_dat = h.ma_o_dat
                WHERE h.ma_hop_dong = @id
            `);

        const rental = rentalCheck.recordset[0];
        if (!rental) {
            await transaction.rollback();
            return res.status(404).json({ success: false, message: 'Không tìm thấy hợp đồng' });
        }

        if (rental.trang_thai_thanh_toan === 'da_thanh_toan') {
            await transaction.rollback();
            return res.status(200).json({
                success: true,
                message: 'Hợp đồng này đã được thanh toán trước đó',
                data: rental
            });
        }

        // 1. Cập nhật hợp đồng sang da_thanh_toan & hieu_luc
        const updateContract = await new sql.Request(transaction)
            .input('id', sql.Int, id)
            .query(`
                UPDATE HopDongThue
                SET trang_thai_thanh_toan = 'da_thanh_toan',
                    trang_thai_hop_dong = 'hieu_luc',
                    ngay_cap_nhat = SYSDATETIME()
                OUTPUT INSERTED.*
                WHERE ma_hop_dong = @id
            `);

        // 2. Cập nhật ô đất sang da_thue
        await new sql.Request(transaction)
            .input('ma_o_dat', sql.Int, rental.ma_o_dat)
            .query(`
                UPDATE ODat
                SET trang_thai = 'da_thue',
                    ngay_cap_nhat = SYSDATETIME()
                WHERE ma_o_dat = @ma_o_dat
            `);

        await transaction.commit();

        const updatedContract = updateContract.recordset[0];

        // 3. Thông báo cho khách hàng
        createNotification(
            rental.ma_nguoi_dung,
            `Thanh toán thành công: Hợp đồng ${rental.so_hop_dong}`,
            `Thanh toán số tiền ${Number(rental.tong_tien).toLocaleString('vi-VN')} đ cho ô đất ${rental.so_hieu_o} đã hoàn tất. Hợp đồng của bạn hiện đã có hiệu lực!`,
            'thanh_toan',
            '/user?tab=gardens'
        ).catch((err) => console.error('Lỗi thông báo khách hàng:', err));

        // 4. Thông báo cho Admin
        notifyAdmins(
            `Đã thanh toán hợp đồng: ${rental.so_hieu_o}`,
            `Khách hàng đã thanh toán thành công hợp đồng ${rental.so_hop_dong} (Tổng: ${Number(rental.tong_tien).toLocaleString('vi-VN')} đ). Vui lòng phân công nông dân chăm sóc.`,
            'thanh_toan',
            '/admin?tab=assignments'
        ).catch((err) => console.error('Lỗi thông báo admin:', err));

        return res.json({
            success: true,
            message: 'Xác nhận thanh toán thành công! Hợp đồng đã có hiệu lực.',
            data: updatedContract
        });
    } catch (error) {
        try { await transaction.rollback(); } catch (rbErr) {}
        console.error('Lỗi khi xác nhận thanh toán:', error);
        return res.status(500).json({ success: false, message: 'Lỗi server khi xác nhận thanh toán' });
    }
};

// Gia hạn thời gian thuê ô đất (Nhiệm vụ 23/09)
const extendRental = async (req, res) => {
    const pool = await getPool();
    const transaction = new sql.Transaction(pool);

    try {
        const id = parseInt(req.params.id, 10);
        let additionalMonths = parseInt(req.body.so_thang_gia_han || req.body.additional_months || req.body.months || 0, 10);
        let additionalDays = parseInt(req.body.so_ngay_gia_han || req.body.additional_days || 0, 10);

        if (additionalMonths <= 0 && additionalDays <= 0) {
            additionalMonths = 1;
        }

        await transaction.begin();

        // 1. Kiểm tra hợp đồng
        const checkReq = new sql.Request(transaction);
        const contractRes = await checkReq
            .input('id', sql.Int, id)
            .query(`
                SELECT h.*, o.so_hieu_o, o.ten_o_dat, o.gia_thue_thang, u.ho_va_ten AS ten_khach_hang, u.email AS email_khach_hang
                FROM HopDongThue h
                JOIN ODat o ON o.ma_o_dat = h.ma_o_dat
                JOIN NguoiDung u ON u.ma_nguoi_dung = h.ma_nguoi_dung
                WHERE h.ma_hop_dong = @id
            `);

        const contract = contractRes.recordset[0];
        if (!contract) {
            await transaction.rollback();
            return res.status(404).json({ success: false, message: 'Không tìm thấy hợp đồng' });
        }

        if (contract.trang_thai_hop_dong === 'da_ket_thuc' || contract.trang_thai_hop_dong === 'da_huy') {
            await transaction.rollback();
            return res.status(400).json({ success: false, message: 'Hợp đồng đã kết thúc hoặc bị hủy, không thể gia hạn' });
        }

        // 2. Tính toán chi phí gia hạn & ngày kết thúc mới
        const monthlyPrice = Number(contract.gia_thue_thang || contract.don_gia_thang);
        let extensionCost = 0;
        let newEndDate;
        let newTotalMonths = contract.thoi_han_thang;

        const currentEndDate = new Date(contract.ngay_ket_thuc);

        if (additionalMonths > 0) {
            extensionCost = monthlyPrice * additionalMonths;
            newTotalMonths += additionalMonths;
            newEndDate = new Date(currentEndDate);
            newEndDate.setMonth(newEndDate.getMonth() + additionalMonths);
        } else {
            extensionCost = Math.round((monthlyPrice / 30) * additionalDays);
            newEndDate = new Date(currentEndDate);
            newEndDate.setDate(newEndDate.getDate() + additionalDays);
        }

        const newEndDateStr = newEndDate.toISOString().split('T')[0];
        const newTotalAmount = Number(contract.tong_tien) + extensionCost;

        // 3. Cập nhật ngày kết thúc, thời hạn và tổng tiền trong HopDongThue
        const updateReq = new sql.Request(transaction);
        await updateReq
            .input('id', sql.Int, id)
            .input('newEndDate', sql.Date, newEndDateStr)
            .input('newTotalMonths', sql.Int, newTotalMonths)
            .input('newTotalAmount', sql.Decimal(14, 2), newTotalAmount)
            .query(`
                UPDATE HopDongThue
                SET ngay_ket_thuc = @newEndDate,
                    thoi_han_thang = @newTotalMonths,
                    tong_tien = @newTotalAmount,
                    ngay_cap_nhat = SYSDATETIME()
                WHERE ma_hop_dong = @id
            `);

        await transaction.commit();

        // 4. Sinh mã thanh toán VietQR cho khoản phí gia hạn
        const qrContent = `${contract.so_hop_dong}-GH${additionalMonths > 0 ? additionalMonths + 'T' : additionalDays + 'N'}`;
        const paymentInfo = generateVietQR(qrContent, extensionCost);

        // 5. Gửi thông báo cho Khách hàng & Admin
        try {
            await createNotification(
                contract.ma_nguoi_dung,
                'Gia hạn hợp đồng thành công',
                `Hợp đồng ${contract.so_hop_dong} (${contract.so_hieu_o}) đã được gia hạn thêm ${additionalMonths > 0 ? additionalMonths + ' tháng' : additionalDays + ' ngày'} đến ngày ${newEndDate.toLocaleDateString('vi-VN')}. Chi phí gia hạn: ${extensionCost.toLocaleString('vi-VN')} đ.`,
                'thue_dat',
                '/user'
            );
            await notifyAdmins(
                `Yêu cầu gia hạn hợp đồng: ${contract.so_hop_dong}`,
                `Khách hàng ${contract.ten_khach_hang} vừa gia hạn hợp đồng ${contract.so_hop_dong} (${contract.so_hieu_o}) thêm ${additionalMonths > 0 ? additionalMonths + ' tháng' : additionalDays + ' ngày'}. Phí gia hạn: ${extensionCost.toLocaleString('vi-VN')} đ.`,
                'thue_dat',
                '/admin?tab=rentals'
            );
        } catch (notifErr) {
            console.error('Lỗi gửi thông báo gia hạn:', notifErr);
        }

        return res.json({
            success: true,
            message: `Gia hạn hợp đồng thành công thêm ${additionalMonths > 0 ? additionalMonths + ' tháng' : additionalDays + ' ngày'}`,
            data: {
                ma_hop_dong: contract.ma_hop_dong,
                so_hop_dong: contract.so_hop_dong,
                so_thang_gia_han: additionalMonths,
                so_ngay_gia_han: additionalDays,
                chi_phi_gia_han: extensionCost,
                ngay_ket_thuc_cu: contract.ngay_ket_thuc,
                ngay_ket_thuc_moi: newEndDateStr,
                tong_tien_moi: newTotalAmount,
                payment_info: paymentInfo,
                qr_code_url: paymentInfo.qr_code_url
            }
        });
    } catch (error) {
        try { await transaction.rollback(); } catch (rbErr) {}
        console.error('Lỗi khi gia hạn hợp đồng:', error);
        return res.status(500).json({ success: false, message: 'Lỗi server khi gia hạn hợp đồng' });
    }
};

// Khởi tạo vụ mùa mới cho khách hàng cũ đang có hợp đồng còn hạn (Nhiệm vụ 24/09)
const chooseNewCrop = async (req, res) => {
    const pool = await getPool();
    const transaction = new sql.Transaction(pool);

    try {
        const id = parseInt(req.params.id, 10);
        const { ma_cay_trong, crop_id, yeu_cau_dac_biet } = req.body;
        const newCropId = parseInt(ma_cay_trong || crop_id, 10);

        if (!newCropId) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng chọn loại giống cây trồng cho vụ mùa mới'
            });
        }

        await transaction.begin();

        // 1. Kiểm tra hợp đồng thuê
        const contractReq = new sql.Request(transaction);
        const contractRes = await contractReq
            .input('id', sql.Int, id)
            .query(`
                SELECT h.*, o.so_hieu_o, o.ten_o_dat, u.ho_va_ten AS ten_khach_hang
                FROM HopDongThue h
                JOIN ODat o ON o.ma_o_dat = h.ma_o_dat
                JOIN NguoiDung u ON u.ma_nguoi_dung = h.ma_nguoi_dung
                WHERE h.ma_hop_dong = @id
            `);

        const contract = contractRes.recordset[0];
        if (!contract) {
            await transaction.rollback();
            return res.status(404).json({ success: false, message: 'Không tìm thấy hợp đồng thuê' });
        }

        if (contract.trang_thai_hop_dong === 'da_ket_thuc' || contract.trang_thai_hop_dong === 'da_huy') {
            await transaction.rollback();
            return res.status(400).json({ success: false, message: 'Hợp đồng đã kết thúc hoặc bị hủy, không thể trồng vụ mới' });
        }

        const now = new Date();
        const endDate = new Date(contract.ngay_ket_thuc);
        const remainingDays = Math.max(0, Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)));

        if (remainingDays <= 0) {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                message: 'Hợp đồng thuê đất đã hết hạn. Vui lòng gia hạn thêm thời gian thuê trước khi chọn cây trồng vụ mới.'
            });
        }

        // 2. Kiểm tra thông tin cây trồng mới
        const cropReq = new sql.Request(transaction);
        const cropRes = await cropReq
            .input('cropId', sql.Int, newCropId)
            .query(`SELECT ma_cay_trong, ten_cay_trong, thoi_gian_sinh_truong_ngay, hinh_anh_cay, gia_cay FROM CayTrong WHERE ma_cay_trong = @cropId`);

        const crop = cropRes.recordset[0];
        if (!crop) {
            await transaction.rollback();
            return res.status(404).json({ success: false, message: 'Không tìm thấy loại cây trồng đã chọn' });
        }

        // 3. So sánh thời gian sinh trưởng của cây mới với số ngày thuê còn lại
        if (crop.thoi_gian_sinh_truong_ngay && crop.thoi_gian_sinh_truong_ngay > remainingDays) {
            const suggestedReq = new sql.Request(transaction);
            const suggestedCrops = await suggestedReq
                .input('remainingDays', sql.Int, remainingDays)
                .query(`
                    SELECT ma_cay_trong, ten_cay_trong, thoi_gian_sinh_truong_ngay, hinh_anh_cay, gia_cay
                    FROM CayTrong
                    WHERE thoi_gian_sinh_truong_ngay <= @remainingDays
                    ORDER BY thoi_gian_sinh_truong_ngay DESC
                `);

            await transaction.rollback();
            const daysNeededMore = crop.thoi_gian_sinh_truong_ngay - remainingDays;
            const monthsNeededMore = Math.ceil(daysNeededMore / 30);

            return res.status(400).json({
                success: false,
                code: 'GROWTH_TIME_EXCEEDS_REMAINING_RENTAL',
                message: `Cây "${crop.ten_cay_trong}" cần ${crop.thoi_gian_sinh_truong_ngay} ngày để sinh trưởng, nhưng thời hạn thuê của bạn chỉ còn ${remainingDays} ngày. Bạn cần gia hạn thêm tối thiểu ${monthsNeededMore} tháng hoặc chọn loại cây ngắn ngày hơn.`,
                data: {
                    crop_name: crop.ten_cay_trong,
                    growth_days: crop.thoi_gian_sinh_truong_ngay,
                    remaining_days: remainingDays,
                    months_needed_more: monthsNeededMore,
                    suggested_crops: suggestedCrops.recordset
                }
            });
        }

        // 4. Cập nhật hợp đồng: gắn ma_cay_trong mới và chuyển trang_thai_canh_tac = 'cho_gieo_trong'
        const updateContractReq = new sql.Request(transaction);
        await updateContractReq
            .input('id', sql.Int, id)
            .input('cropId', sql.Int, newCropId)
            .input('yeuCau', sql.NVarChar(500), yeu_cau_dac_biet || contract.yeu_cau_dac_biet)
            .query(`
                UPDATE HopDongThue
                SET ma_cay_trong = @cropId,
                    trang_thai_canh_tac = 'cho_gieo_trong',
                    yeu_cau_dac_biet = @yeuCau,
                    ngay_cap_nhat = SYSDATETIME()
                WHERE ma_hop_dong = @id
            `);

        // 5. Cập nhật trạng thái vụ mùa của Ô đất thành 'dang_canh_tac'
        const updatePlotReq = new sql.Request(transaction);
        await updatePlotReq
            .input('plotId', sql.Int, contract.ma_o_dat)
            .query(`
                UPDATE ODat
                SET trang_thai = 'da_thue',
                    trang_thai_vu_mua = 'dang_canh_tac',
                    ngay_cap_nhat = SYSDATETIME()
                WHERE ma_o_dat = @plotId
            `);

        // 6. Reset hoặc tạo mới phân công nông dân để bắt đầu chăm sóc vụ mùa mới
        const checkAssignReq = new sql.Request(transaction);
        const assignCheck = await checkAssignReq
            .input('contractId', sql.Int, id)
            .query(`SELECT TOP 1 ma_phan_cong, ma_nong_dan FROM PhanCongNongDan WHERE ma_hop_dong = @contractId ORDER BY ma_phan_cong DESC`);

        if (assignCheck.recordset.length > 0) {
            const assign = assignCheck.recordset[0];
            await new sql.Request(transaction)
                .input('assignId', sql.Int, assign.ma_phan_cong)
                .query(`UPDATE PhanCongNongDan SET trang_thai = 'dang_thuc_hien', ngay_cap_nhat = SYSDATETIME() WHERE ma_phan_cong = @assignId`);
        }

        await transaction.commit();

        // 7. Gửi thông báo cho khách hàng và Admin
        createNotification(
            contract.ma_nguoi_dung,
            'Khởi tạo vụ mùa mới thành công',
            `Bạn đã chọn giống cây "${crop.ten_cay_trong}" cho chu kỳ canh tác mới trên ô đất ${contract.so_hieu_o}. Nông dân sẽ sớm bắt đầu gieo trồng!`,
            'canh_tac',
            '/user?tab=gardens'
        ).catch(e => console.error('Lỗi thông báo KH:', e));

        notifyAdmins(
            `Vụ mùa mới trên ô đất ${contract.so_hieu_o}`,
            `Khách hàng ${contract.ten_khach_hang} vừa chọn cây "${crop.ten_cay_trong}" cho chu kỳ canh tác tiếp theo trên ô đất ${contract.so_hieu_o} (Hợp đồng: ${contract.so_hop_dong}).`,
            'canh_tac',
            '/admin?tab=assignments'
        ).catch(e => console.error('Lỗi thông báo Admin:', e));

        return res.json({
            success: true,
            message: `Khởi tạo vụ mùa mới thành công! Đã chọn giống cây "${crop.ten_cay_trong}" cho ô đất ${contract.so_hieu_o}.`,
            data: {
                ma_hop_dong: contract.ma_hop_dong,
                so_hop_dong: contract.so_hop_dong,
                ma_cay_trong: crop.ma_cay_trong,
                ten_cay_trong: crop.ten_cay_trong,
                thoi_gian_sinh_truong_ngay: crop.thoi_gian_sinh_truong_ngay,
                trang_thai_canh_tac: 'cho_gieo_trong',
                so_ngay_thue_con_lai: remainingDays
            }
        });
    } catch (error) {
        try { await transaction.rollback(); } catch (rbErr) {}
        console.error('Lỗi khi khởi tạo vụ mùa mới:', error);
        return res.status(500).json({ success: false, message: 'Lỗi server khi khởi tạo vụ mùa mới' });
    }
};

module.exports = {
    createRental,
    getAllRentals,
    getRentalsByUser,
    getActiveRentals,
    getRentalById,
    updateCultivationStatus,
    getPaymentInfo,
    confirmPayment,
    markHarvestReady,
    getHarvestDeliveriesForFarmer,
    getHarvestDeliveriesForUser,
    chooseHarvestDelivery,
    handoverHarvestDelivery,
    generateVietQR,
    extendRental,
    chooseNewCrop
};
