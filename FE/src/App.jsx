import { useState } from 'react'
import './App.css'
import Header from './components/Header.jsx'
import LandingSections from './components/LandingSections.jsx'
import PlotSelector from './components/PlotSelector.jsx'
import ContactSection from './components/ContactSection.jsx'
import AuthModal from './components/AuthModal.jsx'
import Footer from './components/Footer.jsx'
import AdminPage from './components/AdminPage.jsx'
import UserPage from './components/UserPage.jsx'
import FarmerPage from './components/FarmerPage.jsx'

function App() {
  const [selectedPlot, setSelectedPlot] = useState('B-07')
  const [authMode, setAuthMode] = useState(null)
  const [user, setUser] = useState(() => JSON.parse(sessionStorage.getItem('plotfarm_user') || 'null'))
  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  const handleAuth = (nextUser) => {
    setUser(nextUser)
    sessionStorage.setItem('plotfarm_user', JSON.stringify(nextUser))
    setAuthMode(null)
  }
  const logout = () => { sessionStorage.removeItem('plotfarm_user'); setUser(null) }

  if (user) return user.role === 'quan_tri'
    ? <AdminPage user={user} onLogout={logout} />
    : user.role === 'nong_dan'
      ? <FarmerPage user={user} onLogout={logout} />
    : <UserPage user={user} onLogout={logout} />

  return <main>
    <Header onOpenAuth={setAuthMode} onNavigate={scrollTo} />
    <LandingSections onNavigate={scrollTo} />
    <PlotSelector selectedPlot={selectedPlot} onSelectPlot={setSelectedPlot} onReserve={() => scrollTo('contact')} />
    <ContactSection />
    {authMode && <AuthModal mode={authMode} onClose={() => setAuthMode(null)} onSwitchMode={setAuthMode} onAuthenticated={handleAuth} />}
    <Footer />
  </main>
}

export default App
