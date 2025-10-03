import { useEffect } from 'react'
import { useAppStore } from './store/useAppStore'
import { Header } from './components/Header'
import { Sidebar } from './components/Sidebar'
import { Dashboard } from './components/Dashboard'
import { AccountManager } from './components/AccountManager'
import { AccountsList } from './components/AccountsList'
import { ManageAccounts } from './components/ManageAccounts'
import { Settings } from './components/Settings'
import { Calendar } from './components/Calendar'
import { Beta } from './components/Beta'
import { BotsDashboard } from './components/BotsDashboard'
import { Diagnostics } from './components/Diagnostics'
import { TradeHistory } from './components/TradeHistory'
import { CustomCards } from './components/CustomCards'
import { CustomDashboard } from './components/CustomDashboard'
import { AssetsDashboard } from './components/AssetsDashboard'
import { GlobalProgressBar } from './components/GlobalProgressBar'
import { HistoricalFetchModal } from './components/HistoricalFetchModal'
import { useAutoRefresh } from './hooks/useAutoRefresh'
import { useState } from 'react'

type Page = 'dashboard' | 'accounts' | 'add-account' | 'manage-accounts' | 'bots-dashboard' | 'assets-dashboard' | 'settings' | 'calendar' | 'beta' | 'statistics' | 'diagnostics' | 'trade-history' | 'custom-widgets' | 'custom-dashboard'

function App() {
  const { settings, loadData, error, setError } = useAppStore()
  const [currentPage, setCurrentPage] = useState<Page>('dashboard')

  useAutoRefresh()

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [settings.theme])

  const renderPage = () => {
    switch (currentPage) {
      case 'accounts':
        return <AccountsList onPageChange={(page: string) => setCurrentPage(page as Page)} />
      case 'manage-accounts':
        return <ManageAccounts />
      case 'bots-dashboard':
        return <BotsDashboard />
      case 'assets-dashboard':
        return <AssetsDashboard />
      case 'settings':
        return <Settings />
      case 'calendar':
        return <Calendar />
      case 'beta':
        return <Beta />
      case 'statistics':
        return <Beta />
      case 'diagnostics':
        return <Diagnostics />
      case 'trade-history':
        return <TradeHistory />
      case 'custom-widgets':
        return <CustomCards />
      case 'custom-dashboard':
        return <CustomDashboard />
      default:
        return <Dashboard onPageChange={(page: string) => setCurrentPage(page as Page)} />
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Global Progress Bar - Shows at top during historical data fetch */}
      <GlobalProgressBar />

      {/* Historical Fetch Modal - Shows detailed progress for batch fetches */}
      <HistoricalFetchModal />

      <Header currentPage={currentPage} onPageChange={(page: string) => setCurrentPage(page as Page)} />

      <div className="flex">
        <Sidebar currentPage={currentPage} onPageChange={(page: string) => setCurrentPage(page as Page)} />

        <main className="flex-1 p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-red-800 dark:text-red-200">{error}</span>
                <button
                  onClick={() => setError(null)}
                  className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200"
                >
                  ×
                </button>
              </div>
            </div>
          )}

          {renderPage()}
        </main>
      </div>
    </div>
  )
}

export default App