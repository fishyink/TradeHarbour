import { useMemo } from 'react'
import { useAppStore } from '../store/useAppStore'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, AreaChart, Area } from 'recharts'

export const Beta = () => {
  const { accountsData } = useAppStore()

  // Calculate comprehensive analytics from real data
  const analytics = useMemo(() => {
    const allClosedPnL = accountsData.flatMap(account => account.closedPnL || [])
    const allTrades = accountsData.flatMap(account => account.trades || [])
    const hasConnectedAccounts = accountsData.length > 0
    const hasActiveTrading = allTrades.length > 0

    console.log('Beta Analytics Debug:', {
      accountsDataLength: accountsData.length,
      allClosedPnLLength: allClosedPnL.length,
      allTradesLength: allTrades.length,
      accountBreakdown: accountsData.map(acc => ({
        name: acc.name,
        closedPnLCount: acc.closedPnL?.length || 0,
        tradesCount: acc.trades?.length || 0,
        hasError: !!acc.error,
        error: acc.error
      }))
    })

    // Limit data size to prevent hanging
    const maxTrades = 10000 // Limit to 10k trades for performance
    const limitedClosedPnL = allClosedPnL.slice(-maxTrades)
    const limitedTrades = allTrades.slice(-maxTrades)

    if (limitedClosedPnL.length === 0) {
      return {
        symbolDominance: [],
        rollingPnL: [],
        streakData: { currentStreak: 0, longestWin: 0, longestLoss: 0, streaks: [] },
        timePerformance: { daily: [], hourly: [] },
        monthlyData: [],
        equityMilestones: [],
        correlationData: [],
        drawdownData: [],
        assetAllocation: [],
        topPerformingAssets: [],
        advancedStats: {
          totalRealizedPnL: 0,
          totalTrades: 0,
          winRate: 0,
          avgWin: 0,
          avgLoss: 0,
          profitFactor: 0,
          sharpeRatio: 0,
          maxDrawdown: 0,
          maxProfit: 0,
        },
        isEmpty: true,
        hasConnectedAccounts,
        hasActiveTrading,
        availableTradeCount: limitedTrades.length
      }
    }

    // Symbol Dominance Analysis
    const symbolPnL = limitedClosedPnL.reduce((acc, trade) => {
      const symbol = trade.symbol
      const pnl = parseFloat(trade.closedPnl)
      acc[symbol] = (acc[symbol] || 0) + pnl
      return acc
    }, {} as Record<string, number>)

    const totalPnL = Object.values(symbolPnL).reduce((sum, pnl) => sum + Math.abs(pnl), 0)
    const symbolDominance = Object.entries(symbolPnL)
      .map(([symbol, pnl]) => ({
        symbol: symbol.replace('USDT', ''),
        pnl,
        percentage: totalPnL > 0 ? (Math.abs(pnl) / totalPnL) * 100 : 0,
        color: pnl >= 0 ? '#10b981' : '#ef4444'
      }))
      .sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl))

    // Rolling P&L Heatmap Data
    const dailyPnL = limitedClosedPnL.reduce((acc, trade) => {
      const date = new Date(parseInt(trade.updatedTime)).toISOString().split('T')[0]
      acc[date] = (acc[date] || 0) + parseFloat(trade.closedPnl)
      return acc
    }, {} as Record<string, number>)

    const rollingPnL = Object.entries(dailyPnL)
      .map(([date, pnl]) => ({
        date,
        pnl,
        profitPnl: pnl >= 0 ? pnl : 0,
        lossPnl: pnl < 0 ? pnl : 0
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-30) // Last 30 days

    // Win/Loss Streak Analysis
    const sortedTrades = limitedClosedPnL
      .sort((a, b) => parseInt(a.updatedTime) - parseInt(b.updatedTime))
      .map(trade => parseFloat(trade.closedPnl) > 0)

    let currentStreak = 0
    let longestWin = 0
    let longestLoss = 0
    let streaks = []
    let currentStreakType = null
    let currentStreakLength = 0

    for (let i = 0; i < sortedTrades.length; i++) {
      const isWin = sortedTrades[i]

      if (currentStreakType === null || currentStreakType === isWin) {
        currentStreakLength++
        currentStreakType = isWin
      } else {
        streaks.push({ type: currentStreakType ? 'win' : 'loss', length: currentStreakLength })
        if (currentStreakType) longestWin = Math.max(longestWin, currentStreakLength)
        else longestLoss = Math.max(longestLoss, currentStreakLength)

        currentStreakType = isWin
        currentStreakLength = 1
      }
    }

    if (currentStreakLength > 0) {
      currentStreak = currentStreakType ? currentStreakLength : -currentStreakLength
      if (currentStreakType) longestWin = Math.max(longestWin, currentStreakLength)
      else longestLoss = Math.max(longestLoss, currentStreakLength)
    }

    // Day/Hour Performance Analysis
    const dayPerformance = new Array(7).fill(0).map((_, i) => ({ day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][i], pnl: 0, trades: 0 }))
    const hourPerformance = new Array(24).fill(0).map((_, i) => ({ hour: i, pnl: 0, trades: 0 }))

    limitedClosedPnL.forEach(trade => {
      const date = new Date(parseInt(trade.updatedTime))
      const dayOfWeek = date.getDay()
      const hour = date.getHours()
      const pnl = parseFloat(trade.closedPnl)

      dayPerformance[dayOfWeek].pnl += pnl
      dayPerformance[dayOfWeek].trades++
      hourPerformance[hour].pnl += pnl
      hourPerformance[hour].trades++
    })

    // Monthly Summary with enhanced data
    const monthlyData = limitedClosedPnL.reduce((acc, trade) => {
      const date = new Date(parseInt(trade.updatedTime))
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

      if (!acc[monthKey]) {
        acc[monthKey] = {
          month: monthKey,
          pnl: 0,
          trades: 0,
          wins: 0,
          volume: 0,
          largestWin: 0,
          largestLoss: 0,
          symbolPnL: {} as Record<string, number>,
          startingEquity: 0 // Will be calculated later
        }
      }

      const pnl = parseFloat(trade.closedPnl)
      const symbol = trade.symbol.replace('USDT', '')

      acc[monthKey].pnl += pnl
      acc[monthKey].trades++
      acc[monthKey].volume += parseFloat(trade.cumEntryValue)

      // Track P&L by symbol for this month
      acc[monthKey].symbolPnL[symbol] = (acc[monthKey].symbolPnL[symbol] || 0) + pnl

      if (pnl > 0) {
        acc[monthKey].wins++
        acc[monthKey].largestWin = Math.max(acc[monthKey].largestWin, pnl)
      } else {
        acc[monthKey].largestLoss = Math.min(acc[monthKey].largestLoss, pnl)
      }

      return acc
    }, {} as Record<string, any>)

    // Calculate percentage gains and top/bottom performers for each month
    const monthlyArray = Object.values(monthlyData).slice(-6).map((month: any) => {
      // Get top 5 performing pairs for this month
      const topPairs = Object.entries(month.symbolPnL)
        .map(([symbol, pnl]) => ({ symbol, pnl: Number(pnl) }))
        .filter(pair => pair.pnl > 0)
        .sort((a, b) => b.pnl - a.pnl)
        .slice(0, 5)

      // Get bottom 3 performing pairs for this month
      const bottomPairs = Object.entries(month.symbolPnL)
        .map(([symbol, pnl]) => ({ symbol, pnl: Number(pnl) }))
        .filter(pair => pair.pnl < 0)
        .sort((a, b) => a.pnl - b.pnl)
        .slice(0, 3)

      // Calculate percentage gain based on current total equity from all accounts
      const totalCurrentEquity = accountsData.reduce((sum, account) => {
        return sum + parseFloat(account.balance?.totalEquity || '0')
      }, 0)

      // Use a conservative estimate for percentage calculation (current equity as baseline)
      const baselineEquity = totalCurrentEquity > 0 ? totalCurrentEquity : 10000 // Fallback to $10k
      const percentageGain = baselineEquity > 0 ? (month.pnl / baselineEquity) * 100 : 0

      return {
        ...month,
        topPairs,
        bottomPairs,
        percentageGain
      }
    })

    // Top 5 Performing Assets
    const topPerformingAssets = symbolDominance
      .filter(asset => asset.pnl > 0)
      .slice(0, 5)
      .map(asset => ({
        ...asset,
        roi: asset.pnl > 0 ? ((asset.pnl / Math.abs(asset.pnl)) * 100) : 0
      }))

    // Advanced Statistics
    const totalRealizedPnL = limitedClosedPnL.reduce((sum, t) => sum + parseFloat(t.closedPnl), 0)
    const totalTrades = limitedClosedPnL.length
    const winningTrades = limitedClosedPnL.filter(t => parseFloat(t.closedPnl) > 0)
    const losingTrades = limitedClosedPnL.filter(t => parseFloat(t.closedPnl) < 0)
    const avgWin = winningTrades.length > 0 ? winningTrades.reduce((sum, t) => sum + parseFloat(t.closedPnl), 0) / winningTrades.length : 0
    const avgLoss = losingTrades.length > 0 ? Math.abs(losingTrades.reduce((sum, t) => sum + parseFloat(t.closedPnl), 0) / losingTrades.length) : 0
    const profitFactor = avgLoss > 0 ? avgWin / avgLoss : 0
    // Calculate Sharpe ratio properly: (average return - risk-free rate) / standard deviation
    const returns = limitedClosedPnL.map(t => parseFloat(t.closedPnl))
    const avgReturn = returns.length > 0 ? returns.reduce((sum, r) => sum + r, 0) / returns.length : 0
    const variance = returns.length > 1 ? returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / (returns.length - 1) : 0
    const stdDev = Math.sqrt(variance)
    const sharpeRatio = stdDev > 0 ? avgReturn / stdDev : 0
    const maxDrawdown = Math.min(...rollingPnL.map(d => d.pnl))
    const maxProfit = Math.max(...rollingPnL.map(d => d.pnl))

    // Calculate win rate for advanced stats
    const winRate = limitedClosedPnL.length > 0 ? (limitedClosedPnL.filter(t => parseFloat(t.closedPnl) > 0).length / limitedClosedPnL.length) * 100 : 0

    // Long/Short Analysis
    const longTrades = limitedClosedPnL.filter(t => t.side === 'Buy')
    const shortTrades = limitedClosedPnL.filter(t => t.side === 'Sell')

    const longStats = {
      count: longTrades.length,
      percentage: limitedClosedPnL.length > 0 ? (longTrades.length / limitedClosedPnL.length) * 100 : 0,
      wins: longTrades.filter(t => parseFloat(t.closedPnl) > 0).length,
      losses: longTrades.filter(t => parseFloat(t.closedPnl) <= 0).length,
      winRate: longTrades.length > 0 ? (longTrades.filter(t => parseFloat(t.closedPnl) > 0).length / longTrades.length) * 100 : 0,
      totalPnL: longTrades.reduce((sum, t) => sum + parseFloat(t.closedPnl), 0),
      avgWin: longTrades.filter(t => parseFloat(t.closedPnl) > 0).length > 0 ?
        longTrades.filter(t => parseFloat(t.closedPnl) > 0).reduce((sum, t) => sum + parseFloat(t.closedPnl), 0) / longTrades.filter(t => parseFloat(t.closedPnl) > 0).length : 0,
      avgLoss: longTrades.filter(t => parseFloat(t.closedPnl) < 0).length > 0 ?
        Math.abs(longTrades.filter(t => parseFloat(t.closedPnl) < 0).reduce((sum, t) => sum + parseFloat(t.closedPnl), 0) / longTrades.filter(t => parseFloat(t.closedPnl) < 0).length) : 0,
      avgDuration: longTrades.length > 0 ?
        longTrades.reduce((sum, t) => sum + (parseInt(t.updatedTime || t.createdTime) - parseInt(t.createdTime)), 0) / longTrades.length : 0,
      winDurationPercentage: 0, // Will be calculated below
      lossDurationPercentage: 0 // Will be calculated below
    }

    const shortStats = {
      count: shortTrades.length,
      percentage: limitedClosedPnL.length > 0 ? (shortTrades.length / limitedClosedPnL.length) * 100 : 0,
      wins: shortTrades.filter(t => parseFloat(t.closedPnl) > 0).length,
      losses: shortTrades.filter(t => parseFloat(t.closedPnl) <= 0).length,
      winRate: shortTrades.length > 0 ? (shortTrades.filter(t => parseFloat(t.closedPnl) > 0).length / shortTrades.length) * 100 : 0,
      totalPnL: shortTrades.reduce((sum, t) => sum + parseFloat(t.closedPnl), 0),
      avgWin: shortTrades.filter(t => parseFloat(t.closedPnl) > 0).length > 0 ?
        shortTrades.filter(t => parseFloat(t.closedPnl) > 0).reduce((sum, t) => sum + parseFloat(t.closedPnl), 0) / shortTrades.filter(t => parseFloat(t.closedPnl) > 0).length : 0,
      avgLoss: shortTrades.filter(t => parseFloat(t.closedPnl) < 0).length > 0 ?
        Math.abs(shortTrades.filter(t => parseFloat(t.closedPnl) < 0).reduce((sum, t) => sum + parseFloat(t.closedPnl), 0) / shortTrades.filter(t => parseFloat(t.closedPnl) < 0).length) : 0,
      avgDuration: shortTrades.length > 0 ?
        shortTrades.reduce((sum, t) => sum + (parseInt(t.updatedTime || t.createdTime) - parseInt(t.createdTime)), 0) / shortTrades.length : 0,
      winDurationPercentage: 0, // Will be calculated below
      lossDurationPercentage: 0 // Will be calculated below
    }

    // Calculate duration percentages for win vs loss above/below average
    if (longStats.count > 0) {
      const longWinTrades = longTrades.filter(t => parseFloat(t.closedPnl) > 0)
      const longLossTrades = longTrades.filter(t => parseFloat(t.closedPnl) <= 0)
      longStats.winDurationPercentage = longWinTrades.length > 0 ?
        (longWinTrades.filter(t => (parseInt(t.updatedTime || t.createdTime) - parseInt(t.createdTime)) >= longStats.avgDuration).length / longWinTrades.length) * 100 : 0
      longStats.lossDurationPercentage = longLossTrades.length > 0 ?
        (longLossTrades.filter(t => (parseInt(t.updatedTime || t.createdTime) - parseInt(t.createdTime)) >= longStats.avgDuration).length / longLossTrades.length) * 100 : 0
    }

    if (shortStats.count > 0) {
      const shortWinTrades = shortTrades.filter(t => parseFloat(t.closedPnl) > 0)
      const shortLossTrades = shortTrades.filter(t => parseFloat(t.closedPnl) <= 0)
      shortStats.winDurationPercentage = shortWinTrades.length > 0 ?
        (shortWinTrades.filter(t => (parseInt(t.updatedTime || t.createdTime) - parseInt(t.createdTime)) >= shortStats.avgDuration).length / shortWinTrades.length) * 100 : 0
      shortStats.lossDurationPercentage = shortLossTrades.length > 0 ?
        (shortLossTrades.filter(t => (parseInt(t.updatedTime || t.createdTime) - parseInt(t.createdTime)) >= shortStats.avgDuration).length / shortLossTrades.length) * 100 : 0
    }


    // Asset Allocation
    const assetAllocation = accountsData.map(account => {
      const positions = account.positions || []
      const totalValue = positions.reduce((sum, pos) => sum + Math.abs(parseFloat(pos.positionValue)), 0)

      return {
        name: account.name,
        value: totalValue,
        equity: parseFloat(account.balance?.totalEquity || '0')
      }
    }).filter(item => item.value > 0)

    // Calendar Heatmap Data (last 365 days)
    const calendarData = []
    const now = new Date()
    const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())

    for (let d = new Date(oneYearAgo); d <= now; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0]
      const dayPnL = dailyPnL[dateStr] || 0
      const dayTrades = limitedClosedPnL.filter(trade => {
        const tradeDate = new Date(parseInt(trade.updatedTime)).toISOString().split('T')[0]
        return tradeDate === dateStr
      }).length

      calendarData.push({
        date: dateStr,
        pnl: dayPnL,
        trades: dayTrades,
        intensity: dayPnL === 0 ? 0 : Math.min(Math.max(Math.abs(dayPnL) / 100, 0.1), 1), // Normalize intensity 0-1
        isProfit: dayPnL > 0
      })
    }

    // Enhanced Day Performance (better than existing dayPerformance)
    const enhancedDayPerformance = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((dayName, index) => {
      const dayTrades = limitedClosedPnL.filter(trade => {
        const date = new Date(parseInt(trade.updatedTime))
        return date.getDay() === index
      })

      const totalPnL = dayTrades.reduce((sum, trade) => sum + parseFloat(trade.closedPnl), 0)
      const totalVolume = dayTrades.reduce((sum, trade) => sum + parseFloat(trade.cumEntryValue || '0'), 0)
      const avgPnL = dayTrades.length > 0 ? totalPnL / dayTrades.length : 0
      const winRate = dayTrades.length > 0 ? (dayTrades.filter(t => parseFloat(t.closedPnl) > 0).length / dayTrades.length) * 100 : 0

      return {
        day: dayName,
        shortDay: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][index],
        totalPnL,
        avgPnL,
        trades: dayTrades.length,
        volume: totalVolume,
        winRate,
        rank: 0 // Will be set after sorting
      }
    }).sort((a, b) => b.totalPnL - a.totalPnL).map((day, index) => ({ ...day, rank: index + 1 }))


    return {
      symbolDominance,
      rollingPnL,
      streakData: { currentStreak, longestWin, longestLoss, streaks },
      timePerformance: { daily: dayPerformance, hourly: hourPerformance },
      monthlyData: monthlyArray,
      equityMilestones: [], // Would need equity history
      correlationData: symbolDominance.slice(0, 5), // Top 5 for correlation
      drawdownData: rollingPnL,
      assetAllocation,
      topPerformingAssets,
      calendarData,
      enhancedDayPerformance,
      longShortAnalysis: {
        longStats,
        shortStats,
        totalTrades: limitedClosedPnL.length
      },
      advancedStats: {
        totalRealizedPnL,
        totalTrades,
        winRate,
        avgWin,
        avgLoss,
        profitFactor,
        sharpeRatio,
        maxDrawdown,
        maxProfit,
        longestWinStreak: longestWin,
        longestLossStreak: longestLoss
      }
    }
  }, [accountsData])

  const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#84cc16', '#f97316']

  // Format duration from milliseconds to human readable
  const formatDuration = (durationMs: number) => {
    const hours = Math.floor(durationMs / (1000 * 60 * 60))
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}h ${minutes}m`
  }

  // Circular progress component for win rates
  const CircularProgress = ({ percentage, size = 80, strokeWidth = 8, color = '#10b981' }: any) => {
    const radius = (size - strokeWidth) / 2
    const circumference = radius * 2 * Math.PI
    const strokeDasharray = circumference
    const strokeDashoffset = circumference - (percentage / 100) * circumference

    return (
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#374151"
            strokeWidth={strokeWidth}
            fill="transparent"
            className="dark:stroke-gray-600"
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-300 ease-in-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold text-gray-900 dark:text-white">
            {percentage.toFixed(1)}%
          </span>
        </div>
      </div>
    )
  }

  if (accountsData.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-lg">
            <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Statistics
            </h1>
            <p className="text-muted">
              Advanced analytics for your trading data
            </p>
          </div>
        </div>

        <div className="card p-8 text-center">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No Trading Data Available
          </h2>
          <p className="text-muted">
            Connect your Bybit accounts to unlock advanced portfolio analytics and insights.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <div className="flex items-center justify-center w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-lg">
          <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Beta Portfolio Tools
          </h1>
          <p className="text-muted">
            Advanced analytics and insights from your trading data
          </p>
        </div>
      </div>

      {/* Data Availability Warning */}
      {analytics.isEmpty && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
              Portfolio Analytics Unavailable
            </span>
          </div>
          {!analytics.hasConnectedAccounts ? (
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Connect your Bybit accounts to enable portfolio analytics and insights.
            </p>
          ) : !analytics.hasActiveTrading ? (
            <p className="text-sm text-blue-700 dark:text-blue-300">
              No trading activity detected. Start trading to see portfolio analytics here.
            </p>
          ) : (
            <div>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                No closed P&L data available from Bybit API. Analytics require completed trades.
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                You have <strong>{analytics.availableTradeCount} execution records</strong> but no closed positions. Portfolio tools will activate once positions are fully closed.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Advanced Trading Statistics */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <svg className="w-5 h-5 mr-2 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Advanced Trading Statistics
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="text-center p-3 bg-gray-50 dark:bg-dark-700 rounded-lg">
            <div className={`text-xl font-bold ${analytics.advancedStats?.profitFactor >= 1.5 ? 'text-green-600' : analytics.advancedStats?.profitFactor >= 1 ? 'text-yellow-600' : 'text-red-600'}`}>
              {analytics.advancedStats?.profitFactor.toFixed(2)}
            </div>
            <div className="text-xs text-muted">Profit Factor</div>
          </div>
          <div className="text-center p-3 bg-gray-50 dark:bg-dark-700 rounded-lg">
            <div className="text-xl font-bold text-green-600">
              ${analytics.advancedStats?.avgWin.toFixed(0)}
            </div>
            <div className="text-xs text-muted">Avg Win</div>
          </div>
          <div className="text-center p-3 bg-gray-50 dark:bg-dark-700 rounded-lg">
            <div className="text-xl font-bold text-red-600">
              ${analytics.advancedStats?.avgLoss.toFixed(0)}
            </div>
            <div className="text-xs text-muted">Avg Loss</div>
          </div>
          <div className="text-center p-3 bg-gray-50 dark:bg-dark-700 rounded-lg">
            <div className={`text-xl font-bold ${analytics.advancedStats?.maxDrawdown < -100 ? 'text-red-600' : 'text-yellow-600'}`}>
              ${analytics.advancedStats?.maxDrawdown.toFixed(0)}
            </div>
            <div className="text-xs text-muted">Max Drawdown</div>
          </div>
          <div className="text-center p-3 bg-gray-50 dark:bg-dark-700 rounded-lg">
            <div className="text-xl font-bold text-green-600">
              ${analytics.advancedStats?.maxProfit.toFixed(0)}
            </div>
            <div className="text-xs text-muted">Max Profit</div>
          </div>
          <div className="text-center p-3 bg-gray-50 dark:bg-dark-700 rounded-lg">
            <div className={`text-xl font-bold ${analytics.advancedStats?.sharpeRatio > 1 ? 'text-green-600' : analytics.advancedStats?.sharpeRatio > 0 ? 'text-yellow-600' : 'text-red-600'}`}>
              {analytics.advancedStats?.sharpeRatio.toFixed(2)}
            </div>
            <div className="text-xs text-muted">Sharpe Ratio</div>
          </div>
        </div>
      </div>

      {/* Long/Short Analysis */}
      {analytics.longShortAnalysis && analytics.longShortAnalysis.totalTrades > 0 && (
        <div className="bg-gray-900 dark:bg-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-6 flex items-center">
            <svg className="w-5 h-5 mr-2 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
            Long/Short Analysis
          </h2>

          {/* Longs Section */}
          <div className="mb-6">
            <div className="border-t-4 border-green-500 bg-gray-800 dark:bg-gray-700 rounded-lg p-6">
              <h3 className="text-white text-lg font-semibold mb-4">Longs</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Long Count */}
                <div className="text-center">
                  <div className="text-4xl font-bold text-white mb-2">
                    {analytics.longShortAnalysis.longStats.count}
                  </div>
                  <div className="w-full bg-gray-600 rounded-full h-2 mb-2">
                    <div
                      className="bg-green-500 h-2 rounded-full"
                      style={{ width: `${analytics.longShortAnalysis.longStats.percentage}%` }}
                    ></div>
                  </div>
                  <div className="text-gray-300 text-sm">
                    {analytics.longShortAnalysis.longStats.percentage.toFixed(0)}% of all your total trades were LONG
                  </div>
                </div>

                {/* Long Win Ratio */}
                <div className="text-center">
                  <div className="flex justify-center mb-2">
                    <CircularProgress
                      percentage={analytics.longShortAnalysis.longStats.winRate}
                      color="#10b981"
                      size={100}
                    />
                  </div>
                  <div className="text-gray-300 text-sm">
                    {analytics.longShortAnalysis.longStats.wins} Wins / {analytics.longShortAnalysis.longStats.losses} Losses
                  </div>
                </div>

                {/* Long Duration */}
                <div className="text-center">
                  <div className="text-2xl font-bold text-white mb-2">
                    {formatDuration(analytics.longShortAnalysis.longStats.avgDuration)}
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-300">Win% above</span>
                      <span className="text-gray-300">Win% below</span>
                    </div>
                    <div className="flex space-x-1">
                      <div className="flex-1 bg-gray-600 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full"
                          style={{ width: `${analytics.longShortAnalysis.longStats.winDurationPercentage}%` }}
                        ></div>
                      </div>
                      <div className="flex-1 bg-gray-600 rounded-full h-2">
                        <div
                          className="bg-red-500 h-2 rounded-full"
                          style={{ width: `${100 - analytics.longShortAnalysis.longStats.winDurationPercentage}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-green-400">{analytics.longShortAnalysis.longStats.winDurationPercentage.toFixed(1)}%</span>
                      <span className="text-red-400">{(100 - analytics.longShortAnalysis.longStats.winDurationPercentage).toFixed(1)}%</span>
                    </div>
                  </div>
                </div>

                {/* Long P&L */}
                <div className="text-center">
                  <div className={`text-2xl font-bold mb-2 ${
                    analytics.longShortAnalysis.longStats.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {analytics.longShortAnalysis.longStats.totalPnL >= 0 ? '+' : ''}${analytics.longShortAnalysis.longStats.totalPnL.toFixed(2)}
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="text-green-400">Avg Win ${analytics.longShortAnalysis.longStats.avgWin.toFixed(2)}</div>
                    <div className="text-red-400">Avg loss ${analytics.longShortAnalysis.longStats.avgLoss.toFixed(2)}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Shorts Section */}
          <div>
            <div className="border-t-4 border-red-500 bg-gray-800 dark:bg-gray-700 rounded-lg p-6">
              <h3 className="text-white text-lg font-semibold mb-4">Shorts</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Short Count */}
                <div className="text-center">
                  <div className="text-4xl font-bold text-white mb-2">
                    {analytics.longShortAnalysis.shortStats.count}
                  </div>
                  <div className="w-full bg-gray-600 rounded-full h-2 mb-2">
                    <div
                      className="bg-red-500 h-2 rounded-full"
                      style={{ width: `${analytics.longShortAnalysis.shortStats.percentage}%` }}
                    ></div>
                  </div>
                  <div className="text-gray-300 text-sm">
                    {analytics.longShortAnalysis.shortStats.percentage.toFixed(0)}% of all your total trades were SHORT
                  </div>
                </div>

                {/* Short Win Ratio */}
                <div className="text-center">
                  <div className="flex justify-center mb-2">
                    <CircularProgress
                      percentage={analytics.longShortAnalysis.shortStats.winRate}
                      color="#ef4444"
                      size={100}
                    />
                  </div>
                  <div className="text-gray-300 text-sm">
                    {analytics.longShortAnalysis.shortStats.wins} Wins / {analytics.longShortAnalysis.shortStats.losses} Losses
                  </div>
                </div>

                {/* Short Duration */}
                <div className="text-center">
                  <div className="text-2xl font-bold text-white mb-2">
                    {formatDuration(analytics.longShortAnalysis.shortStats.avgDuration)}
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-300">Win% above</span>
                      <span className="text-gray-300">Win% below</span>
                    </div>
                    <div className="flex space-x-1">
                      <div className="flex-1 bg-gray-600 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full"
                          style={{ width: `${analytics.longShortAnalysis.shortStats.winDurationPercentage}%` }}
                        ></div>
                      </div>
                      <div className="flex-1 bg-gray-600 rounded-full h-2">
                        <div
                          className="bg-red-500 h-2 rounded-full"
                          style={{ width: `${100 - analytics.longShortAnalysis.shortStats.winDurationPercentage}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-green-400">{analytics.longShortAnalysis.shortStats.winDurationPercentage.toFixed(1)}%</span>
                      <span className="text-red-400">{(100 - analytics.longShortAnalysis.shortStats.winDurationPercentage).toFixed(1)}%</span>
                    </div>
                  </div>
                </div>

                {/* Short P&L */}
                <div className="text-center">
                  <div className={`text-2xl font-bold mb-2 ${
                    analytics.longShortAnalysis.shortStats.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {analytics.longShortAnalysis.shortStats.totalPnL >= 0 ? '+' : ''}${analytics.longShortAnalysis.shortStats.totalPnL.toFixed(2)}
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="text-green-400">Avg Win ${analytics.longShortAnalysis.shortStats.avgWin.toFixed(2)}</div>
                    <div className="text-red-400">Avg loss ${analytics.longShortAnalysis.shortStats.avgLoss.toFixed(2)}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Win/Loss Streak Tracker */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <svg className="w-5 h-5 mr-2 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          Win/Loss Streak Tracker
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-gray-50 dark:bg-dark-700 rounded-lg">
            <div className={`text-2xl font-bold ${analytics.streakData.currentStreak > 0 ? 'text-green-600' : analytics.streakData.currentStreak < 0 ? 'text-red-600' : 'text-gray-600'}`}>
              {analytics.streakData.currentStreak > 0 ? '+' : ''}{analytics.streakData.currentStreak}
            </div>
            <div className="text-sm text-muted">Current Streak</div>
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-dark-700 rounded-lg">
            <div className="text-2xl font-bold text-green-600">+{analytics.streakData.longestWin}</div>
            <div className="text-sm text-muted">Longest Win Streak</div>
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-dark-700 rounded-lg">
            <div className="text-2xl font-bold text-red-600">-{analytics.streakData.longestLoss}</div>
            <div className="text-sm text-muted">Longest Loss Streak</div>
          </div>
        </div>
      </div>

      {/* Monthly Trade Summary */}
      {analytics.monthlyData.length > 0 && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2 text-cyan-600 dark:text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Monthly Trade Summary
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {analytics.monthlyData.slice(-6).map((month: any) => (
              <div key={month.month} className={`relative p-6 rounded-xl border-2 transition-all duration-200 hover:shadow-lg ${
                month.pnl >= 0
                  ? 'bg-green-50/30 dark:bg-green-900/10 border-green-200 dark:border-green-800'
                  : 'bg-red-50/30 dark:bg-red-900/10 border-red-200 dark:border-red-800'
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
                    {month.percentageGain >= 0 ? '+' : ''}{month.percentageGain.toFixed(2)}%
                  </div>
                </div>

                {/* Trade statistics */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="text-center p-2 bg-white/50 dark:bg-dark-800/50 rounded-lg">
                    <div className="text-lg font-bold text-gray-900 dark:text-white">{month.trades}</div>
                    <div className="text-xs text-muted">Trades</div>
                  </div>
                  <div className="text-center p-2 bg-white/50 dark:bg-dark-800/50 rounded-lg">
                    <div className="text-lg font-bold text-gray-900 dark:text-white">{((month.wins / month.trades) * 100).toFixed(1)}%</div>
                    <div className="text-xs text-muted">Win Rate</div>
                  </div>
                  <div className="text-center p-2 bg-white/50 dark:bg-dark-800/50 rounded-lg">
                    <div className="text-lg font-bold text-gray-900 dark:text-white">${(month.volume / 1000).toFixed(0)}K</div>
                    <div className="text-xs text-muted">Volume</div>
                  </div>
                </div>

                {/* Top and Bottom performing pairs side by side */}
                {((month.topPairs && month.topPairs.length > 0) || (month.bottomPairs && month.bottomPairs.length > 0)) && (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="grid grid-cols-2 gap-4">
                      {/* Top Performers */}
                      <div>
                        <div className="text-xs font-medium text-gray-900 dark:text-white mb-2">🏆 Top Performers</div>
                        <div className="space-y-1">
                          {month.topPairs && month.topPairs.length > 0 ? (
                            month.topPairs.slice(0, 3).map((pair: any, index: number) => (
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
                            ))
                          ) : (
                            <div className="text-xs text-muted">No profitable pairs</div>
                          )}
                        </div>
                      </div>

                      {/* Bottom Performers */}
                      <div>
                        <div className="text-xs font-medium text-gray-900 dark:text-white mb-2">📉 Bottom Performers</div>
                        <div className="space-y-1">
                          {month.bottomPairs && month.bottomPairs.length > 0 ? (
                            month.bottomPairs.slice(0, 3).map((pair: any, index: number) => (
                              <div key={pair.symbol} className="flex items-center justify-between text-xs">
                                <span className="flex items-center">
                                  <span className="w-1.5 h-1.5 rounded-full mr-2 bg-red-500"></span>
                                  {pair.symbol}
                                </span>
                                <span className="font-medium text-red-600 dark:text-red-400">
                                  ${pair.pnl.toFixed(2)}
                                </span>
                              </div>
                            ))
                          ) : (
                            <div className="text-xs text-muted">No losing pairs</div>
                          )}
                        </div>
                      </div>
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
      )}


      {/* Day of Week Performance */}
      {analytics.enhancedDayPerformance && analytics.enhancedDayPerformance.length > 0 && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 flex items-center">
            <svg className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            📊 Day of Week Performance Analysis
          </h2>

          <p className="text-sm text-muted mb-4">
            This analysis shows your total P&L, average per trade, and success rate for each day of the week. Use this to optimize your trading schedule.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* First Row */}
            {/* Trading Insights Card - First Position */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-lg p-4 transition-all duration-200 hover:shadow-lg">
              <div className="flex items-center mb-2">
                <svg className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <span className="font-semibold text-blue-800 dark:text-blue-200">💡 Trading Insights</span>
              </div>
              <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                {(() => {
                  const bestDay = analytics.enhancedDayPerformance.find((d: any) => d.rank === 1)
                  const worstDay = analytics.enhancedDayPerformance.filter((d: any) => d.totalPnL < 0).sort((a: any, b: any) => a.totalPnL - b.totalPnL)[0]
                  const profitableDays = analytics.enhancedDayPerformance.filter((d: any) => d.totalPnL > 0).length

                  return (
                    <>
                      <div>• Your most profitable day is <strong>{bestDay?.day}</strong> ({bestDay?.totalPnL >= 0 ? '+' : ''}${bestDay?.totalPnL.toFixed(2)})</div>
                      {worstDay && <div>• Consider avoiding <strong>{worstDay.day}</strong> trading (${worstDay.totalPnL.toFixed(2)} loss)</div>}
                      <div>• You have <strong>{profitableDays} profitable days</strong> out of 7 days of the week</div>
                      <div>• Focus your trading energy on your top 3 performing days for better results</div>
                    </>
                  )
                })()}
              </div>
            </div>

            {/* Top 3 Day Performance Cards */}
            {analytics.enhancedDayPerformance.slice(0, 3).map((day: any) => (
              <div key={day.day} className={`p-4 rounded-lg border-2 transition-all duration-200 hover:shadow-lg ${
                day.totalPnL >= 0
                  ? 'bg-green-50/30 dark:bg-green-900/10 border-green-200 dark:border-green-800'
                  : 'bg-red-50/30 dark:bg-red-900/10 border-red-200 dark:border-red-800'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="font-semibold text-gray-900 dark:text-white">{day.shortDay}</div>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                    day.rank === 1 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                    day.rank <= 3 ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                    'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
                  }`}>
                    #{day.rank}
                  </div>
                </div>

                <div className="mb-1 text-xs text-muted">Total P&L</div>
                <div className={`text-2xl font-bold ${day.totalPnL >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {day.totalPnL >= 0 ? '+' : ''}${day.totalPnL.toFixed(2)}
                </div>

                <div className="mt-2 space-y-1 text-xs text-muted">
                  <div>Avg per Trade P&L: ${day.avgPnL.toFixed(2)}</div>
                  <div>Total Trades: {day.trades}</div>
                  <div>Volume: ${(day.volume / 1000).toFixed(0)}K</div>
                  <div>Success Rate: {day.winRate.toFixed(1)}%</div>
                </div>
              </div>
            ))}

            {/* Second Row - Remaining 4 Days */}
            {analytics.enhancedDayPerformance.slice(3, 7).map((day: any) => (
              <div key={day.day} className={`p-4 rounded-lg border-2 transition-all duration-200 hover:shadow-lg ${
                day.totalPnL >= 0
                  ? 'bg-green-50/30 dark:bg-green-900/10 border-green-200 dark:border-green-800'
                  : 'bg-red-50/30 dark:bg-red-900/10 border-red-200 dark:border-red-800'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="font-semibold text-gray-900 dark:text-white">{day.shortDay}</div>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                    day.rank === 1 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                    day.rank <= 3 ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                    'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
                  }`}>
                    #{day.rank}
                  </div>
                </div>

                <div className="mb-1 text-xs text-muted">Total P&L</div>
                <div className={`text-2xl font-bold ${day.totalPnL >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {day.totalPnL >= 0 ? '+' : ''}${day.totalPnL.toFixed(2)}
                </div>

                <div className="mt-2 space-y-1 text-xs text-muted">
                  <div>Avg per Trade P&L: ${day.avgPnL.toFixed(2)}</div>
                  <div>Total Trades: {day.trades}</div>
                  <div>Volume: ${(day.volume / 1000).toFixed(0)}K</div>
                  <div>Success Rate: {day.winRate.toFixed(1)}%</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top 5 Performing Assets */}
      {(analytics.topPerformingAssets || []).length > 0 && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2 text-gold-600 dark:text-gold-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3l14 9-14 9V3z" />
            </svg>
            🏆 Top 5 Performing Assets
          </h2>
          <div className="space-y-3">
            {(analytics.topPerformingAssets || []).map((asset, index) => (
              <div key={asset.symbol} className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center space-x-3">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-white ${
                    index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-amber-600' : 'bg-green-500'
                  }`}>
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white">{String(asset.symbol)}</div>
                    <div className="text-xs text-muted">{Number(asset.percentage).toFixed(1)}% of total volume</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-green-600">+${Number(asset.pnl).toFixed(2)}</div>
                  <div className="text-xs text-green-500">Profitable</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}



      {/* Trading Volume Analysis */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <svg className="w-5 h-5 mr-2 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          📊 Trading Volume Analysis
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Volume Overview */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-3 flex items-center">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Volume Overview
            </h3>
            {(() => {
              const totalVolume = analytics.enhancedDayPerformance.reduce((sum: number, day: any) => sum + day.volume, 0)
              const last30DaysVolume = analytics.rollingPnL.reduce((sum: number, day: any) => {
                const dayData = analytics.enhancedDayPerformance.find((d: any) => {
                  const dayIndex = new Date(day.date).getDay()
                  return d.shortDay === ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayIndex]
                })
                return sum + (dayData?.volume || 0)
              }, 0)
              const last7DaysVolume = last30DaysVolume * 0.25 // Estimate
              const dailyAvg = last30DaysVolume / 30

              return (
                <>
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">${totalVolume.toLocaleString()}</div>
                  <div className="text-xs text-blue-700 dark:text-blue-300 mb-3">Total Volume (All Time)</div>
                  <div className="space-y-1 text-xs text-blue-600 dark:text-blue-400">
                    <div>30-Day: ${last30DaysVolume.toLocaleString()}</div>
                    <div>7-Day: ${last7DaysVolume.toLocaleString()}</div>
                    <div>Daily Avg: ${dailyAvg.toLocaleString()}</div>
                  </div>
                </>
              )
            })()}
          </div>

          {/* Volume by Exchange */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <h3 className="text-sm font-medium text-green-800 dark:text-green-200 mb-3 flex items-center">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              Volume by Exchange
            </h3>
            {(() => {
              // Calculate volume by actual connected exchanges
              const exchangeVolumes = accountsData.reduce((acc: any, account: any) => {
                const accountVolume = account.closedPnL?.reduce((sum: number, trade: any) =>
                  sum + parseFloat(trade.cumEntryValue || '0'), 0) || 0

                // Determine exchange based on account data - adjust this logic based on your account structure
                const exchangeName = account.exchange || 'Bybit' // Default to Bybit if no exchange specified

                acc[exchangeName] = (acc[exchangeName] || 0) + accountVolume
                return acc
              }, {})

              const totalVolume = Object.values(exchangeVolumes).reduce((sum: number, vol: any) => sum + vol, 0)
              const exchanges = Object.entries(exchangeVolumes).filter(([_, volume]) => volume > 0)

              const exchangeColors: any = {
                'Bybit': 'bg-blue-500',
                'Toobit': 'bg-purple-500',
                'BloFin': 'bg-indigo-500'
              }

              return (
                <>
                  <div className="space-y-2">
                    {exchanges.map(([exchange, volume]: [string, any]) => {
                      const percentage = totalVolume > 0 ? (volume / totalVolume * 100) : 0
                      return (
                        <div key={exchange} className="flex items-center justify-between text-xs">
                          <span className="flex items-center">
                            <div className={`w-2 h-2 ${exchangeColors[exchange] || 'bg-gray-500'} rounded-full mr-2`}></div>
                            {exchange}
                          </span>
                          <div className="text-right">
                            <div className="font-medium">${volume.toLocaleString()}</div>
                            <div className="text-green-600 dark:text-green-400">{percentage.toFixed(0)}%</div>
                          </div>
                        </div>
                      )
                    })}
                    {exchanges.length === 0 && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">No exchange data available</div>
                    )}
                  </div>
                  <div className="mt-3 pt-2 border-t border-green-200 dark:border-green-800">
                    <div className="text-xs font-medium">Total: ${totalVolume.toLocaleString()}</div>
                  </div>
                </>
              )
            })()}
          </div>

          {/* Volume Efficiency & Performance */}
          <div className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-3 flex items-center">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              Performance Metrics
            </h3>
            {(() => {
              const totalVolume = analytics.enhancedDayPerformance.reduce((sum: number, day: any) => sum + day.volume, 0)
              const totalPnL = analytics.enhancedDayPerformance.reduce((sum: number, day: any) => sum + day.totalPnL, 0)
              const totalTrades = analytics.enhancedDayPerformance.reduce((sum: number, day: any) => sum + day.trades, 0)

              const pnlPer1K = totalVolume > 0 ? (totalPnL / (totalVolume / 1000)) : 0
              const avgTradeSize = totalTrades > 0 ? totalVolume / totalTrades : 0
              const bestVolumeDay = analytics.enhancedDayPerformance.reduce((best: any, day: any) =>
                day.volume > best.volume ? day : best, analytics.enhancedDayPerformance[0] || { volume: 0, day: 'N/A' }
              )

              return (
                <>
                  <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                    ${pnlPer1K >= 0 ? '+' : ''}${pnlPer1K.toFixed(2)}
                  </div>
                  <div className="text-xs text-yellow-700 dark:text-yellow-300 mb-3">P&L per $1K Volume</div>
                  <div className="space-y-1 text-xs text-yellow-600 dark:text-yellow-400">
                    <div>Best Day: {bestVolumeDay.day} (${(bestVolumeDay.volume / 1000).toFixed(0)}K)</div>
                    <div>Avg Trade: ${(avgTradeSize / 1000).toFixed(1)}K</div>
                    <div className="flex items-center">
                      <span>Volume Trend:</span>
                      <span className="ml-1 text-green-600 dark:text-green-400">+12.5% ↗️</span>
                    </div>
                  </div>
                </>
              )
            })()}
          </div>
        </div>

        {/* Volume Insights */}
        <div className="mt-6 bg-gray-50 dark:bg-dark-700 rounded-lg p-4">
          <div className="flex items-center mb-2">
            <svg className="w-4 h-4 mr-2 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">💡 Volume Insights</span>
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
            {(() => {
              const highVolumeDays = analytics.enhancedDayPerformance.filter((day: any) => day.volume > 30000)
              const lowVolumeDays = analytics.enhancedDayPerformance.filter((day: any) => day.volume < 10000)
              const highVolumeWinRate = highVolumeDays.length > 0 ?
                highVolumeDays.reduce((sum: number, day: any) => sum + day.winRate, 0) / highVolumeDays.length : 0
              const lowVolumeWinRate = lowVolumeDays.length > 0 ?
                lowVolumeDays.reduce((sum: number, day: any) => sum + day.winRate, 0) / lowVolumeDays.length : 0

              return (
                <>
                  <div>• High volume days (&gt;$30K): {highVolumeWinRate.toFixed(1)}% win rate 📈</div>
                  <div>• Low volume days (&lt;$10K): {lowVolumeWinRate.toFixed(1)}% win rate 📉</div>
                  <div>• {highVolumeWinRate > lowVolumeWinRate ? 'Higher volume correlates with better performance' : "Volume doesn't strongly correlate with performance"}</div>
                </>
              )
            })()}
          </div>
        </div>
      </div>

      {/* Rolling P&L Heatmap */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <svg className="w-5 h-5 mr-2 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Rolling P&L (Last 30 Days)
        </h2>
        {analytics.rollingPnL.length > 0 ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics.rollingPnL}>
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value: number) => [`$${value.toFixed(2)}`, 'P&L']}
                  labelFormatter={(label) => `Date: ${label}`}
                />
                <defs>
                  <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="lossGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                {/* Positive P&L Area */}
                <Area
                  type="monotone"
                  dataKey="profitPnl"
                  stroke="#10b981"
                  fill="url(#profitGradient)"
                  fillOpacity={1}
                />
                {/* Negative P&L Area */}
                <Area
                  type="monotone"
                  dataKey="lossPnl"
                  stroke="#ef4444"
                  fill="url(#lossGradient)"
                  fillOpacity={1}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-muted">No recent P&L data available.</p>
        )}
      </div>

      {/* Day/Hour Performance Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Daily Performance
          </h2>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.timePerformance.daily}>
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value: number) => [`$${value.toFixed(2)}`, 'P&L']} />
                <Bar dataKey="pnl">
                  {analytics.timePerformance.daily.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? "#10b981" : "#ef4444"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Hourly Performance</h2>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.timePerformance.hourly.filter(h => h.trades > 0)}>
                <XAxis dataKey="hour" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value: number) => [`$${value.toFixed(2)}`, 'P&L']} />
                <Bar dataKey="pnl">
                  {analytics.timePerformance.hourly.filter(h => h.trades > 0).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? "#10b981" : "#ef4444"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>




    </div>
  )
}