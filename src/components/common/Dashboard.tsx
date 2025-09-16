import { useEffect, useState } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { Header } from './Header'
import { SignalsPage } from '../signals/SignalsPage'
import { OutreachPage } from '../outreach/OutreachPage'
import { SettingsPage } from '../settings'
import type { TabKey } from '../../types'
import { USGDemoContainer } from '../usg/USGDemoContainer'

export const Dashboard = () => {
  const location = useLocation()
  const [activeTab, setActiveTab] = useState<TabKey>("signals")

  // Sync activeTab with current route
  useEffect(() => {
    if (location.pathname === '/outreach') {
      setActiveTab('outreach')
    } else if (location.pathname === '/settings') {
      setActiveTab('settings')
    } else {
      setActiveTab('signals')
    }
  }, [location.pathname])

  return (
    <div className="flex flex-col h-screen bg-gray-100 antialiased">
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="flex-1 overflow-y-auto">
        <Routes>
          <Route path="/" element={<SignalsPage />} />
          <Route path="/signals" element={<SignalsPage />} />
          <Route path="/outreach" element={<OutreachPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/usg-demo" element={<USGDemoContainer />} />
        </Routes>
      </main>
    </div>
  )
}