import { useState } from 'react'
import { submitContact } from '../api.js'
import { notify } from './ToastProvider.jsx'

const normalizePhone = (value) => value.replace(/[.\s()-]/g, '')
const validVietnamPhone = (value) => /^(?:\+84|0)(?:3|5|7|8|9)\d{8}$/.test(normalizePhone(value))

function ContactSection() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const submit = async (event) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const name = String(form.get('name') || '').trim()
    const phone = String(form.get('phone') || '').trim()
    if (!name || !phone) return setError('Vui lòng nhập họ tên và số điện thoại.')
    if (!validVietnamPhone(phone)) return setError('Số điện thoại chưa hợp lệ. Vui lòng dùng số di động Việt Nam.')
    setLoading(true)
    setError('')
    try {
      await submitContact({ ho_va_ten: name, so_dien_thoai: normalizePhone(phone) })
      event.currentTarget.reset()
      notify('Đăng ký thành công! Đội ngũ sẽ gọi lại trong 24h.')
    } catch (requestError) {
      setError(requestError.message)
      notify(requestError.message, 'error')
    } finally { setLoading(false) }
  }
  return <section className="contact-section" id="contact"><div className="contact-inner"><div><p className="eyebrow light">Sẵn sàng bắt đầu?</p><h2>Để PlotFarm<br /><em>giữ chỗ cho bạn.</em></h2><p className="contact-subtitle">Để lại thông tin, đội ngũ của chúng mình sẽ gọi lại trong vòng 24 giờ.</p></div><form className="contact-form" onSubmit={submit} noValidate><label>Họ và tên<input name="name" required placeholder="Nguyễn Minh An" onChange={() => error && setError('')} /></label><label>Số điện thoại<input name="phone" required type="tel" inputMode="tel" placeholder="09xx xxx xxx" onChange={() => error && setError('')} /></label>{error && <p className="dashboard-error" role="alert">{error}</p>}<button className="primary-button light-button" disabled={loading} type="submit">{loading ? 'Đang gửi...' : 'Nhận tư vấn miễn phí'} <span>→</span></button></form></div></section>
}
export default ContactSection
