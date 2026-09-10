import { useState } from 'react'

function AccountMenu({ user, roleLabel, onProfile, onLogout }) {
  const [open, setOpen] = useState(false)
  const initials = user.name?.slice(0, 1).toUpperCase() || 'P'

  return <div className="account-menu">
    <button className="account-trigger" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Mở menu tài khoản">
      <span className="account-avatar">{initials}</span>
      <span className="account-trigger-copy">{user.name}<small>{roleLabel}</small></span>
      <span className="account-chevron">⌄</span>
    </button>
    {open && <div className="account-dropdown">
      <div className="account-dropdown-heading"><strong>{user.name}</strong><small>{user.email}</small><small>{user.phone || 'Chưa cập nhật số điện thoại'}</small></div>
      <button onClick={() => { onProfile(); setOpen(false) }}><span>◎</span> Hồ sơ cá nhân</button>
      <button className="account-logout" onClick={onLogout}><span>↪</span> Đăng xuất</button>
    </div>}
  </div>
}

export default AccountMenu
