import React from 'react'
import { AccountData } from '../types/bybit'
import { PairProfits } from './PairProfits'
import { LineChart, Line, ResponsiveContainer } from 'recharts'

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
            <span className="text-sm text-muted">Unrealized PnL</span>
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

          {account.balance && account.balance.coin.length > 0 && (
            <div className="pt-3 border-t border-gray-200 dark:border-dark-600">
              <div className="text-xs text-muted mb-2">Balances</div>
              <div className="space-y-1">
                {account.balance.coin
                  .filter(coin => parseFloat(coin.walletBalance) > 0)
                  .slice(0, 3)
                  .map(coin => (
                    <div key={coin.coin} className="flex justify-between text-xs">
                      <span>{coin.coin}</span>
                      <span>{parseFloat(coin.walletBalance).toFixed(4)}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* 30-Day Equity Chart */}
          {accountEquityData.length > 1 && (
            <div className="pt-3 border-t border-gray-200 dark:border-dark-600">
              <div className="flex justify-between items-center mb-2">
                <div className="text-xs text-muted">180-Day Equity Trend</div>
                <div className="text-xs text-muted">
                  ${Math.min(...accountEquityData.map(d => d.equity)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} - ${Math.max(...accountEquityData.map(d => d.equity)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              <div className="h-32 bg-gray-50 dark:bg-dark-700/30 rounded-lg p-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={accountEquityData}>
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