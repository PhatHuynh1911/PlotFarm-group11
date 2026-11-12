-- Repair only the exact corrupted demo text reported on request #2.
-- Read/run this file as UTF-8. No other request content or status is changed.
DECLARE @oldNote NVARCHAR(MAX) = N'KI?M TH? LU?NG: ki?m tra User g?i y' + NCHAR(65533) + N'u c?u, Farmer ti?p nh?n v' + NCHAR(65533) + N' ph?n h?i.';
DECLARE @oldReply NVARCHAR(MAX) = N'KI?M TH? HO' + NCHAR(65533) + N'N T?T: Farmer d' + NCHAR(65533) + N' ti?p nh?n v' + NCHAR(65533) + N' x? l' + NCHAR(65533) + N' y' + NCHAR(65533) + N'u c?u.';

UPDATE dbo.YeuCauDichVu
SET ghi_chu_cua_khach = CASE
        WHEN ghi_chu_cua_khach COLLATE Latin1_General_100_BIN2 = @oldNote COLLATE Latin1_General_100_BIN2
        THEN N'KIỂM THỬ LUỒNG: kiểm tra User gửi yêu cầu, Farmer tiếp nhận và phản hồi.'
        ELSE ghi_chu_cua_khach END,
    phan_hoi_cua_nha_vuon = CASE
        WHEN phan_hoi_cua_nha_vuon COLLATE Latin1_General_100_BIN2 = @oldReply COLLATE Latin1_General_100_BIN2
        THEN N'KIỂM THỬ HOÀN TẤT: Farmer đã tiếp nhận và xử lý yêu cầu.'
        ELSE phan_hoi_cua_nha_vuon END
WHERE ma_yeu_cau = 2 AND (
    ghi_chu_cua_khach COLLATE Latin1_General_100_BIN2 = @oldNote COLLATE Latin1_General_100_BIN2
    OR phan_hoi_cua_nha_vuon COLLATE Latin1_General_100_BIN2 = @oldReply COLLATE Latin1_General_100_BIN2
);
