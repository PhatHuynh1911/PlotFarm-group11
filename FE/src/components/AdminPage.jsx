import { useCallback, useEffect, useState } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const tabs = [['overview', 'Tổng quan'], ['users', 'Người dùng'], ['plots', 'Ô đất'], ['rentals', 'Đơn thuê & giao dịch'], ['requests', 'Yêu cầu & khiếu nại']]
const labels = {
  role: { khach_hang: 'Khách hàng', nong_dan: 'Nông dân', quan_tri: 'Admin' },
  userStatus: { hoat_dong: 'Hoạt động', bi_khoa: 'Bị khóa' },
  plotStatus: { trong: 'Trống', dang_chon: 'Đang chọn', da_thue: 'Đã thuê', bao_tri: 'Bảo trì' },
  requestStatus: { cho_tiep_nhan: 'Chờ tiếp nhận', da_tiep_nhan: 'Đã tiếp nhận', dang_thuc_hien: 'Đang thực hiện', hoan_thanh: 'Hoàn thành', tu_choi: 'Từ chối' },
}
const money = (value) => `${Number(value || 0).toLocaleString('vi-VN')} đ`
const date = (value) => value ? new Date(value).toLocaleDateString('vi-VN') : '—'

function AdminPage({ user, token, onLogout }) {
  const [activeTab, setActiveTab] = useState('overview')
  const [data, setData] = useState({ stats: null, users: [], plots: [], rentals: [], requests: [] })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState('')
  const [editingPlot, setEditingPlot] = useState(null)

  const load = useCallback(async () => {
    try {
      const endpoints = ['dashboard', 'users', 'plots', 'rentals', 'requests']
      const responses = await Promise.all(endpoints.map((endpoint) => fetch(`${API_URL}/admin/${endpoint}`, { headers: { Authorization: `Bearer ${token}` } })))
      const results = await Promise.all(responses.map(async (response) => {
        const result = await response.json()
        if (!response.ok) throw new Error(result.message || 'Không thể tải dữ liệu quản trị')
        return result.data
      }))
      setData({ stats: results[0], users: results[1], plots: results[2], rentals: results[3], requests: results[4] })
      setError('')
    } catch (requestError) { setError(requestError.message) } finally { setLoading(false) }
  }, [token])
  useEffect(() => { load() }, [load])

  const update = async (path, method, body) => {
    const response = await fetch(`${API_URL}/admin/${path}`, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) })
    const result = await response.json()
    if (!response.ok) throw new Error(result.message || 'Thao tác thất bại')
    setNotice(result.message)
    await load()
  }
  const updateUser = (item, field, value) => update(`users/${item.id}`, 'PATCH', { role: field === 'role' ? value : item.role, status: field === 'status' ? value : item.status }).catch((e) => setError(e.message))
  const updateRequest = (item, value) => update(`requests/${item.id}`, 'PATCH', { status: value }).catch((e) => setError(e.message))
  const savePlot = async (event) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const plot = Object.fromEntries(form.entries())
    try {
      await update(editingPlot ? `plots/${editingPlot.id}` : 'plots', editingPlot ? 'PATCH' : 'POST', { ...plot, farmId: Number(plot.farmId), area: Number(plot.area), price: Number(plot.price) })
      setEditingPlot(null)
      event.currentTarget.reset()
    } catch (e) { setError(e.message) }
  }

  const stats = data.stats || {}
  return <main className="dashboard-page admin-workspace">
    <header className="dashboard-header"><a className="brand" href="/"><span className="brand-mark">PF</span><span>plot<span>farm</span></span></a><nav className="workspace-nav" aria-label="Điều hướng quản trị">{tabs.map(([id, label]) => <button className={activeTab === id ? 'active' : ''} key={id} onClick={() => setActiveTab(id)}>{label}</button>)}</nav><div className="dashboard-account"><span>{user.name}<small>Quản trị viên</small></span><button className="dashboard-logout" onClick={onLogout}>Đăng xuất</button></div></header>
    <section className="dashboard-shell">
      <div className="admin-heading"><div><p className="eyebrow">TRUNG TÂM VẬN HÀNH</p><h1>Quản trị <em>PlotFarm.</em></h1><p className="dashboard-lead">Theo dõi tài khoản, mùa vụ và chất lượng phục vụ từ một nơi.</p></div><span className="system-status admin-system"><i /> Hệ thống đang hoạt động</span></div>
      <nav className="admin-tabs" aria-label="Các chức năng quản trị">{tabs.map(([id, label]) => <button className={activeTab === id ? 'active' : ''} key={id} onClick={() => setActiveTab(id)}>{label}</button>)}</nav>
      {loading && <p className="loading-state" role="status">Đang tải dữ liệu quản trị...</p>}{error && <p className="dashboard-error admin-message" role="alert">{error}</p>}{notice && <p className="admin-success">{notice}</p>}
      {activeTab === 'overview' && <Overview stats={stats} />}
      {activeTab === 'users' && <Users items={data.users} onUpdate={updateUser} />}
      {activeTab === 'plots' && <Plots items={data.plots} editingPlot={editingPlot} setEditingPlot={setEditingPlot} onSubmit={savePlot} onCancel={() => setEditingPlot(null)} />}
      {activeTab === 'rentals' && <Rentals items={data.rentals} />}
      {activeTab === 'requests' && <Requests items={data.requests} onUpdate={updateRequest} />}
    </section>
  </main>
}

function Overview({ stats }) {
  const cards = [['totalUsers', 'Tổng người dùng', 'Tài khoản trên hệ thống'], ['activeUsers', 'Đang hoạt động', 'Người dùng có thể truy cập'], ['rentedPlots', 'Ô đất đã thuê', `${stats.availablePlots || 0} ô đang trống`], ['revenue', 'Doanh thu đã thu', 'Tổng hợp đồng đã thanh toán']]
  const max = Math.max(...(stats.monthly || []).map((item) => Number(item.revenue)), 1)
  return <><div className="dashboard-stat-grid">{cards.map(([key, label, note]) => <article className="dashboard-stat" key={key}><span>{label}</span><strong>{key === 'revenue' ? money(stats[key]) : stats[key] ?? '—'}</strong><small>{note}</small></article>)}</div><div className="admin-overview-grid"><section className="admin-card"><div className="panel-heading"><div><p className="eyebrow">BÁO CÁO TÀI CHÍNH</p><h2>Doanh thu theo tháng</h2></div><span className="result-count">6 kỳ gần nhất</span></div><div className="revenue-chart">{(stats.monthly || []).map((item) => <div className="revenue-column" key={item.month}><span>{money(item.revenue)}</span><i style={{ height: `${Math.max(Number(item.revenue) / max * 150, 8)}px` }} /><small>{item.month}</small></div>)}</div></section><section className="admin-card admin-health"><p className="eyebrow">CẦN XỬ LÝ</p><h2>Nhịp vận hành hôm nay</h2><div><b>{stats.pendingRequests || 0}</b><span>yêu cầu chăm sóc đang chờ</span></div><div><b>{stats.activeContracts || 0}</b><span>hợp đồng đang hiệu lực</span></div></section></div></>
}

function Users({ items, onUpdate }) { return <section className="admin-card"><div className="panel-heading"><div><p className="eyebrow">TÀI KHOẢN & PHÂN QUYỀN</p><h2>Quản lý người dùng</h2></div><span className="result-count">{items.length} tài khoản</span></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Người dùng</th><th>Vai trò</th><th>Ngày tham gia</th><th>Trạng thái</th><th /></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td><strong>{item.name}</strong><small>{item.email}</small></td><td><select value={item.role} onChange={(e) => onUpdate(item, 'role', e.target.value)}>{Object.entries(labels.role).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></td><td>{date(item.createdAt)}</td><td><span className={`status-pill ${item.status === 'hoat_dong' ? 'is-good' : 'is-blocked'}`}>{labels.userStatus[item.status]}</span></td><td><button className="table-action" onClick={() => onUpdate(item, 'status', item.status === 'hoat_dong' ? 'bi_khoa' : 'hoat_dong')}>{item.status === 'hoat_dong' ? 'Khóa' : 'Mở khóa'}</button></td></tr>)}</tbody></table></div></section> }

function Plots({ items, editingPlot, setEditingPlot, onSubmit, onCancel }) { return <div className="admin-two-column"><section className="admin-card"><div className="panel-heading"><div><p className="eyebrow">TÀI SẢN & VỊ TRÍ</p><h2>Danh sách ô đất</h2></div><span className="result-count">{items.length} ô đất</span></div><div className="admin-plot-list">{items.map((item) => <article className="admin-plot-row" key={item.id}><div><strong>{item.code}</strong><span>{item.name}</span><small>{item.area} m² · {money(item.price)}/tháng</small></div><span className="status-pill">{labels.plotStatus[item.status] || item.status}</span><button className="table-action" onClick={() => setEditingPlot(item)}>Sửa</button></article>)}</div></section><section className="admin-card"><p className="eyebrow">{editingPlot ? 'CHỈNH SỬA' : 'TẠO MỚI'}</p><h2>{editingPlot ? 'Cập nhật ô đất' : 'Thêm ô đất'}</h2><form className="admin-form" onSubmit={onSubmit} key={editingPlot?.id || 'new'}><label>Mã ô đất<input name="code" defaultValue={editingPlot?.code || ''} required /></label><label>Tên ô đất<input name="name" defaultValue={editingPlot?.name || ''} required /></label><label>Mã nông trại<input name="farmId" type="number" defaultValue={editingPlot?.farmId || 1} required /></label><div className="form-row"><label>Diện tích (m²)<input name="area" type="number" step=".01" defaultValue={editingPlot?.area || ''} required /></label><label>Giá thuê/tháng<input name="price" type="number" defaultValue={editingPlot?.price || ''} required /></label></div><label>Trạng thái<select name="status" defaultValue={editingPlot?.status || 'trong'}>{Object.entries(labels.plotStatus).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Mô tả<textarea name="description" defaultValue={editingPlot?.description || ''} /></label><div className="form-actions"><button className="primary-button" type="submit">{editingPlot ? 'Lưu thay đổi' : 'Thêm ô đất'}</button>{editingPlot && <button className="text-button" type="button" onClick={onCancel}>Hủy</button>}</div></form></section></div> }

function Rentals({ items }) { return <section className="admin-card"><div className="panel-heading"><div><p className="eyebrow">HỢP ĐỒNG & THANH TOÁN</p><h2>Đơn thuê đất & giao dịch</h2></div><span className="result-count">{items.length} hợp đồng</span></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Hợp đồng</th><th>Khách hàng</th><th>Ô đất</th><th>Giá trị</th><th>Thanh toán</th><th>Ngày tạo</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td><strong>{item.code}</strong><small>{item.status}</small></td><td>{item.customer}</td><td>{item.plot}</td><td><strong>{money(item.total)}</strong></td><td><span className={`status-pill ${item.paymentStatus === 'da_thanh_toan' ? 'is-good' : 'is-pending'}`}>{item.paymentStatus === 'da_thanh_toan' ? 'Đã thanh toán' : item.paymentStatus}</span></td><td>{date(item.createdAt)}</td></tr>)}</tbody></table></div></section> }

function Requests({ items, onUpdate }) { return <section className="admin-card"><div className="panel-heading"><div><p className="eyebrow">CHẤT LƯỢNG DỊCH VỤ</p><h2>Yêu cầu chăm sóc & khiếu nại</h2></div><span className="result-count">{items.length} yêu cầu</span></div><div className="admin-request-list">{items.map((item) => <article key={item.id}><div><strong>{item.service || 'Yêu cầu chăm sóc'} · {item.plot}</strong><span>{item.customer} · lịch {date(item.scheduledAt)}</span><p>{item.note || 'Không có ghi chú'}</p></div><select value={item.status} onChange={(e) => onUpdate(item, e.target.value)}>{Object.entries(labels.requestStatus).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></article>)}</div></section> }

export default AdminPage
