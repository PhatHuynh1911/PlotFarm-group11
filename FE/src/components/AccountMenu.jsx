import { useEffect, useState } from 'react'
import { getNotifications, markAllNotificationsRead, markNotificationRead } from '../api.js'

function AccountMenu({ user, roleLabel, onProfile, onLogout, onNotificationNavigate }) {
  const [open, setOpen] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loadingNotifications, setLoadingNotifications] = useState(false)
  const initials = user.name?.slice(0, 1).toUpperCase() || 'P'

  const loadNotifications = async () => {
    setLoadingNotifications(true)
    try {
      const result = await getNotifications()
      setNotifications(result.data || [])
      setUnreadCount(Number(result.unreadCount || 0))
    } finally {
      setLoadingNotifications(false)
    }
  }

  useEffect(() => {
    loadNotifications().catch(() => {})
    const timer = window.setInterval(() => loadNotifications().catch(() => {}), 30000)
    return () => window.clearInterval(timer)
  }, [])

  const openNotification = (item) => {
    if (!item.da_doc) {
      setNotifications((items) => items.map((current) => current.ma_thong_bao === item.ma_thong_bao ? { ...current, da_doc: true } : current))
      setUnreadCount((count) => Math.max(0, count - 1))
      markNotificationRead(item.ma_thong_bao).catch(() => loadNotifications().catch(() => {}))
    }
    setOpen(false)
    setShowNotifications(false)
    onNotificationNavigate?.(item.lien_ket)
  }

  return <div className="account-menu">
    <button className="account-trigger" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Mở menu tài khoản">
      <span className="account-avatar">{initials}</span>
      {unreadCount > 0 && <span className="account-notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
      <span className="account-trigger-copy">{user.name}<small>{roleLabel}</small></span>
      <span className="account-chevron">⌄</span>
    </button>
    {open && <div className="account-dropdown">
      <div className="account-dropdown-heading"><strong>{user.name}</strong><small>{user.email}</small><small>{user.phone || 'Chưa cập nhật số điện thoại'}</small></div>
      <button onClick={() => { onProfile(); setOpen(false) }}><span>◎</span> Hồ sơ cá nhân</button>
      <button className="account-logout" onClick={onLogout}><span>↪</span> Đăng xuất</button>
      <button onClick={() => setShowNotifications((current) => !current)}><span>●</span> Thông báo{unreadCount ? ` (${unreadCount})` : ''}</button>
      {showNotifications && <div className="notification-list">
        <div className="notification-list-heading">
          <strong>Thông báo</strong>
          {unreadCount > 0 && <button onClick={() => markAllNotificationsRead().then(() => { setNotifications((items) => items.map((item) => ({ ...item, da_doc: true }))); setUnreadCount(0) }).catch(() => {})}>Đọc tất cả</button>}
        </div>
        {loadingNotifications && <p>Đang tải...</p>}
        {!loadingNotifications && notifications.length === 0 && <p>Chưa có thông báo mới.</p>}
        {notifications.slice(0, 6).map((item) => <button className={`notification-item ${item.da_doc ? '' : 'unread'}`} key={item.ma_thong_bao} onClick={() => openNotification(item)}><strong>{item.tieu_de}</strong><small>{item.noi_dung}</small></button>)}
      </div>}
    </div>}
  </div>
}

export default AccountMenu
