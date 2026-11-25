import { useEffect, useState } from 'react'

function CameraAttempt({ src, timeoutMs, retry }) {
  const [phase, setPhase] = useState('loading')
  useEffect(() => {
    if (phase !== 'loading') return
    const timer = setTimeout(() => setPhase('timeout'), timeoutMs)
    return () => clearTimeout(timer)
  }, [phase, timeoutMs])
  const failed = phase === 'error' || phase === 'timeout'
  return <div className="camera-preview">
    {failed ? <p role="alert">{phase === 'timeout'
      ? 'Camera phản hồi quá lâu. Vui lòng kiểm tra kết nối hoặc thử lại.'
      : 'Không thể tải camera. Liên kết có thể đã hết hạn, camera mất kết nối hoặc định dạng video chưa được hỗ trợ.'}</p>
      : <>
        <p role="status">{phase === 'loading' ? 'Đang kết nối camera…' : 'Đã tải được dữ liệu video. Bấm phát để xem.'}</p>
        <video src={src} controls playsInline preload="auto" aria-label="Xem trước camera"
          onLoadedData={() => setPhase('ready')} onPlaying={() => setPhase('ready')}
          onWaiting={() => setPhase('loading')} onStalled={() => setPhase('loading')}
          onError={() => setPhase('error')} />
      </>}
    {failed && <button type="button" className="outline-button" onClick={retry}>Thử kết nối lại</button>}
    {failed && <p className="camera-help">Bạn có thể sửa liên kết phía trên rồi bấm “Kiểm tra liên kết”. Nếu lỗi tiếp diễn, liên hệ người quản lý camera.</p>}
  </div>
}

export default function CameraPreview({ url, timeoutMs = 15000 }) {
  const [online, setOnline] = useState(() => navigator.onLine !== false)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const connected = () => setOnline(true)
    const disconnected = () => setOnline(false)
    window.addEventListener('online', connected)
    window.addEventListener('offline', disconnected)
    return () => {
      window.removeEventListener('online', connected)
      window.removeEventListener('offline', disconnected)
    }
  }, [])
  let parsed
  try {
    parsed = new URL((url || '').trim())
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) throw new Error('invalid')
  } catch {
    return <p className="camera-preview" role="alert">Vui lòng nhập liên kết camera HTTP hoặc HTTPS hợp lệ, không chứa tên đăng nhập hay mật khẩu.</p>
  }
  if (window.location.protocol === 'https:' && parsed.protocol === 'http:') {
    return <p className="camera-preview" role="alert">Trang đang dùng HTTPS. Vui lòng dùng liên kết camera HTTPS để trình duyệt không chặn kết nối.</p>
  }
  const src = parsed.href
  if (!online) return <p className="camera-preview" role="alert">Thiết bị đang mất mạng. Camera sẽ thử kết nối lại khi có mạng.</p>
  return <CameraAttempt key={`${src}:${attempt}`} src={src} timeoutMs={timeoutMs} retry={() => setAttempt((value) => value + 1)} />
}
