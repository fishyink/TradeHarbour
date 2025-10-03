import crypto from 'crypto-js'
import { BybitAccount } from './configManager'
import { BybitClosedPnL, BybitTrade } from '../types/bybit'
import type { EquitySnapshot } from '../store/useAppStore'

// Interfaces for partitioned data
interface DataMetadata {
  accountId: string
  createdAt: number
  lastUpdated: number
  dataVersion: string
  totalMonths: number
  dataRange: {
    startMonth: string // YYYY-MM
    endMonth: string   // YYYY-MM
  }
  monthlyStats: {
    [month: string]: {
      tradesCount: number
      pnlCount: number
      equitySnapshotsCount: number
      fileSize: number
    }
  }
}

interface MonthlyTradesData {
  month: string
  trades: BybitTrade[]
  checksum: string
  createdAt: number
  lastUpdated: number
}

interface MonthlyPnLData {
  month: string
  pnl: BybitClosedPnL[]
  checksum: string
  createdAt: number
  lastUpdated: number
}

interface MonthlyEquityData {
  month: string
  equity: EquitySnapshot[]
  checksum: string
  createdAt: number
  lastUpdated: number
}

interface CacheSummary {
  accountId: string
  month: string
  totalTrades: number
  totalPnL: number
  totalVolume: number
  winRate: number
  avgWin: number
  avgLoss: number
  maxDrawdown: number
  generatedAt: number
}

export class DataManager {
  private readonly ENCRYPTION_KEY = 'tradeharbour_data_encryption_v1'
  private readonly DATA_VERSION = '1.0.0'
  private readonly MAX_MONTHS_IN_MEMORY = 6 // Keep last 6 months in memory
  private readonly ARCHIVE_AFTER_MONTHS = 24 // Archive data older than 2 years

  constructor() {}

  // Get data directory paths
  private async getDataPaths() {
    const baseDataDir = await window.electronAPI.app.getUserDataPath()
    return {
      base: baseDataDir,
      accounts: `${baseDataDir}/accounts`,
      tradingData: `${baseDataDir}/trading-data`,
      cache: `${baseDataDir}/trading-data/cache`,
      archives: `${baseDataDir}/archives`
    }
  }

  // Ensure directory structure exists
  private async ensureDirectoryStructure(accountId: string) {
    const paths = await this.getDataPaths()
    const accountDataPath = `${paths.tradingData}/${accountId}`

    // Create directories via main process
    const directories = [
      paths.accounts,
      paths.tradingData,
      paths.cache,
      paths.archives,
      accountDataPath,
      `${accountDataPath}/trades`,
      `${accountDataPath}/pnl`,
      `${accountDataPath}/equity`
    ]

    for (const dir of directories) {
      try {
        await window.electronAPI.fileSystem.createDirectory(dir)
      } catch (error) {
        console.warn(`Failed to create directory ${dir}:`, error)
      }
    }
  }

  // Encrypt data
  private encrypt(data: any): string {
    const jsonStr = JSON.stringify(data)
    return crypto.AES.encrypt(jsonStr, this.ENCRYPTION_KEY).toString()
  }

  // Decrypt data
  private decrypt(encryptedData: string): any {
    const decrypted = crypto.AES.decrypt(encryptedData, this.ENCRYPTION_KEY)
    const jsonStr = decrypted.toString(crypto.enc.Utf8)
    return JSON.parse(jsonStr)
  }

  // Generate checksum for data integrity
  private generateChecksum(data: any): string {
    const jsonStr = JSON.stringify(data)
    return crypto.MD5(jsonStr).toString()
  }

  // Get month key from timestamp
  private getMonthKey(timestamp: number): string {
    const date = new Date(timestamp)
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`
  }

  // Get current month key
  private getCurrentMonth(): string {
    return this.getMonthKey(Date.now())
  }

  // Read file with error handling (no encryption for performance)
  private async readFile(filePath: string): Promise<any | null> {
    try {
      const jsonData = await window.electronAPI.fileSystem.readFile(filePath)
      if (!jsonData) return null
      return JSON.parse(jsonData)
    } catch (error) {
      console.warn(`Failed to read file ${filePath}:`, error)
      return null
    }
  }

  // Write file with error handling (no encryption for performance)
  private async writeFile(filePath: string, data: any): Promise<boolean> {
    try {
      const jsonData = JSON.stringify(data, null, 2)
      await window.electronAPI.fileSystem.writeFile(filePath, jsonData)
      return true
    } catch (error) {
      console.error(`Failed to write file ${filePath}:`, error)
      return false
    }
  }

  // Get or create metadata for account
  async getAccountMetadata(accountId: string): Promise<DataMetadata> {
    await this.ensureDirectoryStructure(accountId)
    const paths = await this.getDataPaths()
    const metadataPath = `${paths.tradingData}/${accountId}/metadata.json`

    let metadata = await this.readFile(metadataPath)

    if (!metadata) {
      // Create new metadata
      metadata = {
        accountId,
        createdAt: Date.now(),
        lastUpdated: Date.now(),
        dataVersion: this.DATA_VERSION,
        totalMonths: 0,
        dataRange: {
          startMonth: this.getCurrentMonth(),
          endMonth: this.getCurrentMonth()
        },
        monthlyStats: {}
      }
      await this.writeFile(metadataPath, metadata)
    }

    return metadata
  }

  // Update metadata
  async updateAccountMetadata(accountId: string, updates: Partial<DataMetadata>): Promise<void> {
    const metadata = await this.getAccountMetadata(accountId)
    const updatedMetadata = { ...metadata, ...updates, lastUpdated: Date.now() }

    const paths = await this.getDataPaths()
    const metadataPath = `${paths.tradingData}/${accountId}/metadata.json`
    await this.writeFile(metadataPath, updatedMetadata)
  }

  // Save trades for a specific month
  async saveMonthlyTrades(accountId: string, month: string, trades: BybitTrade[]): Promise<boolean> {
    await this.ensureDirectoryStructure(accountId)
    const paths = await this.getDataPaths()
    const filePath = `${paths.tradingData}/${accountId}/trades/${month}.json`

    const monthlyData: MonthlyTradesData = {
      month,
      trades,
      checksum: this.generateChecksum(trades),
      createdAt: Date.now(),
      lastUpdated: Date.now()
    }

    const success = await this.writeFile(filePath, monthlyData)

    if (success) {
      // Update metadata
      const metadata = await this.getAccountMetadata(accountId)
      metadata.monthlyStats[month] = {
        ...metadata.monthlyStats[month],
        tradesCount: trades.length,
        fileSize: JSON.stringify(monthlyData).length
      }
      await this.updateAccountMetadata(accountId, metadata)
    }

    return success
  }

  // Save P&L for a specific month
  async saveMonthlyPnL(accountId: string, month: string, pnl: BybitClosedPnL[]): Promise<boolean> {
    await this.ensureDirectoryStructure(accountId)
    const paths = await this.getDataPaths()
    const filePath = `${paths.tradingData}/${accountId}/pnl/${month}.json`

    const monthlyData: MonthlyPnLData = {
      month,
      pnl,
      checksum: this.generateChecksum(pnl),
      createdAt: Date.now(),
      lastUpdated: Date.now()
    }

    const success = await this.writeFile(filePath, monthlyData)

    if (success) {
      // Update metadata
      const metadata = await this.getAccountMetadata(accountId)
      metadata.monthlyStats[month] = {
        ...metadata.monthlyStats[month],
        pnlCount: pnl.length,
        fileSize: (metadata.monthlyStats[month]?.fileSize || 0) + JSON.stringify(monthlyData).length
      }
      await this.updateAccountMetadata(accountId, metadata)
    }

    return success
  }

  // Save equity snapshots for a specific month
  async saveMonthlyEquity(accountId: string, month: string, equity: EquitySnapshot[]): Promise<boolean> {
    await this.ensureDirectoryStructure(accountId)
    const paths = await this.getDataPaths()
    const filePath = `${paths.tradingData}/${accountId}/equity/${month}.json`

    const monthlyData: MonthlyEquityData = {
      month,
      equity,
      checksum: this.generateChecksum(equity),
      createdAt: Date.now(),
      lastUpdated: Date.now()
    }

    const success = await this.writeFile(filePath, monthlyData)

    if (success) {
      // Update metadata
      const metadata = await this.getAccountMetadata(accountId)
      metadata.monthlyStats[month] = {
        ...metadata.monthlyStats[month],
        equitySnapshotsCount: equity.length,
        fileSize: (metadata.monthlyStats[month]?.fileSize || 0) + JSON.stringify(monthlyData).length
      }
      await this.updateAccountMetadata(accountId, metadata)
    }

    return success
  }

  // Read trades for a specific month
  async getMonthlyTrades(accountId: string, month: string): Promise<BybitTrade[]> {
    const paths = await this.getDataPaths()
    const filePath = `${paths.tradingData}/${accountId}/trades/${month}.json`

    const monthlyData = await this.readFile(filePath) as MonthlyTradesData | null
    if (!monthlyData) return []

    // Verify checksum
    const expectedChecksum = this.generateChecksum(monthlyData.trades)
    if (monthlyData.checksum !== expectedChecksum) {
      console.warn(`Checksum mismatch for trades ${month}, data may be corrupted`)
    }

    return monthlyData.trades || []
  }

  // Read P&L for a specific month
  async getMonthlyPnL(accountId: string, month: string): Promise<BybitClosedPnL[]> {
    const paths = await this.getDataPaths()
    const filePath = `${paths.tradingData}/${accountId}/pnl/${month}.json`

    const monthlyData = await this.readFile(filePath) as MonthlyPnLData | null
    if (!monthlyData) return []

    // Verify checksum
    const expectedChecksum = this.generateChecksum(monthlyData.pnl)
    if (monthlyData.checksum !== expectedChecksum) {
      console.warn(`Checksum mismatch for P&L ${month}, data may be corrupted`)
    }

    return monthlyData.pnl || []
  }

  // Read equity snapshots for a specific month
  async getMonthlyEquity(accountId: string, month: string): Promise<EquitySnapshot[]> {
    const paths = await this.getDataPaths()
    const filePath = `${paths.tradingData}/${accountId}/equity/${month}.json`

    const monthlyData = await this.readFile(filePath) as MonthlyEquityData | null
    if (!monthlyData) return []

    // Verify checksum
    const expectedChecksum = this.generateChecksum(monthlyData.equity)
    if (monthlyData.checksum !== expectedChecksum) {
      console.warn(`Checksum mismatch for equity ${month}, data may be corrupted`)
    }

    return monthlyData.equity || []
  }

  // Get trades for a date range (spans multiple months)
  async getTradesInRange(accountId: string, startDate: Date, endDate: Date): Promise<BybitTrade[]> {
    const startMonth = this.getMonthKey(startDate.getTime())
    const endMonth = this.getMonthKey(endDate.getTime())

    const months = this.getMonthsBetween(startMonth, endMonth)
    let allTrades: BybitTrade[] = []

    for (const month of months) {
      const monthlyTrades = await this.getMonthlyTrades(accountId, month)

      // Filter trades within the date range
      const filteredTrades = monthlyTrades.filter(trade => {
        const tradeDate = new Date(parseInt(trade.execTime))
        return tradeDate >= startDate && tradeDate <= endDate
      })

      allTrades = [...allTrades, ...filteredTrades]
    }

    // Sort by execution time (newest first)
    return allTrades.sort((a, b) => parseInt(b.execTime) - parseInt(a.execTime))
  }

  // Get P&L for a date range
  async getPnLInRange(accountId: string, startDate: Date, endDate: Date): Promise<BybitClosedPnL[]> {
    const startMonth = this.getMonthKey(startDate.getTime())
    const endMonth = this.getMonthKey(endDate.getTime())

    const months = this.getMonthsBetween(startMonth, endMonth)
    let allPnL: BybitClosedPnL[] = []

    for (const month of months) {
      const monthlyPnL = await this.getMonthlyPnL(accountId, month)

      // Filter P&L within the date range
      const filteredPnL = monthlyPnL.filter(pnl => {
        const pnlDate = new Date(parseInt(pnl.updatedTime || pnl.createdTime))
        return pnlDate >= startDate && pnlDate <= endDate
      })

      allPnL = [...allPnL, ...filteredPnL]
    }

    // Sort by updated time (newest first)
    return allPnL.sort((a, b) => parseInt(b.updatedTime || b.createdTime) - parseInt(a.updatedTime || a.createdTime))
  }

  // Helper to get months between two month keys
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

  // Add new trades (distributes across months automatically)
  async addTrades(accountId: string, trades: BybitTrade[]): Promise<void> {
    // Group trades by month
    const tradesByMonth = new Map<string, BybitTrade[]>()

    for (const trade of trades) {
      const month = this.getMonthKey(parseInt(trade.execTime))
      if (!tradesByMonth.has(month)) {
        tradesByMonth.set(month, [])
      }
      tradesByMonth.get(month)!.push(trade)
    }

    // Save each month's trades
    for (const [month, monthTrades] of tradesByMonth) {
      // Get existing trades for this month
      const existingTrades = await this.getMonthlyTrades(accountId, month)

      // Merge and deduplicate
      const mergedTrades = this.mergeAndDeduplicateTrades(existingTrades, monthTrades)

      // Save back to file
      await this.saveMonthlyTrades(accountId, month, mergedTrades)
    }
  }

  // Add new P&L records
  async addPnL(accountId: string, pnlRecords: BybitClosedPnL[]): Promise<void> {
    // Group P&L by month
    const pnlByMonth = new Map<string, BybitClosedPnL[]>()

    for (const pnl of pnlRecords) {
      const month = this.getMonthKey(parseInt(pnl.updatedTime || pnl.createdTime))
      if (!pnlByMonth.has(month)) {
        pnlByMonth.set(month, [])
      }
      pnlByMonth.get(month)!.push(pnl)
    }

    // Save each month's P&L
    for (const [month, monthPnL] of pnlByMonth) {
      // Get existing P&L for this month
      const existingPnL = await this.getMonthlyPnL(accountId, month)

      // Merge and deduplicate
      const mergedPnL = this.mergeAndDeduplicatePnL(existingPnL, monthPnL)

      // Save back to file
      await this.saveMonthlyPnL(accountId, month, mergedPnL)
    }
  }

  // Merge and deduplicate trades (same logic as before)
  private mergeAndDeduplicateTrades(existing: BybitTrade[], newData: BybitTrade[]): BybitTrade[] {
    const dataMap = new Map<string, BybitTrade>()

    // Add existing data
    existing.forEach(item => {
      dataMap.set(item.execId, item)
    })

    // Add new data (will overwrite duplicates)
    newData.forEach(item => {
      dataMap.set(item.execId, item)
    })

    // Convert back to array and sort by timestamp
    return Array.from(dataMap.values())
      .sort((a, b) => parseInt(b.execTime) - parseInt(a.execTime))
  }

  // Merge and deduplicate P&L (same logic as before)
  private mergeAndDeduplicatePnL(existing: BybitClosedPnL[], newData: BybitClosedPnL[]): BybitClosedPnL[] {
    const dataMap = new Map<string, BybitClosedPnL>()

    // Add existing data
    existing.forEach(item => {
      const key = `${item.orderId}_${item.symbol}_${item.updatedTime || item.createdTime}`
      dataMap.set(key, item)
    })

    // Add new data (will overwrite duplicates)
    newData.forEach(item => {
      const key = `${item.orderId}_${item.symbol}_${item.updatedTime || item.createdTime}`
      dataMap.set(key, item)
    })

    // Convert back to array and sort by timestamp
    return Array.from(dataMap.values())
      .sort((a, b) => parseInt(b.updatedTime || b.createdTime) - parseInt(a.updatedTime || a.createdTime))
  }

  // Get account statistics
  async getAccountStats(accountId: string): Promise<{
    totalMonths: number
    totalTrades: number
    totalPnLRecords: number
    dataSize: number
    oldestData: string
    newestData: string
  }> {
    const metadata = await this.getAccountMetadata(accountId)

    let totalTrades = 0
    let totalPnLRecords = 0
    let totalSize = 0

    for (const stats of Object.values(metadata.monthlyStats)) {
      totalTrades += stats.tradesCount
      totalPnLRecords += stats.pnlCount
      totalSize += stats.fileSize
    }

    return {
      totalMonths: metadata.totalMonths,
      totalTrades,
      totalPnLRecords,
      dataSize: totalSize,
      oldestData: metadata.dataRange.startMonth,
      newestData: metadata.dataRange.endMonth
    }
  }

  // Archive old data (move data older than threshold to archives)
  async archiveOldData(accountId: string, monthsToKeep: number = this.ARCHIVE_AFTER_MONTHS): Promise<void> {
    const metadata = await this.getAccountMetadata(accountId)
    const currentDate = new Date()
    const archiveThreshold = new Date(currentDate.getFullYear(), currentDate.getMonth() - monthsToKeep, 1)

    const monthsToArchive = Object.keys(metadata.monthlyStats).filter(month => {
      const monthDate = new Date(month + '-01')
      return monthDate < archiveThreshold
    })

    if (monthsToArchive.length === 0) {
      console.log(`No data to archive for account ${accountId}`)
      return
    }

    console.log(`Archiving ${monthsToArchive.length} months of data for account ${accountId}`)

    const paths = await this.getDataPaths()
    const archivePath = `${paths.archives}/${new Date().getFullYear()}`

    // Create archive directory
    await window.electronAPI.fileSystem.createDirectory(archivePath)

    // Move files to archive and update metadata
    for (const month of monthsToArchive) {
      // Archive trades
      const tradesFile = `${paths.tradingData}/${accountId}/trades/${month}.json`
      const archiveTradesFile = `${archivePath}/${accountId}-trades-${month}.json`
      await window.electronAPI.fileSystem.moveFile(tradesFile, archiveTradesFile)

      // Archive P&L
      const pnlFile = `${paths.tradingData}/${accountId}/pnl/${month}.json`
      const archivePnLFile = `${archivePath}/${accountId}-pnl-${month}.json`
      await window.electronAPI.fileSystem.moveFile(pnlFile, archivePnLFile)

      // Archive equity
      const equityFile = `${paths.tradingData}/${accountId}/equity/${month}.json`
      const archiveEquityFile = `${archivePath}/${accountId}-equity-${month}.json`
      await window.electronAPI.fileSystem.moveFile(equityFile, archiveEquityFile)

      // Remove from metadata
      delete metadata.monthlyStats[month]
    }

    // Update metadata
    const remainingMonths = Object.keys(metadata.monthlyStats)
    if (remainingMonths.length > 0) {
      metadata.dataRange.startMonth = remainingMonths.sort()[0]
    }
    metadata.totalMonths = remainingMonths.length

    await this.updateAccountMetadata(accountId, metadata)

    console.log(`Successfully archived ${monthsToArchive.length} months for account ${accountId}`)
  }

  // Clean up empty files and optimize storage
  async optimizeStorage(accountId: string): Promise<void> {
    const metadata = await this.getAccountMetadata(accountId)

    // Remove empty month entries
    const emptyMonths = Object.entries(metadata.monthlyStats)
      .filter(([_, stats]) => stats.tradesCount === 0 && stats.pnlCount === 0 && stats.equitySnapshotsCount === 0)
      .map(([month, _]) => month)

    if (emptyMonths.length > 0) {
      console.log(`Cleaning up ${emptyMonths.length} empty months for account ${accountId}`)

      const paths = await this.getDataPaths()

      for (const month of emptyMonths) {
        // Delete empty files
        await window.electronAPI.fileSystem.deleteFile(`${paths.tradingData}/${accountId}/trades/${month}.json`)
        await window.electronAPI.fileSystem.deleteFile(`${paths.tradingData}/${accountId}/pnl/${month}.json`)
        await window.electronAPI.fileSystem.deleteFile(`${paths.tradingData}/${accountId}/equity/${month}.json`)

        // Remove from metadata
        delete metadata.monthlyStats[month]
      }

      await this.updateAccountMetadata(accountId, metadata)
    }
  }

  // Get list of available months for an account
  async getAvailableMonths(accountId: string): Promise<string[]> {
    const metadata = await this.getAccountMetadata(accountId)
    return Object.keys(metadata.monthlyStats).sort()
  }

  // Clear all data for an account
  async clearAccountData(accountId: string): Promise<void> {
    const paths = await this.getDataPaths()
    const accountPath = `${paths.tradingData}/${accountId}`

    // Delete entire account directory
    await window.electronAPI.fileSystem.deleteDirectory(accountPath)

    console.log(`Cleared all data for account ${accountId}`)
  }
}

export const dataManager = new DataManager()