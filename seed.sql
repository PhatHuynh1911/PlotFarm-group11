-- ==========================================================
-- SCRIPT N?P D? LI?U M?U (SEED DATA) - PLOTFARM DB (TI?NG VI?T)
-- M?t kh?u m?c ??nh c?a t?t c? tài kho?n m?u: 12345
-- KHÓA CHÍNH: INT IDENTITY(1,1) T? ??NG T?NG KH?P 100% V?I SCHEMA
-- ==========================================================

USE PlotFarmDB;
GO

-- 1. Thêm Ng??i Dùng m?u (1: Admin, 2: Nông dân, 3: Khách hàng)
INSERT INTO dbo.NguoiDung (ho_va_ten, email, mat_khau, so_dien_thoai, anh_dai_dien, dia_chi, gioi_tinh, ngay_sinh, vai_tro, trang_thai, da_xac_thuc_email)
VALUES 
(N'Qu?n tr? viên PlotFarm', 'admin@plotfarm.vn', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '0988888888', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80', N'H?i Châu, ?à N?ng', N'Nam', '1990-01-01', 'quan_tri', 'hoat_dong', 1),
(N'Nguy?n V?n Nông', 'farmer@plotfarm.vn', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '0977777777', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80', N'Hòa Vang, ?à N?ng', N'Nam', '1988-05-15', 'nong_dan', 'hoat_dong', 1),
(N'Nguy?n Minh An', 'customer@plotfarm.vn', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '0912345678', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80', N'S?n Trà, ?à N?ng', N'N?', '1998-10-20', 'khach_hang', 'hoat_dong', 1);

-- 2. Thêm Nông Tr?i m?u (ID: 1)
INSERT INTO dbo.NongTrai (ten_nong_trai, mo_ta, dia_chi, tinh_thanh, quan_huyen, phuong_xa, vi_do, kinh_do, tong_dien_tich_ha, dien_tich_kha_dung_ha, so_dien_thoai_lien_he, email_lien_he, gio_mo_cua, hinh_anh, trang_thai)
VALUES 
(N'V??n Phúc L?c', N'Khu nông nghi?p công ngh? cao ?ng d?ng camera IoT giám sát 24/7 và canh tác h?u c? ??t chu?n VietGAP.', N'???ng DT605, Xã Hòa Ti?n', N'?à N?ng', N'Hòa Vang', N'Hòa Ti?n', 15.9621345, 108.1823412, 2.40, 1.80, '02363888999', 'phuclocfarm@plotfarm.vn', '06:00 - 18:00', 'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&w=1100&q=85', 'hoat_dong');

-- 3. Thêm 9 Ô ??t (ma_o_dat t? 1 ??n 9)
INSERT INTO dbo.ODat (ma_nong_trai, so_hieu_o, ten_o_dat, chieu_dai_m, chieu_rong_m, dien_tich_m2, loai_dat, he_thong_tuoi, huong_anh_sang, gia_thue_thang, thoi_han_thue_toi_thieu_thang, thoi_han_thue_toi_da_thang, trang_thai, hinh_anh_o_dat, mo_ta_chi_tiet)
VALUES 
(1, 'A-01', N'Ô ??t A-01 Khu B?c', 6.0, 4.0, 24.0, N'??t th?t pha cát h?u c?', N'T??i phun s??ng t? ??ng', N'Toàn ph?n', 490000, 3, 12, 'trong', 'https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&w=400&q=80', N'G?n c?ng chính, l?i ?i r?ng rãi thu?n ti?n ?i l?i.'),
(1, 'A-02', N'Ô ??t A-02 Khu B?c', 6.0, 4.0, 24.0, N'??t th?t nh? giàu mùn', N'T??i phun s??ng t? ??ng', N'Toàn ph?n', 490000, 3, 12, 'trong', 'https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&w=400&q=80', N'??t t?i x?p, thoát n??c c?c t?t vào mùa m?a.'),
(1, 'A-03', N'Ô ??t A-03 Khu B?c', 6.0, 4.0, 24.0, N'??t ?? bazan tr?n tr?u hun', N'T??i nh? gi?t h?i l?u', N'Toàn ph?n', 490000, 3, 12, 'da_thue', 'https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&w=400&q=80', N'?ang trong mùa v? canh tác xà lách Romaine.'),
(1, 'B-05', N'Ô ??t B-05 Khu Trung Tâm', 6.0, 4.0, 24.0, N'??t th?t h?u c? vi sinh', N'T??i phun s??ng t? ??ng', N'Toàn ph?n', 490000, 3, 12, 'trong', 'https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&w=400&q=80', N'V? trí trung tâm khu v??n, h??ng ?ón gió mát.'),
(1, 'B-06', N'Ô ??t B-06 Khu Trung Tâm', 6.0, 4.0, 24.0, N'??t h?u c? giàu dinh d??ng', N'T??i nh? gi?t công ngh? Israel', N'Toàn ph?n', 490000, 3, 12, 'trong', 'https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&w=400&q=80', N'Thích h?p tr?ng các lo?i rau ?n lá và c?.'),
(1, 'B-07', N'Ô ??t B-07 Khu Trung Tâm', 6.0, 4.0, 24.0, N'??t s?ch h?u c? 100%', N'T??i phun s??ng t? ??ng', N'Toàn ph?n', 490000, 3, 12, 'trong', 'https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&w=400&q=80', N'Ô ??t vàng view ??p, trang b? camera ?? phân gi?i cao.'),
(1, 'C-09', N'Ô ??t C-09 Khu Nam', 6.0, 4.0, 24.0, N'??t phù sa b?i ??p', N'T??i nh? gi?t', N'Bán ph?n', 490000, 3, 12, 'da_thue', 'https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&w=400&q=80', N'?ang canh tác rau c?i ng?t baby.'),
(1, 'C-10', N'Ô ??t C-10 Khu Nam', 6.0, 4.0, 24.0, N'??t th?t nh?', N'T??i phun s??ng t? ??ng', N'Bán ph?n', 490000, 3, 12, 'trong', 'https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&w=400&q=80', N'G?n khu b?o qu?n nông c? và tr?m ?i?u khi?n t??i.'),
(1, 'C-11', N'Ô ??t C-11 Khu Nam', 6.0, 4.0, 24.0, N'??t h?u c? vi sinh', N'T??i phun s??ng t? ??ng', N'Toàn ph?n', 490000, 3, 12, 'trong', 'https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&w=400&q=80', N'??t v?a ???c cày x?i và ph?i ?i, s?n sàng gieo tr?ng.');

-- 4. Thêm Camera Ô ??t (G?n vào ô 3: A-03, ô 6: B-07, ô 7: C-09)
INSERT INTO dbo.CameraODat (ma_o_dat, ma_dinh_danh_camera, ten_camera, dia_chi_ip, duong_dan_hls_stream, do_phan_giai, toc_do_khung_hinh_fps, ho_tro_quay_quet_ptz, trang_thai_ket_noi)
VALUES 
(6, 'CAM-B07', N'Camera Giám Sát Ô B-07', '192.168.1.107', 'https://assets.mixkit.co/videos/preview/mixkit-vegetables-in-a-greenhouse-41584-large.mp4', '1080p', 30, 1, 'online'),
(3, 'CAM-A03', N'Camera Giám Sát Ô A-03', '192.168.1.103', 'https://assets.mixkit.co/videos/preview/mixkit-farmer-hands-harvesting-vegetables-41586-large.mp4', '1080p', 30, 0, 'online'),
(7, 'CAM-C09', N'Camera Giám Sát Ô C-09', '192.168.1.109', 'https://assets.mixkit.co/videos/preview/mixkit-rows-of-lettuce-in-a-greenhouse-41583-large.mp4', '1080p', 30, 0, 'online');

-- 5. Thêm Danh M?c Cây Tr?ng (ma_danh_muc: 1, 2, 3)
INSERT INTO dbo.DanhMucCayTrong (ten_danh_muc, mo_ta)
VALUES 
(N'Rau ?n lá', N'Các lo?i rau ?n lá xanh, th?i gian thu ho?ch ng?n ngày, giàu vitamin.'),
(N'Rau ?n c?', N'Các lo?i c? giàu dinh d??ng, c? qu? t??i s?ch.'),
(N'Cây ?n qu? giàn leo', N'Các lo?i qu? tr?ng giàn nh? d?a leo, cà chua bi, ?t ng?t.');

-- 6. Thêm Cây Tr?ng (ma_cay_trong t? 1 ??n 4)
INSERT INTO dbo.CayTrong (ma_danh_muc, ten_cay_trong, ten_khoa_hoc, thoi_gian_sinh_truong_ngay, thoi_han_thu_hoach_ngay, tan_suat_tuoi_nuoc, nhu_cau_anh_sang, nang_suat_du_kien_kg_m2, do_kho_cham_soc, mua_vu_phu_hop, huong_dan_cham_soc, hinh_anh_cay, trang_thai)
VALUES 
(1, N'Xà lách Romaine h?u c?', N'Lactuca sativa var. longifolia', 45, 7, N'2 l?n/ngày sáng s?m và chi?u mát', N'6-8 gi?/ngày', 2.80, 'de', N'Quanh n?m', N'T??i nh? vào g?c, bón phân h?u c? vi sinh vào ngày th? 15 và 30.', 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=400&q=80', 'kha_dung'),
(1, N'Rau c?i thìa baby ng?t', N'Brassica rapa chinensis', 30, 5, N'2 l?n/ngày', N'6-8 gi?/ngày', 2.20, 'de', N'Mùa khô và mùa thu', N'C?n ??t gi? ?m t?t, ng?t t?a b?t lá già g?c ?? thông thoáng.', 'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&w=400&q=80', 'kha_dung'),
(3, N'Cà chua bi Cherry ??', N'Solanum lycopersicum var. cerasiforme', 75, 20, N'1 l?n/ngày vào sáng s?m', N'8 gi?/ngày', 4.50, 'trung_binh', N'Thu ?ông - Xuân', N'C?n c?m c?c làm giàn ?? thân, t?a ch?i nách, bón kali khi ??u trái.', 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=400&q=80', 'kha_dung'),
(3, N'D?a leo baby giòn ng?t', N'Cucumis sativus', 40, 10, N'2 l?n/ngày', N'7-8 gi?/ngày', 3.80, 'de', N'Quanh n?m', N'Gi? ?? ?m ??t ?n ??nh, ng?t ng?n ph? khi leo giàn ???c 1.5m.', 'https://images.unsplash.com/photo-1604977042946-1eecc30f269e?auto=format&fit=crop&w=400&q=80', 'kha_dung');

-- 7. Thêm Lo?i D?ch V? (ma_loai_dich_vu t? 1 ??n 4)
INSERT INTO dbo.LoaiDichVu (ten_dich_vu, don_gia, don_vi_tinh, thoi_gian_uoc_tinh_phut, mo_ta_dich_vu, dang_hoat_dong)
VALUES 
(N'T??i n??c b? sung', 0.00, N'l?n', 15, N'T??i phun s??ng ??m g?c vào bu?i tr?a n?ng g?t ho?c theo yêu c?u.', 1),
(N'Bón phân h?u c? vi sinh cao c?p', 50000.00, N'l?n', 30, N'Bón phân trùn qu? và vi sinh b?n ??a IMO giúp c?i t?o ??t và kích thích r?.', 1),
(N'B?t sâu & phòng tr? sinh h?c', 40000.00, N'l?n', 45, N'B?t sâu th? công b?ng tay và phun dung d?ch t?i ?t g?ng sinh h?c.', 1),
(N'T?a lá già & x?i ??t g?c', 30000.00, N'l?n', 30, N'D?n d?p lá úa vàng, vun x?i ??t thông thoáng b? r?.', 1);

-- 8. Thêm H?p ??ng Thuê m?u (ma_hop_dong: 1 | Khách: 3, Ô: 3, Cây: 1)
INSERT INTO dbo.HopDongThue (so_hop_dong, ma_nguoi_dung, ma_o_dat, ma_cay_trong, ngay_bat_dau, ngay_ket_thuc, thoi_han_thang, don_gia_thang, phi_dich_vu_cham_soc, tong_tien, tien_dat_coc, trang_thai_thanh_toan, phuong_thuc_thanh_toan, trang_thai_hop_dong, yeu_cau_dac_biet)
VALUES 
('HD-20260801-001', 3, 3, 1, '2026-08-01', '2026-11-01', 3, 490000.00, 0.00, 1470000.00, 490000.00, 'da_thanh_toan', 'chuyen_khoan', 'hieu_luc', N'Ch?m sóc hoàn toàn b?ng phân h?u c? vi sinh, không dùng thu?c b?o v? th?c v?t hóa h?c.');

-- 9. Thêm Nh?t Ký Canh Tác m?u (Nông dân: 2, H?p ??ng: 1)
INSERT INTO dbo.NhatKyCanhTac (ma_hop_dong, ma_nong_dan, ngay_ghi_nhat_ky, giai_doan_sinh_truong, chieu_cao_cay_cm, do_am_dat_phan_tram, nhiet_do_moi_truong_c, do_am_khong_khi_phan_tram, thoi_tiet, cong_viec_da_lam, loai_phan_bon_da_dung, thuoc_sinh_hoc_da_dung, ghi_chu_chi_tiet, danh_sach_hinh_anh)
VALUES 
(1, 2, '2026-08-05', N'Gieo h?t', 0.0, 82.0, 27.5, 75.0, N'N?ng ráo', N'Ngâm ? h?t gi?ng và gieo lu?ng ??t ?m', N'Phân trùn qu? lót ?áy', NULL, N'?ã hoàn thành gieo 240 h?t m?m xà lách ch?t l??ng cao, ph? l?p x? d?a m?ng gi? ?m.', '["https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&w=900&q=85"]'),
(1, 2, '2026-08-15', N'N?y m?m & Ra 2 lá th?t', 4.5, 76.5, 28.0, 70.0, N'N?ng nh?', N'T??i phun s??ng gi? ?m và t?a d?m m?m', NULL, NULL, N'T? l? n?y m?m ??t 96%, cây con kh?e kho?n ??u màu xanh non.', '["https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&w=900&q=85"]'),
(1, 2, '2026-09-01', N'Phát tri?n thân lá', 12.0, 74.0, 29.0, 68.0, N'N?ng ??p', N'Bón thúc phân trùn qu? và x?i ??t nh? g?c', N'D?ch chu?i ? men vi sinh', N'Ch? ph?m sinh h?c th?o m?c xua ?u?i côn trùng', N'Cây phát tri?n r?t nhanh, lá dày và xòe ??u, không có d?u hi?u sâu b?nh h?i.', '["https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&w=900&q=85"]');

-- 10. Thêm Yêu C?u D?ch V? m?u (D?ch v?: 1, Khách: 3, Nông dân: 2)
INSERT INTO dbo.YeuCauDichVu (so_phieu_yeu_cau, ma_hop_dong, ma_loai_dich_vu, ma_khach_hang, ma_nong_dan_phu_trach, ngay_yeu_cau_thuc_hien, buoi_thuc_hien, ghi_chu_cua_khach, chi_phi, trang_thai_thanh_toan, trang_thai_xu_ly, phan_hoi_cua_nha_vuon, ngay_hoan_thanh)
VALUES 
('SR-20260907-001', 1, 1, 3, 2, '2026-09-07', 'chieu', N'Tr?a nay tr?i n?ng g?t 36 ??, nh? nhà v??n t??i thêm n??c lúc 16h chi?u mát giúp mình nhé.', 0.00, 'mien_phi_kem_theo', 'hoan_thanh', N'?ã t??i phun s??ng làm mát và ??m g?c lúc 16h15, cây h?i ph?c xanh t?t.', '2026-09-07 16:30:00');

-- 11. Thêm Khách Hàng Liên H? T? V?n m?u
INSERT INTO dbo.LienHeTuVan (ho_va_ten, so_dien_thoai, email, so_hieu_o_quan_tam, noi_dung_tu_van, trang_thai_lien_he)
VALUES 
(N'Lê Minh Tu?n', '0905123456', 'tuanlm@gmail.com', 'B-07', N'Tôi mu?n thuê ô B-07 ?? tr?ng rau s?ch cho 2 con nh? ?n d?m, c?n t? v?n thêm v? camera tr?c ti?p.', 'moi');

PRINT N'N?p d? li?u m?u ti?ng Vi?t hoàn t?t thành công!';
GO