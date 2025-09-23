import { useState, useMemo } from 'react'
import { useAppStore } from '../store/useAppStore'
import { BotTracker } from './BotTracker'
import { BotCard } from './BotCard'
import { useBotStore } from '../store/useBotStore'
import { calculateBotAnalytics } from '../utils/botAnalytics'

export const DaviddtechBeta = () => {
  const { accounts, accountsData } = useAppStore()
  const { bots } = useBotStore()

  // Filter states
  const [filters, setFilters] = useState({
    account: '',
    tradingPair: '',
    status: 'all',
    sortBy: 'performance',
    winRateMin: 0,
    searchTerm: '',
    selectedTags: [] as string[]
  })

  // View state
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card')

  // Get unique trading pairs from 180-day trade history
  const availableTradingPairs = useMemo(() => {
    const pairs = new Set<string>()
    accountsData.forEach(account => {
      account.closedPnL?.forEach(trade => {
        if (trade.symbol) {
          pairs.add(trade.symbol)
        }
      })
      account.trades?.forEach(trade => {
        if (trade.symbol) {
          pairs.add(trade.symbol)
        }
      })
    })
    return Array.from(pairs).sort()
  }, [accountsData])

  // Get unique tags from all bots
  const availableTags = useMemo(() => {
    const tagSet = new Set<string>()
    bots.forEach(bot => {
      if (bot.tags) {
        bot.tags.forEach(tag => tagSet.add(tag))
      }
    })
    return Array.from(tagSet).sort()
  }, [bots])

  // Handle tag selection
  const toggleTag = (tag: string) => {
    setFilters(f => ({
      ...f,
      selectedTags: f.selectedTags.includes(tag)
        ? f.selectedTags.filter(t => t !== tag)
        : [...f.selectedTags, tag]
    }))
  }

  // Filtered and sorted bots
  const filteredBots = useMemo(() => {
    let filtered = bots.filter(bot => {
      // Account filter
      if (filters.account && bot.accountId !== filters.account) return false

      // Trading pair filter
      if (filters.tradingPair && bot.tradingPair !== filters.tradingPair) return false

      // Status filter
      if (filters.status !== 'all') {
        if (filters.status === 'active' && !bot.isActive) return false
        if (filters.status === 'stopped' && bot.isActive) return false
      }

      // Search term filter
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase()
        if (!bot.name.toLowerCase().includes(searchLower) &&
            !bot.tradingPair.toLowerCase().includes(searchLower)) {
          return false
        }
      }

      // Tag filter
      if (filters.selectedTags.length > 0) {
        const botTags = bot.tags || []
        const hasSelectedTag = filters.selectedTags.some(selectedTag =>
          botTags.includes(selectedTag)
        )
        if (!hasSelectedTag) return false
      }

      return true
    })

    // Apply win rate filter and sort
    const botsWithAnalytics = filtered.map(bot => {
      const analytics = calculateBotAnalytics(bot, accountsData)
      return { bot, analytics }
    }).filter(({ analytics }) => {
      return analytics.winRate >= filters.winRateMin
    })

    // Sort bots
    botsWithAnalytics.sort((a, b) => {
      switch (filters.sortBy) {
        case 'performance':
          return b.analytics.totalPnl - a.analytics.totalPnl
        case 'winRate':
          return b.analytics.winRate - a.analytics.winRate
        case 'totalTrades':
          return b.analytics.totalTrades - a.analytics.totalTrades
        case 'name':
          return a.bot.name.localeCompare(b.bot.name)
        case 'recent':
          return new Date(b.bot.startDate).getTime() - new Date(a.bot.startDate).getTime()
        default:
          return 0
      }
    })

    return botsWithAnalytics.map(({ bot }) => bot)
  }, [bots, accountsData, filters])

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Daviddtech Beta
        </h1>
        <p className="text-muted">
          Copy Bot Tracker - Monitor and analyze your trading bot performance across different time periods and trading pairs.
        </p>
      </div>

      {/* Bot Tracker Form */}
      <div className="card p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Add New Bot
        </h2>
        <BotTracker
          accounts={accounts}
          tradingPairs={availableTradingPairs}
        />
      </div>

      {/* Filters and Search */}
      {bots.length > 0 && (
        <div className="bg-white dark:bg-dark-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Filter & Sort Bots
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {/* Search */}
            <div className="xl:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Search
              </label>
              <input
                type="text"
                placeholder="Search by name or pair..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={filters.searchTerm}
                onChange={(e) => setFilters(f => ({ ...f, searchTerm: e.target.value }))}
              />
            </div>

            {/* Account Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Account
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={filters.account}
                onChange={(e) => setFilters(f => ({ ...f, account: e.target.value }))}
              >
                <option value="">All Accounts</option>
                {accounts.map(account => (
                  <option key={account.id} value={account.id}>{account.name}</option>
                ))}
              </select>
            </div>

            {/* Trading Pair Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Trading Pair
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={filters.tradingPair}
                onChange={(e) => setFilters(f => ({ ...f, tradingPair: e.target.value }))}
              >
                <option value="">All Pairs</option>
                {availableTradingPairs.map(pair => (
                  <option key={pair} value={pair}>{pair}</option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={filters.status}
                onChange={(e) => setFilters(f => ({ ...f, status: e.target.value }))}
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="stopped">Stopped</option>
              </select>
            </div>

            {/* Sort By */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Sort By
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={filters.sortBy}
                onChange={(e) => setFilters(f => ({ ...f, sortBy: e.target.value }))}
              >
                <option value="performance">Performance (P&L)</option>
                <option value="winRate">Win Rate</option>
                <option value="totalTrades">Total Trades</option>
                <option value="name">Name (A-Z)</option>
                <option value="recent">Most Recent</option>
              </select>
            </div>
          </div>

          {/* Tags Filter */}
          {availableTags.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Filter by Tags
                </label>
                <div className="flex flex-wrap gap-2">
                  {availableTags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                        filters.selectedTags.includes(tag)
                          ? 'bg-blue-600 text-white shadow-md hover:bg-blue-700'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      <svg className="w-3 h-3 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      {tag}
                    </button>
                  ))}
                </div>
                {filters.selectedTags.length > 0 && (
                  <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                    Filtering by: {filters.selectedTags.join(', ')}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Win Rate Filter */}
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-4">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Min Win Rate: {filters.winRateMin}%
              </label>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                value={filters.winRateMin}
                onChange={(e) => setFilters(f => ({ ...f, winRateMin: parseInt(e.target.value) }))}
              />
            </div>
          </div>

          {/* Results Summary and View Toggle */}
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Showing {filteredBots.length} of {bots.length} bots
            </span>
            <div className="flex items-center space-x-4">
              {/* View Mode Toggle */}
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">View:</span>
                <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
                  <button
                    onClick={() => setViewMode('card')}
                    className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                      viewMode === 'card'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white dark:bg-dark-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                    }`}
                  >
                    <svg className="w-4 h-4 mr-1.5 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                    Cards
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`px-3 py-1.5 text-sm font-medium transition-colors border-l border-gray-300 dark:border-gray-600 ${
                      viewMode === 'list'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white dark:bg-dark-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                    }`}
                  >
                    <svg className="w-4 h-4 mr-1.5 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                    List
                  </button>
                </div>
              </div>
              {filteredBots.length !== bots.length && (
                <button
                  onClick={() => setFilters({
                    account: '',
                    tradingPair: '',
                    status: 'all',
                    sortBy: 'performance',
                    winRateMin: 0,
                    searchTerm: '',
                    selectedTags: []
                  })}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Active Bots */}
      {bots.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Active Bots ({bots.length})
          </h2>
          {viewMode === 'card' ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredBots.map(bot => (
                <BotCard
                  key={bot.id}
                  bot={bot}
                  accountsData={accountsData}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white dark:bg-dark-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              {/* List Header */}
              <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 dark:bg-dark-700 border-b border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300">
                <div className="col-span-3">Bot Name</div>
                <div className="col-span-2">Account & Pair</div>
                <div className="col-span-1 text-center">Status</div>
                <div className="col-span-1 text-right">Win Rate</div>
                <div className="col-span-1 text-right">Trades</div>
                <div className="col-span-2 text-right">Recent P&L (7d/30d)</div>
                <div className="col-span-1 text-right">Total P&L</div>
                <div className="col-span-1 text-center">Actions</div>
              </div>

              {/* List Items */}
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredBots.map(bot => {
                  const analytics = calculateBotAnalytics(bot, accountsData)
                  const account = accounts.find(acc => acc.id === bot.accountId)

                  return (
                    <div key={bot.id} className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors">
                      <div className="col-span-3">
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${
                            bot.isActive ? 'bg-green-500' : 'bg-gray-400'
                          }`} />
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">{bot.name}</div>
                            {bot.tags && bot.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {bot.tags.slice(0, 1).map((tag: string) => (
                                  <span key={tag} className="inline-block px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full">
                                    {tag}
                                  </span>
                                ))}
                                {bot.tags.length > 1 && (
                                  <span className="text-xs text-gray-500 dark:text-gray-400">+{bot.tags.length - 1}</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="col-span-2">
                        <div className="text-gray-600 dark:text-gray-400 text-sm">
                          {account?.name || 'Unknown'}
                        </div>
                        <div className="font-mono text-xs text-gray-900 dark:text-white">
                          {bot.tradingPair}
                        </div>
                      </div>
                      <div className="col-span-1 text-center">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          bot.isActive
                            ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                        }`}>
                          {bot.isActive ? 'Active' : 'Stopped'}
                        </span>
                      </div>
                      <div className="col-span-1 text-right">
                        <span className={`font-medium ${
                          analytics.winRate >= 50 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                        }`}>
                          {analytics.winRate.toFixed(1)}%
                        </span>
                      </div>
                      <div className="col-span-1 text-right text-gray-600 dark:text-gray-400">
                        {analytics.totalTrades}
                      </div>
                      <div className="col-span-2 text-right">
                        <div className="flex items-center justify-end space-x-3">
                          <div>
                            <span className="text-xs text-gray-500 dark:text-gray-400 mr-1">7d:</span>
                            <span className={`font-medium text-sm ${
                              analytics.pnl7d >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                            }`}>
                              ${analytics.pnl7d.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </span>
                          </div>
                          <div>
                            <span className="text-xs text-gray-500 dark:text-gray-400 mr-1">30d:</span>
                            <span className={`font-medium text-sm ${
                              analytics.pnl30d >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                            }`}>
                              ${analytics.pnl30d.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="col-span-1 text-right">
                        <span className={`font-medium ${
                          analytics.totalPnl >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                        }`}>
                          ${analytics.totalPnl.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </span>
                      </div>
                      <div className="col-span-1 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          {bot.daviddtechLink && (
                            <button
                              onClick={(e) => {
                                e.preventDefault()
                                const isValidUrl = (url: string) => {
                                  if (!url || url.trim() === '' || url === 'undefined' || url === 'null') return false
                                  const trimmedUrl = url.trim()
                                  if (trimmedUrl.length < 10) return false
                                  if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) return false
                                  try {
                                    const urlObj = new URL(trimmedUrl)
                                    const hostname = urlObj.hostname.toLowerCase()
                                    if (hostname.includes('localhost') || hostname === '127.0.0.1') return false
                                    if (hostname.split('.').length < 2) return false
                                    return true
                                  } catch {
                                    return false
                                  }
                                }
                                if (isValidUrl(bot.daviddtechLink)) {
                                  if (window.electronAPI?.shell?.openExternal) {
                                    window.electronAPI.shell.openExternal(bot.daviddtechLink)
                                  } else {
                                    window.open(bot.daviddtechLink, '_blank', 'noopener,noreferrer')
                                  }
                                }
                              }}
                              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm"
                              title="Open Daviddtech"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </button>
                          )}
                          {bot.tradingViewLink && (
                            <button
                              onClick={(e) => {
                                e.preventDefault()
                                if (window.electronAPI?.shell?.openExternal) {
                                  window.electronAPI.shell.openExternal(bot.tradingViewLink)
                                } else {
                                  window.open(bot.tradingViewLink, '_blank', 'noopener,noreferrer')
                                }
                              }}
                              className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 text-sm"
                              title="Open TradingView"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {bots.length === 0 && (
        <div className="card p-12 text-center">
          <div className="max-w-md mx-auto">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No Bots Added Yet
            </h3>
            <p className="text-muted mb-6">
              Start tracking your copy trading bots by adding them using the form above.
              You can monitor performance, analyze results, and compare different strategies.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}