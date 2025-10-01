import { ExchangeAccount } from '../types/exchanges'
import { AccountApiStatus } from './apiKeyStatus'

export interface NotificationItem {
  id: string
  type: 'warning' | 'error' | 'info' | 'success'
  title: string
  message: string
  timestamp: number
  action?: {
    label: string
    handler: () => void
  }
  dismissible?: boolean
  accountId?: string
}

class NotificationManager {
  private notifications: NotificationItem[] = []
  private listeners: Array<(notifications: NotificationItem[]) => void> = []

  addNotification(notification: Omit<NotificationItem, 'id' | 'timestamp'>): string {
    const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const newNotification: NotificationItem = {
      ...notification,
      id,
      timestamp: Date.now(),
      dismissible: notification.dismissible !== false
    }

    this.notifications.unshift(newNotification)

    // Keep only last 50 notifications
    if (this.notifications.length > 50) {
      this.notifications = this.notifications.slice(0, 50)
    }

    this.notifyListeners()
    return id
  }

  removeNotification(id: string) {
    this.notifications = this.notifications.filter(n => n.id !== id)
    this.notifyListeners()
  }

  clearNotifications() {
    this.notifications = []
    this.notifyListeners()
  }

  clearNotificationsForAccount(accountId: string) {
    this.notifications = this.notifications.filter(n => n.accountId !== accountId)
    this.notifyListeners()
  }

  getNotifications(): NotificationItem[] {
    return [...this.notifications]
  }

  subscribe(listener: (notifications: NotificationItem[]) => void): () => void {
    this.listeners.push(listener)

    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener)
    }
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener([...this.notifications]))
  }

  // Convenience methods for API key notifications
  addApiKeyExpiredNotification(account: ExchangeAccount) {
    // Remove any existing API key notifications for this account
    this.notifications = this.notifications.filter(
      n => !(n.accountId === account.id && n.title.includes('API Key'))
    )

    return this.addNotification({
      type: 'error',
      title: 'API Key Expired',
      message: `The API key for account "${account.name}" has expired and needs to be updated.`,
      accountId: account.id,
      action: {
        label: 'Update API Key',
        handler: () => {
          // Navigate to account settings - this would need to be implemented
          // TODO: Implement navigation to account settings
        }
      }
    })
  }

  addApiKeyInvalidNotification(account: ExchangeAccount, error: string) {
    // Remove any existing API key notifications for this account
    this.notifications = this.notifications.filter(
      n => !(n.accountId === account.id && n.title.includes('API Key'))
    )

    return this.addNotification({
      type: 'error',
      title: 'API Key Invalid',
      message: `API key for account "${account.name}" is invalid: ${error}`,
      accountId: account.id,
      action: {
        label: 'Check Settings',
        handler: () => {
          // TODO: Implement navigation to account settings
        }
      }
    })
  }

  addApiKeyRateLimitNotification(account: ExchangeAccount) {
    // Check if we already have a rate limit notification for this account in the last 5 minutes
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000
    const existingRateLimit = this.notifications.find(
      n => n.accountId === account.id &&
           n.title.includes('Rate Limit') &&
           n.timestamp > fiveMinutesAgo
    )

    if (existingRateLimit) return existingRateLimit.id

    return this.addNotification({
      type: 'warning',
      title: 'Rate Limit Hit',
      message: `API rate limit reached for account "${account.name}". Data fetching will be temporarily slower.`,
      accountId: account.id,
      dismissible: true
    })
  }

  processApiStatusUpdates(statuses: AccountApiStatus[]) {
    statuses.forEach(({ accountId, accountName, exchange, status }) => {
      const account = { id: accountId, name: accountName, exchange } as ExchangeAccount

      if (status.isExpired) {
        this.addApiKeyExpiredNotification(account)
      } else if (!status.isValid && !status.rateLimited) {
        this.addApiKeyInvalidNotification(account, status.errorMessage || 'Unknown error')
      } else if (status.rateLimited) {
        this.addApiKeyRateLimitNotification(account)
      } else if (status.isValid && status.hasPermissions) {
        // Remove any existing error notifications for this account
        this.clearNotificationsForAccount(accountId)
      }
    })
  }

  getAccountNotifications(accountId: string): NotificationItem[] {
    return this.notifications.filter(n => n.accountId === accountId)
  }

  hasActiveWarnings(): boolean {
    return this.notifications.some(n => n.type === 'warning' || n.type === 'error')
  }

  getActiveWarningsCount(): number {
    return this.notifications.filter(n => n.type === 'warning' || n.type === 'error').length
  }
}

export const notificationManager = new NotificationManager()

// Export convenience functions
export const addNotification = (notification: Omit<NotificationItem, 'id' | 'timestamp'>) =>
  notificationManager.addNotification(notification)

export const removeNotification = (id: string) =>
  notificationManager.removeNotification(id)

export const useNotifications = () => {
  return {
    notifications: notificationManager.getNotifications(),
    addNotification: notificationManager.addNotification.bind(notificationManager),
    removeNotification: notificationManager.removeNotification.bind(notificationManager),
    clearNotifications: notificationManager.clearNotifications.bind(notificationManager),
    subscribe: notificationManager.subscribe.bind(notificationManager),
    hasActiveWarnings: notificationManager.hasActiveWarnings.bind(notificationManager),
    getActiveWarningsCount: notificationManager.getActiveWarningsCount.bind(notificationManager)
  }
}