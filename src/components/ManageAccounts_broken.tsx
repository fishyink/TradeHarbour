import React, { useState, useEffect } from 'react'
import { useAppStore } from '../store/useAppStore'
import { ExchangeAccount, ExchangeType } from '../types/exchanges'
import { exchangeFactory } from '../services/exchangeFactory'

export const ManageAccounts = () => {
  const { accounts, addAccount, removeAccount, clearStaleAccountData, refreshAccountData, accountsData } = useAppStore()
  const [showAddForm, setShowAddForm] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)
  const [editingAccount, setEditingAccount] = useState<ExchangeAccount | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    exchange: 'bybit' as ExchangeType,
    apiKey: '',
    apiSecret: '',
    isTestnet: false,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [updatingAccounts, setUpdatingAccounts] = useState<Set<string>>(new Set())
  const [updateProgress, setUpdateProgress] = useState<Map<string, { status: string; progress: number }>>(new Map())

  // Auto-clean stale account data on component mount
  useEffect(() => {
    clearStaleAccountData()
  }, [clearStaleAccountData])

  const censorApiKey = (apiKey: string): string => {
    if (!apiKey) return '••••••••'
    if (apiKey.length <= 8) return '••••••••'
    return apiKey.substring(0, 4) + '••••••••••••' + apiKey.substring(apiKey.length - 4)
  }

  const censorApiSecret = (apiSecret: string): string => {
    if (!apiSecret) return '••••••••••••••••'
    return '••••••••••••••••••••••••••••••••'
  }

  const resetForm = () => {
    setFormData({
      name: '',
      exchange: 'bybit' as ExchangeType,
      apiKey: '',
      apiSecret: '',
      isTestnet: false,
    })
    setSubmitError(null)
    setEditingAccount(null)
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
        isTestnet: formData.isTestnet,
        createdAt: editingAccount?.createdAt || Date.now(),
      }

      // Test connection
      await api.getAccountBalance(testAccount)

      // If test succeeds, add/update the account
      await addAccount(testAccount)

      // Close form and reset
      setShowAddForm(false)
      setShowEditForm(false)
      resetForm()

    } catch (error) {
      console.error('Failed to add/update account:', error)
      setSubmitError(error instanceof Error ? error.message : 'Failed to connect to exchange')
    } finally {
      setIsSubmitting(false)
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
    try {
      setUpdatingAccounts(prev => new Set(prev).add(accountId))

      await refreshAccountData(accountId, (status: string, progress: number) => {
        setUpdateProgress(prev => {
          const newMap = new Map(prev)
          newMap.set(accountId, { status, progress })
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

  if (showAddForm || showEditForm) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {showEditForm ? 'Edit Account' : 'Add New Account'}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {showEditForm ? 'Update your account settings below.' : 'Connect a new trading account to Trade Harbour.'}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg p-6">
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
                onChange={(e) => setFormData({ ...formData, exchange: e.target.value as ExchangeType })}
                className="input"
                required
              >
                <option value="bybit">Bybit</option>
                <option value="toobit">Toobit</option>
                <option value="blofin">Blofin</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                API Key *
              </label>
              <input
                type="text"
                value={formData.apiKey}
                onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
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
                className="input font-mono"
                placeholder="Enter your API secret"
                required
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="isTestnet"
                checked={formData.isTestnet}
                onChange={(e) => setFormData({ ...formData, isTestnet: e.target.checked })}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label htmlFor="isTestnet" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                Testnet Account
              </label>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Security Note:</strong> Your API keys are encrypted and stored locally. Never share your API keys or secrets with anyone.
                </div>
              </div>
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
                {isSubmitting ? (showEditForm ? 'Updating...' : 'Adding...') : (showEditForm ? 'Update Account' : 'Add Account')}
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  return (
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
        <div className="mt-4 md:mt-0">
          <button
            onClick={handleAdd}
            className="btn-primary"
          >
            Add Account
          </button>
        </div>
      </div>

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
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
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
                  const progress = updateProgress.get(account.id)
                  return (
                    <React.Fragment key={account.id}>
                      <tr className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200">
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
                    <td className="px-6 py-4 whitespace-nowrap">
                      <code className="text-sm font-mono text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded-md">
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
                  {isUpdating && progress && (
                    <tr key={`${account.id}-progress`}>
                      <td colSpan={6} className="px-6 py-3 bg-blue-50 dark:bg-blue-900/20">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-blue-700 dark:text-blue-300 font-medium">
                              Updating {account.name}...
                            </span>
                            <span className="text-blue-600 dark:text-blue-400">
                              {progress.progress}%
                            </span>
                          </div>
                          <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
                            <div
                              className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${progress.progress}%` }}
                            ></div>
                          </div>
                          <div className="text-xs text-blue-600 dark:text-blue-400">
                            {progress.status}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                    </React.Fragment>
                  )
                })
                }
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
  )
}