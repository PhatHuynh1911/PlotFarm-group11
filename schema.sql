-- ==========================================================
-- SCRIPT TẠO CƠ SỞ DỮ LIỆU MICROSOFT SQL SERVER - PLOTFARM
-- Khóa chính: INT IDENTITY(1,1) tự tăng đơn giản, dễ dùng
-- ==========================================================

IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'PlotFarmDB')
BEGIN
    CREATE DATABASE PlotFarmDB;
END
GO

USE PlotFarmDB;
GO

-- Xóa bảng cũ nếu có (theo thứ tự khóa ngoại)
IF OBJECT_ID(N'dbo.LienHeTuVan', N'U') IS NOT NULL DROP TABLE dbo.LienHeTuVan;
IF OBJECT_ID(N'dbo.GiaoHang', N'U') IS NOT NULL DROP TABLE dbo.GiaoHang;
IF OBJECT_ID(N'dbo.ThuHoach', N'U') IS NOT NULL DROP TABLE dbo.ThuHoach;
IF OBJECT_ID(N'dbo.YeuCauDichVu', N'U') IS NOT NULL DROP TABLE dbo.YeuCauDichVu;
IF OBJECT_ID(N'dbo.LoaiDichVu', N'U') IS NOT NULL DROP TABLE dbo.LoaiDichVu;
IF OBJECT_ID(N'dbo.NhatKyCanhTac', N'U') IS NOT NULL DROP TABLE dbo.NhatKyCanhTac;
IF OBJECT_ID(N'dbo.HopDongThue', N'U') IS NOT NULL DROP TABLE dbo.HopDongThue;
IF OBJECT_ID(N'dbo.CameraODat', N'U') IS NOT NULL DROP TABLE dbo.CameraODat;
IF OBJECT_ID(N'dbo.ODat', N'U') IS NOT NULL DROP TABLE dbo.ODat;
IF OBJECT_ID(N'dbo.CayTrong', N'U') IS NOT NULL DROP TABLE dbo.CayTrong;
IF OBJECT_ID(N'dbo.DanhMucCayTrong', N'U') IS NOT NULL DROP TABLE dbo.DanhMucCayTrong;
IF OBJECT_ID(N'dbo.NongTrai', N'U') IS NOT NULL DROP TABLE dbo.NongTrai;
IF OBJECT_ID(N'dbo.NguoiDung', N'U') IS NOT NULL DROP TABLE dbo.NguoiDung;
GO

-- 1. Bảng Người Dùng (NguoiDung)
CREATE TABLE dbo.NguoiDung (
    ma_nguoi_dung INT IDENTITY(1,1) PRIMARY KEY,
    ho_va_ten NVARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    mat_khau VARCHAR(100) NOT NULL,
    so_dien_thoai VARCHAR(20) NULL,
    anh_dai_dien VARCHAR(500) NULL,
    dia_chi NVARCHAR(255) NULL,
    gioi_tinh NVARCHAR(10) NULL,
    ngay_sinh DATE NULL,
    vai_tro VARCHAR(20) NOT NULL DEFAULT 'khach_hang',
    trang_thai VARCHAR(20) NOT NULL DEFAULT 'hoat_dong',
    da_xac_thuc_email BIT NOT NULL DEFAULT 0,
    ngay_tao DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    ngay_cap_nhat DATETIME2 NOT NULL DEFAULT SYSDATETIME()
);
GO

-- 2. Bảng Nông Trại (NongTrai)
CREATE TABLE dbo.NongTrai (
    ma_nong_trai INT IDENTITY(1,1) PRIMARY KEY,
    ten_nong_trai NVARCHAR(150) NOT NULL,
    mo_ta NVARCHAR(MAX) NULL,
    dia_chi NVARCHAR(255) NOT NULL,
    tinh_thanh NVARCHAR(50) NOT NULL,
    quan_huyen NVARCHAR(50) NOT NULL,
    phuong_xa NVARCHAR(50) NULL,
    vi_do DECIMAL(10, 7) NULL,
    kinh_do DECIMAL(10, 7) NULL,
    tong_dien_tich_ha DECIMAL(8, 2) NOT NULL DEFAULT 2.40,
    dien_tich_kha_dung_ha DECIMAL(8, 2) NOT NULL DEFAULT 2.40,
    so_dien_thoai_lien_he VARCHAR(20) NULL,
    email_lien_he VARCHAR(150) NULL,
    gio_mo_cua VARCHAR(50) NULL,
    hinh_anh VARCHAR(500) NULL,
    trang_thai VARCHAR(20) NOT NULL DEFAULT 'hoat_dong',
    ngay_tao DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    ngay_cap_nhat DATETIME2 NOT NULL DEFAULT SYSDATETIME()
);
GO

-- 3. Bảng Ô Đất (ODat)
CREATE TABLE dbo.ODat (
    ma_o_dat INT IDENTITY(1,1) PRIMARY KEY,
    ma_nong_trai INT NOT NULL FOREIGN KEY REFERENCES dbo.NongTrai(ma_nong_trai) ON DELETE CASCADE,
    so_hieu_o VARCHAR(20) NOT NULL UNIQUE, -- 'A-01', 'B-07', 'C-09'...
    ten_o_dat NVARCHAR(100) NOT NULL,
    chieu_dai_m DECIMAL(6, 2) NOT NULL DEFAULT 6.0,
    chieu_rong_m DECIMAL(6, 2) NOT NULL DEFAULT 4.0,
    dien_tich_m2 DECIMAL(6, 2) NOT NULL DEFAULT 24.0,
    loai_dat NVARCHAR(50) NOT NULL DEFAULT N'Đất thịt hữu cơ',
    he_thong_tuoi NVARCHAR(50) NOT NULL DEFAULT N'Tưới phun sương tự động',
    huong_anh_sang NVARCHAR(50) NOT NULL DEFAULT N'Toàn phần',
    gia_thue_thang DECIMAL(14, 2) NOT NULL DEFAULT 490000.00,
    thoi_han_thue_toi_thieu_thang INT NOT NULL DEFAULT 3,
    thoi_han_thue_toi_da_thang INT NOT NULL DEFAULT 12,
    trang_thai VARCHAR(20) NOT NULL DEFAULT 'trong', -- 'trong', 'dang_chon', 'da_thue', 'bao_tri'
    hinh_anh_o_dat VARCHAR(500) NULL,
    mo_ta_chi_tiet NVARCHAR(MAX) NULL,
    ngay_tao DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    ngay_cap_nhat DATETIME2 NOT NULL DEFAULT SYSDATETIME()
);
GO

-- 4. Bảng Camera Ô Đất (CameraODat)
CREATE TABLE dbo.CameraODat (
    ma_camera INT IDENTITY(1,1) PRIMARY KEY,
    ma_o_dat INT NOT NULL UNIQUE FOREIGN KEY REFERENCES dbo.ODat(ma_o_dat) ON DELETE CASCADE,
    ma_dinh_danh_camera VARCHAR(50) NOT NULL UNIQUE,
    ten_camera NVARCHAR(100) NOT NULL,
    dia_chi_ip VARCHAR(50) NULL,
    duong_dan_rtsp NVARCHAR(500) NULL,
    duong_dan_hls_stream NVARCHAR(500) NOT NULL,
    do_phan_giai VARCHAR(20) NOT NULL DEFAULT '1080p',
    toc_do_khung_hinh_fps INT NOT NULL DEFAULT 30,
    ho_tro_quay_quet_ptz BIT NOT NULL DEFAULT 0,
    trang_thai_ket_noi VARCHAR(20) NOT NULL DEFAULT 'online',
    thoi_gian_online_gan_nhat DATETIME2 NULL,
    ngay_tao DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    ngay_cap_nhat DATETIME2 NOT NULL DEFAULT SYSDATETIME()
);
GO

-- 5. Bảng Danh Mục Cây Trồng (DanhMucCayTrong)
CREATE TABLE dbo.DanhMucCayTrong (
    ma_danh_muc INT IDENTITY(1,1) PRIMARY KEY,
    ten_danh_muc NVARCHAR(100) NOT NULL UNIQUE,
    mo_ta NVARCHAR(500) NULL,
    ngay_tao DATETIME2 NOT NULL DEFAULT SYSDATETIME()
);
GO

-- 6. Bảng Cây Trồng (CayTrong)
CREATE TABLE dbo.CayTrong (
    ma_cay_trong INT IDENTITY(1,1) PRIMARY KEY,
    ma_danh_muc INT NULL FOREIGN KEY REFERENCES dbo.DanhMucCayTrong(ma_danh_muc),
    ten_cay_trong NVARCHAR(100) NOT NULL,
    ten_khoa_hoc NVARCHAR(100) NULL,
    thoi_gian_sinh_truong_ngay INT NOT NULL DEFAULT 45,
    thoi_han_thu_hoach_ngay INT NOT NULL DEFAULT 7,
    tan_suat_tuoi_nuoc NVARCHAR(100) NOT NULL DEFAULT N'2 lần/ngày',
    nhu_cau_anh_sang NVARCHAR(100) NOT NULL DEFAULT N'6-8 giờ/ngày',
    nang_suat_du_kien_kg_m2 DECIMAL(6, 2) NOT NULL DEFAULT 2.50,
    do_kho_cham_soc VARCHAR(20) NOT NULL DEFAULT 'de',
    mua_vu_phu_hop NVARCHAR(100) NULL,
    huong_dan_cham_soc NVARCHAR(MAX) NULL,
    hinh_anh_cay VARCHAR(500) NULL,
    trang_thai VARCHAR(20) NOT NULL DEFAULT 'kha_dung',
    ngay_tao DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    ngay_cap_nhat DATETIME2 NOT NULL DEFAULT SYSDATETIME()
);
GO

-- 7. Bảng Hợp Đồng Thuê (HopDongThue)
CREATE TABLE dbo.HopDongThue (
    ma_hop_dong INT IDENTITY(1,1) PRIMARY KEY,
    so_hop_dong VARCHAR(30) NOT NULL UNIQUE,
    ma_nguoi_dung INT NOT NULL FOREIGN KEY REFERENCES dbo.NguoiDung(ma_nguoi_dung),
    ma_o_dat INT NOT NULL FOREIGN KEY REFERENCES dbo.ODat(ma_o_dat),
    ma_cay_trong INT NULL FOREIGN KEY REFERENCES dbo.CayTrong(ma_cay_trong),
    ngay_bat_dau DATE NOT NULL,
    ngay_ket_thuc DATE NOT NULL,
    thoi_han_thang INT NOT NULL DEFAULT 3,
    don_gia_thang DECIMAL(14, 2) NOT NULL,
    phi_dich_vu_cham_soc DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
    tong_tien DECIMAL(14, 2) NOT NULL,
    tien_dat_coc DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
    trang_thai_thanh_toan VARCHAR(20) NOT NULL DEFAULT 'da_thanh_toan',
    phuong_thuc_thanh_toan VARCHAR(20) NOT NULL DEFAULT 'chuyen_khoan',
    trang_thai_hop_dong VARCHAR(20) NOT NULL DEFAULT 'hieu_luc',
    yeu_cau_dac_biet NVARCHAR(500) NULL,
    ngay_tao DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    ngay_cap_nhat DATETIME2 NOT NULL DEFAULT SYSDATETIME()
);
GO

-- 8. Bảng Nhật Ký Canh Tác (NhatKyCanhTac)
CREATE TABLE dbo.NhatKyCanhTac (
    ma_nhat_ky INT IDENTITY(1,1) PRIMARY KEY,
    ma_hop_dong INT NOT NULL FOREIGN KEY REFERENCES dbo.HopDongThue(ma_hop_dong) ON DELETE CASCADE,
    ma_nong_dan INT NOT NULL FOREIGN KEY REFERENCES dbo.NguoiDung(ma_nguoi_dung),
    ngay_ghi_nhat_ky DATE NOT NULL DEFAULT CAST(SYSDATETIME() AS DATE),
    giai_doan_sinh_truong NVARCHAR(50) NOT NULL,
    chieu_cao_cay_cm DECIMAL(5, 2) NULL,
    do_am_dat_phan_tram DECIMAL(5, 2) NULL,
    nhiet_do_moi_truong_c DECIMAL(5, 2) NULL,
    do_am_khong_khi_phan_tram DECIMAL(5, 2) NULL,
    thoi_tiet NVARCHAR(50) NULL,
    cong_viec_da_lam NVARCHAR(150) NOT NULL,
    loai_phan_bon_da_dung NVARCHAR(150) NULL,
    thuoc_sinh_hoc_da_dung NVARCHAR(150) NULL,
    ghi_chu_chi_tiet NVARCHAR(MAX) NOT NULL,
    danh_sach_hinh_anh NVARCHAR(MAX) NULL,
    video_ghi_hinh NVARCHAR(500) NULL,
    ngay_tao DATETIME2 NOT NULL DEFAULT SYSDATETIME()
);
GO

-- 9. Bảng Loại Dịch Vụ (LoaiDichVu)
CREATE TABLE dbo.LoaiDichVu (
    ma_loai_dich_vu INT IDENTITY(1,1) PRIMARY KEY,
    ten_dich_vu NVARCHAR(100) NOT NULL UNIQUE,
    don_gia DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
    don_vi_tinh NVARCHAR(20) NOT NULL DEFAULT N'lần',
    thoi_gian_uoc_tinh_phut INT NOT NULL DEFAULT 30,
    mo_ta_dich_vu NVARCHAR(500) NULL,
    dang_hoat_dong BIT NOT NULL DEFAULT 1,
    ngay_tao DATETIME2 NOT NULL DEFAULT SYSDATETIME()
);
GO

-- 10. Bảng Yêu Cầu Dịch Vụ (YeuCauDichVu)
CREATE TABLE dbo.YeuCauDichVu (
    ma_yeu_cau INT IDENTITY(1,1) PRIMARY KEY,
    so_phieu_yeu_cau VARCHAR(30) NOT NULL UNIQUE,
    ma_hop_dong INT NOT NULL FOREIGN KEY REFERENCES dbo.HopDongThue(ma_hop_dong) ON DELETE CASCADE,
    ma_loai_dich_vu INT NULL FOREIGN KEY REFERENCES dbo.LoaiDichVu(ma_loai_dich_vu),
    ma_khach_hang INT NOT NULL FOREIGN KEY REFERENCES dbo.NguoiDung(ma_nguoi_dung),
    ma_nong_dan_phu_trach INT NULL FOREIGN KEY REFERENCES dbo.NguoiDung(ma_nguoi_dung),
    ngay_yeu_cau_thuc_hien DATE NOT NULL DEFAULT CAST(SYSDATETIME() AS DATE),
    buoi_thuc_hien VARCHAR(20) NOT NULL DEFAULT 'sang',
    ghi_chu_cua_khach NVARCHAR(500) NULL,
    chi_phi DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
    trang_thai_thanh_toan VARCHAR(20) NOT NULL DEFAULT 'mien_phi_kem_theo',
    trang_thai_xu_ly VARCHAR(20) NOT NULL DEFAULT 'cho_tiep_nhan',
    phan_hoi_cua_nha_vuon NVARCHAR(500) NULL,
    hinh_anh_nghiem_thu VARCHAR(500) NULL,
    ngay_gui_yeu_cau DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    ngay_hoan_thanh DATETIME2 NULL
);
GO

-- 11. Bảng Thu Hoạch (ThuHoach)
CREATE TABLE dbo.ThuHoach (
    ma_thu_hoach INT IDENTITY(1,1) PRIMARY KEY,
    ma_hop_dong INT NOT NULL FOREIGN KEY REFERENCES dbo.HopDongThue(ma_hop_dong) ON DELETE CASCADE,
    ma_nong_dan INT NOT NULL FOREIGN KEY REFERENCES dbo.NguoiDung(ma_nguoi_dung),
    ngay_thu_hoach DATE NOT NULL,
    san_luong_thuc_te_kg DECIMAL(8, 2) NOT NULL,
    san_luong_hao_hut_kg DECIMAL(8, 2) NOT NULL DEFAULT 0.00,
    phan_loai_chat_luong VARCHAR(10) NOT NULL DEFAULT 'Loai_A',
    phuong_thuc_bao_quan NVARCHAR(100) NULL,
    quy_cach_dong_goi NVARCHAR(100) NULL,
    ghi_chu NVARCHAR(500) NULL,
    hinh_anh_thanh_pham VARCHAR(500) NULL,
    trang_thai VARCHAR(20) NOT NULL DEFAULT 'da_thu_hoach',
    ngay_tao DATETIME2 NOT NULL DEFAULT SYSDATETIME()
);
GO

-- 12. Bảng Giao Hàng (GiaoHang)
CREATE TABLE dbo.GiaoHang (
    ma_giao_hang INT IDENTITY(1,1) PRIMARY KEY,
    ma_thu_hoach INT NOT NULL UNIQUE FOREIGN KEY REFERENCES dbo.ThuHoach(ma_thu_hoach) ON DELETE CASCADE,
    ma_khach_hang INT NOT NULL FOREIGN KEY REFERENCES dbo.NguoiDung(ma_nguoi_dung),
    hinh_thuc_nhan_hang VARCHAR(30) NOT NULL DEFAULT 'giao_tan_noi',
    ten_nguoi_nhan NVARCHAR(100) NULL,
    so_dien_thoai_nguoi_nhan VARCHAR(20) NULL,
    dia_chi_giao_hang NVARCHAR(255) NULL,
    ma_van_don VARCHAR(50) NULL,
    phi_van_chuyen DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
    ngay_giao_du_kien DATE NULL,
    thoi_gian_giao_thuc_te DATETIME2 NULL,
    trang_thai_giao_hang VARCHAR(20) NOT NULL DEFAULT 'cho_giao',
    don_vi_van_chuyen NVARCHAR(50) NULL,
    ghi_chu_giao_hang NVARCHAR(500) NULL,
    ngay_tao DATETIME2 NOT NULL DEFAULT SYSDATETIME()
);
GO

-- 13. Bảng Liên Hệ Tư Vấn (LienHeTuVan)
CREATE TABLE dbo.LienHeTuVan (
    ma_lien_he INT IDENTITY(1,1) PRIMARY KEY,
    ho_va_ten NVARCHAR(100) NOT NULL,
    so_dien_thoai VARCHAR(20) NOT NULL,
    email VARCHAR(150) NULL,
    so_hieu_o_quan_tam VARCHAR(20) NULL,
    noi_dung_tu_van NVARCHAR(500) NULL,
    trang_thai_lien_he VARCHAR(20) NOT NULL DEFAULT 'moi',
    ma_nhan_vien_tiep_nhan INT NULL FOREIGN KEY REFERENCES dbo.NguoiDung(ma_nguoi_dung),
    ngay_gui DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    ngay_cap_nhat DATETIME2 NOT NULL DEFAULT SYSDATETIME()
);
GO

-- Các chỉ mục tối ưu
CREATE INDEX IX_ODat_TrangThai ON dbo.ODat(trang_thai);
CREATE INDEX IX_HopDong_NguoiDung ON dbo.HopDongThue(ma_nguoi_dung);
CREATE INDEX IX_HopDong_ODat ON dbo.HopDongThue(ma_o_dat);
CREATE INDEX IX_NhatKy_HopDong ON dbo.NhatKyCanhTac(ma_hop_dong);
CREATE INDEX IX_YCDV_HopDong ON dbo.YeuCauDichVu(ma_hop_dong);
GO
