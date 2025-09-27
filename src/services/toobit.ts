import crypto from 'crypto-js'
import {
  ExchangeAccount,
  ExchangeAPI,
  UnifiedAccountInfo,
  UnifiedPosition,
  UnifiedTrade,
  UnifiedClosedPnL,
  UnifiedAccountData,
  ApiResponse
} from '../types/exchanges'
import { apiLogger } from '../utils/apiLogger'

interface ToobitApiResponse<T> {
  code: number
  msg: string
  data: T
  success: boolean
}

interface ToobitBalance {
  asset: string
  free: string
  locked: string
  total: string
}

interface ToobitAccountInfo {
  balances: ToobitBalance[]
  totalWalletBalance: string
  availableBalance: string
}

interface ToobitTrade {
  symbol: string
  id: string
  orderId: string
  side: 'BUY' | 'SELL'
  quantity: string
  price: string
  commission: string
  commissionAsset: string
  time: number
  isBuyer: boolean
  isMaker: boolean
}

class ToobitAPI implements ExchangeAPI {
  private readonly baseUrl = 'https://api.toobit.com'
  private readonly testnetUrl = 'https://testnet-api.toobit.com'

  private getBaseUrl(isTestnet: boolean): string {
    return isTestnet ? this.testnetUrl : this.baseUrl
  }

  private generateSignature(
    timestamp: string,
    method: string,
    requestPath: string,
    body: string,
    secret: string
  ): string {
    const message = timestamp + method + requestPath + body
    return crypto.HmacSHA256(message, secret).toString(crypto.enc.Base64)
  }

  private async makeRequest<T>(
    account: ExchangeAccount,
    endpoint: string,
    params: Record<string, any> = {},
    method: 'GET' | 'POST' = 'GET'
  ): Promise<ToobitApiResponse<T>> {
    const startTime = Date.now()
    const timestamp = startTime.toString()
    const baseUrl = this.getBaseUrl(account.isTestnet)

    const queryString = new URLSearchParams(params).toString()
    const requestPath = endpoint + (queryString ? `?${queryString}` : '')
    const body = method === 'POST' ? JSON.stringify(params) : ''

    const signature = this.generateSignature(
      timestamp,
      method,
      requestPath,
      body,
      account.apiSecret
    )

    const headers = {
      'X-BB-APIKEY': account.apiKey,
      'X-BB-SIGN': signature,
      'X-BB-TIMESTAMP': timestamp,
      'Content-Type': 'application/json',
    }

    const url = `${baseUrl}${requestPath}`

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: method === 'POST' ? body : undefined,
      })

      const responseTime = Date.now() - startTime

      if (!response.ok) {
        const errorMsg = `HTTP error! status: ${response.status}`
        await apiLogger.log({
          timestamp: startTime,
          accountName: account.name,
          endpoint,
          method,
          requestParams: params,
          error: errorMsg,
          responseTime
        })
        throw new Error(errorMsg)
      }

      const data = await response.json()

      await apiLogger.log({
        timestamp: startTime,
        accountName: account.name,
        endpoint,
        method,
        requestParams: params,
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
        method,
        requestParams: params,
        error: errorMsg,
        responseTime
      })

      console.error('Toobit API request failed:', error)
      throw error
    }
  }

  async getAccountBalance(account: ExchangeAccount): Promise<UnifiedAccountInfo> {
    const response = await this.makeRequest<ToobitAccountInfo>(
      account,
      '/api/v1/account'
    )

    if (!response.success) {
      throw new Error(response.msg)
    }

    const balances = response.data.balances.map(balance => ({
      coin: balance.asset,
      walletBalance: balance.total,
      usdValue: '0', // Toobit doesn't provide USD value directly
      bonus: '0'
    }))

    // Calculate total values (simplified - in production you'd need USD conversion)
    const totalWalletBalance = response.data.totalWalletBalance || '0'
    const totalAvailableBalance = response.data.availableBalance || '0'

    return {
      totalEquity: totalWalletBalance,
      totalWalletBalance,
      totalMarginBalance: totalWalletBalance,
      totalAvailableBalance,
      totalPerpUPL: '0',
      totalInitialMargin: '0',
      totalMaintenanceMargin: '0',
      coin: balances,
      exchange: 'toobit'
    }
  }

  async getPositions(account: ExchangeAccount): Promise<UnifiedPosition[]> {
    // Toobit spot trading doesn't have positions like futures
    // This would need to be implemented for futures trading
    return []
  }

  async getTrades(account: ExchangeAccount, limit: number = 50): Promise<UnifiedTrade[]> {
    const response = await this.makeRequest<ToobitTrade[]>(
      account,
      '/api/v1/account/trades',
      { limit: Math.min(limit, 1000) }
    )

    if (!response.success) {
      throw new Error(response.msg)
    }

    return response.data.map(trade => ({
      symbol: trade.symbol,
      orderId: trade.orderId,
      side: trade.side === 'BUY' ? 'Buy' : 'Sell',
      orderType: trade.isMaker ? 'Limit' : 'Market',
      execFee: trade.commission,
      execId: trade.id,
      execPrice: trade.price,
      execQty: trade.quantity,
      execTime: trade.time.toString(),
      exchange: 'toobit',
      isMaker: trade.isMaker,
      feeRate: '0' // Not provided directly
    }))
  }

  async getClosedPnL(account: ExchangeAccount, limit: number = 100): Promise<UnifiedClosedPnL[]> {
    // For spot trading, we'll derive this from trade history
    // In production, you'd want to implement proper P&L calculation
    const trades = await this.getTrades(account, limit * 2)

    // Group trades by symbol and calculate P&L
    const symbolTrades = trades.reduce((groups, trade) => {
      if (!groups[trade.symbol]) groups[trade.symbol] = []
      groups[trade.symbol].push(trade)
      return groups
    }, {} as Record<string, UnifiedTrade[]>)

    const closedPnL: UnifiedClosedPnL[] = []

    Object.entries(symbolTrades).forEach(([symbol, symbolTradeList]) => {
      // Sort by time
      const sortedTrades = symbolTradeList.sort((a, b) =>
        parseInt(a.execTime) - parseInt(b.execTime)
      )

      let position = 0
      let totalCost = 0

      sortedTrades.forEach(trade => {
        const qty = parseFloat(trade.execQty)
        const price = parseFloat(trade.execPrice)
        const value = qty * price

        if (trade.side === 'Buy') {
          position += qty
          totalCost += value
        } else {
          if (position > 0) {
            const sellQty = Math.min(qty, position)
            const avgCost = totalCost / position
            const pnl = (price - avgCost) * sellQty

            closedPnL.push({
              symbol,
              orderId: trade.orderId,
              side: 'Sell',
              qty: sellQty.toString(),
              orderPrice: price.toString(),
              orderType: trade.orderType as 'Market' | 'Limit',
              execType: 'Trade',
              closedSize: sellQty.toString(),
              cumEntryValue: (sellQty * avgCost).toString(),
              avgEntryPrice: avgCost.toString(),
              cumExitValue: (sellQty * price).toString(),
              avgExitPrice: price.toString(),
              closedPnl: pnl.toString(),
              fillCount: '1',
              leverage: '1',
              createdTime: trade.execTime,
              updatedTime: trade.execTime,
              exchange: 'toobit'
            })

            position -= sellQty
            totalCost = position > 0 ? totalCost * (position / (position + sellQty)) : 0
          }
        }
      })
    })

    return closedPnL.slice(0, limit)
  }

  async fetchAccountData(account: ExchangeAccount): Promise<UnifiedAccountData> {
    try {
      console.log(`Fetching Toobit data for account: ${account.name}`)

      const [balance, positions, trades, closedPnL] = await Promise.all([
        this.getAccountBalance(account).catch(err => {
          console.error(`Toobit balance fetch failed for ${account.name}:`, err)
          throw new Error(`Balance: ${err.message}`)
        }),
        this.getPositions(account).catch(err => {
          console.error(`Toobit positions fetch failed for ${account.name}:`, err)
          return []
        }),
        this.getTrades(account, 1000).catch(err => {
          console.error(`Toobit trades fetch failed for ${account.name}:`, err)
          return []
        }),
        this.getClosedPnL(account, 1000).catch(err => {
          console.error(`Toobit closed P&L fetch failed for ${account.name}:`, err)
          return []
        }),
      ])

      console.log(`Successfully fetched Toobit data for ${account.name}:`, {
        hasBalance: !!balance,
        equity: balance?.totalEquity,
        positionsCount: positions.length,
        tradesCount: trades.length,
        closedPnLCount: closedPnL.length
      })

      return {
        id: account.id,
        name: account.name,
        exchange: 'toobit',
        balance,
        positions,
        trades,
        closedPnL,
        lastUpdated: Date.now(),
      }
    } catch (error) {
      console.error(`Critical error fetching Toobit data for account ${account.name}:`, error)

      let errorMessage = 'Unknown error'
      if (error instanceof Error) {
        if (error.message.includes('Invalid API key')) {
          errorMessage = 'Invalid API key'
        } else if (error.message.includes('Invalid signature')) {
          errorMessage = 'Invalid API signature'
        } else if (error.message.includes('Permission denied')) {
          errorMessage = 'Permission denied - check API key permissions'
        } else if (error.message.includes('Rate limit')) {
          errorMessage = 'Too many requests - rate limited'
        } else if (error.message.includes('network')) {
          errorMessage = 'Network connection error'
        } else {
          errorMessage = error.message
        }
      }

      return {
        id: account.id,
        name: account.name,
        exchange: 'toobit',
        balance: null,
        positions: [],
        trades: [],
        closedPnL: [],
        lastUpdated: Date.now(),
        error: errorMessage,
      }
    }
  }
}

export const toobitAPI = new ToobitAPI()