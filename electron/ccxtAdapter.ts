import * as ccxt from 'ccxt'
import type {
  ExchangeAccount,
  ExchangeAPI,
  UnifiedAccountInfo,
  UnifiedPosition,
  UnifiedTrade,
  UnifiedClosedPnL,
  UnifiedAccountData,
  UnifiedBalance,
} from '../src/types/exchanges'

class CCXTAdapter implements ExchangeAPI {
  private exchangeCache: Map<string, any> = new Map()

  // Safe console logging that won't throw EPIPE errors
  private safeLog(message: string, ...args: any[]) {
    try {
      console.log(message, ...args)
    } catch (error) {
      // Silently ignore console errors (common in packaged Electron apps)
    }
  }

  private safeWarn(message: string, ...args: any[]) {
    try {
      console.warn(message, ...args)
    } catch (error) {
      // Silently ignore console errors
    }
  }

  private safeError(message: string, ...args: any[]) {
    try {
      console.error(message, ...args)
    } catch (error) {
      // Silently ignore console errors
    }
  }

  private createExchange(account: ExchangeAccount): any {
    // Cache exchange instances to reuse loaded markets
    const cacheKey = `${account.exchange}-${account.id}`
    if (this.exchangeCache.has(cacheKey)) {
      const cached = this.exchangeCache.get(cacheKey)
      // Update credentials in case they changed
      cached.apiKey = account.apiKey
      cached.secret = account.apiSecret
      return cached
    }

    const exchangeClass = (ccxt as any)[account.exchange] as any

    if (!exchangeClass) {
      throw new Error(`Exchange ${account.exchange} not supported by CCXT`)
    }

    const exchange = new exchangeClass({
      apiKey: account.apiKey,
      secret: account.apiSecret,
      enableRateLimit: true,
      rateLimit: 200, // Increase delay between requests (200ms minimum)
      options: {
        defaultType: 'future', // Default to futures/derivatives
        recvWindow: 5000,
      },
      ...(account.accessPassphrase && { password: account.accessPassphrase }),
      ...(account.isTestnet && {
        urls: {
          api: this.getTestnetUrl(account.exchange)
        }
      })
    })

    this.exchangeCache.set(cacheKey, exchange)
    return exchange
  }

  private getTestnetUrl(exchange: string): any {
    // Map testnet URLs for supported exchanges
    const testnetUrls: Record<string, any> = {
      bybit: {
        public: 'https://api-testnet.bybit.com',
        private: 'https://api-testnet.bybit.com',
      },
      // Add other testnet URLs as needed
    }
    return testnetUrls[exchange]
  }

  async getAccountBalance(account: ExchangeAccount): Promise<UnifiedAccountInfo> {
    const exchange = this.createExchange(account)

    try {
      // Calculate totals
      let totalEquity = 0
      let totalWalletBalance = 0
      let totalAvailableBalance = 0
      let totalPerpUPL = 0

      const coins: UnifiedBalance[] = []

      // For BloFin, fetch balances from multiple wallet types
      if (account.exchange === 'blofin') {
        try {
          // Fetch funding wallet
          const fundingBalance = await exchange.fetchBalance({ type: 'funding' })

          // Process funding wallet
          for (const [currency, balanceInfo] of Object.entries(fundingBalance)) {
            if (currency === 'info' || currency === 'free' || currency === 'used' || currency === 'total') continue

            const total = (balanceInfo as any).total || 0
            const free = (balanceInfo as any).free || 0

            if (total > 0) {
              if (['USDT', 'USDC', 'USD', 'BUSD'].includes(currency)) {
                totalWalletBalance += total
                totalAvailableBalance += free
              }
            }
          }
        } catch (error) {
          this.safeWarn('Could not fetch BloFin funding balance:', error)
        }

        try {
          // Fetch futures wallet (trading account)
          const futuresBalance = await exchange.fetchBalance({ type: 'swap' })

          // Process futures wallet
          for (const [currency, balanceInfo] of Object.entries(futuresBalance)) {
            if (currency === 'info' || currency === 'free' || currency === 'used' || currency === 'total') continue

            const total = (balanceInfo as any).total || 0
            const free = (balanceInfo as any).free || 0

            if (total > 0) {
              // Add to coins list
              let usdValue = total.toString()
              if (!['USDT', 'USDC', 'USD', 'BUSD'].includes(currency)) {
                try {
                  const ticker = await exchange.fetchTicker(`${currency}/USDT`)
                  usdValue = (total * (ticker.last || 0)).toString()
                } catch {}
              }

              coins.push({
                coin: currency,
                walletBalance: total.toString(),
                usdValue,
              })

              if (['USDT', 'USDC', 'USD', 'BUSD'].includes(currency)) {
                totalWalletBalance += total
                totalAvailableBalance += free
              }
            }
          }
        } catch (error) {
          this.safeWarn('Could not fetch BloFin futures balance:', error)
        }
      } else {
        // For other exchanges, use standard fetchBalance
        const balance = await exchange.fetchBalance()

        // Process each currency in balance
        for (const [currency, balanceInfo] of Object.entries(balance)) {
          if (currency === 'info' || currency === 'free' || currency === 'used' || currency === 'total') {
            continue // Skip metadata fields
          }

          const total = (balanceInfo as any).total || 0
          const free = (balanceInfo as any).free || 0

          if (total > 0) {
            // Try to get USD value (exchange-specific)
            let usdValue = '0'
            try {
              const ticker = await exchange.fetchTicker(`${currency}/USDT`)
              usdValue = (total * (ticker.last || 0)).toString()
            } catch {
              // If can't fetch ticker, use total as usd value for stablecoins
              if (['USDT', 'USDC', 'USD', 'BUSD'].includes(currency)) {
                usdValue = total.toString()
              }
            }

            coins.push({
              coin: currency,
              walletBalance: total.toString(),
              usdValue,
            })

            if (['USDT', 'USDC', 'USD', 'BUSD'].includes(currency)) {
              totalWalletBalance += total
              totalAvailableBalance += free
            }
          }
        }
      }

      // Try to fetch positions for unrealized PnL
      try {
        const positions = await exchange.fetchPositions()
        totalPerpUPL = positions.reduce((sum: number, pos: any) => {
          return sum + (pos.unrealizedPnl || 0)
        }, 0)
      } catch (error) {
        this.safeWarn('Could not fetch positions for PnL calculation:', error)
      }

      totalEquity = totalWalletBalance + totalPerpUPL

      return {
        totalEquity: totalEquity.toString(),
        totalWalletBalance: totalWalletBalance.toString(),
        totalMarginBalance: totalWalletBalance.toString(),
        totalAvailableBalance: totalAvailableBalance.toString(),
        totalPerpUPL: totalPerpUPL.toString(),
        totalInitialMargin: '0', // Would need position-specific calculation
        totalMaintenanceMargin: '0', // Would need position-specific calculation
        coin: coins,
        exchange: account.exchange,
      }
    } catch (error) {
      this.safeError('Error fetching account balance:', error)
      throw error
    }
  }

  async getPositions(account: ExchangeAccount): Promise<UnifiedPosition[]> {
    const exchange = this.createExchange(account)

    try {
      const positions = await exchange.fetchPositions()

      return positions
        .filter((pos: any) => pos.contracts && pos.contracts > 0) // Only open positions
        .map((pos: any) => {
          // CCXT's pos.timestamp should be the position update time (in milliseconds)
          // For position opened time, we use Date.now() as fallback since CCXT doesn't provide it reliably
          const createdTime = pos.timestamp?.toString() || Date.now().toString()

          return {
            symbol: pos.symbol || '',
            side: pos.side || 'None',
            size: (pos.contracts || 0).toString(),
            positionValue: (pos.notional || 0).toString(),
            entryPrice: (pos.entryPrice || 0).toString(),
            markPrice: (pos.markPrice || 0).toString(),
            liqPrice: pos.liquidationPrice?.toString(),
            unrealisedPnl: (pos.unrealizedPnl || 0).toString(),
            leverage: (pos.leverage || 1).toString(),
            exchange: account.exchange,
            createdTime: createdTime,
            updatedTime: pos.datetime || new Date().toISOString(),
          }
        })
    } catch (error) {
      this.safeError('Error fetching positions:', error)
      throw error
    }
  }

  async getTrades(account: ExchangeAccount, limit: number = 50): Promise<UnifiedTrade[]> {
    const exchange = this.createExchange(account)

    try {
      const allTrades: UnifiedTrade[] = []

      // For BloFin, use closed orders to get trade history
      if (account.exchange === 'blofin') {
        try {
          if (exchange.has['fetchClosedOrders']) {
            const closedOrders = await exchange.fetchClosedOrders(undefined, undefined, limit)
            this.safeLog(`BloFin fetchClosedOrders returned ${closedOrders.length} orders`)

            for (const order of closedOrders) {
              if (order.filled && order.filled > 0) {
                allTrades.push({
                  symbol: order.symbol || '',
                  orderId: order.id || '',
                  side: order.side || '',
                  orderType: order.type || '',
                  execFee: (order.fee?.cost || 0).toString(),
                  execId: order.id || '',
                  execPrice: (order.average || order.price || 0).toString(),
                  execQty: (order.filled || 0).toString(),
                  execTime: order.timestamp?.toString() || Date.now().toString(),
                  exchange: account.exchange,
                  isMaker: order.type === 'limit',
                  feeRate: order.fee?.rate?.toString(),
                })
              }
            }
          }
        } catch (error) {
          this.safeWarn('Could not fetch BloFin trades via closed orders:', error)
        }

        return allTrades.sort((a, b) => parseInt(b.execTime) - parseInt(a.execTime))
      }

      // For other exchanges, try to get symbols from positions first, then from recent orders
      let symbols: string[] = []

      try {
        const positions = await exchange.fetchPositions()
        symbols = [...new Set(positions.map((p: any) => p.symbol).filter(Boolean))] as string[]
      } catch (error) {
        this.safeWarn('Could not fetch positions for trade symbols:', error)
      }

      // If no positions, try to get symbols from recent closed orders
      if (symbols.length === 0 && exchange.has['fetchClosedOrders']) {
        try {
          const closedOrders = await exchange.fetchClosedOrders(undefined, undefined, 10)
          symbols = [...new Set(closedOrders.map((o: any) => o.symbol).filter(Boolean))] as string[]
        } catch (error) {
          this.safeWarn('Could not fetch closed orders for trade symbols:', error)
        }
      }

      for (const symbol of symbols.slice(0, 5)) { // Limit to 5 symbols to avoid rate limits
        try {
          const trades = await exchange.fetchMyTrades(symbol as string, undefined, limit)

          for (const trade of trades) {
            allTrades.push({
              symbol: trade.symbol || '',
              orderId: trade.order || trade.id || '',
              side: trade.side || '',
              orderType: trade.type || '',
              execFee: (trade.fee?.cost || 0).toString(),
              execId: trade.id || '',
              execPrice: (trade.price || 0).toString(),
              execQty: (trade.amount || 0).toString(),
              execTime: trade.timestamp?.toString() || Date.now().toString(),
              exchange: account.exchange,
              isMaker: trade.takerOrMaker === 'maker',
              feeRate: trade.fee?.rate?.toString(),
            })
          }
        } catch (error) {
          this.safeWarn(`Could not fetch trades for ${symbol}:`, error)
        }
      }

      return allTrades.sort((a, b) => parseInt(b.execTime) - parseInt(a.execTime)).slice(0, limit)
    } catch (error) {
      this.safeError('Error fetching trades:', error)
      throw error
    }
  }

  async getClosedPnL(account: ExchangeAccount, limit: number = 50): Promise<UnifiedClosedPnL[]> {
    const exchange = this.createExchange(account)

    try {
      // For BloFin, use trades to calculate P&L (order history approach)
      if (account.exchange === 'blofin') {
        const trades = await this.getTrades(account, limit * 2)

        this.safeLog(`BloFin getTrades returned ${trades.length} trades for P&L calculation`)
        if (trades.length > 0) {
          this.safeLog('First trade:', JSON.stringify(trades[0], null, 2))
        }

        // Group trades by symbol
        const symbolTrades = trades.reduce((groups, trade) => {
          if (!groups[trade.symbol]) groups[trade.symbol] = []
          groups[trade.symbol].push(trade)
          return groups
        }, {} as Record<string, typeof trades>)

        const closedPnL: UnifiedClosedPnL[] = []

        // Calculate P&L by matching entry/exit trades
        Object.entries(symbolTrades).forEach(([symbol, symbolTradeList]) => {
          const sortedTrades = symbolTradeList.sort((a, b) => parseInt(a.execTime) - parseInt(b.execTime))

          let longPos = 0, longCost = 0
          let shortPos = 0, shortCost = 0

          sortedTrades.forEach(trade => {
            const qty = parseFloat(trade.execQty)
            const price = parseFloat(trade.execPrice)
            const fee = parseFloat(trade.execFee)

            // Normalize side to lowercase for comparison
            const side = trade.side.toLowerCase()

            if (side === 'buy') {
              if (shortPos > 0) {
                // Closing short
                const closeQty = Math.min(qty, shortPos)
                const avgCost = shortCost / shortPos
                const pnl = (avgCost - price) * closeQty - fee

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
                  exchange: account.exchange,
                })

                shortPos -= closeQty
                shortCost = shortPos > 0 ? shortCost - (closeQty * avgCost) : 0
              }

              const remaining = qty - Math.min(qty, shortPos > 0 ? shortPos : 0)
              if (remaining > 0) {
                longPos += remaining
                longCost += remaining * price
              }
            } else {
              // Sell
              if (longPos > 0) {
                // Closing long
                const closeQty = Math.min(qty, longPos)
                const avgCost = longCost / longPos
                const pnl = (price - avgCost) * closeQty - fee

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
                  exchange: account.exchange,
                })

                longPos -= closeQty
                longCost = longPos > 0 ? longCost - (closeQty * avgCost) : 0
              }

              const remaining = qty - Math.min(qty, longPos > 0 ? longPos : 0)
              if (remaining > 0) {
                shortPos += remaining
                shortCost += remaining * price
              }
            }
          })
        })

        this.safeLog(`BloFin P&L calculation complete: ${closedPnL.length} closed positions found`)
        return closedPnL.slice(0, limit)
      }

      // For other exchanges, use the standard method
      if (exchange.has['fetchClosedOrders']) {
        const closedOrders = await exchange.fetchClosedOrders(undefined, undefined, limit)

        return closedOrders
          .filter((order: any) => order.status === 'closed' && order.filled && order.filled > 0)
          .map((order: any) => ({
            symbol: order.symbol || '',
            orderId: order.id || '',
            side: (order.side?.charAt(0).toUpperCase() + order.side?.slice(1)) as 'Buy' | 'Sell',
            qty: (order.filled || 0).toString(),
            orderPrice: (order.price || 0).toString(),
            orderType: (order.type?.charAt(0).toUpperCase() + order.type?.slice(1)) as 'Market' | 'Limit',
            execType: order.type || 'Trade',
            closedSize: (order.filled || 0).toString(),
            cumEntryValue: ((order.filled || 0) * (order.price || 0)).toString(),
            avgEntryPrice: (order.price || 0).toString(),
            cumExitValue: ((order.filled || 0) * (order.average || order.price || 0)).toString(),
            avgExitPrice: (order.average || order.price || 0).toString(),
            closedPnl: ((order.cost || 0) - (order.filled || 0) * (order.price || 0)).toString(),
            fillCount: '1',
            leverage: '1',
            createdTime: order.timestamp?.toString() || Date.now().toString(),
            updatedTime: order.lastTradeTimestamp?.toString() || order.timestamp?.toString() || Date.now().toString(),
            exchange: account.exchange,
          }))
      }

      return []
    } catch (error) {
      this.safeWarn('Could not fetch closed PnL:', error)
      return []
    }
  }

  async fetchAccountData(account: ExchangeAccount, includeHistory: boolean = false): Promise<UnifiedAccountData> {
    try {
      // Fast path: Only fetch balance and positions for initial load
      if (!includeHistory) {
        const [balance, positions] = await Promise.all([
          this.getAccountBalance(account).catch(() => null),
          this.getPositions(account).catch(() => []),
        ])

        return {
          id: account.id,
          name: account.name,
          exchange: account.exchange,
          balance,
          positions,
          trades: [],
          closedPnL: [],
          lastUpdated: Date.now(),
        }
      }

      // Full path: Fetch all data including historical trades/P&L
      const [balance, positions, trades, closedPnL] = await Promise.all([
        this.getAccountBalance(account).catch(() => null),
        this.getPositions(account).catch(() => []),
        this.getTrades(account).catch(() => []),
        this.getClosedPnL(account).catch(() => []),
      ])

      return {
        id: account.id,
        name: account.name,
        exchange: account.exchange,
        balance,
        positions,
        trades,
        closedPnL,
        lastUpdated: Date.now(),
      }
    } catch (error) {
      return {
        id: account.id,
        name: account.name,
        exchange: account.exchange,
        balance: null,
        positions: [],
        trades: [],
        closedPnL: [],
        lastUpdated: Date.now(),
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }
}

export const ccxtAdapter = new CCXTAdapter()
