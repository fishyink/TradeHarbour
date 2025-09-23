import { useState } from 'react'
import { BybitAccount } from '../services/storage'
import { useBotStore } from '../store/useBotStore'

interface BotTrackerProps {
  accounts: BybitAccount[]
  tradingPairs: string[]
}

export const BotTracker = ({ accounts, tradingPairs }: BotTrackerProps) => {
  const { addBot } = useBotStore()

  const [formData, setFormData] = useState({
    name: '',
    startDate: new Date().toISOString().split('T')[0],
    accountId: '',
    tradingPair: '',
    daviddtechLink: '',
    tradingViewLink: '',
    tags: [] as string[],
  })

  const [tagInput, setTagInput] = useState('')

  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Bot name is required'
    }

    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required'
    }

    if (!formData.accountId) {
      newErrors.accountId = 'Please select an account'
    }

    if (!formData.tradingPair) {
      newErrors.tradingPair = 'Please select a trading pair'
    }

    if (formData.daviddtechLink && !isValidUrl(formData.daviddtechLink)) {
      newErrors.daviddtechLink = 'Please enter a valid URL'
    }

    if (formData.tradingViewLink && !isValidUrl(formData.tradingViewLink)) {
      newErrors.tradingViewLink = 'Please enter a valid URL'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const isValidUrl = (url: string) => {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    addBot({
      name: formData.name.trim(),
      startDate: formData.startDate,
      accountId: formData.accountId,
      tradingPair: formData.tradingPair,
      daviddtechLink: formData.daviddtechLink.trim(),
      tradingViewLink: formData.tradingViewLink.trim(),
      tags: formData.tags,
    })

    // Reset form
    setFormData({
      name: '',
      startDate: new Date().toISOString().split('T')[0],
      accountId: '',
      tradingPair: '',
      daviddtechLink: '',
      tradingViewLink: '',
      tags: [],
    })
    setTagInput('')
    setErrors({})
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const addTag = () => {
    const trimmedTag = tagInput.trim()
    if (trimmedTag && !formData.tags.includes(trimmedTag)) {
      setFormData(prev => ({ ...prev, tags: [...prev.tags, trimmedTag] }))
      setTagInput('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }))
  }

  const handleTagKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Bot Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Bot Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-dark-800 text-gray-900 dark:text-white ${
              errors.name
                ? 'border-red-300 dark:border-red-600'
                : 'border-gray-300 dark:border-dark-600'
            }`}
            placeholder="Enter bot name"
          />
          {errors.name && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>}
        </div>

        {/* Start Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Start Date *
          </label>
          <input
            type="date"
            value={formData.startDate}
            onChange={(e) => handleInputChange('startDate', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-dark-800 text-gray-900 dark:text-white ${
              errors.startDate
                ? 'border-red-300 dark:border-red-600'
                : 'border-gray-300 dark:border-dark-600'
            }`}
          />
          {errors.startDate && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.startDate}</p>}
        </div>

        {/* Account */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Account *
          </label>
          <select
            value={formData.accountId}
            onChange={(e) => handleInputChange('accountId', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-dark-800 text-gray-900 dark:text-white ${
              errors.accountId
                ? 'border-red-300 dark:border-red-600'
                : 'border-gray-300 dark:border-dark-600'
            }`}
          >
            <option value="">Select an account</option>
            {accounts.map(account => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
          {errors.accountId && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.accountId}</p>}
        </div>

        {/* Trading Pair */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Trading Pair *
          </label>
          <select
            value={formData.tradingPair}
            onChange={(e) => handleInputChange('tradingPair', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-dark-800 text-gray-900 dark:text-white ${
              errors.tradingPair
                ? 'border-red-300 dark:border-red-600'
                : 'border-gray-300 dark:border-dark-600'
            }`}
          >
            <option value="">Select a trading pair</option>
            {tradingPairs.map(pair => (
              <option key={pair} value={pair}>
                {pair}
              </option>
            ))}
          </select>
          {errors.tradingPair && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.tradingPair}</p>}
        </div>

        {/* Daviddtech Link */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Daviddtech Link
          </label>
          <input
            type="url"
            value={formData.daviddtechLink}
            onChange={(e) => handleInputChange('daviddtechLink', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-dark-800 text-gray-900 dark:text-white ${
              errors.daviddtechLink
                ? 'border-red-300 dark:border-red-600'
                : 'border-gray-300 dark:border-dark-600'
            }`}
            placeholder="https://daviddtech.com/..."
          />
          {errors.daviddtechLink && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.daviddtechLink}</p>}
        </div>

        {/* TradingView Link */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            TradingView Link
          </label>
          <input
            type="url"
            value={formData.tradingViewLink}
            onChange={(e) => handleInputChange('tradingViewLink', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-dark-800 text-gray-900 dark:text-white ${
              errors.tradingViewLink
                ? 'border-red-300 dark:border-red-600'
                : 'border-gray-300 dark:border-dark-600'
            }`}
            placeholder="https://tradingview.com/..."
          />
          {errors.tradingViewLink && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.tradingViewLink}</p>}
        </div>
      </div>

      {/* Tags Section */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Tags
        </label>

        {/* Tag Input */}
        <div className="flex gap-2">
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyPress={handleTagKeyPress}
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter tag and press Enter"
          />
          <button
            type="button"
            onClick={addTag}
            disabled={!tagInput.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Add
          </button>
        </div>

        {/* Tag Display */}
        {formData.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {formData.tags.map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-sm rounded-full"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="ml-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Submit Button */}
      <div className="flex justify-end">
        <button
          type="submit"
          className="btn-primary"
          disabled={accounts.length === 0 || tradingPairs.length === 0}
        >
          Add Bot
        </button>
      </div>

      {/* No Data Warning */}
      {(accounts.length === 0 || tradingPairs.length === 0) && (
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="text-yellow-800 dark:text-yellow-200">
              {accounts.length === 0 && 'No accounts available. '}
              {tradingPairs.length === 0 && 'No trading history found. '}
              Please add accounts and load trading data first.
            </span>
          </div>
        </div>
      )}
    </form>
  )
}