import { useEffect, useState } from 'react';
import { getFarmWeather, getYieldEstimate, getCrops } from '../api';

export default function FarmWeatherWidget({ showYieldModal = true }) {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [crops, setCrops] = useState([]);
  const [calcOpen, setCalcOpen] = useState(false);
  const [selectedCropId, setSelectedCropId] = useState('');
  const [selectedArea, setSelectedArea] = useState(24);
  const [yieldResult, setYieldResult] = useState(null);
  const [calcLoading, setCalcLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    getFarmWeather()
      .then((data) => {
        if (isMounted) {
          setWeather(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Lỗi tải thời tiết nông trại:', err);
        if (isMounted) setLoading(false);
      });

    getCrops()
      .then((cropList) => {
        if (isMounted && cropList?.length > 0) {
          setCrops(cropList);
          setSelectedCropId(cropList[0]?.ma_cay_trong || '');
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  const handleCalculateYield = async (e) => {
    e?.preventDefault();
    if (!selectedCropId) return;
    setCalcLoading(true);
    try {
      const res = await getYieldEstimate(selectedCropId, selectedArea);
      setYieldResult(res);
    } catch (err) {
      console.error('Lỗi tính sản lượng:', err);
    } finally {
      setCalcLoading(false);
    }
  };

  useEffect(() => {
    if (calcOpen && selectedCropId) {
      handleCalculateYield();
    }
  }, [calcOpen, selectedCropId, selectedArea]);

  if (loading) {
    return (
      <div style={{ padding: '16px', background: '#f4fbf4', borderRadius: '12px', border: '1px solid #d1eed2', marginBottom: '20px' }}>
        <p style={{ margin: 0, color: '#2d6a4f', fontSize: '13px' }}>🌱 Đang cập nhật trạm thời tiết nông trại...</p>
      </div>
    );
  }

  if (!weather) return null;

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #1b4332 0%, #2d6a4f 100%)',
        borderRadius: '16px',
        padding: '20px 24px',
        color: '#ffffff',
        boxShadow: '0 8px 24px rgba(27, 67, 50, 0.18)',
        marginBottom: '24px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background visual element */}
      <div
        style={{
          position: 'absolute',
          right: '-20px',
          top: '-20px',
          width: '140px',
          height: '140px',
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.06)',
          pointerEvents: 'none',
        }}
      />

      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{ fontSize: '18px' }}>📡</span>
            <span style={{ fontSize: '12px', letterSpacing: '0.8px', textTransform: 'uppercase', color: '#95d5b2', fontWeight: '700' }}>
              Trạm Khí Tượng Nông Trại PlotFarm
            </span>
            <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.18)', padding: '2px 8px', borderRadius: '10px' }}>
              {weather.updated_at}
            </span>
          </div>
          <h3 style={{ margin: '0 0 4px', fontSize: '20px', fontWeight: '700', color: '#fff' }}>
            {weather.farm_name}
          </h3>
          <p style={{ margin: 0, fontSize: '13px', color: '#d8f3dc' }}>
            📍 {weather.location}
          </p>
        </div>

        {showYieldModal && (
          <button
            type="button"
            onClick={() => setCalcOpen(true)}
            style={{
              background: '#52b788',
              color: '#081c15',
              border: 'none',
              borderRadius: '10px',
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              transition: 'all 0.2s ease',
            }}
          >
            <span>🌾</span> Ước tính sản lượng mùa vụ
          </button>
        )}
      </div>

      {/* Main weather stats */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '12px',
          margin: '18px 0',
          background: 'rgba(0, 0, 0, 0.15)',
          padding: '14px 16px',
          borderRadius: '12px',
        }}
      >
        <div>
          <small style={{ color: '#b7e4c7', fontSize: '11px', textTransform: 'uppercase' }}>Nhiệt độ</small>
          <div style={{ fontSize: '22px', fontWeight: '800', marginTop: '2px' }}>
            {weather.temperature}°C
          </div>
          <small style={{ color: '#d8f3dc', fontSize: '11px' }}>{weather.condition}</small>
        </div>
        <div>
          <small style={{ color: '#b7e4c7', fontSize: '11px', textTransform: 'uppercase' }}>Độ ẩm không khí</small>
          <div style={{ fontSize: '22px', fontWeight: '800', marginTop: '2px' }}>
            {weather.humidity}%
          </div>
          <small style={{ color: '#d8f3dc', fontSize: '11px' }}>Độ ẩm tối ưu</small>
        </div>
        <div>
          <small style={{ color: '#b7e4c7', fontSize: '11px', textTransform: 'uppercase' }}>Sức gió</small>
          <div style={{ fontSize: '22px', fontWeight: '800', marginTop: '2px' }}>
            {weather.wind_speed_kmh} <span style={{ fontSize: '13px', fontWeight: '400' }}>km/h</span>
          </div>
          <small style={{ color: '#d8f3dc', fontSize: '11px' }}>Gió nhẹ lưu thông</small>
        </div>
        <div>
          <small style={{ color: '#b7e4c7', fontSize: '11px', textTransform: 'uppercase' }}>Chỉ số UV</small>
          <div style={{ fontSize: '22px', fontWeight: '800', marginTop: '2px' }}>
            {weather.uv_index}/10
          </div>
          <small style={{ color: '#d8f3dc', fontSize: '11px' }}>{weather.uv_index >= 8 ? 'Rất mạnh' : 'Trung bình'}</small>
        </div>
      </div>

      {/* Smart Advice Banner */}
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.12)',
          borderLeft: '4px solid #74c69d',
          borderRadius: '8px',
          padding: '10px 14px',
          fontSize: '13px',
          lineHeight: '1.5',
        }}
      >
        <div style={{ fontWeight: '700', color: '#95d5b2', marginBottom: '2px' }}>
          💡 Trợ lý Khuyến nông Thông minh:
        </div>
        <div style={{ color: '#ffffff' }}>{weather.smart_advice}</div>
        <div style={{ color: '#d8f3dc', marginTop: '4px', fontSize: '12px' }}>
          👉 <strong>Hành động đề xuất:</strong> {weather.care_action}
        </div>
      </div>

      {/* Forecast row */}
      {weather.forecast && (
        <div style={{ display: 'flex', gap: '10px', marginTop: '14px', overflowX: 'auto', paddingBottom: '4px' }}>
          {weather.forecast.map((f, i) => (
            <div
              key={i}
              style={{
                background: 'rgba(0, 0, 0, 0.12)',
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '11px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap',
              }}
            >
              <span>{f.icon}</span>
              <strong style={{ color: '#b7e4c7' }}>{f.day}:</strong>
              <span>{f.temp} · {f.condition}</span>
            </div>
          ))}
        </div>
      )}

      {/* Modal Ước tính sản lượng */}
      {calcOpen && (
        <div
          className="booking-backdrop"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
          onClick={() => setCalcOpen(false)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              maxWidth: '480px',
              width: '100%',
              padding: '24px',
              color: '#1a1a1a',
              boxShadow: '0 16px 40px rgba(0,0,0,0.25)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', color: '#1b4332' }}>
                🌾 Công Cụ Ước Tính Sản Lượng Mùa Vụ
              </h3>
              <button
                type="button"
                onClick={() => setCalcOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#888' }}
              >
                ✕
              </button>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#495057', marginBottom: '6px' }}>
                Chọn loại giống cây trồng:
              </label>
              <select
                value={selectedCropId}
                onChange={(e) => setSelectedCropId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #ced4da',
                  fontSize: '14px',
                }}
              >
                {crops.map((c) => (
                  <option key={c.ma_cay_trong} value={c.ma_cay_trong}>
                    {c.ten_cay_trong} ({c.thoi_gian_sinh_truong_ngay} ngày)
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#495057', marginBottom: '6px' }}>
                Diện tích ô đất canh tác (m²):
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {[12, 24, 48].map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setSelectedArea(size)}
                    style={{
                      flex: 1,
                      padding: '8px 0',
                      borderRadius: '8px',
                      border: selectedArea === size ? '2px solid #2d6a4f' : '1px solid #ced4da',
                      background: selectedArea === size ? '#e8f5e9' : '#fff',
                      color: selectedArea === size ? '#1b4332' : '#495057',
                      fontWeight: '700',
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}
                  >
                    {size} m²
                  </button>
                ))}
              </div>
            </div>

            {calcLoading ? (
              <p style={{ textAlign: 'center', color: '#666' }}>Đang tính toán...</p>
            ) : yieldResult ? (
              <div
                style={{
                  background: '#f8fdf9',
                  border: '1px solid #b7e4c7',
                  borderRadius: '12px',
                  padding: '16px',
                  marginBottom: '16px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontSize: '13px', color: '#555' }}>Sản lượng ước tính:</span>
                  <strong style={{ fontSize: '18px', color: '#2d6a4f' }}>
                    ~{yieldResult.estimated_yield_kg} kg rau củ sạch
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontSize: '13px', color: '#555' }}>Giá trị nông sản tương đương:</span>
                  <strong style={{ fontSize: '15px', color: '#c98b3c' }}>
                    {new Intl.NumberFormat('vi-VN').format(yieldResult.estimated_market_value)} đ
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', color: '#777' }}>Thời gian thu hoạch:</span>
                  <span style={{ fontSize: '12px', fontWeight: '600' }}>{yieldResult.growth_days} ngày</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', color: '#777' }}>Chế độ tưới nước:</span>
                  <span style={{ fontSize: '12px', fontWeight: '600' }}>{yieldResult.watering_frequency}</span>
                </div>
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => setCalcOpen(false)}
              style={{
                width: '100%',
                padding: '10px',
                background: '#2d6a4f',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '700',
                cursor: 'pointer',
              }}
            >
              Đóng công cụ
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
