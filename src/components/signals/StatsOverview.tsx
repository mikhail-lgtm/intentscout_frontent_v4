import type { Signal } from './types'

interface Props {
  totalSignals: number
  currentIndex: number
  currentSignal: Signal | null
}

export const StatsOverview = ({ totalSignals, currentIndex, currentSignal }: Props) => {
  return (
    <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
        <div className="text-2xl font-bold text-orange-600">{totalSignals}</div>
        <div className="text-xs text-gray-600 uppercase tracking-wider">Active Signals</div>
      </div>
      
      <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
        <div className="text-2xl font-bold text-blue-600">
          {currentSignal?.intentScore?.intentScore ? Math.round(currentSignal.intentScore.intentScore) : '0'}
        </div>
        <div className="text-xs text-gray-600 uppercase tracking-wider">Current Score</div>
      </div>
      
      <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
        <div className="text-2xl font-bold text-purple-600">
          {(currentSignal?.intentScore?.citations?.length) || (currentSignal?.citedJobs?.length) || 0}
        </div>
        <div className="text-xs text-gray-600 uppercase tracking-wider">Evidence Points</div>
      </div>
      
      <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
        <div className="text-2xl font-bold text-green-600">
          {currentIndex + 1}
        </div>
        <div className="text-xs text-gray-600 uppercase tracking-wider">Current Signal</div>
      </div>
    </div>
  )
}