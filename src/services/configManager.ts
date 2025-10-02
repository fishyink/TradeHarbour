import CryptoJS from 'crypto-js'
import type { EquitySnapshot } from '../store/useAppStore'
import type { ExchangeAccount, ExchangeType } from '../types/exchanges'
import { dataManager } from './dataManager'

const ENCRYPTION_KEY = 'trade-harbour-encryption-key-2024'

export interface BybitAccount {
  id: string
  name: string
  apiKey: string
  apiSecret: string
  isTestnet: boolean
  createdAt: number
}

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

export interface AppSettings {
  theme: 'light' | 'dark'
  autoRefresh: boolean
  refreshInterval: number
  debugMode: boolean
  apiRefreshSchedule: 'daily' | 'weekly' | 'custom'
  customRefreshInterval: number // in hours
  favoriteExchanges: string[] // User's favorited exchanges
  betaExchangeWarningShown: boolean // Whether user has seen beta warning
}

class ConfigManager {
  private encrypt(text: string): string {
    return CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString()
  }

  private decrypt(encryptedText: string): string {
    const bytes = CryptoJS.AES.decrypt(encryptedText, ENCRYPTION_KEY)
    return bytes.toString(CryptoJS.enc.Utf8)
  }

  // Get paths for organized storage
  private async getConfigPaths() {
    const dataDir = await window.electronAPI.app.getUserDataPath()
    return {
      accounts: `${dataDir}/accounts/accounts.json`,
      settings: `${dataDir}/accounts/settings.json`,
      // Legacy paths for migration
      legacyConfig: `${dataDir}/trade-harbour-config.json`,
      legacyBybitConfig: `${dataDir}/bybit-dashboard-config.json`
    }
  }

  // Ensure accounts directory exists
  private async ensureAccountsDirectory() {
    const dataDir = await window.electronAPI.app.getUserDataPath()
    const accountsDir = `${dataDir}/accounts`
    await window.electronAPI.fileSystem.createDirectory(accountsDir)
  }

  // Migration: Move data from old locations to new organized structure
  private async migrateOldConfig(): Promise<void> {
    const paths = await this.getConfigPaths()

    try {
      // Check for old bybit-dashboard-config.json
      let legacyData = null
      const oldBybitConfig = await window.electronAPI.fileSystem.readFile(paths.legacyBybitConfig)
      if (oldBybitConfig) {
        console.log('📦 Migrating from bybit-dashboard-config.json')
        legacyData = JSON.parse(oldBybitConfig)
      }

      // Check for trade-harbour-config.json
      const oldConfig = await window.electronAPI.fileSystem.readFile(paths.legacyConfig)
      if (oldConfig) {
        console.log('📦 Migrating from trade-harbour-config.json')
        legacyData = JSON.parse(oldConfig)
      }

      if (!legacyData) return

      // Migrate accounts
      if (legacyData.exchangeAccounts) {
        console.log(`🔄 Migrating ${legacyData.exchangeAccounts.length} exchange accounts`)
        await this.saveExchangeAccounts(legacyData.exchangeAccounts)
      } else if (legacyData.accounts) {
        console.log(`🔄 Migrating ${legacyData.accounts.length} legacy bybit accounts`)
        const exchangeAccounts = legacyData.accounts.map(convertToExchangeAccount)
        await this.saveExchangeAccounts(exchangeAccounts)
      }

      // Migrate settings
      if (legacyData.settings) {
        console.log('⚙️ Migrating settings')
        await this.saveSettings(legacyData.settings)
      }

      // Clean up old files after successful migration
      await window.electronAPI.fileSystem.deleteFile(paths.legacyBybitConfig)
      await window.electronAPI.fileSystem.deleteFile(paths.legacyConfig)

      console.log('✅ Configuration migration completed')

    } catch (error) {
      console.warn('Migration failed, starting fresh:', error)
    }
  }

  // Exchange Accounts Management
  async getExchangeAccounts(): Promise<ExchangeAccount[]> {
    try {
      await this.ensureAccountsDirectory()
      await this.migrateOldConfig()

      const paths = await this.getConfigPaths()
      const data = await window.electronAPI.fileSystem.readFile(paths.accounts)

      if (!data) return []

      const decryptedData = this.decrypt(data)
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

      await this.saveExchangeAccounts(accounts)
    } catch (error) {
      console.error('Error saving exchange account:', error)
      throw error
    }
  }

  async saveExchangeAccounts(accounts: ExchangeAccount[]): Promise<void> {
    try {
      await this.ensureAccountsDirectory()
      const paths = await this.getConfigPaths()

      const encryptedData = this.encrypt(JSON.stringify(accounts, null, 2))
      await window.electronAPI.fileSystem.writeFile(paths.accounts, encryptedData)
    } catch (error) {
      console.error('Error saving exchange accounts:', error)
      throw error
    }
  }

  async deleteExchangeAccount(accountId: string): Promise<void> {
    try {
      const accounts = await this.getExchangeAccounts()
      const filteredAccounts = accounts.filter(acc => acc.id !== accountId)
      await this.saveExchangeAccounts(filteredAccounts)

      // Also clear the account's trading data
      await dataManager.clearAccountData(accountId)
    } catch (error) {
      console.error('Error deleting exchange account:', error)
      throw error
    }
  }

  // Settings Management
  async getSettings(): Promise<AppSettings> {
    try {
      await this.ensureAccountsDirectory()
      const paths = await this.getConfigPaths()
      const data = await window.electronAPI.fileSystem.readFile(paths.settings)

      if (!data) {
        return {
          theme: 'dark',
          autoRefresh: true,
          refreshInterval: 21600000, // 6 hours
          debugMode: false,
          apiRefreshSchedule: 'daily',
          customRefreshInterval: 24, // 24 hours
          favoriteExchanges: [],
          betaExchangeWarningShown: false,
        }
      }

      const settings = JSON.parse(data)
      // Ensure new fields exist for backwards compatibility
      return {
        ...settings,
        favoriteExchanges: settings.favoriteExchanges || [],
        betaExchangeWarningShown: settings.betaExchangeWarningShown || false,
      }
    } catch (error) {
      console.error('Error getting settings:', error)
      return {
        theme: 'dark',
        autoRefresh: true,
        refreshInterval: 21600000, // 6 hours
        debugMode: false,
        apiRefreshSchedule: 'daily',
        customRefreshInterval: 24, // 24 hours
        favoriteExchanges: [],
        betaExchangeWarningShown: false,
      }
    }
  }

  async saveSettings(settings: Partial<AppSettings>): Promise<void> {
    try {
      await this.ensureAccountsDirectory()
      const currentSettings = await this.getSettings()
      const newSettings = { ...currentSettings, ...settings }

      const paths = await this.getConfigPaths()
      await window.electronAPI.fileSystem.writeFile(
        paths.settings,
        JSON.stringify(newSettings, null, 2)
      )
    } catch (error) {
      console.error('Error saving settings:', error)
      throw error
    }
  }

  // Equity History (now delegated to dataManager)
  async getEquityHistoryForAccount(accountId: string, startDate?: Date, endDate?: Date): Promise<EquitySnapshot[]> {
    try {
      if (startDate && endDate) {
        // Get equity data for specific date range
        const start = startDate || new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000) // Default 6 months
        const end = endDate || new Date()

        // Get all months in the range
        const startMonth = this.getMonthKey(start.getTime())
        const endMonth = this.getMonthKey(end.getTime())
        const months = this.getMonthsBetween(startMonth, endMonth)

        let allEquity: EquitySnapshot[] = []
        for (const month of months) {
          const monthlyEquity = await dataManager.getMonthlyEquity(accountId, month)
          // Filter by exact date range
          const filteredEquity = monthlyEquity.filter(snapshot => {
            const snapshotDate = new Date(snapshot.timestamp)
            return snapshotDate >= start && snapshotDate <= end
          })
          allEquity = [...allEquity, ...filteredEquity]
        }

        // Sort by timestamp
        return allEquity.sort((a, b) => b.timestamp - a.timestamp)
      } else {
        // Get last 6 months of equity data
        const sixMonthsAgo = new Date()
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
        return this.getEquityHistoryForAccount(accountId, sixMonthsAgo, new Date())
      }
    } catch (error) {
      console.error('Error getting equity history for account:', error)
      return []
    }
  }

  async saveEquityHistoryForAccount(accountId: string, equitySnapshots: EquitySnapshot[]): Promise<void> {
    try {
      // Group snapshots by month and save
      const snapshotsByMonth = new Map<string, EquitySnapshot[]>()

      for (const snapshot of equitySnapshots) {
        const month = this.getMonthKey(snapshot.timestamp)
        if (!snapshotsByMonth.has(month)) {
          snapshotsByMonth.set(month, [])
        }
        snapshotsByMonth.get(month)!.push(snapshot)
      }

      // Save each month's data
      for (const [month, monthSnapshots] of snapshotsByMonth) {
        // Get existing snapshots for this month
        const existingSnapshots = await dataManager.getMonthlyEquity(accountId, month)

        // Merge and deduplicate (by timestamp)
        const mergedSnapshots = this.mergeAndDeduplicateEquity(existingSnapshots, monthSnapshots)

        // Save back to partitioned storage
        await dataManager.saveMonthlyEquity(accountId, month, mergedSnapshots)
      }
    } catch (error) {
      console.error('Error saving equity history for account:', error)
      throw error
    }
  }

  async addEquitySnapshot(accountId: string, snapshot: EquitySnapshot): Promise<void> {
    await this.saveEquityHistoryForAccount(accountId, [snapshot])
  }

  // Helper methods
  private getMonthKey(timestamp: number): string {
    const date = new Date(timestamp)
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`
  }

  private getMonthsBetween(startMonth: string, endMonth: string): string[] {
    const months: string[] = []
    const start = new Date(startMonth + '-01')
    const end = new Date(endMonth + '-01')

    const current = new Date(start)
    while (current <= end) {
      months.push(this.getMonthKey(current.getTime()))
      current.setMonth(current.getMonth() + 1)
    }

    return months
  }

  private mergeAndDeduplicateEquity(existing: EquitySnapshot[], newData: EquitySnapshot[]): EquitySnapshot[] {
    const dataMap = new Map<number, EquitySnapshot>()

    // Add existing data (using timestamp as key)
    existing.forEach(item => {
      dataMap.set(item.timestamp, item)
    })

    // Add new data (will overwrite duplicates with same timestamp)
    newData.forEach(item => {
      dataMap.set(item.timestamp, item)
    })

    // Convert back to array and sort by timestamp (newest first)
    return Array.from(dataMap.values())
      .sort((a, b) => b.timestamp - a.timestamp)
  }

  // Legacy methods for backwards compatibility
  async getAccounts(): Promise<BybitAccount[]> {
    const exchangeAccounts = await this.getExchangeAccounts()
    return exchangeAccounts.filter(acc => acc.exchange === 'bybit').map(convertToBybitAccount)
  }

  async saveAccount(account: BybitAccount): Promise<void> {
    const exchangeAccount = convertToExchangeAccount(account)
    await this.saveExchangeAccount(exchangeAccount)
  }

  async deleteAccount(accountId: string): Promise<void> {
    await this.deleteExchangeAccount(accountId)
  }

  // Clear all data
  async clearAllData(): Promise<void> {
    try {
      const paths = await this.getConfigPaths()
      await window.electronAPI.fileSystem.deleteFile(paths.accounts)
      await window.electronAPI.fileSystem.deleteFile(paths.settings)
      console.log('All configuration data cleared')
    } catch (error) {
      console.error('Error clearing data:', error)
      throw error
    }
  }

  // Get storage statistics
  async getStorageStats(): Promise<{
    accountsFile: string
    settingsFile: string
    totalAccounts: number
  }> {
    const accounts = await this.getExchangeAccounts()
    return {
      accountsFile: 'data/accounts/accounts.json',
      settingsFile: 'data/accounts/settings.json',
      totalAccounts: accounts.length
    }
  }
}

export const configManager = new ConfigManager()

// Export for backwards compatibility
export const storageService = configManager