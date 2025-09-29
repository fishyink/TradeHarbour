import { dataManager } from './dataManager'

interface CacheSummary {
  accountId: string
  month: string
  totalTrades: number
  totalPnL: number
  totalVolume: number
  winRate: number
  avgWin: number
  avgLoss: number
  maxDrawdown: number
  profitFactor: number
  sharpeRatio: number
  generatedAt: number
  isStale: boolean
}

interface PerformanceMetrics {
  totalTrades: number
  winningTrades: number
  losingTrades: number
  totalPnL: number
  totalVolume: number
  winRate: number
  avgWin: number
  avgLoss: number
  maxWin: number
  maxLoss: number
  maxDrawdown: number
  profitFactor: number
  sharpeRatio: number
  calmarRatio: number
  avgDailyReturn: number
  volatility: number
}

export class CacheManager {
  private readonly CACHE_EXPIRY_HOURS = 6 // Cache expires after 6 hours
  private readonly CACHE_VERSION = '1.0.0'

  // Generate cache summary for a month's data
  async generateMonthlySummary(accountId: string, month: string): Promise<CacheSummary> {
    const trades = await dataManager.getMonthlyTrades(accountId, month)
    const pnl = await dataManager.getMonthlyPnL(accountId, month)

    const metrics = this.calculatePerformanceMetrics(trades, pnl)

    return {
      accountId,
      month,
      totalTrades: metrics.totalTrades,
      totalPnL: metrics.totalPnL,
      totalVolume: metrics.totalVolume,
      winRate: metrics.winRate,
      avgWin: metrics.avgWin,
      avgLoss: metrics.avgLoss,
      maxDrawdown: metrics.maxDrawdown,
      profitFactor: metrics.profitFactor,
      sharpeRatio: metrics.sharpeRatio,
      generatedAt: Date.now(),
      isStale: false
    }
  }

  // Calculate comprehensive performance metrics
  private calculatePerformanceMetrics(trades: any[], pnl: any[]): PerformanceMetrics {
    if (trades.length === 0 && pnl.length === 0) {
      return this.getEmptyMetrics()
    }

    // Calculate from trades
    const totalVolume = trades.reduce((sum, trade) => {
      return sum + (parseFloat(trade.qty) * parseFloat(trade.price))
    }, 0)

    // Calculate from P&L
    const pnlValues = pnl.map(p => parseFloat(p.closedPnl)).filter(val => !isNaN(val))
    const totalPnL = pnlValues.reduce((sum, val) => sum + val, 0)

    const winningTrades = pnlValues.filter(val => val > 0)
    const losingTrades = pnlValues.filter(val => val < 0)

    const totalTrades = pnlValues.length
    const winRate = totalTrades > 0 ? (winningTrades.length / totalTrades) * 100 : 0

    const avgWin = winningTrades.length > 0 ? winningTrades.reduce((sum, val) => sum + val, 0) / winningTrades.length : 0
    const avgLoss = losingTrades.length > 0 ? Math.abs(losingTrades.reduce((sum, val) => sum + val, 0) / losingTrades.length) : 0

    const maxWin = winningTrades.length > 0 ? Math.max(...winningTrades) : 0
    const maxLoss = losingTrades.length > 0 ? Math.abs(Math.min(...losingTrades)) : 0

    // Calculate drawdown
    const maxDrawdown = this.calculateMaxDrawdown(pnlValues)

    // Calculate profit factor
    const grossProfit = winningTrades.reduce((sum, val) => sum + val, 0)
    const grossLoss = Math.abs(losingTrades.reduce((sum, val) => sum + val, 0))
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0

    // Calculate Sharpe ratio (simplified)
    const avgDailyReturn = this.calculateAvgDailyReturn(pnlValues)
    const volatility = this.calculateVolatility(pnlValues)
    const sharpeRatio = volatility > 0 ? avgDailyReturn / volatility : 0

    // Calculate Calmar ratio
    const annualizedReturn = avgDailyReturn * 252 // 252 trading days per year
    const calmarRatio = maxDrawdown > 0 ? (annualizedReturn * 100) / maxDrawdown : 0

    return {
      totalTrades,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      totalPnL,
      totalVolume,
      winRate,
      avgWin,
      avgLoss,
      maxWin,
      maxLoss,
      maxDrawdown,
      profitFactor,
      sharpeRatio,
      calmarRatio,
      avgDailyReturn,
      volatility
    }
  }

  private getEmptyMetrics(): PerformanceMetrics {
    return {
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      totalPnL: 0,
      totalVolume: 0,
      winRate: 0,
      avgWin: 0,
      avgLoss: 0,
      maxWin: 0,
      maxLoss: 0,
      maxDrawdown: 0,
      profitFactor: 0,
      sharpeRatio: 0,
      calmarRatio: 0,
      avgDailyReturn: 0,
      volatility: 0
    }
  }

  private calculateMaxDrawdown(pnlValues: number[]): number {
    if (pnlValues.length === 0) return 0

    let peak = 0
    let maxDrawdown = 0
    let runningPnL = 0

    for (const pnl of pnlValues) {
      runningPnL += pnl
      peak = Math.max(peak, runningPnL)
      const drawdown = peak - runningPnL
      maxDrawdown = Math.max(maxDrawdown, drawdown)
    }

    return maxDrawdown
  }

  private calculateAvgDailyReturn(pnlValues: number[]): number {
    if (pnlValues.length === 0) return 0
    const totalReturn = pnlValues.reduce((sum, val) => sum + val, 0)
    return totalReturn / pnlValues.length
  }

  private calculateVolatility(pnlValues: number[]): number {
    if (pnlValues.length < 2) return 0

    const mean = this.calculateAvgDailyReturn(pnlValues)
    const squaredDiffs = pnlValues.map(val => Math.pow(val - mean, 2))
    const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / (pnlValues.length - 1)
    return Math.sqrt(variance)
  }

  // Save cache summary
  async saveMonthlySummary(summary: CacheSummary): Promise<boolean> {
    try {
      const paths = await dataManager.getDataPaths()
      const cacheFilePath = `${paths.cache}/${summary.accountId}-${summary.month}-summary.json`

      const cacheData = {
        version: this.CACHE_VERSION,
        summary,
        generatedAt: Date.now()
      }

      await window.electronAPI.fileSystem.writeFile(cacheFilePath, JSON.stringify(cacheData, null, 2))
      return true
    } catch (error) {
      console.error('Error saving monthly summary:', error)
      return false
    }
  }

  // Load cache summary
  async loadMonthlySummary(accountId: string, month: string): Promise<CacheSummary | null> {
    try {
      const paths = await dataManager.getDataPaths()
      const cacheFilePath = `${paths.cache}/${accountId}-${month}-summary.json`

      const data = await window.electronAPI.fileSystem.readFile(cacheFilePath)
      if (!data) return null

      const cacheData = JSON.parse(data)
      const summary = cacheData.summary as CacheSummary

      // Check if cache is stale
      const cacheAge = Date.now() - summary.generatedAt
      const maxAge = this.CACHE_EXPIRY_HOURS * 60 * 60 * 1000

      if (cacheAge > maxAge) {
        summary.isStale = true
      }

      return summary
    } catch (error) {
      console.error('Error loading monthly summary:', error)
      return null
    }
  }

  // Get or generate cache summary
  async getMonthlySummary(accountId: string, month: string, forceRefresh: boolean = false): Promise<CacheSummary> {
    if (!forceRefresh) {
      const cached = await this.loadMonthlySummary(accountId, month)
      if (cached && !cached.isStale) {
        return cached
      }
    }

    // Generate new summary
    const summary = await this.generateMonthlySummary(accountId, month)
    await this.saveMonthlySummary(summary)
    return summary
  }

  // Generate comprehensive account summary (multiple months)
  async generateAccountSummary(accountId: string, months: string[]): Promise<{
    accountId: string
    totalMonths: number
    overallMetrics: PerformanceMetrics
    monthlyBreakdown: CacheSummary[]
    trends: {
      pnlTrend: number[]
      winRateTrend: number[]
      volumeTrend: number[]
    }
    generatedAt: number
  }> {
    const monthlyBreakdowns: CacheSummary[] = []

    // Get summaries for all months
    for (const month of months) {
      const summary = await this.getMonthlySummary(accountId, month)
      monthlyBreakdowns.push(summary)
    }

    // Calculate overall metrics by aggregating monthly data
    const overallMetrics = this.aggregateMonthlyMetrics(monthlyBreakdowns)

    // Calculate trends
    const pnlTrend = monthlyBreakdowns.map(m => m.totalPnL)
    const winRateTrend = monthlyBreakdowns.map(m => m.winRate)
    const volumeTrend = monthlyBreakdowns.map(m => m.totalVolume)

    return {
      accountId,
      totalMonths: months.length,
      overallMetrics,
      monthlyBreakdown: monthlyBreakdowns,
      trends: {
        pnlTrend,
        winRateTrend,
        volumeTrend
      },
      generatedAt: Date.now()
    }
  }

  private aggregateMonthlyMetrics(summaries: CacheSummary[]): PerformanceMetrics {
    if (summaries.length === 0) return this.getEmptyMetrics()

    const totalTrades = summaries.reduce((sum, s) => sum + s.totalTrades, 0)
    const totalPnL = summaries.reduce((sum, s) => sum + s.totalPnL, 0)
    const totalVolume = summaries.reduce((sum, s) => sum + s.totalVolume, 0)

    // Calculate weighted averages
    const avgWinRate = summaries.length > 0
      ? summaries.reduce((sum, s) => sum + s.winRate, 0) / summaries.length
      : 0

    const avgWin = summaries.length > 0
      ? summaries.reduce((sum, s) => sum + s.avgWin, 0) / summaries.length
      : 0

    const avgLoss = summaries.length > 0
      ? summaries.reduce((sum, s) => sum + s.avgLoss, 0) / summaries.length
      : 0

    const maxDrawdown = Math.max(...summaries.map(s => s.maxDrawdown))

    const avgProfitFactor = summaries.length > 0
      ? summaries.reduce((sum, s) => s.profitFactor === Infinity ? 0 : sum + s.profitFactor, 0) / summaries.length
      : 0

    const avgSharpeRatio = summaries.length > 0
      ? summaries.reduce((sum, s) => sum + s.sharpeRatio, 0) / summaries.length
      : 0

    return {
      totalTrades,
      winningTrades: Math.round(totalTrades * (avgWinRate / 100)),
      losingTrades: Math.round(totalTrades * ((100 - avgWinRate) / 100)),
      totalPnL,
      totalVolume,
      winRate: avgWinRate,
      avgWin,
      avgLoss,
      maxWin: Math.max(...summaries.map(s => s.avgWin)), // Approximation
      maxLoss: Math.max(...summaries.map(s => s.avgLoss)), // Approximation
      maxDrawdown,
      profitFactor: avgProfitFactor,
      sharpeRatio: avgSharpeRatio,
      calmarRatio: maxDrawdown > 0 ? (totalPnL / maxDrawdown) : 0,
      avgDailyReturn: totalPnL / (summaries.length * 30), // Rough estimate
      volatility: this.calculateVolatility(summaries.map(s => s.totalPnL))
    }
  }

  // Clear cache for specific account/month
  async clearCache(accountId: string, month?: string): Promise<void> {
    try {
      const paths = await dataManager.getDataPaths()

      if (month) {
        // Clear specific month
        const cacheFilePath = `${paths.cache}/${accountId}-${month}-summary.json`
        await window.electronAPI.fileSystem.deleteFile(cacheFilePath)
      } else {
        // Clear all cache for account (would need directory listing)
        console.log(`Clearing all cache for account ${accountId}`)
        // Implementation would require enumerating cache files
      }
    } catch (error) {
      console.error('Error clearing cache:', error)
    }
  }

  // Get cache statistics
  async getCacheStats(): Promise<{
    totalCacheFiles: number
    totalCacheSize: number
    staleCacheFiles: number
  }> {
    // This would require enumerating cache directory
    // For now, return placeholder
    return {
      totalCacheFiles: 0,
      totalCacheSize: 0,
      staleCacheFiles: 0
    }
  }

  // Cleanup stale cache files
  async cleanupStaleCache(): Promise<number> {
    // This would require enumerating cache directory and checking timestamps
    // For now, return placeholder
    console.log('Cache cleanup not yet implemented - requires directory enumeration')
    return 0
  }
}

export const cacheManager = new CacheManager()