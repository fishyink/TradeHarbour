import { useAppStore } from '../store/useAppStore'
import packageInfo from '../../package.json'

interface HeaderProps {
  currentPage: string
  onPageChange: (page: string) => void
}

export const Header = ({ currentPage, onPageChange }: HeaderProps) => {
  // Prevent unused variable warning
  void currentPage
  void onPageChange
  const { settings, updateSettings, refreshData, lastRefresh, isLoading } = useAppStore()

  const handleThemeToggle = () => {
    updateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' })
  }

  const formatLastRefresh = () => {
    if (!lastRefresh) return 'Never'
    const now = Date.now()
    const diff = now - lastRefresh
    const minutes = Math.floor(diff / 60000)
    const seconds = Math.floor((diff % 60000) / 1000)

    if (minutes > 0) {
      return `${minutes}m ${seconds}s ago`
    }
    return `${seconds}s ago`
  }

  return (
    <header className="bg-white dark:bg-dark-900 border-b border-gray-200 dark:border-dark-700 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-3">
            <div className="text-2xl">⚓</div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Trade Harbour
              </h1>
              <p className="text-sm text-muted">One harbour, one dashboard, all your trades.</p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="text-xs text-muted">
            <div>v{packageInfo.version}</div>
            <div>Last updated: {formatLastRefresh()}</div>
          </div>

          <button
            onClick={refreshData}
            disabled={isLoading}
            className="btn-secondary flex items-center space-x-2"
          >
            <svg
              className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <span>Refresh</span>
          </button>


          <button
            onClick={handleThemeToggle}
            className="btn-secondary p-2"
            title={`Switch to ${settings.theme === 'dark' ? 'light' : 'dark'} theme`}
          >
            {settings.theme === 'dark' ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </header>
  )
}