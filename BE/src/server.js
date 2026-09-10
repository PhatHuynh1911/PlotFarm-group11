const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

const { connectDB } = require('./config/db');

// Khai báo các Routes
const plotRoutes = require('./routes/plotRoutes');
const rentalRoutes = require('./routes/rentalRoutes');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Kết nối Database
connectDB();

// Đăng ký các API Endpoints
app.use('/api/plots', plotRoutes);
app.use('/api/rentals', rentalRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);

// Route kiểm tra server
app.get('/', (req, res) => {
    res.send('API PlotFarm đang hoạt động bình thường!');
});

// Khởi động server
app.listen(PORT, () => {
    console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
});