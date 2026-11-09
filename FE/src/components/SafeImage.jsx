import { useState } from 'react'
import { PLOT_PLACEHOLDER_IMAGE } from '../api.js'

function ImageContent({ src, alt, fallbackText, ...props }) {
  const [failed, setFailed] = useState(false)
  if ((failed || !src) && fallbackText) return <p className="image-load-error" role="status">{fallbackText}</p>
  return <img {...props} src={failed || !src ? PLOT_PLACEHOLDER_IMAGE : src} alt={alt}
    onError={() => setFailed(true)} />
}

export default function SafeImage(props) {
  return <ImageContent key={props.src} {...props} />
}
