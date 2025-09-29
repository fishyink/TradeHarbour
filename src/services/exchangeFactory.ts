import { ExchangeAccount, ExchangeType, ExchangeAPI, UnifiedAccountData } from '../types/exchanges'
import { bybitAPI } from './bybit'
import { convertToBybitAccount } from './configManager'

class ExchangeFactory {
  private getAPI(exchange: ExchangeType): ExchangeAPI {
    switch (exchange) {
      case 'bybit':
        return bybitAPI
      default:
        throw new Error(`Unsupported exchange: ${exchange}`)
    }
  }

  async fetchAccountData(account: ExchangeAccount): Promise<UnifiedAccountData> {
    const api = this.getAPI(account.exchange)

    // Special handling for Bybit to maintain backward compatibility
    if (account.exchange === 'bybit') {
      const bybitAccount = convertToBybitAccount(account)
      const bybitData = await bybitAPI.fetchAccountData(bybitAccount)

      // Convert Bybit-specific response to unified format
      return {
        id: bybitData.id,
        name: bybitData.name,
        exchange: 'bybit',
        balance: bybitData.balance ? {
          ...bybitData.balance,
          exchange: 'bybit'
        } : null,
        positions: bybitData.positions.map(pos => ({
          ...pos,
          exchange: 'bybit'
        })),
        trades: bybitData.trades.map(trade => ({
          symbol: trade.symbol,
          orderId: trade.orderId,
          side: trade.side,
          orderType: trade.orderType,
          execFee: trade.execFee,
          execId: trade.execId,
          execPrice: trade.execPrice,
          execQty: trade.execQty,
          execTime: trade.execTime,
          exchange: 'bybit',
          isMaker: trade.isMaker,
          feeRate: trade.feeRate
        })),
        closedPnL: bybitData.closedPnL.map(pnl => ({
          ...pnl,
          exchange: 'bybit'
        })),
        lastUpdated: bybitData.lastUpdated,
        error: bybitData.error
      }
    }

    return api.fetchAccountData(account)
  }

  async fetchAllAccountsData(accounts: ExchangeAccount[]): Promise<UnifiedAccountData[]> {
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
              exchange: accounts[index].exchange,
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

  getSupportedExchanges(): ExchangeType[] {
    return ['bybit']
  }

  getExchangeDisplayName(exchange: ExchangeType): string {
    switch (exchange) {
      case 'bybit':
        return 'Bybit'
      default:
        return exchange
    }
  }

  validateAccountCredentials(account: ExchangeAccount): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!account.apiKey || account.apiKey.trim().length === 0) {
      errors.push('API Key is required')
    }

    if (!account.apiSecret || account.apiSecret.trim().length === 0) {
      errors.push('API Secret is required')
    }

    // Exchange-specific validation - currently only Bybit is supported
    // No additional validation needed for Bybit

    return {
      valid: errors.length === 0,
      errors
    }
  }
}

export const exchangeFactory = new ExchangeFactory()