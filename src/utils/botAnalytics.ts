import { Bot } from '../store/useBotStore'
import { AccountData, BybitClosedPnL } from '../types/bybit'

export interface BotAnalytics {
  winRate: number
  totalTrades: number
  pnl7d: number
  pnl30d: number
  pnl90d: number
  pnl180d: number
  totalPnl: number
  bestTrade: number
  worstTrade: number
  sharpeRatio: number | null
  equityData: Array<{ timestamp: number; equity: number }>
  maxWinsInRow: number
  maxLossesInRow: number
  lastFiveTrades: Array<{ isWin: boolean; pnl: number; timestamp: number }>
}

export const calculateBotAnalytics = (
  bot: Bot,
  accountsData: AccountData[]
): BotAnalytics => {
  // Find the account data
  const accountData = accountsData.find(acc => acc.id === bot.accountId)
  if (!accountData) {
    return getEmptyAnalytics()
  }

  // Get date range
  const startDate = new Date(bot.startDate).getTime()
  const endDate = bot.endDate ? new Date(bot.endDate).getTime() : Date.now()

  // Filter closed P&L for this bot's date range and trading pair
  const botClosedPnL = (accountData.closedPnL || []).filter(pnl => {
    const pnlTime = parseInt(pnl.updatedTime || pnl.createdTime)
    return (
      pnl.symbol === bot.tradingPair &&
      pnlTime >= startDate &&
      pnlTime <= endDate
    )
  })

  if (botClosedPnL.length === 0) {
    return getEmptyAnalytics()
  }

  // Calculate win rate
  const winningTrades = botClosedPnL.filter(pnl => parseFloat(pnl.closedPnl) > 0)
  const winRate = (winningTrades.length / botClosedPnL.length) * 100

  // Calculate P&L for different periods
  // Find the most recent trade date to calculate rolling periods from
  const mostRecentTradeTime = botClosedPnL.length > 0
    ? Math.max(...botClosedPnL.map(pnl => parseInt(pnl.updatedTime || pnl.createdTime)))
    : Date.now()

  // Calculate rolling periods from the most recent trade date
  const day7 = mostRecentTradeTime - (7 * 24 * 60 * 60 * 1000)
  const day30 = mostRecentTradeTime - (30 * 24 * 60 * 60 * 1000)
  const day90 = mostRecentTradeTime - (90 * 24 * 60 * 60 * 1000)
  const day180 = mostRecentTradeTime - (180 * 24 * 60 * 60 * 1000)

  const pnl7d = botClosedPnL
    .filter(pnl => parseInt(pnl.updatedTime || pnl.createdTime) >= day7)
    .reduce((sum, pnl) => sum + parseFloat(pnl.closedPnl), 0)

  const pnl30d = botClosedPnL
    .filter(pnl => parseInt(pnl.updatedTime || pnl.createdTime) >= day30)
    .reduce((sum, pnl) => sum + parseFloat(pnl.closedPnl), 0)

  const pnl90d = botClosedPnL
    .filter(pnl => parseInt(pnl.updatedTime || pnl.createdTime) >= day90)
    .reduce((sum, pnl) => sum + parseFloat(pnl.closedPnl), 0)

  const pnl180d = botClosedPnL
    .filter(pnl => parseInt(pnl.updatedTime || pnl.createdTime) >= day180)
    .reduce((sum, pnl) => sum + parseFloat(pnl.closedPnl), 0)

  const totalPnl = botClosedPnL.reduce((sum, pnl) => sum + parseFloat(pnl.closedPnl), 0)

  // Find best and worst trades
  const pnlValues = botClosedPnL.map(pnl => parseFloat(pnl.closedPnl))
  const bestTrade = Math.max(...pnlValues)
  const worstTrade = Math.min(...pnlValues)

  // Calculate Sharpe ratio (simplified)
  const sharpeRatio = calculateSharpeRatio(botClosedPnL)

  // Generate equity curve
  const equityData = generateEquityCurve(botClosedPnL, startDate, endDate)

  // Calculate streak metrics
  const streaks = calculateStreaks(botClosedPnL)

  // Get last 5 trades
  const lastFiveTrades = getLastFiveTrades(botClosedPnL)

  return {
    winRate,
    totalTrades: botClosedPnL.length,
    pnl7d,
    pnl30d,
    pnl90d,
    pnl180d,
    totalPnl,
    bestTrade,
    worstTrade,
    sharpeRatio,
    equityData,
    maxWinsInRow: streaks.maxWins,
    maxLossesInRow: streaks.maxLosses,
    lastFiveTrades,
  }
}

const getEmptyAnalytics = (): BotAnalytics => ({
  winRate: 0,
  totalTrades: 0,
  pnl7d: 0,
  pnl30d: 0,
  pnl90d: 0,
  pnl180d: 0,
  totalPnl: 0,
  bestTrade: 0,
  worstTrade: 0,
  sharpeRatio: null,
  equityData: [],
  maxWinsInRow: 0,
  maxLossesInRow: 0,
  lastFiveTrades: [],
})

const calculateSharpeRatio = (trades: BybitClosedPnL[]): number | null => {
  if (trades.length < 2) return null

  const returns = trades.map(trade => parseFloat(trade.closedPnl))
  const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length

  const variance = returns.reduce((sum, ret) => {
    return sum + Math.pow(ret - avgReturn, 2)
  }, 0) / returns.length

  const stdDev = Math.sqrt(variance)

  if (stdDev === 0) return null

  // Simplified Sharpe ratio (assuming risk-free rate of 0)
  return avgReturn / stdDev
}

const generateEquityCurve = (
  trades: BybitClosedPnL[],
  startDate: number,
  endDate: number
): Array<{ timestamp: number; equity: number }> => {
  if (trades.length === 0) return []

  // Sort trades by time
  const sortedTrades = trades
    .map(trade => ({
      timestamp: parseInt(trade.updatedTime || trade.createdTime),
      pnl: parseFloat(trade.closedPnl)
    }))
    .sort((a, b) => a.timestamp - b.timestamp)

  const equityData: Array<{ timestamp: number; equity: number }> = []
  let runningEquity = 0

  // Add starting point
  equityData.push({ timestamp: startDate, equity: 0 })

  // Add each trade point
  sortedTrades.forEach(trade => {
    runningEquity += trade.pnl
    equityData.push({
      timestamp: trade.timestamp,
      equity: runningEquity
    })
  })

  // Add ending point if bot is stopped
  if (endDate < Date.now()) {
    equityData.push({ timestamp: endDate, equity: runningEquity })
  }

  return equityData
}

const calculateStreaks = (trades: BybitClosedPnL[]) => {
  if (trades.length === 0) {
    return { maxWins: 0, maxLosses: 0 }
  }

  // Sort trades by time
  const sortedTrades = trades
    .map(trade => ({
      timestamp: parseInt(trade.updatedTime || trade.createdTime),
      pnl: parseFloat(trade.closedPnl),
      isWin: parseFloat(trade.closedPnl) > 0
    }))
    .sort((a, b) => a.timestamp - b.timestamp)

  let maxWins = 0
  let maxLosses = 0
  let currentWinStreak = 0
  let currentLossStreak = 0

  sortedTrades.forEach(trade => {
    if (trade.isWin) {
      currentWinStreak++
      currentLossStreak = 0
      maxWins = Math.max(maxWins, currentWinStreak)
    } else {
      currentLossStreak++
      currentWinStreak = 0
      maxLosses = Math.max(maxLosses, currentLossStreak)
    }
  })

  return { maxWins, maxLosses }
}

const getLastFiveTrades = (trades: BybitClosedPnL[]) => {
  if (trades.length === 0) {
    return []
  }

  // Sort trades by time (most recent first) and take last 5
  return trades
    .map(trade => ({
      timestamp: parseInt(trade.updatedTime || trade.createdTime),
      pnl: parseFloat(trade.closedPnl),
      isWin: parseFloat(trade.closedPnl) > 0
    }))
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 5)
}