import { useEffect, useMemo, useState } from 'react'
import { createRental, createServiceRequest, getPlots, getServiceTypes, getUserRentals } from '../api.js'
import AccountMenu from './AccountMenu.jsx'
import ProfilePanel from './ProfilePanel.jsx'

const formatMoney = (value) => `${new Intl.NumberFormat('vi-VN').format(value)}đ`
const formatDate = (value) => value ? new Date(value).toLocaleDateString('vi-VN') : 'Chưa cập nhật'

function UserPage({ user, token, onLogout }) {
  const [rentals, setRentals] = useState([])
  const [availablePlots, setAvailablePlots] = useState([])
  const [serviceTypes, setServiceTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('gardens')
  const [filters, setFilters] = useState({ search: '', soil: 'Tất cả loại đất', maxPrice: 'Tất cả mức giá' })
  const [selectedPlot, setSelectedPlot] = useState(null)
  const [booking, setBooking] = useState({ duration: '3', crop: 'Rau xà lách', payment: 'Chuyển khoản' })
  const [notice, setNotice] = useState('')
  const [supportSent, setSupportSent] = useState(false)
  const [harvestSent, setHarvestSent] = useState(false)

  useEffect(() => {
    Promise.all([getUserRentals(user.id, token), getPlots(), getServiceTypes()])
      .then(([nextRentals, nextPlots, nextServiceTypes]) => {
        setRentals(nextRentals)
        setAvailablePlots(nextPlots.filter((plot) => plot.status === 'trong'))
        setServiceTypes(nextServiceTypes)
      })
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false))
  }, [user.id, token])

  const filteredPlots = useMemo(() => availablePlots.filter((plot) => {
    const search = filters.search.toLowerCase()
    return (!search || `${plot.id} ${plot.location} ${plot.soil}`.toLowerCase().includes(search)) &&
      (filters.soil === 'Tất cả loại đất' || plot.soil === filters.soil) &&
      (filters.maxPrice === 'Tất cả mức giá' || plot.price <= Number(filters.maxPrice))
  }), [availablePlots, filters])
  const tabs = [['gardens', 'Khu vườn của tôi'], ['find', 'Tìm & lọc ô đất'], ['journal', 'Nhật ký canh tác'], ['live', 'Camera trực tiếp'], ['support', 'Yêu cầu chăm sóc'], ['harvest', 'Quản lý thu hoạch']]
  const showNotice = (message) => { setNotice(message); window.setTimeout(() => setNotice(''), 3500) }
  const submitBooking = async (event) => {
    event.preventDefault()
    setError('')
    try {
      await createRental({ ma_nguoi_dung: user.id, ma_o_dat: selectedPlot.id, thoi_han_thang: Number(booking.duration) }, token)
      setRentals(await getUserRentals(user.id, token))
      setAvailablePlots((plots) => plots.filter((plot) => plot.id !== selectedPlot.id))
      showNotice(`Đã ghi nhận yêu cầu thuê ô ${selectedPlot.code}.`)
      setSelectedPlot(null)
      setActiveTab('gardens')
    } catch (requestError) { setError(requestError.message) }
  }
  const submitSupport = async (event) => {
    event.preventDefault()
    setError('')
    const form = new FormData(event.currentTarget)
    const rental = rentals[0]
    try {
      if (!rental) throw new Error('Bạn cần có hợp đồng trước khi gửi yêu cầu chăm sóc')
      await createServiceRequest({ ma_hop_dong: rental.ma_hop_dong, ma_khach_hang: user.id, ma_loai_dich_vu: Number(form.get('serviceType')), ngay_yeu_cau_thuc_hien: form.get('schedule'), ghi_chu_cua_khach: form.get('note') }, token)
      setSupportSent(true)
      showNotice('Đã gửi yêu cầu chăm sóc tới đội ngũ PlotFarm.')
    } catch (requestError) { setError(requestError.message) }
  }

  return <main className="dashboard-page user-dashboard"><header className="dashboard-header"><a className="brand" href="/"><span className="brand-mark">PF</span><span>plot<span>farm</span></span></a><nav className="workspace-nav" aria-label="Điều hướng khách hàng">{tabs.map(([id, label]) => <button key={id} className={activeTab === id ? 'active' : ''} onClick={() => setActiveTab(id)}>{label}</button>)}</nav><AccountMenu user={user} roleLabel="Khách hàng PlotFarm" onProfile={() => setActiveTab('profile')} onLogout={onLogout} /></header><section className="dashboard-shell"><p className="eyebrow">KHU VƯỜN CỦA BẠN</p><h1>Chào mừng, <em>{user.name.split(' ').pop()}.</em></h1><p className="dashboard-lead">Quản lý mùa vụ, chăm sóc và nông sản của bạn trong một nơi.</p><nav className="user-tabs" aria-label="Điều hướng tài khoản">{tabs.map(([id, label]) => <button key={id} className={activeTab === id ? 'active' : ''} onClick={() => setActiveTab(id)}>{label}</button>)}</nav>{notice && <p className="dashboard-notice" role="status">{notice}</p>}
    {activeTab === 'gardens' && <><div className="user-summary"><div><span>Hợp đồng của tôi</span><strong>{rentals.length}</strong></div><div><span>Đang canh tác</span><strong>{rentals.length ? '01' : '00'}</strong></div><div><span>Email tài khoản</span><strong className="user-email">{user.email}</strong></div></div><section className="dashboard-panel rental-panel"><div className="panel-heading"><div><p className="eyebrow">MY GARDENS</p><h2>Những ô đất đang thuê</h2></div><button className="dashboard-link-button" onClick={() => setActiveTab('find')}>Khám phá ô đất <span>→</span></button></div>{loading && <p className="loading-state" role="status">Đang tải khu vườn...</p>}{error && <p className="dashboard-error" role="alert">{error}</p>}{!loading && !error && rentals.length === 0 && <p className="empty-state">Bạn chưa có hợp đồng nào. Hãy chọn một ô đất cho mùa vụ đầu tiên.</p>}{rentals.length > 0 && <div className="rental-list">{rentals.map((rental) => <article className="rental-item" key={rental.ma_hop_dong}><div><strong>{rental.so_hieu_o}</strong><span>{rental.ten_o_dat}</span></div><div><small>Thời hạn</small><span>{formatDate(rental.ngay_bat_dau)} - {formatDate(rental.ngay_ket_thuc)}</span></div><div><small>Trạng thái</small><b>{rental.trang_thai_hop_dong}</b></div><div><small>Thao tác</small><button onClick={() => setActiveTab('live')}>Xem vườn →</button></div></article>)}</div>}</section></>}
    {activeTab === 'find' && <section className="dashboard-panel marketplace-panel"><div className="panel-heading"><div><p className="eyebrow">TÌM KIẾM & LỌC</p><h2>Chọn ô đất cho mùa vụ mới</h2></div><span className="result-count">{filteredPlots.length} ô còn trống</span></div>{loading && <p className="loading-state" role="status">Đang tải danh sách ô đất...</p>}<div className="plot-filters"><input value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} placeholder="Tìm theo mã, vị trí..." /><select value={filters.soil} onChange={(event) => setFilters({ ...filters, soil: event.target.value })}><option>Tất cả loại đất</option><option>Đất thịt hữu cơ</option><option>Đất phù sa</option></select><select value={filters.maxPrice} onChange={(event) => setFilters({ ...filters, maxPrice: event.target.value })}><option>Tất cả mức giá</option><option value="450000">Dưới 450.000đ/tháng</option><option value="600000">Dưới 600.000đ/tháng</option></select></div><div className="user-plot-grid">{filteredPlots.map((plot) => <article className="user-plot-card" key={plot.id}><div className="plot-card-art"><span>TRỐNG</span><strong>{plot.code}</strong></div><div className="plot-card-content"><h3>{plot.location}</h3><p>{plot.soil} · {plot.area}m²</p><small>{plot.description || 'Ô đất đã được chuẩn bị sẵn cho mùa vụ mới.'}</small><div><b>{formatMoney(plot.price)}</b><span>/ tháng</span><button onClick={() => setSelectedPlot(plot)}>Thuê ô này →</button></div></div></article>)}</div>{!loading && filteredPlots.length === 0 && <p className="empty-state">Không có ô đất phù hợp. Hãy thử nới rộng bộ lọc.</p>}</section>}
    {activeTab === 'journal' && <section className="dashboard-panel content-panel"><p className="eyebrow">NHẬT KÝ CANH TÁC</p><h2>Tiến độ mùa vụ của bạn</h2><div className="growth-progress"><span style={{ width: '64%' }} /></div><div className="growth-stages"><div className="done"><b>01</b><span>Gieo hạt<small>12/08/2026</small></span></div><div className="done"><b>02</b><span>Cây con<small>20/08/2026</small></span></div><div className="current"><b>03</b><span>Sinh trưởng<small>Đang cập nhật</small></span></div><div><b>04</b><span>Thu hoạch<small>Dự kiến 25/09</small></span></div></div><article className="journal-entry"><div className="journal-entry-image" /><div><small>Hôm qua · Minh Phúc, nông dân phụ trách</small><h3>Cây phát triển khỏe, lá xanh đều</h3><p>Đã tưới nước buổi sáng và bổ sung phân hữu cơ vi sinh. Độ ẩm đất hiện tại 68%.</p><button onClick={() => showNotice('Đã mở toàn bộ nhật ký mùa vụ.')}>Xem chi tiết nhật ký →</button></div></article></section>}
    {activeTab === 'live' && <section className="dashboard-panel content-panel live-panel"><div><p className="eyebrow">LIVE STREAM · A-01</p><h2>Quan sát khu vườn theo thời gian thực</h2><p>Camera đang hoạt động, cập nhật hình ảnh mỗi 30 giây.</p><button className="primary-button" onClick={() => showNotice('Camera đã sẵn sàng. Chức năng toàn màn hình đang được mở.')}>Mở toàn màn hình <span>↗</span></button></div><div className="camera-frame"><span className="camera-live"><i /> LIVE</span><span>CAM-A01 · 10:42:18</span></div></section>}
    {activeTab === 'support' && <section className="dashboard-panel form-panel"><div><p className="eyebrow">YÊU CẦU CHĂM SÓC</p><h2>Để nông dân chăm vườn cùng bạn</h2><p>Gửi yêu cầu bón phân, tỉa cành, tưới nước hoặc xử lý sâu bệnh.</p></div>{supportSent ? <p className="form-success">Yêu cầu đã được gửi. Đội ngũ sẽ phản hồi trong hôm nay.</p> : <form onSubmit={submitSupport}><select name="serviceType" required><option value="">Chọn loại hỗ trợ</option>{serviceTypes.map((service) => <option key={service.ma_loai_dich_vu} value={service.ma_loai_dich_vu}>{service.ten_dich_vu}</option>)}</select><input name="schedule" required placeholder="Thời gian mong muốn" /><textarea name="note" required placeholder="Mô tả tình trạng hoặc ghi chú cho nông dân" /><button className="primary-button">Gửi yêu cầu <span>→</span></button></form>}</section>}
    {activeTab === 'harvest' && <section className="dashboard-panel form-panel"><div><p className="eyebrow">QUẢN LÝ THU HOẠCH</p><h2>Nhận thành quả từ khu vườn</h2><p>Đăng ký địa chỉ và cách vận chuyển trước ngày thu hoạch.</p></div>{harvestSent ? <p className="form-success">Thông tin nhận hàng đã được lưu cho mùa vụ này.</p> : <form onSubmit={(event) => { event.preventDefault(); setHarvestSent(true) }}><input required placeholder="Tên người nhận" /><input required placeholder="Số điện thoại" /><input required placeholder="Địa chỉ nhận hàng" /><select required defaultValue=""><option value="">Chọn hình thức vận chuyển</option><option>Giao tận nơi</option><option>Nhận tại nông trại</option></select><button className="primary-button">Đăng ký nhận hàng <span>→</span></button></form>}</section>}
    {activeTab === 'profile' && <ProfilePanel user={user} onSave={(nextUser) => { sessionStorage.setItem('plotfarm_auth', JSON.stringify({ ...JSON.parse(sessionStorage.getItem('plotfarm_auth') || '{}'), user: nextUser })); window.location.reload() }} />}
  </section>{error && activeTab !== 'gardens' && <p className="dashboard-error" role="alert">{error}</p>}{selectedPlot && <div className="booking-backdrop"><form className="booking-modal" onSubmit={submitBooking}><button type="button" className="modal-close" onClick={() => setSelectedPlot(null)}>×</button><p className="eyebrow">THUÊ Ô {selectedPlot.code}</p><h2>Đặt mùa vụ của bạn</h2><p>{selectedPlot.area}m² · {selectedPlot.soil} · {formatMoney(selectedPlot.price)}/tháng</p><label>Thời hạn thuê<select value={booking.duration} onChange={(event) => setBooking({ ...booking, duration: event.target.value })}><option value="3">3 tháng · {formatMoney(selectedPlot.price * 3)}</option><option value="6">6 tháng · {formatMoney(selectedPlot.price * 6)}</option><option value="12">12 tháng · {formatMoney(selectedPlot.price * 12)}</option></select></label><label>Hạt giống / loại cây<select value={booking.crop} onChange={(event) => setBooking({ ...booking, crop: event.target.value })}><option>Rau xà lách</option><option>Cà chua bi</option><option>Dâu tây</option><option>Rau gia vị</option></select></label><label>Thanh toán<select value={booking.payment} onChange={(event) => setBooking({ ...booking, payment: event.target.value })}><option>Chuyển khoản</option><option>Ví điện tử</option><option>Thẻ quốc tế</option></select></label><button className="primary-button booking-submit">Tiếp tục thanh toán <span>→</span></button></form></div>}</main>
}

export default UserPage
