import { useState, useMemo } from 'react'
import { useAppStore } from '../store/useAppStore'
import { BotTracker } from './BotTracker'
import { BotCard } from './BotCard'
import { BotsList } from './BotsList'
import { CompactBotCard } from './CompactBotCard'
import { useBotStore } from '../store/useBotStore'
import { calculateBotAnalytics } from '../utils/botAnalytics'

export const BotsDashboard = () => {
  const { accounts, accountsData } = useAppStore()
  const { bots, addBot } = useBotStore()

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

  // Using list view only

  // Add bot modal state
  const [showAddBotModal, setShowAddBotModal] = useState(false)
  const [newBot, setNewBot] = useState({
    name: '',
    startDate: new Date().toISOString().split('T')[0],
    accountId: '',
    tradingPair: '',
    daviddtechLink: '',
    tradingViewLink: '',
    tags: [] as string[]
  })

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

  // Filter and sort bots
  const filteredBots = useMemo(() => {
    let filtered = bots.filter(bot => {
      // Account filter
      if (filters.account && bot.accountId !== filters.account) return false

      // Trading pair filter
      if (filters.tradingPair && bot.tradingPair !== filters.tradingPair) return false

      // Status filter
      if (filters.status !== 'all' && bot.status !== filters.status) return false

      // Win rate filter
      const analytics = calculateBotAnalytics(bot, accountsData)
      if (analytics.winRate < filters.winRateMin) return false

      // Search term filter
      if (filters.searchTerm) {
        const searchTerm = filters.searchTerm.toLowerCase()
        const matchesName = bot.name.toLowerCase().includes(searchTerm)
        const matchesPair = bot.tradingPair.toLowerCase().includes(searchTerm)
        const matchesTags = bot.tags?.some(tag => tag.toLowerCase().includes(searchTerm))
        if (!matchesName && !matchesPair && !matchesTags) return false
      }

      // Tags filter
      if (filters.selectedTags.length > 0) {
        const hasSelectedTag = filters.selectedTags.some(tag => bot.tags?.includes(tag))
        if (!hasSelectedTag) return false
      }

      return true
    })

    // Sort bots
    filtered.sort((a, b) => {
      const analyticsA = calculateBotAnalytics(a, accountsData)
      const analyticsB = calculateBotAnalytics(b, accountsData)

      switch (filters.sortBy) {
        case 'performance':
          return analyticsB.totalPnl - analyticsA.totalPnl
        case 'winRate':
          return analyticsB.winRate - analyticsA.winRate
        case 'trades':
          return analyticsB.totalTrades - analyticsA.totalTrades
        case 'pnl7d':
          return analyticsB.pnl7d - analyticsA.pnl7d
        case 'pnl30d':
          return analyticsB.pnl30d - analyticsA.pnl30d
        case 'pnl90d':
          return analyticsB.pnl90d - analyticsA.pnl90d
        case 'pnl180d':
          return analyticsB.pnl180d - analyticsA.pnl180d
        case 'name':
          return a.name.localeCompare(b.name)
        case 'tradingPair':
          return a.tradingPair.localeCompare(b.tradingPair)
        case 'startDate':
          return new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
        case 'account':
          const accountA = accountsData.find(acc => acc.id === a.accountId)?.name || ''
          const accountB = accountsData.find(acc => acc.id === b.accountId)?.name || ''
          return accountA.localeCompare(accountB)
        default:
          return 0
      }
    })

    return filtered
  }, [bots, filters, accountsData])

  // Add bot handlers
  const handleAddBot = () => {
    if (!newBot.name || !newBot.accountId || !newBot.tradingPair) {
      alert('Please fill in all required fields (Name, Account, Trading Pair)')
      return
    }

    addBot(newBot)

    // Reset form
    setNewBot({
      name: '',
      startDate: new Date().toISOString().split('T')[0],
      accountId: '',
      tradingPair: '',
      daviddtechLink: '',
      tradingViewLink: '',
      tags: []
    })

    setShowAddBotModal(false)
  }

  const handleCancelAddBot = () => {
    setShowAddBotModal(false)
    // Reset form
    setNewBot({
      name: '',
      startDate: new Date().toISOString().split('T')[0],
      accountId: '',
      tradingPair: '',
      daviddtechLink: '',
      tradingViewLink: '',
      tags: []
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Bots Dashboard</h1>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-muted-foreground">
            {filteredBots.length} of {bots.length} bots
          </span>
          <button
            onClick={() => setShowAddBotModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span>Add Bot</span>
          </button>
        </div>
      </div>

      {/* Filters Section */}
      <div className="rounded-lg border bg-card p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Account Filter */}
          <div>
            <label className="text-sm font-medium mb-2 block">Account</label>
            <select
              value={filters.account}
              onChange={(e) => setFilters(prev => ({ ...prev, account: e.target.value }))}
              className="w-full px-3 py-2 rounded-md border bg-background"
            >
              <option value="">All Accounts</option>
              {accounts.map(account => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </div>

          {/* Trading Pair Filter */}
          <div>
            <label className="text-sm font-medium mb-2 block">Trading Pair</label>
            <select
              value={filters.tradingPair}
              onChange={(e) => setFilters(prev => ({ ...prev, tradingPair: e.target.value }))}
              className="w-full px-3 py-2 rounded-md border bg-background"
            >
              <option value="">All Pairs</option>
              {availableTradingPairs.map(pair => (
                <option key={pair} value={pair}>
                  {pair}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="text-sm font-medium mb-2 block">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="w-full px-3 py-2 rounded-md border bg-background"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="stopped">Stopped</option>
            </select>
          </div>

          {/* Sort By */}
          <div>
            <label className="text-sm font-medium mb-2 block">Sort By</label>
            <select
              value={filters.sortBy}
              onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
              className="w-full px-3 py-2 rounded-md border bg-background"
            >
              <option value="performance">P&L Performance</option>
              <option value="winRate">Win Rate</option>
              <option value="trades">Total Trades</option>
              <option value="name">Name (A-Z)</option>
              <option value="account">Account</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search */}
          <div>
            <label className="text-sm font-medium mb-2 block">Search</label>
            <input
              type="text"
              placeholder="Search bots..."
              value={filters.searchTerm}
              onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
              className="w-full px-3 py-2 rounded-md border bg-background"
            />
          </div>
        </div>

        {/* Important Notice */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <div className="flex items-start space-x-2">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Important:</strong> The "Stop" button only stops data tracking in this dashboard. It does not affect your actual trades or bots running on the exchange.
            </div>
          </div>
        </div>
      </div>

      {/* Bot Display - List View Only */}
      <BotsList
        filters={filters}
        onSortChange={(sortBy, sortDirection) => {
          setFilters(prev => ({ ...prev, sortBy }))
        }}
      />

      {/* Add Bot Modal */}
      {showAddBotModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Add New Bot</h2>
              <button
                onClick={handleCancelAddBot}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-6">
              {/* Bot Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Bot Name *
                </label>
                <input
                  type="text"
                  value={newBot.name}
                  onChange={(e) => setNewBot(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter bot name (e.g., BTCUSDT Scalper)"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Account */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Account *
                  </label>
                  <select
                    value={newBot.accountId}
                    onChange={(e) => setNewBot(prev => ({ ...prev, accountId: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select Account</option>
                    {accounts.map(account => (
                      <option key={account.id} value={account.id}>
                        {account.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Trading Pair */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Trading Pair *
                  </label>
                  <select
                    value={newBot.tradingPair}
                    onChange={(e) => setNewBot(prev => ({ ...prev, tradingPair: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select Trading Pair</option>
                    {availableTradingPairs.map(pair => (
                      <option key={pair} value={pair}>
                        {pair}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={newBot.startDate}
                  onChange={(e) => setNewBot(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* DavidDTech Link */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  DavidDTech Link
                </label>
                <input
                  type="url"
                  value={newBot.daviddtechLink}
                  onChange={(e) => setNewBot(prev => ({ ...prev, daviddtechLink: e.target.value }))}
                  placeholder="https://..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* TradingView Link */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  TradingView Link
                </label>
                <input
                  type="url"
                  value={newBot.tradingViewLink}
                  onChange={(e) => setNewBot(prev => ({ ...prev, tradingViewLink: e.target.value }))}
                  placeholder="https://..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tags
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {newBot.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-2 py-1 rounded-md text-sm flex items-center space-x-1"
                    >
                      <span>{tag}</span>
                      <button
                        onClick={() => setNewBot(prev => ({
                          ...prev,
                          tags: prev.tags.filter((_, i) => i !== index)
                        }))}
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="Type tag and press Enter"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                      const newTag = e.currentTarget.value.trim()
                      if (!newBot.tags.includes(newTag)) {
                        setNewBot(prev => ({
                          ...prev,
                          tags: [...prev.tags, newTag]
                        }))
                      }
                      e.currentTarget.value = ''
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Press Enter to add tags
                </p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end space-x-4 mt-8 pt-6 border-t border-gray-200 dark:border-gray-600">
              <button
                onClick={handleCancelAddBot}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddBot}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Add Bot
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}