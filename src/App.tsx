import { useEffect } from 'react'
import { useAppStore } from './store/useAppStore'
import { Header } from './components/Header'
import { Sidebar } from './components/Sidebar'
import { Dashboard } from './components/Dashboard'
import { AccountManager } from './components/AccountManager'
import { Settings } from './components/Settings'
import { Calendar } from './components/Calendar'
import { Beta } from './components/Beta'
import { DaviddtechBeta } from './components/DaviddtechBeta'
import { Diagnostics } from './components/Diagnostics'
import { TradeHistory } from './components/TradeHistory'
import { CustomCards } from './components/CustomCards'
import { CustomDashboard } from './components/CustomDashboard'
import { useAutoRefresh } from './hooks/useAutoRefresh'
import { useState } from 'react'

type Page = 'dashboard' | 'accounts' | 'settings' | 'calendar' | 'beta' | 'daviddtech-beta' | 'diagnostics' | 'trade-history' | 'custom-cards' | 'custom-dashboard'

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
        return <AccountManager />
      case 'settings':
        return <Settings />
      case 'calendar':
        return <Calendar />
      case 'beta':
        return <Beta />
      case 'daviddtech-beta':
        return <DaviddtechBeta />
      case 'diagnostics':
        return <Diagnostics />
      case 'trade-history':
        return <TradeHistory />
      case 'custom-cards':
        return <CustomCards />
      case 'custom-dashboard':
        return <CustomDashboard />
      default:
        return <Dashboard onPageChange={(page: string) => setCurrentPage(page as Page)} />
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
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