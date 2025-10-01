import { useMemo, useState, useEffect } from 'react'
import { useAppStore } from '../store/useAppStore'

const InfoIcon = ({ tooltip }: { tooltip: string }) => (
  <div className="relative group inline-block">
    <svg className="w-4 h-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-4 py-3 bg-gray-900 dark:bg-gray-700 text-white text-sm rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 w-80 max-w-xs text-left">
      <div className="whitespace-normal break-words leading-relaxed">
        {tooltip}
      </div>
      <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
    </div>
  </div>
)

interface HealthScoreWeights {
  baseScore: number
  winRate: { min: number, max: number, points: number }
  profitability: { min: number, max: number, points: number }
  riskManagement: { min: number, max: number, points: number }
  diversification: { min: number, max: number, points: number }
  consistency: { min: number, max: number, points: number }
  drawdown: { min: number, max: number, points: number }
}

const defaultWeights: HealthScoreWeights = {
  baseScore: 40,
  winRate: { min: 30, max: 70, points: 10 },
  profitability: { min: -5, max: 5, points: 15 },
  riskManagement: { min: 2, max: 15, points: 10 },
  diversification: { min: 1, max: 8, points: 5 },
  consistency: { min: 0.01, max: 0.5, points: 10 },
  drawdown: { min: 5, max: 50, points: 5 }
}

const WeightEditor = ({
  title,
  description,
  value,
  onChange,
  min,
  max,
  minRange,
  maxRange,
  pointsMin,
  pointsMax,
  isRange
}: {
  title: string
  description: string
  value: number | { min: number, max: number, points: number }
  onChange: (value: any) => void
  min?: number
  max?: number
  minRange?: number
  maxRange?: number
  pointsMin?: number
  pointsMax?: number
  isRange: boolean
}) => {
  if (isRange && typeof value === 'object') {
    return (
      <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
        <div className="flex items-center mb-2">
          <h4 className="font-medium text-gray-900 dark:text-white">{title}</h4>
          <InfoIcon tooltip={`${description}. Configure min/max thresholds and point allocation for ${title.toLowerCase()} scoring.`} />
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{description}</p>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Min Threshold ({title === 'Win Rate' ? '%' : title === 'Profitability' ? '$' : title === 'Risk Management' || title === 'Drawdown Control' ? '%' : ''})
            </label>
            <input
              type="number"
              value={value.min}
              onChange={(e) => onChange({...value, min: parseFloat(e.target.value) || 0})}
              min={minRange}
              max={maxRange}
              step={title === 'Consistency' ? 0.01 : 1}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Max Threshold ({title === 'Win Rate' ? '%' : title === 'Profitability' ? '$' : title === 'Risk Management' || title === 'Drawdown Control' ? '%' : ''})
            </label>
            <input
              type="number"
              value={value.max}
              onChange={(e) => onChange({...value, max: parseFloat(e.target.value) || 0})}
              min={minRange}
              max={maxRange}
              step={title === 'Consistency' ? 0.01 : 1}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Max Points
            </label>
            <input
              type="number"
              value={value.points}
              onChange={(e) => onChange({...value, points: parseInt(e.target.value) || 0})}
              min={pointsMin}
              max={pointsMax}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
      <div className="flex items-center mb-2">
        <h4 className="font-medium text-gray-900 dark:text-white">{title}</h4>
        <InfoIcon tooltip={`${description}. Configure point allocation for ${title.toLowerCase()} scoring.`} />
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{description}</p>

      <div>
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
          Points
        </label>
        <input
          type="number"
          value={value as number}
          onChange={(e) => onChange(parseInt(e.target.value) || 0)}
          min={min}
          max={max}
          className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        />
      </div>
    </div>
  )
}

export const AccountHealthScore = () => {
  const { accountsData } = useAppStore()
  const [selectedTimeframe, setSelectedTimeframe] = useState<'30D' | '90D' | '180D'>('30D')
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]) // Empty array means "all accounts"
  const [showWeightSettings, setShowWeightSettings] = useState(false)
  const [customWeights, setCustomWeights] = useState<HealthScoreWeights>(defaultWeights)

  // Load custom weights from localStorage on mount
  useEffect(() => {
    try {
      const savedWeights = localStorage.getItem('healthScoreWeights')
      if (savedWeights) {
        setCustomWeights(JSON.parse(savedWeights))
      }
    } catch (error) {
      console.error('Failed to load health score weights:', error)
    }
  }, [])

  // Save weights to localStorage
  const saveWeights = (weights: HealthScoreWeights) => {
    try {
      localStorage.setItem('healthScoreWeights', JSON.stringify(weights))
      setCustomWeights(weights)
    } catch (error) {
      console.error('Failed to save health score weights:', error)
    }
  }

  // Calculate health score analytics from real data
  const healthAnalytics = useMemo(() => {
    // Filter accounts based on selection (empty array means all accounts)
    const filteredAccountsData = selectedAccounts.length === 0
      ? accountsData
      : accountsData.filter(account => selectedAccounts.includes(account.id))

    const allClosedPnL = filteredAccountsData.flatMap(account => account.closedPnL || [])

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

    // Check if no trades found in timeframe
    if (limitedClosedPnL.length === 0) {
      return {
        healthScore: 0,
        healthScoreBreakdown: null,
        accountHealthScores: [],
        isEmpty: true,
        timeframeInfo: {
          selectedTimeframe,
          tradesFound: 0,
          totalTrades: allClosedPnL.length
        }
      }
    }

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
    const totalEquity = filteredAccountsData.reduce((sum, acc) => sum + parseFloat(acc.balance?.totalEquity || '0'), 0)
    const totalUnrealizedPnL = filteredAccountsData.reduce((sum, acc) => sum + parseFloat(acc.balance?.totalPerpUPL || '0'), 0)
    const winRate = limitedClosedPnL.length > 0 ? (limitedClosedPnL.filter(t => parseFloat(t.closedPnl) > 0).length / limitedClosedPnL.length) * 100 : 0
    const avgPnL = limitedClosedPnL.length > 0 ? limitedClosedPnL.reduce((sum, t) => sum + parseFloat(t.closedPnl), 0) / limitedClosedPnL.length : 0
    const wins = limitedClosedPnL.filter(t => parseFloat(t.closedPnl) > 0).length
    const totalTrades = limitedClosedPnL.length
    const unrealizedLossPercent = totalEquity > 0 ? (totalUnrealizedPnL / totalEquity) * 100 : 0

    // Additional metrics
    const pnlValues = limitedClosedPnL.map(t => parseFloat(t.closedPnl))
    const avgTradeSize = pnlValues.length > 0 ? Math.sqrt(pnlValues.reduce((sum, pnl) => sum + (pnl * pnl), 0) / pnlValues.length) : 0
    const pnlStdDev = pnlValues.length > 1 ? Math.sqrt(pnlValues.reduce((sum, pnl) => sum + Math.pow(pnl - avgPnL, 2), 0) / (pnlValues.length - 1)) : 0

    // Improve consistency calculation - Sharpe ratio style (avg return / standard deviation)
    // Higher values indicate more consistent performance relative to volatility
    let consistency = 0
    if (pnlValues.length > 1 && pnlStdDev > 0) {
      consistency = Math.abs(avgPnL) / pnlStdDev
      // Cap at 3.0 for sanity (very high Sharpe-like ratio)
      consistency = Math.min(consistency, 3.0)
    }

    // Improved drawdown calculation - track equity curve properly
    let runningEquity = totalEquity || 10000 // Use actual equity or reasonable default
    let peakEquity = runningEquity
    let maxDrawdown = 0
    let maxDrawdownPercent = 0

    for (const pnl of pnlValues) {
      runningEquity += pnl
      if (runningEquity > peakEquity) peakEquity = runningEquity
      const drawdown = peakEquity - runningEquity
      const drawdownPercent = peakEquity > 0 ? (drawdown / peakEquity) * 100 : 0
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown
        maxDrawdownPercent = drawdownPercent
      }
    }

    // If still no drawdown (all trades profitable), use largest single loss as percentage
    if (maxDrawdown === 0 && pnlValues.length > 0) {
      const worstTrade = Math.min(...pnlValues, 0) // Get worst trade (or 0 if all positive)
      if (worstTrade < 0 && totalEquity > 0) {
        maxDrawdown = Math.abs(worstTrade)
        maxDrawdownPercent = (Math.abs(worstTrade) / totalEquity) * 100
      }
    }

    // Debug logging for consistency and drawdown
    console.log(`🔍 CALC ${selectedTimeframe}:`, {
      consistency: consistency.toFixed(3),
      maxDrawdownPercent: maxDrawdownPercent.toFixed(2),
      weights: customWeights
    })

    // Health score breakdown with gradient scoring using custom weights
    const baseScore = customWeights.baseScore

    // Win Rate: Gradient using custom range and points
    const winRateScore = Math.min(customWeights.winRate.points, Math.max(0,
      winRate <= customWeights.winRate.min ? 0 :
      winRate >= customWeights.winRate.max ? customWeights.winRate.points :
      ((winRate - customWeights.winRate.min) / (customWeights.winRate.max - customWeights.winRate.min)) * customWeights.winRate.points
    ))

    // Profitability: Gradient using custom range and points
    const avgPnLScore = Math.min(customWeights.profitability.points, Math.max(0,
      avgPnL <= customWeights.profitability.min ? 0 :
      avgPnL >= customWeights.profitability.max ? customWeights.profitability.points :
      avgPnL <= 0 ?
        ((avgPnL - customWeights.profitability.min) / (0 - customWeights.profitability.min)) * (customWeights.profitability.points / 2) :
        (customWeights.profitability.points / 2) + ((avgPnL / customWeights.profitability.max) * (customWeights.profitability.points / 2))
    ))

    // Risk Management: Gradient using custom range and points (lower unrealized loss is better)
    const unrealizedLossRatio = Math.abs(totalUnrealizedPnL / totalEquity) * 100
    const riskScore = Math.min(customWeights.riskManagement.points, Math.max(0,
      unrealizedLossRatio >= customWeights.riskManagement.max ? 0 :
      unrealizedLossRatio <= customWeights.riskManagement.min ? customWeights.riskManagement.points :
      customWeights.riskManagement.points - ((unrealizedLossRatio - customWeights.riskManagement.min) / (customWeights.riskManagement.max - customWeights.riskManagement.min)) * customWeights.riskManagement.points
    ))

    // Diversification: Gradient using custom range and points
    const diversificationScore = Math.min(customWeights.diversification.points, Math.max(0,
      symbolDominance.length <= customWeights.diversification.min ? 0 :
      symbolDominance.length >= customWeights.diversification.max ? customWeights.diversification.points :
      ((symbolDominance.length - customWeights.diversification.min) / (customWeights.diversification.max - customWeights.diversification.min)) * customWeights.diversification.points
    ))

    // Consistency: Gradient using custom range and points
    const consistencyScore = Math.min(customWeights.consistency.points, Math.max(0,
      consistency <= customWeights.consistency.min ? 0 :
      consistency >= customWeights.consistency.max ? customWeights.consistency.points :
      ((consistency - customWeights.consistency.min) / (customWeights.consistency.max - customWeights.consistency.min)) * customWeights.consistency.points
    ))

    // Max Drawdown: Gradient using custom range and points (lower drawdown is better)
    const drawdownScore = Math.min(customWeights.drawdown.points, Math.max(0,
      maxDrawdownPercent >= customWeights.drawdown.max ? 0 :
      maxDrawdownPercent <= customWeights.drawdown.min ? customWeights.drawdown.points :
      customWeights.drawdown.points - ((maxDrawdownPercent - customWeights.drawdown.min) / (customWeights.drawdown.max - customWeights.drawdown.min)) * customWeights.drawdown.points
    ))

    const healthScore = Math.round(Math.min(100, Math.max(0, baseScore + winRateScore + avgPnLScore + riskScore + diversificationScore + consistencyScore + drawdownScore)))

    // Debug final scores
    console.log(`🎯 SCORES ${selectedTimeframe}:`, {
      consistency: consistency.toFixed(3),
      consistencyScore: consistencyScore.toFixed(1),
      maxDrawdownPercent: maxDrawdownPercent.toFixed(1),
      drawdownScore: drawdownScore.toFixed(1),
      weights: {
        consistencyMin: customWeights.consistency.min,
        consistencyMax: customWeights.consistency.max,
        drawdownMin: customWeights.drawdown.min,
        drawdownMax: customWeights.drawdown.max
      }
    })

    // Health score details for breakdown
    const healthScoreBreakdown = {
      total: healthScore,
      base: baseScore,
      winRate: {
        points: Math.round(winRateScore),
        maxPoints: customWeights.winRate.points,
        value: winRate,
        achieved: winRateScore >= customWeights.winRate.points * 0.7,
        grade: winRateScore >= customWeights.winRate.points * 0.9 ? 'A' : winRateScore >= customWeights.winRate.points * 0.7 ? 'B' : winRateScore >= customWeights.winRate.points * 0.5 ? 'C' : winRateScore >= customWeights.winRate.points * 0.2 ? 'D' : 'F'
      },
      avgPnL: {
        points: Math.round(avgPnLScore),
        maxPoints: customWeights.profitability.points,
        value: avgPnL,
        achieved: avgPnLScore >= customWeights.profitability.points * 0.67,
        grade: avgPnLScore >= customWeights.profitability.points * 0.87 ? 'A' : avgPnLScore >= customWeights.profitability.points * 0.67 ? 'B' : avgPnLScore >= customWeights.profitability.points * 0.47 ? 'C' : avgPnLScore >= customWeights.profitability.points * 0.2 ? 'D' : 'F'
      },
      riskManagement: {
        points: Math.round(riskScore),
        maxPoints: customWeights.riskManagement.points,
        value: unrealizedLossPercent,
        achieved: riskScore >= customWeights.riskManagement.points * 0.7,
        grade: riskScore >= customWeights.riskManagement.points * 0.9 ? 'A' : riskScore >= customWeights.riskManagement.points * 0.7 ? 'B' : riskScore >= customWeights.riskManagement.points * 0.5 ? 'C' : riskScore >= customWeights.riskManagement.points * 0.2 ? 'D' : 'F'
      },
      diversification: {
        points: Math.round(diversificationScore),
        maxPoints: customWeights.diversification.points,
        value: symbolDominance.length,
        achieved: diversificationScore >= customWeights.diversification.points * 0.6,
        grade: diversificationScore >= customWeights.diversification.points * 0.9 ? 'A' : diversificationScore >= customWeights.diversification.points * 0.6 ? 'B' : diversificationScore >= customWeights.diversification.points * 0.4 ? 'C' : diversificationScore >= customWeights.diversification.points * 0.2 ? 'D' : 'F'
      },
      consistency: {
        points: Math.round(consistencyScore),
        maxPoints: customWeights.consistency.points,
        value: consistency,
        achieved: consistencyScore >= customWeights.consistency.points * 0.7,
        grade: consistencyScore >= customWeights.consistency.points * 0.9 ? 'A' : consistencyScore >= customWeights.consistency.points * 0.7 ? 'B' : consistencyScore >= customWeights.consistency.points * 0.5 ? 'C' : consistencyScore >= customWeights.consistency.points * 0.2 ? 'D' : 'F'
      },
      drawdown: {
        points: Math.round(drawdownScore),
        maxPoints: customWeights.drawdown.points,
        value: maxDrawdownPercent,
        achieved: drawdownScore >= customWeights.drawdown.points * 0.6,
        grade: drawdownScore >= customWeights.drawdown.points * 0.9 ? 'A' : drawdownScore >= customWeights.drawdown.points * 0.6 ? 'B' : drawdownScore >= customWeights.drawdown.points * 0.4 ? 'C' : drawdownScore >= customWeights.drawdown.points * 0.2 ? 'D' : 'F'
      },
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
    const accountHealthScores = filteredAccountsData.map(account => {
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

      // Calculate health score for this account using gradient system
      let accountHealth = 50

      // Win Rate: Gradient from 30% to 70%
      const accountWinRateScore = Math.min(10, Math.max(0,
        accountWinRate <= 30 ? 0 :
        accountWinRate >= 70 ? 10 :
        ((accountWinRate - 30) / 40) * 10
      ))

      // Profitability: Gradient based on avg P&L
      const accountAvgPnLScore = Math.min(15, Math.max(0,
        accountAvgPnL <= -5 ? 0 :
        accountAvgPnL >= 5 ? 15 :
        accountAvgPnL <= 0 ? ((accountAvgPnL + 5) / 5) * 7.5 :
        7.5 + ((accountAvgPnL / 5) * 7.5)
      ))

      // Risk Management: Gradient based on unrealized loss %
      const accountUnrealizedLossRatio = Math.abs(accountUnrealizedPnL / accountEquity)
      const accountRiskScore = Math.min(10, Math.max(0,
        accountUnrealizedLossRatio >= 0.15 ? 0 :
        accountUnrealizedLossRatio <= 0.02 ? 10 :
        10 - ((accountUnrealizedLossRatio - 0.02) / 0.13) * 10
      ))

      // Diversification: Gradient based on number of symbols
      const accountDiversificationScore = Math.min(5, Math.max(0,
        accountSymbols <= 1 ? 0 :
        accountSymbols >= 8 ? 5 :
        ((accountSymbols - 1) / 7) * 5
      ))

      accountHealth = Math.min(100, Math.max(0, accountHealth + accountWinRateScore + accountAvgPnLScore + accountRiskScore + accountDiversificationScore))

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
  }, [accountsData, selectedTimeframe, customWeights, selectedAccounts])

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
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
              {healthAnalytics.timeframeInfo ? `No Data for ${selectedTimeframe} Period` : 'Health Score Unavailable'}
            </span>
          </div>
          <p className="text-sm text-blue-700 dark:text-blue-300">
            {healthAnalytics.timeframeInfo && healthAnalytics.timeframeInfo.totalTrades > 0
              ? `No trades found in the last ${selectedTimeframe.toLowerCase()}. Try selecting a longer time period or start trading to see your health score.`
              : 'No trading data available. Start trading to see your account health score and performance analytics.'
            }
          </p>
          {healthAnalytics.timeframeInfo && healthAnalytics.timeframeInfo.totalTrades > 0 && (
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
              Total trades available: {healthAnalytics.timeframeInfo.totalTrades}
            </p>
          )}
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
          <div className="ml-2">
            <InfoIcon tooltip="Composite score (0-100) measuring trading performance across 6 key areas: Win Rate (10pts), Profitability (15pts), Risk Control (10pts), Diversification (5pts), Consistency (10pts), Drawdown Control (5pts), plus Base Score (40pts). Higher scores indicate better trading discipline." />
          </div>
        </h2>
        <div className="flex gap-3">
          {/* Account Selection */}
          <div className="relative">
            <select
              value={selectedAccounts.length === 0 ? 'all' : 'custom'}
              onChange={(e) => {
                if (e.target.value === 'all') {
                  setSelectedAccounts([])
                } else {
                  // If user selects custom but no accounts were previously selected, select all accounts
                  if (selectedAccounts.length === 0) {
                    setSelectedAccounts(accountsData.map(acc => acc.id))
                  }
                }
              }}
              className="px-3 py-1 rounded-md text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="all">All Accounts ({accountsData.length})</option>
              <option value="custom">Custom Selection ({selectedAccounts.length})</option>
            </select>

            {/* Account checkboxes - only show when custom is selected */}
            {selectedAccounts.length > 0 && (
              <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg z-10 min-w-48">
                <div className="p-2 space-y-1 max-h-60 overflow-y-auto">
                  {accountsData.map(account => (
                    <label key={account.id} className="flex items-center space-x-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 px-2 py-1 rounded">
                      <input
                        type="checkbox"
                        checked={selectedAccounts.includes(account.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedAccounts(prev => [...prev, account.id])
                          } else {
                            setSelectedAccounts(prev => prev.filter(id => id !== account.id))
                          }
                        }}
                        className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500 dark:focus:ring-green-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                      />
                      <span className="text-gray-900 dark:text-white truncate">{account.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => setShowWeightSettings(true)}
            className="px-3 py-1 rounded-md text-sm transition-colors text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-300 dark:border-gray-600"
          >
            Edit Weightings
          </button>
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

              {/* Consistency Ring */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Consistency</span>
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 relative">
                    <svg className="w-8 h-8 transform -rotate-90" viewBox="0 0 32 32">
                      <circle cx="16" cy="16" r="12" stroke="currentColor" strokeWidth="3" fill="transparent" className="text-gray-200 dark:text-gray-600"/>
                      <circle cx="16" cy="16" r="12" stroke="currentColor" strokeWidth="3" fill="transparent"
                        className={healthAnalytics.healthScoreBreakdown.consistency.achieved ? "text-green-500" : "text-gray-400"}
                        strokeDasharray={`${(healthAnalytics.healthScoreBreakdown.consistency.points / healthAnalytics.healthScoreBreakdown.consistency.maxPoints) * 75.4} 75.4`}
                        strokeLinecap="round"/>
                    </svg>
                  </div>
                  <span className="text-sm font-semibold">{healthAnalytics.healthScoreBreakdown.consistency.points}/{healthAnalytics.healthScoreBreakdown.consistency.maxPoints}</span>
                  <span className={`text-xs px-2 py-1 rounded ${healthAnalytics.healthScoreBreakdown.consistency.achieved ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>
                    {healthAnalytics.healthScoreBreakdown.consistency.achieved ? '✓' : '○'}
                  </span>
                </div>
              </div>

              {/* Drawdown Control Ring */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Drawdown Control</span>
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 relative">
                    <svg className="w-8 h-8 transform -rotate-90" viewBox="0 0 32 32">
                      <circle cx="16" cy="16" r="12" stroke="currentColor" strokeWidth="3" fill="transparent" className="text-gray-200 dark:text-gray-600"/>
                      <circle cx="16" cy="16" r="12" stroke="currentColor" strokeWidth="3" fill="transparent"
                        className={healthAnalytics.healthScoreBreakdown.drawdown.achieved ? "text-green-500" : "text-gray-400"}
                        strokeDasharray={`${(healthAnalytics.healthScoreBreakdown.drawdown.points / healthAnalytics.healthScoreBreakdown.drawdown.maxPoints) * 75.4} 75.4`}
                        strokeLinecap="round"/>
                    </svg>
                  </div>
                  <span className="text-sm font-semibold">{healthAnalytics.healthScoreBreakdown.drawdown.points}/{healthAnalytics.healthScoreBreakdown.drawdown.maxPoints}</span>
                  <span className={`text-xs px-2 py-1 rounded ${healthAnalytics.healthScoreBreakdown.drawdown.achieved ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>
                    {healthAnalytics.healthScoreBreakdown.drawdown.achieved ? '✓' : '○'}
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Base Score */}
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-blue-800 dark:text-blue-200">Base Score</span>
                  <InfoIcon tooltip="Starting foundation score given to all accounts. Represents basic participation in trading." />
                </div>
                <span className="text-lg font-bold text-blue-900 dark:text-blue-100">{healthAnalytics.healthScoreBreakdown.base}</span>
              </div>
              <p className="text-xs text-blue-600 dark:text-blue-300">Starting foundation</p>
            </div>

            {/* Win Rate Details */}
            <div className={`p-4 rounded-lg border ${healthAnalytics.healthScoreBreakdown.winRate.achieved ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-600'}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className={`text-sm font-medium ${healthAnalytics.healthScoreBreakdown.winRate.achieved ? 'text-green-800 dark:text-green-200' : 'text-gray-600 dark:text-gray-400'}`}>
                    Win Rate {healthAnalytics.healthScoreBreakdown.winRate.achieved ? '✓' : '✗'}
                  </span>
                  <InfoIcon tooltip="Percentage of profitable trades. Score: 0-10 points. 30%=0pts, 50%=5pts, 70%=10pts. Higher win rates indicate better trade selection." />
                </div>
                <span className={`text-lg font-bold ${healthAnalytics.healthScoreBreakdown.winRate.achieved ? 'text-green-900 dark:text-green-100' : 'text-gray-700 dark:text-gray-300'}`}>
                  +{healthAnalytics.healthScoreBreakdown.winRate.points}
                </span>
              </div>
              <p className={`text-xs ${healthAnalytics.healthScoreBreakdown.winRate.achieved ? 'text-green-600 dark:text-green-300' : 'text-gray-500 dark:text-gray-400'}`}>
                {healthAnalytics.healthScoreBreakdown.winRate.value.toFixed(1)}% ({healthAnalytics.healthScoreBreakdown.metrics.wins}/{healthAnalytics.healthScoreBreakdown.metrics.totalTrades} wins)
              </p>
              <div className="mt-2">
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                  <span>{customWeights.winRate.min}%</span>
                  <span>Range</span>
                  <span>{customWeights.winRate.max}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div className="h-2 rounded-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 relative">
                    <div
                      className="absolute top-0 w-2 h-2 bg-white border-2 border-gray-800 dark:border-white rounded-full transform -translate-x-1/2"
                      style={{
                        left: `${Math.min(100, Math.max(0,
                          ((healthAnalytics.healthScoreBreakdown.winRate.value - customWeights.winRate.min) /
                          (customWeights.winRate.max - customWeights.winRate.min)) * 100
                        ))}%`
                      }}
                    ></div>
                  </div>
                </div>
              </div>
              {!healthAnalytics.healthScoreBreakdown.winRate.achieved && (
                <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">Need &gt;50% win rate</p>
              )}
            </div>

            {/* Profitability Details */}
            <div className={`p-4 rounded-lg border ${healthAnalytics.healthScoreBreakdown.avgPnL.achieved ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-600'}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className={`text-sm font-medium ${healthAnalytics.healthScoreBreakdown.avgPnL.achieved ? 'text-green-800 dark:text-green-200' : 'text-gray-600 dark:text-gray-400'}`}>
                    Profitability {healthAnalytics.healthScoreBreakdown.avgPnL.achieved ? '✓' : '✗'}
                  </span>
                  <InfoIcon tooltip="Average profit/loss per trade. Score: 0-15 points. Negative P&L=0pts, Break-even=7.5pts, +$5=15pts. Measures trade execution quality." />
                </div>
                <span className={`text-lg font-bold ${healthAnalytics.healthScoreBreakdown.avgPnL.achieved ? 'text-green-900 dark:text-green-100' : 'text-gray-700 dark:text-gray-300'}`}>
                  +{healthAnalytics.healthScoreBreakdown.avgPnL.points}
                </span>
              </div>
              <p className={`text-xs ${healthAnalytics.healthScoreBreakdown.avgPnL.achieved ? 'text-green-600 dark:text-green-300' : 'text-gray-500 dark:text-gray-400'}`}>
                ${healthAnalytics.healthScoreBreakdown.avgPnL.value.toFixed(2)} avg per trade
              </p>
              <div className="mt-2">
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                  <span>${customWeights.profitability.min}</span>
                  <span>Range</span>
                  <span>${customWeights.profitability.max}</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div className="h-2 rounded-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 relative">
                    <div
                      className="absolute top-0 w-2 h-2 bg-white border-2 border-gray-800 dark:border-white rounded-full transform -translate-x-1/2"
                      style={{
                        left: `${Math.min(100, Math.max(0,
                          ((healthAnalytics.healthScoreBreakdown.avgPnL.value - customWeights.profitability.min) /
                          (customWeights.profitability.max - customWeights.profitability.min)) * 100
                        ))}%`
                      }}
                    ></div>
                  </div>
                </div>
              </div>
              {!healthAnalytics.healthScoreBreakdown.avgPnL.achieved && (
                <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">Need positive avg P&L</p>
              )}
            </div>

            {/* Risk Management Details */}
            <div className={`p-4 rounded-lg border ${healthAnalytics.healthScoreBreakdown.riskManagement.achieved ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-600'}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className={`text-sm font-medium ${healthAnalytics.healthScoreBreakdown.riskManagement.achieved ? 'text-green-800 dark:text-green-200' : 'text-gray-600 dark:text-gray-400'}`}>
                    Risk Control {healthAnalytics.healthScoreBreakdown.riskManagement.achieved ? '✓' : '✗'}
                  </span>
                  <InfoIcon tooltip="Current unrealized P&L as % of total equity. Score: 0-10 points. 2%=10pts, 5%=7pts, 15%=0pts. Lower is better - shows position size discipline." />
                </div>
                <span className={`text-lg font-bold ${healthAnalytics.healthScoreBreakdown.riskManagement.achieved ? 'text-green-900 dark:text-green-100' : 'text-gray-700 dark:text-gray-300'}`}>
                  +{healthAnalytics.healthScoreBreakdown.riskManagement.points}
                </span>
              </div>
              <p className={`text-xs ${healthAnalytics.healthScoreBreakdown.riskManagement.achieved ? 'text-green-600 dark:text-green-300' : 'text-gray-500 dark:text-gray-400'}`}>
                {healthAnalytics.healthScoreBreakdown.riskManagement.value.toFixed(1)}% unrealized loss
              </p>
              <div className="mt-2">
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                  <span>{customWeights.riskManagement.min}%</span>
                  <span>Range</span>
                  <span>{customWeights.riskManagement.max}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div className="h-2 rounded-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 relative">
                    <div
                      className="absolute top-0 w-2 h-2 bg-white border-2 border-gray-800 dark:border-white rounded-full transform -translate-x-1/2"
                      style={{
                        left: `${Math.min(100, Math.max(0,
                          ((healthAnalytics.healthScoreBreakdown.riskManagement.value - customWeights.riskManagement.min) /
                          (customWeights.riskManagement.max - customWeights.riskManagement.min)) * 100
                        ))}%`
                      }}
                    ></div>
                  </div>
                </div>
              </div>
              {!healthAnalytics.healthScoreBreakdown.riskManagement.achieved && (
                <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">Keep losses under 5%</p>
              )}
            </div>

            {/* Diversification Details */}
            <div className={`p-4 rounded-lg border ${healthAnalytics.healthScoreBreakdown.diversification.achieved ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-600'}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className={`text-sm font-medium ${healthAnalytics.healthScoreBreakdown.diversification.achieved ? 'text-green-800 dark:text-green-200' : 'text-gray-600 dark:text-gray-400'}`}>
                    Diversification {healthAnalytics.healthScoreBreakdown.diversification.achieved ? '✓' : '✗'}
                  </span>
                  <InfoIcon tooltip="Number of different trading symbols. Score: 0-5 points. 1 symbol=0pts, 5+ symbols=full points. Reduces concentration risk." />
                </div>
                <span className={`text-lg font-bold ${healthAnalytics.healthScoreBreakdown.diversification.achieved ? 'text-green-900 dark:text-green-100' : 'text-gray-700 dark:text-gray-300'}`}>
                  +{healthAnalytics.healthScoreBreakdown.diversification.points}
                </span>
              </div>
              <p className={`text-xs ${healthAnalytics.healthScoreBreakdown.diversification.achieved ? 'text-green-600 dark:text-green-300' : 'text-gray-500 dark:text-gray-400'}`}>
                {healthAnalytics.healthScoreBreakdown.diversification.value} trading pairs
              </p>
              <div className="mt-2">
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                  <span>{customWeights.diversification.min}</span>
                  <span>Range</span>
                  <span>{customWeights.diversification.max}</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div className="h-2 rounded-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 relative">
                    <div
                      className="absolute top-0 w-2 h-2 bg-white border-2 border-gray-800 dark:border-white rounded-full transform -translate-x-1/2"
                      style={{
                        left: `${Math.min(100, Math.max(0,
                          ((healthAnalytics.healthScoreBreakdown.diversification.value - customWeights.diversification.min) /
                          (customWeights.diversification.max - customWeights.diversification.min)) * 100
                        ))}%`
                      }}
                    ></div>
                  </div>
                </div>
              </div>
              {!healthAnalytics.healthScoreBreakdown.diversification.achieved && (
                <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">Add more trading pairs</p>
              )}
            </div>

            {/* Consistency Details */}
            <div className={`p-4 rounded-lg border ${healthAnalytics.healthScoreBreakdown.consistency.achieved ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-600'}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className={`text-sm font-medium ${healthAnalytics.healthScoreBreakdown.consistency.achieved ? 'text-green-800 dark:text-green-200' : 'text-gray-600 dark:text-gray-400'}`}>
                    Consistency {healthAnalytics.healthScoreBreakdown.consistency.achieved ? '✓' : '✗'}
                  </span>
                  <InfoIcon tooltip="Stability of trading performance (avg P&L / std deviation). Score: 0-10 points. Higher ratio = more consistent results." />
                </div>
                <span className={`text-lg font-bold ${healthAnalytics.healthScoreBreakdown.consistency.achieved ? 'text-green-900 dark:text-green-100' : 'text-gray-700 dark:text-gray-300'}`}>
                  +{healthAnalytics.healthScoreBreakdown.consistency.points}
                </span>
              </div>
              <p className={`text-xs ${healthAnalytics.healthScoreBreakdown.consistency.achieved ? 'text-green-600 dark:text-green-300' : 'text-gray-500 dark:text-gray-400'}`}>
                {healthAnalytics.healthScoreBreakdown.consistency.value.toFixed(2)} consistency ratio
              </p>
              <div className="mt-2">
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                  <span>{customWeights.consistency.min}</span>
                  <span>Range</span>
                  <span>{customWeights.consistency.max}</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div className="h-2 rounded-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 relative">
                    <div
                      className="absolute top-0 w-2 h-2 bg-white border-2 border-gray-800 dark:border-white rounded-full transform -translate-x-1/2"
                      style={{
                        left: `${Math.min(100, Math.max(0,
                          ((healthAnalytics.healthScoreBreakdown.consistency.value - customWeights.consistency.min) /
                          (customWeights.consistency.max - customWeights.consistency.min)) * 100
                        ))}%`
                      }}
                    ></div>
                  </div>
                </div>
              </div>
              {!healthAnalytics.healthScoreBreakdown.consistency.achieved && (
                <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">Improve trade consistency</p>
              )}
            </div>

            {/* Drawdown Control Details */}
            <div className={`p-4 rounded-lg border ${healthAnalytics.healthScoreBreakdown.drawdown.achieved ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-600'}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className={`text-sm font-medium ${healthAnalytics.healthScoreBreakdown.drawdown.achieved ? 'text-green-800 dark:text-green-200' : 'text-gray-600 dark:text-gray-400'}`}>
                    Drawdown Control {healthAnalytics.healthScoreBreakdown.drawdown.achieved ? '✓' : '✗'}
                  </span>
                  <InfoIcon tooltip="Maximum peak-to-trough loss as % of equity. Score: 0-5 points. Lower drawdowns = better capital preservation." />
                </div>
                <span className={`text-lg font-bold ${healthAnalytics.healthScoreBreakdown.drawdown.achieved ? 'text-green-900 dark:text-green-100' : 'text-gray-700 dark:text-gray-300'}`}>
                  +{healthAnalytics.healthScoreBreakdown.drawdown.points}
                </span>
              </div>
              <p className={`text-xs ${healthAnalytics.healthScoreBreakdown.drawdown.achieved ? 'text-green-600 dark:text-green-300' : 'text-gray-500 dark:text-gray-400'}`}>
                {healthAnalytics.healthScoreBreakdown.drawdown.value.toFixed(1)}% max drawdown
              </p>
              <div className="mt-2">
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                  <span>{customWeights.drawdown.min}%</span>
                  <span>Range</span>
                  <span>{customWeights.drawdown.max}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div className="h-2 rounded-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 relative">
                    <div
                      className="absolute top-0 w-2 h-2 bg-white border-2 border-gray-800 dark:border-white rounded-full transform -translate-x-1/2"
                      style={{
                        left: `${Math.min(100, Math.max(0,
                          ((healthAnalytics.healthScoreBreakdown.drawdown.value - customWeights.drawdown.min) /
                          (customWeights.drawdown.max - customWeights.drawdown.min)) * 100
                        ))}%`
                      }}
                    ></div>
                  </div>
                </div>
              </div>
              {!healthAnalytics.healthScoreBreakdown.drawdown.achieved && (
                <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">Reduce drawdown risk</p>
              )}
            </div>
          </div>

          {/* Improvement Suggestions */}
          <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600">
            <h4 className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-3">
              Improvement Suggestions
            </h4>
            <div className="space-y-2">
              {healthAnalytics.healthScoreBreakdown.winRate.points < healthAnalytics.healthScoreBreakdown.winRate.maxPoints && (
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <strong>Win Rate ({healthAnalytics.healthScoreBreakdown.winRate.points}/{healthAnalytics.healthScoreBreakdown.winRate.maxPoints}pts):</strong> Current {healthAnalytics.healthScoreBreakdown.winRate.value.toFixed(1)}%. Target {customWeights.winRate.max}% for maximum points ({customWeights.winRate.min}% minimum for scoring).
                </p>
              )}
              {healthAnalytics.healthScoreBreakdown.avgPnL.points < healthAnalytics.healthScoreBreakdown.avgPnL.maxPoints && (
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <strong>Profitability ({healthAnalytics.healthScoreBreakdown.avgPnL.points}/{healthAnalytics.healthScoreBreakdown.avgPnL.maxPoints}pts):</strong> Current ${healthAnalytics.healthScoreBreakdown.avgPnL.value.toFixed(2)} avg per trade. Target ${customWeights.profitability.max} for maximum points.
                </p>
              )}
              {healthAnalytics.healthScoreBreakdown.riskManagement.points < healthAnalytics.healthScoreBreakdown.riskManagement.maxPoints && (
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <strong>Risk Management ({healthAnalytics.healthScoreBreakdown.riskManagement.points}/{healthAnalytics.healthScoreBreakdown.riskManagement.maxPoints}pts):</strong> Current {healthAnalytics.healthScoreBreakdown.riskManagement.value.toFixed(1)}% unrealized loss. Target {customWeights.riskManagement.min}% or lower for maximum points.
                </p>
              )}
              {healthAnalytics.healthScoreBreakdown.diversification.points < healthAnalytics.healthScoreBreakdown.diversification.maxPoints && (
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <strong>Diversification ({healthAnalytics.healthScoreBreakdown.diversification.points}/{healthAnalytics.healthScoreBreakdown.diversification.maxPoints}pts):</strong> Currently trading {healthAnalytics.healthScoreBreakdown.diversification.value} symbols. Target {customWeights.diversification.max}+ symbols for maximum points.
                </p>
              )}
              {healthAnalytics.healthScoreBreakdown.consistency.points < healthAnalytics.healthScoreBreakdown.consistency.maxPoints && (
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <strong>Consistency ({healthAnalytics.healthScoreBreakdown.consistency.points}/{healthAnalytics.healthScoreBreakdown.consistency.maxPoints}pts):</strong> Current {healthAnalytics.healthScoreBreakdown.consistency.value.toFixed(3)} ratio. Target {customWeights.consistency.max} for maximum points (standardize approach & position sizing).
                </p>
              )}
              {healthAnalytics.healthScoreBreakdown.drawdown.points < healthAnalytics.healthScoreBreakdown.drawdown.maxPoints && (
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <strong>Drawdown Control ({healthAnalytics.healthScoreBreakdown.drawdown.points}/{healthAnalytics.healthScoreBreakdown.drawdown.maxPoints}pts):</strong> Current {healthAnalytics.healthScoreBreakdown.drawdown.value.toFixed(1)}% max drawdown. Target {customWeights.drawdown.min}% or lower for maximum points.
                </p>
              )}
              {healthAnalytics.healthScore >= 85 && (
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
                        {Math.round(account.healthScore)}
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
                <div className="text-xs text-gray-600 dark:text-gray-400">Total Trades ({selectedTimeframe.toLowerCase()})</div>
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
              Health score based on {selectedTimeframe.toLowerCase()} performance • Updates with each refresh
            </div>
          </div>
        </div>
      )}

      {/* Weights Settings Modal */}
      {showWeightSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Edit Health Score Weightings</h3>
              <button
                onClick={() => setShowWeightSettings(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <WeightEditor
                title="Base Score"
                description="Starting foundation points for all accounts"
                value={customWeights.baseScore}
                onChange={(value) => setCustomWeights({...customWeights, baseScore: value})}
                min={20}
                max={60}
                isRange={false}
              />

              <WeightEditor
                title="Win Rate"
                description="Percentage of profitable trades"
                value={customWeights.winRate}
                onChange={(value) => setCustomWeights({...customWeights, winRate: value})}
                minRange={10}
                maxRange={90}
                pointsMin={5}
                pointsMax={25}
                isRange={true}
              />

              <WeightEditor
                title="Profitability"
                description="Average profit/loss per trade"
                value={customWeights.profitability}
                onChange={(value) => setCustomWeights({...customWeights, profitability: value})}
                minRange={-10}
                maxRange={10}
                pointsMin={5}
                pointsMax={25}
                isRange={true}
              />

              <WeightEditor
                title="Risk Management"
                description="Unrealized P&L as % of equity (lower is better)"
                value={customWeights.riskManagement}
                onChange={(value) => setCustomWeights({...customWeights, riskManagement: value})}
                minRange={1}
                maxRange={30}
                pointsMin={5}
                pointsMax={20}
                isRange={true}
              />

              <WeightEditor
                title="Diversification"
                description="Number of different trading symbols"
                value={customWeights.diversification}
                onChange={(value) => setCustomWeights({...customWeights, diversification: value})}
                minRange={1}
                maxRange={15}
                pointsMin={3}
                pointsMax={10}
                isRange={true}
              />

              <WeightEditor
                title="Consistency"
                description="Stability of trading performance"
                value={customWeights.consistency}
                onChange={(value) => setCustomWeights({...customWeights, consistency: value})}
                minRange={0.05}
                maxRange={2.0}
                pointsMin={5}
                pointsMax={20}
                isRange={true}
              />

              <WeightEditor
                title="Drawdown Control"
                description="Maximum peak-to-trough loss % (lower is better)"
                value={customWeights.drawdown}
                onChange={(value) => setCustomWeights({...customWeights, drawdown: value})}
                minRange={2}
                maxRange={50}
                pointsMin={3}
                pointsMax={15}
                isRange={true}
              />
            </div>

            <div className="flex justify-between items-center mt-8 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Total possible points: {customWeights.baseScore + customWeights.winRate.points + customWeights.profitability.points + customWeights.riskManagement.points + customWeights.diversification.points + customWeights.consistency.points + customWeights.drawdown.points}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setCustomWeights(defaultWeights)
                    saveWeights(defaultWeights)
                  }}
                  className="btn-secondary"
                >
                  Reset to Defaults
                </button>
                <button
                  onClick={() => {
                    saveWeights(customWeights)
                    setShowWeightSettings(false)
                  }}
                  className="btn-primary"
                >
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}