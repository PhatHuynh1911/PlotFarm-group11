import { useEffect, useState } from 'react'
import { notify } from './ToastProvider.jsx'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

function AuthModal({ mode, onClose, onSwitchMode, onAuthenticated }) {
  const [view, setView] = useState(mode)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [demoCode, setDemoCode] = useState('')

  useEffect(() => { setView(mode); setError(''); setDemoCode('') }, [mode])

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)
    const form = new FormData(event.currentTarget)
    const payload = view === 'login'
      ? { email: form.get('email'), password: form.get('password') }
      : view === 'register'
        ? { name: form.get('name'), email: form.get('email'), password: form.get('password'), role: form.get('role') }
        : view === 'forgot'
          ? { email: form.get('email') }
          : { email: resetEmail, code: form.get('code'), newPassword: form.get('newPassword') }
    const endpoint = view === 'forgot' ? 'forgot-password' : view === 'reset' ? 'reset-password' : view

    try {
      const response = await fetch(`${API_URL}/auth/${endpoint}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message || 'Không thể xử lý yêu cầu')
      if (view === 'forgot') {
        setResetEmail(String(payload.email).trim().toLowerCase())
        setDemoCode(result.data?.demoCode || '')
        setView('reset')
        notify('Mã xác nhận đã được tạo. Hãy nhập mã để đặt lại mật khẩu.', 'success')
      } else if (view === 'reset') {
        notify('Đặt lại mật khẩu thành công. Hãy đăng nhập lại.', 'success')
        onSwitchMode('login')
      } else {
        notify(view === 'login' ? 'Đăng nhập thành công. Đang mở không gian làm việc của bạn.' : 'Tạo tài khoản thành công.', 'success')
        onAuthenticated(result.data)
      }
    } catch (requestError) {
      setError(requestError.message)
      notify(requestError.message, 'error')
    } finally { setLoading(false) }
  }

  const isAuthView = view === 'login' || view === 'register'
  const title = view === 'forgot' ? <>Quên mật khẩu?</> : view === 'reset' ? <>Đặt lại<br /><em>mật khẩu mới.</em></> : view === 'login' ? <>Chào bạn,<br /><em>mừng bạn về nhà.</em></> : <>Bắt đầu một<br /><em>mùa xanh mới.</em></>

  return <div className="auth-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <section className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title">
      <button className="modal-close" aria-label="Đóng" onClick={onClose}>×</button>
      <div className="auth-heading"><p className="eyebrow">PlotFarm · Khu vườn của bạn</p><h2 id="auth-title">{title}</h2><p>{view === 'forgot' ? 'Nhập email để nhận mã xác nhận đặt lại mật khẩu.' : view === 'reset' ? `Mã có hiệu lực trong 10 phút cho ${resetEmail}.` : view === 'login' ? 'Đăng nhập để tiếp tục hành trình trồng trọt của bạn.' : 'Tạo tài khoản miễn phí và chọn ô đất đầu tiên.'}</p></div>
      {isAuthView && <div className="auth-tabs"><button type="button" className={view === 'login' ? 'active' : ''} onClick={() => { setError(''); setView('login'); onSwitchMode('login') }}>Đăng nhập</button><button type="button" className={view === 'register' ? 'active' : ''} onClick={() => { setError(''); setView('register'); onSwitchMode('register') }}>Đăng ký</button></div>}
      <form className="auth-form" onSubmit={submit}>
        {view === 'register' && <label>Họ và tên<input name="name" required placeholder="Nguyễn Minh An" /></label>}
        {view === 'register' && <label>Vai trò<select name="role" defaultValue="khach_hang" required><option value="khach_hang">Khách hàng</option><option value="nong_dan">Nông dân</option></select></label>}
        {view !== 'reset' && <label>Email<input name="email" required type="email" placeholder="ten@email.com" defaultValue={resetEmail} /></label>}
        {(view === 'login' || view === 'register') && <label>Mật khẩu<div className="password-field"><input name="password" required type={showPassword ? 'text' : 'password'} minLength={view === 'register' ? 6 : undefined} placeholder={view === 'register' ? 'Tối thiểu 6 ký tự' : 'Nhập mật khẩu'} /><button type="button" onClick={() => setShowPassword(!showPassword)}>{showPassword ? 'Ẩn' : 'Hiện'}</button></div></label>}
        {view === 'login' && <button className="forgot-password-link" type="button" onClick={() => { setError(''); setView('forgot') }}>Quên mật khẩu?</button>}
        {view === 'register' && <label className="checkbox-label"><input type="checkbox" required /> Tôi đồng ý với điều khoản sử dụng của PlotFarm</label>}
        {view === 'reset' && <label>Mã xác nhận<input name="code" required inputMode="numeric" pattern="[0-9]{6}" maxLength="6" placeholder="Nhập mã gồm 6 số" defaultValue={demoCode} /></label>}
        {view === 'reset' && <label>Mật khẩu mới<div className="password-field"><input name="newPassword" required minLength="6" type={showPassword ? 'text' : 'password'} placeholder="Tối thiểu 6 ký tự" /><button type="button" onClick={() => setShowPassword(!showPassword)}>{showPassword ? 'Ẩn' : 'Hiện'}</button></div></label>}
        {demoCode && view === 'reset' && <p className="auth-demo-code">Môi trường demo · Mã xác nhận: <strong>{demoCode}</strong></p>}
        {error && <p className="auth-error" role="alert">{error}</p>}
        <button className="primary-button auth-submit" disabled={loading}>{loading ? 'Đang xử lý...' : view === 'forgot' ? 'Gửi mã xác nhận' : view === 'reset' ? 'Đặt lại mật khẩu' : view === 'login' ? 'Đăng nhập vào PlotFarm' : 'Tạo tài khoản'} <span>→</span></button>
        {(view === 'forgot' || view === 'reset') && <button type="button" className="forgot-password-link" onClick={() => { setError(''); setView('login'); onSwitchMode('login') }}>← Quay lại đăng nhập</button>}
      </form>
    </section>
  </div>
}

export default AuthModal
