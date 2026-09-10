function Header({ onOpenAuth, onNavigate }) {
  return <header className="site-header"><a className="brand" href="#top"><span className="brand-mark">PF</span><span>plot<span>farm</span></span></a><nav><button onClick={() => onNavigate('plots')}>Ô đất đang trống</button><button onClick={() => onNavigate('how-it-works')}>Cách hoạt động</button><button onClick={() => onNavigate('journal')}>Nhật ký mùa vụ</button></nav><div className="header-actions"><button className="login-link" onClick={() => onOpenAuth('login')}>Đăng nhập</button><button className="header-cta" onClick={() => onOpenAuth('register')}>Bắt đầu trồng <span>↗</span></button></div></header>
}
export default Header
