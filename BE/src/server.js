const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

const { connectDB } = require('./config/db');
const { setupSwagger } = require('./config/swagger');

// Khai báo toàn bộ các Routes cho 3 Dashboards
const authRoutes = require('./routes/authRoutes');
const plotRoutes = require('./routes/plotRoutes');
const cropRoutes = require('./routes/cropRoutes');
const rentalRoutes = require('./routes/rentalRoutes');
const journalRoutes = require('./routes/journalRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const cameraRoutes = require('./routes/cameraRoutes');
const contactRoutes = require('./routes/contactRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors({
    origin: true,
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Cấu hình Swagger API Documentation
setupSwagger(app);

// Đăng ký toàn bộ API Endpoints
app.use('/api/auth', authRoutes);
app.use('/api/plots', plotRoutes);
app.use('/api/crops', cropRoutes);
app.use('/api/rentals', rentalRoutes);
app.use('/api/journals', journalRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/camera', cameraRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/admin', adminRoutes);

// Route kiểm tra trạng thái máy chủ
app.get('/', (req, res) => {
    res.status(200).json({
        success: true,
        message: '🚀 Eleven PlotFarm API Server đang hoạt động bình thường!',
        documentation: `http://localhost:${PORT}/api-docs`,
        endpoints: {
            auth: '/api/auth',
            plots: '/api/plots',
            crops: '/api/crops',
            rentals: '/api/rentals',
            journals: '/api/journals',
            services: '/api/services',
            camera: '/api/camera',
            contact: '/api/contact',
            admin: '/api/admin'
        }
    });
});

// Xử lý Route không tồn tại (404)
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Endpoint không tồn tại: ${req.method} ${req.originalUrl}. Vui lòng xem tài liệu tại /api-docs`
    });
});

// Xử lý lỗi toàn cục (Error Handler)
app.use((err, req, res, next) => {
    console.error('Unhandled Error:', err);
    res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ nội bộ',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Kết nối cơ sở dữ liệu và khởi động máy chủ
connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`====================================================`);
        console.log(`🚀 Server PlotFarm đang chạy tại: http://localhost:${PORT}`);
        console.log(`📖 Tài liệu Swagger UI:         http://localhost:${PORT}/api-docs`);
        console.log(`====================================================`);
    });
}).catch((err) => {
    console.error('Không thể kết nối SQL Server:', err);
    // Vẫn lắng nghe server để phục vụ Swagger tài liệu
    app.listen(PORT, () => {
        console.log(`⚠️  Server đang chạy ở chế độ dự phòng tại http://localhost:${PORT}`);
        console.log(`📖 Xem Swagger UI tại http://localhost:${PORT}/api-docs`);
    });
});