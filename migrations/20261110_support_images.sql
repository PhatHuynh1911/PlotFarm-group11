-- Add optional support attachments; preserve existing rows.
IF OBJECT_ID('dbo.KhieuNai', 'U') IS NOT NULL AND COL_LENGTH('dbo.KhieuNai', 'hinh_anh_dinh_kem') IS NULL
    ALTER TABLE dbo.KhieuNai ADD hinh_anh_dinh_kem NVARCHAR(MAX) NULL;

IF OBJECT_ID('dbo.YeuCauDichVu', 'U') IS NOT NULL AND COL_LENGTH('dbo.YeuCauDichVu', 'hinh_anh_dinh_kem') IS NULL
    ALTER TABLE dbo.YeuCauDichVu ADD hinh_anh_dinh_kem NVARCHAR(MAX) NULL;
