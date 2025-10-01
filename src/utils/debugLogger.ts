import { useAppStore } from '../store/useAppStore'

export interface DebugLogEntry {
  timestamp: number
  level: 'info' | 'warning' | 'error'
  category: 'bot' | 'api' | 'trade' | 'system'
  message: string
  data?: any
}

class DebugLogger {
  private logs: DebugLogEntry[] = []
  private maxLogs = 1000

  private isDebugEnabled(): boolean {
    const { settings } = useAppStore.getState()
    return settings.debugMode
  }

  log(level: DebugLogEntry['level'], category: DebugLogEntry['category'], message: string, data?: any) {
    if (!this.isDebugEnabled()) return

    const entry: DebugLogEntry = {
      timestamp: Date.now(),
      level,
      category,
      message,
      data
    }

    this.logs.unshift(entry)

    // Keep only the most recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs)
    }

    // Also log to console for development
    const timestamp = new Date().toISOString()
    const emoji = this.getEmoji(level, category)
    const logMessage = `${emoji} [${timestamp}] [${category.toUpperCase()}] ${message}`

    switch (level) {
      case 'error':
        console.error(logMessage, data)
        break
      case 'warning':
        console.warn(logMessage, data)
        break
      default:
        console.log(logMessage, data)
    }
  }

  private getEmoji(level: DebugLogEntry['level'], category: DebugLogEntry['category']): string {
    if (level === 'error') return '❌'
    if (level === 'warning') return '⚠️'

    switch (category) {
      case 'bot': return '🤖'
      case 'api': return '🔌'
      case 'trade': return '💱'
      case 'system': return '⚙️'
      default: return 'ℹ️'
    }
  }

  info(category: DebugLogEntry['category'], message: string, data?: any) {
    this.log('info', category, message, data)
  }

  warning(category: DebugLogEntry['category'], message: string, data?: any) {
    this.log('warning', category, message, data)
  }

  error(category: DebugLogEntry['category'], message: string, data?: any) {
    this.log('error', category, message, data)
  }

  getLogs(): DebugLogEntry[] {
    return [...this.logs]
  }

  clearLogs() {
    this.logs = []
    this.info('system', 'Debug logs cleared')
  }

  exportLogs(): string {
    const logsData = {
      exportedAt: new Date().toISOString(),
      totalLogs: this.logs.length,
      logs: this.logs.map(log => ({
        ...log,
        timestamp: new Date(log.timestamp).toISOString()
      }))
    }
    return JSON.stringify(logsData, null, 2)
  }
}

export const debugLogger = new DebugLogger()

// Convenience methods for common actions
export const logBotAction = (action: string, botName: string, data?: any) => {
  debugLogger.info('bot', `${action}: ${botName}`, data)
}

export const logApiCall = (endpoint: string, account: string, success: boolean, data?: any) => {
  if (success) {
    debugLogger.info('api', `API call successful: ${endpoint} for ${account}`, data)
  } else {
    debugLogger.error('api', `API call failed: ${endpoint} for ${account}`, data)
  }
}

export const logTradeActivity = (action: string, details: string, data?: any) => {
  debugLogger.info('trade', `${action}: ${details}`, data)
}

export const logSystemEvent = (event: string, data?: any) => {
  debugLogger.info('system', event, data)
}