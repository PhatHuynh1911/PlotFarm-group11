import { useState } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

function AuthModal({ mode, onClose, onSwitchMode, onAuthenticated }) {
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)
    const form = new FormData(event.currentTarget)
    const payload = mode === 'login'
      ? { email: form.get('email'), password: form.get('password') }
      : { name: form.get('name'), email: form.get('email'), password: form.get('password'), role: form.get('role') }

    try {
      const response = await fetch(`${API_URL}/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message || 'Không thể xác thực tài khoản')
      onAuthenticated(result.data)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }

  return <div className="auth-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <section className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title">
      <button className="modal-close" aria-label="Đóng" onClick={onClose}>×</button>
      <div className="auth-heading"><p className="eyebrow">PlotFarm · Khu vườn của bạn</p><h2 id="auth-title">{mode === 'login' ? <>Chào bạn,<br /><em>mừng bạn về nhà.</em></> : <>Bắt đầu một<br /><em>mùa xanh mới.</em></>}</h2><p>{mode === 'login' ? 'Đăng nhập để tiếp tục hành trình trồng trọt của bạn.' : 'Tạo tài khoản miễn phí và chọn ô đất đầu tiên.'}</p></div>
      <div className="auth-tabs"><button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => { setError(''); onSwitchMode('login') }}>Đăng nhập</button><button type="button" className={mode === 'register' ? 'active' : ''} onClick={() => { setError(''); onSwitchMode('register') }}>Đăng ký</button></div>
      <form className="auth-form" onSubmit={submit}>
        {mode === 'register' && <label>Họ và tên<input name="name" required placeholder="Nguyễn Minh An" /></label>}
        {mode === 'register' && <label>Vai trò<select name="role" defaultValue="khach_hang" required><option value="khach_hang">Khách hàng</option><option value="nong_dan">Nông dân</option></select></label>}
        <label>Email<input name="email" required type="email" placeholder="ten@email.com" /></label>
        <label>Mật khẩu<div className="password-field"><input name="password" required type={showPassword ? 'text' : 'password'} minLength={mode === 'register' ? 6 : undefined} placeholder={mode === 'register' ? 'Tối thiểu 6 ký tự' : 'Nhập mật khẩu'} /><button type="button" onClick={() => setShowPassword(!showPassword)}>{showPassword ? 'Ẩn' : 'Hiện'}</button></div></label>
        {mode === 'register' && <label className="checkbox-label"><input type="checkbox" required /> Tôi đồng ý với điều khoản sử dụng của PlotFarm</label>}
        {error && <p className="auth-error" role="alert">{error}</p>}
        <button className="primary-button auth-submit" disabled={loading}>{loading ? 'Đang xử lý...' : mode === 'login' ? 'Đăng nhập vào PlotFarm' : 'Tạo tài khoản'} <span>→</span></button>
      </form>
    </section>
  </div>
}

export default AuthModal
