import { useState, useEffect } from 'react'
import { useAppStore } from '../store/useAppStore'

export const Settings = () => {
  const { settings, updateSettings, accounts } = useAppStore()
  const [version, setVersion] = useState('')
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null)

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.app.getVersion().then(setVersion)
    }
  }, [])

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
              <span>{version || '1.0.0'}</span>
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

        {/* Support Development */}
        <div className="card p-6">
          <div className="flex items-center space-x-2 mb-4">
            <span className="text-2xl">🍺</span>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Support Trading Dashboard Development
            </h2>
          </div>

          <div className="space-y-4">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
                "This dashboard started as a personal project to track my own trading performance across multiple Bybit accounts.
                After 100+ hours of development, I'm sharing it with the community!"
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300 mb-4">
                Built by a trader, for traders • Keep this tool subscription free and opensource
              </p>

              {/* Support Options - Moved inside blue box */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">💰 Support Options</h3>

                {/* USDT Address */}
                <div>
                  <div className="mb-2">
                    <span className="text-xs font-medium text-blue-700 dark:text-blue-300">USDT (TRC20):</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 bg-white dark:bg-dark-800 rounded border border-blue-300 dark:border-blue-600 p-2">
                      <div className="text-xs font-mono text-gray-900 dark:text-gray-100 break-all leading-tight">
                        TKbvxKPKh6MZa4Qkj9AnDzj4AjM2CXT239
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText('TKbvxKPKh6MZa4Qkj9AnDzj4AjM2CXT239')
                        setCopiedAddress('USDT')
                        setTimeout(() => setCopiedAddress(null), 2000)
                      }}
                      className={`p-2 text-white rounded text-xs transition-all duration-200 ${
                        copiedAddress === 'USDT'
                          ? 'bg-green-600 hover:bg-green-700'
                          : 'bg-blue-600 hover:bg-blue-700'
                      }`}
                      title={copiedAddress === 'USDT' ? 'Copied!' : 'Copy USDT address'}
                    >
                      {copiedAddress === 'USDT' ? (
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* BTC Address */}
                <div>
                  <div className="mb-2">
                    <span className="text-xs font-medium text-blue-700 dark:text-blue-300">Bitcoin (BTC):</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 bg-white dark:bg-dark-800 rounded border border-blue-300 dark:border-blue-600 p-2">
                      <div className="text-xs font-mono text-gray-900 dark:text-gray-100 break-all leading-tight">
                        1MAZ6hDPPt7cn1rELBMyyLZsj6rgcHDQxr
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText('1MAZ6hDPPt7cn1rELBMyyLZsj6rgcHDQxr')
                        setCopiedAddress('BTC')
                        setTimeout(() => setCopiedAddress(null), 2000)
                      }}
                      className={`p-2 text-white rounded text-xs transition-all duration-200 ${
                        copiedAddress === 'BTC'
                          ? 'bg-green-600 hover:bg-green-700'
                          : 'bg-orange-600 hover:bg-orange-700'
                      }`}
                      title={copiedAddress === 'BTC' ? 'Copied!' : 'Copy BTC address'}
                    >
                      {copiedAddress === 'BTC' ? (
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">🚀 Recent Updates</h3>
                <ul className="text-xs text-muted space-y-1">
                  <li>• Account Health Score with detailed analytics</li>
                  <li>• 30-day equity curve visualization</li>
                  <li>• Export functionality for all data</li>
                  <li>• Enhanced trading statistics</li>
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">🎯 Development Goals</h3>
                <ul className="text-xs text-muted space-y-1">
                  <li>• Advanced portfolio analytics</li>
                  <li>• Mobile responsive design</li>
                  <li>• API for third-party integrations</li>
                  <li>• Real-time alerts system</li>
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">🔜 Coming Soon</h3>
                <ul className="text-xs text-muted space-y-1">
                  <li>• <span className="text-purple-600 dark:text-purple-400 font-medium">Blofin</span> exchange support</li>
                  <li>• <span className="text-blue-600 dark:text-blue-400 font-medium">Toobit</span> exchange support</li>
                  <li>• Multi-exchange portfolio view</li>
                  <li>• Cross-exchange analytics</li>
                </ul>
              </div>
            </div>


            <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
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
                  Hit me up on Discord over at the <span className="font-medium">Daviddtech community</span> to report bugs or request features!
                </p>
                <div className="mt-3 space-y-1 text-xs">
                  <div className="text-purple-600 dark:text-purple-400">
                    Discord: <span className="font-medium">@fishyinking</span>
                  </div>
                  <div className="text-purple-600 dark:text-purple-400">
                    Website: <a
                      href="https://daviddtech.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium hover:underline text-purple-700 dark:text-purple-300"
                    >
                      daviddtech.com
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center pt-2">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                All donations go directly to development • Thank you for your support! 🙏
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}