const sql = require('mssql');
require('dotenv').config();

const serverVal = process.env.DB_SERVER || 'localhost';
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
            instanceName: process.env.DB_INSTANCE || undefined
        }
    };
}

if (process.env.DB_PORT) {
    dbConfig.port = parseInt(process.env.DB_PORT, 10);
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
                    ngay_gui DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
                    ngay_phan_hoi DATETIME2 NULL,
                    CONSTRAINT UQ_PhanCongNongDan_HopDong_Farmer UNIQUE (ma_hop_dong, ma_nong_dan)
                );
            END
        `);
        console.log(`✅ Kết nối SQL Server thành công: [${process.env.DB_NAME || 'PlotFarmDB'}] tại ${serverVal}`);
    } catch (error) {
        console.error('❌ Kết nối SQL Server thất bại:', error.message || error);
    }
};

module.exports = { sql, dbConfig, connectDB, getPool };
