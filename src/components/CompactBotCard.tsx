import { useState, useMemo } from 'react'
import { Bot, useBotStore } from '../store/useBotStore'
import { UnifiedAccountData } from '../types/exchanges'
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts'

interface CompactBotCardProps {
  bot: Bot
  analytics: any
  accountsData: UnifiedAccountData[]
  isExpanded?: boolean
}

export const CompactBotCard = ({ bot, analytics, accountsData, isExpanded = false }: CompactBotCardProps) => {
  const { stopBot, restartBot, deleteBot, updateBot } = useBotStore()
  const [expanded, setExpanded] = useState(isExpanded)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)

  // Get account name
  const accountName = useMemo(() => {
    const account = accountsData.find(acc => acc.id === bot.accountId)
    return account?.name || 'Unknown Account'
  }, [bot.accountId, accountsData])

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  }

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  const getPnlColor = (value: number) => {
    if (value > 0) return 'text-green-600 dark:text-green-400'
    if (value < 0) return 'text-red-600 dark:text-red-400'
    return 'text-gray-600 dark:text-gray-400'
  }

  const getPnlBgColor = (value: number) => {
    if (value > 0) return 'bg-green-50 dark:bg-green-900/10'
    if (value < 0) return 'bg-red-50 dark:bg-red-900/10'
    return 'bg-gray-50 dark:bg-gray-800'
  }

  // Format P&L values - show currency or NIL if exactly 0
  const formatPnlValue = (value: number) => {
    if (value === 0) return 'NIL'
    return formatCurrency(value)
  }

  const handleStopRestart = () => {
    if (bot.isActive) {
      stopBot(bot.id)
    } else {
      restartBot(bot.id)
    }
  }

  const handleDelete = () => {
    if (showDeleteConfirm) {
      deleteBot(bot.id)
      setShowDeleteConfirm(false)
    } else {
      setShowDeleteConfirm(true)
      setTimeout(() => setShowDeleteConfirm(false), 3000)
    }
  }

  // Prepare equity chart data
  const equityChartData = useMemo(() => {
    if (!analytics.equityData || analytics.equityData.length === 0) return []

    return analytics.equityData.map((point: any, index: number) => ({
      ...point,
      index,
      formattedTime: new Date(point.timestamp).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      })
    }))
  }, [analytics.equityData])

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-all duration-200">
      {/* Status Indicator */}
      <div className={`h-1 ${
        bot.isActive
          ? 'bg-gradient-to-r from-emerald-400 via-green-500 to-emerald-600'
          : 'bg-gradient-to-r from-gray-400 via-gray-500 to-gray-600'
      }`} />

      {/* Compact List Layout */}
      <div className="p-4">
        <div className="grid grid-cols-12 gap-4 items-center">
          {/* Column 1-2: Bot Identity - Restore coin pair label */}
          <div className="col-span-2">
            <div className="flex items-center space-x-2 mb-2">
              <div className={`w-2 h-2 rounded-full ${
                bot.isActive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
              }`} />
              <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate">
                {bot.name}
              </h3>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                {bot.tradingPair}
              </span>
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">{accountName}</div>
          </div>

          {/* Column 3: Start Date */}
          <div className="col-span-1 text-center">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Start</div>
            <div className="text-xs font-semibold text-gray-900 dark:text-white">
              {new Date(bot.startDate).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: '2-digit'
              })}
            </div>
          </div>

          {/* Column 4-7: Period P&L - Showing actual values */}
          <div className="col-span-1 text-center">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">7D</div>
            <div className={`text-xs font-bold ${getPnlColor(analytics.pnl7d)}`}>
              {formatPnlValue(analytics.pnl7d)}
            </div>
          </div>

          <div className="col-span-1 text-center">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">30D</div>
            <div className={`text-xs font-bold ${getPnlColor(analytics.pnl30d)}`}>
              {formatPnlValue(analytics.pnl30d)}
            </div>
          </div>

          <div className="col-span-1 text-center">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">90D</div>
            <div className={`text-xs font-bold ${getPnlColor(analytics.pnl90d)}`}>
              {formatPnlValue(analytics.pnl90d)}
            </div>
          </div>

          <div className="col-span-1 text-center">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">180D</div>
            <div className={`text-xs font-bold ${getPnlColor(analytics.pnl180d)}`}>
              {formatPnlValue(analytics.pnl180d)}
            </div>
          </div>

          {/* Column 8-9: Key Metrics */}
          <div className="col-span-1 text-center">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Win Rate</div>
            <div className="text-xs font-bold text-blue-600 dark:text-blue-400">
              {formatPercentage(analytics.winRate)}
            </div>
          </div>

          <div className="col-span-1 text-center">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Trades</div>
            <div className="text-xs font-bold text-gray-900 dark:text-white">
              {analytics.totalTrades}
            </div>
          </div>

          {/* Column 10: Total P&L */}
          <div className="col-span-1 text-center">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total P&L</div>
            <div className={`text-sm font-bold ${getPnlColor(analytics.totalPnl)}`}>
              {formatCurrency(analytics.totalPnl)}
            </div>
          </div>

          {/* Column 11: Sharpe */}
          <div className="col-span-1 text-center">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Sharpe</div>
            <div className="text-xs font-bold text-purple-600 dark:text-purple-400">
              {analytics.sharpeRatio?.toFixed(2) || 'N/A'}
            </div>
          </div>

          {/* Column 12: Actions - Smaller buttons */}
          <div className="col-span-1 flex justify-center space-x-1">
            <button
              onClick={() => setShowEditModal(true)}
              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-all duration-200"
              title="Edit Bot"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md transition-all duration-200"
              title={expanded ? 'Collapse' : 'Expand Details'}
            >
              <svg
                className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Improved Expanded Details */}
        {expanded && (
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
            {/* Main Content Grid: Chart on Left, Data on Right - Better Spacing */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-4">
              {/* Left: Performance Chart - 3 columns */}
              <div className="lg:col-span-3">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-base font-bold text-gray-900 dark:text-white">Performance Chart</h4>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {analytics.totalTrades} trades • {Math.ceil((Date.now() - new Date(bot.startDate).getTime()) / (1000 * 60 * 60 * 24))} days
                  </div>
                </div>

                <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-lg p-3 h-64">
                  {equityChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={equityChartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                        <XAxis
                          dataKey="formattedTime"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 10, fill: '#6B7280' }}
                          interval="preserveStartEnd"
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 10, fill: '#6B7280' }}
                          tickFormatter={(value) => `$${(value / 1000).toFixed(1)}k`}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                            border: 'none',
                            borderRadius: '6px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                            fontSize: '11px'
                          }}
                          formatter={(value: any) => [formatCurrency(value), 'Equity']}
                          labelFormatter={(label) => `Date: ${label}`}
                        />
                        <Line
                          type="monotone"
                          dataKey="equity"
                          stroke={analytics.totalPnl >= 0 ? "#10b981" : "#ef4444"}
                          strokeWidth={2}
                          dot={false}
                          strokeLinecap="round"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <div className="text-center">
                        <svg className="w-8 h-8 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                        <p className="text-gray-500 dark:text-gray-400 text-xs">No performance data</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Data Sections - 2 columns */}
              <div className="lg:col-span-2 space-y-4">
                {/* Recent Trades - Show 5 with nice gradient styling */}
                <div>
                  <h4 className="text-base font-bold text-gray-900 dark:text-white mb-3">Recent Trades</h4>
                  <div className="grid grid-cols-5 gap-2">
                    {Array.from({ length: 5 }, (_, index) => {
                      const trade = analytics.lastFiveTrades && analytics.lastFiveTrades[index]
                      if (!trade) {
                        return (
                          <div
                            key={`empty-${index}`}
                            className="bg-gray-100 dark:bg-gray-700 rounded-xl p-3 h-16 flex items-center justify-center opacity-50"
                          >
                            <span className="text-gray-400 text-xs">—</span>
                          </div>
                        )
                      }

                      return (
                        <div
                          key={index}
                          className={`rounded-xl p-3 h-16 flex flex-col items-center justify-center transition-all duration-200 hover:scale-105 cursor-pointer border-2 ${
                            trade.isWin
                              ? 'border-green-500 bg-green-500/20 text-green-700 dark:text-green-300 hover:bg-green-500/30'
                              : 'border-red-500 bg-red-500/20 text-red-700 dark:text-red-300 hover:bg-red-500/30'
                          }`}
                          title={`${new Date(trade.timestamp).toLocaleDateString()}`}
                        >
                          <div className="text-xs font-bold mb-1">
                            {trade.isWin ? 'WIN' : 'LOSS'}
                          </div>
                          <div className="text-xs font-semibold">
                            {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Performance Stats - Improved styling */}
                <div>
                  <h4 className="text-base font-bold text-gray-900 dark:text-white mb-3">Performance Stats</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                      <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Avg Trade</div>
                      <div className={`text-lg font-bold ${getPnlColor(analytics.totalPnl / analytics.totalTrades)}`}>
                        {analytics.totalTrades > 0 ? formatCurrency(analytics.totalPnl / analytics.totalTrades) : 'N/A'}
                      </div>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                      <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Best Trade</div>
                      <div className={`text-lg font-bold ${getPnlColor(analytics.bestTrade)}`}>
                        {formatCurrency(analytics.bestTrade)}
                      </div>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                      <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Worst Trade</div>
                      <div className={`text-lg font-bold ${getPnlColor(analytics.worstTrade)}`}>
                        {formatCurrency(analytics.worstTrade)}
                      </div>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                      <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Days Active</div>
                      <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                        {Math.ceil((Date.now() - new Date(bot.startDate).getTime()) / (1000 * 60 * 60 * 24))}
                      </div>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                      <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Max Win Streak</div>
                      <div className="text-lg font-bold text-green-600 dark:text-green-400">
                        {analytics.maxWinsInRow}
                      </div>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                      <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Max Loss Streak</div>
                      <div className="text-lg font-bold text-red-600 dark:text-red-400">
                        {analytics.maxLossesInRow}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Row: Configuration & Controls - More Compact */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Configuration */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                <h5 className="text-sm font-bold text-gray-900 dark:text-white mb-2">Configuration</h5>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Pair</span>
                    <span className="font-semibold">{bot.tradingPair}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Account</span>
                    <span className="font-semibold">{accountName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Status</span>
                    <span className={`font-semibold ${
                      bot.isActive ? 'text-green-600' : 'text-gray-600'
                    }`}>
                      {bot.isActive ? 'Active' : 'Stopped'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Performance</span>
                    <span className={`font-semibold ${
                      analytics.totalPnl >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {analytics.totalPnl >= 0 ? 'Profitable' : 'Unprofitable'}
                    </span>
                  </div>
                </div>
                {bot.tags && bot.tags.length > 0 && (
                  <div className="mt-2">
                    <div className="flex flex-wrap gap-1">
                      {bot.tags.map(tag => (
                        <span
                          key={tag}
                          className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs font-medium"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Links */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                <h5 className="text-sm font-bold text-gray-900 dark:text-white mb-2">External Links</h5>
                <div className="space-y-1">
                  {bot.daviddtechLink && bot.daviddtechLink !== 'undefined' && (
                    <a
                      href={bot.daviddtechLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-1 p-1.5 bg-white dark:bg-gray-700 rounded text-xs hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                    >
                      <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      <span>DavidDTech</span>
                    </a>
                  )}
                  {bot.tradingViewLink && bot.tradingViewLink !== 'undefined' && (
                    <a
                      href={bot.tradingViewLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-1 p-1.5 bg-white dark:bg-gray-700 rounded text-xs hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                    >
                      <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      <span>TradingView</span>
                    </a>
                  )}
                </div>
              </div>

              {/* Controls - Match screenshot button styling exactly */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                <h5 className="text-sm font-bold text-gray-900 dark:text-white mb-3">Controls</h5>
                <div className="space-y-2">
                  <button
                    onClick={() => setShowEditModal(true)}
                    className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Edit Bot
                  </button>
                  <div className="flex space-x-2">
                    <button
                      onClick={handleStopRestart}
                      className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        bot.isActive
                          ? 'bg-red-600 text-white hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700'
                          : 'bg-green-600 text-white hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700'
                      }`}
                    >
                      {bot.isActive ? 'Stop Tracking' : 'Resume Tracking'}
                    </button>
                    <button
                      onClick={handleDelete}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        showDeleteConfirm
                          ? 'bg-red-700 text-white hover:bg-red-800'
                          : 'bg-gray-600 text-white hover:bg-gray-700 dark:bg-gray-600 dark:hover:bg-gray-700'
                      }`}
                    >
                      {showDeleteConfirm ? 'Confirm Delete' : 'Delete'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Edit Bot</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">Edit functionality coming soon...</p>
            <button
              onClick={() => setShowEditModal(false)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}