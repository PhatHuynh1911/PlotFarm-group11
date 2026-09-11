import { useEffect, useState } from 'react'
import './FarmerPage.css'
import ProfilePanel from './ProfilePanel.jsx'
import AccountMenu from './AccountMenu.jsx'
import { getActiveRentals, getAssignments, getServiceRequests, respondToAssignment, updateServiceRequest, createJournal, getJournalsByRental, updateJournal, updateCultivationStatus } from '../api.js'

const requestLabels = { cho_tiep_nhan: 'Chờ tiếp nhận', da_tiep_nhan: 'Đã tiếp nhận', dang_thuc_hien: 'Đang thực hiện', hoan_thanh: 'Hoàn thành', tu_choi: 'Từ chối' }
const cultivationLabels = { cho_gieo_trong: 'Đã thanh toán · Chờ gieo trồng', dang_canh_tac: 'Đang canh tác', san_sang_thu_hoach: 'Sẵn sàng thu hoạch' }
const formatDate = (value) => value ? new Date(value).toLocaleDateString('vi-VN') : 'Chưa cập nhật'

function FarmerPage({ user, onLogout }) {
  const token = JSON.parse(sessionStorage.getItem('plotfarm_auth') || '{}').token
  const [activeTab, setActiveTab] = useState('plots')
  const [plots, setPlots] = useState([])
  const [requests, setRequests] = useState([])
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [journal, setJournal] = useState([])
  const [journalForm, setJournalForm] = useState({ plot: 'A-03', task: 'Tưới nước', note: '', water: '10 lít', fertilizer: 'Chưa bón', photo: '', video: '' })
  const [editingJournal, setEditingJournal] = useState(null)
  const [journalMessage, setJournalMessage] = useState('')
  const [cameraUrls, setCameraUrls] = useState({ 'A-03': 'https://camera.plotfarm.vn/a03', 'C-09': '' })
  const [cameraMessage, setCameraMessage] = useState('')
  const [harvested, setHarvested] = useState([])

  useEffect(() => {
    Promise.all([getActiveRentals(token), getServiceRequests(token), getAssignments(token)])
      .then(async ([rentals, serviceRequests, nextAssignments]) => {
        setAssignments(nextAssignments)
        const mappedPlots = rentals.map((rental) => ({ id: rental.so_hieu_o, crop: rental.ten_cay_trong || 'Chưa chọn cây trồng', customer: rental.ten_khach_hang, area: `${rental.dien_tich_m2} m²`, stage: rental.trang_thai_canh_tac || 'cho_gieo_trong', stageLabel: cultivationLabels[rental.trang_thai_canh_tac] || cultivationLabels.cho_gieo_trong, progress: Math.min(Math.max(Math.round((rental.so_ngay_da_trong || 0) / (rental.thoi_gian_sinh_truong_ngay || 90) * 100), 0), 100), next: rental.trang_thai_canh_tac === 'cho_gieo_trong' ? 'Xác nhận đã nhận giống để bắt đầu' : 'Theo dõi và chăm sóc theo lịch', specialRequest: rental.yeu_cau_dac_biet, startDate: rental.ngay_bat_dau, payment: rental.trang_thai_thanh_toan, camera: false, rentalId: rental.ma_hop_dong }))
        setPlots(mappedPlots)
        if (mappedPlots[0]?.id) {
          setJournalForm((prev) => ({ ...prev, plot: mappedPlots[0].id }))
        }
        setRequests(serviceRequests.map((request) => ({ id: request.ma_yeu_cau, plot: request.so_hieu_o, customer: request.ten_khach_hang, text: request.ghi_chu_cua_khach || 'Không có ghi chú', status: request.trang_thai_xu_ly, time: request.ngay_gui_yeu_cau, reply: request.phan_hoi_cua_nha_vuon || '', photo: request.hinh_anh_nghiem_thu || '' })))

        // Lấy lịch sử nhật ký từ DB
        const journalGroups = await Promise.all(rentals.map(async (rental) => {
          try {
            const dbJournals = await getJournalsByRental(rental.ma_hop_dong, token)
            return dbJournals.map((j) => ({ id: j.ma_nhat_ky, plot: rental.so_hieu_o, date: formatDate(j.ngay_ghi_nhat_ky), task: j.tieu_de || j.cong_viec_da_lam, water: '', fertilizer: j.loai_phan_bon_da_dung || 'Chưa bón', note: j.noi_dung || j.ghi_chu_chi_tiet, photo: j.hinh_anh, video: j.video_ghi_hinh }))
          } catch { return [] }
        }))
        setJournal(journalGroups.flat())
      })
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false))
  }, [token])

  const respondAssignment = async (assignment, status) => {
    try {
      await respondToAssignment(assignment.ma_phan_cong, status, token)
      setAssignments((items) => items.map((item) => item.ma_phan_cong === assignment.ma_phan_cong ? { ...item, trang_thai: status } : item))
    } catch (requestError) { setError(requestError.message) }
  }

  const updateRequest = async (id, status, reply = '', photo = '') => {
    try {
      await updateServiceRequest(id, { status, ma_nong_dan_xu_ly: user.id, phan_hoi_cua_nha_vuon: reply, hinh_anh_nghiem_thu: photo }, token)
      setRequests((items) => items.map((item) => item.id === id ? { ...item, status, reply, photo } : item))
    } catch (requestError) { setError(requestError.message) }
  }

  const submitJournal = async (event) => {
    event.preventDefault()
    if (!journalForm.note.trim()) return
    try {
      const targetPlot = plots.find((p) => p.id === journalForm.plot) || plots[0]
      const rentalId = targetPlot?.rentalId || 1
      const journalPayload = {
        ma_hop_dong: rentalId,
        ma_nong_dan: user.id,
        giai_doan_sinh_truong: 'Sinh trưởng',
        cong_viec_da_lam: `${journalForm.task} · Tưới: ${journalForm.water || '10 lít'}`,
        ghi_chu_chi_tiet: journalForm.note,
        loai_phan_bon_da_dung: journalForm.fertilizer,
        danh_sach_hinh_anh: journalForm.photo || null,
        video_ghi_hinh: journalForm.video || null
      }
      if (editingJournal) await updateJournal(editingJournal.id, journalPayload, token)
      else await createJournal(journalPayload, token)
      setJournal((items) => editingJournal ? items.map((item) => item.id === editingJournal.id ? { ...item, ...journalForm, date: 'Vừa cập nhật' } : item) : [{ ...journalForm, id: Date.now(), plot: targetPlot.id, date: 'Vừa cập nhật' }, ...items])
      setEditingJournal(null)
      setJournalForm({ ...journalForm, note: '', photo: '', video: '' })
      setJournalMessage(editingJournal ? 'Đã cập nhật nhật ký.' : 'Đã gửi và lưu nhật ký thành công vào cơ sở dữ liệu!')
      setTimeout(() => setJournalMessage(''), 3000)
    } catch (journalErr) {
      setError(journalErr.message)
    }
  }

  const handlePhoto = (event) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = () => setJournalForm((prev) => ({ ...prev, photo: reader.result }))
      reader.readAsDataURL(file)
    }
  }

  const handleVideo = (event) => {
    const file = event.target.files?.[0]
    if (file) setJournalForm((prev) => ({ ...prev, video: URL.createObjectURL(file) }))
  }

  const confirmPlanting = async (plot) => {
    try {
      await updateCultivationStatus(plot.rentalId, 'dang_canh_tac', token)
      setPlots((items) => items.map((item) => item.rentalId === plot.rentalId ? { ...item, stage: 'dang_canh_tac', stageLabel: cultivationLabels.dang_canh_tac, next: 'Theo dõi và chăm sóc theo lịch' } : item))
    } catch (plantingError) { setError(plantingError.message) }
  }

  const saveCamera = (plotId) => {
    setCameraMessage(`Đã lưu liên kết camera cho ô ${plotId}.`)
    setTimeout(() => setCameraMessage(''), 2500)
  }

  const confirmHarvest = (plotId) => setHarvested((items) => items.includes(plotId) ? items : [...items, plotId])
  const activeRequests = requests.filter((request) => request.status !== 'hoan_thanh').length
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
      {assignments.some((assignment) => assignment.trang_thai === 'cho_tiep_nhan') && <section className="farmer-content-panel"><div className="panel-heading"><div><p className="eyebrow">LỜI MỜI PHÂN CÔNG</p><h2>Admin muốn giao ô đất cho bạn</h2></div></div>{assignments.filter((assignment) => assignment.trang_thai === 'cho_tiep_nhan').map((assignment) => <article className="care-request" key={assignment.ma_phan_cong}><div><strong>{assignment.so_hieu_o} · {assignment.ten_khach_hang}</strong><p>{assignment.ghi_chu || 'Hãy xác nhận để bắt đầu nhận yêu cầu chăm sóc từ khách hàng.'}</p></div><div className="request-actions"><button className="outline-button" onClick={() => respondAssignment(assignment, 'tu_choi')}>Từ chối</button><button className="primary-button" onClick={() => respondAssignment(assignment, 'da_chap_nhan')}>Chấp nhận phân công</button></div></article>)}</section>}
      <nav className="farmer-tabs legacy-tabs" aria-label="Chức năng nông dân">
        {[['plots', 'Ô đất được phân công'], ['journal', 'Nhật ký canh tác'], ['requests', `Yêu cầu chăm sóc${activeRequests ? ` (${activeRequests})` : ''}`], ['cameras', 'Camera / thiết bị'], ['harvest', 'Xác nhận thu hoạch'], ['profile', 'Hồ sơ cá nhân']].map(([id, label]) => <button key={id} className={activeTab === id ? 'active' : ''} onClick={() => setActiveTab(id)}>{label}</button>)}
      </nav>

      {activeTab === 'plots' && <section className="farmer-content-panel"><div className="panel-heading"><div><p className="eyebrow">MÙA VỤ CỦA BẠN</p><h2>Các ô đất đang chăm sóc</h2></div><span className="result-count">{plots.length} ô đất · cập nhật hôm nay</span></div><div className="farmer-plot-list">{plots.map((plot) => <article className="farmer-plot-card" key={plot.id}><div className="farmer-plot-top"><span className="plot-id">{plot.id}</span><span className="plot-stage">{plot.stageLabel}</span></div><h3>{plot.crop}</h3><p className="farmer-customer">Khách hàng: <strong>{plot.customer}</strong></p><div className="plot-meta"><span>{plot.area}</span><span>Ngày thuê: {formatDate(plot.startDate)}</span></div><div className="farmer-progress"><span style={{ width: `${plot.progress}%` }} /></div><small>Thanh toán: {plot.payment === 'da_thanh_toan' ? 'Đã thanh toán' : plot.payment || 'Đang kiểm tra'}</small>{plot.specialRequest && <p className="plot-special-request"><strong>Yêu cầu đặc biệt:</strong> {plot.specialRequest}</p>}{plot.stage === 'cho_gieo_trong' && <button className="primary-button" onClick={() => confirmPlanting(plot)}>Đã nhận giống và tiến hành gieo trồng</button>}<small>Việc tiếp theo: {plot.next}</small></article>)}</div></section>}

      {activeTab === 'journal' && <section className="farmer-content-panel journal-workspace"><div className="panel-heading"><div><p className="eyebrow">CẬP NHẬT CHO KHÁCH HÀNG</p><h2>{editingJournal ? 'Chỉnh sửa nhật ký' : 'Thêm nhật ký canh tác'}</h2></div><span className="result-count">Hàng ngày / hàng tuần</span></div><form className="farmer-form" onSubmit={submitJournal}><label>Ô đất<select value={journalForm.plot} onChange={(event) => setJournalForm({ ...journalForm, plot: event.target.value })}>{plots.map((plot) => <option key={plot.id} value={plot.id}>{plot.id} · {plot.crop}</option>)}</select></label><label>Loại công việc<select value={journalForm.task} onChange={(event) => setJournalForm({ ...journalForm, task: event.target.value })}>{['Tưới nước', 'Bón phân', 'Làm cỏ', 'Phun thuốc hữu cơ', 'Tỉa cành', 'Khác'].map((task) => <option key={task}>{task}</option>)}</select></label><label>Ghi chú tình trạng cây<textarea value={journalForm.note} onChange={(event) => setJournalForm({ ...journalForm, note: event.target.value })} placeholder="Ví dụ: cây đang phát triển tốt, xuất hiện vài lá vàng..." required /></label><div className="farmer-form-row"><label>Lượng nước<input value={journalForm.water} onChange={(event) => setJournalForm({ ...journalForm, water: event.target.value })} /></label><label>Phân bón<input value={journalForm.fertilizer} onChange={(event) => setJournalForm({ ...journalForm, fertilizer: event.target.value })} /></label></div><label className="photo-upload">Ảnh thực tế<input type="file" accept="image/*" capture="environment" onChange={handlePhoto} />{journalForm.photo && <img src={journalForm.photo} alt="Ảnh xem trước nhật ký" />}</label><label>Video thực tế<input type="file" accept="video/*" capture="environment" onChange={handleVideo} /></label><button className="primary-button" type="submit">{editingJournal ? 'Lưu chỉnh sửa' : 'Gửi nhật ký'} <span>→</span></button>{journalMessage && <p className="form-success">{journalMessage}</p>}</form><div className="journal-history"><h3>Lịch sử nhật ký</h3>{journal.length === 0 ? <p className="empty-state">Chưa có cập nhật mới.</p> : journal.map((entry) => <article key={entry.id}><div><strong>{entry.plot}</strong><small>{entry.date} · {entry.task} · {entry.fertilizer}</small><p>{entry.note}</p><button className="table-action" type="button" onClick={() => { setEditingJournal(entry); setJournalForm({ ...journalForm, ...entry }) }}>Chỉnh sửa</button></div>{entry.photo && <img src={entry.photo} alt="Ảnh cây trồng trong nhật ký" />}</article>)}</div></section>}

      {activeTab === 'requests' && <section className="farmer-content-panel"><div className="panel-heading"><div><p className="eyebrow">HỘP THƯ CHĂM SÓC</p><h2>Yêu cầu từ khách hàng</h2></div><span className="result-count">Tiếp nhận · thực hiện · hoàn thành</span></div><div className="request-list">{requests.map((request) => <article className={`care-request ${request.status === 'hoan_thanh' ? 'resolved' : ''}`} key={request.id}><div><div className="request-heading"><strong>{request.plot} · {request.customer}</strong><span>{requestLabels[request.status] || request.status}</span></div><p>{request.text}</p><small>{formatDate(request.time)}</small>{request.reply && <p className="request-reply"><strong>Phản hồi:</strong> {request.reply}</p>}{request.photo && <img className="request-proof" src={request.photo} alt="Ảnh phản hồi yêu cầu" />}</div><div className="request-actions">{request.status === 'cho_tiep_nhan' && <button className="outline-button" onClick={() => updateRequest(request.id, 'da_tiep_nhan')}>Tiếp nhận</button>}{request.status === 'da_tiep_nhan' && <button className="outline-button" onClick={() => updateRequest(request.id, 'dang_thuc_hien')}>Bắt đầu thực hiện</button>}{request.status === 'dang_thuc_hien' && <><input placeholder="Phản hồi cho khách hàng" onChange={(event) => setRequests((items) => items.map((item) => item.id === request.id ? { ...item, reply: event.target.value } : item))} /><input type="file" accept="image/*" onChange={(event) => { const file = event.target.files?.[0]; if (file) setRequests((items) => items.map((item) => item.id === request.id ? { ...item, photo: URL.createObjectURL(file) } : item)) }} /><button className="primary-button" onClick={() => updateRequest(request.id, 'hoan_thanh', request.reply, request.photo)}>Hoàn thành</button></>}</div></article>)}</div></section>}

      {activeTab === 'cameras' && <section className="farmer-content-panel"><div className="panel-heading"><div><p className="eyebrow">THIẾT BỊ ĐƯỢC PHÂN QUYỀN</p><h2>Liên kết camera ô đất</h2></div><span className="result-count">Chỉ dùng link stream được cấp quyền</span></div><div className="camera-settings">{plots.map((plot) => <div className="camera-setting" key={plot.id}><div><strong>{plot.id} · {plot.crop}</strong><small>{plot.camera ? 'Thiết bị đã đăng ký' : 'Chưa có camera'}</small></div><input aria-label={`Liên kết camera ô ${plot.id}`} value={cameraUrls[plot.id] || ''} placeholder="https://camera..." onChange={(event) => setCameraUrls({ ...cameraUrls, [plot.id]: event.target.value })} /><button className="outline-button" onClick={() => saveCamera(plot.id)}>Lưu liên kết</button></div>)}</div>{cameraMessage && <p className="form-success">{cameraMessage}</p>}</section>}

      {activeTab === 'harvest' && <section className="farmer-content-panel"><div className="panel-heading"><div><p className="eyebrow">BÀN GIAO MÙA VỤ</p><h2>Xác nhận thu hoạch</h2></div><span className="result-count">Thông báo cho đóng gói và vận chuyển</span></div><div className="harvest-list">{plots.map((plot) => { const isDone = harvested.includes(plot.id); return <article className={`harvest-item ${isDone ? 'harvest-done' : ''}`} key={plot.id}><div><strong>{plot.id} · {plot.crop}</strong><p>Khách hàng: {plot.customer}</p><small>{isDone ? 'Đã chuyển sang khâu đóng gói, vận chuyển.' : plot.stage === 'san_sang_thu_hoach' ? 'Đã đến kỳ thu hoạch, cần xác nhận.' : `Tiến độ hiện tại ${plot.progress}%.`}</small></div><button className={isDone ? 'harvest-confirmed' : 'primary-button'} disabled={isDone || plot.stage !== 'san_sang_thu_hoach'} onClick={() => confirmHarvest(plot.id)}>{isDone ? 'Đã chuyển giao' : 'Xác nhận thu hoạch'}</button></article>})}</div></section>}
      {activeTab === 'profile' && <ProfilePanel user={user} onSave={saveProfile} />}
    </section>
  </main>
}

export default FarmerPage
