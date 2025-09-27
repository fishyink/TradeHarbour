import { useMemo, useState } from 'react'
import { useAppStore } from '../store/useAppStore'

export const AccountHealthScore = () => {
  const { accountsData } = useAppStore()
  const [selectedTimeframe, setSelectedTimeframe] = useState<'30D' | '90D' | '180D'>('30D')

  // Calculate health score analytics from real data
  const healthAnalytics = useMemo(() => {
    const allClosedPnL = accountsData.flatMap(account => account.closedPnL || [])

    if (allClosedPnL.length === 0) {
      return {
        healthScore: 0,
        healthScoreBreakdown: null,
        accountHealthScores: [],
        isEmpty: true
      }
    }

    // Filter based on selected timeframe
    const timeframeDays = selectedTimeframe === '30D' ? 30 : selectedTimeframe === '90D' ? 90 : 180
    const timeframeAgo = Date.now() - (timeframeDays * 24 * 60 * 60 * 1000)
    const limitedClosedPnL = allClosedPnL.filter(pnl => {
      const pnlTime = parseInt(pnl.updatedTime || pnl.createdTime)
      return pnlTime >= timeframeAgo
    })

    // Symbol Dominance Analysis
    const symbolPnL = limitedClosedPnL.reduce((acc, trade) => {
      const symbol = trade.symbol
      const pnl = parseFloat(trade.closedPnl)
      acc[symbol] = (acc[symbol] || 0) + pnl
      return acc
    }, {} as Record<string, number>)

    const symbolDominance = Object.entries(symbolPnL)
      .map(([symbol, pnl]) => ({ symbol: symbol.replace('USDT', ''), pnl }))
      .sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl))

    // Account Health Score calculation
    const totalEquity = accountsData.reduce((sum, acc) => sum + parseFloat(acc.balance?.totalEquity || '0'), 0)
    const totalUnrealizedPnL = accountsData.reduce((sum, acc) => sum + parseFloat(acc.balance?.totalPerpUPL || '0'), 0)
    const winRate = limitedClosedPnL.length > 0 ? (limitedClosedPnL.filter(t => parseFloat(t.closedPnl) > 0).length / limitedClosedPnL.length) * 100 : 0
    const avgPnL = limitedClosedPnL.length > 0 ? limitedClosedPnL.reduce((sum, t) => sum + parseFloat(t.closedPnl), 0) / limitedClosedPnL.length : 0
    const wins = limitedClosedPnL.filter(t => parseFloat(t.closedPnl) > 0).length
    const totalTrades = limitedClosedPnL.length
    const unrealizedLossPercent = totalEquity > 0 ? (totalUnrealizedPnL / totalEquity) * 100 : 0

    // Health score breakdown
    const baseScore = 50
    const winRateScore = winRate > 50 ? 20 : 0
    const avgPnLScore = avgPnL > 0 ? 15 : 0
    const riskScore = totalUnrealizedPnL > totalEquity * -0.05 ? 10 : 0
    const diversificationScore = symbolDominance.length > 3 ? 5 : 0

    const healthScore = Math.min(100, Math.max(0, baseScore + winRateScore + avgPnLScore + riskScore + diversificationScore))

    // Health score details for breakdown
    const healthScoreBreakdown = {
      total: healthScore,
      base: baseScore,
      winRate: { points: winRateScore, maxPoints: 20, value: winRate, achieved: winRate > 50 },
      avgPnL: { points: avgPnLScore, maxPoints: 15, value: avgPnL, achieved: avgPnL > 0 },
      riskManagement: { points: riskScore, maxPoints: 10, value: unrealizedLossPercent, achieved: totalUnrealizedPnL > totalEquity * -0.05 },
      diversification: { points: diversificationScore, maxPoints: 5, value: symbolDominance.length, achieved: symbolDominance.length > 3 },
      metrics: {
        totalTrades,
        wins,
        winRate,
        avgPnL,
        totalEquity,
        totalUnrealizedPnL,
        unrealizedLossPercent,
        tradingPairs: symbolDominance.length
      }
    }

    // Account-by-account health scores for comparison
    const accountHealthScores = accountsData.map(account => {
      const accountClosedPnL = (account.closedPnL || []).filter(pnl => {
        const pnlTime = parseInt(pnl.updatedTime || pnl.createdTime)
        return pnlTime >= timeframeAgo
      })

      const accountWinRate = accountClosedPnL.length > 0 ? (accountClosedPnL.filter(t => parseFloat(t.closedPnl) > 0).length / accountClosedPnL.length) * 100 : 0
      const accountAvgPnL = accountClosedPnL.length > 0 ? accountClosedPnL.reduce((sum, t) => sum + parseFloat(t.closedPnl), 0) / accountClosedPnL.length : 0
      const accountEquity = parseFloat(account.balance?.totalEquity || '0')
      const accountUnrealizedPnL = parseFloat(account.balance?.totalPerpUPL || '0')
      const accountUnrealizedLossPercent = accountEquity > 0 ? (accountUnrealizedPnL / accountEquity) * 100 : 0

      // Calculate symbols for this account
      const accountSymbols = [...new Set(accountClosedPnL.map(t => t.symbol))].length

      // Calculate health score for this account
      let accountHealth = 50
      if (accountWinRate > 50) accountHealth += 20
      if (accountAvgPnL > 0) accountHealth += 15
      if (accountUnrealizedPnL > accountEquity * -0.05) accountHealth += 10
      if (accountSymbols > 3) accountHealth += 5
      accountHealth = Math.min(100, Math.max(0, accountHealth))

      return {
        name: account.name,
        healthScore: accountHealth,
        winRate: accountWinRate,
        avgPnL: accountAvgPnL,
        trades: accountClosedPnL.length,
        equity: accountEquity,
        unrealizedLossPercent: accountUnrealizedLossPercent,
        symbols: accountSymbols
      }
    })

    return {
      healthScore,
      healthScoreBreakdown,
      accountHealthScores,
      isEmpty: false
    }
  }, [accountsData, selectedTimeframe])

  if (accountsData.length === 0) {
    return (
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <svg className="w-5 h-5 mr-2 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          Account Health Score
        </h2>
        <div className="text-center py-8">
          <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No Accounts Connected
          </h3>
          <p className="text-muted">
            Connect your Bybit accounts to see your account health score and performance analytics.
          </p>
        </div>
      </div>
    )
  }

  if (healthAnalytics.isEmpty) {
    return (
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <svg className="w-5 h-5 mr-2 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          Account Health Score
        </h2>
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
              Health Score Unavailable
            </span>
          </div>
          <p className="text-sm text-blue-700 dark:text-blue-300">
            No trading data available. Start trading to see your account health score and performance analytics.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
          <svg className="w-5 h-5 mr-2 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          Account Health Score
        </h2>
        <div className="flex gap-2">
          {(['30D', '90D', '180D'] as const).map((timeframe) => (
            <button
              key={timeframe}
              onClick={() => setSelectedTimeframe(timeframe)}
              className={`px-3 py-1 rounded-md text-sm transition-colors ${
                selectedTimeframe === timeframe
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 font-medium'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              {timeframe}
            </button>
          ))}
        </div>
      </div>

      {/* Main Score Display */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Score Overview */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-3xl font-bold text-gray-900 dark:text-white">{healthAnalytics.healthScore}/100</span>
            <div className="text-right">
              <span className={`text-lg font-semibold ${healthAnalytics.healthScore >= 80 ? 'text-green-600' : healthAnalytics.healthScore >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                {healthAnalytics.healthScore >= 80 ? 'Excellent' : healthAnalytics.healthScore >= 60 ? 'Good' : 'Needs Attention'}
              </span>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Based on {healthAnalytics.healthScoreBreakdown?.metrics.totalTrades || 0} trades
              </p>
            </div>
          </div>

          <div className="w-full bg-gray-200 dark:bg-dark-600 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all duration-500 ${healthAnalytics.healthScore >= 80 ? 'bg-green-500' : healthAnalytics.healthScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
              style={{ width: `${healthAnalytics.healthScore}%` }}
            ></div>
          </div>

          {/* Key Metrics Summary */}
          <div className="grid grid-cols-2 gap-4 pt-4">
            <div className="text-center p-3 bg-gray-50 dark:bg-dark-700 rounded-lg">
              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                {healthAnalytics.healthScoreBreakdown?.metrics.winRate?.toFixed(1) || '0.0'}%
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Win Rate</div>
            </div>
            <div className="text-center p-3 bg-gray-50 dark:bg-dark-700 rounded-lg">
              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                ${healthAnalytics.healthScoreBreakdown?.metrics.avgPnL?.toFixed(2) || '0.00'}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Avg P&L</div>
            </div>
          </div>
        </div>

        {/* Visual Progress Rings */}
        <div className="space-y-3">
          <h3 className="text-md font-medium text-gray-900 dark:text-white mb-4">Component Breakdown</h3>
          {healthAnalytics.healthScoreBreakdown && (
            <div className="space-y-3">
              {/* Win Rate Ring */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Win Rate</span>
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 relative">
                    <svg className="w-8 h-8 transform -rotate-90" viewBox="0 0 32 32">
                      <circle cx="16" cy="16" r="12" stroke="currentColor" strokeWidth="3" fill="transparent" className="text-gray-200 dark:text-gray-600"/>
                      <circle cx="16" cy="16" r="12" stroke="currentColor" strokeWidth="3" fill="transparent"
                        className={healthAnalytics.healthScoreBreakdown.winRate.achieved ? "text-green-500" : "text-gray-400"}
                        strokeDasharray={`${(healthAnalytics.healthScoreBreakdown.winRate.points / healthAnalytics.healthScoreBreakdown.winRate.maxPoints) * 75.4} 75.4`}
                        strokeLinecap="round"/>
                    </svg>
                  </div>
                  <span className="text-sm font-semibold">{healthAnalytics.healthScoreBreakdown.winRate.points}/{healthAnalytics.healthScoreBreakdown.winRate.maxPoints}</span>
                  <span className={`text-xs px-2 py-1 rounded ${healthAnalytics.healthScoreBreakdown.winRate.achieved ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>
                    {healthAnalytics.healthScoreBreakdown.winRate.achieved ? '✓' : '○'}
                  </span>
                </div>
              </div>

              {/* Profitability Ring */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Profitability</span>
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 relative">
                    <svg className="w-8 h-8 transform -rotate-90" viewBox="0 0 32 32">
                      <circle cx="16" cy="16" r="12" stroke="currentColor" strokeWidth="3" fill="transparent" className="text-gray-200 dark:text-gray-600"/>
                      <circle cx="16" cy="16" r="12" stroke="currentColor" strokeWidth="3" fill="transparent"
                        className={healthAnalytics.healthScoreBreakdown.avgPnL.achieved ? "text-green-500" : "text-gray-400"}
                        strokeDasharray={`${(healthAnalytics.healthScoreBreakdown.avgPnL.points / healthAnalytics.healthScoreBreakdown.avgPnL.maxPoints) * 75.4} 75.4`}
                        strokeLinecap="round"/>
                    </svg>
                  </div>
                  <span className="text-sm font-semibold">{healthAnalytics.healthScoreBreakdown.avgPnL.points}/{healthAnalytics.healthScoreBreakdown.avgPnL.maxPoints}</span>
                  <span className={`text-xs px-2 py-1 rounded ${healthAnalytics.healthScoreBreakdown.avgPnL.achieved ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>
                    {healthAnalytics.healthScoreBreakdown.avgPnL.achieved ? '✓' : '○'}
                  </span>
                </div>
              </div>

              {/* Risk Management Ring */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Risk Management</span>
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 relative">
                    <svg className="w-8 h-8 transform -rotate-90" viewBox="0 0 32 32">
                      <circle cx="16" cy="16" r="12" stroke="currentColor" strokeWidth="3" fill="transparent" className="text-gray-200 dark:text-gray-600"/>
                      <circle cx="16" cy="16" r="12" stroke="currentColor" strokeWidth="3" fill="transparent"
                        className={healthAnalytics.healthScoreBreakdown.riskManagement.achieved ? "text-green-500" : "text-gray-400"}
                        strokeDasharray={`${(healthAnalytics.healthScoreBreakdown.riskManagement.points / healthAnalytics.healthScoreBreakdown.riskManagement.maxPoints) * 75.4} 75.4`}
                        strokeLinecap="round"/>
                    </svg>
                  </div>
                  <span className="text-sm font-semibold">{healthAnalytics.healthScoreBreakdown.riskManagement.points}/{healthAnalytics.healthScoreBreakdown.riskManagement.maxPoints}</span>
                  <span className={`text-xs px-2 py-1 rounded ${healthAnalytics.healthScoreBreakdown.riskManagement.achieved ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>
                    {healthAnalytics.healthScoreBreakdown.riskManagement.achieved ? '✓' : '○'}
                  </span>
                </div>
              </div>

              {/* Diversification Ring */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Diversification</span>
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 relative">
                    <svg className="w-8 h-8 transform -rotate-90" viewBox="0 0 32 32">
                      <circle cx="16" cy="16" r="12" stroke="currentColor" strokeWidth="3" fill="transparent" className="text-gray-200 dark:text-gray-600"/>
                      <circle cx="16" cy="16" r="12" stroke="currentColor" strokeWidth="3" fill="transparent"
                        className={healthAnalytics.healthScoreBreakdown.diversification.achieved ? "text-green-500" : "text-gray-400"}
                        strokeDasharray={`${(healthAnalytics.healthScoreBreakdown.diversification.points / healthAnalytics.healthScoreBreakdown.diversification.maxPoints) * 75.4} 75.4`}
                        strokeLinecap="round"/>
                    </svg>
                  </div>
                  <span className="text-sm font-semibold">{healthAnalytics.healthScoreBreakdown.diversification.points}/{healthAnalytics.healthScoreBreakdown.diversification.maxPoints}</span>
                  <span className={`text-xs px-2 py-1 rounded ${healthAnalytics.healthScoreBreakdown.diversification.achieved ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>
                    {healthAnalytics.healthScoreBreakdown.diversification.achieved ? '✓' : '○'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Detailed Breakdown */}
      {healthAnalytics.healthScoreBreakdown && (
        <div className="border-t border-gray-200 dark:border-dark-600 pt-6">
          <h3 className="text-md font-medium text-gray-900 dark:text-white mb-4">Detailed Breakdown</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Base Score */}
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-800 dark:text-blue-200">Base Score</span>
                <span className="text-lg font-bold text-blue-900 dark:text-blue-100">{healthAnalytics.healthScoreBreakdown.base}</span>
              </div>
              <p className="text-xs text-blue-600 dark:text-blue-300">Starting foundation</p>
            </div>

            {/* Win Rate Details */}
            <div className={`p-4 rounded-lg border ${healthAnalytics.healthScoreBreakdown.winRate.achieved ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-600'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-sm font-medium ${healthAnalytics.healthScoreBreakdown.winRate.achieved ? 'text-green-800 dark:text-green-200' : 'text-gray-600 dark:text-gray-400'}`}>
                  Win Rate {healthAnalytics.healthScoreBreakdown.winRate.achieved ? '✓' : '✗'}
                </span>
                <span className={`text-lg font-bold ${healthAnalytics.healthScoreBreakdown.winRate.achieved ? 'text-green-900 dark:text-green-100' : 'text-gray-700 dark:text-gray-300'}`}>
                  +{healthAnalytics.healthScoreBreakdown.winRate.points}
                </span>
              </div>
              <p className={`text-xs ${healthAnalytics.healthScoreBreakdown.winRate.achieved ? 'text-green-600 dark:text-green-300' : 'text-gray-500 dark:text-gray-400'}`}>
                {healthAnalytics.healthScoreBreakdown.winRate.value.toFixed(1)}% ({healthAnalytics.healthScoreBreakdown.metrics.wins}/{healthAnalytics.healthScoreBreakdown.metrics.totalTrades} wins)
              </p>
              {!healthAnalytics.healthScoreBreakdown.winRate.achieved && (
                <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">Need &gt;50% win rate</p>
              )}
            </div>

            {/* Profitability Details */}
            <div className={`p-4 rounded-lg border ${healthAnalytics.healthScoreBreakdown.avgPnL.achieved ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-600'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-sm font-medium ${healthAnalytics.healthScoreBreakdown.avgPnL.achieved ? 'text-green-800 dark:text-green-200' : 'text-gray-600 dark:text-gray-400'}`}>
                  Profitability {healthAnalytics.healthScoreBreakdown.avgPnL.achieved ? '✓' : '✗'}
                </span>
                <span className={`text-lg font-bold ${healthAnalytics.healthScoreBreakdown.avgPnL.achieved ? 'text-green-900 dark:text-green-100' : 'text-gray-700 dark:text-gray-300'}`}>
                  +{healthAnalytics.healthScoreBreakdown.avgPnL.points}
                </span>
              </div>
              <p className={`text-xs ${healthAnalytics.healthScoreBreakdown.avgPnL.achieved ? 'text-green-600 dark:text-green-300' : 'text-gray-500 dark:text-gray-400'}`}>
                ${healthAnalytics.healthScoreBreakdown.avgPnL.value.toFixed(2)} avg per trade
              </p>
              {!healthAnalytics.healthScoreBreakdown.avgPnL.achieved && (
                <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">Need positive avg P&L</p>
              )}
            </div>

            {/* Risk Management Details */}
            <div className={`p-4 rounded-lg border ${healthAnalytics.healthScoreBreakdown.riskManagement.achieved ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-600'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-sm font-medium ${healthAnalytics.healthScoreBreakdown.riskManagement.achieved ? 'text-green-800 dark:text-green-200' : 'text-gray-600 dark:text-gray-400'}`}>
                  Risk Control {healthAnalytics.healthScoreBreakdown.riskManagement.achieved ? '✓' : '✗'}
                </span>
                <span className={`text-lg font-bold ${healthAnalytics.healthScoreBreakdown.riskManagement.achieved ? 'text-green-900 dark:text-green-100' : 'text-gray-700 dark:text-gray-300'}`}>
                  +{healthAnalytics.healthScoreBreakdown.riskManagement.points}
                </span>
              </div>
              <p className={`text-xs ${healthAnalytics.healthScoreBreakdown.riskManagement.achieved ? 'text-green-600 dark:text-green-300' : 'text-gray-500 dark:text-gray-400'}`}>
                {healthAnalytics.healthScoreBreakdown.riskManagement.value.toFixed(1)}% unrealized loss
              </p>
              {!healthAnalytics.healthScoreBreakdown.riskManagement.achieved && (
                <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">Keep losses under 5%</p>
              )}
            </div>
          </div>

          {/* Improvement Suggestions */}
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-3">
              Improvement Suggestions
            </h4>
            <div className="space-y-2">
              {!healthAnalytics.healthScoreBreakdown.winRate.achieved && (
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  <strong>Improve win rate:</strong> Focus on higher probability setups to get above 50% win rate
                </p>
              )}
              {!healthAnalytics.healthScoreBreakdown.avgPnL.achieved && (
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  <strong>Increase profitability:</strong> Optimize position sizing and take-profit levels
                </p>
              )}
              {!healthAnalytics.healthScoreBreakdown.riskManagement.achieved && (
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  <strong>Reduce risk exposure:</strong> Keep unrealized losses below 5% of total equity
                </p>
              )}
              {!healthAnalytics.healthScoreBreakdown.diversification.achieved && (
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  <strong>Diversify trading pairs:</strong> Trade {4 - healthAnalytics.healthScoreBreakdown.diversification.value} more symbols for better diversification
                </p>
              )}
              {healthAnalytics.healthScore >= 90 && (
                <p className="text-sm text-green-700 dark:text-green-300">
                  <strong>Excellent performance!</strong> You're maintaining top-tier trading discipline across all metrics.
                </p>
              )}
            </div>
          </div>

          {/* Account Comparison */}
          {healthAnalytics.accountHealthScores && healthAnalytics.accountHealthScores.length > 1 && (
            <div className="mt-6 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <h4 className="text-sm font-medium text-purple-800 dark:text-purple-200 mb-3">
                Account Performance Comparison
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {healthAnalytics.accountHealthScores.sort((a, b) => b.healthScore - a.healthScore).map((account, index) => (
                  <div key={account.name} className={`p-3 rounded-lg border ${index === 0 ? 'bg-gold-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700' : 'bg-white dark:bg-dark-700 border-gray-200 dark:border-gray-600'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {account.name}
                        {index === 0 && <span className="ml-1 text-yellow-600 text-xs">Best</span>}
                      </span>
                      <span className={`text-lg font-bold ${account.healthScore >= 80 ? 'text-green-600' : account.healthScore >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {account.healthScore}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600 dark:text-gray-400">Win Rate:</span>
                        <span className="font-medium text-gray-900 dark:text-white">{account.winRate.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600 dark:text-gray-400">Avg P&L:</span>
                        <span className="font-medium text-gray-900 dark:text-white">${account.avgPnL.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600 dark:text-gray-400">Trades:</span>
                        <span className="font-medium text-gray-900 dark:text-white">{account.trades}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600 dark:text-gray-400">Equity:</span>
                        <span className="font-medium text-gray-900 dark:text-white">${account.equity.toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="mt-2 w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1">
                      <div
                        className={`h-1 rounded-full ${account.healthScore >= 80 ? 'bg-green-500' : account.healthScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                        style={{ width: `${account.healthScore}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 text-xs text-purple-600 dark:text-purple-400">
                Accounts ranked by health score • Best performing account highlighted
              </div>
            </div>
          )}

          {/* Performance Context */}
          <div className="mt-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-lg font-semibold text-gray-900 dark:text-white">
                  {healthAnalytics.healthScoreBreakdown?.metrics.totalTrades || 0}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Total Trades (30d)</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-gray-900 dark:text-white">
                  {healthAnalytics.healthScoreBreakdown?.metrics.tradingPairs || 0}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Trading Pairs</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-gray-900 dark:text-white">
                  ${(healthAnalytics.healthScoreBreakdown?.metrics.totalEquity || 0).toLocaleString()}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Total Equity</div>
              </div>
              <div>
                <div className={`text-lg font-semibold ${(healthAnalytics.healthScoreBreakdown?.metrics.unrealizedLossPercent || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {(healthAnalytics.healthScoreBreakdown?.metrics.unrealizedLossPercent || 0).toFixed(1)}%
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Unrealized P&L</div>
              </div>
            </div>
            <div className="mt-3 text-xs text-gray-500 dark:text-gray-400 text-center">
              Health score based on 30-day performance • Updates with each refresh
            </div>
          </div>
        </div>
      )}
    </div>
  )
}