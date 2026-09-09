import { useEffect, useState } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

function AdminPage({ user, onLogout }) {
  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`${API_URL}/admin/dashboard`).then(async (response) => {
      const result = await response.json()
      if (!response.ok) throw new Error(result.message)
      setStats(result.data)
    }).catch((requestError) => setError(requestError.message))
  }, [])

  return <main className="dashboard-page"><header className="dashboard-header"><a className="brand" href="/"><span className="brand-mark">PF</span><span>plot<span>farm</span></span></a><div className="dashboard-account"><span>{user.name}<small>Quản trị viên</small></span><button className="dashboard-logout" onClick={onLogout}>Đăng xuất</button></div></header><section className="dashboard-shell"><p className="eyebrow">BẢNG ĐIỀU KHIỂN QUẢN TRỊ</p><h1>Vận hành <em>PlotFarm.</em></h1><p className="dashboard-lead">Theo dõi nhanh hoạt động của khu vườn và những người đang đồng hành cùng mùa vụ.</p>{error ? <p className="dashboard-error">{error}</p> : <div className="dashboard-stat-grid">{[['totalUsers', 'Người dùng', 'Tài khoản đang hoạt động'], ['availablePlots', 'Ô đất trống', 'Sẵn sàng cho thuê'], ['rentedPlots', 'Ô đất đã thuê', 'Đang có mùa vụ'], ['activeContracts', 'Hợp đồng hiệu lực', 'Cần theo dõi']].map(([key, label, note]) => <article className="dashboard-stat" key={key}><span>{label}</span><strong>{stats?.[key] ?? '...'}</strong><small>{note}</small></article>)}</div>}<div className="dashboard-panel"><div><p className="eyebrow">TRẠNG THÁI HỆ THỐNG</p><h2>Mọi khu vườn đang được chăm sóc.</h2></div><span className="system-status"><i /> API và cơ sở dữ liệu đang sẵn sàng</span></div></section></main>
}

export default AdminPage
