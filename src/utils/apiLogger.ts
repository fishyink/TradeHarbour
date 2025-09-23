interface ApiLogEntry {
  timestamp: number
  accountName: string
  endpoint: string
  method: string
  requestParams?: any
  response?: any
  error?: string
  responseTime?: number
}

class ApiLogger {
  private logs: ApiLogEntry[] = []
  private isElectron = typeof window !== 'undefined' && window.require

  async log(entry: ApiLogEntry) {
    this.logs.push(entry)

    // Console logging with enhanced formatting
    const timestamp = new Date(entry.timestamp).toISOString()
    const icon = entry.error ? '❌' : '✅'

    console.group(`${icon} API ${entry.method} ${entry.endpoint} - ${entry.accountName}`)
    console.log(`⏰ Time: ${timestamp}`)
    if (entry.responseTime) {
      console.log(`⚡ Duration: ${entry.responseTime}ms`)
    }
    if (entry.requestParams) {
      console.log(`📤 Request:`, entry.requestParams)
    }
    if (entry.response) {
      console.log(`📥 Response:`, entry.response)
    }
    if (entry.error) {
      console.error(`💥 Error:`, entry.error)
    }
    console.groupEnd()

    // Save to file if in Electron environment
    if (this.isElectron) {
      await this.saveToFile()
    }
  }

  private async saveToFile() {
    try {
      const fs = window.require('fs').promises
      const path = window.require('path')

      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
      const filename = `api_snapshot_${timestamp}.json`
      const logsDir = path.join(process.cwd(), 'logs')
      const filepath = path.join(logsDir, filename)

      // Ensure logs directory exists
      await fs.mkdir(logsDir, { recursive: true })

      // Save comprehensive log data
      const logData = {
        generated: new Date().toISOString(),
        totalEntries: this.logs.length,
        logs: this.logs,
        summary: this.generateSummary()
      }

      await fs.writeFile(filepath, JSON.stringify(logData, null, 2))
      console.log(`📁 API logs saved to: ${filepath}`)

      // Also save to the main snapshot file
      const mainFilepath = path.join(logsDir, 'api_snapshot.json')
      await fs.writeFile(mainFilepath, JSON.stringify(logData, null, 2))

    } catch (error) {
      console.error('Failed to save API logs to file:', error)
    }
  }

  private generateSummary() {
    const accountSummary: Record<string, any> = {}
    const endpointSummary: Record<string, any> = {}

    this.logs.forEach(log => {
      // Account summary
      if (!accountSummary[log.accountName]) {
        accountSummary[log.accountName] = {
          totalRequests: 0,
          errors: 0,
          endpoints: new Set()
        }
      }
      accountSummary[log.accountName].totalRequests++
      if (log.error) {
        accountSummary[log.accountName].errors++
      }
      accountSummary[log.accountName].endpoints.add(log.endpoint)

      // Endpoint summary
      if (!endpointSummary[log.endpoint]) {
        endpointSummary[log.endpoint] = {
          totalRequests: 0,
          errors: 0,
          avgResponseTime: 0,
          responseTimes: []
        }
      }
      endpointSummary[log.endpoint].totalRequests++
      if (log.error) {
        endpointSummary[log.endpoint].errors++
      }
      if (log.responseTime) {
        endpointSummary[log.endpoint].responseTimes.push(log.responseTime)
      }
    })

    // Calculate average response times
    Object.keys(endpointSummary).forEach(endpoint => {
      const times = endpointSummary[endpoint].responseTimes
      if (times.length > 0) {
        endpointSummary[endpoint].avgResponseTime =
          times.reduce((a: number, b: number) => a + b, 0) / times.length
      }
      delete endpointSummary[endpoint].responseTimes
    })

    // Convert Set to Array for JSON serialization
    Object.keys(accountSummary).forEach(account => {
      accountSummary[account].endpoints = Array.from(accountSummary[account].endpoints)
    })

    return {
      accounts: accountSummary,
      endpoints: endpointSummary,
      totalRequests: this.logs.length,
      totalErrors: this.logs.filter(log => log.error).length
    }
  }

  getLogs() {
    return this.logs
  }

  clearLogs() {
    this.logs = []
  }

  getLatestSnapshot() {
    return {
      generated: new Date().toISOString(),
      totalEntries: this.logs.length,
      logs: this.logs,
      summary: this.generateSummary()
    }
  }
}

export const apiLogger = new ApiLogger()