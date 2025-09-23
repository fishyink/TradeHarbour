import { useMemo, useState } from 'react'
import { Bot, useBotStore } from '../store/useBotStore'
import { AccountData } from '../types/bybit'
import { calculateBotAnalytics } from '../utils/botAnalytics'
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts'

interface BotCardProps {
  bot: Bot
  accountsData: AccountData[]
}

export const BotCard = ({ bot, accountsData }: BotCardProps) => {
  const { stopBot, restartBot, deleteBot, updateBot } = useBotStore()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    name: bot.name,
    tradingPair: bot.tradingPair,
    daviddtechLink: bot.daviddtechLink,
    tradingViewLink: bot.tradingViewLink,
    tags: bot.tags || []
  })

  // Calculate analytics
  const analytics = useMemo(() => {
    return calculateBotAnalytics(bot, accountsData)
  }, [bot, accountsData])

  // Get account name
  const accountName = useMemo(() => {
    const account = accountsData.find(acc => acc.id === bot.accountId)
    return account?.name || 'Unknown Account'
  }, [bot.accountId, accountsData])

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

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

  // Helper function to validate and format URLs
  const isValidUrl = (url: string) => {
    if (!url || url.trim() === '' || url === 'undefined' || url === 'null') return false

    // Check for common invalid patterns
    const trimmedUrl = url.trim()
    if (trimmedUrl.length < 10) return false // Minimum valid URL length (http://a.co)
    if (!trimmedUrl.includes('.')) return false // Must have domain

    // Must start with http:// or https://
    if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) return false

    try {
      const testUrl = new URL(trimmedUrl)
      // Additional validation: must have http/https protocol and valid host
      const isValidProtocol = testUrl.protocol === 'http:' || testUrl.protocol === 'https:'
      const hasValidHost = testUrl.hostname && testUrl.hostname.includes('.') && testUrl.hostname.length > 3

      // Reject localhost, IP addresses, and common invalid patterns
      const hostname = testUrl.hostname.toLowerCase()
      if (hostname === 'localhost' || hostname.startsWith('127.') || hostname.startsWith('192.168.')) return false
      if (hostname.includes('example.') || hostname.includes('test.') || hostname.includes('localhost')) return false

      return isValidProtocol && hasValidHost
    } catch {
      return false
    }
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

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleSave = () => {
    updateBot(bot.id, {
      name: editForm.name.trim(),
      tradingPair: editForm.tradingPair,
      daviddtechLink: editForm.daviddtechLink.trim(),
      tradingViewLink: editForm.tradingViewLink.trim(),
      tags: editForm.tags
    })
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditForm({
      name: bot.name,
      tradingPair: bot.tradingPair,
      daviddtechLink: bot.daviddtechLink,
      tradingViewLink: bot.tradingViewLink,
      tags: bot.tags || []
    })
    setIsEditing(false)
  }

  const getPnlColor = (value: number) => {
    if (value > 0) return 'text-green-600 dark:text-green-400'
    if (value < 0) return 'text-red-600 dark:text-red-400'
    return 'text-gray-600 dark:text-gray-400'
  }

  return (
    <div className="bg-white dark:bg-dark-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-xl transition-all duration-300 hover:border-gray-300 dark:hover:border-gray-600">
      {/* Header Section with Clean Layout */}
      <div className="relative p-4 pb-3">
        {/* Status Indicator Glow */}
        <div className={`absolute top-0 left-0 right-0 h-1 ${
          bot.isActive
            ? 'bg-gradient-to-r from-green-400 to-emerald-500'
            : 'bg-gradient-to-r from-gray-400 to-gray-500'
        }`} />

        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">
                {bot.name}
              </h3>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
                bot.isActive
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 shadow-sm'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400'
              }`}>
                <div className={`w-2 h-2 rounded-full mr-2 ${
                  bot.isActive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                }`} />
                {bot.isActive ? 'Live' : 'Stopped'}
              </span>
            </div>

            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span className="font-medium text-gray-600 dark:text-gray-300">{accountName}</span>
              </div>
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                <span className="font-mono text-sm font-semibold text-gray-700 dark:text-gray-300">{bot.tradingPair}</span>
              </div>
            </div>

            {/* Tags Display */}
            {bot.tags && bot.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {bot.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2.5 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs font-medium rounded-md border border-blue-200 dark:border-blue-800"
                  >
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons - Redesigned */}
          <div className="flex items-center space-x-2 ml-4">
            {!isEditing ? (
              <>
                <button
                  onClick={handleStopRestart}
                  className={`inline-flex items-center px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                    bot.isActive
                      ? 'bg-red-500 hover:bg-red-600 text-white focus:ring-red-500 shadow-md hover:shadow-lg'
                      : 'bg-green-500 hover:bg-green-600 text-white focus:ring-green-500 shadow-md hover:shadow-lg'
                  }`}
                >
                  {bot.isActive ? (
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10h6v4H9z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h8m-9 1V7a3 3 0 013-3h6a3 3 0 013 3v8a3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                    </svg>
                  )}
                  {bot.isActive ? 'Stop' : 'Start'}
                </button>
                <button
                  onClick={handleEdit}
                  className="inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium bg-blue-500 hover:bg-blue-600 text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-md hover:shadow-lg"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={handleDelete}
                  className={`inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                    showDeleteConfirm
                      ? 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500 shadow-lg'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-600 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-300 focus:ring-gray-500'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  {showDeleteConfirm && <span className="ml-1">Confirm</span>}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleSave}
                  className="inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium bg-green-500 hover:bg-green-600 text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 shadow-md hover:shadow-lg"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Save
                </button>
                <button
                  onClick={handleCancel}
                  className="inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium bg-gray-500 hover:bg-gray-600 text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 shadow-md hover:shadow-lg"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>

        {/* Period Info */}
        <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2">
          <div className="flex items-center space-x-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{formatDate(bot.startDate)} → {bot.endDate ? formatDate(bot.endDate) : 'Active'}</span>
          </div>
        </div>
      </div>


      {/* Edit Form */}
      {isEditing && (
        <div className="px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border-t border-blue-200 dark:border-blue-800">
          <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-3">Edit Bot Details</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Bot Name
              </label>
              <input
                type="text"
                value={editForm.name}
                onChange={(e) => setEditForm(f => ({ ...f, name: e.target.value }))}
                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Trading Pair
              </label>
              <input
                type="text"
                value={editForm.tradingPair}
                onChange={(e) => setEditForm(f => ({ ...f, tradingPair: e.target.value }))}
                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Daviddtech URL
              </label>
              <input
                type="url"
                value={editForm.daviddtechLink}
                onChange={(e) => setEditForm(f => ({ ...f, daviddtechLink: e.target.value }))}
                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder="https://example.com"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                TradingView URL
              </label>
              <input
                type="url"
                value={editForm.tradingViewLink}
                onChange={(e) => setEditForm(f => ({ ...f, tradingViewLink: e.target.value }))}
                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder="https://tradingview.com"
              />
            </div>
          </div>
        </div>
      )}

      {/* Key Performance Metrics - Redesigned */}
      <div className="px-6 py-4 bg-gray-50/50 dark:bg-gray-900/50">
        <div className="grid grid-cols-4 gap-6">
          {/* Win Rate */}
          <div className="text-center">
            <div className="relative">
              <div className={`text-3xl font-black tracking-tight ${
                analytics.winRate >= 60 ? 'text-green-600 dark:text-green-400' :
                analytics.winRate >= 50 ? 'text-yellow-600 dark:text-yellow-400' :
                'text-red-600 dark:text-red-400'
              }`}>
                {formatPercentage(analytics.winRate)}
              </div>
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mt-1">
                Win Rate
              </div>
            </div>
          </div>

          {/* Total Trades */}
          <div className="text-center">
            <div className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
              {analytics.totalTrades}
            </div>
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mt-1">
              Trades
            </div>
          </div>

          {/* Total P&L */}
          <div className="text-center">
            <div className={`text-3xl font-black tracking-tight ${getPnlColor(analytics.totalPnl)}`}>
              {formatCurrency(analytics.totalPnl)}
            </div>
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mt-1">
              Total P&L
            </div>
          </div>

          {/* Sharpe Ratio */}
          <div className="text-center">
            <div className={`text-3xl font-black tracking-tight ${
              (analytics.sharpeRatio || 0) >= 1 ? 'text-green-600 dark:text-green-400' :
              (analytics.sharpeRatio || 0) >= 0.5 ? 'text-yellow-600 dark:text-yellow-400' :
              'text-red-600 dark:text-red-400'
            }`}>
              {analytics.sharpeRatio?.toFixed(2) || 'N/A'}
            </div>
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mt-1">
              Sharpe
            </div>
          </div>
        </div>
      </div>

      {/* Time-Based P&L Performance */}
      <div className="px-6 py-4">
        <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-3">Performance Timeline</h4>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white dark:bg-dark-700 rounded-xl p-4 border border-gray-200 dark:border-gray-600 shadow-sm">
            <div className={`text-lg font-bold ${getPnlColor(analytics.pnl7d)} mb-1`}>
              {formatCurrency(analytics.pnl7d)}
            </div>
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">7 Days</div>
          </div>
          <div className="bg-white dark:bg-dark-700 rounded-xl p-4 border border-gray-200 dark:border-gray-600 shadow-sm">
            <div className={`text-lg font-bold ${getPnlColor(analytics.pnl30d)} mb-1`}>
              {formatCurrency(analytics.pnl30d)}
            </div>
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">30 Days</div>
          </div>
          <div className="bg-white dark:bg-dark-700 rounded-xl p-4 border border-gray-200 dark:border-gray-600 shadow-sm">
            <div className={`text-lg font-bold ${getPnlColor(analytics.pnl90d)} mb-1`}>
              {formatCurrency(analytics.pnl90d)}
            </div>
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">90 Days</div>
          </div>
        </div>
      </div>

      {/* Trade Extremes & Streaks */}
      <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
        <div className="grid grid-cols-2 gap-6">
          {/* Best/Worst Trades */}
          <div className="space-y-3">
            <h5 className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Trade Extremes</h5>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Best:</span>
                <span className={`font-bold ${getPnlColor(analytics.bestTrade)}`}>
                  {formatCurrency(analytics.bestTrade)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Worst:</span>
                <span className={`font-bold ${getPnlColor(analytics.worstTrade)}`}>
                  {formatCurrency(analytics.worstTrade)}
                </span>
              </div>
            </div>
          </div>

          {/* Streak Info */}
          <div className="space-y-3">
            <h5 className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Win/Loss Streaks</h5>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Max Wins:</span>
                <span className="font-bold text-green-600 dark:text-green-400">
                  {analytics.maxWinsInRow}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Max Losses:</span>
                <span className="font-bold text-red-600 dark:text-red-400">
                  {analytics.maxLossesInRow}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>


      {/* Recent Trading Activity */}
      {analytics.lastFiveTrades.length > 0 && (
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Recent Trades</h4>
            <span className="text-xs text-gray-500 dark:text-gray-400">Last 5</span>
          </div>
          <div className="flex space-x-2">
            {analytics.lastFiveTrades.map((trade, index) => (
              <div
                key={index}
                className={`flex-1 group relative overflow-hidden rounded-xl border-2 transition-all duration-200 hover:scale-105 cursor-pointer ${
                  trade.isWin
                    ? 'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-700 hover:border-green-300'
                    : 'bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 border-red-200 dark:border-red-700 hover:border-red-300'
                }`}
                title={`${trade.isWin ? 'WIN' : 'LOSS'}: ${formatCurrency(trade.pnl)}`}
              >
                <div className="p-3">
                  <div className={`text-xs font-bold uppercase tracking-wider mb-1 ${
                    trade.isWin ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'
                  }`}>
                    {trade.isWin ? 'WIN' : 'LOSS'}
                  </div>
                  <div className={`text-sm font-bold ${
                    trade.isWin ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300'
                  }`}>
                    {formatCurrency(trade.pnl)}
                  </div>
                </div>
                {/* Indicator dot */}
                <div className={`absolute top-2 right-2 w-2 h-2 rounded-full ${
                  trade.isWin ? 'bg-green-500' : 'bg-red-500'
                }`} />
              </div>
            ))}
            {/* Fill remaining slots if less than 5 trades */}
            {Array.from({ length: 5 - analytics.lastFiveTrades.length }, (_, index) => (
              <div
                key={`empty-${index}`}
                className="flex-1 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50"
              >
                <div className="p-3 text-center">
                  <div className="text-xs text-gray-400 dark:text-gray-500 font-medium">-</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Performance Chart */}
      {analytics.equityData.length > 0 && (
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Performance Chart</h4>
            <div className={`text-xs px-2 py-1 rounded-full font-medium ${
              analytics.totalPnl >= 0
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            }`}>
              {analytics.totalPnl >= 0 ? 'Profitable' : 'Unprofitable'}
            </div>
          </div>
          <div className="h-32 bg-gray-50 dark:bg-gray-900/50 rounded-xl p-3">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics.equityData}>
                <XAxis
                  dataKey="timestamp"
                  type="number"
                  scale="time"
                  domain={['dataMin', 'dataMax']}
                  tickFormatter={(value) => new Date(value).toLocaleDateString()}
                  hide
                />
                <YAxis hide />
                <Tooltip
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  formatter={(value: number) => [formatCurrency(value), 'P&L']}
                  contentStyle={{
                    backgroundColor: 'rgba(0, 0, 0, 0.9)',
                    border: 'none',
                    borderRadius: '12px',
                    color: 'white',
                    fontSize: '12px',
                    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="equity"
                  stroke={analytics.totalPnl >= 0 ? "#10b981" : "#ef4444"}
                  strokeWidth={3}
                  dot={false}
                  filter="drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Action Links */}
      {(bot.daviddtechLink || bot.tradingViewLink) && (
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700">
          <div className="flex space-x-3">
            {bot.daviddtechLink ? (
              isValidUrl(bot.daviddtechLink) ? (
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    // Double-check validation before opening
                    if (isValidUrl(bot.daviddtechLink)) {
                      // Try to use electron API to open in external browser
                      if (window.electronAPI?.shell?.openExternal) {
                        window.electronAPI.shell.openExternal(bot.daviddtechLink)
                      } else {
                        // Fallback to window.open for web version
                        window.open(bot.daviddtechLink, '_blank', 'noopener,noreferrer')
                      }
                    }
                  }}
                  className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold bg-blue-500 text-white hover:bg-blue-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-md hover:shadow-lg"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Daviddtech
                </button>
              ) : (
                <span className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold bg-gray-400 text-white cursor-not-allowed opacity-60">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  Invalid Link
                </span>
              )
            ) : null}
            {bot.tradingViewLink ? (
              isValidUrl(bot.tradingViewLink) ? (
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    // Double-check validation before opening
                    if (isValidUrl(bot.tradingViewLink)) {
                      // Try to use electron API to open in external browser
                      if (window.electronAPI?.shell?.openExternal) {
                        window.electronAPI.shell.openExternal(bot.tradingViewLink)
                      } else {
                        // Fallback to window.open for web version
                        window.open(bot.tradingViewLink, '_blank', 'noopener,noreferrer')
                      }
                    }
                  }}
                  className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold bg-green-500 text-white hover:bg-green-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 shadow-md hover:shadow-lg"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  TradingView
                </button>
              ) : (
                <span className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold bg-gray-400 text-white cursor-not-allowed opacity-60">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  Invalid Link
                </span>
              )
            ) : null}
          </div>
        </div>
      )}

      {/* No Data Message */}
      {analytics.totalTrades === 0 && (
        <div className="text-center py-4 text-muted">
          <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-sm">No trading data found for this bot configuration</p>
        </div>
      )}
    </div>
  )
}