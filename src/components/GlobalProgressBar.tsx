import React from 'react'
import { useAppStore } from '../store/useAppStore'

export const GlobalProgressBar: React.FC = () => {
  const { historicalFetchProgress, accountFetchProgress, setShowFetchModal } = useAppStore()

  if (historicalFetchProgress.status === 'idle') {
    return null
  }

  const isComplete = historicalFetchProgress.status === 'complete'
  const isBatchFetch = accountFetchProgress.length > 0

  return (
    <div className="fixed top-0 left-0 right-0 z-50 animate-slideDown">
      <div className={`${
        isComplete
          ? 'bg-green-500 dark:bg-green-600'
          : 'bg-blue-500 dark:bg-blue-600'
      } text-white px-4 py-3 shadow-lg`}>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-3">
              {!isComplete && (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              )}
              {isComplete && (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
              <div>
                <p className="font-medium">
                  {isComplete
                    ? `Historical Data Loaded - ${historicalFetchProgress.accountName}`
                    : `Fetching Historical Data - ${historicalFetchProgress.accountName}`
                  }
                </p>
                <p className="text-sm text-white/90">{historicalFetchProgress.message}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {isBatchFetch && !isComplete && (
                <button
                  onClick={() => setShowFetchModal(true)}
                  className="px-3 py-1 text-sm bg-white/20 hover:bg-white/30 rounded transition-colors"
                >
                  Show Details
                </button>
              )}
              <div className="text-sm font-semibold">
                {historicalFetchProgress.progress}%
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden">
            <div
              className="bg-white h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${historicalFetchProgress.progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
