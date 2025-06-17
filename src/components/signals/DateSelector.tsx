import { useState, useRef, useEffect } from 'react'
import { useSignalCounts } from '../../hooks/useSignalCounts'

interface Props {
  selectedDate: string
  onChange: (date: string) => void
  productId?: string
  minScore?: number
  decisionFilter?: string
  showNavButtons?: boolean
}

export const DateSelector = ({ selectedDate, onChange, productId, minScore = 3.0, decisionFilter, showNavButtons = true }: Props) => {
  const [showCalendar, setShowCalendar] = useState(false)
  const calendarRef = useRef<HTMLDivElement>(null)

  // Get previous and next day
  const getPreviousDay = (dateString: string): string => {
    const date = new Date(dateString)
    date.setUTCDate(date.getUTCDate() - 1)
    return date.toISOString().split('T')[0]
  }

  const getNextDay = (dateString: string): string => {
    const date = new Date(dateString)
    date.setUTCDate(date.getUTCDate() + 1)
    return date.toISOString().split('T')[0]
  }

  // Check if date is in the future
  const isFuture = (dateString: string): boolean => {
    const date = new Date(dateString + 'T00:00:00')
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return date > today
  }

  // Format date for display
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString + 'T00:00:00')
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    })
  }

  // Handle navigation
  const handleNavigation = (direction: 'prev' | 'next') => {
    const newDate = direction === 'prev' ? getPreviousDay(selectedDate) : getNextDay(selectedDate)
    if (!isFuture(newDate)) {
      onChange(newDate)
    }
  }

  // Close calendar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        setShowCalendar(false)
      }
    }

    if (showCalendar) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showCalendar])

  return (
    <div className="flex items-center space-x-1">
      {/* Previous Day Button */}
      {showNavButtons && (
        <button
          onClick={() => handleNavigation('prev')}
          className="border border-gray-300 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm flex items-center hover:bg-gray-50 bg-white"
          title={`Previous day (${formatDate(getPreviousDay(selectedDate))})`}
        >
          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      {/* Calendar Selector */}
      <div className="relative" ref={calendarRef}>
        <button
          onClick={() => setShowCalendar(!showCalendar)}
          className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm flex items-center space-x-2 hover:bg-gray-50 bg-white min-w-[140px]"
          title="Select date"
        >
          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-gray-700">
            {formatDate(selectedDate)}
          </span>
        </button>
        
        {showCalendar && (
          <div className="absolute top-full right-0 mt-2 z-50">
            <CalendarPicker
              selectedDate={selectedDate}
              onDateSelect={(date) => {
                onChange(date)
                setShowCalendar(false)
              }}
              onClose={() => setShowCalendar(false)}
              productId={productId}
              minScore={minScore}
              decisionFilter={decisionFilter}
            />
          </div>
        )}
      </div>

      {/* Next Day Button */}
      {showNavButtons && (
        <button
          onClick={() => handleNavigation('next')}
          disabled={isFuture(getNextDay(selectedDate))}
          className="border border-gray-300 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm flex items-center hover:bg-gray-50 bg-white disabled:opacity-50 disabled:cursor-not-allowed"
          title={isFuture(getNextDay(selectedDate)) ? "Cannot navigate to future dates" : `Next day (${formatDate(getNextDay(selectedDate))})`}
        >
          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}
    </div>
  )
}

// Mini calendar component
interface CalendarPickerProps {
  selectedDate: string
  onDateSelect: (date: string) => void
  onClose: () => void
  productId?: string
  minScore?: number
  decisionFilter?: string
}

const CalendarPicker = ({ selectedDate, onDateSelect, onClose, productId, minScore = 3.0, decisionFilter }: CalendarPickerProps) => {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const date = new Date(selectedDate + 'T00:00:00')
    return new Date(date.getFullYear(), date.getMonth(), 1)
  })

  // Get date range for current month to fetch signal counts
  const monthStartDate = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-01`
  const monthEndDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)
  const monthEndDateString = `${monthEndDate.getFullYear()}-${String(monthEndDate.getMonth() + 1).padStart(2, '0')}-${String(monthEndDate.getDate()).padStart(2, '0')}`

  // Fetch signal counts for the current month
  const { hasSignalsForDate, isLoading } = useSignalCounts(
    productId ? monthStartDate : '',
    productId ? monthEndDateString : '',
    productId || '',
    minScore,
    decisionFilter
  )

  const today = new Date()
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ]

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }

  const handleDateClick = (day: number) => {
    const year = currentMonth.getFullYear()
    const month = String(currentMonth.getMonth() + 1).padStart(2, '0')
    const dayStr = String(day).padStart(2, '0')
    const dateString = `${year}-${month}-${dayStr}`
    onDateSelect(dateString)
  }

  const renderCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentMonth)
    const firstDay = getFirstDayOfMonth(currentMonth)
    const days = []

    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="w-8 h-8"></div>)
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDateString = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const isSelected = selectedDate === currentDateString
      
      const isToday = today.getDate() === day && 
        today.getMonth() === currentMonth.getMonth() && 
        today.getFullYear() === currentMonth.getFullYear()

      // Check if this date is in the future
      const dayDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
      const todayDate = new Date()
      todayDate.setHours(0, 0, 0, 0)
      dayDate.setHours(0, 0, 0, 0)
      const isFutureDate = dayDate > todayDate

      const hasSignals = hasSignalsForDate(currentDateString)

      days.push(
        <button
          key={day}
          onClick={() => !isFutureDate && handleDateClick(day)}
          disabled={isFutureDate}
          className={`w-8 h-8 text-sm rounded-md flex items-center justify-center transition-colors relative ${
            isSelected
              ? 'bg-orange-500 text-white font-medium'
              : isToday
              ? 'bg-orange-100 text-orange-700 font-medium'
              : isFutureDate
              ? 'text-gray-300 cursor-not-allowed'
              : 'text-gray-700 hover:bg-orange-50 hover:text-orange-600'
          }`}
        >
          {day}
          {hasSignals && !isSelected && (
            <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-orange-500 rounded-full"></div>
          )}
        </button>
      )
    }

    return days
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-xl p-4 w-72">
      {/* Header with month navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
          className="p-1 rounded-md hover:bg-gray-100 text-gray-600 hover:text-gray-800"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        <div className="flex items-center space-x-2">
          <h3 className="text-sm font-semibold text-gray-900">
            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </h3>
          {isLoading && (
            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-orange-500"></div>
          )}
        </div>
        
        <button
          onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
          className="p-1 rounded-md hover:bg-gray-100 text-gray-600 hover:text-gray-800"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Days of week header */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
          <div key={day} className="w-8 h-6 text-xs font-medium text-gray-500 flex items-center justify-center">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {renderCalendarDays()}
      </div>

      {/* Quick actions */}
      <div className="mt-4 pt-3 border-t border-gray-200">
        <div className="flex justify-between">
          <button
            onClick={() => {
              const yesterday = new Date()
              yesterday.setDate(yesterday.getDate() - 1)
              onDateSelect(yesterday.toISOString().split('T')[0])
              onClose()
            }}
            className="text-xs text-orange-600 hover:text-orange-700 font-medium"
          >
            Yesterday
          </button>
          <button
            onClick={() => {
              const today = new Date()
              onDateSelect(today.toISOString().split('T')[0])
              onClose()
            }}
            className="text-xs text-orange-600 hover:text-orange-700 font-medium"
          >
            Today
          </button>
        </div>
      </div>
    </div>
  )
}