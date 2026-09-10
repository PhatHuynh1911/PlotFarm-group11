-- ==============================================================================
-- DỰ ÁN: PLOTFARM - NỀN TẢNG CHO THUÊ Ô ĐẤT CANH TÁC THÔNG MINH
-- TẬP TIN: seed.sql (Dữ liệu mẫu chuẩn đồng bộ 100% với schema.sql)
-- ĐỊNH DẠNG: UTF-8 with BOM (Tránh hoàn toàn lỗi font chữ ? trong SSMS)
-- MẬT KHẨU MẪU: 12345 (cho tất cả tài khoản admin, farmer, customer)
-- CƠ CHẾ: SET IDENTITY_INSERT ON để gán chính xác 100% ID và Khóa ngoại
-- ==============================================================================

USE PlotFarmDB;
GO

-- ==============================================================================
-- 1. DỌN SẠCH DỮ LIỆU CŨ THEO ĐÚNG THỨ TỰ KHÓA NGOẠI
-- ==============================================================================
DELETE FROM dbo.LienHeTuVan;
DELETE FROM dbo.GiaoHang;
DELETE FROM dbo.ThuHoach;
DELETE FROM dbo.YeuCauDichVu;
DELETE FROM dbo.LoaiDichVu;
DELETE FROM dbo.NhatKyCanhTac;
DELETE FROM dbo.HopDongThue;
DELETE FROM dbo.CameraODat;
DELETE FROM dbo.ODat;
DELETE FROM dbo.CayTrong;
DELETE FROM dbo.DanhMucCayTrong;
DELETE FROM dbo.NongTrai;
DELETE FROM dbo.NguoiDung;
GO

-- ==============================================================================
-- 2. THÊM NGƯỜI DÙNG (Admin = 1, Nông dân = 2, Khách hàng = 3)
-- ==============================================================================
SET IDENTITY_INSERT dbo.NguoiDung ON;
INSERT INTO dbo.NguoiDung (
    ma_nguoi_dung, ho_va_ten, email, mat_khau, so_dien_thoai, anh_dai_dien, 
    dia_chi, gioi_tinh, ngay_sinh, vai_tro, trang_thai, da_xac_thuc_email
)
VALUES 
(
    1, N'Quản trị viên PlotFarm', 'admin@plotfarm.vn', '12345', '0988888888',
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80',
    N'Hòa Cường Bắc, Hải Châu, Đà Nẵng', N'Nam', '1990-01-15', 'quan_tri', 'hoat_dong', 1
),
(
    2, N'Nguyễn Văn Nông', 'farmer@plotfarm.vn', '12345', '0977777777',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
    N'Hòa Tiến, Hòa Vang, Đà Nẵng', N'Nam', '1985-06-20', 'nong_dan', 'hoat_dong', 1
),
(
    3, N'Nguyễn Minh An', 'customer@plotfarm.vn', '12345', '0912345678',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    N'Thạch Thang, Hải Châu, Đà Nẵng', N'Nam', '1998-11-05', 'khach_hang', 'hoat_dong', 1
);
SET IDENTITY_INSERT dbo.NguoiDung OFF;
GO

-- ==============================================================================
-- 3. THÊM NÔNG TRẠI (Mã nông trại = 1)
-- ==============================================================================
SET IDENTITY_INSERT dbo.NongTrai ON;
INSERT INTO dbo.NongTrai (
    ma_nong_trai, ten_nong_trai, mo_ta, dia_chi, tinh_thanh, quan_huyen, phuong_xa,
    vi_do, kinh_do, tong_dien_tich_ha, dien_tich_kha_dung_ha,
    so_dien_thoai_lien_he, email_lien_he, gio_mo_cua, hinh_anh
)
VALUES 
(
    1, N'Vườn Phúc Lộc',
    N'Khu nông nghiệp công nghệ cao ứng dụng camera IoT giám sát 24/7 và canh tác hữu cơ đạt chuẩn VietGAP.',
    N'Đường ĐT605, Xã Hòa Tiến', N'Đà Nẵng', N'Hòa Vang', N'Hòa Tiến',
    15.9628000, 108.1824000, 2.40, 1.80,
    '02363888999', 'phuclocfarm@plotfarm.vn', '07:00 - 18:00',
    'https://images.unsplash.com/photo-1500651230702-0e2d8a49d4ad?auto=format&fit=crop&w=1200&q=80'
);
SET IDENTITY_INSERT dbo.NongTrai OFF;
GO

-- ==============================================================================
-- 4. THÊM 9 Ô ĐẤT (Mã ô đất từ 1 đến 9 khớp chính xác với Frontend React)
-- ==============================================================================
SET IDENTITY_INSERT dbo.ODat ON;
INSERT INTO dbo.ODat (
    ma_o_dat, ma_nong_trai, so_hieu_o, ten_o_dat, chieu_dai_m, chieu_rong_m, dien_tich_m2, 
    loai_dat, he_thong_tuoi, huong_anh_sang, gia_thue_thang, 
    thoi_han_thue_toi_thieu_thang, thoi_han_thue_toi_da_thang, trang_thai, 
    hinh_anh_o_dat, mo_ta_chi_tiet
)
VALUES 
(
    1, 1, 'A-01', N'Ô đất A-01 Khu Bắc', 6.0, 4.0, 24.0, 
    N'Đất thịt phù sa hữu cơ', N'Tưới phun sương tự động', N'Đón nắng ban mai', 490000.00, 
    3, 12, 'trong', 
    'https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&w=600&q=80',
    N'Gần cổng chính, lối đi rộng rãi, hệ thống cấp nước tưới rất thuận tiện.'
),
(
    2, 1, 'A-02', N'Ô đất A-02 Khu Bắc', 6.0, 4.0, 24.0, 
    N'Đất thịt phù sa hữu cơ', N'Tưới phun sương tự động', N'Đón nắng ban mai', 490000.00, 
    3, 12, 'trong', 
    'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&w=600&q=80',
    N'Đất tơi xốp giàu mùn, rãnh thoát nước luống cực tốt vào mùa mưa.'
),
(
    3, 1, 'A-03', N'Ô đất A-03 Khu Bắc', 6.0, 4.0, 24.0, 
    N'Đất thịt phù sa hữu cơ', N'Tưới nhỏ giọt & phun sương', N'Đón nắng toàn phần', 490000.00, 
    3, 12, 'da_thue', 
    'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80',
    N'Đang trong mùa vụ canh tác xà lách Romaine hữu cơ của khách hàng Nguyễn Minh An.'
),
(
    4, 1, 'B-05', N'Ô đất B-05 Khu Trung Tâm', 6.0, 4.0, 24.0, 
    N'Đất thịt hữu cơ phối trộn vi sinh', N'Tưới phun sương tự động', N'Đón nắng toàn phần', 490000.00, 
    3, 12, 'trong', 
    'https://images.unsplash.com/photo-1592417817098-8f3d6ef23a24?auto=format&fit=crop&w=600&q=80',
    N'Vị trí trung tâm khu vườn, hướng đón gió mát, đất đã được ủ lót phân trùn quế.'
),
(
    5, 1, 'B-06', N'Ô đất B-06 Khu Trung Tâm', 6.0, 4.0, 24.0, 
    N'Đất thịt hữu cơ phối trộn vi sinh', N'Tưới phun sương tự động', N'Đón nắng toàn phần', 490000.00, 
    3, 12, 'trong', 
    'https://images.unsplash.com/photo-1574943320219-553eb213f72d?auto=format&fit=crop&w=600&q=80',
    N'Thích hợp trồng các loại rau ăn lá ngắn ngày và rau cải ngọt năng suất cao.'
),
(
    6, 1, 'B-07', N'Ô đất B-07 Khu Trung Tâm', 6.0, 4.0, 24.0, 
    N'Đất đỏ bazan trộn xơ dừa vi sinh', N'Tưới nhỏ giọt & phun sương', N'Đón nắng toàn phần', 490000.00, 
    3, 12, 'trong', 
    'https://images.unsplash.com/photo-1500651230702-0e2d8a49d4ad?auto=format&fit=crop&w=600&q=80',
    N'Ô đất vàng vị trí đắc địa, chất đất 100% hữu cơ, tích hợp camera AI giám sát 24/7.'
),
(
    7, 1, 'C-09', N'Ô đất C-09 Khu Nam', 6.0, 4.0, 24.0, 
    N'Đất phù sa bồi tụ giàu khoáng', N'Tưới nhỏ giọt tiết kiệm', N'Đón nắng hướng Nam', 490000.00, 
    3, 12, 'da_thue', 
    'https://images.unsplash.com/photo-1604977042946-1eecc30f269e?auto=format&fit=crop&w=600&q=80',
    N'Đang canh tác rau cải thìa baby ngọt chất lượng cao, sắp đến kỳ thu hoạch.'
),
(
    8, 1, 'C-10', N'Ô đất C-10 Khu Nam', 6.0, 4.0, 24.0, 
    N'Đất phù sa bồi tụ giàu khoáng', N'Tưới phun sương tự động', N'Đón nắng hướng Nam', 490000.00, 
    3, 12, 'trong', 
    'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=600&q=80',
    N'Gần khu bảo quản nông cụ và nhà ươm giống, đất đai màu mỡ giàu vi sinh.'
),
(
    9, 1, 'C-11', N'Ô đất C-11 Khu Nam', 6.0, 4.0, 24.0, 
    N'Đất phù sa bồi tụ giàu khoáng', N'Tưới phun sương tự động', N'Đón nắng hướng Nam', 490000.00, 
    3, 12, 'trong', 
    'https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&w=600&q=80',
    N'Đất vừa được cày xới sâu và phơi ải diệt nấm, sẵn sàng gieo trồng ngay hôm nay.'
);
SET IDENTITY_INSERT dbo.ODat OFF;
GO

-- ==============================================================================
-- 5. THÊM CAMERA GIÁM SÁT Ô ĐẤT (Mã camera từ 1 đến 3)
-- ==============================================================================
SET IDENTITY_INSERT dbo.CameraODat ON;
INSERT INTO dbo.CameraODat (
    ma_camera, ma_o_dat, ma_dinh_danh_camera, ten_camera, dia_chi_ip, 
    duong_dan_hls_stream, do_phan_giai, toc_do_khung_hinh_fps, 
    ho_tro_quay_quet_ptz, trang_thai_ket_noi, thoi_gian_online_gan_nhat
)
VALUES 
(
    1, 6, 'CAM-B07', N'Camera Giám Sát Ô B-07', '192.168.1.107',
    'https://assets.mixkit.co/videos/preview/mixkit-vegetables-in-a-greenhouse-41584-large.mp4',
    '1080p', 30, 1, 'online', SYSDATETIME()
),
(
    2, 3, 'CAM-A03', N'Camera Giám Sát Ô A-03', '192.168.1.103',
    'https://assets.mixkit.co/videos/preview/mixkit-farmer-hands-harvesting-vegetables-41586-large.mp4',
    '1080p', 30, 1, 'online', SYSDATETIME()
),
(
    3, 7, 'CAM-C09', N'Camera Giám Sát Ô C-09', '192.168.1.109',
    'https://assets.mixkit.co/videos/preview/mixkit-rows-of-lettuce-in-a-greenhouse-41583-large.mp4',
    '1080p', 30, 0, 'online', SYSDATETIME()
);
SET IDENTITY_INSERT dbo.CameraODat OFF;
GO

-- ==============================================================================
-- 6. THÊM DANH MỤC CÂY TRỒNG (Mã danh mục từ 1 đến 3)
-- ==============================================================================
SET IDENTITY_INSERT dbo.DanhMucCayTrong ON;
INSERT INTO dbo.DanhMucCayTrong (ma_danh_muc, ten_danh_muc, mo_ta)
VALUES 
(1, N'Rau ăn lá', N'Các loại rau thu hoạch ngắn ngày, giàu chất xơ, vitamin và muối khoáng.'),
(2, N'Cây ăn quả giàn leo', N'Các giống cây thân leo trĩu quả cần giàn leo như dưa leo baby, cà chua bi, đậu cove.'),
(3, N'Rau gia vị & dược liệu', N'Các loại rau thơm, húng quế, hương thảo dễ chăm sóc và có tác dụng xua đuổi côn trùng.');
SET IDENTITY_INSERT dbo.DanhMucCayTrong OFF;
GO

-- ==============================================================================
-- 7. THÊM CÂY TRỒNG (Mã cây trồng từ 1 đến 4, cột chuẩn hinh_anh_cay)
-- ==============================================================================
SET IDENTITY_INSERT dbo.CayTrong ON;
INSERT INTO dbo.CayTrong (
    ma_cay_trong, ma_danh_muc, ten_cay_trong, ten_khoa_hoc, thoi_gian_sinh_truong_ngay, 
    thoi_han_thu_hoach_ngay, tan_suat_tuoi_nuoc, nhu_cau_anh_sang, 
    nang_suat_du_kien_kg_m2, do_kho_cham_soc, mua_vu_phu_hop, 
    huong_dan_cham_soc, hinh_anh_cay, trang_thai
)
VALUES 
(
    1, 1, N'Xà lách Romaine hữu cơ', N'Lactuca sativa', 45, 7, 
    N'2 lần/ngày', N'Nắng dịu sáng sớm (4-6h)', 2.80, 'de', N'Quanh năm',
    N'Tưới nước giữ ẩm đất mỗi sáng sớm, tránh để úng rễ. Bón thúc phân trùn quế sau mỗi đợt tỉa lá.',
    'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=500&q=80',
    'kha_dung'
),
(
    2, 1, N'Rau cải thìa baby ngọt', N'Brassica rapa', 30, 5, 
    N'2 lần/ngày', N'6-8 giờ/ngày', 2.20, 'de', N'Thu Đông và Xuân',
    N'Tưới phun sương nhẹ làm mát mặt lá. Thu hoạch từng bẹ lá ngoài hoặc nhổ tỉa cả cây khi lá giòn ngọt.',
    'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&w=500&q=80',
    'kha_dung'
),
(
    3, 2, N'Cà chua bi Cherry đỏ', N'Solanum lycopersicum', 75, 20, 
    N'1 lần/ngày', N'Đón nắng toàn phần (7-8h)', 4.50, 'trung_binh', N'Xuân Hè và Thu Đông',
    N'Dựng cọc hoặc căng dây giàn leo khi cây cao 25cm. Tỉa bỏ nhánh phụ sát gốc, tưới đậm sát gốc tránh ướt hoa.',
    'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=500&q=80',
    'kha_dung'
),
(
    4, 2, N'Dưa leo baby giòn ngọt', N'Cucumis sativus', 40, 15, 
    N'2 lần/ngày', N'Đón nắng toàn phần', 3.80, 'de', N'Quanh năm',
    N'Bắt nhánh leo giàn lưới, tưới đều đặn buổi sáng. Bón bổ sung dịch đạm cá vi sinh khi cây trổ hoa đậu quả.',
    'https://images.unsplash.com/photo-1604977042946-1eecc30f269e?auto=format&fit=crop&w=500&q=80',
    'kha_dung'
);
SET IDENTITY_INSERT dbo.CayTrong OFF;
GO

-- ==============================================================================
-- 8. THÊM LOẠI DỊCH VỤ CHĂM SÓC (Mã dịch vụ từ 1 đến 4)
-- ==============================================================================
SET IDENTITY_INSERT dbo.LoaiDichVu ON;
INSERT INTO dbo.LoaiDichVu (ma_loai_dich_vu, ten_dich_vu, don_gia, don_vi_tinh, thoi_gian_uoc_tinh_phut, mo_ta_dich_vu, dang_hoat_dong)
VALUES 
(
    1, N'Tưới nước làm mát bổ sung', 0.00, N'lần', 20, 
    N'Tưới phun sương hạ nhiệt làm mát lá khi thời tiết nắng gắt ngoài giờ tưới tự động (Miễn phí theo gói thuê).', 1
),
(
    2, N'Bón phân hữu cơ vi sinh cao cấp', 50000.00, N'lần', 30, 
    N'Bón phân trùn quế nguyên chất và chế phẩm vi sinh IMO ủ hoai bản địa giúp cây tăng đề kháng.', 1
),
(
    3, N'Bắt sâu & phòng ngừa sinh học', 40000.00, N'lần', 45, 
    N'Kiểm tra thủ công từng kẽ lá để bắt sâu và xịt dung dịch thảo mộc tự nhiên tỏi - ớt - gừng an toàn tuyệt đối.', 1
),
(
    4, N'Tỉa lá già & xới đất quanh gốc', 30000.00, N'lần', 30, 
    N'Dọn sạch lá vàng úa ở gốc cây, làm tơi xốp tầng đất mặt giúp rễ hấp thụ oxy và dưỡng chất dễ dàng.', 1
);
SET IDENTITY_INSERT dbo.LoaiDichVu OFF;
GO

-- ==============================================================================
-- 9. THÊM HỢP ĐỒNG THUÊ (Mã hợp đồng 1 và 2)
-- ==============================================================================
SET IDENTITY_INSERT dbo.HopDongThue ON;
INSERT INTO dbo.HopDongThue (
    ma_hop_dong, so_hop_dong, ma_nguoi_dung, ma_o_dat, ma_cay_trong, 
    ngay_bat_dau, ngay_ket_thuc, thoi_han_thang, 
    don_gia_thang, phi_dich_vu_cham_soc, tong_tien, tien_dat_coc, 
    trang_thai_thanh_toan, phuong_thuc_thanh_toan, trang_thai_hop_dong, yeu_cau_dac_biet
)
VALUES 
(
    1, 'HD-001', 3, 3, 1, 
    '2026-08-01', '2026-11-01', 3, 
    490000.00, 0.00, 1470000.00, 490000.00, 
    'da_thanh_toan', 'chuyen_khoan', 'hieu_luc', 
    N'Ưu tiên bón phân hữu cơ trùn quế, gửi hình ảnh cập nhật mỗi tuần.'
),
(
    2, 'HD-002', 3, 7, 2, 
    '2026-08-15', '2026-11-15', 3, 
    490000.00, 0.00, 1470000.00, 490000.00, 
    'da_thanh_toan', 'chuyen_khoan', 'hieu_luc', 
    N'Nhờ nhà vườn hỗ trợ thu hoạch và đóng gói chuyển về nhà định kỳ.'
);
SET IDENTITY_INSERT dbo.HopDongThue OFF;
GO

-- ==============================================================================
-- 10. THÊM NHẬT KÝ CANH TÁC MẪU (Mã nhật ký từ 1 đến 3)
-- ==============================================================================
SET IDENTITY_INSERT dbo.NhatKyCanhTac ON;
INSERT INTO dbo.NhatKyCanhTac (
    ma_nhat_ky, ma_hop_dong, ma_nong_dan, ngay_ghi_nhat_ky, giai_doan_sinh_truong, 
    chieu_cao_cay_cm, do_am_dat_phan_tram, nhiet_do_moi_truong_c, do_am_khong_khi_phan_tram, 
    thoi_tiet, cong_viec_da_lam, loai_phan_bon_da_dung, thuoc_sinh_hoc_da_dung, 
    ghi_chu_chi_tiet, danh_sach_hinh_anh
)
VALUES 
(
    1, 1, 2, '2026-08-05', N'Gieo hạt', 
    0.0, 82.0, 27.5, 78.0, 
    N'Nắng nhẹ', N'Gieo hạt mầm trên luống đất ẩm', N'Phân trùn quế lót đáy', NULL, 
    N'Đã gieo 240 hạt mầm xà lách Romaine, phủ lớp xơ dừa giữ ẩm bề mặt.', 
    '["https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&w=900&q=85"]'
),
(
    2, 1, 2, '2026-08-15', N'Nảy mầm', 
    4.5, 76.5, 28.0, 75.0, 
    N'Trời quang mát', N'Tưới phun sương giữ ẩm luống rau', NULL, NULL, 
    N'Tỉ lệ nảy mầm đạt 96%, cây con cứng cáp, bắt đầu bung lá mầm xanh mướt.', 
    '["https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&w=900&q=85"]'
),
(
    3, 1, 2, '2026-09-01', N'Phát triển thân lá', 
    12.0, 74.0, 29.0, 72.0, 
    N'Nắng ráo', N'Bón thúc phân hữu cơ vi sinh', N'Phân trùn quế bổ sung', N'Dung dịch tỏi ớt sinh học', 
    N'Cây phát triển rất nhanh, lá xanh dày và xòe đều, không xuất hiện sâu bệnh hại lá.', 
    '["https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=900&q=85"]'
);
SET IDENTITY_INSERT dbo.NhatKyCanhTac OFF;
GO

-- ==============================================================================
-- 11. THÊM YÊU CẦU DỊCH VỤ MẪU (Mã yêu cầu = 1)
-- ==============================================================================
SET IDENTITY_INSERT dbo.YeuCauDichVu ON;
INSERT INTO dbo.YeuCauDichVu (
    ma_yeu_cau, so_phieu_yeu_cau, ma_hop_dong, ma_loai_dich_vu, ma_khach_hang, 
    ma_nong_dan_phu_trach, ngay_yeu_cau_thuc_hien, buoi_thuc_hien, 
    ghi_chu_cua_khach, chi_phi, trang_thai_thanh_toan, trang_thai_xu_ly, 
    phan_hoi_cua_nha_vuon, hinh_anh_nghiem_thu
)
VALUES 
(
    1, 'SR-001', 1, 1, 3, 
    2, '2026-09-07', 'chieu', 
    N'Trưa nay trời nắng gắt, nhờ nhà vườn tưới thêm nước làm mát luống xà lách chiều nay giúp mình nhé.', 
    0.00, 'mien_phi_kem_theo', 'hoan_thanh', 
    N'Đã tưới phun sương làm mát lúc 16h15, luống rau xanh tốt bình thường.', 
    'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&w=400&q=80'
);
SET IDENTITY_INSERT dbo.YeuCauDichVu OFF;
GO

-- ==============================================================================
-- 12. THÊM ĐỢT THU HOẠCH MẪU (Mã thu hoạch = 1)
-- ==============================================================================
SET IDENTITY_INSERT dbo.ThuHoach ON;
INSERT INTO dbo.ThuHoach (
    ma_thu_hoach, ma_hop_dong, ma_nong_dan, ngay_thu_hoach, 
    san_luong_thuc_te_kg, san_luong_hao_hut_kg, phan_loai_chat_luong, 
    phuong_thuc_bao_quan, quy_cach_dong_goi, ghi_chu, 
    hinh_anh_thanh_pham, trang_thai
)
VALUES 
(
    1, 1, 2, '2026-09-08', 
    15.50, 0.50, 'Loai_A', 
    N'Bảo quản mát 10-15 độ C', N'Đóng hộp carton hữu cơ có lỗ thoáng khí', 
    N'Rau xà lách Romaine sạch tươi ngon, giòn ngọt, thu hoạch sáng sớm tinh mơ.', 
    'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80', 
    'da_thu_hoach'
);
SET IDENTITY_INSERT dbo.ThuHoach OFF;
GO

-- ==============================================================================
-- 13. THÊM PHIẾU GIAO HÀNG TẬN NHÀ (Mã giao hàng = 1)
-- ==============================================================================
SET IDENTITY_INSERT dbo.GiaoHang ON;
INSERT INTO dbo.GiaoHang (
    ma_giao_hang, ma_thu_hoach, ma_khach_hang, hinh_thuc_nhan_hang, 
    ten_nguoi_nhan, so_dien_thoai_nguoi_nhan, dia_chi_giao_hang, 
    ma_van_don, phi_van_chuyen, ngay_giao_du_kien, 
    trang_thai_giao_hang, don_vi_van_chuyen, ghi_chu_giao_hang
)
VALUES 
(
    1, 1, 3, 'giao_tan_noi', 
    N'Nguyễn Minh An', '0912345678', N'120 Bạch Đằng, Thạch Thang, Hải Châu, Đà Nẵng', 
    'PF-SHIP-8821', 0.00, '2026-09-09', 
    'cho_giao', N'Đội giao vận nông trại PlotFarm', 
    N'Giao trong khung giờ 08:00 - 10:00 sáng, vui lòng gọi trước khi đến 15 phút.'
);
SET IDENTITY_INSERT dbo.GiaoHang OFF;
GO

-- ==============================================================================
-- 14. THÊM KHÁCH HÀNG ĐĂNG KÝ TƯ VẤN (LEADS - Mã liên hệ 1 và 2)
-- ==============================================================================
SET IDENTITY_INSERT dbo.LienHeTuVan ON;
INSERT INTO dbo.LienHeTuVan (ma_lien_he, ho_va_ten, so_dien_thoai, email, so_hieu_o_quan_tam, noi_dung_tu_van, trang_thai_lien_he)
VALUES 
(
    1, N'Lê Minh Tuấn', '0905123456', 'tuanlm@gmail.com', 'B-07', 
    N'Tôi muốn được tư vấn cụ thể quy trình thuê ô đất B-07 và các gói chăm sóc rau ăn lá cho gia đình.', 
    'moi'
),
(
    2, N'Trần Thị Hoàng Yến', '0935987654', 'hoangyen.tran@gmail.com', 'A-01', 
    N'Cần hỏi thêm về chi phí vận chuyển nông sản sau thu hoạch về tận nhà định kỳ mỗi tuần.', 
    'moi'
);
SET IDENTITY_INSERT dbo.LienHeTuVan OFF;
GO

PRINT N'Nạp toàn bộ dữ liệu mẫu (seed.sql) đồng bộ thành công!';
GO
