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

interface BloFinApiResponse<T> {
  code: string
  msg: string
  data: T
}

interface BloFinBalance {
  ccy: string
  bal: string
  frozenBal: string
  availBal: string
  upl: string
}

interface BloFinAccountInfo {
  totalEq: string
  adjEq: string
  details: BloFinBalance[]
}

interface BloFinPosition {
  instId: string
  posId: string
  posSide: string
  pos: string
  posCcy: string
  posUsd: string
  avgPx: string
  upl: string
  uplRatio: string
  lever: string
  liqPx: string
  markPx: string
  margin: string
  mgnMode: string
  mgnRatio: string
  mmr: string
  imr: string
  cTime: string
  uTime: string
}

interface BloFinTrade {
  instId: string
  tradeId: string
  ordId: string
  side: 'buy' | 'sell'
  fillSz: string
  fillPx: string
  fee: string
  feeCcy: string
  ts: string
  execType: string
}

class BloFinAPI implements ExchangeAPI {
  private readonly baseUrl = 'https://openapi.blofin.com'
  private readonly testnetUrl = 'https://openapi-testnet.blofin.com'

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

  private generateNonce(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
  }

  private async makeRequest<T>(
    account: ExchangeAccount,
    endpoint: string,
    params: Record<string, any> = {},
    method: 'GET' | 'POST' = 'GET'
  ): Promise<BloFinApiResponse<T>> {
    const startTime = Date.now()
    const timestamp = new Date().toISOString()
    const nonce = this.generateNonce()
    const baseUrl = this.getBaseUrl(account.isTestnet)

    const queryString = method === 'GET' ? new URLSearchParams(params).toString() : ''
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
      'ACCESS-KEY': account.apiKey,
      'ACCESS-SIGN': signature,
      'ACCESS-TIMESTAMP': timestamp,
      'ACCESS-NONCE': nonce,
      'ACCESS-PASSPHRASE': account.accessPassphrase || '',
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

      console.error('BloFin API request failed:', error)
      throw error
    }
  }

  async getAccountBalance(account: ExchangeAccount): Promise<UnifiedAccountInfo> {
    const response = await this.makeRequest<BloFinAccountInfo[]>(
      account,
      '/api/v1/account/balance'
    )

    if (response.code !== '0') {
      throw new Error(response.msg)
    }

    const accountInfo = response.data[0]
    if (!accountInfo) {
      throw new Error('No account information found')
    }

    const balances = accountInfo.details.map(balance => ({
      coin: balance.ccy,
      walletBalance: balance.bal,
      usdValue: balance.ccy === 'USDT' ? balance.bal : '0', // Simplified
      bonus: '0'
    }))

    return {
      totalEquity: accountInfo.totalEq,
      totalWalletBalance: accountInfo.totalEq,
      totalMarginBalance: accountInfo.adjEq,
      totalAvailableBalance: accountInfo.details.reduce((sum, detail) =>
        (parseFloat(sum) + parseFloat(detail.availBal)).toString(), '0'),
      totalPerpUPL: accountInfo.details.reduce((sum, detail) =>
        (parseFloat(sum) + parseFloat(detail.upl)).toString(), '0'),
      totalInitialMargin: '0', // Would need separate call
      totalMaintenanceMargin: '0', // Would need separate call
      coin: balances,
      exchange: 'blofin'
    }
  }

  async getPositions(account: ExchangeAccount): Promise<UnifiedPosition[]> {
    const response = await this.makeRequest<BloFinPosition[]>(
      account,
      '/api/v1/account/positions'
    )

    if (response.code !== '0') {
      throw new Error(response.msg)
    }

    return response.data
      .filter(position => parseFloat(position.pos) !== 0)
      .map(position => ({
        symbol: position.instId,
        side: position.posSide === 'long' ? 'Buy' : 'Sell',
        size: Math.abs(parseFloat(position.pos)).toString(),
        positionValue: position.posUsd,
        entryPrice: position.avgPx,
        markPrice: position.markPx,
        liqPrice: position.liqPx,
        unrealisedPnl: position.upl,
        leverage: position.lever,
        exchange: 'blofin',
        createdTime: position.cTime,
        updatedTime: position.uTime
      }))
  }

  async getTrades(account: ExchangeAccount, limit: number = 50): Promise<UnifiedTrade[]> {
    const response = await this.makeRequest<BloFinTrade[]>(
      account,
      '/api/v1/trade/fills',
      { limit: Math.min(limit, 100) }
    )

    if (response.code !== '0') {
      throw new Error(response.msg)
    }

    return response.data.map(trade => ({
      symbol: trade.instId,
      orderId: trade.ordId,
      side: trade.side === 'buy' ? 'Buy' : 'Sell',
      orderType: 'Market', // Simplified
      execFee: trade.fee,
      execId: trade.tradeId,
      execPrice: trade.fillPx,
      execQty: trade.fillSz,
      execTime: trade.ts,
      exchange: 'blofin',
      isMaker: trade.execType === 'M',
      feeRate: '0' // Not provided directly
    }))
  }

  async getClosedPnL(account: ExchangeAccount, limit: number = 100): Promise<UnifiedClosedPnL[]> {
    // BloFin might have a specific endpoint for closed P&L
    // For now, we'll derive from trade history
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

      let longPosition = 0
      let shortPosition = 0
      let longCost = 0
      let shortCost = 0

      sortedTrades.forEach(trade => {
        const qty = parseFloat(trade.execQty)
        const price = parseFloat(trade.execPrice)
        const value = qty * price

        if (trade.side === 'Buy') {
          if (shortPosition > 0) {
            // Closing short position
            const closeQty = Math.min(qty, shortPosition)
            const avgCost = shortCost / shortPosition
            const pnl = (avgCost - price) * closeQty

            closedPnL.push({
              symbol,
              orderId: trade.orderId,
              side: 'Buy',
              qty: closeQty.toString(),
              orderPrice: price.toString(),
              orderType: trade.orderType as 'Market' | 'Limit',
              execType: 'Trade',
              closedSize: closeQty.toString(),
              cumEntryValue: (closeQty * avgCost).toString(),
              avgEntryPrice: avgCost.toString(),
              cumExitValue: (closeQty * price).toString(),
              avgExitPrice: price.toString(),
              closedPnl: pnl.toString(),
              fillCount: '1',
              leverage: '1',
              createdTime: trade.execTime,
              updatedTime: trade.execTime,
              exchange: 'blofin'
            })

            shortPosition -= closeQty
            shortCost = shortPosition > 0 ? shortCost * (shortPosition / (shortPosition + closeQty)) : 0
          }

          // Add to long position
          if (qty > 0) {
            longPosition += qty
            longCost += value
          }
        } else {
          // Sell side
          if (longPosition > 0) {
            // Closing long position
            const closeQty = Math.min(qty, longPosition)
            const avgCost = longCost / longPosition
            const pnl = (price - avgCost) * closeQty

            closedPnL.push({
              symbol,
              orderId: trade.orderId,
              side: 'Sell',
              qty: closeQty.toString(),
              orderPrice: price.toString(),
              orderType: trade.orderType as 'Market' | 'Limit',
              execType: 'Trade',
              closedSize: closeQty.toString(),
              cumEntryValue: (closeQty * avgCost).toString(),
              avgEntryPrice: avgCost.toString(),
              cumExitValue: (closeQty * price).toString(),
              avgExitPrice: price.toString(),
              closedPnl: pnl.toString(),
              fillCount: '1',
              leverage: '1',
              createdTime: trade.execTime,
              updatedTime: trade.execTime,
              exchange: 'blofin'
            })

            longPosition -= closeQty
            longCost = longPosition > 0 ? longCost * (longPosition / (longPosition + closeQty)) : 0
          }

          // Add to short position
          if (qty > 0) {
            shortPosition += qty
            shortCost += value
          }
        }
      })
    })

    return closedPnL.slice(0, limit)
  }

  async fetchAccountData(account: ExchangeAccount): Promise<UnifiedAccountData> {
    try {
      console.log(`Fetching BloFin data for account: ${account.name}`)

      const [balance, positions, trades, closedPnL] = await Promise.all([
        this.getAccountBalance(account).catch(err => {
          console.error(`BloFin balance fetch failed for ${account.name}:`, err)
          throw new Error(`Balance: ${err.message}`)
        }),
        this.getPositions(account).catch(err => {
          console.error(`BloFin positions fetch failed for ${account.name}:`, err)
          return []
        }),
        this.getTrades(account, 1000).catch(err => {
          console.error(`BloFin trades fetch failed for ${account.name}:`, err)
          return []
        }),
        this.getClosedPnL(account, 1000).catch(err => {
          console.error(`BloFin closed P&L fetch failed for ${account.name}:`, err)
          return []
        }),
      ])

      console.log(`Successfully fetched BloFin data for ${account.name}:`, {
        hasBalance: !!balance,
        equity: balance?.totalEquity,
        positionsCount: positions.length,
        tradesCount: trades.length,
        closedPnLCount: closedPnL.length
      })

      return {
        id: account.id,
        name: account.name,
        exchange: 'blofin',
        balance,
        positions,
        trades,
        closedPnL,
        lastUpdated: Date.now(),
      }
    } catch (error) {
      console.error(`Critical error fetching BloFin data for account ${account.name}:`, error)

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
        exchange: 'blofin',
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

export const blofinAPI = new BloFinAPI()