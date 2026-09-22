const { sql, getPool } = require('../config/db');
const { createNotification, notifyAdmins } = require('./notificationController');

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
                   p.ghi_chu, p.ly_do_tu_choi, p.ngay_gui, p.ngay_phan_hoi,
                   o.so_hieu_o, o.ten_o_dat, k.ho_va_ten AS ten_khach_hang,
                   n.ho_va_ten AS ten_nong_dan, n.email AS email_nong_dan
            FROM PhanCongNongDan p
            JOIN HopDongThue h ON h.ma_hop_dong = p.ma_hop_dong
            JOIN ODat o ON o.ma_o_dat = h.ma_o_dat
            JOIN NguoiDung k ON k.ma_nguoi_dung = h.ma_nguoi_dung
            JOIN NguoiDung n ON n.ma_nguoi_dung = p.ma_nong_dan
            WHERE h.trang_thai_hop_dong IN ('hieu_luc', 'da_ket_thuc') ${filter}
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
                    ghi_chu = @note, ly_do_tu_choi = NULL, ngay_gui = SYSDATETIME(), ngay_phan_hoi = NULL
                WHERE ma_hop_dong = @contractId AND trang_thai <> 'da_huy';
                IF @@ROWCOUNT = 0
                    INSERT INTO PhanCongNongDan (ma_hop_dong, ma_nong_dan, ma_quan_tri, ghi_chu)
                    VALUES (@contractId, @farmerId, @adminId, @note);
            `);

        // Bắn thông báo tự động cho Nông dân
        const plotInfo = await pool.request()
            .input('contractId', sql.Int, Number(ma_hop_dong))
            .query(`SELECT o.so_hieu_o, o.ten_o_dat FROM HopDongThue h JOIN ODat o ON o.ma_o_dat = h.ma_o_dat WHERE h.ma_hop_dong = @contractId`);
        const plotCode = plotInfo.recordset[0]?.so_hieu_o || `Hợp đồng #${ma_hop_dong}`;

        createNotification(
            ma_nong_dan,
            `Phân công mới: Ô đất ${plotCode}`,
            `Quản trị viên đã phân công bạn phụ trách canh tác ô đất ${plotCode}. Ghi chú: ${ghi_chu || 'Chăm sóc theo lịch'}.`,
            'phan_cong',
            '/farmer'
        ).catch((err) => console.error('Lỗi bắn thông báo farmer:', err));

        return res.status(201).json({ success: true, message: 'Đã gửi yêu cầu phân công tới nông dân' });
    } catch (error) {
        console.error('Lỗi phân công nông dân:', error);
        return res.status(400).json({ success: false, message: error.message?.includes('nông dân') || error.message?.includes('Hợp đồng') ? error.message : 'Không thể tạo phân công' });
    }
};

const respondToAssignment = async (req, res) => {
    try {
        const { status, reason, ly_do_tu_choi } = req.body;
        if (!['da_chap_nhan', 'tu_choi'].includes(status)) return res.status(400).json({ success: false, message: 'Phản hồi phân công không hợp lệ' });

        const rejectReason = (reason || ly_do_tu_choi || '').trim();

        const pool = await getPool();
        const result = await pool.request()
            .input('id', sql.Int, Number(req.params.id))
            .input('farmerId', sql.Int, Number(req.user.sub))
            .input('status', sql.VarChar(20), status)
            .input('reason', sql.NVarChar(500), status === 'tu_choi' ? (rejectReason || 'Nông dân bận lịch/không nhận phân công này') : null)
            .query(`
                UPDATE PhanCongNongDan
                SET trang_thai = @status,
                    ly_do_tu_choi = @reason,
                    ngay_phan_hoi = SYSDATETIME()
                OUTPUT INSERTED.ma_phan_cong, INSERTED.ma_hop_dong, INSERTED.trang_thai, INSERTED.ly_do_tu_choi
                WHERE ma_phan_cong = @id AND ma_nong_dan = @farmerId AND trang_thai = 'cho_tiep_nhan'
            `);

        if (!result.recordset[0]) return res.status(404).json({ success: false, message: 'Không tìm thấy lời mời phân công đang chờ' });

        const assignment = result.recordset[0];

        // Lấy chi tiết thông tin ô đất, hợp đồng và tên nông dân để gửi thông báo
        const detailRes = await pool.request()
            .input('assignmentId', sql.Int, assignment.ma_phan_cong)
            .query(`
                SELECT o.so_hieu_o, o.ten_o_dat, h.so_hop_dong, n.ho_va_ten AS ten_nong_dan
                FROM PhanCongNongDan p
                JOIN HopDongThue h ON h.ma_hop_dong = p.ma_hop_dong
                JOIN ODat o ON o.ma_o_dat = h.ma_o_dat
                JOIN NguoiDung n ON n.ma_nguoi_dung = p.ma_nong_dan
                WHERE p.ma_phan_cong = @assignmentId
            `);
        const detail = detailRes.recordset[0];
        const plotCode = detail?.so_hieu_o || `HĐ #${assignment.ma_hop_dong}`;
        const farmerName = detail?.ten_nong_dan || 'Nông dân';
        const contractCode = detail?.so_hop_dong || `#${assignment.ma_hop_dong}`;

        if (status === 'tu_choi') {
            const finalReason = assignment.ly_do_tu_choi || 'Không nêu lý do';
            await notifyAdmins(
                `Cảnh báo: Nông dân từ chối nhận ô ${plotCode}`,
                `Nông dân ${farmerName} đã từ chối nhận phân công ô đất ${plotCode} (HĐ: ${contractCode}). Lý do: "${finalReason}". Vui lòng kiểm tra và phân công lại nông dân khác.`,
                'phan_cong',
                '/admin?tab=assignments'
            ).catch((err) => console.error('Lỗi bắn thông báo từ chối tới admin:', err));
        } else if (status === 'da_chap_nhan') {
            await notifyAdmins(
                `Nông dân đã nhận phân công: ${plotCode}`,
                `Nông dân ${farmerName} đã đồng ý tiếp nhận chăm sóc ô đất ${plotCode} (HĐ: ${contractCode}).`,
                'phan_cong',
                '/admin?tab=assignments'
            ).catch((err) => console.error('Lỗi bắn thông báo chấp nhận tới admin:', err));
        }

        return res.json({
            success: true,
            message: status === 'da_chap_nhan' ? 'Đã tiếp nhận phân công thành công' : 'Đã từ chối phân công và gửi lý do tới quản trị viên',
            data: assignment
        });
    } catch (error) {
        console.error('Lỗi phản hồi phân công:', error);
        return res.status(500).json({ success: false, message: 'Không thể phản hồi phân công' });
    }
};

module.exports = { getFarmers, getAssignments, createAssignment, respondToAssignment };
