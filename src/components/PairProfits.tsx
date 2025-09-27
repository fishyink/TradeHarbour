import { useMemo, useState } from 'react'
import { AccountData } from '../types/bybit'

interface PairProfitsProps {
  account: AccountData
}

type SortField = 'symbol' | 'profit7d' | 'profit30d' | 'profit90d' | 'winRate'
type SortDirection = 'asc' | 'desc'

export const PairProfits = ({ account }: PairProfitsProps) => {
  const [sortField, setSortField] = useState<SortField>('profit90d')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const pairProfits = useMemo(() => {
    if (!account.closedPnL || account.closedPnL.length === 0) return []

    const now = Date.now()
    const day7Ago = now - (7 * 24 * 60 * 60 * 1000)
    const day30Ago = now - (30 * 24 * 60 * 60 * 1000)
    const day90Ago = now - (90 * 24 * 60 * 60 * 1000)

    // Group closed P&L by symbol
    const symbolGroups = account.closedPnL.reduce((groups, closedPosition) => {
      const symbol = closedPosition.symbol
      if (!groups[symbol]) {
        groups[symbol] = []
      }
      groups[symbol].push(closedPosition)
      return groups
    }, {} as Record<string, typeof account.closedPnL>)

    return Object.entries(symbolGroups).map(([symbol, closedPositions]) => {
      let profit7d = 0
      let profit30d = 0
      let profit90d = 0
      let completedTrades = closedPositions.length
      let winningTrades = 0

      closedPositions.forEach(position => {
        const closedTime = parseInt(position.updatedTime || position.createdTime)
        const pnl = parseFloat(position.closedPnl)

        if (pnl > 0) winningTrades++

        // Add P&L to appropriate time periods (INDEPENDENT CALCULATION)
        // 7-day period: trades in last 7 days
        if (closedTime >= day7Ago) {
          profit7d += pnl
        }

        // 30-day period: trades in last 30 days
        if (closedTime >= day30Ago) {
          profit30d += pnl
        }

        // 90-day period: trades in last 90 days
        if (closedTime >= day90Ago) {
          profit90d += pnl
        }
      })

      return {
        symbol,
        profit7d,
        profit30d,
        profit90d,
        completedTrades,
        winRate: completedTrades > 0 ? (winningTrades / completedTrades) * 100 : 0
      }
    }).filter(pair => pair.completedTrades > 0) // Only show pairs with completed trades
      .sort((a, b) => {
        let aValue, bValue

        switch (sortField) {
          case 'symbol':
            aValue = a.symbol
            bValue = b.symbol
            break
          case 'profit7d':
            aValue = a.profit7d
            bValue = b.profit7d
            break
          case 'profit30d':
            aValue = a.profit30d
            bValue = b.profit30d
            break
          case 'profit90d':
            aValue = a.profit90d
            bValue = b.profit90d
            break
          case 'winRate':
            aValue = a.winRate
            bValue = b.winRate
            break
          default:
            aValue = a.profit90d
            bValue = b.profit90d
        }

        if (sortField === 'symbol') {
          return sortDirection === 'asc'
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue)
        } else {
          return sortDirection === 'asc' ? aValue - bValue : bValue - aValue
        }
      })
  }, [account.closedPnL, sortField, sortDirection])

  const formatCurrency = (value: number) => {
    const abs = Math.abs(value)
    if (abs >= 1000) {
      return `$${(abs / 1000).toFixed(2)}k`
    }
    return `$${abs.toFixed(2)}`
  }

  const getProfitColor = (profit: number) => {
    if (profit > 0) return 'text-green-400 font-medium'
    if (profit < 0) return 'text-red-400 font-medium'
    return 'text-gray-400'
  }

  const getWinRateColor = (winRate: number) => {
    if (winRate >= 70) return 'text-green-400'
    if (winRate >= 50) return 'text-yellow-400'
    return 'text-red-400'
  }

  console.log('PairProfits render:', {
    accountName: account.name,
    hasClosedPnL: !!account.closedPnL,
    closedPnLLength: account.closedPnL?.length || 0,
    accountError: account.error,
    lastUpdated: account.lastUpdated,
    hasTradeData: account.trades?.length || 0
  })

  // Show error state
  if (account.error) {
    return (
      <div className="text-center py-6 text-muted">
        <p className="text-sm text-red-400">Error retrieving closed trade data from Bybit</p>
        <p className="text-xs mt-1 opacity-70">{account.error}</p>
      </div>
    )
  }

  // Show loading state only if we have no data at all
  if (!account.closedPnL && (!account.trades || account.trades.length === 0)) {
    return (
      <div className="text-center py-6 text-muted">
        <p className="text-sm">Loading trade data...</p>
        <p className="text-xs mt-1 opacity-70">Fetching from Bybit API</p>
      </div>
    )
  }

  // Show no data state only if we have confirmed no closed P&L
  if (account.closedPnL && account.closedPnL.length === 0) {
    // Check if we have any trades in the Recent Trades but no closed P&L
    if (account.trades && account.trades.length > 0) {
      return (
        <div className="text-center py-6 text-muted">
          <div className="flex items-center justify-center mb-3">
            <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-sm font-medium">No Closed Positions Available</p>
          <p className="text-xs mt-1 opacity-70">You have {account.trades.length} recent execution records</p>
          <p className="text-xs mt-1 opacity-70">P&L will appear here when positions are fully closed</p>
          <div className="mt-3 text-xs text-blue-400">
            <p>💡 Currently showing open positions only</p>
          </div>
        </div>
      )
    } else {
      return (
        <div className="text-center py-6 text-muted">
          <div className="flex items-center justify-center mb-3">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p className="text-sm font-medium">No Trading Activity Found</p>
          <p className="text-xs mt-1 opacity-70">Start trading to see P&L analysis here</p>
        </div>
      )
    }
  }

  if (pairProfits.length === 0) {
    return (
      <div className="text-center py-6 text-muted">
        <p className="text-sm">No trading pairs found</p>
        <p className="text-xs mt-1 opacity-70">P&L calculated from closed positions in last 90 days</p>
      </div>
    )
  }

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return (
        <svg className="w-3 h-3 ml-1 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      )
    }
    return sortDirection === 'asc' ? (
      <svg className="w-3 h-3 ml-1 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-3 h-3 ml-1 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    )
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-5 gap-2 text-xs font-semibold text-muted border-b border-gray-200 dark:border-dark-600 pb-3">
        <button
          onClick={() => handleSort('symbol')}
          className="pl-1 text-left hover:text-primary-600 dark:hover:text-primary-400 transition-colors flex items-center"
        >
          Trading Pair
          {getSortIcon('symbol')}
        </button>
        <button
          onClick={() => handleSort('profit7d')}
          className="text-center hover:text-primary-600 dark:hover:text-primary-400 transition-colors flex items-center justify-center"
        >
          7D
          {getSortIcon('profit7d')}
        </button>
        <button
          onClick={() => handleSort('profit30d')}
          className="text-center hover:text-primary-600 dark:hover:text-primary-400 transition-colors flex items-center justify-center"
        >
          30D
          {getSortIcon('profit30d')}
        </button>
        <button
          onClick={() => handleSort('profit90d')}
          className="text-center hover:text-primary-600 dark:hover:text-primary-400 transition-colors flex items-center justify-center"
        >
          90D
          {getSortIcon('profit90d')}
        </button>
        <button
          onClick={() => handleSort('winRate')}
          className="text-center hover:text-primary-600 dark:hover:text-primary-400 transition-colors flex items-center justify-center"
        >
          Win Rate
          {getSortIcon('winRate')}
        </button>
      </div>

      <div className="max-h-80 overflow-y-auto">
        <div className="space-y-1">
          {pairProfits.map((pair) => (
            <div key={pair.symbol} className="grid grid-cols-5 gap-2 text-sm py-2 px-2 hover:bg-gray-50 dark:hover:bg-dark-700/50 rounded-lg border border-transparent hover:border-gray-200 dark:hover:border-dark-600 transition-all duration-150">
              <div className="font-semibold text-gray-900 dark:text-white flex items-center">
                <span className="bg-gray-100 dark:bg-dark-600 px-2 py-1 rounded text-xs">
                  {pair.symbol.replace('USDT', '')}
                </span>
              </div>
              <div className={`text-center ${getProfitColor(pair.profit7d)} tabular-nums text-xs`}>
                {formatCurrency(pair.profit7d)}
              </div>
              <div className={`text-center ${getProfitColor(pair.profit30d)} tabular-nums text-xs`}>
                {formatCurrency(pair.profit30d)}
              </div>
              <div className={`text-center ${getProfitColor(pair.profit90d)} tabular-nums text-xs`}>
                {formatCurrency(pair.profit90d)}
              </div>
              <div className={`text-center font-medium ${getWinRateColor(pair.winRate)} tabular-nums text-xs`}>
                {pair.winRate.toFixed(0)}%
                <span className="text-xs text-muted ml-1">
                  ({pair.completedTrades})
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}