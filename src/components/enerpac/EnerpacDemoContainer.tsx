import React, { useState, createContext, useContext } from 'react'
import { EnerpacDemoNav, type DemoTabKey } from './EnerpacDemoNav'
import { EnerpacDemoPage } from './EnerpacDemoPage'
import { EnerpacOutreachPage } from './EnerpacOutreachPage'

interface DemoContextType {
  approvedProjects: string[]
  setApprovedProjects: (projects: string[]) => void
}

const DemoContext = createContext<DemoContextType | undefined>(undefined)

export const useDemoContext = () => {
  const context = useContext(DemoContext)
  if (!context) {
    throw new Error('useDemoContext must be used within EnerpacDemoContainer')
  }
  return context
}

export const EnerpacDemoContainer = () => {
  const [activeTab, setActiveTab] = useState<DemoTabKey>("projects")

  // Load approved projects from localStorage
  const [approvedProjects, setApprovedProjectsState] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('enerpac-demo-approved-projects')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  // Save to localStorage when approved projects change
  const setApprovedProjects = (projects: string[]) => {
    setApprovedProjectsState(projects)
    localStorage.setItem('enerpac-demo-approved-projects', JSON.stringify(projects))
  }

  const renderContent = () => {
    switch (activeTab) {
      case "projects":
        return <EnerpacDemoPage />
      case "outreach":
        return <EnerpacOutreachPage />
      default:
        return <EnerpacDemoPage />
    }
  }

  return (
    <DemoContext.Provider value={{ approvedProjects, setApprovedProjects }}>
      <div className="flex flex-col h-screen bg-gray-100 antialiased">
        <EnerpacDemoNav activeTab={activeTab} setActiveTab={setActiveTab} />
        <main className="flex-1 overflow-hidden">
          {renderContent()}
        </main>
      </div>
    </DemoContext.Provider>
  )
}