import { Component } from 'react'

class RenderBoundary extends Component {
  state = { failed: false, resetKey: this.props.resetKey }

  static getDerivedStateFromProps(props, state) {
    return props.resetKey !== state.resetKey ? { failed: false, resetKey: props.resetKey } : null
  }

  static getDerivedStateFromError() { return { failed: true } }

  componentDidCatch(error, info) { console.error('PlotFarm render error:', error, info) }

  render() {
    if (!this.state.failed) return this.props.children
    return <main className="status-page" role="alert"><section className="status-card">
      <p className="eyebrow">PLOTFARM</p>
      <h1>Không thể hiển thị nội dung</h1>
      <p>Đã có lỗi khi tải dữ liệu. Bạn có thể tải lại trang để thử lại.</p>
      <button className="primary-button" onClick={() => window.location.reload()}>Tải lại trang</button>
      <a className="outline-button" href="/">Về trang chủ</a>
    </section></main>
  }
}

export default function ErrorBoundary({ resetKey, children }) {
  return <RenderBoundary resetKey={resetKey}>{children}</RenderBoundary>
}
