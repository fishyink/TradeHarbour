import React from 'react'
import { AccountData } from '../types/bybit'
import { PairProfits } from './PairProfits'
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis } from 'recharts'

interface AccountCardProps {
  account: AccountData
}

export const AccountCard = ({ account }: AccountCardProps) => {
  const equity = account.balance ? parseFloat(account.balance.totalEquity) : 0
  const pnl = account.balance ? parseFloat(account.balance.totalPerpUPL) : 0
  const openPositions = account.positions.length

  // Generate equity curve based on real closed P&L data
  const accountEquityData = React.useMemo(() => {
    if (!account.closedPnL || account.closedPnL.length === 0) return []

    const now = Date.now()
    const oneEightyDaysAgo = now - (180 * 24 * 60 * 60 * 1000)

    // Get closed P&L from last 180 days, sorted by time
    const recentPnL = account.closedPnL
      .filter(pnl => {
        const closedTime = parseInt(pnl.updatedTime || pnl.createdTime)
        return closedTime >= oneEightyDaysAgo
      })
      .sort((a, b) => parseInt(a.updatedTime || a.createdTime) - parseInt(b.updatedTime || b.createdTime))

    if (recentPnL.length === 0) return []

    // Build cumulative equity curve from P&L
    const equityCurve = []

    // Work backwards to create starting point
    const totalPnL = recentPnL.reduce((sum, pnl) => sum + parseFloat(pnl.closedPnl), 0)
    const startingEquity = equity - totalPnL

    equityCurve.push({
      timestamp: oneEightyDaysAgo,
      equity: Math.max(startingEquity, equity * 0.5) // Don't go below 50% of current
    })

    // Add points for each closed position
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
      timestamp: now,
      equity: equity
    })

    return equityCurve
  }, [account.closedPnL, equity])


  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {account.name}
        </h3>
        <div className="flex items-center space-x-2">
          {account.error ? (
            <span className="text-xs text-danger bg-red-100 dark:bg-red-900/20 px-2 py-1 rounded-full">
              Error
            </span>
          ) : (
            <span className="text-xs text-success bg-green-100 dark:bg-green-900/20 px-2 py-1 rounded-full">
              Active
            </span>
          )}
        </div>
      </div>

      {account.error ? (
        <div className="text-sm text-danger">
          {account.error}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted">Total Equity</span>
            <span className="font-semibold text-gray-900 dark:text-white">
              ${equity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-muted">Unrealized PnL <span className="text-xs opacity-70">(24h)</span></span>
            <span className={`font-semibold ${
              pnl >= 0 ? 'text-success' : 'text-danger'
            }`}>
              {pnl >= 0 ? '+' : ''}${pnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-muted">Open Positions</span>
            <span className="font-semibold text-gray-900 dark:text-white">
              {openPositions}
            </span>
          </div>

          {/* Realized P&L Section */}
          {(() => {
            if (!account.closedPnL || account.closedPnL.length === 0) return null

            const now = Date.now()
            const day1Ago = now - (24 * 60 * 60 * 1000)
            const day7Ago = now - (7 * 24 * 60 * 60 * 1000)
            const day30Ago = now - (30 * 24 * 60 * 60 * 1000)
            const day90Ago = now - (90 * 24 * 60 * 60 * 1000)
            const day180Ago = now - (180 * 24 * 60 * 60 * 1000)

            let realized24h = 0
            let realized7d = 0
            let realized30d = 0
            let realized90d = 0
            let realized180d = 0

            account.closedPnL.forEach(position => {
              const closedTime = parseInt(position.updatedTime || position.createdTime)
              const pnl = parseFloat(position.closedPnl) || 0

              if (closedTime >= day1Ago) realized24h += pnl
              if (closedTime >= day7Ago) realized7d += pnl
              if (closedTime >= day30Ago) realized30d += pnl
              if (closedTime >= day90Ago) realized90d += pnl
              if (closedTime >= day180Ago) realized180d += pnl
            })

            const equity24hAgo = equity - realized24h
            const equity7dAgo = equity - realized7d
            const equity30dAgo = equity - realized30d
            const equity90dAgo = equity - realized90d
            const equity180dAgo = equity - realized180d

            const pct24h = equity24hAgo > 0 ? (realized24h / equity24hAgo) * 100 : 0
            const pct7d = equity7dAgo > 0 ? (realized7d / equity7dAgo) * 100 : 0
            const pct30d = equity30dAgo > 0 ? (realized30d / equity30dAgo) * 100 : 0
            const pct90d = equity90dAgo > 0 ? (realized90d / equity90dAgo) * 100 : 0
            const pct180d = equity180dAgo > 0 ? (realized180d / equity180dAgo) * 100 : 0

            return (
              <div className="pt-3 border-t border-gray-200 dark:border-dark-600">
                <div className="text-xs text-muted mb-3">Realized P&L</div>

                {/* P&L Cards - All in one row */}
                <div className="grid grid-cols-5 gap-2">
                  <div className="bg-gray-50 dark:bg-dark-700/30 rounded-lg p-2 text-center">
                    <div className="text-xs text-muted mb-1">24h</div>
                    <div className={`text-sm font-semibold ${realized24h >= 0 ? 'text-success' : 'text-danger'}`}>
                      ${Math.abs(realized24h).toFixed(2)}
                    </div>
                    <div className={`text-xs ${pct24h >= 0 ? 'text-success' : 'text-danger'}`}>
                      {Math.abs(pct24h).toFixed(2)}%
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-dark-700/30 rounded-lg p-2 text-center">
                    <div className="text-xs text-muted mb-1">7d</div>
                    <div className={`text-sm font-semibold ${realized7d >= 0 ? 'text-success' : 'text-danger'}`}>
                      ${Math.abs(realized7d).toFixed(2)}
                    </div>
                    <div className={`text-xs ${pct7d >= 0 ? 'text-success' : 'text-danger'}`}>
                      {Math.abs(pct7d).toFixed(2)}%
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-dark-700/30 rounded-lg p-2 text-center">
                    <div className="text-xs text-muted mb-1">30d</div>
                    <div className={`text-sm font-semibold ${realized30d >= 0 ? 'text-success' : 'text-danger'}`}>
                      ${Math.abs(realized30d).toFixed(2)}
                    </div>
                    <div className={`text-xs ${pct30d >= 0 ? 'text-success' : 'text-danger'}`}>
                      {Math.abs(pct30d).toFixed(2)}%
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-dark-700/30 rounded-lg p-2 text-center">
                    <div className="text-xs text-muted mb-1">90d</div>
                    <div className={`text-sm font-semibold ${realized90d >= 0 ? 'text-success' : 'text-danger'}`}>
                      ${Math.abs(realized90d).toFixed(2)}
                    </div>
                    <div className={`text-xs ${pct90d >= 0 ? 'text-success' : 'text-danger'}`}>
                      {Math.abs(pct90d).toFixed(2)}%
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-dark-700/30 rounded-lg p-2 text-center">
                    <div className="text-xs text-muted mb-1">180d</div>
                    <div className={`text-sm font-semibold ${realized180d >= 0 ? 'text-success' : 'text-danger'}`}>
                      ${Math.abs(realized180d).toFixed(2)}
                    </div>
                    <div className={`text-xs ${pct180d >= 0 ? 'text-success' : 'text-danger'}`}>
                      {Math.abs(pct180d).toFixed(2)}%
                    </div>
                  </div>
                </div>
              </div>
            )
          })()}


          {/* 30-Day Equity Chart */}
          {accountEquityData.length > 1 && (
            <div className="pt-3 border-t border-gray-200 dark:border-dark-600">
              <div className="flex justify-between items-center mb-2">
                <div className="text-xs text-muted">180-Day Equity Trend</div>
                <div className="text-xs text-muted">
                  ${Math.min(...accountEquityData.map(d => d.equity)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} - ${Math.max(...accountEquityData.map(d => d.equity)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              <div className="h-64 bg-gray-50 dark:bg-dark-700/30 rounded-lg p-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={accountEquityData}>
                    <XAxis
                      dataKey="timestamp"
                      type="number"
                      scale="time"
                      domain={['dataMin', 'dataMax']}
                      hide
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const value = payload[0].value as number
                          const timestamp = payload[0].payload.timestamp
                          const date = new Date(timestamp)
                          return (
                            <div className="bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-600 rounded-lg shadow-lg p-2 text-xs">
                              <div className="font-medium text-gray-900 dark:text-white">
                                ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </div>
                              <div className="text-gray-500 dark:text-gray-400">
                                {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </div>
                            </div>
                          )
                        }
                        return null
                      }}
                      cursor={{ stroke: '#10b981', strokeWidth: 1, strokeOpacity: 0.5 }}
                      animationDuration={0}
                    />
                    <Line
                      type="monotone"
                      dataKey="equity"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={false}
                      connectNulls={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="text-xs text-muted mt-1 opacity-70">
                Based on actual closed P&L over 180 days
              </div>
            </div>
          )}

          {/* Pair Profits Section */}
          <div className="pt-3 border-t border-gray-200 dark:border-dark-600">
            <div className="text-xs text-muted mb-3">Trading Pair Profits (7D/30D/90D)</div>
            <PairProfits account={account} />
          </div>
        </div>
      )}
    </div>
  )
}