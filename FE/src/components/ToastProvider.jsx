import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const ToastContext = createContext({ showToast: () => {} })

export const notify = (message, type = 'success') => {
  window.dispatchEvent(new CustomEvent('plotfarm-toast', { detail: { message, type } }))
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const showToast = (message, type = 'success') => {
    const id = Date.now() + Math.random()
    setToasts((items) => [...items, { id, message, type }])
    window.setTimeout(() => setToasts((items) => items.filter((item) => item.id !== id)), 3600)
  }

  useEffect(() => {
    const onToast = (event) => showToast(event.detail?.message, event.detail?.type)
    window.addEventListener('plotfarm-toast', onToast)
    return () => window.removeEventListener('plotfarm-toast', onToast)
  }, [])

  const value = useMemo(() => ({ showToast }), [])
  return <ToastContext.Provider value={value}>{children}<div className="toast-stack" aria-live="polite">{toasts.map((toast) => <div className={`toast toast-${toast.type}`} key={toast.id}><span>{toast.type === 'error' ? '!' : '✓'}</span>{toast.message}</div>)}</div></ToastContext.Provider>
}

export const useToast = () => useContext(ToastContext)
