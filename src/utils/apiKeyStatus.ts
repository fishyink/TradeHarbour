import { ExchangeAccount } from '../types/exchanges'
import { debugLogger } from './debugLogger'

export interface ApiKeyStatus {
  isValid: boolean
  isExpired: boolean
  hasPermissions: boolean
  lastChecked: number
  errorCode?: string
  errorMessage?: string
  rateLimited?: boolean
  needsRefresh?: boolean
}

export interface AccountApiStatus {
  accountId: string
  accountName: string
  exchange: string
  status: ApiKeyStatus
}

class ApiKeyStatusChecker {
  private statusCache = new Map<string, ApiKeyStatus>()
  private lastGlobalCheck = 0
  private readonly CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

  async checkApiKeyStatus(account: ExchangeAccount): Promise<ApiKeyStatus> {
    const cacheKey = account.id
    const now = Date.now()

    // Return cached status if still valid
    const cached = this.statusCache.get(cacheKey)
    if (cached && (now - cached.lastChecked) < this.CACHE_DURATION) {
      return cached
    }

    debugLogger.info('api', `Checking API key status for account: ${account.name}`)

    const status: ApiKeyStatus = {
      isValid: false,
      isExpired: false,
      hasPermissions: false,
      lastChecked: now,
      rateLimited: false,
      needsRefresh: false
    }

    try {
      // Use IPC to call the main process which has access to secure credentials
      // The main process will attempt to fetch balance as a validation test
      const result = await window.electronAPI.api.validateApiKey(account)

      if (result.success) {
        status.isValid = true
        status.hasPermissions = true
        debugLogger.info('api', `API key valid for account: ${account.name}`)
      } else {
        status.errorMessage = result.error || 'Validation failed'
      }

    } catch (error) {
      debugLogger.error('api', `API key check failed for account: ${account.name}`, error)

      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      status.errorMessage = errorMessage

      // Parse specific error codes from Bybit API
      if (errorMessage.includes('10003')) {
        status.errorCode = '10003'
        status.errorMessage = 'Invalid API key'
        status.isExpired = true
        status.needsRefresh = true
      } else if (errorMessage.includes('10004')) {
        status.errorCode = '10004'
        status.errorMessage = 'Invalid API signature - check secret key'
        status.needsRefresh = true
      } else if (errorMessage.includes('10005')) {
        status.errorCode = '10005'
        status.errorMessage = 'Permission denied - API key lacks required permissions'
        status.hasPermissions = false
      } else if (errorMessage.includes('10006')) {
        status.errorCode = '10006'
        status.errorMessage = 'Rate limit exceeded'
        status.rateLimited = true
      } else if (errorMessage.includes('10018') || errorMessage.includes('expired')) {
        status.errorCode = '10018'
        status.errorMessage = 'API key has expired'
        status.isExpired = true
        status.needsRefresh = true
      } else if (errorMessage.includes('ENOTFOUND') || errorMessage.includes('network')) {
        status.errorMessage = 'Network connection error'
      }
    }

    // Cache the result
    this.statusCache.set(cacheKey, status)
    return status
  }

  async checkAllAccountsStatus(accounts: ExchangeAccount[]): Promise<AccountApiStatus[]> {
    const results: AccountApiStatus[] = []

    // Check accounts in batches to avoid rate limiting
    const batchSize = 3
    for (let i = 0; i < accounts.length; i += batchSize) {
      const batch = accounts.slice(i, i + batchSize)

      const batchPromises = batch.map(async (account) => {
        const status = await this.checkApiKeyStatus(account)
        return {
          accountId: account.id,
          accountName: account.name,
          exchange: account.exchange,
          status
        }
      })

      const batchResults = await Promise.all(batchPromises)
      results.push(...batchResults)

      // Small delay between batches
      if (i + batchSize < accounts.length) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }

    this.lastGlobalCheck = Date.now()
    return results
  }

  async getQuickStatus(accountId: string): Promise<ApiKeyStatus | null> {
    return this.statusCache.get(accountId) || null
  }

  getStatusSummary(accounts: ExchangeAccount[]): {
    total: number
    valid: number
    expired: number
    invalid: number
    needsAttention: number
  } {
    const summary = {
      total: accounts.length,
      valid: 0,
      expired: 0,
      invalid: 0,
      needsAttention: 0
    }

    accounts.forEach(account => {
      const status = this.statusCache.get(account.id)
      if (!status) return

      if (status.isValid && status.hasPermissions) {
        summary.valid++
      } else if (status.isExpired) {
        summary.expired++
        summary.needsAttention++
      } else if (!status.isValid) {
        summary.invalid++
        summary.needsAttention++
      }
    })

    return summary
  }

  clearCache(accountId?: string) {
    if (accountId) {
      this.statusCache.delete(accountId)
    } else {
      this.statusCache.clear()
    }
  }

  shouldCheckStatus(): boolean {
    const now = Date.now()
    return (now - this.lastGlobalCheck) > this.CACHE_DURATION
  }

  // Get accounts that need immediate attention
  getAccountsNeedingAttention(accounts: ExchangeAccount[]): {
    expired: ExchangeAccount[]
    invalid: ExchangeAccount[]
    rateLimited: ExchangeAccount[]
  } {
    const result = {
      expired: [] as ExchangeAccount[],
      invalid: [] as ExchangeAccount[],
      rateLimited: [] as ExchangeAccount[]
    }

    accounts.forEach(account => {
      const status = this.statusCache.get(account.id)
      if (!status) return

      if (status.isExpired) {
        result.expired.push(account)
      } else if (!status.isValid && !status.rateLimited) {
        result.invalid.push(account)
      } else if (status.rateLimited) {
        result.rateLimited.push(account)
      }
    })

    return result
  }
}

export const apiKeyStatusChecker = new ApiKeyStatusChecker()

// Convenience functions for common use cases
export const checkAccountApiStatus = (account: ExchangeAccount) =>
  apiKeyStatusChecker.checkApiKeyStatus(account)

export const getAccountStatusSummary = (accounts: ExchangeAccount[]) =>
  apiKeyStatusChecker.getStatusSummary(accounts)

export const getApiKeyIssues = (accounts: ExchangeAccount[]) =>
  apiKeyStatusChecker.getAccountsNeedingAttention(accounts)