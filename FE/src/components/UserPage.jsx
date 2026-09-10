import { useEffect, useMemo, useState } from 'react'
import ProfilePanel from './ProfilePanel.jsx'
import AccountMenu from './AccountMenu.jsx'
import { apiRequest, getPlots } from '../api.js'

const money = (value) => `${Number(value || 0).toLocaleString('vi-VN')}đ`
const date = (value) => value ? new Date(value).toLocaleDateString('vi-VN') : 'Chưa cập nhật'

function UserPage({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('gardens')
  const [rentals, setRentals] = useState([])
  const [plots, setPlots] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [selectedPlot, setSelectedPlot] = useState(null)
  const [duration, setDuration] = useState('3')
  const [bookingLoading, setBookingLoading] = useState(false)
  const [filters, setFilters] = useState({ search: '', soil: 'Tất cả loại đất' })

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
  const filteredPlots = useMemo(() => plots.filter((plot) => {
    const query = filters.search.toLowerCase()
    return (!query || `${plot.code} ${plot.location} ${plot.soil}`.toLowerCase().includes(query)) && (filters.soil === 'Tất cả loại đất' || plot.soil === filters.soil)
  }), [plots, filters])
  const submitBooking = async (event) => {
    event.preventDefault()
    setBookingLoading(true)
    const start = new Date()
    const end = new Date(start)
    end.setMonth(end.getMonth() + Number(duration))
    try {
      const result = await apiRequest('/rentals', { method: 'POST', body: JSON.stringify({ so_hop_dong: `HD-${Date.now()}`, ma_nguoi_dung: user.id, ma_o_dat: selectedPlot.id, ngay_bat_dau: start.toISOString().slice(0, 10), ngay_ket_thuc: end.toISOString().slice(0, 10), thoi_han_thang: Number(duration) }) })
      setNotice(result.message || 'Đã tạo hợp đồng thành công.')
      setSelectedPlot(null)
      await load()
    } catch (requestError) { setError(requestError.message) } finally { setBookingLoading(false) }
  }
  const saveProfile = (nextUser) => { sessionStorage.setItem('plotfarm_user', JSON.stringify(nextUser)); window.location.reload() }
  const tabs = [['gardens', 'Khu vườn của tôi'], ['find', 'Tìm ô đất'], ['profile', 'Hồ sơ cá nhân']]

  return <main className="dashboard-page user-dashboard"><header className="dashboard-header"><a className="brand" href="/"><span className="brand-mark">PF</span><span>plot<span>farm</span></span></a><nav className="workspace-nav" aria-label="Điều hướng tài khoản">{tabs.map(([id, label]) => <button key={id} className={activeTab === id ? 'active' : ''} onClick={() => setActiveTab(id)}>{label}</button>)}</nav><AccountMenu user={user} roleLabel="Thành viên PlotFarm" onProfile={() => setActiveTab('profile')} onLogout={onLogout} /></header><section className="dashboard-shell"><div className="workspace-kicker"><p className="eyebrow">KHU VƯỜN CỦA BẠN</p><span className="workspace-date">Dữ liệu cập nhật trực tiếp</span></div><h1>Chào mừng, <em>{user.name.split(' ').pop()}.</em></h1><p className="dashboard-lead">Quản lý mùa vụ, hợp đồng và ô đất của bạn trong một nơi.</p>{notice && <p className="dashboard-notice" role="status">{notice}</p>}{error && <p className="dashboard-error" role="alert">{error}</p>}
    {activeTab === 'gardens' && <section className="dashboard-panel rental-panel"><div className="user-summary"><div><span>Hợp đồng của tôi</span><strong>{rentals.length}</strong></div><div><span>Đang canh tác</span><strong>{rentals.length ? '01' : '00'}</strong></div><div><span>Email tài khoản</span><strong className="user-email">{user.email}</strong></div></div><div className="panel-heading"><div><p className="eyebrow">MY GARDENS</p><h2>Những ô đất đang thuê</h2></div><button className="dashboard-link-button" onClick={() => setActiveTab('find')}>Khám phá ô đất →</button></div>{loading && <p className="loading-state" role="status">Đang tải hợp đồng...</p>}{!loading && rentals.length === 0 && <p className="empty-state">Bạn chưa có hợp đồng nào. Hãy chọn một ô đất cho mùa vụ đầu tiên.</p>}{rentals.map((rental) => <article className="rental-item" key={rental.ma_hop_dong}><div><strong>{rental.so_hieu_o}</strong><span>{rental.ten_o_dat}</span></div><div><small>Thời hạn</small><span>{date(rental.ngay_bat_dau)} - {date(rental.ngay_ket_thuc)}</span></div><div><small>Trạng thái</small><b>{rental.trang_thai_hop_dong}</b></div></article>)}</section>}
    {activeTab === 'find' && <section className="dashboard-panel marketplace-panel"><div className="panel-heading"><div><p className="eyebrow">TÌM KIẾM & LỌC</p><h2>Chọn ô đất cho mùa vụ mới</h2></div><span className="result-count">{filteredPlots.length} ô còn trống</span></div>{loading && <p className="loading-state" role="status">Đang tải ô đất...</p>}<div className="plot-filters"><input value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} placeholder="Tìm theo mã, vị trí..." /><select value={filters.soil} onChange={(event) => setFilters({ ...filters, soil: event.target.value })}><option>Tất cả loại đất</option><option>Đất thịt hữu cơ</option><option>Đất phù sa</option></select></div><div className="user-plot-grid">{filteredPlots.map((plot) => <article className="user-plot-card" key={plot.id}><div className="plot-card-art"><span>TRỐNG</span><strong>{plot.code}</strong></div><div className="plot-card-content"><h3>{plot.location}</h3><p>{plot.soil} · {plot.area}m²</p><small>{plot.description || 'Được chăm sóc bởi đội ngũ PlotFarm'}</small><div><b>{money(plot.price)}</b><span>/ tháng</span><button onClick={() => setSelectedPlot(plot)}>Thuê ô này →</button></div></div></article>)}</div>{!loading && filteredPlots.length === 0 && <p className="empty-state">Không có ô đất phù hợp.</p>}</section>}
    {activeTab === 'profile' && <ProfilePanel user={user} onSave={saveProfile} />}
  </section>{selectedPlot && <div className="booking-backdrop"><form className="booking-modal" onSubmit={submitBooking}><button type="button" className="modal-close" onClick={() => setSelectedPlot(null)}>×</button><p className="eyebrow">THUÊ Ô {selectedPlot.code}</p><h2>Đặt mùa vụ của bạn</h2><p>{selectedPlot.area}m² · {selectedPlot.soil} · {money(selectedPlot.price)}/tháng</p><label>Thời hạn thuê<select value={duration} onChange={(event) => setDuration(event.target.value)}><option value="3">3 tháng · {money(selectedPlot.price * 3)}</option><option value="6">6 tháng · {money(selectedPlot.price * 6)}</option><option value="12">12 tháng · {money(selectedPlot.price * 12)}</option></select></label><button className="primary-button booking-submit" disabled={bookingLoading}>{bookingLoading ? 'Đang tạo hợp đồng...' : 'Tạo hợp đồng'} <span>→</span></button></form></div>}</main>
}

export default UserPage
