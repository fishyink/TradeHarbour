import React, { useState, useMemo } from 'react'
import { useAppStore } from '../store/useAppStore'

type ViewType = 'daily' | 'weekly' | 'monthly' | 'quarterly'
type GroupBy = 'close-date' | 'open-date'

export const Calendar = () => {
  const { accountsData, accounts } = useAppStore()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewType, setViewType] = useState<ViewType>('daily')
  const [selectedAccount, setSelectedAccount] = useState<string>('')
  const [selectedSymbol, setSelectedSymbol] = useState<string>('')
  const [groupBy, setGroupBy] = useState<GroupBy>('close-date')

  // Get unique symbols from all accounts
  const allSymbols = useMemo(() => {
    const symbols = new Set<string>()
    accountsData.forEach(account => {
      (account.closedPnL || []).forEach(trade => {
        symbols.add(trade.symbol)
      })
    })
    return Array.from(symbols).sort()
  }, [accountsData])

  // Filter data based on selections
  const filteredData = useMemo(() => {
    let data = accountsData

    if (selectedAccount) {
      data = data.filter(account => account.id === selectedAccount)
    }

    const allTrades = data.flatMap(account =>
      (account.closedPnL || []).map(trade => ({
        ...trade,
        accountName: account.name
      }))
    )

    if (selectedSymbol) {
      return allTrades.filter(trade => trade.symbol === selectedSymbol)
    }

    return allTrades
  }, [accountsData, selectedAccount, selectedSymbol])

  // Calculate calendar data
  const calendarData = useMemo(() => {
    const data: Record<string, { pnl: number; trades: number; symbol?: string }> = {}

    filteredData.forEach(trade => {
      const tradeDate = groupBy === 'close-date'
        ? new Date(parseInt(trade.updatedTime || trade.createdTime))
        : new Date(parseInt(trade.createdTime))

      let key: string

      if (viewType === 'daily') {
        key = tradeDate.toISOString().split('T')[0] // YYYY-MM-DD
      } else if (viewType === 'weekly') {
        const year = tradeDate.getFullYear()
        const week = getWeekNumber(tradeDate)
        key = `${year}-W${week.toString().padStart(2, '0')}`
      } else if (viewType === 'monthly') {
        key = `${tradeDate.getFullYear()}-${(tradeDate.getMonth() + 1).toString().padStart(2, '0')}`
      } else { // quarterly
        const year = tradeDate.getFullYear()
        const quarter = Math.floor(tradeDate.getMonth() / 3) + 1
        key = `${year}-Q${quarter}`
      }

      if (!data[key]) {
        data[key] = { pnl: 0, trades: 0 }
      }

      data[key].pnl += parseFloat(trade.closedPnl || '0')
      data[key].trades += 1
    })

    return data
  }, [filteredData, viewType, groupBy])

  // Helper function to get week number
  const getWeekNumber = (date: Date): number => {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1)
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7)
  }

  // Navigation functions
  const navigatePrevious = () => {
    const newDate = new Date(currentDate)
    if (viewType === 'daily') {
      newDate.setMonth(newDate.getMonth() - 1)
    } else if (viewType === 'weekly') {
      newDate.setFullYear(newDate.getFullYear() - 1)
    } else if (viewType === 'monthly') {
      newDate.setFullYear(newDate.getFullYear() - 1)
    } else { // quarterly
      newDate.setFullYear(newDate.getFullYear() - 1)
    }
    setCurrentDate(newDate)
  }

  const navigateNext = () => {
    const newDate = new Date(currentDate)
    if (viewType === 'daily') {
      newDate.setMonth(newDate.getMonth() + 1)
    } else if (viewType === 'weekly') {
      newDate.setFullYear(newDate.getFullYear() + 1)
    } else if (viewType === 'monthly') {
      newDate.setFullYear(newDate.getFullYear() + 1)
    } else { // quarterly
      newDate.setFullYear(newDate.getFullYear() + 1)
    }
    setCurrentDate(newDate)
  }

  // Get cell style based on P&L
  const getCellStyle = (pnl: number) => {
    if (pnl > 0) {
      return 'bg-green-600 dark:bg-green-700 border-green-500 dark:border-green-600 text-white'
    } else if (pnl < 0) {
      return 'bg-red-600 dark:bg-red-700 border-red-500 dark:border-red-600 text-white'
    } else {
      return 'bg-gray-600 dark:bg-gray-700 border-gray-500 dark:border-gray-600 text-gray-300'
    }
  }

  // Render calendar grid
  const renderCalendarGrid = () => {
    if (viewType === 'daily') {
      return renderDailyView()
    } else if (viewType === 'weekly') {
      return renderWeeklyView()
    } else if (viewType === 'monthly') {
      return renderMonthlyView()
    } else {
      return renderQuarterlyView()
    }
  }

  const renderDailyView = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - firstDay.getDay()) // Start from Sunday

    const days = []
    const current = new Date(startDate)

    // Generate 6 weeks of days (42 days)
    for (let i = 0; i < 42; i++) {
      const dateKey = current.toISOString().split('T')[0]
      const dayData = calendarData[dateKey] || { pnl: 0, trades: 0 }
      const isCurrentMonth = current.getMonth() === month

      days.push(
        <div
          key={dateKey}
          className={`border rounded-lg p-3 min-h-[120px] transition-all duration-200 hover:shadow-lg ${
            isCurrentMonth ? getCellStyle(dayData.pnl) : 'bg-gray-400 dark:bg-gray-800 border-gray-300 dark:border-gray-700'
          } ${!isCurrentMonth ? 'opacity-30' : ''}`}
        >
          <div className="text-sm font-medium mb-2">{current.getDate()}</div>
          {dayData.trades > 0 ? (
            <>
              <div className="text-lg font-bold">
                {dayData.pnl >= 0 ? '+' : ''}${dayData.pnl.toFixed(2)}
              </div>
              <div className="text-xs mt-1">{dayData.trades} trades</div>
            </>
          ) : (
            <div className="text-xs text-gray-400">No trades</div>
          )}
        </div>
      )

      current.setDate(current.getDate() + 1)
    }

    return (
      <div className="grid grid-cols-7 gap-2">
        {/* Header row */}
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center font-medium text-gray-600 dark:text-gray-400 py-2">
            {day}
          </div>
        ))}
        {days}
      </div>
    )
  }

  const renderWeeklyView = () => {
    const year = currentDate.getFullYear()
    const weeks = []

    for (let week = 1; week <= 52; week++) {
      const weekKey = `${year}-W${week.toString().padStart(2, '0')}`
      const weekData = calendarData[weekKey] || { pnl: 0, trades: 0 }

      weeks.push(
        <div
          key={weekKey}
          className={`border rounded-lg p-4 min-h-[120px] transition-all duration-200 hover:shadow-lg ${getCellStyle(weekData.pnl)}`}
        >
          <div className="text-sm font-medium mb-2">Wk {week} • {year}</div>
          {weekData.trades > 0 ? (
            <>
              <div className="text-lg font-bold">
                {weekData.pnl >= 0 ? '+' : ''}${weekData.pnl.toFixed(2)}
              </div>
              <div className="text-xs mt-1">{weekData.trades} trades</div>
            </>
          ) : (
            <div className="text-xs text-gray-400">No trades</div>
          )}
        </div>
      )
    }

    return <div className="grid grid-cols-7 gap-2">{weeks}</div>
  }

  const renderMonthlyView = () => {
    const year = currentDate.getFullYear()
    const months = []

    for (let month = 0; month < 12; month++) {
      const monthKey = `${year}-${(month + 1).toString().padStart(2, '0')}`
      const monthData = calendarData[monthKey] || { pnl: 0, trades: 0 }
      const monthName = new Date(year, month).toLocaleDateString('en-US', { month: 'short' })

      months.push(
        <div
          key={monthKey}
          className={`border rounded-lg p-4 min-h-[120px] transition-all duration-200 hover:shadow-lg ${getCellStyle(monthData.pnl)}`}
        >
          <div className="text-sm font-medium mb-2">{monthName}-{year}</div>
          {monthData.trades > 0 ? (
            <>
              <div className="text-lg font-bold">
                {monthData.pnl >= 0 ? '+' : ''}${monthData.pnl.toFixed(2)}
              </div>
              <div className="text-xs mt-1">{monthData.trades} trades</div>
            </>
          ) : (
            <div className="text-xs text-gray-400">No trades</div>
          )}
        </div>
      )
    }

    return <div className="grid grid-cols-4 gap-4">{months}</div>
  }

  const renderQuarterlyView = () => {
    const year = currentDate.getFullYear()
    const quarters = []

    for (let quarter = 1; quarter <= 4; quarter++) {
      const quarterKey = `${year}-Q${quarter}`
      const quarterData = calendarData[quarterKey] || { pnl: 0, trades: 0 }

      quarters.push(
        <div
          key={quarterKey}
          className={`border rounded-lg p-6 min-h-[160px] transition-all duration-200 hover:shadow-lg ${getCellStyle(quarterData.pnl)}`}
        >
          <div className="text-lg font-medium mb-3">Q{quarter} {year}</div>
          {quarterData.trades > 0 ? (
            <>
              <div className="text-2xl font-bold">
                {quarterData.pnl >= 0 ? '+' : ''}${quarterData.pnl.toFixed(2)}
              </div>
              <div className="text-sm mt-2">{quarterData.trades} trades</div>
            </>
          ) : (
            <div className="text-sm text-gray-400">No trades</div>
          )}
        </div>
      )
    }

    return <div className="grid grid-cols-2 gap-4">{quarters}</div>
  }

  // Get current period display text
  const getCurrentPeriodText = () => {
    if (viewType === 'daily') {
      return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    } else {
      return currentDate.getFullYear().toString()
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
            Calendar PnL
            <span className="ml-2 px-2 py-1 text-xs font-medium bg-orange-500 text-white rounded">
              Real Data
            </span>
          </h1>
          <p className="text-muted">Your daily futures PnL visualised on a calendar, grouped by trade close</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <select
          value={selectedAccount}
          onChange={(e) => setSelectedAccount(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        >
          <option value="">All Accounts</option>
          {accounts.map(account => (
            <option key={account.id} value={account.id}>{account.name}</option>
          ))}
        </select>

        <select
          value={groupBy}
          onChange={(e) => setGroupBy(e.target.value as GroupBy)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        >
          <option value="close-date">Group By: Close Date</option>
          <option value="open-date">Group By: Open Date</option>
        </select>

        <select
          value={selectedSymbol}
          onChange={(e) => setSelectedSymbol(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        >
          <option value="">All Symbols</option>
          {allSymbols.map(symbol => (
            <option key={symbol} value={symbol}>{symbol}</option>
          ))}
        </select>
      </div>

      {/* View Type Selector and Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex space-x-1">
          {(['daily', 'weekly', 'monthly', 'quarterly'] as ViewType[]).map(type => (
            <button
              key={type}
              onClick={() => setViewType(type)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewType === type
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-4">
          <button
            onClick={navigatePrevious}
            className="p-2 rounded-md bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <span className="text-lg font-semibold text-gray-900 dark:text-white min-w-[200px] text-center">
            {getCurrentPeriodText()}
          </span>

          <button
            onClick={navigateNext}
            className="p-2 rounded-md bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6">
        {renderCalendarGrid()}
      </div>
    </div>
  )
}