import React, { useState, createContext, useContext } from 'react'
import { USGDemoNav, type DemoTabKey } from './USGDemoNav'
import { USGDemoPage } from './USGDemoPage'
import { USGOutreachPage } from './USGOutreachPage'

interface DemoContextType {
  approvedProjects: string[]
  setApprovedProjects: (projects: string[]) => void
}

const DemoContext = createContext<DemoContextType | undefined>(undefined)

export const useDemoContext = () => {
  const context = useContext(DemoContext)
  if (!context) {
    throw new Error('useDemoContext must be used within USGDemoContainer')
  }
  return context
}

export const USGDemoContainer = () => {
  const [activeTab, setActiveTab] = useState<DemoTabKey>("projects")

  // Load approved projects from localStorage
  const [approvedProjects, setApprovedProjectsState] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('usg-demo-approved-projects')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  // Save to localStorage when approved projects change
  const setApprovedProjects = (projects: string[]) => {
    setApprovedProjectsState(projects)
    localStorage.setItem('usg-demo-approved-projects', JSON.stringify(projects))
  }

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
    <DemoContext.Provider value={{ approvedProjects, setApprovedProjects }}>
      <div className="flex flex-col h-screen bg-gray-100 antialiased">
        <USGDemoNav activeTab={activeTab} setActiveTab={setActiveTab} />
        <main className="flex-1 overflow-hidden">
          {renderContent()}
        </main>
      </div>
    </DemoContext.Provider>
  )
}