/*
  PlotFarm - migration tương thích tính năng
  Chạy SAU schema.sql và seed.sql. Script an toàn để chạy nhiều lần, không xóa dữ liệu.
*/
USE PlotFarmDB;
GO

IF COL_LENGTH('dbo.ODat', 'position_x') IS NULL
    ALTER TABLE dbo.ODat ADD position_x DECIMAL(5, 2) NULL CONSTRAINT DF_ODat_PositionX DEFAULT 50.0;
GO
IF COL_LENGTH('dbo.ODat', 'position_y') IS NULL
    ALTER TABLE dbo.ODat ADD position_y DECIMAL(5, 2) NULL CONSTRAINT DF_ODat_PositionY DEFAULT 50.0;
GO
IF COL_LENGTH('dbo.ODat', 'trang_thai_vu_mua') IS NULL
    ALTER TABLE dbo.ODat ADD trang_thai_vu_mua VARCHAR(50) NOT NULL CONSTRAINT DF_ODat_TrangThaiVuMua DEFAULT 'san_sang';
GO
IF COL_LENGTH('dbo.HopDongThue', 'trang_thai_canh_tac') IS NULL
    ALTER TABLE dbo.HopDongThue ADD trang_thai_canh_tac VARCHAR(30) NOT NULL CONSTRAINT DF_HopDongThue_TrangThaiCanhTac DEFAULT 'cho_gieo_trong';
GO

IF OBJECT_ID('dbo.ThongBao', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.ThongBao (
        ma_thong_bao INT IDENTITY(1,1) PRIMARY KEY,
        ma_nguoi_dung INT NOT NULL FOREIGN KEY REFERENCES dbo.NguoiDung(ma_nguoi_dung) ON DELETE CASCADE,
        tieu_de NVARCHAR(150) NOT NULL,
        noi_dung NVARCHAR(500) NOT NULL,
        loai_thong_bao VARCHAR(50) NOT NULL DEFAULT 'he_thong',
        lien_ket VARCHAR(255) NULL,
        da_doc BIT NOT NULL DEFAULT 0,
        ngay_tao DATETIME2 NOT NULL DEFAULT SYSDATETIME()
    );
END
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_ThongBao_NguoiDung' AND object_id = OBJECT_ID('dbo.ThongBao'))
    CREATE INDEX IX_ThongBao_NguoiDung ON dbo.ThongBao(ma_nguoi_dung, da_doc);
GO

IF OBJECT_ID('dbo.ThanhToanGiaHan', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.ThanhToanGiaHan (
        ma_thanh_toan_gia_han INT IDENTITY(1,1) PRIMARY KEY,
        ma_hop_dong INT NOT NULL FOREIGN KEY REFERENCES dbo.HopDongThue(ma_hop_dong),
        so_thang_gia_han INT NOT NULL DEFAULT 0,
        so_ngay_gia_han INT NOT NULL DEFAULT 0,
        chi_phi DECIMAL(14,2) NOT NULL,
        ngay_ket_thuc_cu DATE NOT NULL,
        ngay_ket_thuc_moi DATE NOT NULL,
        trang_thai VARCHAR(30) NOT NULL DEFAULT 'cho_thanh_toan',
        ngay_tao DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        ngay_thanh_toan DATETIME2 NULL
    );
END
GO

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
GO

IF OBJECT_ID('dbo.YeuCauDatLaiMatKhau', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.YeuCauDatLaiMatKhau (
        ma_yeu_cau INT IDENTITY(1,1) PRIMARY KEY,
        ma_nguoi_dung INT NOT NULL FOREIGN KEY REFERENCES dbo.NguoiDung(ma_nguoi_dung) ON DELETE CASCADE,
        ma_code_hash VARCHAR(100) NOT NULL,
        ngay_het_han DATETIME2 NOT NULL,
        da_su_dung BIT NOT NULL DEFAULT 0,
        ngay_tao DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        ngay_su_dung DATETIME2 NULL
    );
END
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_YeuCauDatLaiMatKhau_User_Expiry' AND object_id = OBJECT_ID('dbo.YeuCauDatLaiMatKhau'))
    CREATE INDEX IX_YeuCauDatLaiMatKhau_User_Expiry ON dbo.YeuCauDatLaiMatKhau(ma_nguoi_dung, ngay_het_han DESC);
GO

IF COL_LENGTH('dbo.PhanCongNongDan', 'ly_do_tu_choi') IS NULL
    ALTER TABLE dbo.PhanCongNongDan ADD ly_do_tu_choi NVARCHAR(500) NULL;
GO
