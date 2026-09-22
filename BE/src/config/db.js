const sql = require('mssql');
require('dotenv').config();

const serverVal = process.env.DB_SERVER || 'localhost';
const configuredPort = process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : null;
let dbConfig;

if (serverVal.includes('\\')) {
    const [host, instanceName] = serverVal.split('\\');
    dbConfig = {
        user: process.env.DB_USER || 'sa',
        password: process.env.DB_PASSWORD || '12345',
        server: host,
        database: process.env.DB_NAME || 'PlotFarmDB',
        options: {
            instanceName: instanceName,
            encrypt: false,
            trustServerCertificate: true
        }
    };
} else {
    dbConfig = {
        user: process.env.DB_USER || 'sa',
        password: process.env.DB_PASSWORD || '12345',
        server: serverVal,
        database: process.env.DB_NAME || 'PlotFarmDB',
        options: {
            encrypt: false,
            trustServerCertificate: true,
            // Khi dùng TCP port cố định, không để instance từ biến môi trường cũ ghi đè.
            instanceName: configuredPort ? undefined : (process.env.DB_INSTANCE || undefined)
        }
    };
}

if (configuredPort) {
    dbConfig.port = configuredPort;
}

let pool = null;

const getPool = async () => {
    if (!pool || !pool.connected) {
        pool = await sql.connect(dbConfig);
    }
    return pool;
};

const connectDB = async () => {
    try {
        const activePool = await getPool();
        await activePool.request().query(`
            IF COL_LENGTH('dbo.ODat', 'position_x') IS NULL
            BEGIN
                ALTER TABLE dbo.ODat ADD position_x DECIMAL(5, 2) NULL CONSTRAINT DF_ODat_PositionX DEFAULT 50.0;
            END

            IF COL_LENGTH('dbo.ODat', 'position_y') IS NULL
            BEGIN
                ALTER TABLE dbo.ODat ADD position_y DECIMAL(5, 2) NULL CONSTRAINT DF_ODat_PositionY DEFAULT 50.0;
            END
        `);

        // Chạy ở batch mới: SQL Server chỉ nhận diện cột vừa ALTER sau khi batch trước hoàn tất.
        await activePool.request().query(`
            UPDATE dbo.ODat
            SET position_x = CASE so_hieu_o
                    WHEN 'A-01' THEN 18.0 WHEN 'A-02' THEN 35.0 WHEN 'A-03' THEN 52.0
                    WHEN 'A-04' THEN 69.0 WHEN 'A-05' THEN 84.0
                    WHEN 'B-05' THEN 25.0 WHEN 'B-06' THEN 45.0 WHEN 'B-07' THEN 65.0
                    WHEN 'C-09' THEN 22.0 WHEN 'C-10' THEN 50.0 WHEN 'C-11' THEN 78.0
                    ELSE 50.0 END,
                position_y = CASE so_hieu_o
                    WHEN 'A-01' THEN 22.0 WHEN 'A-02' THEN 22.0 WHEN 'A-03' THEN 22.0
                    WHEN 'A-04' THEN 22.0 WHEN 'A-05' THEN 22.0
                    WHEN 'B-05' THEN 50.0 WHEN 'B-06' THEN 50.0 WHEN 'B-07' THEN 50.0
                    WHEN 'C-09' THEN 78.0 WHEN 'C-10' THEN 78.0 WHEN 'C-11' THEN 78.0
                    ELSE 50.0 END
            WHERE position_x IS NULL OR position_y IS NULL;

            IF COL_LENGTH('dbo.HopDongThue', 'trang_thai_canh_tac') IS NULL
            BEGIN
                ALTER TABLE dbo.HopDongThue ADD trang_thai_canh_tac VARCHAR(30) NOT NULL CONSTRAINT DF_HopDongThue_TrangThaiCanhTac DEFAULT 'cho_gieo_trong';
            END

            IF OBJECT_ID('dbo.PhanCongNongDan', 'U') IS NULL
            BEGIN
                CREATE TABLE dbo.PhanCongNongDan (
                    ma_phan_cong INT IDENTITY(1,1) PRIMARY KEY,
                    ma_hop_dong INT NOT NULL FOREIGN KEY REFERENCES dbo.HopDongThue(ma_hop_dong) ON DELETE CASCADE,
                    ma_nong_dan INT NOT NULL FOREIGN KEY REFERENCES dbo.NguoiDung(ma_nguoi_dung),
                    ma_quan_tri INT NOT NULL FOREIGN KEY REFERENCES dbo.NguoiDung(ma_nguoi_dung),
                    trang_thai VARCHAR(20) NOT NULL DEFAULT 'cho_tiep_nhan',
                    ghi_chu NVARCHAR(500) NULL,
                    ly_do_tu_choi NVARCHAR(500) NULL,
                    ngay_gui DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
                    ngay_phan_hoi DATETIME2 NULL,
                    CONSTRAINT UQ_PhanCongNongDan_HopDong_Farmer UNIQUE (ma_hop_dong, ma_nong_dan)
                );
            END

            IF NOT EXISTS (
                SELECT 1
                FROM dbo.PhanCongNongDan p
                INNER JOIN dbo.HopDongThue h ON h.ma_hop_dong = p.ma_hop_dong
                WHERE p.ma_nong_dan = 2 AND h.trang_thai_hop_dong = 'hieu_luc'
            )
            BEGIN
                INSERT INTO dbo.PhanCongNongDan (ma_hop_dong, ma_nong_dan, ma_quan_tri, trang_thai, ghi_chu, ngay_gui, ngay_phan_hoi)
                SELECT TOP 1 h.ma_hop_dong, 2, 1, 'da_chap_nhan', N'Phân công mẫu cho nông dân demo', SYSDATETIME(), SYSDATETIME()
                FROM dbo.HopDongThue h
                WHERE h.trang_thai_hop_dong = 'hieu_luc'
                ORDER BY h.ma_hop_dong;
            END

            IF OBJECT_ID('dbo.KhieuNai', 'U') IS NULL
            BEGIN
                CREATE TABLE dbo.KhieuNai (
                    ma_khieu_nai INT IDENTITY(1,1) PRIMARY KEY,
                    ma_hop_dong INT NOT NULL FOREIGN KEY REFERENCES dbo.HopDongThue(ma_hop_dong) ON DELETE CASCADE,
                    ma_khach_hang INT NOT NULL FOREIGN KEY REFERENCES dbo.NguoiDung(ma_nguoi_dung),
                    ma_o_dat INT NULL FOREIGN KEY REFERENCES dbo.ODat(ma_o_dat),
                    tieu_de NVARCHAR(200) NOT NULL,
                    mo_ta_chi_tiet NVARCHAR(1000) NOT NULL,
                    trang_thai_khieu_nai VARCHAR(30) NOT NULL DEFAULT 'dang_tiep_nhan',
                    phan_hoi_admin NVARCHAR(1000) NULL,
                    ma_admin_xu_ly INT NULL FOREIGN KEY REFERENCES dbo.NguoiDung(ma_nguoi_dung),
                    ngay_gui DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
                    ngay_cap_nhat DATETIME2 NOT NULL DEFAULT SYSDATETIME()
                );
            END

            -- Tương thích database cũ đã có bảng PhanCongNongDan.
            IF COL_LENGTH('dbo.PhanCongNongDan', 'ly_do_tu_choi') IS NULL
            BEGIN
                ALTER TABLE dbo.PhanCongNongDan ADD ly_do_tu_choi NVARCHAR(500) NULL;
            END

            -- Phân loại yêu cầu để tách tab Chăm sóc và Khiếu nại.
            IF COL_LENGTH('dbo.YeuCauDichVu', 'loai_yeu_cau') IS NULL
            BEGIN
                ALTER TABLE dbo.YeuCauDichVu
                ADD loai_yeu_cau VARCHAR(30) NULL;
            END

            -- Tương thích database ThuHoach & GiaoNhanThuHoach
            IF OBJECT_ID('dbo.ThuHoach', 'U') IS NOT NULL
            BEGIN
                ALTER TABLE dbo.ThuHoach ALTER COLUMN san_luong_thuc_te_kg DECIMAL(8, 2) NULL;
            END

            IF OBJECT_ID('dbo.GiaoNhanThuHoach', 'U') IS NULL
            BEGIN
                CREATE TABLE dbo.GiaoNhanThuHoach (
                    ma_giao_nhan INT IDENTITY(1,1) PRIMARY KEY,
                    ma_hop_dong INT NOT NULL UNIQUE FOREIGN KEY REFERENCES dbo.HopDongThue(ma_hop_dong) ON DELETE CASCADE,
                    ma_nong_dan INT NOT NULL FOREIGN KEY REFERENCES dbo.NguoiDung(ma_nguoi_dung),
                    hinh_thuc_nhan VARCHAR(30) NULL,
                    ten_nguoi_nhan NVARCHAR(100) NULL,
                    so_dien_thoai_nhan VARCHAR(20) NULL,
                    dia_chi_nhan NVARCHAR(500) NULL,
                    ghi_chu_khach NVARCHAR(1000) NULL,
                    trang_thai VARCHAR(40) NOT NULL DEFAULT 'cho_khach_chon',
                    ngay_san_sang DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
                    ngay_khach_chon DATETIME2 NULL,
                    ngay_ban_giao DATETIME2 NULL
                );
            END

            -- Dọn dẹp các bảng thừa trùng chức năng (Nhiệm vụ 22/09)
            -- 1. Xóa khóa ngoại tới DanhMucCayTrong nếu còn
            DECLARE @fk_dm NVARCHAR(256);
            SELECT @fk_dm = fk.name 
            FROM sys.foreign_keys fk
            INNER JOIN sys.tables tr ON fk.referenced_object_id = tr.object_id
            WHERE tr.name = 'DanhMucCayTrong';
            IF @fk_dm IS NOT NULL
            BEGIN
                EXEC('ALTER TABLE dbo.CayTrong DROP CONSTRAINT ' + @fk_dm);
            END

            -- 2. Xóa bảng DanhMucCayTrong
            IF OBJECT_ID('dbo.DanhMucCayTrong', 'U') IS NOT NULL
            BEGIN
                DROP TABLE dbo.DanhMucCayTrong;
            END

            -- 3. Xóa bảng GiaoHang
            IF OBJECT_ID('dbo.GiaoHang', 'U') IS NOT NULL
            BEGIN
                DROP TABLE dbo.GiaoHang;
            END

            -- Tự sửa dữ liệu lệch: hợp đồng đã bàn giao (GiaoNhanThuHoach.trang_thai = 'da_ban_giao_van_chuyen')
            -- nhưng HopDongThue/ODat/PhanCongNongDan/ThuHoach chưa được đóng mùa vụ tương ứng.
            IF OBJECT_ID('dbo.GiaoNhanThuHoach', 'U') IS NOT NULL
            BEGIN
                UPDATE h
                SET h.trang_thai_canh_tac = 'da_thu_hoach', h.trang_thai_hop_dong = 'da_ket_thuc'
                FROM dbo.HopDongThue h
                INNER JOIN dbo.GiaoNhanThuHoach g ON g.ma_hop_dong = h.ma_hop_dong
                WHERE g.trang_thai = 'da_ban_giao_van_chuyen'
                  AND (h.trang_thai_canh_tac <> 'da_thu_hoach' OR h.trang_thai_hop_dong <> 'da_ket_thuc');

                UPDATE o
                SET o.trang_thai = 'trong'
                FROM dbo.ODat o
                INNER JOIN dbo.HopDongThue h ON h.ma_o_dat = o.ma_o_dat
                INNER JOIN dbo.GiaoNhanThuHoach g ON g.ma_hop_dong = h.ma_hop_dong
                WHERE g.trang_thai = 'da_ban_giao_van_chuyen' AND o.trang_thai <> 'trong';

                IF OBJECT_ID('dbo.PhanCongNongDan', 'U') IS NOT NULL
                BEGIN
                    UPDATE p
                    SET p.trang_thai = 'hoan_thanh'
                    FROM dbo.PhanCongNongDan p
                    INNER JOIN dbo.GiaoNhanThuHoach g ON g.ma_hop_dong = p.ma_hop_dong
                    WHERE g.trang_thai = 'da_ban_giao_van_chuyen' AND p.trang_thai NOT IN ('hoan_thanh', 'tu_choi', 'da_huy');
                END

                IF OBJECT_ID('dbo.ThuHoach', 'U') IS NOT NULL
                BEGIN
                    UPDATE t
                    SET t.trang_thai = 'da_thu_hoach'
                    FROM dbo.ThuHoach t
                    INNER JOIN dbo.GiaoNhanThuHoach g ON g.ma_hop_dong = t.ma_hop_dong
                    WHERE g.trang_thai = 'da_ban_giao_van_chuyen' AND t.trang_thai <> 'da_thu_hoach';
                END
            END
        `);
        console.log(`✅ Kết nối SQL Server thành công: [${process.env.DB_NAME || 'PlotFarmDB'}] tại ${serverVal}`);
    } catch (error) {
        console.error('❌ Kết nối SQL Server thất bại:', error.message || error);
    }
};

module.exports = { sql, dbConfig, connectDB, getPool };
