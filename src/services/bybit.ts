import crypto from 'crypto-js'
import { BybitAccount } from './configManager'
import {
  BybitApiResponse,
  BybitAccountInfo,
  BybitPosition,
  BybitTrade,
  BybitClosedPnL,
  AccountData,
} from '../types/bybit'
import { apiLogger } from '../utils/apiLogger'
import { HistoricalDataService } from './historicalDataService'
import { notificationManager } from '../utils/notifications'

class BybitAPI {
  private readonly baseUrl = 'https://api.bybit.com'
  private readonly testnetUrl = 'https://api-testnet.bybit.com'
  private readonly historicalService = new HistoricalDataService()
  private readonly syncCache = new Map<string, any>()

  private getBaseUrl(isTestnet: boolean): string {
    return isTestnet ? this.testnetUrl : this.baseUrl
  }

  private generateSignature(
    timestamp: string,
    apiKey: string,
    apiSecret: string,
    params: string = ''
  ): string {
    // For Bybit V5 API: timestamp + apiKey + recv_window + params
    const recvWindow = '5000'
    const queryString = timestamp + apiKey + recvWindow + params
    return crypto.HmacSHA256(queryString, apiSecret).toString(crypto.enc.Hex).toLowerCase()
  }

  private async makeRequest<T>(
    account: BybitAccount,
    endpoint: string,
    params: Record<string, any> = {}
  ): Promise<BybitApiResponse<T>> {
    const startTime = Date.now()
    const timestamp = startTime.toString()
    const baseUrl = this.getBaseUrl(account.isTestnet)

    const sortedParams = Object.keys(params)
      .sort()
      .reduce((result, key) => {
        result[key] = params[key]
        return result
      }, {} as Record<string, any>)

    const queryString = new URLSearchParams(sortedParams).toString()
    const signature = this.generateSignature(timestamp, account.apiKey, account.apiSecret, queryString)

    const headers = {
      'X-BAPI-API-KEY': account.apiKey,
      'X-BAPI-SIGN': signature,
      'X-BAPI-SIGN-TYPE': '2',
      'X-BAPI-TIMESTAMP': timestamp,
      'X-BAPI-RECV-WINDOW': '5000',
      'Content-Type': 'application/json',
    }

    const url = `${baseUrl}${endpoint}${queryString ? `?${queryString}` : ''}`

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers,
      })

      const responseTime = Date.now() - startTime

      if (!response.ok) {
        const errorMsg = `HTTP error! status: ${response.status}`
        await apiLogger.log({
          timestamp: startTime,
          accountName: account.name,
          endpoint,
          method: 'GET',
          requestParams: sortedParams,
          error: errorMsg,
          responseTime
        })
        throw new Error(errorMsg)
      }

      const data = await response.json()

      // Log successful request
      await apiLogger.log({
        timestamp: startTime,
        accountName: account.name,
        endpoint,
        method: 'GET',
        requestParams: sortedParams,
        response: data,
        responseTime
      })

      return data
    } catch (error) {
      const responseTime = Date.now() - startTime
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'

      await apiLogger.log({
        timestamp: startTime,
        accountName: account.name,
        endpoint,
        method: 'GET',
        requestParams: sortedParams,
        error: errorMsg,
        responseTime
      })

      console.error('Bybit API request failed:', error)
      throw error
    }
  }

  async getAccountBalance(account: BybitAccount): Promise<BybitAccountInfo> {
    const response = await this.makeRequest<{ list: BybitAccountInfo[] }>(
      account,
      '/v5/account/wallet-balance',
      { accountType: 'UNIFIED' }
    )

    if (response.retCode !== 0) {
      throw new Error(response.retMsg)
    }

    return response.result.list[0] || {
      totalEquity: '0',
      totalWalletBalance: '0',
      totalMarginBalance: '0',
      totalAvailableBalance: '0',
      totalPerpUPL: '0',
      totalInitialMargin: '0',
      totalMaintenanceMargin: '0',
      coin: [],
    }
  }

  async getPositions(account: BybitAccount): Promise<BybitPosition[]> {
    const response = await this.makeRequest<{ list: BybitPosition[] }>(
      account,
      '/v5/position/list',
      { category: 'linear', settleCoin: 'USDT' }
    )

    if (response.retCode !== 0) {
      throw new Error(response.retMsg)
    }

    return response.result.list.filter(position => parseFloat(position.size) > 0)
  }

  async getClosedPnL(account: BybitAccount, limit: number = 100): Promise<BybitClosedPnL[]> {
    console.log(`🚀 Starting getClosedPnL for account: ${account.name} with limit: ${limit}`)

    // First try the closed P&L endpoint
    const closedPnLData = await this.tryClosedPnLEndpoint(account, limit)
    console.log(`📊 tryClosedPnLEndpoint returned ${closedPnLData.length} records`)

    if (closedPnLData.length > 0) {
      console.log(`✅ Successfully got ${closedPnLData.length} records from closed-pnl endpoint`)
      return closedPnLData
    }

    // If no closed P&L data, try to derive from execution history
    console.log(`⚠️ No closed P&L data available, trying execution history for ${account.name}`)
    const historyData = await this.getTradeHistory(account, limit)
    console.log(`📈 getTradeHistory returned ${historyData.length} processed trades`)
    return historyData
  }

  private async tryClosedPnLEndpoint(account: BybitAccount, limit: number): Promise<BybitClosedPnL[]> {
    const endTime = Date.now()

    let allClosedPnL: BybitClosedPnL[] = []

    // Try multiple strategies based on Bybit V5 documentation
    const strategies = [
      // Strategy 1: Default 7-day query (as per documentation default)
      { days: 7, name: 'Default 7-day' },
      // Strategy 2: 30-day query
      { days: 30, name: '30-day' },
      // Strategy 3: 90-day query
      { days: 90, name: '90-day' },
      // Strategy 4: Max supported 730 days for UTA accounts
      { days: 730, name: 'Full 2-year UTA' }
    ]

    for (const strategy of strategies) {
      console.log(`🔍 Trying ${strategy.name} strategy for ${account.name}`)

      const startTime = endTime - (strategy.days * 24 * 60 * 60 * 1000)
      let cursor = ''
      let hasMore = true
      let attempts = 0
      const maxAttempts = 2

      try {
        while (hasMore && allClosedPnL.length < 500 && attempts < maxAttempts) {
          attempts++

          const params: Record<string, any> = {
            category: 'linear',
            limit: 100
          }

          // Only add time params if not using default (7-day)
          if (strategy.days !== 7) {
            params.startTime = startTime.toString()
            params.endTime = endTime.toString()
          }

          if (cursor) {
            params.cursor = cursor
          }

          const response = await this.makeRequest<{ list: BybitClosedPnL[]; nextPageCursor?: string }>(
            account,
            '/v5/position/closed-pnl',
            params
          )

          console.log(`📊 ${strategy.name} Response for ${account.name}:`, {
            retCode: response.retCode,
            retMsg: response.retMsg,
            listLength: response.result?.list?.length || 0
          })

          // Handle specific Bybit error codes from documentation
          if (response.retCode === 10028) {
            console.warn(`⚠️ Account ${account.name} requires UTA (Unified Trading Account) for closed P&L access`)
            break
          }
          if (response.retCode === 182200) {
            console.warn(`⚠️ Account ${account.name} needs UTA upgrade for full data access`)
            break
          }
          if (response.retCode === 110067) {
            console.warn(`⚠️ Account ${account.name} - Unified account not supported`)
            break
          }

          if (response.retCode !== 0) {
            console.warn(`❌ ${strategy.name} failed: ${response.retCode} - ${response.retMsg}`)
            break
          }

          const closedPnLList = response.result?.list || []
          allClosedPnL = [...allClosedPnL, ...closedPnLList]

          cursor = response.result?.nextPageCursor || ''
          hasMore = cursor !== '' && closedPnLList.length === 100

          if (closedPnLList.length === 0) {
            console.log(`📭 No closed P&L data in ${strategy.name} for ${account.name}`)
            break
          }
        }

        // If we found data, stop trying other strategies
        if (allClosedPnL.length > 0) {
          console.log(`✅ ${strategy.name} successful: Found ${allClosedPnL.length} records for ${account.name}`)
          break
        }

      } catch (error) {
        console.warn(`❌ ${strategy.name} strategy failed for ${account.name}:`, error)
        continue
      }
    }

    return allClosedPnL.slice(0, limit)
  }

  // Alternative method to get trade history if closed-pnl endpoint fails
  async getTradeHistory(account: BybitAccount, limit: number = 100): Promise<BybitClosedPnL[]> {
    console.log(`🔄 Getting trade history alternative for account: ${account.name} with limit: ${limit}`)

    try {
      // According to Bybit docs: max 7-day window for execution history
      let allTrades: any[] = []
      const now = Date.now()
      const sevenDays = 7 * 24 * 60 * 60 * 1000
      const totalDaysBack = 90
      const windows = Math.ceil(totalDaysBack / 7)

      console.log(`📅 Fetching execution history in ${windows} x 7-day windows`)

      for (let windowIndex = 0; windowIndex < windows && allTrades.length < 1000; windowIndex++) {
        const windowEndTime = now - (windowIndex * sevenDays)
        const windowStartTime = windowEndTime - sevenDays

        console.log(`🔍 Window ${windowIndex + 1}/${windows}: ${new Date(windowStartTime).toISOString().slice(0, 10)} to ${new Date(windowEndTime).toISOString().slice(0, 10)}`)

        let cursor = ''
        let attempts = 0
        const maxAttempts = 3

        while (attempts < maxAttempts && allTrades.length < 1000) {
          attempts++

          const params: Record<string, any> = {
            category: 'linear',
            limit: 100,
            startTime: windowStartTime.toString(),
            endTime: windowEndTime.toString()
          }

          if (cursor) {
            params.cursor = cursor
          }

          const response = await this.makeRequest<{ list: any[]; nextPageCursor?: string }>(
            account,
            '/v5/execution/list',
            params
          )

          if (response.retCode !== 0) {
            console.warn(`❌ Execution history window ${windowIndex + 1} failed: ${response.retCode} - ${response.retMsg}`)
            break
          }

          const trades = response.result?.list || []
          allTrades = [...allTrades, ...trades]

          console.log(`📊 Window ${windowIndex + 1}, Attempt ${attempts}: Got ${trades.length} trades (Total: ${allTrades.length})`)

          cursor = response.result?.nextPageCursor || ''
          if (!cursor || trades.length === 0) break
        }

        // Small delay between windows to respect rate limits
        if (windowIndex < windows - 1) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }

      console.log(`📈 Retrieved ${allTrades.length} total execution records across ${windows} windows`)

      if (allTrades.length === 0) {
        console.log(`📭 No execution data available for ${account.name}`)
        return []
      }

      // Group trades by symbol to calculate P&L
      const symbolTrades = allTrades.reduce((groups, trade) => {
        const symbol = trade.symbol
        if (!groups[symbol]) groups[symbol] = []
        groups[symbol].push(trade)
        return groups
      }, {} as Record<string, any[]>)

      const processedTrades: BybitClosedPnL[] = []

      Object.entries(symbolTrades).forEach(([symbol, trades]) => {
        // Sort trades by time
        const sortedTrades = (trades as any[]).sort((a: any, b: any) => parseInt(a.execTime) - parseInt(b.execTime))

        let currentPosition = parseFloat('0')
        let currentTotalCost = parseFloat('0')

        sortedTrades.forEach((trade: any) => {
          const qty = parseFloat(trade.execQty)
          const price = parseFloat(trade.execPrice)
          const value = qty * price
          const fee = parseFloat(trade.execFee || '0')

          if (trade.side === 'Buy') {
            if (currentPosition < 0) {
              // Closing short position
              const closeQty = Math.min(qty, Math.abs(currentPosition))
              const avgCost = Math.abs(currentTotalCost / currentPosition)
              const pnl = (avgCost - price) * closeQty - fee

              processedTrades.push({
                symbol,
                orderId: trade.orderId,
                side: trade.side,
                qty: closeQty.toString(),
                orderPrice: price.toString(),
                orderType: trade.orderType || 'Market',
                execType: 'Trade' as const,
                closedSize: closeQty.toString(),
                cumEntryValue: (closeQty * avgCost).toString(),
                avgEntryPrice: avgCost.toString(),
                cumExitValue: (closeQty * price).toString(),
                avgExitPrice: price.toString(),
                closedPnl: pnl.toString(),
                fillCount: '1',
                leverage: trade.leverage || '1',
                createdTime: trade.execTime,
                updatedTime: trade.execTime
              })

              currentPosition += closeQty
              if (currentPosition < 0) {
                currentTotalCost = currentTotalCost * (currentPosition / (currentPosition - closeQty))
              } else {
                currentTotalCost = parseFloat('0')
              }
            }

            // Add to long position
            if (qty > 0) {
              currentPosition += qty
              currentTotalCost += value + fee
            }
          } else {
            // Sell side
            if (currentPosition > 0) {
              // Closing long position
              const closeQty = Math.min(qty, currentPosition)
              const avgCost = currentTotalCost / currentPosition
              const pnl = (price - avgCost) * closeQty - fee

              processedTrades.push({
                symbol,
                orderId: trade.orderId,
                side: trade.side,
                qty: closeQty.toString(),
                orderPrice: price.toString(),
                orderType: trade.orderType || 'Market',
                execType: 'Trade' as const,
                closedSize: closeQty.toString(),
                cumEntryValue: (closeQty * avgCost).toString(),
                avgEntryPrice: avgCost.toString(),
                cumExitValue: (closeQty * price).toString(),
                avgExitPrice: price.toString(),
                closedPnl: pnl.toString(),
                fillCount: '1',
                leverage: trade.leverage || '1',
                createdTime: trade.execTime,
                updatedTime: trade.execTime
              })

              currentPosition -= closeQty
              if (currentPosition > 0) {
                currentTotalCost = currentTotalCost * (currentPosition / (currentPosition + closeQty))
              } else {
                currentTotalCost = parseFloat('0')
              }
            }

            // Add to short position
            if (qty > 0) {
              currentPosition -= qty
              currentTotalCost -= value + fee
            }
          }
        })
      })

      console.log(`💰 Processed ${processedTrades.length} trades with P&L calculations`)
      console.log(`🔀 Sample processed trade:`, processedTrades[0])

      // Sort by time (newest first) and apply limit
      processedTrades.sort((a, b) => parseInt(b.updatedTime) - parseInt(a.updatedTime))
      const finalResult = processedTrades.slice(0, limit)
      console.log(`📤 Returning ${finalResult.length} final trades for account: ${account.name}`)
      return finalResult

    } catch (error) {
      console.error(`Error in trade history alternative:`, error)
      return []
    }
  }

  async getTrades(account: BybitAccount, limit: number = 50): Promise<BybitTrade[]> {
    // Get trades from the last 180 days in 7-day chunks (Bybit API limit)
    const endTime = Date.now()
    const daysBack = 180
    const chunkSize = 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds

    let allTrades: BybitTrade[] = []

    // Fetch data in 7-day chunks going backwards
    for (let i = 0; i < Math.ceil(daysBack / 7) && allTrades.length < 5000; i++) {
      const chunkEndTime = endTime - (i * chunkSize)
      const chunkStartTime = Math.max(chunkEndTime - chunkSize, endTime - (daysBack * 24 * 60 * 60 * 1000))

      try {
        let cursor = ''
        let hasMore = true

        // Paginate through each 7-day chunk
        while (hasMore && allTrades.length < 5000) {
          const params: Record<string, any> = {
            category: 'linear',
            limit: 1000,
            startTime: chunkStartTime.toString(),
            endTime: chunkEndTime.toString()
          }

          if (cursor) {
            params.cursor = cursor
          }

          const response = await this.makeRequest<{ list: BybitTrade[]; nextPageCursor?: string }>(
            account,
            '/v5/execution/list',
            params
          )

          if (response.retCode !== 0) {
            console.warn(`Error fetching trades chunk: ${response.retMsg}`)
            break
          }

          const trades = response.result.list || []
          allTrades = [...allTrades, ...trades]

          // Check if there are more pages in this chunk
          cursor = response.result.nextPageCursor || ''
          hasMore = cursor !== '' && trades.length === 1000
        }
      } catch (error) {
        console.warn(`Error fetching trades for chunk ${i}:`, error)
        continue
      }
    }

    // Sort by execution time (newest first) and apply limit
    allTrades.sort((a, b) => parseInt(b.execTime) - parseInt(a.execTime))
    return allTrades.slice(0, limit === 50 ? Math.min(allTrades.length, 1000) : limit)
  }

  async fetchAccountData(account: BybitAccount): Promise<AccountData> {
    try {
      console.log(`Fetching data for account: ${account.name}`)

      const [balance, positions, trades, closedPnL] = await Promise.all([
        this.getAccountBalance(account).catch(err => {
          console.error(`Balance fetch failed for ${account.name}:`, err)
          throw new Error(`Balance: ${err.message}`)
        }),
        this.getPositions(account).catch(err => {
          console.error(`Positions fetch failed for ${account.name}:`, err)
          return [] // Non-critical, return empty array
        }),
        this.getTrades(account, 1000).catch(err => {
          console.error(`Trades fetch failed for ${account.name}:`, err)
          return [] // Non-critical, return empty array
        }),
        this.getClosedPnL(account, 1000).catch(err => {
          console.error(`Closed P&L fetch CRITICAL ERROR for ${account.name}:`, err)
          console.error(`This is likely why trade statistics aren't showing`)
          return [] // Return empty array but log the critical error
        }),
      ])

      console.log(`Successfully fetched data for ${account.name}:`, {
        hasBalance: !!balance,
        equity: balance?.totalEquity,
        positionsCount: positions.length,
        tradesCount: trades.length,
        closedPnLCount: closedPnL.length
      })

      return {
        id: account.id,
        name: account.name,
        balance,
        positions,
        trades,
        closedPnL,
        lastUpdated: Date.now(),
      }
    } catch (error) {
      console.error(`Critical error fetching data for account ${account.name}:`, error)

      let errorMessage = 'Unknown error'
      if (error instanceof Error) {
        if (error.message.includes('10003')) {
          errorMessage = 'Invalid API key'
          notificationManager.addApiKeyInvalidNotification({
            id: account.id,
            name: account.name,
            exchange: 'bybit'
          } as any, 'API key is invalid or has been revoked')
        } else if (error.message.includes('10004')) {
          errorMessage = 'Invalid API signature'
          notificationManager.addApiKeyInvalidNotification({
            id: account.id,
            name: account.name,
            exchange: 'bybit'
          } as any, 'API signature validation failed - check secret key')
        } else if (error.message.includes('10005')) {
          errorMessage = 'Permission denied - check API key permissions'
          notificationManager.addApiKeyInvalidNotification({
            id: account.id,
            name: account.name,
            exchange: 'bybit'
          } as any, 'API key lacks required permissions')
        } else if (error.message.includes('10006')) {
          errorMessage = 'Too many requests - rate limited'
          notificationManager.addApiKeyRateLimitNotification({
            id: account.id,
            name: account.name,
            exchange: 'bybit'
          } as any)
        } else if (error.message.includes('10018') || error.message.includes('expired')) {
          errorMessage = 'API key has expired'
          notificationManager.addApiKeyExpiredNotification({
            id: account.id,
            name: account.name,
            exchange: 'bybit'
          } as any)
        } else if (error.message.includes('ENOTFOUND') || error.message.includes('network')) {
          errorMessage = 'Network connection error'
        } else if (error.message.includes('Balance:')) {
          errorMessage = error.message
        } else {
          errorMessage = error.message
        }
      }

      return {
        id: account.id,
        name: account.name,
        balance: null,
        positions: [],
        trades: [],
        closedPnL: [],
        lastUpdated: Date.now(),
        error: errorMessage,
      }
    }
  }

  async fetchAllAccountsData(accounts: BybitAccount[]): Promise<AccountData[]> {
    if (accounts.length === 0) return []

    const requests = accounts.map(account => this.fetchAccountData(account))

    try {
      return await Promise.allSettled(requests).then(results =>
        results.map((result, index) => {
          if (result.status === 'fulfilled') {
            return result.value
          } else {
            return {
              id: accounts[index].id,
              name: accounts[index].name,
              balance: null,
              positions: [],
              trades: [],
              closedPnL: [],
              lastUpdated: Date.now(),
              error: result.reason?.message || 'Request failed',
            }
          }
        })
      )
    } catch (error) {
      console.error('Error fetching all accounts data:', error)
      throw error
    }
  }

  // Historical Data Service Integration

  async fetchCompleteHistoricalData(
    account: BybitAccount,
    forceRefresh: boolean = false
  ) {
    const result = await this.historicalService.fetchCompleteHistory(account, this, forceRefresh)
    // Populate sync cache for immediate access
    this.syncCache.set(account.id, result)
    return result
  }

  async updateAccountHistoricalData(account: BybitAccount) {
    const result = await this.historicalService.updateAccountData(account, this)
    if (result) {
      // Update sync cache with new data
      this.syncCache.set(account.id, result)
    }
    return result
  }

  async initializeSyncCache() {
    try {
      // Load any existing cached data into sync cache for immediate access
      // We'll need to modify this approach since getCachedData takes accountId
      // For now, just keep the sync cache as is - it will be populated when data is fetched
    } catch (error) {
      console.warn('Failed to initialize sync cache:', error)
    }
  }

  async preloadCachedData(accountId: string) {
    try {
      const cachedData = await this.historicalService.getCachedData(accountId)
      if (cachedData) {
        this.syncCache.set(accountId, cachedData)
        return cachedData
      }
      return null
    } catch (error) {
      console.warn('Failed to preload cached data:', error)
      return null
    }
  }

  getCachedHistoricalData(accountId: string) {
    try {
      // First check sync cache
      const cachedData = this.syncCache.get(accountId)
      if (cachedData) {
        return cachedData
      }

      // If not in sync cache, try to populate it from persistent storage asynchronously
      // This is a fire-and-forget operation to warm up the cache for next access
      this.historicalService.getCachedData(accountId).then(data => {
        if (data) {
          this.syncCache.set(accountId, data)
        }
      }).catch(error => {
        console.warn('Failed to load cached data:', error)
      })

      return null
    } catch (error) {
      return null
    }
  }

  onHistoricalProgress(callback: (progress: any) => void) {
    return this.historicalService.onProgress(callback)
  }

  async clearHistoricalCache(accountId?: string) {
    return this.historicalService.clearCache(accountId)
  }

  async getHistoricalCacheStats() {
    return this.historicalService.getCacheStats()
  }
}

export const bybitAPI = new BybitAPI()