const { sql, getPool } = require('../config/db');

// Nông dân thêm bài viết nhật ký canh tác mới
const createJournal = async (req, res) => {
    try {
        const {
            ma_hop_dong,
            ma_nong_dan,
            giai_doan_sinh_truong,
            tieu_de,
            noi_dung,
            hinh_anh,
            chieu_cao_cay_cm,
            do_am_dat_phan_tram,
            nhiet_do_moi_truong_c,
            do_am_khong_khi_phan_tram,
            thoi_tiet,
            cong_viec_da_lam,
            loai_phan_bon_da_dung,
            loai_phan_bon,
            thuoc_sinh_hoc_da_dung,
            ghi_chu_chi_tiet,
            danh_sach_hinh_anh,
            video_ghi_hinh
        } = req.body;

        const effectiveHopDong = ma_hop_dong ? parseInt(ma_hop_dong, 10) : null;
        if (!effectiveHopDong) {
            return res.status(400).json({ success: false, message: 'Vui lòng cung cấp mã hợp đồng (ma_hop_dong)' });
        }

        // Nông dân ghi: lấy từ user token nếu có, hoặc từ body, hoặc mặc định 2 (nông dân mẫu)
        const farmerId = req.user?.sub ? parseInt(req.user.sub, 10) : (ma_nong_dan ? parseInt(ma_nong_dan, 10) : 2);

        // Công việc đã làm / tiêu đề
        const task = (cong_viec_da_lam || tieu_de || 'Chăm sóc định kỳ cây trồng').trim();

        // Ghi chú chi tiết / nội dung
        const note = (ghi_chu_chi_tiet || noi_dung || 'Cây phát triển đều, tình trạng tốt.').trim();

        // Hình ảnh: hỗ trợ mảng hoặc chuỗi đơn
        let imagesJson = null;
        if (danh_sach_hinh_anh) {
            imagesJson = typeof danh_sach_hinh_anh === 'string' ? danh_sach_hinh_anh : JSON.stringify(danh_sach_hinh_anh);
        } else if (hinh_anh) {
            imagesJson = JSON.stringify([hinh_anh]);
        }

        const stage = giai_doan_sinh_truong || 'Sinh trưởng';
        const fertilizer = loai_phan_bon_da_dung || loai_phan_bon || null;

        const pool = await getPool();
        const result = await pool.request()
            .input('ma_hop_dong', sql.Int, effectiveHopDong)
            .input('ma_nong_dan', sql.Int, farmerId)
            .input('giai_doan_sinh_truong', sql.NVarChar(50), stage)
            .input('chieu_cao_cay_cm', sql.Decimal(5, 2), chieu_cao_cay_cm ? parseFloat(chieu_cao_cay_cm) : null)
            .input('do_am_dat_phan_tram', sql.Decimal(5, 2), do_am_dat_phan_tram ? parseFloat(do_am_dat_phan_tram) : null)
            .input('nhiet_do_moi_truong_c', sql.Decimal(5, 2), nhiet_do_moi_truong_c ? parseFloat(nhiet_do_moi_truong_c) : null)
            .input('do_am_khong_khi_phan_tram', sql.Decimal(5, 2), do_am_khong_khi_phan_tram ? parseFloat(do_am_khong_khi_phan_tram) : null)
            .input('thoi_tiet', sql.NVarChar(50), thoi_tiet || 'Nắng ấm')
            .input('cong_viec_da_lam', sql.NVarChar(150), task)
            .input('loai_phan_bon_da_dung', sql.NVarChar(150), fertilizer)
            .input('thuoc_sinh_hoc_da_dung', sql.NVarChar(150), thuoc_sinh_hoc_da_dung || null)
            .input('ghi_chu_chi_tiet', sql.NVarChar(sql.MAX), note)
            .input('danh_sach_hinh_anh', sql.NVarChar(sql.MAX), imagesJson)
            .input('video_ghi_hinh', sql.NVarChar(500), video_ghi_hinh || null)
            .query(`
                INSERT INTO NhatKyCanhTac (
                    ma_hop_dong, ma_nong_dan, giai_doan_sinh_truong,
                    chieu_cao_cay_cm, do_am_dat_phan_tram, nhiet_do_moi_truong_c, do_am_khong_khi_phan_tram,
                    thoi_tiet, cong_viec_da_lam, loai_phan_bon_da_dung, thuoc_sinh_hoc_da_dung,
                    ghi_chu_chi_tiet, danh_sach_hinh_anh, video_ghi_hinh
                )
                OUTPUT INSERTED.*
                VALUES (
                    @ma_hop_dong, @ma_nong_dan, @giai_doan_sinh_truong,
                    @chieu_cao_cay_cm, @do_am_dat_phan_tram, @nhiet_do_moi_truong_c, @do_am_khong_khi_phan_tram,
                    @thoi_tiet, @cong_viec_da_lam, @loai_phan_bon_da_dung, @thuoc_sinh_hoc_da_dung,
                    @ghi_chu_chi_tiet, @danh_sach_hinh_anh, @video_ghi_hinh
                )
            `);

        const created = result.recordset[0];

        res.status(201).json({
            success: true,
            message: 'Đã thêm nhật ký canh tác thành công',
            data: {
                ...created,
                tieu_de: created.cong_viec_da_lam,
                noi_dung: created.ghi_chu_chi_tiet,
                hinh_anh: imagesJson ? (imagesJson.startsWith('[') ? (JSON.parse(imagesJson)[0] || null) : imagesJson) : null
            }
        });
    } catch (error) {
        console.error('Lỗi khi thêm nhật ký canh tác:', error);
        res.status(500).json({ success: false, message: 'Lỗi server nội bộ: ' + (error.message || '') });
    }
};

// Lấy lịch sử nhật ký theo mã hợp đồng
const getJournalsByRental = async (req, res) => {
    try {
        const { rentalId } = req.params;
        const pool = await getPool();
        const result = await pool.request()
            .input('ma_hop_dong', sql.Int, parseInt(rentalId, 10))
            .query(`
                SELECT j.*, u.ho_va_ten AS ten_nong_dan, u.email AS email_nong_dan,
                       c.ten_cay_trong, o.so_hieu_o, o.ten_o_dat
                FROM NhatKyCanhTac j
                LEFT JOIN NguoiDung u ON u.ma_nguoi_dung = j.ma_nong_dan
                LEFT JOIN HopDongThue h ON h.ma_hop_dong = j.ma_hop_dong
                LEFT JOIN CayTrong c ON c.ma_cay_trong = h.ma_cay_trong
                LEFT JOIN ODat o ON o.ma_o_dat = h.ma_o_dat
                WHERE j.ma_hop_dong = @ma_hop_dong
                ORDER BY j.ngay_ghi_nhat_ky DESC, j.ngay_tao DESC
            `);

        const formatted = result.recordset.map(item => ({
            ...item,
            tieu_de: item.cong_viec_da_lam,
            noi_dung: item.ghi_chu_chi_tiet,
            hinh_anh: item.danh_sach_hinh_anh ? (item.danh_sach_hinh_anh.startsWith('[') ? (JSON.parse(item.danh_sach_hinh_anh)[0] || null) : item.danh_sach_hinh_anh) : null
        }));

        res.status(200).json({
            success: true,
            count: formatted.length,
            data: formatted
        });
    } catch (error) {
        console.error('Lỗi khi lấy nhật ký canh tác:', error);
        res.status(500).json({ success: false, message: 'Lỗi server nội bộ: ' + (error.message || '') });
    }
};

// Nông dân chỉnh sửa một bản ghi khi nhập sai thông tin
const updateJournal = async (req, res) => {
    try {
        const { id } = req.params;
        const { giai_doan_sinh_truong, cong_viec_da_lam, loai_phan_bon_da_dung, ghi_chu_chi_tiet, danh_sach_hinh_anh, video_ghi_hinh } = req.body;
        const pool = await getPool();
        const result = await pool.request()
            .input('id', sql.Int, parseInt(id, 10))
            .input('stage', sql.NVarChar(50), giai_doan_sinh_truong || null)
            .input('task', sql.NVarChar(150), cong_viec_da_lam || null)
            .input('fertilizer', sql.NVarChar(150), loai_phan_bon_da_dung || null)
            .input('note', sql.NVarChar(sql.MAX), ghi_chu_chi_tiet || null)
            .input('images', sql.NVarChar(sql.MAX), danh_sach_hinh_anh || null)
            .input('video', sql.NVarChar(500), video_ghi_hinh || null)
            .query(`
                UPDATE NhatKyCanhTac
                SET giai_doan_sinh_truong = COALESCE(@stage, giai_doan_sinh_truong),
                    cong_viec_da_lam = COALESCE(@task, cong_viec_da_lam),
                    loai_phan_bon_da_dung = COALESCE(@fertilizer, loai_phan_bon_da_dung),
                    ghi_chu_chi_tiet = COALESCE(@note, ghi_chu_chi_tiet),
                    danh_sach_hinh_anh = COALESCE(@images, danh_sach_hinh_anh),
                    video_ghi_hinh = COALESCE(@video, video_ghi_hinh)
                OUTPUT INSERTED.*
                WHERE ma_nhat_ky = @id
            `);
        if (!result.recordset[0]) return res.status(404).json({ success: false, message: 'Không tìm thấy nhật ký' });
        return res.json({ success: true, message: 'Đã cập nhật nhật ký', data: result.recordset[0] });
    } catch (error) {
        console.error('Lỗi cập nhật nhật ký:', error);
        return res.status(500).json({ success: false, message: 'Lỗi server nội bộ' });
    }
};

module.exports = { createJournal, getJournalsByRental, updateJournal };
