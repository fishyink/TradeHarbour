import { useState, useEffect } from 'react'
import { useAppStore } from '../store/useAppStore'
import { ExchangeAccount } from '../types/exchanges'
import { apiKeyStatusChecker, ApiKeyStatus } from '../utils/apiKeyStatus'
import { AccountHealthScore } from './AccountHealthScore'

interface AccountsListProps {
  onPageChange: (page: string) => void
}

export const AccountsList = ({ onPageChange }: AccountsListProps) => {
  const { accounts, accountsData, startBatchHistoricalFetch } = useAppStore()
  const [apiStatuses, setApiStatuses] = useState<Map<string, ApiKeyStatus>>(new Map())
  const [checkingStatus, setCheckingStatus] = useState(false)
  const [showFetchInfo, setShowFetchInfo] = useState(false)

  // Check API key status for all accounts on mount
  useEffect(() => {
    if (accounts.length > 0) {
      checkAllApiStatus()
    }
  }, [accounts])

  const checkAllApiStatus = async () => {
    setCheckingStatus(true)
    try {
      const statusMap = new Map<string, ApiKeyStatus>()
      for (const account of accounts) {
        const status = await apiKeyStatusChecker.checkApiKeyStatus(account)
        statusMap.set(account.id, status)
      }
      setApiStatuses(statusMap)
    } catch (error) {
      console.error('Failed to check API status:', error)
    } finally {
      setCheckingStatus(false)
    }
  }

  const getAccountData = (accountId: string) => {
    return accountsData.find(data => data.id === accountId)
  }

  const formatBalance = (balance: string | number | undefined): string => {
    if (!balance) return '$0.00'
    const num = typeof balance === 'string' ? parseFloat(balance) : balance
    if (isNaN(num)) return '$0.00'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num)
  }

  const getStatusInfo = (account: ExchangeAccount) => {
    const accountData = getAccountData(account.id)
    const apiStatus = apiStatuses.get(account.id)

    // Check if we have recent data
    const hasRecentData = accountData && accountData.lastUpdated &&
      (Date.now() - accountData.lastUpdated) < 30 * 60 * 1000 // 30 minutes

    if (accountData?.error) {
      return { status: 'Error', color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-100 dark:bg-red-900/20' }
    }

    if (apiStatus?.isExpired) {
      return { status: 'Expired', color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-100 dark:bg-red-900/20' }
    }

    if (apiStatus?.rateLimited) {
      return { status: 'Rate Limited', color: 'text-yellow-600 dark:text-yellow-400', bgColor: 'bg-yellow-100 dark:bg-yellow-900/20' }
    }

    // Show Active if we have recent data, OR if API validation passed
    // This handles exchanges where API validation isn't implemented yet (like BloFin)
    if (hasRecentData || apiStatus?.isValid) {
      return { status: 'Active', color: 'text-green-600 dark:text-green-400', bgColor: 'bg-green-100 dark:bg-green-900/20' }
    }

    return { status: 'Inactive', color: 'text-gray-600 dark:text-gray-400', bgColor: 'bg-gray-100 dark:bg-gray-800' }
  }

  const getPositionsCount = (accountId: string): number => {
    const accountData = getAccountData(accountId)
    return accountData?.positions?.length || 0
  }

  const formatLastUpdated = (timestamp: number): string => {
    const updated = new Date(timestamp)
    return updated.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (accounts.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No accounts</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Get started by adding your first trading account.
          </p>
          <div className="mt-6">
            <button
              onClick={() => onPageChange('manage-accounts')}
              className="btn-primary"
            >
              Add Account
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="md:flex md:items-center md:justify-between mb-8">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Trading Accounts
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Overview of all your connected trading accounts and their current status.
          </p>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4 space-x-3">
          <div className="relative group">
            <button
              onClick={async () => {
                if (accounts.length === 0) {
                  alert('No accounts found. Please add an account first.')
                  return
                }

                // Fetch data for all accounts using batch method (shows modal)
                await startBatchHistoricalFetch(accounts.map(acc => acc.id))
              }}
              className="btn-secondary flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Force Get All Historical Data</span>
              <svg
                className="w-4 h-4 text-blue-500 dark:text-blue-400 cursor-help"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                onMouseEnter={() => setShowFetchInfo(true)}
                onMouseLeave={() => setShowFetchInfo(false)}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>

            {/* Tooltip */}
            {showFetchInfo && (
              <div className="absolute top-full left-0 mt-2 w-80 p-3 bg-gray-900 dark:bg-gray-800 text-white text-xs rounded-lg shadow-xl z-50">
                <div className="font-semibold mb-1">Force Fetch All Historical Data</div>
                <p className="text-gray-300 dark:text-gray-400">
                  Fetches all available trading history from all your exchange accounts.
                  This will retrieve trades, positions, and P&L data for each account sequentially.
                  Progress shown at top of screen with a 0-100% loading bar.
                </p>
                <div className="absolute top-0 left-4 transform -translate-y-1/2 rotate-45 w-2 h-2 bg-gray-900 dark:bg-gray-800"></div>
              </div>
            )}
          </div>
          <button
            onClick={() => onPageChange('manage-accounts')}
            className="btn-primary"
          >
            Manage Accounts
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
            <div className="text-sm text-gray-500 dark:text-gray-400">Total Accounts</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{accounts.length}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
            <div className="text-sm text-gray-500 dark:text-gray-400">Active Accounts</div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {accounts.filter(acc => getStatusInfo(acc).status === 'Active').length}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
            <div className="text-sm text-gray-500 dark:text-gray-400">Total Equity</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatBalance(
                accounts.reduce((sum, acc) => {
                  const data = getAccountData(acc.id)
                  const balance = parseFloat(data?.balance?.totalEquity || '0')
                  return sum + (isNaN(balance) ? 0 : balance)
                }, 0)
              )}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
            <div className="text-sm text-gray-500 dark:text-gray-400">Open Positions</div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {accounts.reduce((sum, acc) => sum + getPositionsCount(acc.id), 0)}
            </div>
          </div>
        </div>
      </div>

      {/* Accounts List */}
      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Account
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Exchange
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Active Positions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Last Updated
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Total Equity
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {accounts.map((account) => {
                const accountData = getAccountData(account.id)
                const statusInfo = getStatusInfo(account)
                const balance = accountData?.balance?.totalEquity || '0'

                return (
                  <tr key={account.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {account.name}
                        </div>
                        {account.isTestnet && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300">
                            Testnet
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white capitalize">
                        {account.exchange}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusInfo.bgColor} ${statusInfo.color}`}>
                        {statusInfo.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                        <span className="text-sm text-gray-900 dark:text-white">
                          {getPositionsCount(account.id)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-sm text-gray-900 dark:text-white">
                          {accountData?.lastUpdated
                            ? formatLastUpdated(accountData.lastUpdated)
                            : 'Never'
                          }
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {formatBalance(balance)}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {/* Error Messages Row */}
          {accounts.some(account => getAccountData(account.id)?.error) && (
            <div className="px-6 py-4 bg-red-50 dark:bg-red-900/20 border-t border-red-200 dark:border-red-800">
              <div className="space-y-2">
                {accounts.map((account) => {
                  const accountData = getAccountData(account.id)
                  if (!accountData?.error) return null
                  return (
                    <div key={account.id} className="text-sm text-red-700 dark:text-red-300">
                      <strong>{account.name}:</strong> {accountData.error}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Account Health Score */}
      <div className="mt-8">
        <AccountHealthScore />
      </div>

    </div>
  )
}