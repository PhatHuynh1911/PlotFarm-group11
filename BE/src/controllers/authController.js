const bcrypt = require('bcryptjs');
const { sql, getPool } = require('../config/db');

const publicUser = (user) => ({
    id: user.ma_nguoi_dung,
    name: user.ho_va_ten,
    email: user.email,
    role: user.vai_tro,
    phone: user.so_dien_thoai,
    avatar: user.anh_dai_dien
});

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Vui lòng nhập email và mật khẩu' });
        }

        const pool = await getPool();
        const result = await pool.request()
            .input('email', sql.VarChar(150), email.trim().toLowerCase())
            .query(`SELECT TOP 1 * FROM NguoiDung WHERE email = @email`);
        const user = result.recordset[0];

        if (!user || user.trang_thai !== 'hoat_dong' || !(await bcrypt.compare(password, user.mat_khau))) {
            return res.status(401).json({ success: false, message: 'Email hoặc mật khẩu không đúng' });
        }

        return res.json({ success: true, data: publicUser(user) });
    } catch (error) {
        console.error('Lỗi đăng nhập:', error);
        return res.status(500).json({ success: false, message: 'Không thể kết nối cơ sở dữ liệu' });
    }
};

const register = async (req, res) => {
    try {
        const { name, email, password, role = 'khach_hang' } = req.body;
        if (!name || !email || !password || password.length < 6 || !['khach_hang', 'nong_dan'].includes(role)) {
            return res.status(400).json({ success: false, message: 'Họ tên, email và mật khẩu tối thiểu 6 ký tự là bắt buộc' });
        }

        const pool = await getPool();
        const passwordHash = await bcrypt.hash(password, 10);
        const result = await pool.request()
            .input('name', sql.NVarChar(100), name.trim())
            .input('email', sql.VarChar(150), email.trim().toLowerCase())
            .input('password', sql.VarChar(100), passwordHash)
            .input('role', sql.VarChar(20), role)
            .query(`
                INSERT INTO NguoiDung (ho_va_ten, email, mat_khau, vai_tro, trang_thai)
                OUTPUT INSERTED.ma_nguoi_dung, INSERTED.ho_va_ten, INSERTED.email, INSERTED.vai_tro, INSERTED.so_dien_thoai, INSERTED.anh_dai_dien
                VALUES (@name, @email, @password, @role, 'hoat_dong')
            `);

        return res.status(201).json({ success: true, data: publicUser(result.recordset[0]) });
    } catch (error) {
        if (error.number === 2627 || error.number === 2601) {
            return res.status(409).json({ success: false, message: 'Email này đã được đăng ký' });
        }
        console.error('Lỗi đăng ký:', error);
        return res.status(500).json({ success: false, message: 'Không thể tạo tài khoản' });
    }
};

const getMe = async (req, res) => {
    try {
        const userId = req.query.userId || req.params.id;
        if (!userId) {
            return res.status(400).json({ success: false, message: 'Vui lòng cung cấp userId' });
        }
        const pool = await getPool();
        const result = await pool.request()
            .input('userId', sql.Int, Number(userId))
            .query(`SELECT ma_nguoi_dung, ho_va_ten, email, vai_tro, so_dien_thoai, anh_dai_dien, trang_thai FROM NguoiDung WHERE ma_nguoi_dung = @userId`);
        const user = result.recordset[0];
        if (!user) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
        }
        return res.json({ success: true, data: publicUser(user) });
    } catch (error) {
        console.error('Lỗi lấy thông tin cá nhân:', error);
        return res.status(500).json({ success: false, message: 'Lỗi server nội bộ' });
    }
};

const getAdminDashboard = async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`
            SELECT
                (SELECT COUNT(*) FROM NguoiDung) AS totalUsers,
                (SELECT COUNT(*) FROM ODAT WHERE trang_thai = 'trong') AS availablePlots,
                (SELECT COUNT(*) FROM ODAT WHERE trang_thai = 'da_thue') AS rentedPlots,
                (SELECT COUNT(*) FROM HopDongThue WHERE trang_thai_hop_dong = 'hieu_luc') AS activeContracts
        `);
        return res.json({ success: true, data: result.recordset[0] });
    } catch (error) {
        console.error('Lỗi dashboard admin:', error);
        return res.status(500).json({ success: false, message: 'Không thể tải dữ liệu quản trị' });
    }
};

module.exports = { login, register, getMe, getAdminDashboard };
