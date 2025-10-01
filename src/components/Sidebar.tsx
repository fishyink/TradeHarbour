import { useAppStore } from '../store/useAppStore'
import { useEffect, useState } from 'react'

interface SidebarProps {
  currentPage: string
  onPageChange: (page: string) => void
}

export const Sidebar = ({ currentPage, onPageChange }: SidebarProps) => {
  const { accounts, accountsData, customCards } = useAppStore()
  const [accountsExpanded, setAccountsExpanded] = useState(currentPage === 'accounts' || currentPage === 'add-account' || currentPage === 'manage-accounts')
  const [customWidgetsExpanded, setCustomWidgetsExpanded] = useState(currentPage === 'custom-dashboard' || currentPage === 'custom-widgets')

  // Auto-expand submenus when on related pages
  useEffect(() => {
    if (currentPage === 'accounts' || currentPage === 'add-account' || currentPage === 'manage-accounts') {
      setAccountsExpanded(true)
    }
    if (currentPage === 'custom-dashboard' || currentPage === 'custom-widgets') {
      setCustomWidgetsExpanded(true)
    }
  }, [currentPage])

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
      hasSubmenu: true,
    },
    {
      id: 'trade-history',
      label: 'Trade History',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      ),
    },
    {
      id: 'calendar',
      label: 'Calendar',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      ),
    },
    {
      id: 'statistics',
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
      id: 'bots-dashboard',
      label: 'Bots Dashboard',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
          />
        </svg>
      ),
    },
    {
      id: 'assets-dashboard',
      label: 'Assets Dashboard',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
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
      id: 'custom-widgets',
      label: 'Custom Widgets',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
          />
        </svg>
      ),
      hasSubmenu: true,
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
              {item.hasSubmenu ? (
                <div>
                  <button
                    onClick={() => {
                      if (item.id === 'custom-widgets') {
                        setCustomWidgetsExpanded(!customWidgetsExpanded)
                        onPageChange(item.id)
                      } else if (item.id === 'accounts') {
                        setAccountsExpanded(!accountsExpanded)
                        onPageChange(item.id)
                      } else {
                        onPageChange(item.id)
                      }
                    }}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors duration-200 ${
                      currentPage === item.id || (item.id === 'custom-widgets' && currentPage === 'custom-dashboard') || (item.id === 'accounts' && (currentPage === 'add-account' || currentPage === 'manage-accounts'))
                        ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-800'
                    }`}
                  >
                    {item.icon}
                    <span className="font-medium">{item.label}</span>
                    <svg
                      className={`w-4 h-4 ml-auto transition-transform ${
                        (item.id === 'custom-widgets' && customWidgetsExpanded) || (item.id === 'accounts' && accountsExpanded) ? 'rotate-90' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                  {/* Accounts Submenu */}
                  {item.id === 'accounts' && accountsExpanded && (
                    <ul className="ml-6 mt-2 space-y-1">
                      <li>
                        <button
                          onClick={() => onPageChange('manage-accounts')}
                          className={`w-full flex items-center space-x-3 px-4 py-2 rounded-lg text-left transition-colors duration-200 ${
                            currentPage === 'manage-accounts'
                              ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-800'
                          }`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span className="font-medium">Manage Accounts</span>
                        </button>
                      </li>
                    </ul>
                  )}

                  {/* Custom Widgets Submenu */}
                  {item.id === 'custom-widgets' && customWidgetsExpanded && (
                    <ul className="ml-6 mt-2 space-y-1">
                      <li>
                        <button
                          onClick={() => onPageChange('custom-dashboard')}
                          className={`w-full flex items-center space-x-3 px-4 py-2 rounded-lg text-left transition-colors duration-200 ${
                            currentPage === 'custom-dashboard'
                              ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-800'
                          }`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                          </svg>
                          <span className="font-medium">Custom Dashboard</span>
                          {customCards.length > 0 && (
                            <span className="ml-auto bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300 rounded-full px-2 py-1 text-xs font-medium">
                              {customCards.filter(card => card.isActive).length}
                            </span>
                          )}
                        </button>
                      </li>
                    </ul>
                  )}
                </div>
              ) : (
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
              )}
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


    </aside>
  )
}