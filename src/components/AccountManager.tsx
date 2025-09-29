import { useState, useEffect } from 'react'
import { useAppStore } from '../store/useAppStore'
import { AccountHealthScore } from './AccountHealthScore'
import { ExchangeType } from '../types/exchanges'
import { exchangeFactory } from '../services/exchangeFactory'

export const AccountManager = () => {
  const { accounts, accountsData, addAccount, removeAccount, clearStaleAccountData } = useAppStore()
  const [showAddForm, setShowAddForm] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)
  const [editingAccount, setEditingAccount] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    exchange: 'bybit' as ExchangeType,
    apiKey: '',
    apiSecret: '',
    isTestnet: false,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Auto-clean stale account data on component mount
  useEffect(() => {
    clearStaleAccountData()
  }, [clearStaleAccountData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)

    // Validate required fields based on exchange
    const validation = exchangeFactory.validateAccountCredentials({
      id: '', // Will be generated
      name: formData.name,
      exchange: formData.exchange,
      apiKey: formData.apiKey,
      apiSecret: formData.apiSecret,
      isTestnet: formData.isTestnet,
      createdAt: Date.now()
    })

    if (!validation.valid) {
      setSubmitError(validation.errors.join(', '))
      return
    }

    setIsSubmitting(true)
    try {
      await addAccount(formData)
      setFormData({ name: '', exchange: 'bybit', apiKey: '', apiSecret: '', isTestnet: false })
      setShowAddForm(false)
      setSubmitError(null)
    } catch (error) {
      console.error('Failed to add account:', error)
      setSubmitError(error instanceof Error ? error.message : 'Failed to add account')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRemove = async (accountId: string) => {
    if (window.confirm('Are you sure you want to remove this account?')) {
      await removeAccount(accountId)
    }
  }

  const handleEdit = (account: any) => {
    setEditingAccount(account.id)
    setFormData({
      name: account.name,
      exchange: account.exchange || 'bybit',
      apiKey: account.apiKey,
      apiSecret: account.apiSecret,
      isTestnet: account.isTestnet,
    })
    setShowEditForm(true)
    setSubmitError(null)
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)

    // Validate required fields based on exchange
    const validation = exchangeFactory.validateAccountCredentials({
      id: editingAccount || '',
      name: formData.name,
      exchange: formData.exchange,
      apiKey: formData.apiKey,
      apiSecret: formData.apiSecret,
      isTestnet: formData.isTestnet,
      createdAt: Date.now()
    })

    if (!validation.valid) {
      setSubmitError(validation.errors.join(', '))
      return
    }

    setIsSubmitting(true)
    try {
      // Remove the old account and add the updated one
      if (editingAccount) {
        await removeAccount(editingAccount)
        await addAccount(formData)
      }
      setFormData({ name: '', exchange: 'bybit', apiKey: '', apiSecret: '', isTestnet: false })
      setShowEditForm(false)
      setEditingAccount(null)
      setSubmitError(null)
    } catch (error) {
      console.error('Failed to update account:', error)
      setSubmitError(error instanceof Error ? error.message : 'Failed to update account')
    } finally {
      setIsSubmitting(false)
    }
  }

  const maskApiKey = (apiKey: string) => {
    if (apiKey.length <= 8) return '••••••••'
    return apiKey.substring(0, 4) + '••••••••' + apiKey.substring(apiKey.length - 4)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Account Management
        </h1>
        <button
          onClick={() => setShowAddForm(true)}
          className="btn-primary"
        >
          Add Account
        </button>
      </div>

      <div className="card p-6">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4 mb-6">
          <div className="flex items-start space-x-3">
            <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                Security Notice
              </h3>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                <strong>Always use read-only API keys!</strong> Never use API keys with trading permissions.
                This application only needs read access to display your account information.
              </p>
            </div>
          </div>
        </div>

        {accounts.length === 0 && accountsData.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No accounts configured
            </h3>
            <p className="text-muted mb-6">
              Add your first account to start monitoring your trades and balances.
            </p>
            <button
              onClick={() => setShowAddForm(true)}
              className="btn-primary"
            >
              Add Your First Account
            </button>
          </div>
        ) : accounts.length === 0 && accountsData.length > 0 ? (
          <div className="text-center py-12">
            <svg className="w-12 h-12 text-yellow-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Account Configuration Issue
            </h3>
            <p className="text-muted mb-6">
              Account data exists but configuration is missing. Please refresh or add accounts again.
            </p>
            <div className="flex space-x-3 justify-center">
              <button
                onClick={() => {
                  clearStaleAccountData()
                  window.location.reload()
                }}
                className="btn-secondary"
              >
                Clear & Refresh
              </button>
              <button
                onClick={() => setShowAddForm(true)}
                className="btn-primary"
              >
                Add Account
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {accounts.map((account) => (
              <div key={account.id} className="border border-gray-200 dark:border-dark-600 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      {account.name}
                    </h3>
                    <div className="flex items-center space-x-4 mt-1 text-sm text-muted">
                      <span>API Key: {maskApiKey(account.apiKey)}</span>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        account.exchange === 'bybit' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' :
                        'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300'
                      }`}>
                        {exchangeFactory.getExchangeDisplayName(account.exchange || 'bybit')}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        account.isTestnet
                          ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                          : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                      }`}>
                        {account.isTestnet ? 'Testnet' : 'Mainnet'}
                      </span>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(account)}
                      className="btn-secondary text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleRemove(account.id)}
                      className="btn-danger text-sm"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Account Health Score Section */}
      <AccountHealthScore />

      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-dark-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Add Exchange Account
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {submitError && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-3">
                  <p className="text-sm text-red-700 dark:text-red-300">{submitError}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Exchange
                </label>
                <select
                  value={formData.exchange}
                  onChange={(e) => setFormData({ ...formData, exchange: e.target.value as ExchangeType })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-md bg-white dark:bg-dark-800 text-gray-900 dark:text-white"
                  required
                >
                  {exchangeFactory.getSupportedExchanges().map(exchange => (
                    <option key={exchange} value={exchange}>
                      {exchangeFactory.getExchangeDisplayName(exchange)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Account Name
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
                  API Key
                </label>
                <input
                  type="text"
                  value={formData.apiKey}
                  onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                  className="input"
                  placeholder={`Your ${exchangeFactory.getExchangeDisplayName(formData.exchange)} API Key`}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  API Secret
                </label>
                <input
                  type="password"
                  value={formData.apiSecret}
                  onChange={(e) => setFormData({ ...formData, apiSecret: e.target.value })}
                  className="input"
                  placeholder={`Your ${exchangeFactory.getExchangeDisplayName(formData.exchange)} API Secret`}
                  required
                />
              </div>


              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isTestnet"
                  checked={formData.isTestnet}
                  onChange={(e) => setFormData({ ...formData, isTestnet: e.target.checked })}
                  className="mr-2"
                />
                <label htmlFor="isTestnet" className="text-sm text-gray-700 dark:text-gray-300">
                  This is a testnet account
                </label>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Adding...' : 'Add Account'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false)
                    setSubmitError(null)
                    setFormData({ name: '', exchange: 'bybit', apiKey: '', apiSecret: '', isTestnet: false })
                  }}
                  className="btn-secondary flex-1"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Account Modal */}
      {showEditForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-dark-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Edit Account
            </h2>

            <form onSubmit={handleUpdate} className="space-y-4">
              {submitError && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-3">
                  <p className="text-sm text-red-700 dark:text-red-300">{submitError}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Exchange
                </label>
                <select
                  value={formData.exchange}
                  onChange={(e) => setFormData({ ...formData, exchange: e.target.value as ExchangeType })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-md bg-white dark:bg-dark-800 text-gray-900 dark:text-white"
                  required
                >
                  {exchangeFactory.getSupportedExchanges().map(exchange => (
                    <option key={exchange} value={exchange}>
                      {exchangeFactory.getExchangeDisplayName(exchange)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Account Name
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
                  API Key
                </label>
                <input
                  type="text"
                  value={formData.apiKey}
                  onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                  className="input"
                  placeholder={`Your ${exchangeFactory.getExchangeDisplayName(formData.exchange)} API Key`}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  API Secret
                </label>
                <input
                  type="password"
                  value={formData.apiSecret}
                  onChange={(e) => setFormData({ ...formData, apiSecret: e.target.value })}
                  className="input"
                  placeholder={`Your ${exchangeFactory.getExchangeDisplayName(formData.exchange)} API Secret`}
                  required
                />
              </div>


              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="editIsTestnet"
                  checked={formData.isTestnet}
                  onChange={(e) => setFormData({ ...formData, isTestnet: e.target.checked })}
                  className="mr-2"
                />
                <label htmlFor="editIsTestnet" className="text-sm text-gray-700 dark:text-gray-300">
                  This is a testnet account
                </label>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Updating...' : 'Update Account'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditForm(false)
                    setEditingAccount(null)
                    setSubmitError(null)
                    setFormData({ name: '', exchange: 'bybit', apiKey: '', apiSecret: '', isTestnet: false })
                  }}
                  className="btn-secondary flex-1"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}