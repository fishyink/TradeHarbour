import { useState, useEffect } from 'react'
import { useAppStore } from '../store/useAppStore'
import { bybitAPI } from '../services/bybit'

interface DiagnosticData {
  balances: any[]
  positions: any[]
  trades: any[]
  closedPnL: any[]
  orders: any[]
  timestamp: number
  errors: string[]
}

export const Diagnostics = () => {
  const { accounts, clearEquityHistory } = useAppStore()
  const [diagnosticData, setDiagnosticData] = useState<Record<string, DiagnosticData>>({})
  const [activeTab, setActiveTab] = useState('backup')
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null)
  const [isRunningDiagnostics, setIsRunningDiagnostics] = useState(false)
  const [userDataPath, setUserDataPath] = useState<string>('')
  const [backupStatus, setBackupStatus] = useState<string>('')
  const [storageInfo, setStorageInfo] = useState<any>(null)
  const [switchingMode, setSwitchingMode] = useState<boolean>(false)

  const runDiagnostics = async () => {
    if (accounts.length === 0) return

    setIsRunningDiagnostics(true)
    console.log('🔍 Starting comprehensive API diagnostics...')

    const results: Record<string, DiagnosticData> = {}

    for (const account of accounts) {
      console.log(`\n📊 === DIAGNOSTICS FOR ACCOUNT: ${account.name} ===`)

      const accountResult: DiagnosticData = {
        balances: [],
        positions: [],
        trades: [],
        closedPnL: [],
        orders: [],
        timestamp: Date.now(),
        errors: []
      }

      try {
        // 1. Get Account Balance
        console.log('💰 Fetching account balance...')
        try {
          const balance = await bybitAPI.getAccountBalance(account)
          accountResult.balances = [balance]
          console.log('✅ Balance Response:', JSON.stringify(balance, null, 2))
        } catch (error) {
          const errorMsg = `Balance fetch failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          accountResult.errors.push(errorMsg)
          console.error('❌ Balance Error:', errorMsg)
        }

        // 2. Get Positions
        console.log('📈 Fetching positions...')
        try {
          const positions = await bybitAPI.getPositions(account)
          accountResult.positions = positions
          console.log('✅ Positions Response:', JSON.stringify(positions, null, 2))
        } catch (error) {
          const errorMsg = `Positions fetch failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          accountResult.errors.push(errorMsg)
          console.error('❌ Positions Error:', errorMsg)
        }

        // 3. Get Recent Trades
        console.log('🔄 Fetching recent trades...')
        try {
          const trades = await bybitAPI.getTrades(account, 100)
          accountResult.trades = trades
          console.log('✅ Trades Response (first 3):', JSON.stringify(trades.slice(0, 3), null, 2))
          console.log(`📊 Total trades retrieved: ${trades.length}`)
        } catch (error) {
          const errorMsg = `Trades fetch failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          accountResult.errors.push(errorMsg)
          console.error('❌ Trades Error:', errorMsg)
        }

        // 4. Get Closed P&L
        console.log('💵 Fetching closed P&L...')
        try {
          const closedPnL = await bybitAPI.getClosedPnL(account, 100)
          accountResult.closedPnL = closedPnL
          console.log('✅ Closed P&L Response (first 3):', JSON.stringify(closedPnL.slice(0, 3), null, 2))
          console.log(`📊 Total closed P&L records: ${closedPnL.length}`)
        } catch (error) {
          const errorMsg = `Closed P&L fetch failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          accountResult.errors.push(errorMsg)
          console.error('❌ Closed P&L Error:', errorMsg)
        }

        results[account.id] = accountResult
        console.log(`\n✅ Diagnostics completed for ${account.name}`)

      } catch (error) {
        console.error(`❌ Critical error for account ${account.name}:`, error)
        accountResult.errors.push(`Critical error: ${error instanceof Error ? error.message : 'Unknown error'}`)
        results[account.id] = accountResult
      }
    }

    // Save results to state and localStorage for persistence
    setDiagnosticData(results)
    localStorage.setItem('bybit_diagnostics', JSON.stringify(results, null, 2))

    console.log('\n🎉 All diagnostics completed!')
    console.log('📁 Results saved to localStorage as "bybit_diagnostics"')

    setIsRunningDiagnostics(false)
  }

  const exportDiagnostics = () => {
    const dataStr = JSON.stringify(diagnosticData, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `bybit_diagnostics_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const copyToClipboard = (data: any) => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2))
    alert('Data copied to clipboard!')
  }

  // Get storage info on component mount
  useEffect(() => {
    const getStorageInfo = async () => {
      try {
        const info = await window.electronAPI.app.getStorageInfo()
        setStorageInfo(info)
        setUserDataPath(info.currentPath)
      } catch (error) {
        console.error('Failed to get storage info:', error)
      }
    }
    getStorageInfo()
  }, [])

  const exportBackup = async () => {
    try {
      setBackupStatus('Exporting...')

      const result = await window.electronAPI.dialog.showSaveDialog({
        title: 'Export Trade Harbour Backup',
        defaultPath: `TradeHarbour-backup-${new Date().toISOString().slice(0, 10)}.json`,
        filters: [
          { name: 'JSON Files', extensions: ['json'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      })

      if (result.canceled) {
        setBackupStatus('')
        return
      }

      const exportResult = await window.electronAPI.backup.exportUserData()

      if (!exportResult.success) {
        setBackupStatus(`Export failed: ${exportResult.error}`)
        return
      }

      // Save the data to the selected file
      const blob = new Blob([exportResult.data], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = result.filePath?.split(/[\\\/]/).pop() || 'backup.json'
      link.click()
      URL.revokeObjectURL(url)

      setBackupStatus('Backup exported successfully!')
      setTimeout(() => setBackupStatus(''), 3000)
    } catch (error) {
      setBackupStatus(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setTimeout(() => setBackupStatus(''), 5000)
    }
  }

  const importBackup = async () => {
    try {
      setBackupStatus('Importing...')

      const result = await window.electronAPI.dialog.showOpenDialog({
        title: 'Import Trade Harbour Backup',
        properties: ['openFile'],
        filters: [
          { name: 'JSON Files', extensions: ['json'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      })

      if (result.canceled || !result.filePaths?.[0]) {
        setBackupStatus('')
        return
      }

      const confirmed = window.confirm(
        'This will replace your current account data and settings. A backup of your current data will be created automatically. Continue?'
      )

      if (!confirmed) {
        setBackupStatus('')
        return
      }

      const importResult = await window.electronAPI.backup.importUserData(result.filePaths[0])

      if (!importResult.success) {
        setBackupStatus(`Import failed: ${importResult.error}`)
        return
      }

      setBackupStatus('Backup imported successfully! Please restart the application for changes to take effect.')
      setTimeout(() => setBackupStatus(''), 10000)
    } catch (error) {
      setBackupStatus(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setTimeout(() => setBackupStatus(''), 5000)
    }
  }

  const openDataFolder = () => {
    if (userDataPath) {
      window.electronAPI.shell.openExternal(`file://${userDataPath}`)
    }
  }

  const switchStorageMode = async (newMode: 'portable' | 'system') => {
    if (!storageInfo) return

    const confirmed = window.confirm(
      `Switch to ${newMode} mode?\n\n` +
      `Current: ${storageInfo.currentPath}\n` +
      `New: ${newMode === 'portable' ? storageInfo.portablePath : storageInfo.systemPath}\n\n` +
      `Your data will be copied to the new location. Continue?`
    )

    if (!confirmed) return

    try {
      setSwitchingMode(true)
      setBackupStatus('Switching storage mode...')

      const result = await window.electronAPI.app.switchStorageMode(newMode)

      if (result.success) {
        // Refresh storage info
        const newInfo = await window.electronAPI.app.getStorageInfo()
        setStorageInfo(newInfo)
        setUserDataPath(newInfo.currentPath)
        setBackupStatus(`Successfully switched to ${newMode} mode! Data is now stored at: ${result.newPath}`)
      } else {
        setBackupStatus(`Failed to switch storage mode: ${result.error}`)
      }
    } catch (error) {
      setBackupStatus(`Error switching storage mode: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setSwitchingMode(false)
      setTimeout(() => setBackupStatus(''), 5000)
    }
  }

  const tabs = [
    { id: 'backup', label: 'Backup & Restore' },
    { id: 'overview', label: 'API Overview' },
    { id: 'balances', label: 'Balances' },
    { id: 'positions', label: 'Positions' },
    { id: 'trades', label: 'Recent Trades' },
    { id: 'closedpnl', label: 'Closed P&L' },
    { id: 'errors', label: 'Errors' }
  ]

  const formatJson = (data: any) => {
    if (!data) return 'No data available'
    return JSON.stringify(data, null, 2)
  }

  const getAccountData = (accountId: string) => {
    return diagnosticData[accountId] || null
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Diagnostics & Backup
        </h1>
        <div className="flex items-center space-x-4">
          <button
            onClick={runDiagnostics}
            disabled={isRunningDiagnostics || accounts.length === 0}
            className={`btn-primary flex items-center space-x-2 ${isRunningDiagnostics ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isRunningDiagnostics ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            )}
            <span>{isRunningDiagnostics ? 'Running...' : 'Run Diagnostics'}</span>
          </button>
          {Object.keys(diagnosticData).length > 0 && (
            <button
              onClick={exportDiagnostics}
              className="btn-secondary flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-4-4m4 4l4-4m-7 7h8" />
              </svg>
              <span>Export JSON</span>
            </button>
          )}
          <button
            onClick={() => {
              clearEquityHistory()
              alert('Equity history cache cleared. Refresh the dashboard to regenerate with new algorithm.')
            }}
            className="btn-secondary flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span>Clear Cache</span>
          </button>
        </div>
      </div>

      {accounts.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted">No accounts configured. Add accounts first to run diagnostics.</p>
        </div>
      )}

      {Object.keys(diagnosticData).length > 0 && (
        <>
          {/* Account Selector */}
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Select Account:
            </label>
            <select
              value={selectedAccount || ''}
              onChange={(e) => setSelectedAccount(e.target.value || null)}
              className="input max-w-xs"
            >
              <option value="">All Accounts</option>
              {accounts.map(account => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 dark:border-dark-600">
            <nav className="flex space-x-8">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="space-y-6">
            {activeTab === 'backup' && (
              <div className="space-y-6">
                {/* Storage Mode Selection */}
                <div className="card p-6">
                  <h3 className="text-lg font-semibold mb-4">⚙️ Storage Mode</h3>
                  {storageInfo ? (
                    <div className="space-y-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                          storageInfo.currentMode === 'system'
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                        }`}
                        onClick={() => !switchingMode && switchStorageMode('system')}>
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium">🗂️ System Mode</h4>
                            {storageInfo.currentMode === 'system' && (
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Current</span>
                            )}
                          </div>
                          <p className="text-sm text-muted mb-2">
                            Data stored in Windows AppData folder. Survives application updates automatically.
                          </p>
                          <div className="text-xs font-mono break-all text-gray-600 dark:text-gray-400">
                            {storageInfo.systemPath}
                          </div>
                        </div>

                        <div className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                          storageInfo.currentMode === 'portable'
                            ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                        }`}
                        onClick={() => !switchingMode && switchStorageMode('portable')}>
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium">💾 Portable Mode</h4>
                            {storageInfo.currentMode === 'portable' && (
                              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Current</span>
                            )}
                          </div>
                          <p className="text-sm text-muted mb-2">
                            Data stored next to the .exe file. Perfect for USB drives and easy backups.
                          </p>
                          <div className="text-xs font-mono break-all text-gray-600 dark:text-gray-400">
                            {storageInfo.portablePath}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4 pt-2">
                        <button
                          onClick={openDataFolder}
                          disabled={!userDataPath}
                          className="btn-secondary text-sm"
                        >
                          📂 Open Current Data Folder
                        </button>
                        <span className="text-xs text-muted">
                          Contains: encrypted account data, settings, trading history
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-muted">Loading storage information...</div>
                  )}
                </div>

                {/* Backup & Restore */}
                <div className="card p-6">
                  <h3 className="text-lg font-semibold mb-4">💾 Backup & Restore</h3>
                  <div className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <h4 className="font-medium">Export Backup</h4>
                        <p className="text-sm text-muted">
                          Save all your account data, settings, and trading history to a secure backup file.
                        </p>
                        <button
                          onClick={exportBackup}
                          className="btn-primary w-full"
                          disabled={backupStatus.includes('...')}
                        >
                          📤 Export Data Backup
                        </button>
                      </div>
                      <div className="space-y-3">
                        <h4 className="font-medium">Import Backup</h4>
                        <p className="text-sm text-muted">
                          Restore your data from a previous backup file. This will replace current data.
                        </p>
                        <button
                          onClick={importBackup}
                          className="btn-secondary w-full"
                          disabled={backupStatus.includes('...')}
                        >
                          📥 Import Data Backup
                        </button>
                      </div>
                    </div>

                    {backupStatus && (
                      <div className={`p-3 rounded ${
                        backupStatus.includes('successfully')
                          ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300'
                          : backupStatus.includes('failed')
                          ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
                          : 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300'
                      }`}>
                        {backupStatus}
                      </div>
                    )}
                  </div>
                </div>

                {/* Upgrade Instructions */}
                <div className="card p-6">
                  <h3 className="text-lg font-semibold mb-4">🚀 Upgrading to New Versions</h3>
                  {storageInfo && (
                    <div className="space-y-4">
                      {storageInfo.currentMode === 'system' ? (
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 rounded">
                          <div className="font-medium text-blue-700 dark:text-blue-300 mb-2">
                            🗂️ System Mode - Automatic Data Persistence
                          </div>
                          <div className="text-sm text-blue-600 dark:text-blue-400 mb-3">
                            Your data automatically persists between versions! No manual backup needed.
                          </div>
                          <div className="space-y-2 text-sm">
                            <div><strong>To upgrade:</strong></div>
                            <ol className="list-decimal list-inside space-y-1 ml-4">
                              <li>Close Trade Harbour</li>
                              <li>Download the new version</li>
                              <li>Replace the old .exe file (or install in new location)</li>
                              <li>Run the new version - all your data will be there!</li>
                            </ol>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 rounded">
                          <div className="font-medium text-green-700 dark:text-green-300 mb-2">
                            💾 Portable Mode - Manual Data Transfer
                          </div>
                          <div className="text-sm text-green-600 dark:text-green-400 mb-3">
                            Data is stored next to the .exe file. You can easily move the entire folder.
                          </div>
                          <div className="space-y-2 text-sm">
                            <div><strong>To upgrade:</strong></div>
                            <ol className="list-decimal list-inside space-y-1 ml-4">
                              <li>Close Trade Harbour</li>
                              <li>Download the new version</li>
                              <li>Copy your <code>data/</code> folder to the new version directory</li>
                              <li>Run the new version - your data will be preserved!</li>
                            </ol>
                            <div className="mt-2 text-xs">
                              <strong>Pro tip:</strong> You can also just replace the .exe file in your current folder to keep all data in place.
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'overview' && (
              <div className="grid gap-6">
                {(selectedAccount ? [accounts.find(a => a.id === selectedAccount)!] : accounts).map(account => {
                  const data = getAccountData(account.id)
                  if (!data) return null

                  return (
                    <div key={account.id} className="card p-6">
                      <h3 className="text-lg font-semibold mb-4">{account.name}</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-gray-50 dark:bg-dark-700 p-3 rounded">
                          <div className="text-sm text-muted">Balances</div>
                          <div className="text-lg font-medium">{data.balances.length}</div>
                        </div>
                        <div className="bg-gray-50 dark:bg-dark-700 p-3 rounded">
                          <div className="text-sm text-muted">Positions</div>
                          <div className="text-lg font-medium">{data.positions.length}</div>
                        </div>
                        <div className="bg-gray-50 dark:bg-dark-700 p-3 rounded">
                          <div className="text-sm text-muted">Trades</div>
                          <div className="text-lg font-medium">{data.trades.length}</div>
                        </div>
                        <div className="bg-gray-50 dark:bg-dark-700 p-3 rounded">
                          <div className="text-sm text-muted">Closed P&L</div>
                          <div className="text-lg font-medium">{data.closedPnL.length}</div>
                        </div>
                      </div>
                      {data.errors.length > 0 && (
                        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
                          <div className="text-sm font-medium text-red-800 dark:text-red-200">
                            {data.errors.length} Error(s)
                          </div>
                          {data.errors.map((error, idx) => (
                            <div key={idx} className="text-xs text-red-600 dark:text-red-400 mt-1">
                              {error}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {activeTab !== 'overview' && (
              <div className="space-y-6">
                {(selectedAccount ? [accounts.find(a => a.id === selectedAccount)!] : accounts).map(account => {
                  const data = getAccountData(account.id)
                  if (!data) return null

                  let sectionData: any = null
                  let sectionTitle = ''

                  switch (activeTab) {
                    case 'balances':
                      sectionData = data.balances
                      sectionTitle = 'Account Balance'
                      break
                    case 'positions':
                      sectionData = data.positions
                      sectionTitle = 'Open Positions'
                      break
                    case 'trades':
                      sectionData = data.trades
                      sectionTitle = 'Recent Trades'
                      break
                    case 'closedpnl':
                      sectionData = data.closedPnL
                      sectionTitle = 'Closed P&L'
                      break
                    case 'errors':
                      sectionData = data.errors
                      sectionTitle = 'API Errors'
                      break
                  }

                  return (
                    <div key={account.id} className="card p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">
                          {account.name} - {sectionTitle}
                        </h3>
                        <button
                          onClick={() => copyToClipboard(sectionData)}
                          className="btn-secondary text-xs"
                        >
                          Copy JSON
                        </button>
                      </div>
                      <div className="bg-gray-50 dark:bg-dark-700 p-4 rounded overflow-auto max-h-96">
                        <pre className="text-xs font-mono whitespace-pre-wrap">
                          {formatJson(sectionData)}
                        </pre>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}