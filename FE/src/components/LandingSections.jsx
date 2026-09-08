function LandingSections({ onNavigate }) {
  return <>
    <section className="hero" id="top">
      <div className="hero-copy">
        <p className="eyebrow"><span className="eyebrow-dot" /> NÔNG NGHIỆP GẦN HƠN BẠN NGHĨ</p>
        <h1>Không gian xanh<br /><em>cho cuộc sống lành.</em></h1>
        <p className="hero-description">Tìm, thuê và chăm sóc một ô đất riêng theo cách đơn giản, minh bạch và gần gũi hơn mỗi ngày.</p>
        <div className="hero-search"><input placeholder="Tìm theo khu vực hoặc loại cây" /><button onClick={() => onNavigate('plots')} aria-label="Tìm kiếm">⌕</button></div>
        <div className="hero-actions"><button className="primary-button" onClick={() => onNavigate('plots')}>Khám phá ô đất <span>→</span></button><button className="text-button" onClick={() => onNavigate('how-it-works')}>Xem cách hoạt động <span>↓</span></button></div>
      </div>
      <div className="hero-visual"><img src="https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&w=1100&q=85" alt="Người làm vườn chăm sóc luống rau xanh" /><div className="visual-tag tag-location"><span className="pin">⌖</span><div><strong>Vườn Phúc Lộc</strong><small>Đà Nẵng · 2.4 ha</small></div></div><div className="visual-tag tag-weather"><span>☀</span><div><strong>28°C</strong><small>Điều kiện lý tưởng</small></div></div></div>
    </section>
    <section className="stats-bar"><div><strong>250+</strong><span>người đang trồng</span></div><div><strong>24</strong><span>ô đất đang sẵn sàng</span></div><div><strong>2.4 ha</strong><span>không gian xanh</span></div></section>
    <section className="start-section section-shell" id="how-it-works"><div className="section-heading-centered"><p className="eyebrow">NƠI BẮT ĐẦU</p><h2>Bạn muốn bắt đầu<br /><em>từ đâu hôm nay?</em></h2></div><div className="start-grid"><article><div className="round-icon">♙</div><h3>Tôi muốn thuê ô đất</h3><p>Chọn một không gian phù hợp và bắt đầu mùa vụ của riêng bạn.</p><button className="outline-button" onClick={() => onNavigate('plots')}>Xem ô đất trống <span>→</span></button></article><article><div className="round-icon">⌕</div><h3>Tôi đang tìm vườn</h3><p>Khám phá những khu vườn được chuẩn bị sẵn cho người mới bắt đầu.</p><button className="outline-button" onClick={() => onNavigate('plots')}>Duyệt danh sách <span>→</span></button></article><article><div className="round-icon">⌖</div><h3>Tôi muốn trồng gần nhà</h3><p>Tìm vị trí thuận tiện để ghé thăm, theo dõi và thu hoạch.</p><button className="outline-button" onClick={() => onNavigate('plots')}>Tìm khu vườn <span>→</span></button></article></div></section>
    <section className="journal-section section-shell" id="journal"><div className="journal-image"><img src="https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&w=900&q=85" alt="Rau xanh trong khu vườn PlotFarm" /></div><div className="journal-copy"><p className="eyebrow">VÌ SAO PLOTFARM</p><h2>Trồng thật,<br /><em>sống an lành.</em></h2><p>Mọi thông tin đều rõ ràng, mọi mùa vụ đều có người đồng hành. Bạn giữ quyền chủ động, chúng mình lo phần chăm sóc mỗi ngày.</p><button className="outline-button" onClick={() => onNavigate('contact')}>Tìm hiểu thêm <span>↗</span></button></div></section>
  </>
}
export default LandingSections
