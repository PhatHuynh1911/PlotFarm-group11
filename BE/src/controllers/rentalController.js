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

        // 1. Kiểm tra ô đất còn trống + lấy giá thật từ DB
        const checkResult = await new sql.Request(transaction)
            .input('ma_o_dat', sql.Int, parseInt(ma_o_dat, 10))
            .query(`SELECT so_hieu_o, ten_o_dat, trang_thai, gia_thue_thang FROM ODat WHERE ma_o_dat = @ma_o_dat`);

        const oDat = checkResult.recordset[0];

        if (!oDat) {
            await transaction.rollback();
            return res.status(404).json({ success: false, message: 'Không tìm thấy ô đất' });
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
                       h.tong_tien, h.trang_thai_hop_dong, h.trang_thai_thanh_toan,
                       o.ma_o_dat, o.so_hieu_o, o.ten_o_dat, o.dien_tich_m2, o.hinh_anh_o_dat,
                      c.ma_cay_trong, c.ten_cay_trong, c.hinh_anh_cay,
                      n.ho_va_ten AS ten_nong_dan, p.trang_thai AS trang_thai_phan_cong
                FROM HopDongThue h
                INNER JOIN ODat o ON o.ma_o_dat = h.ma_o_dat
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
                   DATEDIFF(day, h.ngay_bat_dau, SYSDATETIME()) AS so_ngay_da_trong
            FROM HopDongThue h
            JOIN ODat o ON o.ma_o_dat = h.ma_o_dat
            JOIN NguoiDung u ON u.ma_nguoi_dung = h.ma_nguoi_dung
            LEFT JOIN CayTrong c ON c.ma_cay_trong = h.ma_cay_trong
            WHERE h.trang_thai_hop_dong = 'hieu_luc' ${farmerFilter}
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
            .query(`
                UPDATE HopDongThue
                SET trang_thai_canh_tac = @status, ngay_cap_nhat = SYSDATETIME()
                OUTPUT INSERTED.ma_hop_dong, INSERTED.trang_thai_canh_tac
                WHERE ma_hop_dong = @id AND trang_thai_hop_dong = 'hieu_luc'
            `);

        if (!result.recordset[0]) return res.status(404).json({ success: false, message: 'Không tìm thấy hợp đồng đang hoạt động' });
        return res.json({ success: true, message: 'Đã cập nhật trạng thái canh tác', data: result.recordset[0] });
    } catch (error) {
        console.error('Lỗi cập nhật trạng thái canh tác:', error);
        return res.status(500).json({ success: false, message: 'Lỗi server nội bộ' });
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

module.exports = {
    createRental,
    getAllRentals,
    getRentalsByUser,
    getActiveRentals,
    getRentalById,
    updateCultivationStatus,
    getPaymentInfo,
    confirmPayment,
    generateVietQR
};
