import { useEffect, useMemo, useState } from 'react'
import ProfilePanel from './ProfilePanel.jsx'
import AccountMenu from './AccountMenu.jsx'
import { apiRequest, getPlots } from '../api.js'

const money = (value) => `${Number(value || 0).toLocaleString('vi-VN')}đ`
const date = (value) => value ? new Date(value).toLocaleDateString('vi-VN') : 'Chưa cập nhật'
const seedOptions = [
  { id: 1, name: 'Rau xà lách xanh', detail: 'Thu hoạch sau khoảng 35 ngày' },
  { id: 2, name: 'Cà chua bi', detail: 'Thu hoạch sau khoảng 65 ngày' },
  { id: 3, name: 'Dâu tây thủy canh', detail: 'Thu hoạch sau khoảng 75 ngày' },
]
const journalEntries = [
  { stage: 'Gieo hạt', date: '12/08/2026', title: 'Mẻ hạt đầu tiên đã nảy mầm', copy: 'Độ ẩm đất ổn định. Nông dân đã hoàn thành gieo hạt và phủ lớp giá thể bảo vệ.' },
  { stage: 'Chăm sóc', date: '18/08/2026', title: 'Cây đang phát triển khỏe mạnh', copy: 'Luống cây nhận đủ ánh sáng buổi sáng và được tưới tự động hai lần mỗi ngày.' },
]

function UserPage({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('gardens')
  const [rentals, setRentals] = useState([])
  const [plots, setPlots] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [selectedPlot, setSelectedPlot] = useState(null)
  const [selectedRental, setSelectedRental] = useState(null)
  const [duration, setDuration] = useState('3')
  const [seedId, setSeedId] = useState('1')
  const [payment, setPayment] = useState('chuyen_khoan')
  const [bookingLoading, setBookingLoading] = useState(false)
  const [filters, setFilters] = useState({ search: '', soil: 'Tất cả loại đất', maxPrice: '' })
  const [careRequest, setCareRequest] = useState({ type: 'Tưới nước', note: '' })
  const [harvest, setHarvest] = useState({ method: 'giao_tan_noi', address: '', phone: '' })

  const load = async () => {
    setLoading(true)
    try {
      const [rentalResult, plotResult] = await Promise.all([apiRequest(`/rentals/user/${user.id}`), getPlots()])
      setRentals(rentalResult.data)
      setPlots(plotResult.filter((plot) => plot.status === 'trong'))
      setError('')
    } catch (requestError) { setError(requestError.message) } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [user.id])
  useEffect(() => {
    const openProfile = () => setActiveTab('profile')
    window.addEventListener('plotfarm:open-profile', openProfile)
    return () => window.removeEventListener('plotfarm:open-profile', openProfile)
  }, [])

  const filteredPlots = useMemo(() => plots.filter((plot) => {
    const query = filters.search.toLowerCase()
    return (!query || `${plot.code} ${plot.location} ${plot.soil}`.toLowerCase().includes(query)) &&
      (filters.soil === 'Tất cả loại đất' || plot.soil === filters.soil) &&
      (!filters.maxPrice || plot.price <= Number(filters.maxPrice))
  }), [plots, filters])

  const submitBooking = async (event) => {
    event.preventDefault()
    setBookingLoading(true)
    const start = new Date()
    const end = new Date(start)
    end.setMonth(end.getMonth() + Number(duration))
    try {
      const result = await apiRequest('/rentals', { method: 'POST', body: JSON.stringify({
        so_hop_dong: `HD-${Date.now()}`, ma_nguoi_dung: user.id, ma_o_dat: selectedPlot.id,
        ma_cay_trong: Number(seedId), ngay_bat_dau: start.toISOString().slice(0, 10),
        ngay_ket_thuc: end.toISOString().slice(0, 10), thoi_han_thang: Number(duration),
        phuong_thuc_thanh_toan: payment,
      }) })
      setNotice(`${result.message || 'Đã tạo hợp đồng thành công.'} Phương thức: ${payment === 'chuyen_khoan' ? 'chuyển khoản' : 'ví điện tử'}.`)
      setSelectedPlot(null)
      await load()
    } catch (requestError) { setError(requestError.message) } finally { setBookingLoading(false) }
  }
  const saveProfile = (nextUser) => { sessionStorage.setItem('plotfarm_user', JSON.stringify(nextUser)); window.location.reload() }
  const openGarden = (rental) => { setSelectedRental(rental); setActiveTab('journal') }
  const submitLocalAction = (event, message) => { event.preventDefault(); setNotice(message); event.target.reset?.() }
  const tabs = [['gardens', 'Khu vườn của tôi'], ['find', 'Tìm ô đất'], ['journal', 'Nhật ký canh tác'], ['live', 'Camera trực tiếp'], ['care', 'Yêu cầu chăm sóc'], ['harvest', 'Nhận thu hoạch']]
  const activeGarden = selectedRental || rentals[0]

  return <main className="dashboard-page user-dashboard">
    <header className="dashboard-header"><a className="brand" href="/"><span className="brand-mark">PF</span><span>plot<span>farm</span></span></a><nav className="workspace-nav" aria-label="Điều hướng tài khoản">{tabs.map(([id, label]) => <button key={id} className={activeTab === id ? 'active' : ''} onClick={() => setActiveTab(id)}>{label}</button>)}</nav><AccountMenu user={user} roleLabel="Thành viên PlotFarm" onProfile={() => setActiveTab('profile')} onLogout={onLogout} /></header>
    <section className="dashboard-shell"><div className="workspace-kicker"><p className="eyebrow">KHU VƯỜN CỦA BẠN</p><span className="workspace-date">Dữ liệu cập nhật trực tiếp</span></div><h1>Chào mừng, <em>{user.name.split(' ').pop()}.</em></h1><p className="dashboard-lead">Quản lý mùa vụ, hợp đồng và ô đất của bạn trong một nơi.</p>{notice && <p className="dashboard-notice" role="status">{notice}</p>}{error && <p className="dashboard-error" role="alert">{error}</p>}
      {activeTab === 'gardens' && <section className="dashboard-panel rental-panel"><div className="user-summary"><div><span>Hợp đồng của tôi</span><strong>{rentals.length}</strong></div><div><span>Đang canh tác</span><strong>{rentals.length ? '01' : '00'}</strong></div><div><span>Email tài khoản</span><strong className="user-email">{user.email}</strong></div></div><div className="panel-heading"><div><p className="eyebrow">MY GARDENS</p><h2>Những ô đất đang thuê</h2></div><button className="dashboard-link-button" onClick={() => setActiveTab('find')}>Khám phá ô đất →</button></div>{loading && <p className="loading-state" role="status">Đang tải hợp đồng...</p>}{!loading && rentals.length === 0 && <p className="empty-state">Bạn chưa có hợp đồng nào. Hãy chọn một ô đất cho mùa vụ đầu tiên.</p>}{rentals.map((rental) => <article className="rental-item" key={rental.ma_hop_dong}><div><strong>{rental.so_hieu_o}</strong><span>{rental.ten_o_dat}</span></div><div><small>Thời hạn</small><span>{date(rental.ngay_bat_dau)} - {date(rental.ngay_ket_thuc)}</span></div><div><small>Trạng thái</small><b>{rental.trang_thai_hop_dong}</b></div><button onClick={() => openGarden(rental)}>Quản lý vườn →</button></article>)}</section>}
      {activeTab === 'find' && <section className="dashboard-panel marketplace-panel"><div className="panel-heading"><div><p className="eyebrow">TÌM KIẾM & LỌC</p><h2>Chọn ô đất cho mùa vụ mới</h2></div><span className="result-count">{filteredPlots.length} ô còn trống</span></div>{loading && <p className="loading-state" role="status">Đang tải ô đất...</p>}<div className="plot-filters"><input value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} placeholder="Tìm theo mã, vị trí..." /><select value={filters.soil} onChange={(event) => setFilters({ ...filters, soil: event.target.value })}><option>Tất cả loại đất</option><option>Đất thịt hữu cơ</option><option>Đất phù sa</option></select><input type="number" value={filters.maxPrice} onChange={(event) => setFilters({ ...filters, maxPrice: event.target.value })} placeholder="Giá tối đa / tháng" /></div><div className="user-plot-grid">{filteredPlots.map((plot) => <article className="user-plot-card" key={plot.id}><div className="plot-card-art"><span>TRỐNG</span><strong>{plot.code}</strong></div><div className="plot-card-content"><h3>{plot.location}</h3><p>{plot.soil} · {plot.area}m²</p><small>{plot.description || 'Được chăm sóc bởi đội ngũ PlotFarm'}</small><div><b>{money(plot.price)}</b><span>/ tháng</span><button onClick={() => setSelectedPlot(plot)}>Thuê ô này →</button></div></div></article>)}</div>{!loading && filteredPlots.length === 0 && <p className="empty-state">Không có ô đất phù hợp.</p>}</section>}
      {activeTab === 'journal' && <section className="dashboard-panel content-panel"><div className="panel-heading"><div><p className="eyebrow">NHẬT KÝ CANH TÁC</p><h2>Tiến độ mùa vụ</h2></div><span className="result-count">{activeGarden ? activeGarden.so_hieu_o : 'Chưa chọn ô đất'}</span></div>{activeGarden ? <><div className="growth-progress"><span style={{ width: '58%' }} /></div><div className="growth-stages"><div className="done"><b>01</b><span>Gieo hạt<small>Hoàn thành</small></span></div><div className="current"><b>02</b><span>Chăm sóc<small>Đang diễn ra</small></span></div><div><b>03</b><span>Ra hoa<small>Sắp tới</small></span></div><div><b>04</b><span>Thu hoạch<small>Dự kiến</small></span></div></div>{journalEntries.map((entry) => <article className="journal-entry" key={entry.title}><div className="journal-entry-image" /><div><small>{entry.date} · {entry.stage}</small><h3>{entry.title}</h3><p>{entry.copy}</p><button onClick={() => setNotice('Đã mở album cập nhật của mùa vụ.')}>Xem hình ảnh cập nhật →</button></div></article>)}</> : <p className="empty-state">Hãy thuê một ô đất để xem nhật ký canh tác.</p>}</section>}
      {activeTab === 'live' && <section className="dashboard-panel live-panel"><div><p className="eyebrow">LIVE STREAM</p><h2>Mắt camera tại ô đất</h2><p>Theo dõi khu vườn của bạn theo thời gian thực, ngày và đêm.</p><select className="garden-select" value={selectedRental?.ma_hop_dong || ''} onChange={(event) => setSelectedRental(rentals.find((rental) => String(rental.ma_hop_dong) === event.target.value))}><option value="">Chọn khu vườn</option>{rentals.map((rental) => <option key={rental.ma_hop_dong} value={rental.ma_hop_dong}>{rental.so_hieu_o} · {rental.ten_o_dat}</option>)}</select></div><div className="camera-frame"><span className="camera-live"><i /> LIVE · 1080p</span><span>{activeGarden?.so_hieu_o || 'Chưa chọn ô đất'} · Cập nhật 10 giây trước</span></div></section>}
      {activeTab === 'care' && <section className="dashboard-panel form-panel"><div><p className="eyebrow">HỖ TRỢ TỪ NÔNG DÂN</p><h2>Gửi yêu cầu chăm sóc</h2><p>Nhờ đội ngũ tại vườn tưới nước, bón phân, tỉa cành hoặc xử lý sâu bệnh.</p></div><form onSubmit={(event) => submitLocalAction(event, 'Đã gửi yêu cầu chăm sóc. Nông dân sẽ phản hồi trong ngày.')}><select value={careRequest.type} onChange={(event) => setCareRequest({ ...careRequest, type: event.target.value })}><option>Tưới nước</option><option>Bón phân</option><option>Tỉa cành</option><option>Xử lý sâu bệnh</option></select><textarea value={careRequest.note} onChange={(event) => setCareRequest({ ...careRequest, note: event.target.value })} placeholder="Mô tả thêm tình trạng cây hoặc thời gian mong muốn..." required /><button className="primary-button">Gửi yêu cầu <span>→</span></button></form></section>}
      {activeTab === 'harvest' && <section className="dashboard-panel form-panel"><div><p className="eyebrow">MÙA THU HOẠCH</p><h2>Đăng ký nhận nông sản</h2><p>Chọn cách nhận hàng để PlotFarm chuẩn bị đóng gói sau khi thu hoạch.</p></div><form onSubmit={(event) => submitLocalAction(event, 'Đã ghi nhận đăng ký nhận nông sản. Chúng tôi sẽ liên hệ trước ngày giao.') }><select value={harvest.method} onChange={(event) => setHarvest({ ...harvest, method: event.target.value })}><option value="giao_tan_noi">Giao tận nơi</option><option value="nhan_tai_vuon">Nhận tại vườn</option></select><input value={harvest.address} onChange={(event) => setHarvest({ ...harvest, address: event.target.value })} placeholder="Địa chỉ nhận hàng" required /><input value={harvest.phone} onChange={(event) => setHarvest({ ...harvest, phone: event.target.value })} placeholder="Số điện thoại người nhận" required /><button className="primary-button">Đăng ký nhận hàng <span>→</span></button></form></section>}
      {activeTab === 'profile' && <ProfilePanel user={user} onSave={saveProfile} />}
    </section>
    {selectedPlot && <div className="booking-backdrop"><form className="booking-modal" onSubmit={submitBooking}><button type="button" className="modal-close" onClick={() => setSelectedPlot(null)}>×</button><p className="eyebrow">THUÊ Ô {selectedPlot.code}</p><h2>Đặt mùa vụ của bạn</h2><p>{selectedPlot.area}m² · {selectedPlot.soil} · {money(selectedPlot.price)}/tháng</p><label>Thời hạn thuê<select value={duration} onChange={(event) => setDuration(event.target.value)}><option value="3">3 tháng · {money(selectedPlot.price * 3)}</option><option value="6">6 tháng · {money(selectedPlot.price * 6)}</option><option value="12">12 tháng · {money(selectedPlot.price * 12)}</option></select></label><label>Hạt giống / loại cây<select value={seedId} onChange={(event) => setSeedId(event.target.value)}>{seedOptions.map((seed) => <option key={seed.id} value={seed.id}>{seed.name} · {seed.detail}</option>)}</select></label><label>Thanh toán trực tuyến<select value={payment} onChange={(event) => setPayment(event.target.value)}><option value="chuyen_khoan">Chuyển khoản ngân hàng</option><option value="vi_dien_tu">Ví điện tử</option></select></label><button className="primary-button booking-submit" disabled={bookingLoading}>{bookingLoading ? 'Đang xử lý thanh toán...' : 'Thanh toán & tạo hợp đồng'} <span>→</span></button></form></div>}
  </main>
}

export default UserPage