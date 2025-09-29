import CryptoJS from 'crypto-js'
import type { EquitySnapshot } from '../store/useAppStore'
import type { ExchangeAccount, ExchangeType } from '../types/exchanges'

const ENCRYPTION_KEY = 'bybit-dashboard-encryption-key-2024'

export interface BybitAccount {
  id: string
  name: string
  apiKey: string
  apiSecret: string
  isTestnet: boolean
  createdAt: number
}

// Legacy support for existing accounts
export function convertToExchangeAccount(account: BybitAccount): ExchangeAccount {
  return {
    ...account,
    exchange: 'bybit' as ExchangeType
  }
}

export function convertToBybitAccount(account: ExchangeAccount): BybitAccount {
  return {
    id: account.id,
    name: account.name,
    apiKey: account.apiKey,
    apiSecret: account.apiSecret,
    isTestnet: account.isTestnet,
    createdAt: account.createdAt
  }
}

export type StorageMode = 'portable' | 'system'

export interface AppSettings {
  theme: 'light' | 'dark'
  autoRefresh: boolean
  refreshInterval: number
  storageMode: StorageMode
}

class StorageService {
  private encrypt(text: string): string {
    return CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString()
  }

  private decrypt(encryptedText: string): string {
    const bytes = CryptoJS.AES.decrypt(encryptedText, ENCRYPTION_KEY)
    return bytes.toString(CryptoJS.enc.Utf8)
  }

  async getAccounts(): Promise<BybitAccount[]> {
    try {
      const encryptedData = await window.electronAPI.store.get('accounts')
      if (!encryptedData) return []

      const decryptedData = this.decrypt(encryptedData)
      return JSON.parse(decryptedData)
    } catch (error) {
      console.error('Error getting accounts:', error)
      // Return empty array on any error to prevent crashes
      return []
    }
  }

  async saveAccount(account: BybitAccount): Promise<void> {
    try {
      const accounts = await this.getAccounts()
      const existingIndex = accounts.findIndex(acc => acc.id === account.id)

      if (existingIndex >= 0) {
        accounts[existingIndex] = account
      } else {
        accounts.push(account)
      }

      const encryptedData = this.encrypt(JSON.stringify(accounts))
      await window.electronAPI.store.set('accounts', encryptedData)
    } catch (error) {
      console.error('Error saving account:', error)
      // Show user-friendly error message instead of crashing
      throw new Error('Failed to save account. Please check if the application has write permissions.')
    }
  }

  async deleteAccount(accountId: string): Promise<void> {
    try {
      const accounts = await this.getAccounts()
      const filteredAccounts = accounts.filter(acc => acc.id !== accountId)

      const encryptedData = this.encrypt(JSON.stringify(filteredAccounts))
      await window.electronAPI.store.set('accounts', encryptedData)
    } catch (error) {
      console.error('Error deleting account:', error)
      throw error
    }
  }

  async getSettings(): Promise<AppSettings> {
    try {
      const settings = await window.electronAPI.store.get('settings')
      return {
        theme: 'dark',
        autoRefresh: true,
        refreshInterval: 21600000, // 6 hours
        storageMode: 'system', // Default to system mode
        ...settings,
      }
    } catch (error) {
      console.error('Error getting settings:', error)
      return {
        theme: 'dark',
        autoRefresh: true,
        refreshInterval: 21600000, // 6 hours
        storageMode: 'system', // Default to system mode
      }
    }
  }

  async saveSettings(settings: Partial<AppSettings>): Promise<void> {
    try {
      const currentSettings = await this.getSettings()
      const newSettings = { ...currentSettings, ...settings }
      await window.electronAPI.store.set('settings', newSettings)
    } catch (error) {
      console.error('Error saving settings:', error)
      throw error
    }
  }

  async getEquityHistory(): Promise<EquitySnapshot[]> {
    try {
      const data = await window.electronAPI.store.get('equityHistory')
      return data || []
    } catch (error) {
      console.error('Error getting equity history:', error)
      return []
    }
  }

  async saveEquityHistory(equityHistory: EquitySnapshot[]): Promise<void> {
    try {
      await window.electronAPI.store.set('equityHistory', equityHistory)
    } catch (error) {
      console.error('Error saving equity history:', error)
      throw error
    }
  }

  async clearAllData(): Promise<void> {
    try {
      await window.electronAPI.store.clear()
    } catch (error) {
      console.error('Error clearing data:', error)
      throw error
    }
  }

  // New methods for ExchangeAccount support
  async getExchangeAccounts(): Promise<ExchangeAccount[]> {
    try {
      const encryptedData = await window.electronAPI.store.get('exchangeAccounts')
      if (!encryptedData) {
        // Try to migrate from old accounts format
        const oldAccounts = await this.getAccounts()
        if (oldAccounts.length > 0) {
          const exchangeAccounts = oldAccounts.map(convertToExchangeAccount)
          await this.saveExchangeAccounts(exchangeAccounts)
          return exchangeAccounts
        }
        return []
      }

      const decryptedData = this.decrypt(encryptedData)
      return JSON.parse(decryptedData)
    } catch (error) {
      console.error('Error getting exchange accounts:', error)
      return []
    }
  }

  async saveExchangeAccount(account: ExchangeAccount): Promise<void> {
    try {
      const accounts = await this.getExchangeAccounts()
      const existingIndex = accounts.findIndex(acc => acc.id === account.id)

      if (existingIndex >= 0) {
        accounts[existingIndex] = account
      } else {
        accounts.push(account)
      }

      const encryptedData = this.encrypt(JSON.stringify(accounts))
      await window.electronAPI.store.set('exchangeAccounts', encryptedData)
    } catch (error) {
      console.error('Error saving exchange account:', error)
      throw error
    }
  }

  async saveExchangeAccounts(accounts: ExchangeAccount[]): Promise<void> {
    try {
      const encryptedData = this.encrypt(JSON.stringify(accounts))
      await window.electronAPI.store.set('exchangeAccounts', encryptedData)
    } catch (error) {
      console.error('Error saving exchange accounts:', error)
      throw error
    }
  }

  async deleteExchangeAccount(accountId: string): Promise<void> {
    try {
      const accounts = await this.getExchangeAccounts()
      const filteredAccounts = accounts.filter(acc => acc.id !== accountId)

      const encryptedData = this.encrypt(JSON.stringify(filteredAccounts))
      await window.electronAPI.store.set('exchangeAccounts', encryptedData)
    } catch (error) {
      console.error('Error deleting exchange account:', error)
      throw error
    }
  }
}

export const storageService = new StorageService()