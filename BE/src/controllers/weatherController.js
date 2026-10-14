const { getPool, sql } = require('../config/db');

// Dữ liệu thời tiết trạm quan trắc nông nghiệp thông minh tại PlotFarm
const getFarmWeather = async (req, res) => {
    try {
        const pool = await getPool();
        const farmRes = await pool.request().query(`
            SELECT TOP 1 ma_nong_trai, ten_nong_trai, dia_chi, tinh_thanh, quan_huyen 
            FROM NongTrai ORDER BY ma_nong_trai ASC
        `);
        const farm = farmRes.recordset[0] || {
            ten_nong_trai: 'Nông trại PlotFarm Củ Chi',
            tinh_thanh: 'TP. Hồ Chí Minh',
            quan_huyen: 'Củ Chi'
        };

        const now = new Date();
        const hour = now.getHours();
        
        let temp = 29;
        let humidity = 72;
        let condition = 'Nắng ấm';
        let conditionCode = 'sunny';
        let uvIndex = 6;
        let windSpeed = 12;

        if (hour >= 6 && hour < 11) {
            temp = 27;
            humidity = 78;
            condition = 'Nắng sớm dịu mát';
            conditionCode = 'sunny';
            uvIndex = 4;
        } else if (hour >= 11 && hour < 15) {
            temp = 33;
            humidity = 62;
            condition = 'Nắng nhiệt đới';
            conditionCode = 'hot';
            uvIndex = 9;
        } else if (hour >= 15 && hour < 18) {
            temp = 30;
            humidity = 74;
            condition = 'Trời mát mẻ, râm nhẹ';
            conditionCode = 'cloudy';
            uvIndex = 5;
        } else {
            temp = 26;
            humidity = 82;
            condition = 'Gió mát đêm, trong lành';
            conditionCode = 'cool';
            uvIndex = 1;
        }

        let smartAdvice = '';
        let careAction = '';

        if (temp >= 32) {
            smartAdvice = 'Nhiệt độ buổi trưa khá cao. Đất dễ bốc hơi nước nhanh.';
            careAction = 'Khuyến nghị tưới bổ sung vào chiều mát (sau 16h30) và bật phun sương tản nhiệt cho các ô đất.';
        } else if (humidity > 80) {
            smartAdvice = 'Độ ẩm không khí cao, cây trồng hấp thụ nước tốt nhưng cần thông thoáng rãnh đất.';
            careAction = 'Duy trì lưu lượng tưới nhỏ giọt vừa phải, kiểm tra rãnh thoát nước và tỉa các tán lá úa sát gốc.';
        } else {
            smartAdvice = 'Thời tiết rất thuận lợi cho cây hấp thụ dinh dưỡng hữu cơ và quang hợp.';
            careAction = 'Thích hợp bón phân vi sinh định kỳ, làm sạch cỏ dại và kiểm tra độ ẩm đất trước khi tưới.';
        }

        const forecast = [
            { day: 'Hôm nay', temp: `${temp}°C`, condition, icon: conditionCode === 'hot' ? '☀️' : conditionCode === 'cloudy' ? '⛅' : '🌤️' },
            { day: 'Ngày mai', temp: '28°C - 32°C', condition: 'Nắng xen mây, chiều mưa rào', icon: '🌦️' },
            { day: 'Ngày kia', temp: '26°C - 31°C', condition: 'Mát mẻ, nắng nhẹ', icon: '🌤️' }
        ];

        return res.json({
            success: true,
            data: {
                farm_name: farm.ten_nong_trai,
                location: `${farm.quan_huyen ? farm.quan_huyen + ', ' : ''}${farm.tinh_thanh || 'Việt Nam'}`,
                temperature: temp,
                humidity: humidity,
                condition: condition,
                condition_code: conditionCode,
                uv_index: uvIndex,
                wind_speed_kmh: windSpeed,
                smart_advice: smartAdvice,
                care_action: careAction,
                forecast: forecast,
                updated_at: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
            }
        });
    } catch (error) {
        console.error('Lỗi khi lấy thông tin thời tiết nông trại:', error);
        return res.status(500).json({ success: false, message: 'Không thể tải thông tin thời tiết' });
    }
};

// API Ước tính sản lượng nông sản dự kiến dựa trên diện tích ô đất
const getYieldEstimate = async (req, res) => {
    try {
        const { cropId, areaM2 } = req.query;
        if (!cropId) {
            return res.status(400).json({ success: false, message: 'Vui lòng cung cấp mã cây trồng (cropId)' });
        }
        const area = parseFloat(areaM2) || 24;

        const pool = await getPool();
        const cropRes = await pool.request()
            .input('cropId', sql.Int, parseInt(cropId, 10))
            .query(`
                SELECT ma_cay_trong, ten_cay_trong, thoi_gian_sinh_truong_ngay,
                       nang_suat_du_kien_kg_m2, do_kho_cham_soc, tan_suat_tuoi_nuoc,
                       hinh_anh_cay, huong_dan_cham_soc
                FROM CayTrong WHERE ma_cay_trong = @cropId
            `);

        const crop = cropRes.recordset[0];
        if (!crop) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy cây trồng' });
        }

        const yieldPerM2 = Number(crop.nang_suat_du_kien_kg_m2) || 2.5;
        const totalYieldKg = Math.round(yieldPerM2 * area * 10) / 10;
        const marketPriceKg = 45000;
        const estimatedValue = Math.round(totalYieldKg * marketPriceKg);

        return res.json({
            success: true,
            data: {
                crop_id: crop.ma_cay_trong,
                crop_name: crop.ten_cay_trong,
                area_m2: area,
                growth_days: crop.thoi_gian_sinh_truong_ngay,
                yield_per_m2: yieldPerM2,
                estimated_yield_kg: totalYieldKg,
                estimated_market_value: estimatedValue,
                watering_frequency: crop.tan_suat_tuoi_nuoc || '2 lần/ngày',
                difficulty: crop.do_kho_cham_soc || 'Dễ',
                care_guide: crop.huong_dan_cham_soc || 'Tưới nước đều đặn, tỉa lá úa định kỳ.'
            }
        });
    } catch (error) {
        console.error('Lỗi khi tính ước tính sản lượng:', error);
        return res.status(500).json({ success: false, message: 'Không thể tính toán sản lượng' });
    }
};

module.exports = { getFarmWeather, getYieldEstimate };
