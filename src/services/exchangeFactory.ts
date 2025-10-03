import { ExchangeAccount, ExchangeType, ExchangeAPI, UnifiedAccountData } from '../types/exchanges'
import { ccxtAdapter } from './ccxtAdapter'
import { isSupportedExchange } from '../constants/exchanges'

class ExchangeFactory {
  private getAPI(exchange: ExchangeType): ExchangeAPI {
    // Use CCXT adapter for all exchanges
    return ccxtAdapter
  }

  async fetchAccountData(account: ExchangeAccount, includeHistory: boolean = false): Promise<UnifiedAccountData> {
    const api = this.getAPI(account.exchange)
    return api.fetchAccountData(account, includeHistory)
  }

  async fetchAllAccountsData(accounts: ExchangeAccount[], includeHistory: boolean = false): Promise<UnifiedAccountData[]> {
    if (accounts.length === 0) return []

    // Fast path: Fetch all accounts in parallel for initial load (no delays needed)
    if (!includeHistory) {
      return Promise.all(
        accounts.map(async (account) => {
          try {
            return await this.fetchAccountData(account, false)
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
              error: error instanceof Error ? error.message : 'Request failed',
            }
          }
        })
      )
    }

    // Slow path: Fetch accounts sequentially with delays to avoid rate limiting
    const results: UnifiedAccountData[] = []

    for (let i = 0; i < accounts.length; i++) {
      const account = accounts[i]

      try {
        const data = await this.fetchAccountData(account, true)
        results.push(data)
      } catch (error) {
        results.push({
          id: account.id,
          name: account.name,
          exchange: account.exchange,
          balance: null,
          positions: [],
          trades: [],
          closedPnL: [],
          lastUpdated: Date.now(),
          error: error instanceof Error ? error.message : 'Request failed',
        })
      }

      // Add delay between accounts (except after last account)
      if (i < accounts.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }

    return results
  }

  getSupportedExchanges(): ExchangeType[] {
    // This will be populated by components using async call
    // For now, return empty array - components should use async getSupportedExchangesAsync
    return []
  }

  async getSupportedExchangesAsync(): Promise<ExchangeType[]> {
    // Get exchanges from main process via IPC
    return await window.electronAPI.ccxt.getSupportedExchanges()
  }

  getExchangeDisplayName(exchange: ExchangeType): string {
    // Capitalize first letter of exchange name
    return exchange.charAt(0).toUpperCase() + exchange.slice(1)
  }

  isExchangeSupported(exchange: ExchangeType): boolean {
    return isSupportedExchange(exchange)
  }

  validateAccountCredentials(account: ExchangeAccount): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!account.apiKey || account.apiKey.trim().length === 0) {
      errors.push('API Key is required')
    }

    if (!account.apiSecret || account.apiSecret.trim().length === 0) {
      errors.push('API Secret is required')
    }

    // Basic validation - exchange existence check done in main process
    if (!account.exchange || account.exchange.trim().length === 0) {
      errors.push('Exchange is required')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }
}

export const exchangeFactory = new ExchangeFactory()