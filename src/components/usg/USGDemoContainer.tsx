import React, { useState } from 'react'
import { USGDemoNav, type DemoTabKey } from './USGDemoNav'
import { USGDemoPage } from './USGDemoPage'
import { USGOutreachPage } from './USGOutreachPage'

export const USGDemoContainer = () => {
  const [activeTab, setActiveTab] = useState<DemoTabKey>("projects")

  const renderContent = () => {
    switch (activeTab) {
      case "projects":
        return <USGDemoPage />
      case "outreach":
        return <USGOutreachPage />
      default:
        return <USGDemoPage />
    }
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100 antialiased">
      <USGDemoNav activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="flex-1 overflow-hidden">
        {renderContent()}
      </main>
    </div>
  )
}