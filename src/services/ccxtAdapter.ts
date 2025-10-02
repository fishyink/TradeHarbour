import {
  ExchangeAccount,
  ExchangeAPI,
  UnifiedAccountInfo,
  UnifiedPosition,
  UnifiedTrade,
  UnifiedClosedPnL,
  UnifiedAccountData,
} from '../types/exchanges'

// Renderer-side CCXT adapter that communicates with main process via IPC
class CCXTAdapter implements ExchangeAPI {
  async getAccountBalance(account: ExchangeAccount): Promise<UnifiedAccountInfo> {
    return await window.electronAPI.ccxt.fetchAccountBalance(account)
  }

  async getPositions(account: ExchangeAccount): Promise<UnifiedPosition[]> {
    return await window.electronAPI.ccxt.fetchPositions(account)
  }

  async getTrades(account: ExchangeAccount, limit: number = 50): Promise<UnifiedTrade[]> {
    return await window.electronAPI.ccxt.fetchTrades(account, limit)
  }

  async getClosedPnL(account: ExchangeAccount, limit: number = 50): Promise<UnifiedClosedPnL[]> {
    return await window.electronAPI.ccxt.fetchClosedPnL(account, limit)
  }

  async fetchAccountData(account: ExchangeAccount): Promise<UnifiedAccountData> {
    return await window.electronAPI.ccxt.fetchAccountData(account)
  }
}

export const ccxtAdapter = new CCXTAdapter()
