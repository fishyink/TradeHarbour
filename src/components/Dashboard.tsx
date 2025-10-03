import React, { useState, useMemo, useEffect } from 'react'
import { useAppStore } from '../store/useAppStore'
import { AccountCard } from './AccountCard'
import { StatsCard } from './StatsCard'
import { PositionsTable } from './PositionsTable'
// import { EquityChart } from './EquityChart'
import { LoadingProgress } from './LoadingProgress'
import { getTotalEquity, getTotalPnL } from '../store/useAppStore'
import { exportTradesToCSV, exportPositionsToCSV, exportEquityHistoryToCSV } from '../utils/csvExport'
import { bybitAPI } from '../services/bybit'
import packageInfo from '../../package.json'
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Area, AreaChart } from 'recharts'

interface DashboardProps {
  onPageChange?: (page: string) => void
}

export const Dashboard = ({ onPageChange }: DashboardProps = {}) => {
  const { accountsData, accounts, isLoading, isLoadingBackground, backgroundLoadingMessage, forceClearEquityHistory, addEquitySnapshot, backfillEquityHistory, hasCompletedInitialLoad } = useAppStore()
  const [selectedTimeframe, setSelectedTimeframe] = useState<'7D' | '30D' | '90D' | '180D'>('180D')
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [loadingMessage, setLoadingMessage] = useState('Initializing dashboard...')

  // Track initial data load with progress - only runs once per app session
  React.useEffect(() => {
    if (hasCompletedInitialLoad) return

    const startTime = Date.now()
    setLoadingMessage('Loading account data...')
    setLoadingProgress(20)

    const checkDataLoaded = setInterval(() => {
      const elapsed = Date.now() - startTime

      // Update progress based on elapsed time
      if (elapsed < 3000) {
        setLoadingProgress(20 + (elapsed / 3000) * 30) // 20% -> 50%
        setLoadingMessage('Loading cached historical data...')
      } else if (elapsed < 6000) {
        setLoadingProgress(50 + ((elapsed - 3000) / 3000) * 30) // 50% -> 80%
        setLoadingMessage('Processing trades and positions...')
      } else {
        setLoadingProgress(80 + ((elapsed - 6000) / 4000) * 15) // 80% -> 95%
        setLoadingMessage('Finalizing dashboard...')
      }

      // Check if data has loaded
      if (accountsData.length > 0 || elapsed > 15000) {
        setLoadingProgress(100)
        setLoadingMessage('Complete!')
        setTimeout(() => {
          useAppStore.setState({ hasCompletedInitialLoad: true })
          clearInterval(checkDataLoaded)
        }, 300)
      }
    }, 100)

    return () => clearInterval(checkDataLoaded)
  }, [hasCompletedInitialLoad, accountsData.length])

  // Disabled: Equity history backfill on startup (causing 20-second delay)
  // Users can manually refresh equity data if needed
  React.useEffect(() => {
    console.log('⚡ Equity backfill disabled for fast startup')
    // Just add current snapshot instead of backfilling history
    addEquitySnapshot()
  }, [])
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null)
  const [showExportMenu, setShowExportMenu] = useState(false)
  // const [equityTimeframe, setEquityTimeframe] = useState<'7d' | '30d' | '90d'>('30d')

  const filteredData = selectedAccount
    ? (accountsData || []).filter(account => account.id === selectedAccount)
    : (accountsData || [])

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
    const now = Date.now()
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
        winRate30d: 0,
        totalTrades: 0,
        avgTradeSize: 0,
        totalVolume: 0,
        totalRealizedPnL: 0,
        realizedPnL24h: 0,
        fallbackUsed: true,
        availableTradeCount: allTrades.length
      }
    }

    const winningTrades = allClosedPnL.filter(trade => parseFloat(trade.closedPnl || '0') > 0)

    const totalTrades = allClosedPnL.length
    const winRate = totalTrades > 0 ? (winningTrades.length / totalTrades) * 100 : 0

    // Calculate 30-day Win Rate
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000)
    const closedPnL30d = allClosedPnL.filter(trade => {
      const tradeTime = parseInt(trade.updatedTime || trade.createdTime || '0')
      return tradeTime >= thirtyDaysAgo
    })
    const winningTrades30d = closedPnL30d.filter(trade => parseFloat(trade.closedPnl || '0') > 0)
    const winRate30d = closedPnL30d.length > 0 ? (winningTrades30d.length / closedPnL30d.length) * 100 : 0

    // Calculate total realized P&L
    const totalRealizedPnL = allClosedPnL.reduce((sum, trade) => {
      return sum + parseFloat(trade.closedPnl || '0')
    }, 0)

    // Calculate 24h realized P&L
    const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000)
    const realizedPnL24h = allClosedPnL.reduce((sum, trade) => {
      const tradeTime = parseInt(trade.updatedTime || trade.createdTime || '0')
      if (tradeTime >= twentyFourHoursAgo) {
        return sum + parseFloat(trade.closedPnl || '0')
      }
      return sum
    }, 0)

    // Calculate average trade size from closed positions
    const totalTradeVolume = allClosedPnL.reduce((sum, trade) => {
      return sum + parseFloat(trade.cumEntryValue || '0')
    }, 0)

    const avgTradeSize = totalTrades > 0 ? totalTradeVolume / totalTrades : 0

    return {
      winRate,
      winRate30d,
      totalTrades,
      avgTradeSize,
      totalVolume: totalTradeVolume,
      totalRealizedPnL,
      realizedPnL24h,
      fallbackUsed: false
    }
  }, [filteredData])

  const allPositions = filteredData.flatMap(account => {
    // Get all closed P&L records for this account to find opening times
    const closedPnL = account.closedPnL || []

    return account.positions.map(position => {
      // Try to find a matching open position in closed P&L (duration = 0s means still open)
      const matchingPnL = closedPnL.find(pnl =>
        pnl.symbol === position.symbol &&
        pnl.side === (position.side?.toLowerCase() === 'long' ? 'Sell' : 'Buy') // Closed side is opposite
      )

      // Use the opening time from closed P&L if found, otherwise fall back to position timestamp
      const openTime = matchingPnL?.createdTime || position.createdTime

      return {
        ...position,
        accountName: account.name,
        exchange: account.exchange || 'Bybit',
        createdTime: openTime, // Override with correct opening time from trade history
      }
    })
  })

  // Calculate combined equity curve from all accounts
  const combinedEquityData = useMemo(() => {
    if (filteredData.length === 0) return []

    const currentTime = Date.now()
    const timeframeDays = selectedTimeframe === '7D' ? 7 : selectedTimeframe === '30D' ? 30 : selectedTimeframe === '90D' ? 90 : 180
    const timeframeAgo = currentTime - (timeframeDays * 24 * 60 * 60 * 1000)

    // Collect all closed P&L from all accounts
    const allClosedPnL = filteredData.flatMap(account =>
      (account.closedPnL || []).map(pnl => ({
        ...pnl,
        accountId: account.id,
        accountName: account.name
      }))
    )

    // Filter for selected timeframe and sort by time
    const recentPnL = allClosedPnL
      .filter(pnl => {
        const closedTime = parseInt(pnl.updatedTime || pnl.createdTime)
        return closedTime >= timeframeAgo
      })
      .sort((a, b) => parseInt(a.updatedTime || a.createdTime) - parseInt(b.updatedTime || b.createdTime))

    if (recentPnL.length === 0) return []

    // Calculate current total equity
    const currentTotalEquity = filteredData.reduce((sum, account) => {
      return sum + (account.balance ? parseFloat(account.balance.totalEquity) : 0)
    }, 0)

    // Build cumulative equity curve
    const equityCurve = []

    // Calculate starting equity by working backwards from current equity
    const totalPnL = recentPnL.reduce((sum, pnl) => sum + parseFloat(pnl.closedPnl), 0)
    const startingEquity = currentTotalEquity - totalPnL

    equityCurve.push({
      timestamp: timeframeAgo,
      equity: Math.max(startingEquity, currentTotalEquity * 0.5) // Don't go below 50% of current
    })

    // Add points for each closed position across all accounts
    let runningEquity = equityCurve[0].equity
    recentPnL.forEach(pnl => {
      runningEquity += parseFloat(pnl.closedPnl)
      equityCurve.push({
        timestamp: parseInt(pnl.updatedTime || pnl.createdTime),
        equity: runningEquity
      })
    })

    // Add current point
    equityCurve.push({
      timestamp: currentTime,
      equity: currentTotalEquity
    })

    return equityCurve
  }, [filteredData, selectedTimeframe])

  // Calculate dynamic stats based on selected timeframe and equity data
  const dynamicStats = useMemo(() => {
    if (combinedEquityData.length === 0) {
      return {
        totalReturn: '0.0%',
        sharpeRatio: '0.00',
        maxDrawdown: '0.0%',
        winRate: '0%',
        bestDay: '$0',
        volatility: '0.0%'
      }
    }

    const startEquity = combinedEquityData[0]?.equity || 0
    const endEquity = combinedEquityData[combinedEquityData.length - 1]?.equity || 0
    const totalReturn = startEquity > 0 ? ((endEquity - startEquity) / startEquity) * 100 : 0

    // Calculate daily returns for Sharpe ratio and volatility
    const dailyReturns = []
    for (let i = 1; i < combinedEquityData.length; i++) {
      const prevEquity = combinedEquityData[i - 1].equity
      const currentEquity = combinedEquityData[i].equity
      if (prevEquity > 0) {
        dailyReturns.push((currentEquity - prevEquity) / prevEquity)
      }
    }

    // Sharpe ratio calculation
    const avgReturn = dailyReturns.length > 0 ? dailyReturns.reduce((sum, r) => sum + r, 0) / dailyReturns.length : 0
    const variance = dailyReturns.length > 1 ? dailyReturns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / (dailyReturns.length - 1) : 0
    const stdDev = Math.sqrt(variance)
    const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0 // Annualized

    // Max drawdown calculation
    let maxDrawdown = 0
    let peak = combinedEquityData[0]?.equity || 0
    for (const point of combinedEquityData) {
      if (point.equity > peak) {
        peak = point.equity
      }
      const drawdown = peak > 0 ? ((point.equity - peak) / peak) * 100 : 0
      if (drawdown < maxDrawdown) {
        maxDrawdown = drawdown
      }
    }

    // Win rate and best day from P&L data
    const timeframeDays = selectedTimeframe === '7D' ? 7 : selectedTimeframe === '30D' ? 30 : selectedTimeframe === '90D' ? 90 : 180
    const timeframeAgo = Date.now() - (timeframeDays * 24 * 60 * 60 * 1000)

    const allClosedPnL = filteredData.flatMap(account => account.closedPnL || [])
    const recentPnL = allClosedPnL.filter(pnl => {
      const closedTime = parseInt(pnl.updatedTime || pnl.createdTime)
      return closedTime >= timeframeAgo
    })

    const winningTrades = recentPnL.filter(pnl => parseFloat(pnl.closedPnl) > 0)
    const winRate = recentPnL.length > 0 ? (winningTrades.length / recentPnL.length) * 100 : 0
    const bestDay = recentPnL.length > 0 ? Math.max(...recentPnL.map(pnl => parseFloat(pnl.closedPnl))) : 0

    // Volatility (annualized standard deviation)
    const volatility = stdDev * Math.sqrt(252) * 100

    return {
      totalReturn: `${totalReturn >= 0 ? '+' : ''}${totalReturn.toFixed(1)}%`,
      sharpeRatio: sharpeRatio.toFixed(2),
      maxDrawdown: `${maxDrawdown.toFixed(1)}%`,
      winRate: `${winRate.toFixed(0)}%`,
      bestDay: `${bestDay >= 0 ? '+' : ''}$${Math.abs(bestDay).toFixed(0)}`,
      volatility: `${volatility.toFixed(1)}%`
    }
  }, [combinedEquityData, filteredData, selectedTimeframe])

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
            onClick={() => onPageChange?.('manage-accounts')}
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
      {/* Initial Loading Overlay */}
      {!hasCompletedInitialLoad && (
        <div className="fixed inset-0 bg-gray-900/95 dark:bg-black/95 z-50 flex items-center justify-center backdrop-blur-sm">
          <div className="max-w-md w-full mx-4">
            <div className="bg-white dark:bg-dark-800 rounded-xl shadow-2xl p-8">
              {/* Logo/Icon */}
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
              </div>

              {/* Title */}
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-2">
                Loading Dashboard
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-6">
                {loadingMessage}
              </p>

              {/* Progress Bar */}
              <div className="mb-6">
                <div className="w-full bg-gray-200 dark:bg-dark-700 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${loadingProgress}%` }}
                  />
                </div>
                <div className="flex justify-between mt-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {Math.round(loadingProgress)}%
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Loading cached data...
                  </span>
                </div>
              </div>

              {/* Loading Steps */}
              <div className="space-y-2 text-sm">
                <div className={`flex items-center ${loadingProgress >= 20 ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {loadingProgress >= 20 ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    )}
                  </svg>
                  Loading account data
                </div>
                <div className={`flex items-center ${loadingProgress >= 50 ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {loadingProgress >= 50 ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    )}
                  </svg>
                  Loading cached historical data
                </div>
                <div className={`flex items-center ${loadingProgress >= 80 ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {loadingProgress >= 80 ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    )}
                  </svg>
                  Processing trades and positions
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Trading Dashboard
        </h1>

        <div className="flex items-center space-x-4">
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

      {/* Background Loading Indicator */}
      {isLoadingBackground && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <div>
              <div className="text-sm font-medium text-blue-800 dark:text-blue-200">
                Loading Historical Data
              </div>
              <div className="text-xs text-blue-600 dark:text-blue-400">
                {backgroundLoadingMessage || 'Fetching trades and P&L data in the background...'}
              </div>
            </div>
          </div>
        </div>
      )}

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
        // Check if any account has historical data AND it's been loaded into the dashboard
        const hasHistoricalData = filteredData.some(account => {
          try {
            // Check if the account data actually contains historical P&L and trades
            const hasLoadedHistoricalData = account.closedPnL && account.closedPnL.length > 10 &&
                                          account.trades && account.trades.length > 10;
            return hasLoadedHistoricalData;
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
                  // Calculate actual date range from the historical data
                  let oldestTimestamp = Date.now();
                  let newestTimestamp = 0;
                  let totalRecords = 0;

                  filteredData.forEach(account => {
                    // Check closed P&L data
                    if (account.closedPnL && account.closedPnL.length > 0) {
                      account.closedPnL.forEach(pnl => {
                        const timestamp = parseInt(pnl.updatedTime || pnl.createdTime || '0');
                        if (timestamp > 0) {
                          oldestTimestamp = Math.min(oldestTimestamp, timestamp);
                          newestTimestamp = Math.max(newestTimestamp, timestamp);
                        }
                      });
                      totalRecords += account.closedPnL.length;
                    }

                    // Check trades data
                    if (account.trades && account.trades.length > 0) {
                      account.trades.forEach(trade => {
                        const timestamp = parseInt(trade.execTime || '0');
                        if (timestamp > 0) {
                          oldestTimestamp = Math.min(oldestTimestamp, timestamp);
                          newestTimestamp = Math.max(newestTimestamp, timestamp);
                        }
                      });
                      totalRecords += account.trades.length;
                    }
                  });

                  // Calculate actual days from oldest to newest data
                  if (newestTimestamp > oldestTimestamp) {
                    const actualDays = Math.ceil((newestTimestamp - oldestTimestamp) / (24 * 60 * 60 * 1000));
                    return `${actualDays} days`;
                  } else {
                    // Fallback to estimated days if no timestamps found
                    const estimatedDays = Math.min(180, Math.max(1, Math.round(totalRecords / 10)));
                    return `~${estimatedDays} days`;
                  }
                })()} of trading data loaded
              </span>
            </div>
            <span className="text-xs text-green-600 dark:text-green-400 font-mono">
              {filteredData.reduce((sum, account) => {
                const pnlCount = account.closedPnL ? account.closedPnL.length : 0;
                const tradesCount = account.trades ? account.trades.length : 0;
                return sum + pnlCount + tradesCount;
              }, 0).toLocaleString()} records
            </span>
          </div>
        </div>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <StatsCard
          title="Total Equity"
          value={`$${totalEquity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          change={parseFloat(totalPnL.toFixed(2))}
          timeframe="24h"
          description="Total account value including all balances and open position values. This is your total net worth across all connected accounts."
          icon={(
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
          )}
        />

        <StatsCard
          title="Unrealized PnL"
          value={`$${totalPnL.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          change={parseFloat(totalPnL.toFixed(2))}
          timeframe="Live"
          description="Profit or loss from currently open positions that haven't been closed yet. This updates in real-time as prices change."
          icon={(
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          )}
        />

        <StatsCard
          title="Realized PnL"
          value={calculateStats.fallbackUsed ? "No Closed P&L" : `$${calculateStats.realizedPnL24h.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          change={parseFloat(calculateStats.realizedPnL24h.toFixed(2))}
          timeframe="24h"
          description="Actual profit or loss from positions that have been closed and settled. This money is permanently added to your account balance."
          icon={(
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
        />

        <StatsCard
          title="Win Rate"
          value={calculateStats.fallbackUsed ? "No Data" : `${calculateStats.winRate30d.toFixed(1)}%`}
          change={calculateStats.fallbackUsed ? 0 : parseFloat((calculateStats.winRate30d - 50).toFixed(2))}
          timeframe="30d"
          description="Percentage of closed trades that were profitable. Higher is better - professional traders typically aim for 50%+ win rates."
          icon={(
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          )}
        />

        <StatsCard
          title="Total Executions"
          value={calculateStats.fallbackUsed ? `${calculateStats.availableTradeCount} Executions` : calculateStats.totalTrades.toString()}
          change={0}
          timeframe="All Time"
          description="Total number of order executions (individual buy/sell fills). Different from position closures - one position may have multiple executions."
          icon={(
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          )}
        />
      </div>

      {/* Debug Historical Data Status */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 mb-4">
        <div className="text-xs font-mono text-yellow-800 dark:text-yellow-200">
          🔧 Debug Info:
          Current Data: {filteredData.reduce((sum, account) => sum + (account.closedPnL?.length || 0), 0)} Position Closures + {filteredData.reduce((sum, account) => sum + (account.trades?.length || 0), 0)} Order Executions |
          Cache Status: {filteredData.map(account => {
            // For Bybit, check the cache; for others, check if data is loaded in accountsData
            if (account.exchange === 'bybit') {
              const cache = bybitAPI.getCachedHistoricalData(account.id);
              return `${account.name}: ${cache ? `${cache.closedPnL.length} pos + ${cache.trades.length} exec` : 'No cache'}`;
            } else {
              // For non-Bybit exchanges, check if data exists in the account
              const hasData = (account.closedPnL?.length || 0) > 0 || (account.trades?.length || 0) > 0;
              return `${account.name}: ${hasData ? `${account.closedPnL?.length || 0} pos + ${account.trades?.length || 0} exec` : 'No data'}`;
            }
          }).join(' | ')}
        </div>
      </div>

      {/* Combined Portfolio Equity Curve */}
      {combinedEquityData.length > 0 && (
        <div className="card p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                Combined Portfolio Equity Curve
              </h2>
              <p className="text-sm text-muted">Real-time performance across all accounts</p>
            </div>
            <div className="flex gap-2">
              {(['7D', '30D', '90D', '180D'] as const).map((timeframe) => (
                <button
                  key={timeframe}
                  onClick={() => setSelectedTimeframe(timeframe)}
                  className={`px-3 py-1 rounded-md text-sm transition-colors ${
                    selectedTimeframe === timeframe
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  {timeframe}
                </button>
              ))}
            </div>
          </div>

          {/* Comprehensive Stats Grid */}
          <div className="grid grid-cols-6 gap-3 mb-4">
            <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg text-center">
              <div className="text-xs text-green-600 dark:text-green-400 mb-1">Total Return</div>
              <div className="text-sm font-bold text-green-700 dark:text-green-300">{dynamicStats.totalReturn}</div>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-center">
              <div className="text-xs text-blue-600 dark:text-blue-400 mb-1">Sharpe Ratio</div>
              <div className="text-sm font-bold text-blue-700 dark:text-blue-300">{dynamicStats.sharpeRatio}</div>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg text-center">
              <div className="text-xs text-red-600 dark:text-red-400 mb-1">Max DD</div>
              <div className="text-sm font-bold text-red-700 dark:text-red-300">{dynamicStats.maxDrawdown}</div>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg text-center">
              <div className="text-xs text-purple-600 dark:text-purple-400 mb-1">Win Rate</div>
              <div className="text-sm font-bold text-purple-700 dark:text-purple-300">{dynamicStats.winRate}</div>
            </div>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg text-center">
              <div className="text-xs text-yellow-600 dark:text-yellow-400 mb-1">Best Day</div>
              <div className="text-sm font-bold text-yellow-700 dark:text-yellow-300">{dynamicStats.bestDay}</div>
            </div>
            <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg text-center">
              <div className="text-xs text-orange-600 dark:text-orange-400 mb-1">Volatility</div>
              <div className="text-sm font-bold text-orange-700 dark:text-orange-300">{dynamicStats.volatility}</div>
            </div>
          </div>

          <div className="h-96 bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900/50 dark:to-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={combinedEquityData}>
                <defs>
                  <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="timestamp" type="number" scale="time" domain={['dataMin', 'dataMax']} hide />
                <YAxis domain={['dataMin', 'dataMax']} tick={{ fontSize: 11 }} tickFormatter={(value) => `$${(value/1000).toFixed(0)}k`} />
                <CartesianGrid strokeDasharray="2 2" stroke="#e5e7eb" opacity={0.3} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const value = payload[0].value as number
                      const timestamp = payload[0].payload.timestamp
                      const date = new Date(timestamp)
                      return (
                        <div className="bg-white dark:bg-dark-800 border border-blue-200 dark:border-blue-600 rounded-lg shadow-xl p-3">
                          <div className="font-bold text-blue-700 dark:text-blue-300 text-lg">${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                          <div className="text-gray-600 dark:text-gray-400">{date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</div>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Area dataKey="equity" stroke="#3b82f6" strokeWidth={3} fill="url(#equityGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

        </div>
      )}

      {/* Account Cards */}
      {!selectedAccount && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {accountsData.map(account => (
            <AccountCard key={account.id} account={account} />
          ))}
        </div>
      )}

      {/* Open Positions - Full Width */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Open Positions ({allPositions.length})
        </h2>
        <PositionsTable positions={allPositions} />
      </div>

      {/* Trade Harbour Footer */}
      <div className="mt-8 text-center py-6 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-center space-x-2 text-sm text-muted mb-2">
          <span>⚓</span>
          <span>Trade Harbour v{packageInfo.version}</span>
          <span>•</span>
          <a
            href="https://github.com/fishyink/tradeharbour"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary transition-colors"
          >
            GitHub Repository
          </a>
        </div>
        <p className="text-xs text-muted">
          One harbour, one dashboard, all your trades.
        </p>
      </div>

    </div>
  )
}