const { sql, getPool } = require('../config/db');

const getFarmers = async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`
            SELECT ma_nguoi_dung AS id, ho_va_ten AS name, email
            FROM NguoiDung
            WHERE vai_tro = 'nong_dan' AND trang_thai = 'hoat_dong'
            ORDER BY ho_va_ten
        `);
        return res.json({ success: true, data: result.recordset });
    } catch (error) {
        console.error('Lỗi lấy danh sách nông dân:', error);
        return res.status(500).json({ success: false, message: 'Không thể tải danh sách nông dân' });
    }
};

const getAssignments = async (req, res) => {
    try {
        const pool = await getPool();
        const request = pool.request();
        let filter = '';
        if (req.user.role === 'nong_dan') {
            request.input('farmerId', sql.Int, Number(req.user.sub));
            filter = 'AND p.ma_nong_dan = @farmerId';
        }
        const result = await request.query(`
            SELECT p.ma_phan_cong, p.ma_hop_dong, p.ma_nong_dan, p.trang_thai,
                   p.ghi_chu, p.ngay_gui, p.ngay_phan_hoi,
                   o.so_hieu_o, o.ten_o_dat, k.ho_va_ten AS ten_khach_hang,
                   n.ho_va_ten AS ten_nong_dan, n.email AS email_nong_dan
            FROM PhanCongNongDan p
            JOIN HopDongThue h ON h.ma_hop_dong = p.ma_hop_dong
            JOIN ODat o ON o.ma_o_dat = h.ma_o_dat
            JOIN NguoiDung k ON k.ma_nguoi_dung = h.ma_nguoi_dung
            JOIN NguoiDung n ON n.ma_nguoi_dung = p.ma_nong_dan
            WHERE h.trang_thai_hop_dong = 'hieu_luc' ${filter}
            ORDER BY p.ngay_gui DESC
        `);
        return res.json({ success: true, data: result.recordset });
    } catch (error) {
        console.error('Lỗi lấy phân công:', error);
        return res.status(500).json({ success: false, message: 'Không thể tải danh sách phân công' });
    }
};

const createAssignment = async (req, res) => {
    try {
        const { ma_hop_dong, ma_nong_dan, ghi_chu } = req.body;
        if (!ma_hop_dong || !ma_nong_dan) return res.status(400).json({ success: false, message: 'Vui lòng chọn hợp đồng và nông dân' });

        const pool = await getPool();
        const result = await pool.request()
            .input('contractId', sql.Int, Number(ma_hop_dong))
            .input('farmerId', sql.Int, Number(ma_nong_dan))
            .input('adminId', sql.Int, Number(req.user.sub))
            .input('note', sql.NVarChar(500), ghi_chu || null)
            .query(`
                DECLARE @farmerRole VARCHAR(20), @contractStatus VARCHAR(20);
                SELECT @farmerRole = vai_tro FROM NguoiDung WHERE ma_nguoi_dung = @farmerId AND trang_thai = 'hoat_dong';
                SELECT @contractStatus = trang_thai_hop_dong FROM HopDongThue WHERE ma_hop_dong = @contractId;
                IF @farmerRole <> 'nong_dan' OR @farmerRole IS NULL THROW 50001, 'Tài khoản được chọn không phải nông dân đang hoạt động', 1;
                IF @contractStatus <> 'hieu_luc' OR @contractStatus IS NULL THROW 50002, 'Hợp đồng không còn hiệu lực', 1;
                UPDATE PhanCongNongDan
                SET ma_nong_dan = @farmerId, ma_quan_tri = @adminId, trang_thai = 'cho_tiep_nhan',
                    ghi_chu = @note, ngay_gui = SYSDATETIME(), ngay_phan_hoi = NULL
                WHERE ma_hop_dong = @contractId AND trang_thai <> 'da_huy';
                IF @@ROWCOUNT = 0
                    INSERT INTO PhanCongNongDan (ma_hop_dong, ma_nong_dan, ma_quan_tri, ghi_chu)
                    VALUES (@contractId, @farmerId, @adminId, @note);
            `);
        return res.status(201).json({ success: true, message: 'Đã gửi yêu cầu phân công tới nông dân' });
    } catch (error) {
        console.error('Lỗi phân công nông dân:', error);
        return res.status(400).json({ success: false, message: error.message?.includes('nông dân') || error.message?.includes('Hợp đồng') ? error.message : 'Không thể tạo phân công' });
    }
};

const respondToAssignment = async (req, res) => {
    try {
        const { status } = req.body;
        if (!['da_chap_nhan', 'tu_choi'].includes(status)) return res.status(400).json({ success: false, message: 'Phản hồi phân công không hợp lệ' });
        const pool = await getPool();
        const result = await pool.request()
            .input('id', sql.Int, Number(req.params.id))
            .input('farmerId', sql.Int, Number(req.user.sub))
            .input('status', sql.VarChar(20), status)
            .query(`
                UPDATE PhanCongNongDan
                SET trang_thai = @status, ngay_phan_hoi = SYSDATETIME()
                OUTPUT INSERTED.ma_phan_cong, INSERTED.ma_hop_dong, INSERTED.trang_thai
                WHERE ma_phan_cong = @id AND ma_nong_dan = @farmerId AND trang_thai = 'cho_tiep_nhan'
            `);
        if (!result.recordset[0]) return res.status(404).json({ success: false, message: 'Không tìm thấy lời mời phân công đang chờ' });
        return res.json({ success: true, message: status === 'da_chap_nhan' ? 'Đã nhận phân công' : 'Đã từ chối phân công', data: result.recordset[0] });
    } catch (error) {
        console.error('Lỗi phản hồi phân công:', error);
        return res.status(500).json({ success: false, message: 'Không thể phản hồi phân công' });
    }
};

module.exports = { getFarmers, getAssignments, createAssignment, respondToAssignment };
