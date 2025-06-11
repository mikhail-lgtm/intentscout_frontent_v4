import { useState, useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { api } from '../../lib/apiClient'
import type { FilterOptions } from './types'

interface Props {
  filters: FilterOptions
  onChange: (filters: Partial<FilterOptions>) => void
  isOpen: boolean
  onClose: () => void
}

export const FilterPanel = ({ filters, onChange, isOpen, onClose }: Props) => {
  const [verticals, setVerticals] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Load available verticals from API (if we implement this endpoint)
    // For now, using static list based on common verticals
    const loadVerticals = async () => {
      try {
        // TODO: Implement /api/signals/verticals endpoint if needed
        const staticVerticals = [
          'technology',
          'healthcare', 
          'finance',
          'manufacturing',
          'retail',
          'energy',
          'automotive',
          'aerospace'
        ]
        setVerticals(staticVerticals)
      } catch (error) {
        console.error('Failed to load verticals:', error)
      } finally {
        setLoading(false)
      }
    }

    loadVerticals()
  }, [])

  // Handle slider changes with debouncing
  const [sliderValue, setSliderValue] = useState(filters.minScore)
  const [sliderTimeout, setSliderTimeout] = useState<NodeJS.Timeout | null>(null)

  const handleSliderChange = (newValue: number) => {
    setSliderValue(newValue)
    
    // Clear existing timeout
    if (sliderTimeout) {
      clearTimeout(sliderTimeout)
    }
    
    // Set new timeout to update actual value after user stops sliding
    const timeout = setTimeout(() => {
      onChange({ minScore: newValue })
    }, 300) // 300ms delay
    
    setSliderTimeout(timeout)
  }

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (sliderTimeout) {
        clearTimeout(sliderTimeout)
      }
    }
  }, [sliderTimeout])

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-25 z-40" />
      
      {/* Panel */}
      <div 
        ref={panelRef}
        className="fixed top-20 right-4 w-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 max-h-[calc(100vh-6rem)] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-md text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6 space-y-8 overflow-y-auto max-h-[calc(100vh-12rem)] custom-scrollbar">
          {/* Min Score Filter */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <label className="text-sm font-medium text-gray-900">
                Minimum Intent Score
              </label>
              <span className="text-lg font-bold text-orange-600">{sliderValue}</span>
            </div>
            
            {/* Custom Slider with Ticks */}
            <div className="relative">
              {/* Tick marks */}
              <div className="flex justify-between absolute w-full -top-2">
                {[1, 2, 3, 4, 5].map((tick) => (
                  <div key={tick} className="flex flex-col items-center">
                    <div className={`w-0.5 h-2 ${sliderValue >= tick ? 'bg-orange-500' : 'bg-gray-300'}`}></div>
                    <span className={`text-xs mt-1 font-medium ${sliderValue >= tick ? 'text-orange-600' : 'text-gray-400'}`}>
                      {tick}
                    </span>
                  </div>
                ))}
              </div>
              
              {/* Slider */}
              <input
                type="range"
                min="1"
                max="5"
                step="1"
                value={sliderValue}
                onChange={(e) => handleSliderChange(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer mt-6 slider-with-ticks"
                style={{
                  background: `linear-gradient(to right, #f97316 0%, #f97316 ${((sliderValue - 1) / 4) * 100}%, #e5e7eb ${((sliderValue - 1) / 4) * 100}%, #e5e7eb 100%)`
                }}
              />
            </div>
            
            <div className="mt-3 flex justify-between text-xs text-gray-500">
              <span>Low Intent</span>
              <span>High Intent</span>
            </div>
          </div>

          {/* Vertical Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-3">
              Company Vertical
            </label>
            
            <select
              value={filters.vertical}
              onChange={(e) => onChange({ vertical: e.target.value })}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm bg-white"
              disabled={loading}
            >
              <option value="">All Verticals</option>
              {verticals.map((vertical) => (
                <option key={vertical} value={vertical}>
                  {vertical.charAt(0).toUpperCase() + vertical.slice(1)}
                </option>
              ))}
            </select>
            
            {loading && (
              <p className="text-xs text-gray-500 mt-2">Loading verticals...</p>
            )}
          </div>
        </div>
        
        {/* Footer */}
        <div className="p-6 border-t border-gray-100 flex justify-between">
          <button
            onClick={() => {
              onChange({ minScore: 3, vertical: '' })
              onClose()
            }}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 font-medium"
          >
            Clear All
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 transition-colors"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </>
  )
}