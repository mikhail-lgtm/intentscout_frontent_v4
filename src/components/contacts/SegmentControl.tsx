import React, { useRef, useLayoutEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'

export interface SegmentTab {
  id: string
  label: string
  badge?: number
  status?: 'idle' | 'in-progress' | 'completed' | 'failed'
}

interface SegmentControlProps {
  tabs: SegmentTab[]
  activeTab: string
  onTabChange: (tabId: string) => void
}

export const SegmentControl: React.FC<SegmentControlProps> = ({ tabs, activeTab, onTabChange }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map())
  const [pillStyle, setPillStyle] = useState<{ transform: string; width: string }>({
    transform: 'translateX(0px)',
    width: '0px',
  })

  useLayoutEffect(() => {
    const container = containerRef.current
    const activeEl = tabRefs.current.get(activeTab)
    if (!container || !activeEl) return

    const containerRect = container.getBoundingClientRect()
    const activeRect = activeEl.getBoundingClientRect()
    const offsetX = activeRect.left - containerRect.left + container.scrollLeft

    setPillStyle({
      transform: `translateX(${offsetX}px)`,
      width: `${activeRect.width}px`,
    })
  }, [activeTab, tabs])

  const renderStatusDot = (tab: SegmentTab) => {
    if (tab.badge !== undefined) {
      return (
        <span className="ml-1 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-semibold bg-gray-200 text-gray-600 rounded-full px-1">
          {tab.badge}
        </span>
      )
    }
    if (!tab.status || tab.status === 'idle') return null
    if (tab.status === 'in-progress') {
      return <Loader2 className="ml-1 w-3 h-3 animate-spin text-blue-500" />
    }
    if (tab.status === 'completed') {
      return <span className="ml-1 w-2 h-2 rounded-full bg-green-500 inline-block" />
    }
    if (tab.status === 'failed') {
      return <span className="ml-1 w-2 h-2 rounded-full bg-red-500 inline-block" />
    }
    return null
  }

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className="relative flex items-center bg-gray-100 rounded-lg p-1 overflow-x-auto gap-0.5"
        style={{ scrollbarWidth: 'none' }}
      >
        {/* Sliding pill */}
        <div
          className="segment-indicator absolute top-1 bottom-1 bg-white rounded-md shadow-sm pointer-events-none z-0"
          style={{ ...pillStyle, height: 'calc(100% - 8px)' }}
        />

        {tabs.map((tab) => (
          <button
            key={tab.id}
            ref={(el) => {
              if (el) tabRefs.current.set(tab.id, el)
              else tabRefs.current.delete(tab.id)
            }}
            onClick={() => onTabChange(tab.id)}
            className={`relative z-10 flex items-center whitespace-nowrap px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === tab.id
                ? 'text-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
            {renderStatusDot(tab)}
          </button>
        ))}
      </div>
    </div>
  )
}
