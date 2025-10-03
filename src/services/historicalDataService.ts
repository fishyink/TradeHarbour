import { dataManager } from './dataManager'
import { dataMigration } from './dataMigration'
import { BybitAccount } from './configManager'
import { BybitClosedPnL, BybitTrade } from '../types/bybit'

interface HistoricalDataCache {
  accountId: string
  closedPnL: BybitClosedPnL[]
  trades: BybitTrade[]
  lastUpdated: number
  dataRange: {
    startDate: string
    endDate: string
    totalDays: number
    chunksRetrieved: number
  }
  isComplete: boolean
}

interface HistoricalFetchProgress {
  accountId: string
  currentChunk: number
  totalChunks: number
  recordsRetrieved: number
  currentDateRange: string
  isComplete: boolean
}

export class HistoricalDataService {
  private readonly INITIAL_DAYS_HISTORY = 180 // Auto-load 6 months on first load
  private readonly CHUNK_SIZE_DAYS = 7
  private readonly CACHE_EXPIRY_HOURS = 24 // Cache valid for 24 hours
  private readonly INCREMENTAL_UPDATE_MINUTES = 15 // Check for new data every 15 minutes

  private progressCallbacks: Set<(progress: HistoricalFetchProgress) => void> = new Set()

  constructor() {
    // Run migration check on startup
    this.checkAndRunMigration()
  }

  // Check and run migration if needed
  private async checkAndRunMigration(): Promise<void> {
    try {
      const migrationStatus = await dataMigration.getMigrationStatus()

      if (migrationStatus.needsMigration) {
        console.log('🔄 Legacy data detected, performing automatic migration...')
        const result = await dataMigration.performFullMigration()

        if (result.success) {
          console.log('✅ Migration completed successfully:', result.results)
        } else {
          console.error('❌ Migration failed:', result.error)
        }
      }
    } catch (error) {
      console.error('Migration check failed:', error)
    }
  }

  // Get month key from timestamp
  private getMonthKey(timestamp: number): string {
    const date = new Date(timestamp)
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`
  }

  // Get cached data for account (from new storage system)
  async getCachedData(accountId: string): Promise<HistoricalDataCache | null> {
    try {
      // Get the last 6 months of data for quick access
      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
      const now = new Date()

      const trades = await dataManager.getTradesInRange(accountId, sixMonthsAgo, now)
      const pnl = await dataManager.getPnLInRange(accountId, sixMonthsAgo, now)

      if (trades.length === 0 && pnl.length === 0) {
        return null
      }

      // Calculate data range
      let startDate = new Date().toISOString().slice(0, 10)
      let totalDays = 0

      if (trades.length > 0 || pnl.length > 0) {
        const oldestTrade = trades.length > 0 ? Math.min(...trades.map(t => parseInt(t.execTime))) : Date.now()
        const oldestPnL = pnl.length > 0 ? Math.min(...pnl.map(p => parseInt(p.updatedTime || p.createdTime))) : Date.now()
        const oldestTimestamp = Math.min(oldestTrade, oldestPnL)

        startDate = new Date(oldestTimestamp).toISOString().slice(0, 10)
        totalDays = Math.ceil((Date.now() - oldestTimestamp) / (24 * 60 * 60 * 1000))
      }

      return {
        accountId,
        closedPnL: pnl,
        trades,
        lastUpdated: Date.now(),
        dataRange: {
          startDate,
          endDate: new Date().toISOString().slice(0, 10),
          totalDays,
          chunksRetrieved: Math.ceil(totalDays / this.CHUNK_SIZE_DAYS)
        },
        isComplete: true
      }

    } catch (error) {
      console.error('Error getting cached data:', error)
      return null
    }
  }

  // Check if cached data is still valid
  private isCacheValid(cache: HistoricalDataCache): boolean {
    const now = Date.now()
    const cacheAge = now - cache.lastUpdated
    const maxAge = this.CACHE_EXPIRY_HOURS * 60 * 60 * 1000

    console.log(`🔍 Cache validation for account ${cache.accountId}:`, {
      cacheAge: `${Math.round(cacheAge / (60 * 60 * 1000))} hours`,
      maxAge: `${this.CACHE_EXPIRY_HOURS} hours`,
      isComplete: cache.isComplete,
      isValid: cacheAge < maxAge && cache.isComplete,
      totalDays: cache.dataRange.totalDays
    })

    return cacheAge < maxAge && cache.isComplete
  }

  // Check if cache needs incremental update
  private needsIncrementalUpdate(cache: HistoricalDataCache): boolean {
    const now = Date.now()
    const timeSinceUpdate = now - cache.lastUpdated
    const updateInterval = this.INCREMENTAL_UPDATE_MINUTES * 60 * 1000

    console.log(`🔄 Incremental update check for account ${cache.accountId}:`, {
      timeSinceUpdate: `${Math.round(timeSinceUpdate / (60 * 1000))} minutes`,
      updateInterval: `${this.INCREMENTAL_UPDATE_MINUTES} minutes`,
      needsUpdate: timeSinceUpdate >= updateInterval,
      lastUpdate: new Date(cache.lastUpdated).toISOString()
    })

    return timeSinceUpdate >= updateInterval
  }

  // Register progress callback
  onProgress(callback: (progress: HistoricalFetchProgress) => void): () => void {
    this.progressCallbacks.add(callback)
    return () => this.progressCallbacks.delete(callback)
  }

  // Notify progress
  private notifyProgress(progress: HistoricalFetchProgress): void {
    this.progressCallbacks.forEach(callback => {
      try {
        callback(progress)
      } catch (error) {
        console.warn('Progress callback error:', error)
      }
    })
  }

  // Generate date chunks for historical retrieval
  private generateDateChunks(maxDays: number = this.INITIAL_DAYS_HISTORY): Array<{ start: number; end: number; index: number }> {
    const now = Date.now()
    const chunks: Array<{ start: number; end: number; index: number }> = []
    const chunkSizeMs = this.CHUNK_SIZE_DAYS * 24 * 60 * 60 * 1000
    const totalMs = maxDays * 24 * 60 * 60 * 1000

    for (let i = 0; i < Math.ceil(maxDays / this.CHUNK_SIZE_DAYS); i++) {
      const chunkEndTime = now - (i * chunkSizeMs)
      const chunkStartTime = Math.max(chunkEndTime - chunkSizeMs, now - totalMs)

      chunks.push({
        start: chunkStartTime,
        end: chunkEndTime,
        index: i + 1
      })

      if (chunkStartTime === now - totalMs) break
    }

    return chunks
  }

  // Fetch complete historical data with progress tracking
  async fetchCompleteHistory(
    account: BybitAccount,
    apiInstance: any, // BybitAPI instance
    forceRefresh: boolean = false
  ): Promise<HistoricalDataCache> {
    console.log(`🕰️ Starting historical fetch for ${account.name}`)

    // Check cache first
    if (!forceRefresh) {
      const cached = await this.getCachedData(account.id)
      if (cached && this.isCacheValid(cached)) {
        console.log(`💾 Using cached data for ${account.name} (${cached.dataRange.totalDays} days, ${cached.closedPnL.length + cached.trades.length} records)`)
        return cached
      } else if (cached && this.needsIncrementalUpdate(cached)) {
        console.log(`🔄 Performing incremental update for ${account.name}`)
        return await this.performIncrementalUpdate(account, apiInstance, cached)
      }
    }

    const chunks = this.generateDateChunks()
    const totalChunks = chunks.length

    console.log(`📅 Will fetch ${totalChunks} chunks of ${this.CHUNK_SIZE_DAYS} days each`)

    let allClosedPnL: BybitClosedPnL[] = []
    let allTrades: BybitTrade[] = []
    let completedChunks = 0

    // Fetch closed P&L data
    console.log('📊 Fetching closed P&L history...')

    for (const chunk of chunks) {
      const chunkStartDate = new Date(chunk.start).toISOString().slice(0, 10)
      const chunkEndDate = new Date(chunk.end).toISOString().slice(0, 10)

      this.notifyProgress({
        accountId: account.id,
        currentChunk: chunk.index,
        totalChunks,
        recordsRetrieved: allClosedPnL.length,
        currentDateRange: `${chunkStartDate} to ${chunkEndDate}`,
        isComplete: false
      })

      try {
        // Fetch closed P&L for this chunk
        const chunkClosedPnL = await this.fetchClosedPnLChunk(
          apiInstance,
          account,
          chunk.start,
          chunk.end
        )

        if (chunkClosedPnL.length > 0) {
          allClosedPnL = [...allClosedPnL, ...chunkClosedPnL]
          console.log(`✅ Chunk ${chunk.index}: Found ${chunkClosedPnL.length} closed P&L records`)
        } else {
          console.log(`📭 Chunk ${chunk.index}: No closed P&L data`)
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 200))

      } catch (error) {
        console.warn(`❌ Chunk ${chunk.index} closed P&L failed:`, error)
      }

      completedChunks++
    }

    // Fetch execution history
    console.log('🔄 Fetching execution history...')
    completedChunks = 0

    for (const chunk of chunks) {
      const chunkStartDate = new Date(chunk.start).toISOString().slice(0, 10)
      const chunkEndDate = new Date(chunk.end).toISOString().slice(0, 10)

      this.notifyProgress({
        accountId: account.id,
        currentChunk: chunk.index + totalChunks, // Offset for second phase
        totalChunks: totalChunks * 2, // Double for both P&L and execution
        recordsRetrieved: allTrades.length,
        currentDateRange: `${chunkStartDate} to ${chunkEndDate}`,
        isComplete: false
      })

      try {
        // Fetch execution history for this chunk
        const chunkTrades = await this.fetchExecutionChunk(
          apiInstance,
          account,
          chunk.start,
          chunk.end
        )

        if (chunkTrades.length > 0) {
          allTrades = [...allTrades, ...chunkTrades]
          console.log(`✅ Chunk ${chunk.index}: Found ${chunkTrades.length} execution records`)
        } else {
          console.log(`📭 Chunk ${chunk.index}: No execution data`)
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 200))

      } catch (error) {
        console.warn(`❌ Chunk ${chunk.index} execution failed:`, error)
      }

      completedChunks++
    }

    // Sort all data by timestamp
    allClosedPnL.sort((a, b) => parseInt(b.updatedTime || b.createdTime) - parseInt(a.updatedTime || a.createdTime))
    allTrades.sort((a, b) => parseInt(b.execTime) - parseInt(a.execTime))

    // Save to new partitioned storage system
    await dataManager.addTrades(account.id, allTrades)
    await dataManager.addPnL(account.id, allClosedPnL)

    // Calculate actual data range based on real data
    const now = Date.now()
    let actualStartDate: string
    let actualTotalDays: number

    if (allClosedPnL.length > 0 || allTrades.length > 0) {
      // Find the oldest timestamp from either closed P&L or trades
      const oldestClosedPnL = allClosedPnL.length > 0
        ? Math.min(...allClosedPnL.map(p => parseInt(p.updatedTime || p.createdTime)))
        : now

      const oldestTrade = allTrades.length > 0
        ? Math.min(...allTrades.map(t => parseInt(t.execTime)))
        : now

      const oldestTimestamp = Math.min(oldestClosedPnL, oldestTrade)
      actualStartDate = new Date(oldestTimestamp).toISOString().slice(0, 10)
      actualTotalDays = Math.ceil((now - oldestTimestamp) / (24 * 60 * 60 * 1000))
    } else {
      // No data found, use minimal range
      actualStartDate = new Date(now - (7 * 24 * 60 * 60 * 1000)).toISOString().slice(0, 10) // 7 days back
      actualTotalDays = 7
    }

    // Create cache entry
    const cache: HistoricalDataCache = {
      accountId: account.id,
      closedPnL: allClosedPnL,
      trades: allTrades,
      lastUpdated: Date.now(),
      dataRange: {
        startDate: actualStartDate,
        endDate: new Date().toISOString().slice(0, 10),
        totalDays: actualTotalDays,
        chunksRetrieved: totalChunks
      },
      isComplete: true
    }

    this.notifyProgress({
      accountId: account.id,
      currentChunk: totalChunks * 2,
      totalChunks: totalChunks * 2,
      recordsRetrieved: allClosedPnL.length + allTrades.length,
      currentDateRange: 'Complete',
      isComplete: true
    })

    console.log(`🎉 Historical fetch complete for ${account.name}:`, {
      closedPnL: allClosedPnL.length,
      trades: allTrades.length,
      actualDays: actualTotalDays,
      requestedDays: this.INITIAL_DAYS_HISTORY,
      dateRange: `${actualStartDate} to ${cache.dataRange.endDate}`,
      savedToPartitionedStorage: true
    })

    return cache
  }

  // Perform incremental update to existing cache
  async performIncrementalUpdate(
    account: BybitAccount,
    apiInstance: any,
    existingCache: HistoricalDataCache
  ): Promise<HistoricalDataCache> {
    console.log(`🔄 Starting incremental update for ${account.name}`)

    const now = Date.now()
    const lastUpdateTime = existingCache.lastUpdated

    // Fetch data from last update time to now (with small overlap for safety)
    const updateStartTime = lastUpdateTime - (2 * 24 * 60 * 60 * 1000) // 2 days overlap
    const updateEndTime = now

    console.log(`📅 Fetching incremental data from ${new Date(updateStartTime).toISOString()} to ${new Date(updateEndTime).toISOString()}`)

    try {
      // Fetch new closed P&L data
      const newClosedPnL = await this.fetchClosedPnLChunk(
        apiInstance,
        account,
        updateStartTime,
        updateEndTime
      )

      // Fetch new execution data
      const newTrades = await this.fetchExecutionChunk(
        apiInstance,
        account,
        updateStartTime,
        updateEndTime
      )

      // Add new data to partitioned storage
      if (newTrades.length > 0) {
        await dataManager.addTrades(account.id, newTrades)
      }
      if (newClosedPnL.length > 0) {
        await dataManager.addPnL(account.id, newClosedPnL)
      }

      // Get updated cache
      const updatedCache = await this.getCachedData(account.id)

      if (!updatedCache) {
        console.warn('Failed to get updated cache, returning existing cache')
        return existingCache
      }

      const newDataCount = newClosedPnL.length + newTrades.length
      const totalDataCount = updatedCache.closedPnL.length + updatedCache.trades.length

      console.log(`✅ Incremental update complete for ${account.name}:`, {
        newRecords: newDataCount,
        totalRecords: totalDataCount,
        totalDays: updatedCache.dataRange.totalDays
      })

      return updatedCache

    } catch (error) {
      console.warn(`❌ Incremental update failed for ${account.name}, using existing cache:`, error)
      return existingCache
    }
  }

  // Fetch closed P&L for a specific chunk
  private async fetchClosedPnLChunk(
    apiInstance: any,
    account: BybitAccount,
    startTime: number,
    endTime: number
  ): Promise<BybitClosedPnL[]> {
    let allData: BybitClosedPnL[] = []
    let cursor = ''
    let hasMore = true
    let attempts = 0
    const maxAttempts = 5

    while (hasMore && attempts < maxAttempts) {
      attempts++

      const params: Record<string, any> = {
        category: 'linear',
        limit: 100,
        startTime: startTime.toString(),
        endTime: endTime.toString()
      }

      if (cursor) {
        params.cursor = cursor
      }

      const response = await apiInstance.makeRequest(
        account,
        '/v5/position/closed-pnl',
        params
      )

      if (response.retCode !== 0) {
        console.warn(`Closed P&L chunk failed: ${response.retCode} - ${response.retMsg}`)
        break
      }

      const data = response.result?.list || []
      allData = [...allData, ...data]

      cursor = response.result?.nextPageCursor || ''
      hasMore = cursor !== '' && data.length === 100

      if (data.length === 0) break
    }

    return allData
  }

  // Fetch execution history for a specific chunk
  private async fetchExecutionChunk(
    apiInstance: any,
    account: BybitAccount,
    startTime: number,
    endTime: number
  ): Promise<BybitTrade[]> {
    let allData: BybitTrade[] = []
    let cursor = ''
    let hasMore = true
    let attempts = 0
    const maxAttempts = 5

    while (hasMore && attempts < maxAttempts) {
      attempts++

      const params: Record<string, any> = {
        category: 'linear',
        limit: 100,
        startTime: startTime.toString(),
        endTime: endTime.toString()
      }

      if (cursor) {
        params.cursor = cursor
      }

      const response = await apiInstance.makeRequest(
        account,
        '/v5/execution/list',
        params
      )

      if (response.retCode !== 0) {
        console.warn(`Execution chunk failed: ${response.retCode} - ${response.retMsg}`)
        break
      }

      const data = response.result?.list || []
      allData = [...allData, ...data]

      cursor = response.result?.nextPageCursor || ''
      hasMore = cursor !== '' && data.length === 100

      if (data.length === 0) break
    }

    return allData
  }

  // Clear cache for specific account (now clears partitioned data)
  async clearCache(accountId?: string): Promise<void> {
    if (accountId) {
      await dataManager.clearAccountData(accountId)
    } else {
      // Clear all data - would need to enumerate all accounts
      console.warn('Clearing all account data not implemented in V2')
    }
  }

  // Update specific account with latest data
  async updateAccountData(
    account: BybitAccount,
    apiInstance: any
  ): Promise<HistoricalDataCache | null> {
    try {
      const existingCache = await this.getCachedData(account.id)

      if (existingCache) {
        // Perform incremental update
        return await this.performIncrementalUpdate(account, apiInstance, existingCache)
      } else {
        // No cache exists, fetch complete history
        return await this.fetchCompleteHistory(account, apiInstance, false)
      }
    } catch (error) {
      console.error(`Failed to update account data for ${account.name}:`, error)
      return null
    }
  }

  // Get cache statistics (now from partitioned storage)
  async getCacheStats(): Promise<{ totalAccounts: number; totalSize: string; lastUpdated?: string }> {
    try {
      // This would need to enumerate all accounts and get their stats
      // For now, return basic info
      return {
        totalAccounts: 0,
        totalSize: 'N/A (Partitioned Storage)',
        lastUpdated: new Date().toISOString()
      }
    } catch (error) {
      console.error('Error getting cache stats:', error)
      return {
        totalAccounts: 0,
        totalSize: '0 KB',
        lastUpdated: undefined
      }
    }
  }

  // Get account statistics from partitioned storage
  async getAccountStats(accountId: string): Promise<{
    totalMonths: number
    totalTrades: number
    totalPnLRecords: number
    dataSize: number
    oldestData: string
    newestData: string
  }> {
    return await dataManager.getAccountStats(accountId)
  }

  // Archive old data
  async archiveOldData(accountId: string, monthsToKeep: number = 24): Promise<void> {
    await dataManager.archiveOldData(accountId, monthsToKeep)
  }

  // Optimize storage
  async optimizeStorage(accountId: string): Promise<void> {
    await dataManager.optimizeStorage(accountId)
  }

  // Get migration status for UI
  async getMigrationStatus() {
    return await dataMigration.getMigrationStatus()
  }

  // Manual migration trigger
  async triggerMigration() {
    return await dataMigration.performFullMigration()
  }

  // Fast loading: Load from DB first, then fill gaps in background
  async fetchSmartHistory(
    account: BybitAccount,
    apiInstance: any
  ): Promise<HistoricalDataCache> {
    const startTime = Date.now()
    const now = Date.now()
    const sixMonthsAgo = now - (180 * 24 * 60 * 60 * 1000)

    console.log(`⚡ [${new Date().toISOString().slice(11, 23)}] Fast loading for ${account.name}: Step 1 - Load from database`)

    // Step 1: Load ALL data from database first (very fast - ~1 second)
    const dbStartTime = Date.now()
    const cachedPnL = await dataManager.getPnLInRange(account.id, new Date(sixMonthsAgo), new Date(now))
    const pnlLoadTime = Date.now() - dbStartTime

    const tradesStartTime = Date.now()
    const cachedTrades = await dataManager.getTradesInRange(account.id, new Date(sixMonthsAgo), new Date(now))
    const tradesLoadTime = Date.now() - tradesStartTime

    console.log(`✅ [${new Date().toISOString().slice(11, 23)}] Step 1 complete in ${Date.now() - startTime}ms: ${cachedPnL.length} P&L (${pnlLoadTime}ms), ${cachedTrades.length} trades (${tradesLoadTime}ms)`)

    // If we have cached data, return it immediately so UI can render
    if (cachedPnL.length > 0 || cachedTrades.length > 0) {
      const oldestDataTimestamp = this.getOldestTimestamp(cachedPnL, cachedTrades)
      const actualTotalDays = Math.ceil((now - oldestDataTimestamp) / (24 * 60 * 60 * 1000))

      const cache: HistoricalDataCache = {
        accountId: account.id,
        closedPnL: cachedPnL,
        trades: cachedTrades,
        lastUpdated: now,
        dataRange: {
          startDate: new Date(oldestDataTimestamp).toISOString().slice(0, 10),
          endDate: new Date(now).toISOString().slice(0, 10),
          totalDays: actualTotalDays,
          chunksRetrieved: 0
        },
        isComplete: false // Mark as incomplete - we'll fill gaps in background
      }

      console.log(`⚡ [${new Date().toISOString().slice(11, 23)}] Returning cached data immediately (total time: ${Date.now() - startTime}ms)`)

      // Skip gap-filling on startup for fast loading
      // User can manually refresh data using "Refresh Data" button if needed
      console.log(`💡 Tip: Use "Refresh Data" button to update historical data`)

      return cache
    } else {
      // No cached data - return empty cache (user can manually load via button)
      console.log(`📭 [${new Date().toISOString().slice(11, 23)}] No cached data found - returning empty cache (${Date.now() - startTime}ms)`)

      const emptyCache: HistoricalDataCache = {
        accountId: account.id,
        closedPnL: [],
        trades: [],
        lastUpdated: now,
        dataRange: {
          startDate: new Date(now).toISOString().slice(0, 10),
          endDate: new Date(now).toISOString().slice(0, 10),
          totalDays: 0,
          chunksRetrieved: 0
        },
        isComplete: false
      }

      return emptyCache
    }
  }

  // Background task to fill data gaps (non-blocking)
  private async fillDataGapsInBackground(
    account: BybitAccount,
    apiInstance: any,
    existingPnL: BybitClosedPnL[],
    existingTrades: BybitTrade[],
    startTime: number,
    endTime: number
  ): Promise<void> {
    console.log(`🔄 Background: Checking for data gaps to fill for ${account.name}`)

    try {
      const oldestDataTimestamp = this.getOldestTimestamp(existingPnL, existingTrades)
      const hasGap = oldestDataTimestamp > startTime

      if (hasGap) {
        console.log(`🔍 Background: Gap detected from ${new Date(startTime).toISOString()} to ${new Date(oldestDataTimestamp).toISOString()}`)

        // Fetch gap data from API
        const gapChunks = this.generateDateChunks(180).filter(chunk =>
          chunk.start < oldestDataTimestamp
        )

        for (const chunk of gapChunks) {
          const gapPnL = await this.fetchClosedPnLChunk(apiInstance, account, chunk.start, chunk.end)
          const gapTrades = await this.fetchExecutionChunk(apiInstance, account, chunk.start, chunk.end)

          if (gapPnL.length > 0 || gapTrades.length > 0) {
            // Save to database
            await dataManager.addPnL(account.id, gapPnL)
            await dataManager.addTrades(account.id, gapTrades)
            console.log(`✅ Background: Filled gap - ${gapPnL.length} P&L, ${gapTrades.length} trades`)
          }

          // Add delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000))
        }

        console.log(`✅ Background: All gaps filled for ${account.name}`)
      } else {
        console.log(`✅ Background: No gaps detected for ${account.name}`)
      }
    } catch (error) {
      console.error(`❌ Background: Error filling gaps for ${account.name}:`, error)
    }
  }

  // Helper: Get oldest timestamp from data
  private getOldestTimestamp(pnl: BybitClosedPnL[], trades: BybitTrade[]): number {
    const timestamps: number[] = []

    if (pnl.length > 0) {
      timestamps.push(...pnl.map(p => parseInt(p.updatedTime || p.createdTime)))
    }
    if (trades.length > 0) {
      timestamps.push(...trades.map(t => parseInt(t.execTime)))
    }

    return timestamps.length > 0 ? Math.min(...timestamps) : Date.now()
  }

  // Helper: Deduplicate by ID
  private deduplicateById<T extends { orderId?: string; execId?: string }>(items: T[]): T[] {
    const seen = new Set<string>()
    return items.filter(item => {
      const id = item.orderId || item.execId || JSON.stringify(item)
      if (seen.has(id)) return false
      seen.add(id)
      return true
    })
  }
}