import React, { useState, useEffect } from 'react'
import { useAppStore } from '../store/useAppStore'
import { ExchangeAccount, ExchangeType } from '../types/exchanges'
import { exchangeFactory } from '../services/exchangeFactory'
import { SUPPORTED_EXCHANGES, PRIORITY_BETA_EXCHANGES, isSupportedExchange } from '../constants/exchanges'
import { apiKeyStatusChecker, AccountApiStatus } from '../utils/apiKeyStatus'

export const ManageAccounts = () => {
  const { accounts, addAccount, removeAccount, clearStaleAccountData, refreshAccountData, accountsData, settings, updateSettings, startBatchHistoricalFetch } = useAppStore()
  const [showAddForm, setShowAddForm] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)
  const [editingAccount, setEditingAccount] = useState<ExchangeAccount | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    exchange: 'bybit' as ExchangeType,
    apiKey: '',
    apiSecret: '',
    accessPassphrase: '',
    isTestnet: false,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitStatus, setSubmitStatus] = useState<string>('')
  const [updatingAccounts, setUpdatingAccounts] = useState<Set<string>>(new Set())
  const [updateProgress, setUpdateProgress] = useState<Map<string, { status: string; progress: number; phase: string; details?: string }>>(new Map())
  const [showBetaWarning, setShowBetaWarning] = useState(false)
  const [selectedBetaExchange, setSelectedBetaExchange] = useState<string | null>(null)
  const [allExchanges, setAllExchanges] = useState<string[]>([])
  const [showFetchInfo, setShowFetchInfo] = useState<string | null>(null)
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const [showApiCheckModal, setShowApiCheckModal] = useState(false)
  const [checkingApiStatus, setCheckingApiStatus] = useState(false)
  const [apiStatuses, setApiStatuses] = useState<AccountApiStatus[]>([])

  // Auto-clean stale account data on component mount
  useEffect(() => {
    clearStaleAccountData()
    exchangeFactory.getSupportedExchangesAsync().then(setAllExchanges)
  }, [clearStaleAccountData])

  const handleExchangeChange = (exchange: string) => {
    // Check if it's a beta exchange and user hasn't seen warning
    if (!isSupportedExchange(exchange) && !settings.betaExchangeWarningShown) {
      setSelectedBetaExchange(exchange)
      setShowBetaWarning(true)
    } else {
      setFormData({ ...formData, exchange: exchange as ExchangeType })
    }
  }

  const confirmBetaExchange = () => {
    if (selectedBetaExchange) {
      setFormData({ ...formData, exchange: selectedBetaExchange as ExchangeType })
      updateSettings({ betaExchangeWarningShown: true })
      setShowBetaWarning(false)
      setSelectedBetaExchange(null)
    }
  }

  const cancelBetaExchange = () => {
    setShowBetaWarning(false)
    setSelectedBetaExchange(null)
  }

  const getSortedExchanges = () => {
    const favorites = settings.favoriteExchanges || []
    const enabledExchanges = settings.enabledExchanges || ['bybit', 'blofin', 'toobit']

    // Filter all exchanges to only show enabled ones
    const filteredExchanges = allExchanges.filter(e => enabledExchanges.includes(e))

    const supported = filteredExchanges.filter(e => SUPPORTED_EXCHANGES.includes(e as any))
    const priorityBeta = filteredExchanges.filter(e => PRIORITY_BETA_EXCHANGES.includes(e as any))
    const otherBeta = filteredExchanges.filter(e =>
      !SUPPORTED_EXCHANGES.includes(e as any) && !PRIORITY_BETA_EXCHANGES.includes(e as any)
    )

    // Sort supported: favorites first, then alphabetically
    const sortedSupported = supported.sort((a, b) => {
      const aFav = favorites.includes(a)
      const bFav = favorites.includes(b)
      if (aFav && !bFav) return -1
      if (!aFav && bFav) return 1
      return a.localeCompare(b)
    })

    // Sort priority beta (toobit, blofin): favorites first, then alphabetically
    const sortedPriorityBeta = priorityBeta.sort((a, b) => {
      const aFav = favorites.includes(a)
      const bFav = favorites.includes(b)
      if (aFav && !bFav) return -1
      if (!aFav && bFav) return 1
      return a.localeCompare(b)
    })

    // Sort other beta: favorites first, then alphabetically
    const sortedOtherBeta = otherBeta.sort((a, b) => {
      const aFav = favorites.includes(a)
      const bFav = favorites.includes(b)
      if (aFav && !bFav) return -1
      if (!aFav && bFav) return 1
      return a.localeCompare(b)
    })

    // Combine priority beta at top, then other beta
    const combinedBeta = [...sortedPriorityBeta, ...sortedOtherBeta]

    return { supported: sortedSupported, beta: combinedBeta }
  }

  const censorApiKey = (apiKey: string): string => {
    if (!apiKey) return '••••••••'
    if (apiKey.length <= 8) return '••••••••'
    return apiKey.substring(0, 4) + '••••••••••••' + apiKey.substring(apiKey.length - 4)
  }

  const resetForm = () => {
    setFormData({
      name: '',
      exchange: 'bybit' as ExchangeType,
      apiKey: '',
      apiSecret: '',
      accessPassphrase: '',
      isTestnet: false,
    })
    setSubmitError(null)
    setEditingAccount(null)
    setFocusedField(null)
  }

  // Exchange-specific instructions
  const getExchangeInstructions = (exchange: string) => {
    const instructions: Record<string, any> = {
      bybit: {
        title: 'Bybit API Setup',
        steps: [
          { id: 'name,exchange', title: 'Step 1: Create New Key', content: 'Click "Create New Key" button (orange button, top right) and select "System-generated API Keys"' },
          { id: 'none', title: 'Step 2: Configure API Key', content: 'Enter an API Key Name. Select Read-Only permissions only (never enable trading or withdrawal).\n\nOptionally add your fixed IP address to prevent the API key from expiring after 90 days.' },
          { id: 'none', title: 'Step 3: Select Permissions', content: 'Select UNIFIED TRADING and ASSETS checkboxes, then click Submit' },
          { id: 'none', title: 'Step 4: Complete Authentication', content: 'Follow Bybit\'s authentication steps (email/2FA verification)' },
          { id: 'apiKey,apiSecret,isTestnet', title: 'Step 5: Copy Credentials', content: 'Copy the API Key and Secret, paste them into Trade Harbour, select Mainnet/Testnet, then click Add Account.\n\nNote: The secret is only shown once!' }
        ],
        securityTips: [
          'Always use Read-Only API keys',
          'Never grant trading or withdrawal permissions',
          'Add IP whitelist for enhanced security (optional)',
          'The API Secret is only shown once - copy it immediately',
          'Select Mainnet for live accounts, Testnet for demo'
        ],
        apiLink: 'https://www.bybit.com/app/user/api-management'
      },
      blofin: {
        title: 'BloFin API Setup',
        steps: [
          { id: 'name,exchange', title: 'Step 1: Open API Management', content: 'Visit the BloFin API Management page and click the orange "Create API Key" button (top right)' },
          { id: 'none', title: 'Step 2: Select Application Type', content: '⚠️ IMPORTANT: Choose "Connect to Third Party Applications" and set Application Name to "CCXT". This is critical for proper API functionality.' },
          { id: 'apiKey', title: 'Step 3: Create & Copy API Key', content: 'Enter your desired API Key Name, then copy the generated API Key and paste it into Trade Harbour' },
          { id: 'accessPassphrase', title: 'Step 4: Set Passphrase', content: 'Create a passphrase (you choose this), copy it to Trade Harbour, give Read permissions only, then click Next' },
          { id: 'apiSecret', title: 'Step 5: Complete & Copy Secret', content: 'Follow BloFin\'s authentication steps (email/2FA), then copy the API Secret to Trade Harbour and click Add Account' }
        ],
        securityTips: [
          'BloFin is in BETA - use at your own risk',
          'Application Name MUST be "CCXT" (case-sensitive)',
          'Only enable Read permissions - never trading or withdrawal',
          'Store your passphrase securely - you created it yourself',
          'Test with small accounts first'
        ],
        apiLink: 'https://blofin.com/account/apis'
      },
      toobit: {
        title: 'Toobit API Setup',
        steps: [
          { id: 'exchange', title: 'Step 1: Login to Toobit', content: 'Visit Toobit.com and login to your account' },
          { id: 'name', title: 'Step 2: Navigate to API Management', content: 'Go to Account → API Management or Settings → API' },
          { id: 'apiKey', title: 'Step 3: Create API Key', content: 'Create a new API key with read-only permissions. Do not enable spot trading or withdrawal.' },
          { id: 'apiSecret', title: 'Step 4: Copy API Credentials', content: 'Copy both API Key and Secret. The secret is only shown once during creation.' }
        ],
        securityTips: [
          'Toobit is in BETA - limited support',
          'Use read-only keys only',
          'Report any issues on Discord',
          'Data accuracy not guaranteed'
        ],
        apiLink: 'https://www.toobit.com/en-US/user/api'
      }
    }

    // Generic fallback for all other exchanges
    const genericInstructions = {
      title: `${exchange.charAt(0).toUpperCase() + exchange.slice(1)} API Setup`,
      steps: [
        { id: 'exchange', title: 'Step 1: Login to Exchange', content: `Visit ${exchange.charAt(0).toUpperCase() + exchange.slice(1)} and login to your account` },
        { id: 'name', title: 'Step 2: Find API Settings', content: 'Navigate to Account Settings or Profile → API Management' },
        { id: 'apiKey', title: 'Step 3: Create API Key', content: 'Create a new API key with read-only or view-only permissions. Never enable trading.' },
        { id: 'apiSecret', title: 'Step 4: Copy Credentials', content: 'Copy the API Key and Secret. Some exchanges also require a passphrase.' },
        { id: 'accessPassphrase', title: 'Step 5: Passphrase (if required)', content: 'If your exchange requires a passphrase, enter it below. Check your exchange documentation.' }
      ],
      securityTips: [
        'This exchange is EXPERIMENTAL - use at your own risk',
        'Always use read-only API keys',
        'Test with small amounts first',
        'Check exchange documentation for specific API setup steps'
      ]
    }

    return instructions[exchange] || genericInstructions
  }

  const handleAdd = () => {
    resetForm()
    setShowAddForm(true)
  }

  const handleEdit = (account: ExchangeAccount) => {
    setFormData({
      name: account.name,
      exchange: account.exchange,
      apiKey: account.apiKey,
      apiSecret: account.apiSecret,
      accessPassphrase: account.accessPassphrase || '',
      isTestnet: account.isTestnet,
    })
    setEditingAccount(account)
    setShowEditForm(true)
  }

  const handleCancel = () => {
    setShowAddForm(false)
    setShowEditForm(false)
    resetForm()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)
    setSubmitStatus('')
    setIsSubmitting(true)

    try {
      // Validate form
      if (!formData.name.trim() || !formData.apiKey.trim() || !formData.apiSecret.trim()) {
        throw new Error('Please fill in all required fields')
      }

      // Test the API connection
      const api = exchangeFactory.getAPI(formData.exchange)

      const testAccount: ExchangeAccount = {
        id: editingAccount?.id || `${formData.exchange}-${Date.now()}`,
        name: formData.name.trim(),
        exchange: formData.exchange,
        apiKey: formData.apiKey.trim(),
        apiSecret: formData.apiSecret.trim(),
        accessPassphrase: formData.accessPassphrase?.trim() || undefined,
        isTestnet: formData.isTestnet,
        createdAt: editingAccount?.createdAt || Date.now(),
      }

      // Test connection
      setSubmitStatus('Verifying API credentials...')
      await api.getAccountBalance(testAccount)
      setSubmitStatus('Saving account...')

      // If test succeeds, add/update the account
      await addAccount(testAccount)

      // Close form and reset FIRST to unblock UI
      setShowAddForm(false)
      setShowEditForm(false)
      setIsSubmitting(false)
      setSubmitStatus('')
      resetForm()

      // THEN fetch historical data in the background (non-blocking)
      if (!editingAccount) {
        console.log('🆕 New account added, queuing historical data fetch in background...')
        // Use setTimeout to ensure UI updates first, then start background fetch
        setTimeout(async () => {
          try {
            await startBatchHistoricalFetch([testAccount.id])
            console.log('✅ Background historical data fetch completed')
          } catch (error) {
            console.error('Background historical data fetch failed:', error)
            // Silent fail - account is already added
          }
        }, 100)
      }

    } catch (error) {
      console.error('Failed to add/update account:', error)
      setSubmitError(error instanceof Error ? error.message : 'Failed to connect to exchange')
      setIsSubmitting(false)
      setSubmitStatus('')
    }
  }

  const handleDelete = async (accountId: string, accountName: string) => {
    if (window.confirm(`Are you sure you want to remove the account "${accountName}"? This action cannot be undone.`)) {
      try {
        await removeAccount(accountId)
      } catch (error) {
        console.error('Failed to remove account:', error)
      }
    }
  }

  const handleUpdateAccount = async (accountId: string) => {
    const account = accounts.find(acc => acc.id === accountId)
    if (!account) return

    try {
      setUpdatingAccounts(prev => new Set(prev).add(accountId))

      await refreshAccountData(accountId, (status: string, progress: number) => {
        // Map the generic status to more detailed progress information
        let phase = 'Initializing'
        let details = ''

        if (status.includes('account balance')) {
          phase = 'Account Balance'
          details = 'Fetching current balance and positions'
        } else if (status.includes('historical data')) {
          phase = 'Historical Data'
          details = 'Retrieving trade history and performance metrics'
        } else if (status.includes('Processing')) {
          phase = 'Processing Data'
          details = 'Calculating performance metrics and statistics'
        } else if (status.includes('Finalizing')) {
          phase = 'Finalizing'
          details = 'Completing data synchronization'
        }

        setUpdateProgress(prev => {
          const newMap = new Map(prev)
          newMap.set(accountId, {
            status,
            progress,
            phase,
            details
          })
          return newMap
        })
      })
    } catch (error) {
      console.error('Failed to update account:', error)
    } finally {
      setUpdatingAccounts(prev => {
        const newSet = new Set(prev)
        newSet.delete(accountId)
        return newSet
      })
      setUpdateProgress(prev => {
        const newMap = new Map(prev)
        newMap.delete(accountId)
        return newMap
      })
    }
  }

  const getAccountData = (accountId: string) => {
    return accountsData.find(data => data.id === accountId)
  }

  const formatLastUpdated = (timestamp: number | undefined): string => {
    if (!timestamp) return 'Never'
    const updated = new Date(timestamp)
    return updated.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleCheckApiKeys = async () => {
    if (accounts.length === 0) return

    setShowApiCheckModal(true)
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

  if (showAddForm || showEditForm) {
    return (
      <>
        {/* Beta Exchange Warning Modal */}
        {showBetaWarning && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex items-center space-x-3 mb-4">
                <svg className="w-8 h-8 text-yellow-600 dark:text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Beta Exchange Warning
                </h3>
              </div>
              <div className="space-y-3 mb-6">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  You've selected <strong className="capitalize">{selectedBetaExchange}</strong>, which is a <strong>beta exchange</strong>.
                </p>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    ⚠️ <strong>Important:</strong> Beta exchanges have limited testing and may not work as expected. Features might be incomplete or have bugs.
                  </p>
                </div>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-disc list-inside">
                  <li>Use at your own risk</li>
                  <li>Data accuracy not guaranteed</li>
                  <li>Report issues on Discord</li>
                </ul>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={cancelBetaExchange}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmBetaExchange}
                  className="flex-1 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg"
                >
                  I Understand, Continue
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {showEditForm ? 'Edit Account' : 'Add New Account'}
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {showEditForm ? 'Update your account settings below.' : 'Connect a new trading account to Trade Harbour.'}
            </p>
          </div>

        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg overflow-hidden">
          <div className="grid grid-cols-2 gap-0">
            {/* Left Column - Form Fields */}
            <div className="p-6 border-r border-gray-200 dark:border-gray-700">
              <form onSubmit={handleSubmit} className="space-y-6">
            {submitError && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <div className="text-sm text-red-700 dark:text-red-300">{submitError}</div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Account Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                onFocus={() => setFocusedField('name')}
                onBlur={() => setFocusedField(null)}
                className="input"
                placeholder="My Trading Account"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Exchange *
              </label>
              <select
                value={formData.exchange}
                onChange={(e) => handleExchangeChange(e.target.value)}
                onFocus={() => setFocusedField('exchange')}
                onBlur={() => setFocusedField(null)}
                className="input"
                required
              >
                <optgroup label="✅ Supported Exchanges">
                  {getSortedExchanges().supported.map(exchange => (
                    <option key={exchange} value={exchange}>
                      {settings.favoriteExchanges?.includes(exchange) ? '⭐ ' : ''}
                      {exchangeFactory.getExchangeDisplayName(exchange)}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="⚠️ Beta Exchanges (Use at own risk)">
                  {getSortedExchanges().beta.map(exchange => (
                    <option key={exchange} value={exchange}>
                      {settings.favoriteExchanges?.includes(exchange) ? '⭐ ' : ''}
                      {exchangeFactory.getExchangeDisplayName(exchange)}
                    </option>
                  ))}
                </optgroup>
              </select>
              {!isSupportedExchange(formData.exchange) && (
                <p className="mt-2 text-xs text-yellow-600 dark:text-yellow-400">
                  ⚠️ This is a beta exchange with limited testing. Use at your own risk.
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                API Key *
              </label>
              <input
                type="text"
                value={formData.apiKey}
                onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                onFocus={() => setFocusedField('apiKey')}
                onBlur={() => setFocusedField(null)}
                className="input font-mono"
                placeholder="Enter your API key"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                API Secret *
              </label>
              <input
                type="password"
                value={formData.apiSecret}
                onChange={(e) => setFormData({ ...formData, apiSecret: e.target.value })}
                onFocus={() => setFocusedField('apiSecret')}
                onBlur={() => setFocusedField(null)}
                className="input font-mono"
                placeholder="Enter your API secret"
                required
              />
            </div>

            {/* Passphrase field - only shown for exchanges that require it */}
            {(formData.exchange === 'blofin' || formData.exchange === 'okx' || formData.exchange === 'kucoin') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  API Passphrase *
                </label>
                <input
                  type="password"
                  value={formData.accessPassphrase}
                  onChange={(e) => setFormData({ ...formData, accessPassphrase: e.target.value })}
                  onFocus={() => setFocusedField('accessPassphrase')}
                  onBlur={() => setFocusedField(null)}
                  className="input font-mono"
                  placeholder="Enter your API passphrase"
                  required
                />
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Some exchanges require a passphrase when creating API keys. Check your exchange's API settings.
                </p>
              </div>
            )}

            <div className="flex items-center">
              <input
                type="checkbox"
                id="isTestnet"
                checked={formData.isTestnet}
                onChange={(e) => setFormData({ ...formData, isTestnet: e.target.checked })}
                onFocus={() => setFocusedField('isTestnet')}
                onBlur={() => setFocusedField(null)}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label htmlFor="isTestnet" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                Testnet Account
              </label>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={handleCancel}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary"
              >
                {isSubmitting ? (submitStatus || (showEditForm ? 'Updating...' : 'Adding...')) : (showEditForm ? 'Update Account' : 'Add Account')}
              </button>
            </div>
          </form>
            </div>

            {/* Right Column - Instructions Panel */}
            <div className="p-6 bg-gray-50 dark:bg-gray-900/50 overflow-y-auto max-h-[600px]">
              {(() => {
                const instructions = getExchangeInstructions(formData.exchange)
                return (
                  <div className="space-y-6">
                    {/* Header */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        📘 {instructions.title}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Follow these steps to set up your API keys
                      </p>
                      {/* Subtle API Link at Top */}
                      {instructions.apiLink && (
                        <button
                          onClick={() => window.electronAPI.shell.openExternal(instructions.apiLink!)}
                          className="inline-flex items-center space-x-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline cursor-pointer mt-1"
                        >
                          <span>🔗 {formData.exchange.charAt(0).toUpperCase() + formData.exchange.slice(1)} API Page</span>
                        </button>
                      )}
                    </div>

                    {/* Steps */}
                    <div className="space-y-3">
                      {instructions.steps.map((step: any, index: number) => {
                        // Support multiple field IDs separated by comma
                        const stepIds = step.id.split(',')
                        const isActive = focusedField && stepIds.includes(focusedField)
                        const isFirstStep = index === 0
                        return (
                          <div
                            key={index}
                            className={`p-4 rounded-lg border-l-4 transition-all duration-200 ${
                              isActive
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md'
                                : 'border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800'
                            }`}
                          >
                            <h4 className={`text-sm font-semibold mb-1 ${
                              isActive ? 'text-blue-700 dark:text-blue-400' : 'text-gray-900 dark:text-white'
                            }`}>
                              {step.title}
                            </h4>
                            <p className={`text-sm whitespace-pre-line ${
                              isActive ? 'text-blue-600 dark:text-blue-300' : 'text-gray-600 dark:text-gray-400'
                            }`}>
                              {step.content}
                            </p>
                            {isFirstStep && instructions.apiLink && (
                              <button
                                onClick={() => window.electronAPI.shell.openExternal(instructions.apiLink!)}
                                className="mt-2 inline-flex items-center space-x-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 cursor-pointer"
                              >
                                <span>🔗 Open Page</span>
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                              </button>
                            )}
                          </div>
                        )
                      })}
                    </div>

                    {/* API Link - Show after steps */}
                    {instructions.apiLink && (
                      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                        <button
                          onClick={() => window.electronAPI.shell.openExternal(instructions.apiLink!)}
                          className="inline-flex items-center space-x-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 cursor-pointer"
                        >
                          <span>🔗 Open API Management Page</span>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </button>
                      </div>
                    )}

                    {/* Security Tips */}
                    <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                        🔒 Security Tips
                      </h4>
                      <ul className="space-y-2">
                        {instructions.securityTips.map((tip: string, index: number) => (
                          <li key={index} className="flex items-start space-x-2 text-sm text-gray-600 dark:text-gray-400">
                            <svg className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Local Storage Notice */}
                    <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                        <div className="flex items-start space-x-2">
                          <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <p className="text-xs text-blue-800 dark:text-blue-200">
                            <strong>Your data stays local:</strong> API keys are encrypted with AES-256 and stored only on your computer. Trade Harbour never sends your credentials anywhere.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })()}
            </div>
          </div>
        </div>
        </div>
      </>
    )
  }

  return (
    <>
      {/* API Check Modal */}
      {showApiCheckModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                API Key Status
              </h3>
            </div>

            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {checkingApiStatus ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="ml-3 text-gray-700 dark:text-gray-300">Checking API keys...</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {apiStatuses.map((accountStatus) => (
                    <div
                      key={accountStatus.accountId}
                      className={`p-4 rounded-lg border-l-4 ${
                        accountStatus.status.isValid
                          ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                          : 'border-red-500 bg-red-50 dark:bg-red-900/20'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div
                            className={`w-3 h-3 rounded-full ${
                              accountStatus.status.isValid ? 'bg-green-500' : 'bg-red-500'
                            }`}
                          ></div>
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">
                              {accountStatus.accountName}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                              {accountStatus.exchange}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div
                            className={`text-sm font-medium ${
                              accountStatus.status.isValid
                                ? 'text-green-700 dark:text-green-400'
                                : 'text-red-700 dark:text-red-400'
                            }`}
                          >
                            {accountStatus.status.isValid ? 'Active' : 'Invalid'}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(accountStatus.status.lastChecked).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                      {accountStatus.status.errorMessage && (
                        <div className="mt-2 text-sm text-red-600 dark:text-red-400">
                          {accountStatus.status.errorMessage}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
              <div className="flex items-start space-x-2 mb-4">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <strong>Tip:</strong> API keys are checked automatically when fetching account data. Use this manual check to verify status without triggering data refresh.
                </p>
              </div>
              <button
                onClick={() => setShowApiCheckModal(false)}
                className="btn-primary w-full"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="md:flex md:items-center md:justify-between mb-8">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Manage Accounts
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Add, edit, and remove your trading accounts. API keys are encrypted and stored securely.
            </p>
          </div>
        <div className="mt-4 md:mt-0 flex items-center space-x-3">
          <button
            onClick={handleCheckApiKeys}
            disabled={accounts.length === 0}
            className="btn-secondary flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Check APIs</span>
          </button>

          <div className="relative group">
            <button
              onClick={async () => {
                if (accounts.length === 0) {
                  alert('No accounts found. Please add an account first.')
                  return
                }

                // Fetch data for all accounts using batch method (shows modal)
                await startBatchHistoricalFetch(accounts.map(acc => acc.id))
              }}
              className="btn-secondary flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Force Get All Historical Data</span>
              <svg
                className="w-4 h-4 text-blue-500 dark:text-blue-400 cursor-help"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                onMouseEnter={() => setShowFetchInfo('global')}
                onMouseLeave={() => setShowFetchInfo(null)}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>

            {/* Tooltip */}
            {showFetchInfo === 'global' && (
              <div className="absolute top-full left-0 mt-2 w-80 p-3 bg-gray-900 dark:bg-gray-800 text-white text-xs rounded-lg shadow-xl z-50">
                <div className="font-semibold mb-1">Force Fetch All Historical Data</div>
                <p className="text-gray-300 dark:text-gray-400">
                  Fetches all available trading history from all your exchange accounts.
                  This will retrieve trades, positions, and P&L data for each account sequentially.
                  Progress shown at top of screen with a 0-100% loading bar.
                </p>
                <div className="absolute top-0 left-4 transform -translate-y-1/2 rotate-45 w-2 h-2 bg-gray-900 dark:bg-gray-800"></div>
              </div>
            )}
          </div>

          <button
            onClick={handleAdd}
            className="btn-primary"
          >
            Add Account
          </button>
        </div>
      </div>

      {/* Progress Status Bar */}
      {Array.from(updateProgress.entries()).map(([accountId, progress]) => {
        const account = accounts.find(acc => acc.id === accountId)
        if (!account) return null

        return (
          <div key={accountId} className="mb-6 bg-gray-800 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-lg font-medium text-white">
                  Updating {account.name}
                </span>
              </div>
              <span className="text-lg font-bold text-white">{progress.progress}%</span>
            </div>

            <div className="mb-3">
              <div className="text-sm text-blue-300 font-medium mb-1">
                {progress.phase}
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress.progress}%` }}
                ></div>
              </div>
            </div>

            <div className="flex justify-between text-sm text-gray-400">
              <span>Current Phase:</span>
              <span className="text-gray-300">{progress.details}</span>
            </div>

            {progress.progress === 100 && (
              <div className="mt-2 text-sm text-green-400">
                <span>✓ Update completed successfully</span>
              </div>
            )}
          </div>
        )
      })}

      {accounts.length === 0 ? (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No accounts configured</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Get started by adding your first trading account.
          </p>
          <div className="mt-6">
            <button
              onClick={handleAdd}
              className="btn-primary"
            >
              Add Your First Account
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg overflow-hidden">
          <div className="overflow-x-auto overflow-y-hidden">
            <table className="w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Account
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Exchange
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    API Key
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Last Updated
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {accounts.map((account) => {
                  const accountData = getAccountData(account.id)
                  const isUpdating = updatingAccounts.has(account.id)

                  return (
                    <tr key={account.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-3">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {account.name}
                          </div>
                          {account.isTestnet && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300">
                              Testnet
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white capitalize">
                          {account.exchange}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <code className="text-sm font-mono text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded-md break-all inline-block max-w-xs">
                          {censorApiKey(account.apiKey)}
                        </code>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {new Date(account.createdAt).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                          })}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-sm text-gray-900 dark:text-white">
                            {formatLastUpdated(accountData?.lastUpdated)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleUpdateAccount(account.id)}
                            disabled={isUpdating}
                            className="btn-secondary text-sm"
                          >
                            {isUpdating ? 'Updating...' : 'Update'}
                          </button>

                          <button
                            onClick={() => handleEdit(account)}
                            className="btn-secondary text-sm"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(account.id, account.name)}
                            className="btn-danger text-sm"
                          >
                            Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* API Key Best Practices */}
      <div className="mt-8 space-y-4">
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 18.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div className="text-sm text-amber-800 dark:text-amber-200">
              <strong>Important:</strong> Always use <strong>read-only API keys</strong> for Trade Harbour. Never create API keys with trading or withdrawal permissions for security.
            </div>
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm text-blue-800 dark:text-blue-200">
              <strong>API Key Expiry:</strong> If you don't whitelist your IP when creating API keys, they may expire in 90 days.
              You can click "Edit" to update your keys in 90 days. With IP whitelisting enabled, no renewal is needed.
            </div>
          </div>
        </div>
      </div>
      </div>
    </>
  )
}