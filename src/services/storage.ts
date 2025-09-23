import CryptoJS from 'crypto-js'
import type { EquitySnapshot } from '../store/useAppStore'

const ENCRYPTION_KEY = 'bybit-dashboard-encryption-key-2024'

export interface BybitAccount {
  id: string
  name: string
  apiKey: string
  apiSecret: string
  isTestnet: boolean
  createdAt: number
}

export interface AppSettings {
  theme: 'light' | 'dark'
  autoRefresh: boolean
  refreshInterval: number
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
      throw error
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
        ...settings,
      }
    } catch (error) {
      console.error('Error getting settings:', error)
      return {
        theme: 'dark',
        autoRefresh: true,
        refreshInterval: 21600000, // 6 hours
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
}

export const storageService = new StorageService()