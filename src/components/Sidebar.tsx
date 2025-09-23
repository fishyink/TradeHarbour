import { useAppStore } from '../store/useAppStore'
import { useEffect, useState } from 'react'

interface SidebarProps {
  currentPage: string
  onPageChange: (page: string) => void
}

export const Sidebar = ({ currentPage, onPageChange }: SidebarProps) => {
  const { accounts, accountsData } = useAppStore()
  const [version, setVersion] = useState('1.2.8')
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null)

  useEffect(() => {
    const getVersion = async () => {
      try {
        // @ts-ignore - window.electronAPI is available in Electron environment
        const appVersion = await window.electronAPI.app.getVersion()
        setVersion(appVersion)
      } catch (error) {
        console.log('Running in browser mode, using default version 1.2.7')
      }
    }
    getVersion()
  }, [])

  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 5a2 2 0 012-2h4a2 2 0 012 2v4H8V5z"
          />
        </svg>
      ),
    },
    {
      id: 'accounts',
      label: 'Accounts',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
      ),
      badge: accounts.length,
    },
    {
      id: 'beta',
      label: 'Statistics',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      ),
    },
    {
      id: 'daviddtech-beta',
      label: 'Daviddtech Beta',
      icon: (
        <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
          />
        </svg>
      ),
    },
    {
      id: 'diagnostics',
      label: 'Diagnostics',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      ),
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      ),
    },
  ]

  return (
    <aside className="w-64 bg-white dark:bg-dark-900 border-r border-gray-200 dark:border-dark-700 min-h-screen flex flex-col">
      <nav className="p-4 flex-1">
        <ul className="space-y-2">
          {menuItems.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => onPageChange(item.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors duration-200 ${
                  currentPage === item.id
                    ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-800'
                }`}
              >
                {item.icon}
                <span className="font-medium">{item.label}</span>
                {item.badge !== undefined && (
                  <span className="ml-auto bg-gray-200 dark:bg-dark-700 text-gray-700 dark:text-gray-300 rounded-full px-2 py-1 text-xs font-medium">
                    {item.badge}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>

        {accountsData.length > 0 && (
          <div className="mt-8">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 px-4 mb-3">
              Accounts
            </h3>
            <ul className="space-y-1">
              {accountsData.map((account) => (
                <li key={account.id}>
                  <div className="px-4 py-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {account.name}
                      </span>
                      {account.error ? (
                        <span className="w-2 h-2 bg-red-500 rounded-full" title="Error" />
                      ) : (
                        <span className="w-2 h-2 bg-green-500 rounded-full" title="Connected" />
                      )}
                    </div>
                    {account.balance && (
                      <div className="text-xs text-muted mt-1">
                        ${parseFloat(account.balance.totalEquity).toLocaleString()}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

      </nav>

      {/* Donation Card */}
      <div className="p-4 border-t border-gray-200 dark:border-dark-700">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-lg">🍺</span>
            <div className="text-sm font-medium text-blue-800 dark:text-blue-200">
              Like this Dashboard?
            </div>
          </div>
          <div className="text-xs text-blue-700 dark:text-blue-300 mb-3">
            Buy Fishyink a beer to say thank you!
          </div>
          <div className="space-y-3">
            {/* USDT Address */}
            <div>
              <div className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-2">
                USDT (TRC20):
              </div>
              <div className="flex items-center space-x-2">
                <div className="flex-1 bg-white dark:bg-dark-800 rounded border border-blue-200 dark:border-blue-700 p-2">
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
              <div className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-2">
                Bitcoin (BTC):
              </div>
              <div className="flex items-center space-x-2">
                <div className="flex-1 bg-white dark:bg-dark-800 rounded border border-blue-200 dark:border-blue-700 p-2">
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
          <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-700">
            <div className="text-xs text-blue-600 dark:text-blue-400">
              All donations go directly to development • Thank you for your support! 🙏
            </div>
          </div>
        </div>
      </div>

      {/* Version Number */}
      <div className="px-4 pb-4">
        <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
          v{version}
        </div>
      </div>
    </aside>
  )
}