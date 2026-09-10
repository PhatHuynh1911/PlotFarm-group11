import { useEffect, useState } from 'react'
import ProfilePanel from './ProfilePanel.jsx'
import AccountMenu from './AccountMenu.jsx'
import { getActiveRentals, getServiceRequests, updateServiceRequest } from '../api.js'

function FarmerPage({ user, onLogout }) {
  const token = JSON.parse(sessionStorage.getItem('plotfarm_auth') || '{}').token
  const [activeTab, setActiveTab] = useState('plots')
  const [plots, setPlots] = useState([])
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [journal, setJournal] = useState([])
  const [journalForm, setJournalForm] = useState({ plot: 'A-12', note: '', water: '10 lít', fertilizer: 'Chưa bón', photo: '' })
  const [journalMessage, setJournalMessage] = useState('')
  const [cameraUrls, setCameraUrls] = useState({ 'A-12': 'https://camera.plotfarm.vn/a12', 'B-07': '' })
  const [cameraMessage, setCameraMessage] = useState('')
  const [harvested, setHarvested] = useState([])

  useEffect(() => {
    Promise.all([getActiveRentals(token), getServiceRequests(token)])
      .then(([rentals, serviceRequests]) => {
        setPlots(rentals.map((rental) => ({ id: rental.so_hieu_o, crop: rental.ten_cay_trong || 'Chưa chọn cây trồng', customer: rental.ten_khach_hang, area: `${rental.dien_tich_m2} m²`, stage: 'Đang sinh trưởng', progress: Math.min(Math.max(Math.round((rental.so_ngay_da_trong || 0) / (rental.thoi_gian_sinh_truong_ngay || 90) * 100), 1), 100), next: 'Theo dõi và chăm sóc theo lịch', camera: false, rentalId: rental.ma_hop_dong })))
        setRequests(serviceRequests.map((request) => ({ id: request.ma_yeu_cau, plot: request.so_hieu_o, customer: request.ten_khach_hang, text: request.ghi_chu_cua_khach, status: request.trang_thai_xu_ly === 'hoan_thanh' ? 'Đã xử lý' : 'Mới', time: request.ngay_gui_yeu_cau })))
      })
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false))
  }, [token])

  const updateRequest = async (id) => {
    try {
      await updateServiceRequest(id, { status: 'hoan_thanh', ma_nong_dan_xu_ly: user.id }, token)
      setRequests((items) => items.map((item) => item.id === id ? { ...item, status: 'Đã xử lý' } : item))
    } catch (requestError) { setError(requestError.message) }
  }

  const submitJournal = (event) => {
    event.preventDefault()
    if (!journalForm.note.trim()) return
    setJournal((items) => [{ ...journalForm, id: Date.now(), date: 'Vừa cập nhật' }, ...items])
    setJournalForm({ ...journalForm, note: '', photo: '' })
    setJournalMessage('Đã gửi nhật ký để khách hàng theo dõi.')
  }

  const handlePhoto = (event) => {
    const file = event.target.files?.[0]
    if (file) setJournalForm({ ...journalForm, photo: URL.createObjectURL(file) })
  }

  const saveCamera = (plotId) => {
    setCameraMessage(`Đã lưu liên kết camera cho ô ${plotId}.`)
    setTimeout(() => setCameraMessage(''), 2500)
  }

  const confirmHarvest = (plotId) => setHarvested((items) => items.includes(plotId) ? items : [...items, plotId])
  const activeRequests = requests.filter((request) => request.status !== 'Đã xử lý').length
  const saveProfile = (nextUser) => { sessionStorage.setItem('plotfarm_user', JSON.stringify(nextUser)); window.location.reload() }

  return <main className="dashboard-page farmer-dashboard">
    <header className="dashboard-header">
      <a className="brand" href="/"><span className="brand-mark">PF</span><span>plot<span>farm</span></span></a>
      <nav className="workspace-nav" aria-label="Điều hướng khu vực nông dân">{[['plots', 'Ô đất'], ['journal', 'Nhật ký'], ['requests', 'Yêu cầu'], ['cameras', 'Camera'], ['harvest', 'Thu hoạch']].map(([id, label]) => <button key={id} className={activeTab === id ? 'active' : ''} onClick={() => setActiveTab(id)}>{label}</button>)}</nav>
      <AccountMenu user={user} roleLabel="Nông dân PlotFarm" onProfile={() => setActiveTab('profile')} onLogout={onLogout} />
    </header>
    <section className="dashboard-shell">
      <div className="workspace-kicker"><p className="eyebrow">KHU VỰC NÔNG DÂN</p><span className="workspace-date">Mùa vụ 2026 · Đang hoạt động</span></div>{loading && <p className="loading-state" role="status">Đang tải dữ liệu mùa vụ...</p>}{error && <p className="dashboard-error" role="alert">{error}</p>}
      <h1>Xin chào, <em>{user.name.split(' ').pop()}.</em></h1>
      <p className="dashboard-lead">Theo dõi mùa vụ, chăm sóc những ô đất và cập nhật tiến độ canh tác của bạn.</p>
      <div className="dashboard-stat-grid">
        <div className="dashboard-stat"><span>Ô đất được phân công</span><strong>{plots.length}</strong><small>Đang canh tác</small></div>
        <div className="dashboard-stat"><span>Nhật ký canh tác</span><strong>{journal.length}</strong><small>Đã gửi trong phiên này</small></div>
        <div className="dashboard-stat"><span>Yêu cầu cần xử lý</span><strong>{activeRequests}</strong><small>Phản hồi khách hàng</small></div>
        <div className="dashboard-stat"><span>Chờ thu hoạch</span><strong>{plots.filter((plot) => plot.stage === 'Sắp thu hoạch' && !harvested.includes(plot.id)).length}</strong><small>Chuyển sang đóng gói</small></div>
      </div>
      <nav className="farmer-tabs legacy-tabs" aria-label="Chức năng nông dân">
        {[['plots', 'Ô đất được phân công'], ['journal', 'Nhật ký canh tác'], ['requests', `Yêu cầu chăm sóc${activeRequests ? ` (${activeRequests})` : ''}`], ['cameras', 'Camera / thiết bị'], ['harvest', 'Xác nhận thu hoạch'], ['profile', 'Hồ sơ cá nhân']].map(([id, label]) => <button key={id} className={activeTab === id ? 'active' : ''} onClick={() => setActiveTab(id)}>{label}</button>)}
      </nav>

      {activeTab === 'plots' && <section className="farmer-content-panel"><div className="panel-heading"><div><p className="eyebrow">MÙA VỤ CỦA BẠN</p><h2>Các ô đất đang chăm sóc</h2></div><span className="result-count">{plots.length} ô đất · cập nhật hôm nay</span></div><div className="farmer-plot-list">{plots.map((plot) => <article className="farmer-plot-card" key={plot.id}><div className="farmer-plot-top"><span className="plot-id">{plot.id}</span><span className="plot-stage">{plot.stage}</span></div><h3>{plot.crop}</h3><p className="farmer-customer">Khách hàng: <strong>{plot.customer}</strong></p><div className="plot-meta"><span>{plot.area}</span><span>{plot.progress}% tiến độ</span></div><div className="farmer-progress"><span style={{ width: `${plot.progress}%` }} /></div><small>Việc tiếp theo: {plot.next}</small></article>)}</div></section>}

      {activeTab === 'journal' && <section className="farmer-content-panel journal-workspace"><div className="panel-heading"><div><p className="eyebrow">CẬP NHẬT CHO KHÁCH HÀNG</p><h2>Thêm nhật ký canh tác</h2></div><span className="result-count">Hàng ngày / hàng tuần</span></div><form className="farmer-form" onSubmit={submitJournal}><label>Ô đất<select value={journalForm.plot} onChange={(event) => setJournalForm({ ...journalForm, plot: event.target.value })}>{plots.map((plot) => <option key={plot.id} value={plot.id}>{plot.id} · {plot.crop}</option>)}</select></label><label>Ghi chú tình trạng cây<textarea value={journalForm.note} onChange={(event) => setJournalForm({ ...journalForm, note: event.target.value })} placeholder="Ví dụ: cây đang phát triển tốt, xuất hiện vài lá vàng..." required /></label><div className="farmer-form-row"><label>Lượng nước<input value={journalForm.water} onChange={(event) => setJournalForm({ ...journalForm, water: event.target.value })} /></label><label>Phân bón<input value={journalForm.fertilizer} onChange={(event) => setJournalForm({ ...journalForm, fertilizer: event.target.value })} /></label></div><label className="photo-upload">Ảnh thực tế<input type="file" accept="image/*" onChange={handlePhoto} />{journalForm.photo && <img src={journalForm.photo} alt="Ảnh xem trước nhật ký" />}</label><button className="primary-button" type="submit">Gửi nhật ký <span>→</span></button>{journalMessage && <p className="form-success">{journalMessage}</p>}</form><div className="journal-history"><h3>Nhật ký vừa gửi</h3>{journal.length === 0 ? <p className="empty-state">Chưa có cập nhật mới trong phiên này.</p> : journal.map((entry) => <article key={entry.id}><div><strong>{entry.plot}</strong><small>{entry.date} · {entry.water} · {entry.fertilizer}</small><p>{entry.note}</p></div>{entry.photo && <img src={entry.photo} alt="Ảnh cây trồng trong nhật ký" />}</article>)}</div></section>}

      {activeTab === 'requests' && <section className="farmer-content-panel"><div className="panel-heading"><div><p className="eyebrow">HỘP THƯ CHĂM SÓC</p><h2>Yêu cầu từ khách hàng</h2></div><span className="result-count">Phản hồi sau mỗi lần chăm sóc</span></div><div className="request-list">{requests.map((request) => <article className={`care-request ${request.status === 'Đã xử lý' ? 'resolved' : ''}`} key={request.id}><div><div className="request-heading"><strong>{request.plot} · {request.customer}</strong><span>{request.status}</span></div><p>{request.text}</p><small>{request.time}</small></div>{request.status !== 'Đã xử lý' && <button className="outline-button" onClick={() => updateRequest(request.id)}>Đánh dấu đã xử lý</button>}</article>)}</div></section>}

      {activeTab === 'cameras' && <section className="farmer-content-panel"><div className="panel-heading"><div><p className="eyebrow">THIẾT BỊ ĐƯỢC PHÂN QUYỀN</p><h2>Liên kết camera ô đất</h2></div><span className="result-count">Chỉ dùng link stream được cấp quyền</span></div><div className="camera-settings">{plots.map((plot) => <div className="camera-setting" key={plot.id}><div><strong>{plot.id} · {plot.crop}</strong><small>{plot.camera ? 'Thiết bị đã đăng ký' : 'Chưa có camera'}</small></div><input aria-label={`Liên kết camera ô ${plot.id}`} value={cameraUrls[plot.id] || ''} placeholder="https://camera..." onChange={(event) => setCameraUrls({ ...cameraUrls, [plot.id]: event.target.value })} /><button className="outline-button" onClick={() => saveCamera(plot.id)}>Lưu liên kết</button></div>)}</div>{cameraMessage && <p className="form-success">{cameraMessage}</p>}</section>}

      {activeTab === 'harvest' && <section className="farmer-content-panel"><div className="panel-heading"><div><p className="eyebrow">BÀN GIAO MÙA VỤ</p><h2>Xác nhận thu hoạch</h2></div><span className="result-count">Thông báo cho đóng gói và vận chuyển</span></div><div className="harvest-list">{plots.map((plot) => { const isDone = harvested.includes(plot.id); return <article className={`harvest-item ${isDone ? 'harvest-done' : ''}`} key={plot.id}><div><strong>{plot.id} · {plot.crop}</strong><p>Khách hàng: {plot.customer}</p><small>{isDone ? 'Đã chuyển sang khâu đóng gói, vận chuyển.' : plot.stage === 'Sắp thu hoạch' ? 'Đã đến kỳ thu hoạch, cần xác nhận.' : `Tiến độ hiện tại ${plot.progress}%.`}</small></div><button className={isDone ? 'harvest-confirmed' : 'primary-button'} disabled={isDone || plot.stage !== 'Sắp thu hoạch'} onClick={() => confirmHarvest(plot.id)}>{isDone ? 'Đã chuyển giao' : 'Xác nhận thu hoạch'}</button></article>})}</div></section>}
      {activeTab === 'profile' && <ProfilePanel user={user} onSave={saveProfile} />}
    </section>
  </main>
}

export default FarmerPage