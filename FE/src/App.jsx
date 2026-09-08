import { useState } from 'react'
import './App.css'
import Header from './components/Header.jsx'
import LandingSections from './components/LandingSections.jsx'
import PlotSelector from './components/PlotSelector.jsx'
import ContactSection from './components/ContactSection.jsx'
import AuthModal from './components/AuthModal.jsx'
import Footer from './components/Footer.jsx'

function App() {
  const [selectedPlot, setSelectedPlot] = useState('B-07')
  const [authMode, setAuthMode] = useState(null)
  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })

  return <main>
    <Header onOpenAuth={setAuthMode} onNavigate={scrollTo} />
    <LandingSections onNavigate={scrollTo} />
    <PlotSelector selectedPlot={selectedPlot} onSelectPlot={setSelectedPlot} onReserve={() => scrollTo('contact')} />
    <ContactSection />
    {authMode && <AuthModal mode={authMode} onClose={() => setAuthMode(null)} onSwitchMode={setAuthMode} />}
    <Footer />
  </main>
}

export default App
