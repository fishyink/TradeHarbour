import { useMemo, useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import { useBotStore } from '../store/useBotStore'
import { calculateBotAnalytics } from '../utils/botAnalytics'
import { CompactBotCard } from './CompactBotCard'

interface BotsListProps {
  filters?: {
    account: string
    tradingPair: string
    status: string
    sortBy: string
    winRateMin: number
    searchTerm: string
    selectedTags: string[]
  }
  onSortChange?: (sortBy: string, sortDirection: 'asc' | 'desc') => void
}

export const BotsList = ({ filters, onSortChange }: BotsListProps) => {
  const { accountsData } = useAppStore()
  const { bots } = useBotStore()

  // Local state for sort direction
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  // Filter and sort bots
  const filteredBots = useMemo(() => {
    if (!filters) return bots

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

      let result = 0

      switch (filters.sortBy) {
        case 'performance':
          result = analyticsB.totalPnl - analyticsA.totalPnl
          break
        case 'winRate':
          result = analyticsB.winRate - analyticsA.winRate
          break
        case 'trades':
          result = analyticsB.totalTrades - analyticsA.totalTrades
          break
        case 'pnl7d':
          result = analyticsB.pnl7d - analyticsA.pnl7d
          break
        case 'pnl30d':
          result = analyticsB.pnl30d - analyticsA.pnl30d
          break
        case 'pnl90d':
          result = analyticsB.pnl90d - analyticsA.pnl90d
          break
        case 'pnl180d':
          result = analyticsB.pnl180d - analyticsA.pnl180d
          break
        case 'name':
          result = a.name.localeCompare(b.name)
          break
        case 'tradingPair':
          result = a.tradingPair.localeCompare(b.tradingPair)
          break
        case 'startDate':
          result = new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
          break
        case 'account':
          const accountA = accountsData.find(acc => acc.id === a.accountId)?.name || ''
          const accountB = accountsData.find(acc => acc.id === b.accountId)?.name || ''
          result = accountA.localeCompare(accountB)
          break
        default:
          result = 0
      }

      // Apply sort direction
      return sortDirection === 'asc' ? -result : result
    })

    return filtered
  }, [bots, filters, accountsData, sortDirection])

  if (filteredBots.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
          <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No bots found</h3>
        <p className="text-gray-500 dark:text-gray-400">
          {filters?.searchTerm || filters?.account || filters?.tradingPair
            ? 'No bots match your current filters. Try adjusting your search criteria.'
            : 'Get started by adding your first bot to track its performance.'}
        </p>
      </div>
    )
  }

  // Handle column sort click
  const handleSort = (sortBy: string) => {
    // Toggle direction if same column, otherwise start with desc for numeric, asc for text
    let newDirection: 'asc' | 'desc' = 'desc'

    if (filters?.sortBy === sortBy) {
      // Same column, toggle direction
      newDirection = sortDirection === 'desc' ? 'asc' : 'desc'
    } else {
      // New column, set default direction
      if (['name', 'tradingPair', 'account'].includes(sortBy)) {
        newDirection = 'asc' // Text fields default to ascending
      } else {
        newDirection = 'desc' // Numeric fields default to descending
      }
    }

    setSortDirection(newDirection)
    if (onSortChange) {
      onSortChange(sortBy, newDirection)
    }
  }

  // Sort arrow component
  const SortArrow = ({ isActive, direction }: { isActive: boolean; direction: 'asc' | 'desc' }) => (
    <svg
      className={`w-3 h-3 ml-1 transition-colors ${
        isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'
      }`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d={direction === 'asc' ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"}
      />
    </svg>
  )

  // Current sort direction for the active column
  const getCurrentDirection = (columnSortBy: string): 'asc' | 'desc' => {
    if (filters?.sortBy === columnSortBy) {
      return sortDirection
    }
    // Default directions
    return ['name', 'tradingPair', 'account'].includes(columnSortBy) ? 'asc' : 'desc'
  }

  return (
    <div className="space-y-3">
      {/* Column Headers */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="grid grid-cols-12 gap-4 items-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
          {/* Column 1-2: Bot Name & Trading Pair */}
          <div className="col-span-2">
            <button
              onClick={() => handleSort('name')}
              className="flex items-center hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              Bot Name
              <SortArrow isActive={filters?.sortBy === 'name'} direction={getCurrentDirection('name')} />
            </button>
          </div>

          {/* Column 3: Start Date - Make it sortable */}
          <div className="col-span-1 text-center">
            <button
              onClick={() => handleSort('startDate')}
              className="flex items-center justify-center hover:text-blue-600 dark:hover:text-blue-400 transition-colors w-full"
            >
              Start Date
              <SortArrow isActive={filters?.sortBy === 'startDate'} direction={getCurrentDirection('startDate')} />
            </button>
          </div>

          {/* Column 4-7: Period P&L */}
          <div className="col-span-1 text-center">
            <button
              onClick={() => handleSort('pnl7d')}
              className="flex items-center justify-center hover:text-blue-600 dark:hover:text-blue-400 transition-colors w-full"
            >
              7D P&L
              <SortArrow isActive={filters?.sortBy === 'pnl7d'} direction={getCurrentDirection('pnl7d')} />
            </button>
          </div>

          <div className="col-span-1 text-center">
            <button
              onClick={() => handleSort('pnl30d')}
              className="flex items-center justify-center hover:text-blue-600 dark:hover:text-blue-400 transition-colors w-full"
            >
              30D P&L
              <SortArrow isActive={filters?.sortBy === 'pnl30d'} direction={getCurrentDirection('pnl30d')} />
            </button>
          </div>

          <div className="col-span-1 text-center">
            <button
              onClick={() => handleSort('pnl90d')}
              className="flex items-center justify-center hover:text-blue-600 dark:hover:text-blue-400 transition-colors w-full"
            >
              90D P&L
              <SortArrow isActive={filters?.sortBy === 'pnl90d'} direction={getCurrentDirection('pnl90d')} />
            </button>
          </div>

          <div className="col-span-1 text-center">
            <button
              onClick={() => handleSort('pnl180d')}
              className="flex items-center justify-center hover:text-blue-600 dark:hover:text-blue-400 transition-colors w-full"
            >
              180D P&L
              <SortArrow isActive={filters?.sortBy === 'pnl180d'} direction={getCurrentDirection('pnl180d')} />
            </button>
          </div>

          {/* Column 8-9: Key Metrics */}
          <div className="col-span-1 text-center">
            <button
              onClick={() => handleSort('winRate')}
              className="flex items-center justify-center hover:text-blue-600 dark:hover:text-blue-400 transition-colors w-full"
            >
              Win Rate
              <SortArrow isActive={filters?.sortBy === 'winRate'} direction={getCurrentDirection('winRate')} />
            </button>
          </div>

          <div className="col-span-1 text-center">
            <button
              onClick={() => handleSort('trades')}
              className="flex items-center justify-center hover:text-blue-600 dark:hover:text-blue-400 transition-colors w-full"
            >
              Trades
              <SortArrow isActive={filters?.sortBy === 'trades'} direction={getCurrentDirection('trades')} />
            </button>
          </div>

          {/* Column 10: Total P&L */}
          <div className="col-span-1 text-center">
            <button
              onClick={() => handleSort('performance')}
              className="flex items-center justify-center hover:text-blue-600 dark:hover:text-blue-400 transition-colors w-full"
            >
              Total P&L
              <SortArrow isActive={filters?.sortBy === 'performance'} direction={getCurrentDirection('performance')} />
            </button>
          </div>

          {/* Column 11: Sharpe */}
          <div className="col-span-1 text-center">
            <span>Sharpe</span>
          </div>

          {/* Column 12: Actions */}
          <div className="col-span-1 text-center">
            <span>Actions</span>
          </div>
        </div>
      </div>

      {/* Bot Cards */}
      {filteredBots.map(bot => {
        const analytics = calculateBotAnalytics(bot, accountsData)
        return (
          <CompactBotCard
            key={bot.id}
            bot={bot}
            analytics={analytics}
            accountsData={accountsData}
          />
        )
      })}
    </div>
  )
}