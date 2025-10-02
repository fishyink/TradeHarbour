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
  private createExchange(account: ExchangeAccount): any {
    const exchangeClass = (ccxt as any)[account.exchange] as any

    if (!exchangeClass) {
      throw new Error(`Exchange ${account.exchange} not supported by CCXT`)
    }

    return new exchangeClass({
      apiKey: account.apiKey,
      secret: account.apiSecret,
      enableRateLimit: true,
      options: {
        defaultType: 'future', // Default to futures/derivatives
        recvWindow: 5000,
      },
      ...(account.isTestnet && {
        urls: {
          api: this.getTestnetUrl(account.exchange)
        }
      })
    })
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
      // Fetch balance - CCXT unified API
      const balance = await exchange.fetchBalance()

      // Calculate totals
      let totalEquity = 0
      let totalWalletBalance = 0
      let totalAvailableBalance = 0
      let totalPerpUPL = 0

      const coins: UnifiedBalance[] = []

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

      // Try to fetch positions for unrealized PnL
      try {
        const positions = await exchange.fetchPositions()
        totalPerpUPL = positions.reduce((sum: number, pos: any) => {
          return sum + (pos.unrealizedPnl || 0)
        }, 0)
      } catch (error) {
        console.warn('Could not fetch positions for PnL calculation:', error)
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
    } finally {
      await exchange.close()
    }
  }

  async getPositions(account: ExchangeAccount): Promise<UnifiedPosition[]> {
    const exchange = this.createExchange(account)

    try {
      const positions = await exchange.fetchPositions()

      return positions
        .filter((pos: any) => pos.contracts && pos.contracts > 0) // Only open positions
        .map((pos: any) => ({
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
          createdTime: pos.timestamp?.toString() || Date.now().toString(),
          updatedTime: pos.datetime || new Date().toISOString(),
        }))
    } finally {
      await exchange.close()
    }
  }

  async getTrades(account: ExchangeAccount, limit: number = 50): Promise<UnifiedTrade[]> {
    const exchange = this.createExchange(account)

    try {
      // CCXT doesn't have a unified "fetch all trades" method
      // We'll need to fetch trades per symbol or use exchange-specific methods
      const positions = await exchange.fetchPositions()
      const symbols = [...new Set(positions.map((p: any) => p.symbol).filter(Boolean))]

      const allTrades: UnifiedTrade[] = []

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
          console.warn(`Could not fetch trades for ${symbol}:`, error)
        }
      }

      return allTrades.sort((a, b) => parseInt(b.execTime) - parseInt(a.execTime)).slice(0, limit)
    } finally {
      await exchange.close()
    }
  }

  async getClosedPnL(account: ExchangeAccount, limit: number = 50): Promise<UnifiedClosedPnL[]> {
    const exchange = this.createExchange(account)

    try {
      // Note: Not all exchanges support closed PnL via CCXT
      // This is a best-effort implementation

      // Try to use exchange-specific methods if available
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
      console.warn('Could not fetch closed PnL:', error)
      return []
    } finally {
      await exchange.close()
    }
  }

  async fetchAccountData(account: ExchangeAccount): Promise<UnifiedAccountData> {
    try {
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
