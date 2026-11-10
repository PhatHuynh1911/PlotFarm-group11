import { useEffect, useRef, useState } from 'react'
import { resolveImageUrl, uploadSupportImage } from '../api.js'
import SafeImage from './SafeImage.jsx'
import ImageLightbox from './ImageLightbox.jsx'

export function RequestImages({ images }) {
  const [preview, setPreview] = useState('')
  let list = images
  if (typeof list === 'string') {
    try { list = JSON.parse(list) } catch { list = [] }
  }
  if (!Array.isArray(list) || !list.length) return null
  return <div className="request-images">
    {list.filter((src) => typeof src === 'string').map((src, index) => <button type="button" key={src}
      className="request-image-button" aria-label={`Xem ảnh đính kèm ${index + 1}`} onClick={() => setPreview(resolveImageUrl(src))}>
      <SafeImage src={resolveImageUrl(src)} alt={`Ảnh đính kèm ${index + 1}`} />
    </button>)}
    {preview && <ImageLightbox src={preview} alt="Ảnh đính kèm yêu cầu" onClose={() => setPreview('')} />}
  </div>
}

export function RequestImagePicker({ value, onChange, onBusyChange, token, disabled = false, label = 'Ảnh đính kèm' }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false; onBusyChange(false) }
  }, [onBusyChange])
  const choose = async (event) => {
    const files = Array.from(event.target.files || [])
    event.target.value = ''
    setError('')
    if (files.length + value.length > 3) return setError('Mỗi yêu cầu được đính kèm tối đa 3 ảnh.')
    if (files.some((file) => !['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type))) return setError('Chỉ chấp nhận ảnh JPG, PNG, WEBP hoặc GIF.')
    if (files.some((file) => file.size > 5 * 1024 * 1024)) return setError('Mỗi ảnh không được vượt quá 5 MB.')
    if (!files.length) return
    setBusy(true)
    onBusyChange(true)
    const next = [...value]
    try {
      for (const file of files) {
        next.push(await uploadSupportImage(file, token))
        if (mounted.current) onChange([...next])
      }
    } catch (uploadError) {
      if (mounted.current) setError(uploadError.message)
    } finally {
      if (mounted.current) { setBusy(false); onBusyChange(false) }
    }
  }
  return <div className="request-image-picker">
    <label>{label} <small>(không bắt buộc, tối đa 3 ảnh · 5 MB/ảnh)</small>
      <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple onChange={choose} disabled={disabled || busy || value.length >= 3} />
    </label>
    {busy && <p role="status">Đang tải ảnh lên...</p>}
    {error && <p className="form-error" role="alert">{error}</p>}
    <RequestImages images={value} />
    {value.map((src, index) => <button type="button" className="text-button" key={src} disabled={disabled || busy}
      onClick={() => onChange(value.filter((image) => image !== src))}>Bỏ ảnh {index + 1}</button>)}
  </div>
}
