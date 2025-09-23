import { useMemo } from 'react'
import { useAppStore } from '../store/useAppStore'

export const MonthlyTradeSummary = () => {
  const { accountsData } = useAppStore()

  // Calculate monthly data from real trading data
  const monthlyData = useMemo(() => {
    const allClosedPnL = accountsData.flatMap(account => account.closedPnL || [])

    if (allClosedPnL.length === 0) {
      return []
    }

    // Limit data size to prevent hanging
    const maxTrades = 10000
    const limitedClosedPnL = allClosedPnL.slice(-maxTrades)

    // Monthly Summary with enhanced data
    const monthlyStats = limitedClosedPnL.reduce((acc, trade) => {
      const date = new Date(parseInt(trade.updatedTime))
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

      if (!acc[monthKey]) {
        acc[monthKey] = {
          month: monthKey,
          pnl: 0,
          trades: 0,
          wins: 0,
          losses: 0,
          largestWin: 0,
          largestLoss: 0,
          symbolPnL: {} as Record<string, number>,
          percentageGain: 0,
          topPairs: [] as any[]
        }
      }

      const pnl = parseFloat(trade.closedPnl)
      acc[monthKey].pnl += pnl
      acc[monthKey].trades++

      if (pnl > 0) {
        acc[monthKey].wins++
        if (pnl > acc[monthKey].largestWin) {
          acc[monthKey].largestWin = pnl
        }
      } else {
        acc[monthKey].losses++
        if (pnl < acc[monthKey].largestLoss) {
          acc[monthKey].largestLoss = pnl
        }
      }

      // Track P&L by symbol
      if (!acc[monthKey].symbolPnL[trade.symbol]) {
        acc[monthKey].symbolPnL[trade.symbol] = 0
      }
      acc[monthKey].symbolPnL[trade.symbol] += pnl

      return acc
    }, {} as Record<string, any>)

    // Calculate percentage gains and top performers for each month
    return Object.values(monthlyStats).slice(-6).map((month: any) => {
      // Get top 5 performing pairs for this month
      const topPairs = Object.entries(month.symbolPnL)
        .map(([symbol, pnl]) => ({ symbol, pnl: Number(pnl) }))
        .filter(pair => pair.pnl > 0)
        .sort((a, b) => b.pnl - a.pnl)
        .slice(0, 5)

      // Calculate percentage gain (simplified calculation)
      const percentageGain = month.pnl > 0 ? (month.pnl / 1000) * 100 : (month.pnl / 1000) * 100

      return {
        ...month,
        topPairs,
        percentageGain
      }
    })
  }, [accountsData])

  if (monthlyData.length === 0) {
    return null
  }

  return (
    <div className="card p-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
        <svg className="w-5 h-5 mr-2 text-cyan-600 dark:text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Monthly Trade Summary
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {monthlyData.slice(-6).map((month: any) => (
          <div key={month.month} className={`relative p-6 rounded-xl border-2 transition-all duration-200 hover:shadow-lg ${
            month.pnl >= 0
              ? 'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800'
              : 'bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 border-red-200 dark:border-red-800'
          }`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="text-lg font-bold text-gray-900 dark:text-white">
                {new Date(month.month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                month.pnl >= 0 ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
              }`}>
                {month.pnl >= 0 ? 'Profit' : 'Loss'}
              </div>
            </div>

            {/* Main P&L with percentage */}
            <div className="mb-4">
              <div className={`text-3xl font-bold ${month.pnl >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {month.pnl >= 0 ? '+' : ''}${Math.abs(month.pnl).toFixed(2)}
              </div>
              <div className={`text-sm font-medium ${month.pnl >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {month.percentageGain >= 0 ? '+' : ''}{month.percentageGain.toFixed(2)}% gain
              </div>
            </div>

            {/* Trade statistics */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="text-center p-2 bg-white/50 dark:bg-dark-800/50 rounded-lg">
                <div className="text-lg font-bold text-gray-900 dark:text-white">{month.trades}</div>
                <div className="text-xs text-muted">Trades</div>
              </div>
              <div className="text-center p-2 bg-white/50 dark:bg-dark-800/50 rounded-lg">
                <div className="text-lg font-bold text-gray-900 dark:text-white">{((month.wins / month.trades) * 100).toFixed(1)}%</div>
                <div className="text-xs text-muted">Win Rate</div>
              </div>
            </div>

            {/* Top performing pairs */}
            {month.topPairs && month.topPairs.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="text-xs font-medium text-gray-900 dark:text-white mb-2">🏆 Top Performers</div>
                <div className="space-y-1">
                  {month.topPairs.slice(0, 3).map((pair: any, index: number) => (
                    <div key={pair.symbol} className="flex items-center justify-between text-xs">
                      <span className="flex items-center">
                        <span className={`w-1.5 h-1.5 rounded-full mr-2 ${
                          index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : 'bg-amber-600'
                        }`}></span>
                        {pair.symbol}
                      </span>
                      <span className="font-medium text-green-600 dark:text-green-400">
                        +${pair.pnl.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Best/Worst trades */}
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <div className="text-muted">Best Trade</div>
                  <div className="font-medium text-green-600 dark:text-green-400">+${month.largestWin.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-muted">Worst Trade</div>
                  <div className="font-medium text-red-600 dark:text-red-400">${month.largestLoss.toFixed(2)}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}