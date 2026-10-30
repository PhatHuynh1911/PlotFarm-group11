import { useState } from 'react'

const roleNames = { khach_hang: 'Khách hàng', nong_dan: 'Nông dân', quan_tri: 'Quản trị viên' }

function ProfilePanel({ user, onSave, onChangePassword }) {
  const [form, setForm] = useState({ name: user.name || '', email: user.email || '', phone: user.phone || '' })
  const [saved, setSaved] = useState(false)
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)
  const initials = form.name.split(' ').map((part) => part[0]).join('').slice(-2).toUpperCase() || 'PF'

  const submit = (event) => {
    event.preventDefault()
    onSave({ ...user, ...form })
    setSaved(true)
    window.setTimeout(() => setSaved(false), 2600)
  }

  const submitPassword = async (event) => {
    event.preventDefault()
    setPasswordError('')
    setPasswordSuccess('')
    if (passwordForm.newPassword.length < 6) return setPasswordError('Mật khẩu mới phải có ít nhất 6 ký tự.')
    if (passwordForm.newPassword !== passwordForm.confirmPassword) return setPasswordError('Xác nhận mật khẩu mới chưa khớp.')
    setChangingPassword(true)
    try {
      await onChangePassword?.({ currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword })
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setPasswordSuccess('Đổi mật khẩu thành công.')
    } catch (error) {
      setPasswordError(error.message || 'Không thể đổi mật khẩu.')
    } finally {
      setChangingPassword(false)
    }
  }

  return <section className="profile-layout">
    <div className="profile-identity">
      <div className="profile-avatar">{initials}</div>
      <p className="eyebrow">HỒ SƠ CÁ NHÂN</p>
      <h2>{form.name}</h2>
      <p>{roleNames[user.role] || 'Thành viên PlotFarm'}</p>
      <span className="profile-status"><i /> Tài khoản đang hoạt động</span>
    </div>
    <div className="profile-form-panel">
      <div className="panel-heading"><div><p className="eyebrow">THÔNG TIN TÀI KHOẢN</p><h2>Thông tin của bạn</h2></div><span className="result-count">ID #{user.id}</span></div>
      <form className="profile-form" onSubmit={submit}>
        <label>Họ và tên<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label>
        <div className="profile-form-row"><label>Email<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /></label><label>Số điện thoại<input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="Chưa cập nhật" /></label></div>
        <label>Vai trò<input value={roleNames[user.role] || user.role} disabled /></label>
        <div className="profile-form-actions"><button className="primary-button" type="submit">Lưu thay đổi <span>→</span></button>{saved && <p className="form-success">Đã cập nhật hồ sơ.</p>}</div>
      </form>
      {onChangePassword && <form className="profile-form profile-password-form" onSubmit={submitPassword}>
        <div className="panel-heading"><div><p className="eyebrow">BẢO MẬT</p><h2>Đổi mật khẩu</h2></div></div>
        <label>Mật khẩu hiện tại<input type="password" autoComplete="current-password" value={passwordForm.currentPassword} onChange={(event) => setPasswordForm({ ...passwordForm, currentPassword: event.target.value })} required /></label>
        <div className="profile-form-row"><label>Mật khẩu mới<input type="password" autoComplete="new-password" value={passwordForm.newPassword} onChange={(event) => setPasswordForm({ ...passwordForm, newPassword: event.target.value })} required /></label><label>Xác nhận mật khẩu mới<input type="password" autoComplete="new-password" value={passwordForm.confirmPassword} onChange={(event) => setPasswordForm({ ...passwordForm, confirmPassword: event.target.value })} required /></label></div>
        <div className="profile-form-actions"><button className="outline-button" type="submit" disabled={changingPassword}>{changingPassword ? 'Đang cập nhật...' : 'Đổi mật khẩu'}</button>{passwordSuccess && <p className="form-success">{passwordSuccess}</p>}{passwordError && <p className="form-error" role="alert">{passwordError}</p>}</div>
      </form>}
    </div>
  </section>
}

export default ProfilePanel
