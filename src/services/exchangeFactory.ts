import { ExchangeAccount, ExchangeType, ExchangeAPI, UnifiedAccountData } from '../types/exchanges'
import { ccxtAdapter } from './ccxtAdapter'
import { isSupportedExchange } from '../constants/exchanges'

class ExchangeFactory {
  private getAPI(exchange: ExchangeType): ExchangeAPI {
    // Use CCXT adapter for all exchanges
    return ccxtAdapter
  }

  async fetchAccountData(account: ExchangeAccount): Promise<UnifiedAccountData> {
    const api = this.getAPI(account.exchange)
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