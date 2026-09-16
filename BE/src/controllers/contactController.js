const { sql, getPool } = require('../config/db');
 
// Tiếp nhận form liên hệ tư vấn từ Landing page
const createContact = async (req, res) => {
    try {
        const { ho_va_ten, so_dien_thoai, email, so_hieu_o_quan_tam, noi_dung_tu_van } = req.body;
 
        const phone = String(so_dien_thoai || '').replace(/[.\s()-]/g, '');
        if (!ho_va_ten || !phone) {
            return res.status(400).json({ success: false, message: 'Vui lòng cung cấp họ tên và số điện thoại liên hệ' });
        }
        if (!/^(?:\+84|0)(?:3|5|7|8|9)\d{8}$/.test(phone)) {
            return res.status(400).json({ success: false, message: 'Số điện thoại chưa hợp lệ' });
        }
 
        const pool = await getPool();
        const result = await pool.request()
            .input('ho_va_ten', sql.NVarChar(100), ho_va_ten.trim())
            .input('so_dien_thoai', sql.VarChar(20), phone)
            .input('email', sql.VarChar(150), email ? email.trim().toLowerCase() : null)
            .input('so_hieu_o', sql.VarChar(20), so_hieu_o_quan_tam ? String(so_hieu_o_quan_tam).trim() : null)
            .input('noi_dung', sql.NVarChar(sql.MAX), noi_dung_tu_van || '')
            .query(`
                INSERT INTO LienHeTuVan (ho_va_ten, so_dien_thoai, email, so_hieu_o_quan_tam, noi_dung_tu_van, trang_thai_lien_he)
                OUTPUT INSERTED.*
                VALUES (@ho_va_ten, @so_dien_thoai, @email, @so_hieu_o, @noi_dung, 'moi')
            `);
 
        res.status(201).json({
            success: true,
            message: 'Đã gửi yêu cầu tư vấn thành công! Đội ngũ PlotFarm sẽ liên hệ với bạn sớm nhất.',
            data: result.recordset[0]
        });
    } catch (error) {
        console.error('Lỗi tiếp nhận tư vấn:', error);
        res.status(500).json({ success: false, message: 'Lỗi server nội bộ' });
    }
};
 
// Lấy danh sách liên hệ tư vấn (cho Admin)
const getAllContacts = async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`
            SELECT l.*, o.so_hieu_o, o.ten_o_dat
            FROM LienHeTuVan l
            LEFT JOIN ODat o ON o.so_hieu_o = l.so_hieu_o_quan_tam
            ORDER BY l.ngay_gui DESC
        `);
 
        res.status(200).json({
            success: true,
            count: result.recordset.length,
            data: result.recordset
        });
    } catch (error) {
        console.error('Lỗi lấy danh sách tư vấn:', error);
        res.status(500).json({ success: false, message: 'Lỗi server nội bộ' });
    }
};
 
module.exports = { createContact, getAllContacts };