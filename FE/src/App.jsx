import { useEffect, useState } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
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
import { getDashboardStats, getPlots } from './api.js'

const dashboardPath = (role) => ({ quan_tri: '/admin', nong_dan: '/farmer', khach_hang: '/dashboard' }[role] || '/')

const readStoredAuth = () => {
  try {
    const auth = JSON.parse(sessionStorage.getItem('plotfarm_auth') || 'null')
    if (!auth?.token || !auth?.user) return null
    const payload = JSON.parse(atob(auth.token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    const isExpired = !payload.exp || payload.exp * 1000 <= Date.now()
    const doesNotMatchUser = String(payload.sub) !== String(auth.user.id) || payload.role !== auth.user.role
    return isExpired || doesNotMatchUser ? null : auth
  } catch {
    return null
  }
}

function ProtectedRoute({ auth, allowedRoles, children }) {
  if (!auth) return <Navigate to="/" replace />
  if (!allowedRoles.includes(auth.user.role)) return <Navigate to={dashboardPath(auth.user.role)} replace />
  return children
}

function HomePage({ authMode, setAuthMode, onAuthenticated }) {
  const [selectedPlot, setSelectedPlot] = useState('')
  const [plots, setPlots] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })

  useEffect(() => {
    Promise.all([getPlots(), getDashboardStats()])
      .then(([nextPlots, nextStats]) => {
        setPlots(nextPlots)
        setStats(nextStats)
        setSelectedPlot(nextPlots.find((plot) => plot.status === 'trong')?.code || '')
      })
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false))
  }, [])

  return <main>
    <Header onOpenAuth={setAuthMode} onNavigate={scrollTo} />
    <LandingSections stats={stats} statsLoading={loading} statsError={error} onNavigate={scrollTo} />
    <PlotSelector
      plots={plots}
      loading={loading}
      error={error}
      selectedPlot={selectedPlot}
      onSelectPlot={setSelectedPlot}
      onReserve={() => scrollTo('contact')}
    />
    <ContactSection />
    {authMode && <AuthModal mode={authMode} onClose={() => setAuthMode(null)} onSwitchMode={setAuthMode} onAuthenticated={onAuthenticated} />}
    <Footer />
  </main>
}

function App() {
  const navigate = useNavigate()
  const [auth, setAuth] = useState(readStoredAuth)
  const [authMode, setAuthMode] = useState(null)

  const handleAuth = (nextAuth) => {
    setAuth(nextAuth)
    sessionStorage.setItem('plotfarm_auth', JSON.stringify(nextAuth))
    setAuthMode(null)
    navigate(dashboardPath(nextAuth.user.role), { replace: true })
  }

  const logout = () => {
    sessionStorage.removeItem('plotfarm_auth')
    setAuth(null)
    navigate('/', { replace: true })
  }

  return <Routes>
    <Route path="/" element={<HomePage authMode={authMode} setAuthMode={setAuthMode} onAuthenticated={handleAuth} />} />
    <Route path="/admin" element={<ProtectedRoute auth={auth} allowedRoles={['quan_tri']}><AdminPage user={auth?.user} token={auth?.token} onLogout={logout} /></ProtectedRoute>} />
    <Route path="/farmer" element={<ProtectedRoute auth={auth} allowedRoles={['nong_dan']}><FarmerPage user={auth?.user} onLogout={logout} /></ProtectedRoute>} />
    <Route path="/dashboard" element={<ProtectedRoute auth={auth} allowedRoles={['khach_hang']}><UserPage user={auth?.user} token={auth?.token} onLogout={logout} /></ProtectedRoute>} />
    <Route path="*" element={<Navigate to={auth ? dashboardPath(auth.user.role) : '/'} replace />} />
  </Routes>
}

export default App
