import * as ccxt from 'ccxt'
import log from 'electron-log'
import { calculateRealizedPnL, logPnLComparison } from '../src/utils/calcPnL'
import { toMs } from '../src/utils/time'
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
import type { Trade as PnLTrade, Position as PnLPosition } from '../src/utils/calcPnL'

class CCXTAdapter implements ExchangeAPI {
  private exchangeCache: Map<string, any> = new Map()

  // Use electron-log for reliable logging (kept for backward compatibility)
  private safeWarn(message: string, ...args: any[]) {
    log.warn(`[CCXT] ${message}`, ...args)
  }

  private safeError(message: string, ...args: any[]) {
    log.error(`[CCXT] ${message}`, ...args)
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
                accountType: 'funding'
              })

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
                accountType: 'futures'
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
          // Try to get createdTime from raw API data (Bybit-specific)
          // Bybit provides createdTime in milliseconds in the raw response
          let createdTime = pos.timestamp?.toString() || Date.now().toString()

          if (pos.info && pos.info.createdTime) {
            // Bybit returns createdTime in milliseconds as a string
            createdTime = pos.info.createdTime
          }

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

    log.info(`[CCXT] 📊 Fetching trades for ${account.name} (${account.exchange}), limit: ${limit}`)

    try {
      const allTrades: UnifiedTrade[] = []

      // For BloFin, use fetchMyTrades to get trade history with fills (includes fillPnl, reduceOnly)
      if (account.exchange === 'blofin') {
        try {
          if (exchange.has['fetchMyTrades']) {
            // Fetch ALL trades using pagination
            let allMyTrades: any[] = []
            let lastTimestamp: number | undefined = undefined
            let fetchCount = 0
            const pageLimit = 100 // Fetch in chunks of 100

            log.info(`[CCXT] 🔄 Fetching ALL BloFin trade fills with pagination...`)

            while (true) {
              // fetchMyTrades(symbol, since, limit, params)
              const trades: any[] = await exchange.fetchMyTrades(undefined, lastTimestamp, pageLimit)
              if (!trades || trades.length === 0) break

              allMyTrades.push(...trades)
              fetchCount += trades.length

              log.debug(`[CCXT] Fetched ${trades.length} trades, total so far: ${allMyTrades.length}`)

              // Update lastTimestamp to fetch next page
              const last: any = trades[trades.length - 1]
              if (last?.timestamp) {
                lastTimestamp = last.timestamp + 1 // Avoid duplicates
              }

              // Stop if we got fewer than requested (last page)
              if (trades.length < pageLimit) break

              // Safety cap: don't fetch more than 5000 trades
              if (fetchCount >= 5000) {
                log.warn(`[CCXT] Reached safety cap of 5000 trades, stopping pagination`)
                break
              }
            }

            log.info(`[CCXT] ✅ BloFin fetchMyTrades pagination complete: ${allMyTrades.length} total trades`)

            // Convert CCXT trades to UnifiedTrade format
            for (const trade of allMyTrades) {
              if (trade.amount && trade.amount > 0) {
                // Normalize timestamp (BloFin returns ms)
                const tradeTime = toMs(trade.timestamp || trade.info?.ts)

                // Debug timestamp normalization for BloFin
                if (process.env.DEBUG_TIME) {
                  const raw = {
                    ts: trade?.timestamp,
                    infoTs: trade?.info?.ts,
                    datetime: trade?.datetime
                  }
                  const norm = {
                    tradeTime,
                    tradeTimeISO: tradeTime ? new Date(tradeTime).toISOString() : null
                  }
                  log.debug('[TIME DEBUG][BloFin Trade]', raw, norm)
                }

                const unifiedTrade = {
                  symbol: trade.symbol || '',
                  orderId: trade.order || trade.info?.orderId || '',
                  side: trade.side || '',
                  orderType: trade.type || '',
                  execFee: (trade.fee?.cost || 0).toString(),
                  execId: trade.id || trade.info?.tradeId || '',
                  execPrice: (trade.price || 0).toString(),
                  execQty: (trade.amount || 0).toString(),
                  execTime: (tradeTime || Date.now()).toString(),
                  exchange: account.exchange,
                  isMaker: trade.takerOrMaker === 'maker',
                  feeRate: trade.fee?.rate?.toString(),
                  // CRITICAL: Preserve raw trade info containing fillPnl, reduceOnly, positionSide
                  info: trade.info,
                }

                log.debug(`[CCXT] Trade fill parsed:`, {
                  symbol: unifiedTrade.symbol,
                  side: unifiedTrade.side,
                  qty: unifiedTrade.execQty,
                  price: unifiedTrade.execPrice,
                  time: new Date(parseInt(unifiedTrade.execTime)).toISOString(),
                  rawTimestamp: unifiedTrade.execTime,
                  // Log critical fields for P&L
                  reduceOnly: trade.info?.reduceOnly,
                  fillPnl: trade.info?.fillPnl,
                  positionSide: trade.info?.positionSide
                })

                allTrades.push(unifiedTrade)
              }
            }
          }
        } catch (error) {
          this.safeWarn('Could not fetch BloFin trades via fetchMyTrades:', error)
        }

        log.info(
          `[CCXT] ✅ BloFin fetched ${allTrades.length} closed trades, ` +
          `timestamps normalized ✅`
        )

        if (allTrades.length > 0) {
          const sorted = allTrades.sort((a, b) => parseInt(a.execTime) - parseInt(b.execTime))
          const firstTime = new Date(parseInt(sorted[0].execTime))
          const lastTime = new Date(parseInt(sorted[sorted.length - 1].execTime))

          log.info(
            `[CCXT] 📅 Trade time range: ${firstTime.toLocaleString()} → ${lastTime.toLocaleString()}`
          )

          log.debug(`[CCXT] First trade:`, sorted[0])
          log.debug(`[CCXT] Last trade:`, sorted[sorted.length - 1])

          return sorted.reverse() // Return in descending order (newest first)
        }

        return allTrades
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
          log.info(`[CCXT] Fetching trades for symbol: ${symbol}`)
          const trades = await exchange.fetchMyTrades(symbol as string, undefined, limit)
          log.info(`[CCXT] Got ${trades.length} trades for ${symbol}`)

          for (const trade of trades) {
            const unifiedTrade = {
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
            }

            log.debug(`[CCXT] Trade parsed:`, {
              symbol: unifiedTrade.symbol,
              side: unifiedTrade.side,
              qty: unifiedTrade.execQty,
              price: unifiedTrade.execPrice,
              time: new Date(parseInt(unifiedTrade.execTime)).toISOString(),
              rawTimestamp: unifiedTrade.execTime
            })

            allTrades.push(unifiedTrade)
          }
        } catch (error) {
          this.safeWarn(`Could not fetch trades for ${symbol}:`, error)
        }
      }

      log.info(`[CCXT] ✅ Total trades fetched: ${allTrades.length}`)
      if (allTrades.length > 0) {
        log.debug(`[CCXT] First trade:`, allTrades[0])
        log.debug(`[CCXT] Last trade:`, allTrades[allTrades.length - 1])
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
      // For BloFin, use hedge-mode aware PnL calculator
      if (account.exchange === 'blofin') {
        log.info(`[CCXT] 💰 Fetching BloFin P&L with hedge mode support...`)

        // Fetch trades for PnL calculation
        const unifiedTrades = await this.getTrades(account, limit * 3) // Fetch more to ensure we have complete position histories

        log.info(`[CCXT] BloFin: Fetched ${unifiedTrades.length} trades for P&L calculation`)

        // Convert unified trades to PnL calculator format
        const pnlTrades: PnLTrade[] = unifiedTrades.map(t => ({
          symbol: t.symbol,
          side: t.side.toLowerCase(),
          amount: parseFloat(t.execQty),
          price: parseFloat(t.execPrice),
          timestamp: parseInt(t.execTime),
          fee: {
            cost: parseFloat(t.execFee),
            currency: 'USDT',
          },
          // CRITICAL FIX: Pass t.info (which contains order.info from BloFin) instead of entire t object
          // This ensures calcPnL.ts can access posId, posSide, etc. at trade.info.posId (not trade.info.info.posId)
          info: t.info,
        }))

        // Fetch funding fees if available
        const fundingFees = new Map<string, number>()

        // Custom BloFin funding fee fetch (CCXT doesn't support fetchFundingHistory for BloFin)
        if (account.exchange === 'blofin') {
          try {
            log.info(`[CCXT] Fetching BloFin funding fee history via direct API...`)
            const symbols = [...new Set(pnlTrades.map(t => t.symbol))]

            for (const symbol of symbols) {
              try {
                // Convert symbol format: "BNB/USDT:USDT" -> "BNB-USDT"
                const instId = symbol.split('/')[0] + '-' + symbol.split(':')[0].split('/')[1]

                // Fetch funding fee bills from BloFin API using low-level request
                // Use the signedRequest or request method directly
                const path = `/api/v1/account/bills`
                const params = {
                  instType: 'SWAP',
                  billType: '1', // 1 = funding fee
                  instId: instId,
                  limit: '100'
                }

                const fundingResponse = await (exchange as any).request(
                  path,
                  'private',
                  'GET',
                  params
                )

                if (fundingResponse && fundingResponse.data && Array.isArray(fundingResponse.data)) {
                  const totalFunding = fundingResponse.data.reduce((sum: number, bill: any) => {
                    // billPnl is the funding fee (negative = paid, positive = received)
                    return sum + parseFloat(bill.billPnl || '0')
                  }, 0)

                  if (totalFunding !== 0) {
                    fundingFees.set(symbol, totalFunding)
                    log.info(`[CCXT] ${symbol} total funding: ${totalFunding.toFixed(6)} USDT (${fundingResponse.data.length} records)`)
                  }
                } else {
                  log.debug(`[CCXT] No funding data for ${symbol}`)
                }
              } catch (fundingError: any) {
                log.debug(`[CCXT] Could not fetch funding for ${symbol}: ${fundingError.message}`)
              }
            }
          } catch (error: any) {
            log.warn(`[CCXT] BloFin funding fee fetch failed: ${error.message}`)
          }
        } else if (exchange.has['fetchFundingHistory']) {
          // Fallback to CCXT for other exchanges
          try {
            log.info(`[CCXT] Fetching funding fee history...`)
            const symbols = [...new Set(pnlTrades.map(t => t.symbol))]

            for (const symbol of symbols.slice(0, 10)) { // Limit to avoid rate limits
              try {
                const fundingHistory = await exchange.fetchFundingHistory(symbol, undefined, 100)
                const totalFunding = fundingHistory.reduce((sum: number, f: any) => sum + (f.amount || 0), 0)

                if (totalFunding !== 0) {
                  fundingFees.set(symbol, totalFunding)
                  log.info(`[CCXT] ${symbol} total funding: ${totalFunding.toFixed(4)} USDT`)
                }
              } catch (fundingError) {
                log.debug(`[CCXT] Could not fetch funding for ${symbol}:`, fundingError)
              }
            }
          } catch (error) {
            log.warn(`[CCXT] Funding fee fetch failed:`, error)
          }
        }

        // Fetch orders for linking (optional but improves accuracy)
        let orders: any[] = []
        try {
          log.info(`[CCXT] Fetching orders for position linking...`)
          const symbols = [...new Set(pnlTrades.map(t => t.symbol))]
          for (const symbol of symbols.slice(0, 10)) {
            try {
              const symbolOrders = await exchange.fetchOrders(symbol, undefined, 100)
              orders.push(...symbolOrders)
            } catch (orderError) {
              log.debug(`[CCXT] Could not fetch orders for ${symbol}:`, orderError)
            }
          }
          log.info(`[CCXT] Fetched ${orders.length} orders for linking`)
        } catch (error) {
          log.warn(`[CCXT] Order fetch failed:`, error)
        }

        // Fetch current positions for comparison
        let exchangePositions: PnLPosition[] = []
        try {
          const positions = await exchange.fetchPositions()
          exchangePositions = positions.map((p: any) => ({
            symbol: p.symbol,
            side: p.side || p.info?.posSide?.toLowerCase() || 'both',
            contracts: p.contracts || parseFloat(p.info?.pos || '0'),
            entryPrice: p.entryPrice || parseFloat(p.info?.avgPx || '0'),
            markPrice: p.markPrice || parseFloat(p.info?.markPx || '0'),
            unrealizedPnl: p.unrealizedPnl || parseFloat(p.info?.upl || '0'),
            realizedPnl: p.info?.realisedPnl ? parseFloat(p.info.realisedPnl) : undefined,
            info: p.info,
          }))

          log.info(`[CCXT] Fetched ${exchangePositions.length} current positions for comparison`)
        } catch (posError) {
          log.warn(`[CCXT] Could not fetch positions for comparison:`, posError)
        }

        // Calculate realized PnL using hedge-mode aware calculator with position/order linking
        const calculatedPnL = calculateRealizedPnL(pnlTrades, orders, exchangePositions, fundingFees)

        log.info(`[CCXT] ✅ Calculated ${calculatedPnL.length} realized PnL positions with hedge mode support`)

        // Log comparison table
        if (calculatedPnL.length > 0) {
          logPnLComparison(calculatedPnL, exchangePositions)
        }

        // Convert calculated PnL to UnifiedClosedPnL format
        const closedPnL: UnifiedClosedPnL[] = calculatedPnL.map(pnl => ({
          symbol: pnl.symbol,
          orderId: `${pnl.symbol}-${pnl.closeTime}`,
          side: pnl.positionSide === 'LONG' ? 'Sell' : 'Buy', // Close side is opposite of position side
          qty: pnl.quantity.toString(),
          orderPrice: pnl.exitPrice.toString(),
          orderType: 'Market' as 'Market' | 'Limit',
          execType: 'Trade',
          closedSize: pnl.quantity.toString(),
          cumEntryValue: (pnl.quantity * pnl.entryPrice).toString(),
          avgEntryPrice: pnl.entryPrice.toString(),
          cumExitValue: (pnl.quantity * pnl.exitPrice).toString(),
          avgExitPrice: pnl.exitPrice.toString(),
          closedPnl: pnl.realizedPnl.toString(),
          fillCount: '1',
          leverage: '1',
          createdTime: pnl.openTime.toString(),
          updatedTime: pnl.closeTime.toString(),
          exchange: account.exchange,
        }))

        log.info(`[CCXT] ✅ BloFin P&L calculation complete: ${closedPnL.length} closed positions`)
        return closedPnL
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
