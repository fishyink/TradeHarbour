import { useEffect, useState } from 'react'

interface HistoricalFetchProgress {
  currentChunk: number
  totalChunks: number
  recordsRetrieved: number
  currentDateRange: string
  isComplete: boolean
}

interface LoadingProgressProps {
  progress: HistoricalFetchProgress | null
  accountName?: string
  onComplete?: () => void
  className?: string
}

export const LoadingProgress = ({
  progress,
  accountName,
  onComplete,
  className = ''
}: LoadingProgressProps) => {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (progress && !progress.isComplete) {
      setIsVisible(true)
    } else if (progress?.isComplete) {
      setTimeout(() => {
        setIsVisible(false)
        onComplete?.()
      }, 1000)
    }
  }, [progress, onComplete])

  if (!isVisible || !progress) {
    return null
  }

  const progressPercent = progress.totalChunks > 0
    ? Math.round((progress.currentChunk / progress.totalChunks) * 100)
    : 0

  const isPhaseTwo = progress.currentChunk > progress.totalChunks / 2

  return (
    <div className={`bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 rounded-lg p-6 shadow-sm ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="animate-spin w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Loading Historical Data
            {accountName && <span className="text-gray-600 dark:text-gray-400"> for {accountName}</span>}
          </h3>
        </div>
        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
          {progressPercent}%
        </span>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-2">
          <span>
            {isPhaseTwo ? 'Phase 2: Execution History' : 'Phase 1: Closed P&L'}
          </span>
          <span>
            Chunk {progress.currentChunk} of {progress.totalChunks}
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-dark-700 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-primary-500 to-primary-600 h-2 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Details */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-gray-600 dark:text-gray-400">Current Range:</span>
          <div className="font-mono text-xs text-gray-900 dark:text-gray-100 mt-1">
            {progress.currentDateRange}
          </div>
        </div>
        <div>
          <span className="text-gray-600 dark:text-gray-400">Records Retrieved:</span>
          <div className="font-mono text-xs text-gray-900 dark:text-gray-100 mt-1">
            {progress.recordsRetrieved.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Completion Message */}
      {progress.isComplete && (
        <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-sm font-medium text-green-800 dark:text-green-200">
              Historical data loaded successfully! ({progress.recordsRetrieved.toLocaleString()} records)
            </span>
          </div>
        </div>
      )}
    </div>
  )
}