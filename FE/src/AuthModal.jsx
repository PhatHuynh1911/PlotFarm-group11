import { useState } from 'react'

function AuthModal({ mode, onClose, onSwitchMode }) {
  const [showPassword, setShowPassword] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (event) => {
    event.preventDefault()
    setSubmitted(true)
  }

  return (
    <div className="auth-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title">
        <button className="modal-close" aria-label="Đóng" onClick={onClose}>×</button>
        {submitted ? <div className="auth-success"><span>✓</span><h2>{mode === 'login' ? 'Chào mừng bạn trở lại!' : 'Tài khoản đã sẵn sàng!'}</h2><p>{mode === 'login' ? 'Bạn đã đăng nhập thành công vào PlotFarm.' : 'Hãy bắt đầu chọn ô đất cho mùa vụ đầu tiên.'}</p><button className="primary-button" onClick={onClose}>Khám phá PlotFarm <span>→</span></button></div> : <><div className="auth-heading"><p className="eyebrow">PlotFarm · Khu vườn của bạn</p><h2 id="auth-title">{mode === 'login' ? <>Chào bạn,<br /><em>mừng bạn về nhà.</em></> : <>Bắt đầu một<br /><em>mùa xanh mới.</em></>}</h2><p>{mode === 'login' ? 'Đăng nhập để tiếp tục hành trình trồng trọt của bạn.' : 'Tạo tài khoản miễn phí và chọn ô đất đầu tiên.'}</p></div><div className="auth-tabs"><button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => onSwitchMode('login')}>Đăng nhập</button><button type="button" className={mode === 'register' ? 'active' : ''} onClick={() => onSwitchMode('register')}>Đăng ký</button></div><form className="auth-form" onSubmit={handleSubmit}>{mode === 'register' && <label>Họ và tên<input required placeholder="Nguyễn Minh An" /></label>}<label>Email<input required type="email" placeholder="ten@email.com" /></label><label>Mật khẩu<div className="password-field"><input required type={showPassword ? 'text' : 'password'} minLength={mode === 'register' ? 6 : undefined} placeholder={mode === 'register' ? 'Tối thiểu 6 ký tự' : 'Nhập mật khẩu'} /><button type="button" onClick={() => setShowPassword((value) => !value)}>{showPassword ? 'Ẩn' : 'Hiện'}</button></div></label>{mode === 'register' && <label className="checkbox-label"><input type="checkbox" required /> Tôi đồng ý với điều khoản sử dụng của PlotFarm</label>}<button className="primary-button auth-submit" type="submit">{mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'} <span>→</span></button></form><div className="auth-divider"><span>hoặc tiếp tục với</span></div><button className="social-button" type="button"><span className="google-mark">G</span> Google</button></>}
      </section>
    </div>
  )
}

export default AuthModal