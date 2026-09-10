const sql = require("mssql");
require("dotenv").config();

const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  options: {
    encrypt: false,
    trustServerCertificate: true,
    instanceName: process.env.DB_INSTANCE || undefined,
  },
};

// Named SQL Server instances often use a dynamic port. Only force a port when
// one is explicitly configured in .env.
if (process.env.DB_PORT) {
  dbConfig.port = parseInt(process.env.DB_PORT, 10);
}

const connectDB = async () => {
  try {
    await sql.connect(dbConfig);
    console.log("✅ Kết nối SQL Server thành công!");
  } catch (error) {
    console.error("❌ Kết nối SQL Server thất bại:", error);
  }
};

module.exports = { sql, connectDB };
