import crypto from 'crypto-js'
import { BybitAccount } from './storage'
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
  currentChunk: number
  totalChunks: number
  recordsRetrieved: number
  currentDateRange: string
  isComplete: boolean
}

export class HistoricalDataService {
  private readonly STORAGE_KEY = 'bybit_historical_cache'
  private readonly ENCRYPTION_KEY = 'bybit_dashboard_encryption_key_v1'
  private readonly INITIAL_DAYS_HISTORY = 180 // Initial 6 months fetch
  private readonly CHUNK_SIZE_DAYS = 7
  private readonly CACHE_EXPIRY_HOURS = 24 // Increased to 24 hours for development stability
  private readonly INCREMENTAL_UPDATE_HOURS = 6 // Check for new data every 6 hours

  private progressCallbacks: Set<(progress: HistoricalFetchProgress) => void> = new Set()

  // Encrypt and store cache data
  private async encryptAndStore(data: Record<string, HistoricalDataCache>): Promise<void> {
    try {
      const jsonStr = JSON.stringify(data)
      const encrypted = crypto.AES.encrypt(jsonStr, this.ENCRYPTION_KEY).toString()
      await window.electronAPI.store.set(this.STORAGE_KEY, encrypted)
    } catch (error) {
      console.warn('Failed to encrypt and store historical cache:', error)
    }
  }

  // Decrypt and retrieve cache data
  private async decryptAndRetrieve(): Promise<Record<string, HistoricalDataCache>> {
    try {
      const encrypted = await window.electronAPI.store.get(this.STORAGE_KEY)
      if (!encrypted) return {}

      const decrypted = crypto.AES.decrypt(encrypted, this.ENCRYPTION_KEY)
      const jsonStr = decrypted.toString(crypto.enc.Utf8)
      if (!jsonStr) return {}

      return JSON.parse(jsonStr)
    } catch (error) {
      console.warn('Failed to decrypt historical cache, starting fresh:', error)
      return {}
    }
  }

  // Check if cached data is still valid
  private isCacheValid(cache: HistoricalDataCache): boolean {
    const now = Date.now()
    const cacheAge = now - cache.lastUpdated
    const maxAge = this.CACHE_EXPIRY_HOURS * 60 * 60 * 1000

    // In development mode, be more lenient with cache validation
    const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV

    console.log(`🔍 Cache validation for account ${cache.accountId}:`, {
      cacheAge: `${Math.round(cacheAge / (60 * 60 * 1000))} hours`,
      maxAge: `${this.CACHE_EXPIRY_HOURS} hours`,
      isComplete: cache.isComplete,
      isValid: cacheAge < maxAge && cache.isComplete,
      isDevelopment,
      totalDays: cache.dataRange.totalDays
    })

    return cacheAge < maxAge && cache.isComplete
  }

  // Check if cache needs incremental update
  private needsIncrementalUpdate(cache: HistoricalDataCache): boolean {
    const now = Date.now()
    const timeSinceUpdate = now - cache.lastUpdated
    const updateInterval = this.INCREMENTAL_UPDATE_HOURS * 60 * 60 * 1000

    console.log(`🔄 Incremental update check for account ${cache.accountId}:`, {
      timeSinceUpdate: `${Math.round(timeSinceUpdate / (60 * 60 * 1000))} hours`,
      updateInterval: `${this.INCREMENTAL_UPDATE_HOURS} hours`,
      needsUpdate: timeSinceUpdate >= updateInterval,
      lastUpdate: new Date(cache.lastUpdated).toISOString()
    })

    return timeSinceUpdate >= updateInterval
  }

  // Get cached data for account
  async getCachedData(accountId: string): Promise<HistoricalDataCache | null> {
    const allCache = await this.decryptAndRetrieve()
    const accountCache = allCache[accountId]

    if (!accountCache || !this.isCacheValid(accountCache)) {
      return null
    }

    return accountCache
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

    // Save to encrypted cache
    const allCache = await this.decryptAndRetrieve()
    allCache[account.id] = cache
    await this.encryptAndStore(allCache)

    this.notifyProgress({
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
      cacheSize: JSON.stringify(cache).length
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

      // Merge with existing data, avoiding duplicates
      const mergedClosedPnL = this.mergeAndDeduplicateClosedPnL(existingCache.closedPnL, newClosedPnL)
      const mergedTrades = this.mergeAndDeduplicateTrades(existingCache.trades, newTrades)

      // Update cache with new data
      const updatedCache: HistoricalDataCache = {
        ...existingCache,
        closedPnL: mergedClosedPnL,
        trades: mergedTrades,
        lastUpdated: now,
        dataRange: {
          ...existingCache.dataRange,
          endDate: new Date().toISOString().slice(0, 10),
          // Always increment total days as time passes, not capped at 180
          totalDays: Math.max(
            existingCache.dataRange.totalDays + 1, // Minimum increment of 1 day
            mergedClosedPnL.length > 0
              ? Math.ceil((now - Math.min(...mergedClosedPnL.map(p => parseInt(p.updatedTime || p.createdTime)))) / (24 * 60 * 60 * 1000))
              : existingCache.dataRange.totalDays + 1
          )
        }
      }

      // Save updated cache
      const allCache = await this.decryptAndRetrieve()
      allCache[account.id] = updatedCache
      await this.encryptAndStore(allCache)

      const newDataCount = newClosedPnL.length + newTrades.length
      const totalDataCount = mergedClosedPnL.length + mergedTrades.length

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

  // Merge and deduplicate closed P&L data
  private mergeAndDeduplicateClosedPnL(existing: BybitClosedPnL[], newData: BybitClosedPnL[]): BybitClosedPnL[] {
    // Create a map for efficient deduplication using orderId + symbol
    const dataMap = new Map<string, BybitClosedPnL>()

    // Add existing data
    existing.forEach(item => {
      const key = `${item.orderId}_${item.symbol}_${item.updatedTime || item.createdTime}`
      dataMap.set(key, item)
    })

    // Add new data (will overwrite duplicates)
    newData.forEach(item => {
      const key = `${item.orderId}_${item.symbol}_${item.updatedTime || item.createdTime}`
      dataMap.set(key, item)
    })

    // Convert back to array and sort by timestamp
    return Array.from(dataMap.values())
      .sort((a, b) => parseInt(b.updatedTime || b.createdTime) - parseInt(a.updatedTime || a.createdTime))
  }

  // Merge and deduplicate trades data
  private mergeAndDeduplicateTrades(existing: BybitTrade[], newData: BybitTrade[]): BybitTrade[] {
    // Create a map for efficient deduplication using execId
    const dataMap = new Map<string, BybitTrade>()

    // Add existing data
    existing.forEach(item => {
      dataMap.set(item.execId, item)
    })

    // Add new data (will overwrite duplicates)
    newData.forEach(item => {
      dataMap.set(item.execId, item)
    })

    // Convert back to array and sort by timestamp
    return Array.from(dataMap.values())
      .sort((a, b) => parseInt(b.execTime) - parseInt(a.execTime))
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

  // Clear cache for specific account
  async clearCache(accountId?: string): Promise<void> {
    if (accountId) {
      const allCache = await this.decryptAndRetrieve()
      delete allCache[accountId]
      await this.encryptAndStore(allCache)
    } else {
      await window.electronAPI.store.delete(this.STORAGE_KEY)
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

  // Get cache statistics
  async getCacheStats(): Promise<{ totalAccounts: number; totalSize: string; lastUpdated?: string }> {
    const allCache = await this.decryptAndRetrieve()
    const accounts = Object.keys(allCache)
    const totalSize = JSON.stringify(allCache).length

    let lastUpdated: string | undefined
    if (accounts.length > 0) {
      const latestUpdate = Math.max(...Object.values(allCache).map(c => c.lastUpdated))
      lastUpdated = new Date(latestUpdate).toISOString()
    }

    return {
      totalAccounts: accounts.length,
      totalSize: `${(totalSize / 1024).toFixed(1)} KB`,
      lastUpdated
    }
  }
}