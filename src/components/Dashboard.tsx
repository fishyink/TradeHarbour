import React, { useState, useMemo, useEffect } from 'react'
import { useAppStore } from '../store/useAppStore'
import { AccountCard } from './AccountCard'
import { StatsCard } from './StatsCard'
import { PositionsTable } from './PositionsTable'
import { TradesTable } from './TradesTable'
// import { EquityChart } from './EquityChart'
import { LoadingProgress } from './LoadingProgress'
import { getTotalEquity, getTotalPnL } from '../store/useAppStore'
import { exportTradesToCSV, exportPositionsToCSV, exportEquityHistoryToCSV } from '../utils/csvExport'
import { bybitAPI } from '../services/bybit'

interface DashboardProps {
  onPageChange?: (page: string) => void
}

export const Dashboard = ({ onPageChange }: DashboardProps = {}) => {
  const { accountsData, accounts, isLoading, forceClearEquityHistory, addEquitySnapshot, backfillEquityHistory } = useAppStore()

  // Force clear bad equity history and backfill with real historical data
  React.useEffect(() => {
    console.log('🔄 Dashboard mounted - starting equity history backfill')
    console.log('🔍 Current accounts state:', { accountsCount: accounts.length, accountsDataCount: accountsData.length })
    forceClearEquityHistory()

    // Add a delay to ensure accounts data is loaded, then backfill
    setTimeout(async () => {
      console.log('🔄 Starting backfill after delay...')
      console.log('🔍 Accounts state at backfill time:', {
        accountsCount: accounts.length,
        accountsDataCount: accountsData.length,
        accountsData: accountsData.map(acc => ({ id: acc.id, name: acc.name, hasBalance: !!acc.balance }))
      })

      try {
        await backfillEquityHistory()
        console.log('✅ Equity history backfill completed')

        // Debug the result
        const { equityHistory } = useAppStore.getState()
        console.log('🔍 Equity history after backfill:', {
          count: equityHistory?.length || 0,
          firstPoint: equityHistory?.[0],
          lastPoint: equityHistory?.[equityHistory.length - 1]
        })
      } catch (error) {
        console.error('❌ Equity backfill failed:', error)
        // Fallback to adding current snapshot
        addEquitySnapshot()
        console.log('📊 Added current equity snapshot as fallback')
      }
    }, 3000) // Increased delay to 3 seconds
  }, [])
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [historicalProgress, setHistoricalProgress] = useState<any>(null)
  const [historicalCacheStats, setHistoricalCacheStats] = useState<any>(null)
  const [isLoadingHistorical, setIsLoadingHistorical] = useState(false)
  const [currentTradesPage, setCurrentTradesPage] = useState(0)
  // const [equityTimeframe, setEquityTimeframe] = useState<'7d' | '30d' | '90d'>('30d')

  const filteredData = selectedAccount
    ? (accountsData || []).filter(account => account.id === selectedAccount)
    : (accountsData || [])

  // Historical data setup
  useEffect(() => {
    // Set up progress callback
    const unsubscribe = bybitAPI.onHistoricalProgress((progress) => {
      setHistoricalProgress(progress)
      if (progress.isComplete) {
        setIsLoadingHistorical(false)
        // Update cache stats after completion
        bybitAPI.getHistoricalCacheStats().then(setHistoricalCacheStats)
      }
    })

    // Get initial cache stats
    bybitAPI.getHistoricalCacheStats().then(setHistoricalCacheStats)

    return unsubscribe
  }, [])

  // Load historical data function
  const loadHistoricalData = async () => {
    if (accounts.length === 0) return

    setIsLoadingHistorical(true)
    try {
      for (const account of accounts) {
        await bybitAPI.fetchCompleteHistoricalData(account)
      }
    } catch (error) {
      console.error('Error loading historical data:', error)
    } finally {
      setIsLoadingHistorical(false)
    }
  }

  // Debug logging to see what data we're getting
  console.log('Dashboard Debug:', {
    accountsCount: accounts.length,
    accountsDataCount: accountsData.length,
    selectedAccount,
    filteredDataCount: filteredData.length,
    accountsData: accountsData.map(acc => ({
      name: acc.name,
      hasBalance: !!acc.balance,
      equity: acc.balance?.totalEquity,
      error: acc.error,
      closedPnLCount: acc.closedPnL?.length || 0,
      tradesCount: acc.trades?.length || 0,
      positionsCount: acc.positions?.length || 0,
      lastUpdated: new Date(acc.lastUpdated).toLocaleString()
    }))
  })

  // Additional debug for closed P&L
  const totalClosedPnL = filteredData.flatMap(account => account.closedPnL || [])
  console.log('Total Closed P&L Debug:', {
    totalRecords: totalClosedPnL.length,
    accounts: filteredData.map(acc => ({
      name: acc.name,
      closedPnL: acc.closedPnL?.length || 0
    }))
  })

  const totalEquity = selectedAccount
    ? filteredData.reduce((sum, account) => sum + parseFloat(account.balance?.totalEquity || '0'), 0)
    : getTotalEquity()

  const totalPnL = selectedAccount
    ? filteredData.reduce((sum, account) => sum + parseFloat(account.balance?.totalPerpUPL || '0'), 0)
    : getTotalPnL()

  const calculateStats = useMemo(() => {
    // Use closed P&L data for accurate statistics from filtered accounts
    const allClosedPnL = filteredData.flatMap(account => account.closedPnL || [])
    const allTrades = filteredData.flatMap(account => account.trades || [])

    console.log('📊 Stats Calculation Debug:', {
      filteredAccounts: filteredData.length,
      totalClosedPnL: allClosedPnL.length,
      totalTrades: allTrades.length,
      accountsWithData: filteredData.map(acc => ({
        name: acc.name,
        closedPnL: acc.closedPnL?.length || 0,
        trades: acc.trades?.length || 0
      }))
    })

    if (allClosedPnL.length === 0) {
      // Fallback: If no closed P&L data, show message based on available trade data
      return {
        winRate: 0,
        totalTrades: 0,
        avgTradeSize: 0,
        totalVolume: 0,
        totalRealizedPnL: 0,
        fallbackUsed: true,
        availableTradeCount: allTrades.length
      }
    }

    const winningTrades = allClosedPnL.filter(trade => parseFloat(trade.closedPnl || '0') > 0)

    const totalTrades = allClosedPnL.length
    const winRate = totalTrades > 0 ? (winningTrades.length / totalTrades) * 100 : 0

    // Calculate total realized P&L
    const totalRealizedPnL = allClosedPnL.reduce((sum, trade) => {
      return sum + parseFloat(trade.closedPnl || '0')
    }, 0)

    // Calculate average trade size from closed positions
    const totalTradeVolume = allClosedPnL.reduce((sum, trade) => {
      return sum + parseFloat(trade.cumEntryValue || '0')
    }, 0)

    const avgTradeSize = totalTrades > 0 ? totalTradeVolume / totalTrades : 0

    return {
      winRate,
      totalTrades,
      avgTradeSize,
      totalVolume: totalTradeVolume,
      totalRealizedPnL,
      fallbackUsed: false
    }
  }, [filteredData])

  const allPositions = filteredData.flatMap(account =>
    account.positions.map(position => ({ ...position, accountName: account.name }))
  )

  const allRecentTrades = filteredData
    .flatMap(account =>
      account.trades.map(trade => ({ ...trade, accountName: account.name }))
    )
    .sort((a, b) => parseInt(b.execTime) - parseInt(a.execTime))

  const tradesPerPage = 15
  const totalTradesPages = Math.ceil(allRecentTrades.length / tradesPerPage)
  const startIndex = currentTradesPage * tradesPerPage
  const paginatedTrades = allRecentTrades.slice(startIndex, startIndex + tradesPerPage)

  // Get real equity history from the store and filter by timeframe
  // const equityHistory = useMemo(() => {
  //   const history = getEquityHistory()
  //   console.log('🔍 DASHBOARD DEBUG - Real Equity History:', {
  //     length: history.length,
  //     firstPoint: history[0],
  //     lastPoint: history[history.length - 1],
  //   })

  //   // Filter by timeframe
  //   if (history.length === 0) return history

  //   const now = Date.now()
  //   const timeframeDays = equityTimeframe === '7d' ? 7 : equityTimeframe === '30d' ? 30 : 90
  //   const cutoffTime = now - (timeframeDays * 24 * 60 * 60 * 1000)

  //   const filteredHistory = history.filter(point => point.timestamp >= cutoffTime)
  //   console.log(`📅 Filtered to ${equityTimeframe}: ${filteredHistory.length} points from ${history.length} total`)

  //   return filteredHistory
  // }, [accountsData?.length || 0, accountsData?.reduce((sum, acc) => sum + (acc.closedPnL?.length || 0), 0) || 0, equityTimeframe])

  if (accounts.length === 0) {
    return (
      <div className="text-center py-12">
        <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Welcome to Trading Dashboard
        </h2>
        <p className="text-muted mb-6 max-w-md mx-auto">
          Connect your Bybit accounts to start monitoring your trading performance.
        </p>
        <div className="flex justify-center">
          <button
            onClick={() => onPageChange?.('accounts')}
            className="btn-primary"
          >
            Add Your First Account
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Trading Dashboard
        </h1>

        <div className="flex items-center space-x-4">
          <button
            onClick={() => {
              console.log('Manual refresh triggered')
              const { refreshData } = useAppStore.getState()
              refreshData()
            }}
            disabled={isLoading}
            className={`btn-secondary flex items-center space-x-2 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
            <span>{isLoading ? 'Loading...' : 'Refresh Data'}</span>
          </button>
          {accountsData.length > 1 && (
            <select
              value={selectedAccount || ''}
              onChange={(e) => setSelectedAccount(e.target.value || null)}
              className="input max-w-xs"
            >
              <option value="">All Accounts</option>
              {accountsData.map(account => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          )}

          <div className="relative">
            <button
              className="btn-secondary flex items-center space-x-2"
              onClick={() => setShowExportMenu(!showExportMenu)}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-4-4m4 4l4-4m-7 7h8" />
              </svg>
              <span>Export</span>
            </button>

            {showExportMenu && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-600 rounded-lg shadow-lg z-10">
                <button
                  onClick={() => {
                    exportTradesToCSV(accountsData)
                    setShowExportMenu(false)
                  }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-dark-700 first:rounded-t-lg"
                >
                  Export Trades
                </button>
                <button
                  onClick={() => {
                    exportPositionsToCSV(accountsData)
                    setShowExportMenu(false)
                  }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-dark-700"
                >
                  Export Positions
                </button>
                <button
                  onClick={() => {
                    exportEquityHistoryToCSV()
                    setShowExportMenu(false)
                  }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-dark-700 last:rounded-b-lg"
                >
                  Export Equity History
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Account Status Warning */}
      {accountsData.some(acc => acc.error || !acc.balance) && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
              Account Connection Issues
            </span>
          </div>
          <div className="space-y-1">
            {accountsData.filter(acc => acc.error || !acc.balance).map(acc => (
              <div key={acc.id} className="text-sm text-amber-700 dark:text-amber-300">
                <span className="font-medium">{acc.name}:</span> {acc.error || 'No data received - check API credentials'}
              </div>
            ))}
          </div>
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
            Check your API keys and ensure they have the correct permissions (read-only access to account data).
          </p>
        </div>
      )}

      {/* Closed P&L Data Warning */}
      {calculateStats.fallbackUsed && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
              Closed P&L Data Not Available
            </span>
          </div>
          <p className="text-sm text-blue-700 dark:text-blue-300">
            Bybit's closed P&L endpoint returned no data for your accounts. This could mean:
          </p>
          <ul className="text-xs text-blue-600 dark:text-blue-400 mt-2 ml-4 space-y-1">
            <li>• No positions have been fully closed in the last 180 days</li>
            <li>• Your trading consists only of open positions (visible in "Open Positions" section)</li>
            <li>• API permissions may not include historical P&L data access</li>
          </ul>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
            You have <strong>{calculateStats.availableTradeCount} execution records</strong> available. Trade statistics will show once positions are closed.
          </p>
        </div>
      )}

      {/* Data Range Summary */}
      {(() => {
        // Check if any account has historical data
        const hasHistoricalData = filteredData.some(account => {
          try {
            const cache = bybitAPI.getCachedHistoricalData(account.id);
            return cache && (cache.closedPnL?.length > 0 || cache.trades?.length > 0);
          } catch (error) {
            return false;
          }
        });
        console.log('🔍 Historical data check:', { hasHistoricalData, filteredDataCount: filteredData.length });
        return hasHistoricalData;
      })() && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-medium text-green-800 dark:text-green-200">
                Historical Data Active: {(() => {
                  const totalRecords = filteredData.reduce((sum, account) => {
                    const cache = bybitAPI.getCachedHistoricalData(account.id);
                    return sum + (cache ? cache.closedPnL.length + cache.trades.length : 0);
                  }, 0);
                  const estimatedDays = Math.min(180, Math.max(1, Math.round(totalRecords / 10)));
                  return `~${estimatedDays} days`;
                })()} of trading data loaded
              </span>
            </div>
            <span className="text-xs text-green-600 dark:text-green-400 font-mono">
              {filteredData.reduce((sum, account) => {
                const cache = bybitAPI.getCachedHistoricalData(account.id);
                return sum + (cache ? cache.closedPnL.length + cache.trades.length : 0);
              }, 0).toLocaleString()} records
            </span>
          </div>
        </div>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <StatsCard
          title="Total Equity"
          value={`$${totalEquity.toLocaleString()}`}
          change={totalPnL}
          icon={(
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
          )}
        />

        <StatsCard
          title="Unrealized PnL"
          value={`$${totalPnL.toLocaleString()}`}
          change={totalPnL}
          icon={(
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          )}
        />

        <StatsCard
          title="Realized PnL"
          value={calculateStats.fallbackUsed ? "No Closed P&L" : `$${calculateStats.totalRealizedPnL.toLocaleString()}`}
          change={calculateStats.totalRealizedPnL}
          icon={(
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
        />

        <StatsCard
          title="Win Rate"
          value={calculateStats.fallbackUsed ? "No Data" : `${calculateStats.winRate.toFixed(1)}%`}
          change={calculateStats.fallbackUsed ? 0 : calculateStats.winRate - 50}
          icon={(
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          )}
        />

        <StatsCard
          title="Total Trades"
          value={calculateStats.fallbackUsed ? `${calculateStats.availableTradeCount} Executions` : calculateStats.totalTrades.toString()}
          change={0}
          icon={(
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          )}
        />
      </div>

      {/* Historical Data Progress */}
      {historicalProgress && !historicalProgress.isComplete && (
        <LoadingProgress
          progress={historicalProgress}
          accountName={selectedAccount ? accountsData.find(acc => acc.id === selectedAccount)?.name : undefined}
          className="mb-6"
        />
      )}

      {/* Debug Historical Data Status */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 mb-4">
        <div className="text-xs font-mono text-yellow-800 dark:text-yellow-200">
          🔧 Debug Info:
          Current Data: {filteredData.reduce((sum, account) => sum + (account.closedPnL?.length || 0), 0)} closed P&L + {filteredData.reduce((sum, account) => sum + (account.trades?.length || 0), 0)} trades |
          Cache Status: {filteredData.map(account => {
            const cache = bybitAPI.getCachedHistoricalData(account.id);
            return `${account.name}: ${cache ? `${cache.closedPnL.length}+${cache.trades.length}` : 'No cache'}`;
          }).join(' | ')}
        </div>
      </div>


      {/* Data Range Information */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <div>
              <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-200">
                Historical Data Range
              </h3>
              <div className="text-xs text-blue-600 dark:text-blue-300 space-y-1">
                {historicalCacheStats ? (
                  <>
                    <div>
                      📊 {historicalCacheStats.totalAccounts} account(s) cached • {historicalCacheStats.totalSize}
                    </div>
                    {historicalCacheStats.lastUpdated && (
                      <div>
                        🕐 Last updated: {new Date(historicalCacheStats.lastUpdated).toLocaleString()}
                      </div>
                    )}
                    <div className="flex items-center space-x-2">
                      <span>📅</span>
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-blue-700 dark:text-blue-200">
                          {(() => {
                            // Calculate actual days of data from cache
                            const totalRecords = filteredData.reduce((sum, account) => {
                              const cache = bybitAPI.getCachedHistoricalData(account.id);
                              return sum + (cache ? cache.closedPnL.length + cache.trades.length : 0);
                            }, 0);

                            if (totalRecords > 0) {
                              // Estimate days based on records (rough estimate: ~10 records per day for active trader)
                              const estimatedDays = Math.min(180, Math.max(1, Math.round(totalRecords / 10)));
                              return `${estimatedDays} days of trading data collected`;
                            }
                            return "180 days (6 months) available for collection";
                          })()}
                        </div>
                        <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-1.5 mt-1">
                          <div
                            className="bg-blue-600 dark:bg-blue-400 h-1.5 rounded-full transition-all duration-300"
                            style={{
                              width: `${(() => {
                                const totalRecords = filteredData.reduce((sum, account) => {
                                  const cache = bybitAPI.getCachedHistoricalData(account.id);
                                  return sum + (cache ? cache.closedPnL.length + cache.trades.length : 0);
                                }, 0);
                                return totalRecords > 0 ? Math.min(100, (totalRecords / 100) * 10) : 0;
                              })()}%`
                            }}
                          />
                        </div>
                      </div>
                    </div>
                    {(() => {
                      const totalRecords = filteredData.reduce((sum, account) => {
                        const cache = bybitAPI.getCachedHistoricalData(account.id);
                        return sum + (cache ? cache.closedPnL.length + cache.trades.length : 0);
                      }, 0);

                      if (totalRecords >= 1000) {
                        return (
                          <div className="text-green-600 dark:text-green-400 text-xs font-medium">
                            ✅ Comprehensive historical data loaded ({totalRecords.toLocaleString()} records)
                          </div>
                        );
                      } else if (totalRecords > 0) {
                        return (
                          <div className="text-yellow-600 dark:text-yellow-400 text-xs">
                            ⚠️ Partial data loaded ({totalRecords.toLocaleString()} records) - Click "Load 6-Month History" for complete data
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </>
                ) : (
                  <div>
                    <div>📭 No historical data cached yet</div>
                    <div className="text-yellow-600 dark:text-yellow-400 text-xs mt-1">
                      Click "Load 6-Month History" to collect up to 180 days of trading data
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={loadHistoricalData}
              disabled={isLoadingHistorical || accounts.length === 0}
              className={`btn-secondary text-sm flex items-center space-x-2 ${
                isLoadingHistorical || accounts.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isLoadingHistorical ? (
                <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              )}
              <span>{isLoadingHistorical ? 'Loading...' : 'Load 6-Month History'}</span>
            </button>
            {historicalCacheStats && historicalCacheStats.totalAccounts > 0 && (
              <button
                onClick={async () => {
                  await bybitAPI.clearHistoricalCache()
                  const stats = await bybitAPI.getHistoricalCacheStats()
                  setHistoricalCacheStats(stats)
                }}
                className="btn-secondary text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                Clear Cache
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Equity Chart - Temporarily disabled */}


      {/* Account Cards */}
      {!selectedAccount && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {accountsData.map(account => (
            <AccountCard key={account.id} account={account} />
          ))}
        </div>
      )}

      {/* Positions and Trades */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Open Positions ({allPositions.length})
          </h2>
          <PositionsTable positions={allPositions} />
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Recent Trades ({allRecentTrades.length})
            </h2>
            {totalTradesPages > 1 && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentTradesPage(Math.max(0, currentTradesPage - 1))}
                  disabled={currentTradesPage === 0}
                  className={`p-1 rounded text-xs transition-colors duration-200 ${
                    currentTradesPage === 0
                      ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-dark-700'
                  }`}
                  title="Previous page"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <span className="text-xs text-gray-500 dark:text-gray-400 px-2">
                  {currentTradesPage + 1} of {totalTradesPages}
                </span>
                <button
                  onClick={() => setCurrentTradesPage(Math.min(totalTradesPages - 1, currentTradesPage + 1))}
                  disabled={currentTradesPage >= totalTradesPages - 1}
                  className={`p-1 rounded text-xs transition-colors duration-200 ${
                    currentTradesPage >= totalTradesPages - 1
                      ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-dark-700'
                  }`}
                  title="Next page"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            )}
          </div>
          <TradesTable trades={paginatedTrades} />
        </div>
      </div>
    </div>
  )
}