import React from 'react'

export const DecisionMakerSkeleton: React.FC = () => {
  return (
    <div className="border border-gray-200 rounded-lg p-3 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {/* Name skeleton */}
            <div className="h-4 bg-gray-200 rounded w-36"></div>
            {/* Import status badge skeleton (sometimes visible) */}
            <div className="h-4 bg-gray-100 rounded w-16"></div>
          </div>
          {/* Job title skeleton */}
          <div className="h-3 bg-gray-200 rounded w-28 mb-2"></div>
          {/* Why reach out skeleton */}
          <div className="space-y-1">
            <div className="h-3 bg-gray-100 rounded w-full"></div>
            <div className="h-3 bg-gray-100 rounded w-3/4"></div>
          </div>
        </div>
        <div className="flex items-center gap-1 ml-3">
          {/* Import/unimport button skeleton */}
          <div className="w-7 h-7 bg-gray-100 rounded"></div>
          {/* LinkedIn button skeleton */}
          <div className="w-10 h-7 bg-gray-100 rounded"></div>
        </div>
      </div>
    </div>
  )
}

export const DecisionMakersListSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => {
  return (
    <div>
      {/* Header skeleton */}
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-6 bg-gray-200 rounded w-48 mb-2"></div>
            <div className="h-4 bg-gray-100 rounded w-64"></div>
          </div>
          <div className="h-8 bg-gray-100 rounded w-24"></div>
        </div>
      </div>

      {/* List skeleton */}
      <div className="space-y-2 max-h-[500px] overflow-y-auto">
        {Array.from({ length: count }).map((_, index) => (
          <DecisionMakerSkeleton key={index} />
        ))}
      </div>
    </div>
  )
}