import crypto from 'crypto-js'
import { dataManager } from './dataManager'
import { BybitClosedPnL, BybitTrade } from '../types/bybit'
import type { EquitySnapshot } from '../store/useAppStore'

// Legacy cache structure (from historicalDataService.ts)
interface LegacyHistoricalDataCache {
  accountId: string
  closedPnL: BybitClosedPnL[]
  trades: BybitTrade[]
  lastUpdated: number
  dataRange: {
    startDate: string
    endDate: string
    totalDays: number
    chunksRetrieved: number
  }
  isComplete: boolean
}

// Legacy equity history structure (from storage.ts)
interface LegacyEquityHistory {
  [accountId: string]: EquitySnapshot[]
}

export class DataMigration {
  private readonly LEGACY_HISTORICAL_KEY = 'bybit_historical_cache'
  private readonly LEGACY_EQUITY_KEY = 'equityHistory'
  private readonly LEGACY_ENCRYPTION_KEY = 'bybit_dashboard_encryption_key_v1'
  private readonly MIGRATION_FLAG_KEY = 'data_migration_v1_complete'

  // Check if migration is needed
  async needsMigration(): Promise<boolean> {
    try {
      // Check if migration has already been completed
      const migrationComplete = await window.electronAPI.store.get(this.MIGRATION_FLAG_KEY)
      if (migrationComplete) {
        return false
      }

      // Check if legacy data exists
      const hasLegacyHistorical = await window.electronAPI.store.get(this.LEGACY_HISTORICAL_KEY)
      const hasLegacyEquity = await window.electronAPI.store.get(this.LEGACY_EQUITY_KEY)

      return !!(hasLegacyHistorical || hasLegacyEquity)
    } catch (error) {
      console.error('Error checking migration status:', error)
      return false
    }
  }

  // Decrypt legacy data
  private decryptLegacyData(encryptedData: string): any {
    try {
      const decrypted = crypto.AES.decrypt(encryptedData, this.LEGACY_ENCRYPTION_KEY)
      const jsonStr = decrypted.toString(crypto.enc.Utf8)
      return JSON.parse(jsonStr)
    } catch (error) {
      console.warn('Failed to decrypt legacy data:', error)
      return null
    }
  }

  // Get month key from timestamp
  private getMonthKey(timestamp: number): string {
    const date = new Date(timestamp)
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`
  }

  // Migrate historical data (trades and P&L)
  async migrateHistoricalData(): Promise<{ migratedAccounts: number; totalRecords: number }> {
    console.log('🔄 Starting historical data migration...')

    let migratedAccounts = 0
    let totalRecords = 0

    try {
      const encryptedCache = await window.electronAPI.store.get(this.LEGACY_HISTORICAL_KEY)
      if (!encryptedCache) {
        console.log('No legacy historical data found')
        return { migratedAccounts: 0, totalRecords: 0 }
      }

      const legacyCache = this.decryptLegacyData(encryptedCache) as Record<string, LegacyHistoricalDataCache>
      if (!legacyCache) {
        console.warn('Failed to decrypt legacy historical data')
        return { migratedAccounts: 0, totalRecords: 0 }
      }

      console.log(`Found legacy data for ${Object.keys(legacyCache).length} accounts`)

      for (const [accountId, accountData] of Object.entries(legacyCache)) {
        console.log(`Migrating account ${accountId}...`)

        // Migrate trades
        if (accountData.trades && accountData.trades.length > 0) {
          console.log(`  - Migrating ${accountData.trades.length} trades`)
          await dataManager.addTrades(accountId, accountData.trades)
          totalRecords += accountData.trades.length
        }

        // Migrate P&L
        if (accountData.closedPnL && accountData.closedPnL.length > 0) {
          console.log(`  - Migrating ${accountData.closedPnL.length} P&L records`)
          await dataManager.addPnL(accountId, accountData.closedPnL)
          totalRecords += accountData.closedPnL.length
        }

        // Update metadata to reflect the migrated data range
        const metadata = await dataManager.getAccountMetadata(accountId)
        if (accountData.dataRange) {
          metadata.dataRange.startMonth = this.getMonthKey(new Date(accountData.dataRange.startDate).getTime())
          metadata.dataRange.endMonth = this.getMonthKey(new Date(accountData.dataRange.endDate).getTime())
        }
        await dataManager.updateAccountMetadata(accountId, metadata)

        migratedAccounts++
        console.log(`✅ Account ${accountId} migration complete`)
      }

      console.log(`🎉 Historical data migration complete: ${migratedAccounts} accounts, ${totalRecords} records`)
      return { migratedAccounts, totalRecords }

    } catch (error) {
      console.error('Error during historical data migration:', error)
      throw new Error(`Historical data migration failed: ${error}`)
    }
  }

  // Migrate equity history
  async migrateEquityHistory(): Promise<{ migratedAccounts: number; totalSnapshots: number }> {
    console.log('📊 Starting equity history migration...')

    let migratedAccounts = 0
    let totalSnapshots = 0

    try {
      const legacyEquityData = await window.electronAPI.store.get(this.LEGACY_EQUITY_KEY)
      if (!legacyEquityData) {
        console.log('No legacy equity data found')
        return { migratedAccounts: 0, totalSnapshots: 0 }
      }

      const equityHistory = legacyEquityData as LegacyEquityHistory
      console.log(`Found legacy equity data for ${Object.keys(equityHistory).length} accounts`)

      for (const [accountId, snapshots] of Object.entries(equityHistory)) {
        if (!snapshots || snapshots.length === 0) continue

        console.log(`Migrating ${snapshots.length} equity snapshots for account ${accountId}`)

        // Group snapshots by month
        const snapshotsByMonth = new Map<string, EquitySnapshot[]>()

        for (const snapshot of snapshots) {
          const month = this.getMonthKey(snapshot.timestamp)
          if (!snapshotsByMonth.has(month)) {
            snapshotsByMonth.set(month, [])
          }
          snapshotsByMonth.get(month)!.push(snapshot)
        }

        // Save each month's equity data
        for (const [month, monthSnapshots] of snapshotsByMonth) {
          await dataManager.saveMonthlyEquity(accountId, month, monthSnapshots)
        }

        totalSnapshots += snapshots.length
        migratedAccounts++
        console.log(`✅ Account ${accountId} equity migration complete`)
      }

      console.log(`🎉 Equity history migration complete: ${migratedAccounts} accounts, ${totalSnapshots} snapshots`)
      return { migratedAccounts, totalSnapshots }

    } catch (error) {
      console.error('Error during equity history migration:', error)
      throw new Error(`Equity history migration failed: ${error}`)
    }
  }

  // Create backup of legacy data before migration
  async createLegacyBackup(): Promise<string> {
    const backupData = {
      timestamp: Date.now(),
      version: '1.5.2',
      historicalData: await window.electronAPI.store.get(this.LEGACY_HISTORICAL_KEY),
      equityData: await window.electronAPI.store.get(this.LEGACY_EQUITY_KEY)
    }

    const backupJson = JSON.stringify(backupData, null, 2)
    const dataDir = await window.electronAPI.app.getUserDataPath()
    const backupPath = `${dataDir}/legacy-data-backup-${Date.now()}.json`

    await window.electronAPI.fileSystem.writeFile(backupPath, backupJson)
    console.log(`📦 Legacy data backup created: ${backupPath}`)

    return backupPath
  }

  // Clean up legacy data after successful migration
  async cleanupLegacyData(): Promise<void> {
    console.log('🧹 Cleaning up legacy data...')

    try {
      await window.electronAPI.store.delete(this.LEGACY_HISTORICAL_KEY)
      await window.electronAPI.store.delete(this.LEGACY_EQUITY_KEY)
      console.log('✅ Legacy data cleanup complete')
    } catch (error) {
      console.warn('Warning: Failed to cleanup legacy data:', error)
    }
  }

  // Mark migration as complete
  async markMigrationComplete(): Promise<void> {
    await window.electronAPI.store.set(this.MIGRATION_FLAG_KEY, {
      completed: true,
      timestamp: Date.now(),
      version: '1.5.3'
    })
  }

  // Full migration process
  async performFullMigration(): Promise<{
    success: boolean
    backupPath?: string
    results: {
      historical: { migratedAccounts: number; totalRecords: number }
      equity: { migratedAccounts: number; totalSnapshots: number }
    }
    error?: string
  }> {
    console.log('🚀 Starting full data migration to scalable file structure...')

    try {
      // Step 1: Check if migration is needed
      const migrationNeeded = await this.needsMigration()
      if (!migrationNeeded) {
        console.log('✅ Migration not needed or already completed')
        return {
          success: true,
          results: {
            historical: { migratedAccounts: 0, totalRecords: 0 },
            equity: { migratedAccounts: 0, totalSnapshots: 0 }
          }
        }
      }

      // Step 2: Create backup
      const backupPath = await this.createLegacyBackup()

      // Step 3: Migrate historical data
      const historicalResults = await this.migrateHistoricalData()

      // Step 4: Migrate equity history
      const equityResults = await this.migrateEquityHistory()

      // Step 5: Mark migration as complete
      await this.markMigrationComplete()

      // Step 6: Clean up legacy data
      await this.cleanupLegacyData()

      console.log('🎉 Full migration completed successfully!')

      return {
        success: true,
        backupPath,
        results: {
          historical: historicalResults,
          equity: equityResults
        }
      }

    } catch (error) {
      console.error('❌ Migration failed:', error)
      return {
        success: false,
        results: {
          historical: { migratedAccounts: 0, totalRecords: 0 },
          equity: { migratedAccounts: 0, totalSnapshots: 0 }
        },
        error: error instanceof Error ? error.message : 'Unknown migration error'
      }
    }
  }

  // Get migration status for UI
  async getMigrationStatus(): Promise<{
    needsMigration: boolean
    isComplete: boolean
    legacyDataExists: boolean
    estimatedRecords: number
  }> {
    try {
      const needsMigration = await this.needsMigration()
      const migrationComplete = await window.electronAPI.store.get(this.MIGRATION_FLAG_KEY)

      let estimatedRecords = 0
      let legacyDataExists = false

      // Count legacy records
      const legacyHistorical = await window.electronAPI.store.get(this.LEGACY_HISTORICAL_KEY)
      const legacyEquity = await window.electronAPI.store.get(this.LEGACY_EQUITY_KEY)

      if (legacyHistorical) {
        legacyDataExists = true
        const cache = this.decryptLegacyData(legacyHistorical) as Record<string, LegacyHistoricalDataCache>
        if (cache) {
          Object.values(cache).forEach(accountData => {
            estimatedRecords += (accountData.trades?.length || 0) + (accountData.closedPnL?.length || 0)
          })
        }
      }

      if (legacyEquity) {
        legacyDataExists = true
        const equityData = legacyEquity as LegacyEquityHistory
        Object.values(equityData).forEach(snapshots => {
          estimatedRecords += snapshots?.length || 0
        })
      }

      return {
        needsMigration,
        isComplete: !!migrationComplete,
        legacyDataExists,
        estimatedRecords
      }

    } catch (error) {
      console.error('Error getting migration status:', error)
      return {
        needsMigration: false,
        isComplete: false,
        legacyDataExists: false,
        estimatedRecords: 0
      }
    }
  }
}

export const dataMigration = new DataMigration()