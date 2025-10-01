import { useState, useEffect } from 'react'
import { useAppStore } from '../store/useAppStore'
import { apiKeyStatusChecker, AccountApiStatus } from '../utils/apiKeyStatus'
import packageInfo from '../../package.json'

export const Settings = () => {
  const { settings, updateSettings, accounts } = useAppStore()
  const [version, setVersion] = useState(packageInfo.version)
  const [apiStatuses, setApiStatuses] = useState<AccountApiStatus[]>([])
  const [checkingApiStatus, setCheckingApiStatus] = useState(false)

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.app.getVersion().then(setVersion)
    }
  }, [])

  const handleCheckApiKeys = async () => {
    if (accounts.length === 0) return

    setCheckingApiStatus(true)
    try {
      const statuses = await apiKeyStatusChecker.checkAllAccountsStatus(accounts)
      setApiStatuses(statuses)
    } catch (error) {
      console.error('Failed to check API key statuses:', error)
    } finally {
      setCheckingApiStatus(false)
    }
  }

  const handleRefreshIntervalChange = (interval: number) => {
    updateSettings({ refreshInterval: interval })
  }

  const handleAutoRefreshToggle = () => {
    updateSettings({ autoRefresh: !settings.autoRefresh })
  }

  const handleExportData = async () => {
    try {
      const data = {
        accounts: accounts.map(acc => ({
          id: acc.id,
          name: acc.name,
          isTestnet: acc.isTestnet,
          createdAt: acc.createdAt,
        })),
        settings,
        exportedAt: new Date().toISOString(),
      }

      const result = await window.electronAPI.dialog.showSaveDialog({
        defaultPath: `bybit-dashboard-config-${new Date().toISOString().split('T')[0]}.json`,
        filters: [
          { name: 'JSON Files', extensions: ['json'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      })

      if (!result.canceled && result.filePath) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const arrayBuffer = await blob.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        await window.electronAPI.store.set('temp-export', buffer.toString('base64'))
      }
    } catch (error) {
      console.error('Failed to export data:', error)
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>

      <div className="space-y-6">
        {/* Theme Settings */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Appearance
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Theme
              </label>
              <div className="flex space-x-4">
                <button
                  onClick={() => updateSettings({ theme: 'light' })}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg border ${
                    settings.theme === 'light'
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                      : 'border-gray-200 dark:border-dark-600'
                  }`}
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>Light</span>
                </button>

                <button
                  onClick={() => updateSettings({ theme: 'dark' })}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg border ${
                    settings.theme === 'dark'
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                      : 'border-gray-200 dark:border-dark-600'
                  }`}
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                  </svg>
                  <span>Dark</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Refresh Settings */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Data Refresh
          </h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Auto Refresh
                </label>
                <p className="text-xs text-muted">
                  Automatically refresh account data
                </p>
              </div>
              <button
                onClick={handleAutoRefreshToggle}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.autoRefresh ? 'bg-primary-600' : 'bg-gray-200 dark:bg-dark-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.autoRefresh ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {settings.autoRefresh && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Refresh Interval
                </label>
                <select
                  value={settings.refreshInterval}
                  onChange={(e) => handleRefreshIntervalChange(Number(e.target.value))}
                  className="input"
                >
                  <option value={30000}>30 seconds</option>
                  <option value={60000}>1 minute</option>
                  <option value={120000}>2 minutes</option>
                  <option value={300000}>5 minutes</option>
                  <option value={600000}>10 minutes</option>
                </select>
              </div>
            )}
          </div>
        </div>


        {/* API Settings */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            API Settings
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                API Refresh Schedule
              </label>
              <select
                value={settings.apiRefreshSchedule}
                onChange={(e) => updateSettings({ apiRefreshSchedule: e.target.value as 'daily' | 'weekly' | 'custom' })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="custom">Custom Interval</option>
              </select>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                How often to perform full API data refresh
              </p>
            </div>

            {settings.apiRefreshSchedule === 'custom' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Custom Interval (hours)
                </label>
                <input
                  type="number"
                  min="1"
                  max="168"
                  value={settings.customRefreshInterval}
                  onChange={(e) => updateSettings({ customRefreshInterval: parseInt(e.target.value) || 24 })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Enter hours between 1 and 168 (1 week)
                </p>
              </div>
            )}

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <div className="flex items-start space-x-2">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Note:</strong> The hosted version of Trade Harbour avoids API key expiry issues through IP whitelisting. Self-hosted installations may need to manage API key renewals manually.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* API Key Status */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              API Key Status
            </h2>
            <button
              onClick={handleCheckApiKeys}
              disabled={checkingApiStatus || accounts.length === 0}
              className="btn-secondary text-sm px-4 py-2 disabled:opacity-50"
            >
              {checkingApiStatus ? 'Checking...' : 'Check All Keys'}
            </button>
          </div>

          {accounts.length === 0 ? (
            <div className="text-center py-6 text-gray-500 dark:text-gray-400">
              No accounts configured. Add an account to check API key status.
            </div>
          ) : (
            <div className="space-y-3">
              {apiStatuses.length > 0 ? (
                apiStatuses.map(({ accountId, accountName, exchange, status }) => (
                  <div
                    key={accountId}
                    className={`border rounded-lg p-4 ${
                      status.isValid && status.hasPermissions
                        ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
                        : status.isExpired || status.needsRefresh
                        ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20'
                        : status.rateLimited
                        ? 'border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20'
                        : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${
                          status.isValid && status.hasPermissions
                            ? 'bg-green-500'
                            : status.isExpired || status.needsRefresh
                            ? 'bg-red-500'
                            : status.rateLimited
                            ? 'bg-yellow-500'
                            : 'bg-gray-400'
                        }`} />
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {accountName}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                            {exchange}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className={`text-sm font-medium ${
                          status.isValid && status.hasPermissions
                            ? 'text-green-700 dark:text-green-300'
                            : status.isExpired || status.needsRefresh
                            ? 'text-red-700 dark:text-red-300'
                            : status.rateLimited
                            ? 'text-yellow-700 dark:text-yellow-300'
                            : 'text-gray-700 dark:text-gray-300'
                        }`}>
                          {status.isValid && status.hasPermissions
                            ? 'Active'
                            : status.isExpired
                            ? 'Expired'
                            : status.needsRefresh
                            ? 'Needs Refresh'
                            : status.rateLimited
                            ? 'Rate Limited'
                            : 'Invalid'
                          }
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(status.lastChecked).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>

                    {status.errorMessage && (
                      <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        {status.errorMessage}
                      </div>
                    )}

                    {(status.isExpired || status.needsRefresh) && (
                      <div className="mt-3 text-sm">
                        <span className="text-red-600 dark:text-red-400 font-medium">
                          Action Required:
                        </span>
                        <span className="text-gray-600 dark:text-gray-400 ml-1">
                          Please update your API key credentials in the account settings.
                        </span>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                  Click "Check All Keys" to verify API key status
                </div>
              )}
            </div>
          )}

          <div className="mt-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Tip:</strong> API keys are checked automatically when fetching account data. Use this manual check to verify status without triggering data refresh.
              </div>
            </div>
          </div>
        </div>

        {/* Debug Settings */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Debug & Diagnostics
          </h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Debug Mode
                </label>
                <p className="text-xs text-muted">
                  Enable detailed logging for troubleshooting
                </p>
              </div>
              <button
                onClick={() => updateSettings({ debugMode: !settings.debugMode })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.debugMode ? 'bg-primary-600' : 'bg-gray-200 dark:bg-dark-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.debugMode ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {settings.debugMode && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                <div className="text-sm text-yellow-800 dark:text-yellow-200">
                  <strong>Debug Mode Active:</strong> Detailed logs are being recorded for bot actions, API calls, trades, and system events. Check the Diagnostics page to view logs.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Data Management */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Data Management
          </h2>

          <div className="space-y-4">
            <button
              onClick={handleExportData}
              className="btn-secondary w-full"
            >
              Export Configuration
            </button>

            <div className="border-t border-gray-200 dark:border-dark-600 pt-4">
              <button
                onClick={() => {
                  if (window.confirm('Are you sure? This will delete all accounts and settings.')) {
                    // Clear all data logic would go here
                  }
                }}
                className="btn-danger w-full"
              >
                Clear All Data
              </button>
            </div>
          </div>
        </div>

        {/* About */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            About
          </h2>

          <div className="space-y-2 text-sm text-muted">
            <div className="flex justify-between">
              <span>Version:</span>
              <span>{packageInfo.version}</span>
            </div>
            <div className="flex justify-between">
              <span>License:</span>
              <span>MIT</span>
            </div>
            <div className="flex justify-between">
              <span>GitHub:</span>
              <a
                href="#"
                className="text-primary-600 dark:text-primary-400 hover:underline"
                onClick={(e) => {
                  e.preventDefault()
                  // Open GitHub link
                }}
              >
                Open Source
              </a>
            </div>
          </div>
        </div>

        {/* Connect & Support */}
        <div className="card p-6">
          <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z"/>
                <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z"/>
              </svg>
              <span className="text-sm font-medium text-purple-800 dark:text-purple-200">
                Connect & Support
              </span>
            </div>
            <p className="text-xs text-purple-700 dark:text-purple-300">
              Hit me up on Discord over at the <a href="https://discord.gg/daviddtech" target="_blank" rel="noopener noreferrer" className="font-medium text-purple-600 dark:text-purple-400 hover:underline">Daviddtech community</a> to report bugs or request features!
            </p>
            <div className="mt-3 space-y-1 text-xs">
              <div className="text-purple-600 dark:text-purple-400">
                Discord: <span className="font-medium">@fishyink</span>
              </div>
              <div className="text-purple-600 dark:text-purple-400">
                Daviddtech Community: <a
                  href="https://discord.gg/daviddtech"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium hover:underline text-purple-700 dark:text-purple-300"
                >
                  Join Discord
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}