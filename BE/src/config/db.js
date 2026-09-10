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
        port: parseInt(process.env.DB_PORT, 10) || 1433,
        options: {
            encrypt: false,
            trustServerCertificate: true
        }
    };
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
        await getPool();
        console.log(`✅ Kết nối SQL Server thành công: [${process.env.DB_NAME || 'PlotFarmDB'}] tại ${serverVal}`);
    } catch (error) {
        console.error('❌ Kết nối SQL Server thất bại:', error.message || error);
    }
};

module.exports = { sql, dbConfig, connectDB, getPool };