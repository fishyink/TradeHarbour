import { useState } from 'react'
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
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null)
  const [isRunningDiagnostics, setIsRunningDiagnostics] = useState(false)

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

  const tabs = [
    { id: 'overview', label: 'Overview' },
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
          API Diagnostics
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