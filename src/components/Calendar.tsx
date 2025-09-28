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
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null)


  // Helper function to get ISO week number - MOVED BEFORE calendarData
  const getWeekNumber = (date: Date): number => {
    const tempDate = new Date(date.valueOf())
    const dayNumber = (date.getDay() + 6) % 7
    tempDate.setDate(tempDate.getDate() - dayNumber + 3)
    const firstThursday = tempDate.valueOf()
    tempDate.setMonth(0, 1)
    if (tempDate.getDay() !== 4) {
      tempDate.setMonth(0, 1 + ((4 - tempDate.getDay()) + 7) % 7)
    }
    return 1 + Math.ceil((firstThursday - tempDate.valueOf()) / 604800000)
  }

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
      return 'bg-green-100 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200'
    } else if (pnl < 0) {
      return 'bg-red-100 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
    } else {
      return 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
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
          onClick={() => isCurrentMonth && dayData.trades > 0 && setSelectedPeriod(dateKey)}
          className={`border rounded-lg p-3 min-h-[120px] transition-all duration-200 hover:shadow-lg ${
            isCurrentMonth ? getCellStyle(dayData.pnl) : 'bg-gray-400 dark:bg-gray-800 border-gray-300 dark:border-gray-700'
          } ${!isCurrentMonth ? 'opacity-30' : ''} ${
            isCurrentMonth && dayData.trades > 0 ? 'cursor-pointer hover:scale-105' : ''
          } ${selectedPeriod === dateKey ? 'ring-2 ring-blue-500' : ''}`}
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

    for (let week = 1; week <= 26; week++) {
      const weekKey = `${year}-W${week.toString().padStart(2, '0')}`
      const weekData = calendarData[weekKey] || { pnl: 0, trades: 0 }

      weeks.push(
        <div
          key={weekKey}
          onClick={() => weekData.trades > 0 && setSelectedPeriod(weekKey)}
          className={`border rounded-lg p-4 min-h-[120px] transition-all duration-200 hover:shadow-lg ${getCellStyle(weekData.pnl)} ${
            weekData.trades > 0 ? 'cursor-pointer hover:scale-105' : ''
          } ${selectedPeriod === weekKey ? 'ring-2 ring-blue-500' : ''}`}
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

    return <div className="grid grid-cols-4 md:grid-cols-6 gap-4">{weeks}</div>
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
          onClick={() => monthData.trades > 0 && setSelectedPeriod(monthKey)}
          className={`border rounded-lg p-4 min-h-[120px] transition-all duration-200 hover:shadow-lg ${getCellStyle(monthData.pnl)} ${
            monthData.trades > 0 ? 'cursor-pointer hover:scale-105' : ''
          } ${selectedPeriod === monthKey ? 'ring-2 ring-blue-500' : ''}`}
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
          onClick={() => quarterData.trades > 0 && setSelectedPeriod(quarterKey)}
          className={`border rounded-lg p-6 min-h-[160px] transition-all duration-200 hover:shadow-lg ${getCellStyle(quarterData.pnl)} ${
            quarterData.trades > 0 ? 'cursor-pointer hover:scale-105' : ''
          } ${selectedPeriod === quarterKey ? 'ring-2 ring-blue-500' : ''}`}
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

  // Get trades for selected period (works for daily, weekly, monthly, quarterly)
  const getTradesForPeriod = (periodKey: string) => {
    if (!selectedPeriod) return []

    return filteredData.filter(trade => {
      const tradeDate = groupBy === 'close-date'
        ? new Date(parseInt(trade.updatedTime || trade.createdTime))
        : new Date(parseInt(trade.createdTime))

      let key: string
      if (periodKey.includes('-W')) {
        // Weekly key format: 2025-W14
        const year = tradeDate.getFullYear()
        const week = getWeekNumber(tradeDate)
        key = `${year}-W${week.toString().padStart(2, '0')}`
      } else if (periodKey.includes('-Q')) {
        // Quarterly key format: 2025-Q1
        const year = tradeDate.getFullYear()
        const quarter = Math.floor(tradeDate.getMonth() / 3) + 1
        key = `${year}-Q${quarter}`
      } else if (periodKey.match(/^\d{4}-\d{2}$/)) {
        // Monthly key format: 2025-09
        key = `${tradeDate.getFullYear()}-${(tradeDate.getMonth() + 1).toString().padStart(2, '0')}`
      } else {
        // Daily key format: 2025-09-28
        key = tradeDate.toISOString().split('T')[0]
      }

      return key === periodKey
    }).sort((a, b) => {
      const timeA = parseInt(a.updatedTime || a.createdTime)
      const timeB = parseInt(b.updatedTime || b.createdTime)
      return timeB - timeA // Most recent first
    })
  }

  // Format duration between two timestamps
  const formatDuration = (startTime: string, endTime: string) => {
    const start = parseInt(startTime)
    const end = parseInt(endTime)
    const durationMs = end - start

    const days = Math.floor(durationMs / (1000 * 60 * 60 * 24))
    const hours = Math.floor((durationMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60))

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`
    } else {
      return `${minutes}m`
    }
  }

  // Render selected period details
  const renderSelectedPeriodDetails = () => {
    if (!selectedPeriod) return null

    const trades = getTradesForPeriod(selectedPeriod)
    if (trades.length === 0) return null

    const totalPnl = trades.reduce((sum, trade) => sum + parseFloat(trade.closedPnl || '0'), 0)
    const winningTrades = trades.filter(trade => parseFloat(trade.closedPnl || '0') > 0).length
    const losingTrades = trades.filter(trade => parseFloat(trade.closedPnl || '0') < 0).length
    const winRate = (winningTrades / trades.length) * 100

    // Calculate average duration
    const totalDuration = trades.reduce((sum, trade) => {
      const start = parseInt(trade.createdTime)
      const end = parseInt(trade.updatedTime || trade.createdTime)
      return sum + (end - start)
    }, 0)
    const avgDuration = totalDuration / trades.length

    // Long vs Short analysis
    const longTrades = trades.filter(trade => trade.side === 'Buy')
    const shortTrades = trades.filter(trade => trade.side === 'Sell')
    const longWins = longTrades.filter(trade => parseFloat(trade.closedPnl || '0') > 0).length
    const shortWins = shortTrades.filter(trade => parseFloat(trade.closedPnl || '0') > 0).length

    // Format period display name
    const getPeriodDisplayName = (key: string) => {
      if (key.includes('-W')) {
        const [year, week] = key.split('-W')
        return `Week ${parseInt(week)} ${year}`
      } else if (key.includes('-Q')) {
        const [year, quarter] = key.split('-Q')
        return `Q${quarter} ${year}`
      } else if (key.match(/^\d{4}-\d{2}$/)) {
        const [year, month] = key.split('-')
        const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', { month: 'long' })
        return `${monthName} ${year}`
      } else {
        const date = new Date(key)
        return date.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      }
    }

    // Generate cumulative PnL data for equity chart
    const cumulativePnlData = trades.reduce((acc, trade, index) => {
      const pnl = parseFloat(trade.closedPnl || '0')
      const cumulative = index === 0 ? pnl : acc[acc.length - 1].cumulative + pnl
      acc.push({ index: index + 1, cumulative })
      return acc
    }, [] as Array<{ index: number; cumulative: number }>)

    return (
      <div className="mt-8 bg-gray-50 dark:bg-gray-900 rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            {getPeriodDisplayName(selectedPeriod)} Trades
          </h3>
          <div className="flex items-center space-x-4">
            <div className="flex space-x-2">
              <button className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                Overview
              </button>
              <button className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
                Notes
              </button>
            </div>
            <button
              onClick={() => setSelectedPeriod(null)}
              className="px-4 py-2 text-sm bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors"
            >
              Close
            </button>
            <button className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
              📥 Download CSV
            </button>
          </div>
        </div>

        {/* PnL Chart */}
        <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg p-6">
          <h4 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">PNL ($)</h4>
          <div className="h-48 bg-gray-50 dark:bg-gray-900 rounded-lg relative overflow-hidden">
            {cumulativePnlData.length > 1 ? (
              <svg
                className="w-full h-full absolute inset-0"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                style={{ background: 'transparent' }}
              >
                <defs>
                  <linearGradient id={`pnlGradient-${selectedPeriod}`} x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor={totalPnl >= 0 ? "#10B981" : "#EF4444"} stopOpacity="0.2"/>
                    <stop offset="100%" stopColor={totalPnl >= 0 ? "#10B981" : "#EF4444"} stopOpacity="0.05"/>
                  </linearGradient>
                </defs>

                {/* Calculate path points */}
                {(() => {
                  const minPnl = Math.min(...cumulativePnlData.map(p => p.cumulative))
                  const maxPnl = Math.max(...cumulativePnlData.map(p => p.cumulative))
                  const range = Math.max(maxPnl - minPnl, 1)

                  const pathPoints = cumulativePnlData.map((point, index) => {
                    const x = (index / (cumulativePnlData.length - 1)) * 100
                    const y = 100 - ((point.cumulative - minPnl) / range) * 80 - 10
                    return `${x},${y}`
                  }).join(' ')

                  const pathData = `M ${pathPoints.split(' ').map((point, index) =>
                    `${index === 0 ? '' : 'L '}${point}`
                  ).join(' ')}`

                  const fillPath = `${pathData} L 100,100 L 0,100 Z`

                  return (
                    <>
                      {/* Fill area */}
                      <path
                        d={fillPath}
                        fill={`url(#pnlGradient-${selectedPeriod})`}
                      />
                      {/* Line */}
                      <path
                        d={pathData}
                        stroke={totalPnl >= 0 ? "#10B981" : "#EF4444"}
                        strokeWidth="0.5"
                        fill="none"
                        vectorEffect="non-scaling-stroke"
                      />
                      {/* End point */}
                      <circle
                        cx={100}
                        cy={100 - ((cumulativePnlData[cumulativePnlData.length - 1].cumulative - minPnl) / range) * 80 - 10}
                        r="1"
                        fill={totalPnl >= 0 ? "#10B981" : "#EF4444"}
                      />
                    </>
                  )
                })()}
              </svg>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-gray-500 dark:text-gray-400">
                Not enough data for chart
              </div>
            )}
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">📊</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Total Trades</div>
            <div className="text-lg font-bold">{trades.length} <span className="text-sm font-normal text-green-600">{winningTrades}W</span><span className="text-sm font-normal text-red-600">/{losingTrades}L</span></div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
            <div className="text-lg font-bold">PNL ($)</div>
            <div className={`text-2xl font-bold ${totalPnl >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
            <div className="text-lg font-bold">Win Rate</div>
            <div className="text-2xl font-bold text-blue-600">{winRate.toFixed(1)}%</div>
            <div className="text-sm text-gray-500">{winningTrades}W/{losingTrades}L</div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
            <div className="text-lg font-bold">Avg Trade Duration</div>
            <div className="text-lg font-bold">
              {formatDuration('0', avgDuration.toString())}
            </div>
          </div>
        </div>

        {/* Long/Short Analysis */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border-l-4 border-green-500">
            <div className="text-lg font-bold text-green-600">Longs Ratio</div>
            <div className="text-2xl font-bold">{longTrades.length > 0 ? ((longTrades.length / trades.length) * 100).toFixed(1) : '0'}%</div>
            <div className="text-sm text-gray-500">{longTrades.length > 0 ? `${((longWins / longTrades.length) * 100).toFixed(1)}% WR` : 'No long trades'} • ({longTrades.length})</div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border-l-4 border-red-500">
            <div className="text-lg font-bold text-red-600">Shorts Ratio</div>
            <div className="text-2xl font-bold">{shortTrades.length > 0 ? ((shortTrades.length / trades.length) * 100).toFixed(1) : '0'}%</div>
            <div className="text-sm text-gray-500">{shortTrades.length > 0 ? `${((shortWins / shortTrades.length) * 100).toFixed(1)}% WR` : 'No short trades'} • ({shortTrades.length})</div>
          </div>
        </div>

        {/* Trades Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full table-fixed">
              <colgroup>
                <col style={{ width: '12%' }} />
                <col style={{ width: '8%' }} />
                <col style={{ width: '15%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '15%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '15%' }} />
                <col style={{ width: '11%' }} />
              </colgroup>
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Account</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">ID</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Symbol/Size</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Open</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Duration</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Close</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Realised PNL</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                {trades.map((trade, index) => {
                  const pnl = parseFloat(trade.closedPnl || '0')
                  const account = accountsData.find(acc => acc.closedPnL?.some(t => t.id === trade.id))

                  return (
                    <tr key={trade.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-3 py-3 text-sm">
                        <div className="flex items-center">
                          <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                          <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
                            {account?.name || 'Unknown'}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-900 dark:text-gray-100">{trade.id}</td>
                      <td className="px-3 py-3 text-sm">
                        <div className="font-medium text-gray-900 dark:text-gray-100">{trade.symbol}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{trade.side === 'Buy' ? '+' : ''}{trade.cumExecQty}</div>
                      </td>
                      <td className="px-3 py-3 text-sm">
                        <div className="font-medium">${parseFloat(trade.avgEntryPrice || '0').toFixed(2)}@</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(parseInt(trade.createdTime)).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(parseInt(trade.createdTime)).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-sm">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
                          {formatDuration(trade.createdTime, trade.updatedTime || trade.createdTime)}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-sm">
                        <div className="font-medium">${parseFloat(trade.avgExitPrice || '0').toFixed(2)}@</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(parseInt(trade.updatedTime || trade.createdTime)).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(parseInt(trade.updatedTime || trade.createdTime)).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-sm">
                        <span className={`font-bold ${pnl >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-sm">
                        <div className="flex space-x-1">
                          <button className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                          <button className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
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

      {/* Selected Period Details */}
      {renderSelectedPeriodDetails()}
    </div>
  )
}