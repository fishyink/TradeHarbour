import React from 'react'
import { useAppStore } from '../store/useAppStore'

interface AccountProgress {
  id: string
  name: string
  exchange: string
  status: 'pending' | 'fetching' | 'complete' | 'error'
  progress: number
  message?: string
  totalRecords?: number
}

export const HistoricalFetchModal: React.FC = () => {
  const { accountFetchProgress, setShowFetchModal, showFetchModal } = useAppStore()

  if (!showFetchModal) return null

  const allComplete = accountFetchProgress.every(acc => acc.status === 'complete' || acc.status === 'error')
  const totalProgress = accountFetchProgress.length > 0
    ? Math.round(accountFetchProgress.reduce((sum, acc) => sum + acc.progress, 0) / accountFetchProgress.length)
    : 0

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fadeIn">
      <div className="bg-white dark:bg-dark-800 rounded-lg shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-dark-700">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Fetching Historical Data
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {allComplete
                ? 'All accounts processed successfully'
                : `Processing ${accountFetchProgress.length} account(s)...`
              }
            </p>
          </div>
          <button
            onClick={() => setShowFetchModal(false)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Overall Progress */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-dark-900 border-b border-gray-200 dark:border-dark-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Overall Progress
            </span>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              {totalProgress}%
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-dark-700 rounded-full h-2">
            <div
              className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${totalProgress}%` }}
            />
          </div>
        </div>

        {/* Account List */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            {accountFetchProgress.map((account) => (
              <div
                key={account.id}
                className="bg-gray-50 dark:bg-dark-900 rounded-lg p-4 border border-gray-200 dark:border-dark-700"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    {/* Status Icon */}
                    {account.status === 'pending' && (
                      <div className="w-6 h-6 text-gray-400 dark:text-gray-500">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    )}
                    {account.status === 'fetching' && (
                      <div className="w-6 h-6 text-blue-500 dark:text-blue-400 animate-spin">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </div>
                    )}
                    {account.status === 'complete' && (
                      <div className="w-6 h-6 text-green-500 dark:text-green-400">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                    {account.status === 'error' && (
                      <div className="w-6 h-6 text-red-500 dark:text-red-400">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </div>
                    )}

                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {account.name}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                        {account.exchange}
                      </p>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    account.status === 'pending' ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300' :
                    account.status === 'fetching' ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' :
                    account.status === 'complete' ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' :
                    'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
                  }`}>
                    {account.status === 'pending' && 'Waiting'}
                    {account.status === 'fetching' && 'Fetching'}
                    {account.status === 'complete' && 'Complete'}
                    {account.status === 'error' && 'Error'}
                  </span>
                </div>

                {/* Progress Bar (only show when fetching) */}
                {account.status === 'fetching' && (
                  <div className="mb-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        {account.message || 'Fetching data...'}
                      </span>
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                        {account.progress}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-dark-700 rounded-full h-1.5">
                      <div
                        className="bg-blue-600 dark:bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${account.progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Completion Message */}
                {account.status === 'complete' && account.totalRecords !== undefined && (
                  <p className="text-xs text-green-600 dark:text-green-400">
                    ✓ Loaded {account.totalRecords.toLocaleString()} records
                  </p>
                )}

                {/* Error Message */}
                {account.status === 'error' && account.message && (
                  <p className="text-xs text-red-600 dark:text-red-400">
                    ✗ {account.message}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-dark-700 bg-gray-50 dark:bg-dark-900">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {allComplete
                ? 'You can close this window. Data has been loaded.'
                : 'You can close this window. Fetching will continue in the background.'
              }
            </p>
            <button
              onClick={() => setShowFetchModal(false)}
              className="btn-primary"
            >
              {allComplete ? 'Done' : 'Minimize'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
