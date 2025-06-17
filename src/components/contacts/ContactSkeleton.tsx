import React from 'react'

export const ContactSkeleton: React.FC = () => {
  return (
    <div className="border border-gray-200 rounded-lg p-3 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {/* Name skeleton */}
            <div className="h-4 bg-gray-200 rounded w-32"></div>
            {/* Badge skeleton (sometimes visible) */}
            <div className="h-4 bg-gray-100 rounded w-12"></div>
          </div>
          {/* Job title skeleton */}
          <div className="h-3 bg-gray-200 rounded w-24 mb-2"></div>
          {/* Email skeleton */}
          <div className="h-3 bg-gray-100 rounded w-40 mb-1"></div>
          {/* Notes skeleton */}
          <div className="h-3 bg-gray-100 rounded w-56"></div>
        </div>
        <div className="flex items-center gap-1 ml-3">
          {/* LinkedIn button skeleton */}
          <div className="w-10 h-7 bg-gray-100 rounded"></div>
          {/* Edit button skeleton */}
          <div className="w-7 h-7 bg-gray-100 rounded"></div>
          {/* Delete button skeleton */}
          <div className="w-7 h-7 bg-gray-100 rounded"></div>
        </div>
      </div>
    </div>
  )
}

export const ContactsListSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, index) => (
        <ContactSkeleton key={index} />
      ))}
    </div>
  )
}