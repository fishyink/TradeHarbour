import { useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import { AccountHealthScore } from './AccountHealthScore'

export const AccountManager = () => {
  const { accounts, addAccount, removeAccount } = useAppStore()
  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    apiKey: '',
    apiSecret: '',
    isTestnet: false,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)

    if (!formData.name || !formData.apiKey || !formData.apiSecret) {
      setSubmitError('Please fill in all required fields')
      return
    }

    setIsSubmitting(true)
    try {
      await addAccount(formData)
      setFormData({ name: '', apiKey: '', apiSecret: '', isTestnet: false })
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

        {accounts.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No accounts configured
            </h3>
            <p className="text-muted mb-6">
              Add your first Bybit account to start monitoring your trades and balances.
            </p>
            <button
              onClick={() => setShowAddForm(true)}
              className="btn-primary"
            >
              Add Your First Account
            </button>
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
                      <span>API Key: {account.apiKey.substring(0, 8)}...</span>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        account.isTestnet
                          ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                          : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                      }`}>
                        {account.isTestnet ? 'Testnet' : 'Mainnet'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemove(account.id)}
                    className="btn-danger"
                  >
                    Remove
                  </button>
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
              Add Bybit Account
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {submitError && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-3">
                  <p className="text-sm text-red-700 dark:text-red-300">{submitError}</p>
                </div>
              )}

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
                  placeholder="Your Bybit API Key"
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
                  placeholder="Your Bybit API Secret"
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
                    setFormData({ name: '', apiKey: '', apiSecret: '', isTestnet: false })
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