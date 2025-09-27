import { useState } from 'react'
import { useAppStore } from '../store/useAppStore'

export const CustomCards = () => {
  const { customCards, addCustomCard, removeCustomCard, toggleCustomCard, editCustomCard } = useAppStore()
  const [activeTab, setActiveTab] = useState<'add' | 'manage'>('add')
  const [customCode, setCustomCode] = useState('')
  const [fileName, setFileName] = useState('')
  const [editingCard, setEditingCard] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editCode, setEditCode] = useState('')
  const [cardIdea, setCardIdea] = useState('')
  const [generatedPrompt, setGeneratedPrompt] = useState('')
  const [selectedSize, setSelectedSize] = useState<'small' | 'medium' | 'large'>('medium')

  const generateCustomPrompt = () => {
    if (!cardIdea.trim()) {
      alert('Please enter your card idea first!')
      return
    }

    const sizeInstructions = {
      small: 'Create a compact card that fits in a single column (approximately 300px wide). Keep content minimal and focused.',
      medium: 'Create a standard-sized card that can span 1-2 columns (approximately 400-600px wide). This is the default size for most cards.',
      large: 'Create a large card that spans 2-3 columns (approximately 700-900px wide). Use this space for more detailed information or complex layouts.'
    }

    const sizePrompt = `

SIZE REQUIREMENTS:
- Card Size: ${selectedSize.toUpperCase()}
- ${sizeInstructions[selectedSize]}`

    const customPrompt = pluginPrompt.replace(
      '[DESCRIBE WHAT YOU WANT THE CARD TO SHOW]',
      `${cardIdea.trim()}${sizePrompt}`
    )

    setGeneratedPrompt(customPrompt)
  }

  const copyGeneratedPrompt = async () => {
    if (!generatedPrompt) {
      alert('Please generate a prompt first!')
      return
    }

    try {
      await navigator.clipboard.writeText(generatedPrompt)

      // Visual feedback
      const button = document.getElementById('copy-generated-btn')
      if (button) {
        const originalText = button.innerHTML
        button.innerHTML = `
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
          <span>Copied!</span>
        `
        setTimeout(() => {
          button.innerHTML = originalText
        }, 2000)
      }
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = generatedPrompt
      document.body.appendChild(textArea)
      textArea.select()
      try {
        document.execCommand('copy')
        alert('Prompt copied to clipboard!')
      } catch (fallbackErr) {
        alert('Copy failed. Please manually copy the prompt from the text area below.')
      }
      document.body.removeChild(textArea)
    }
  }

  const pluginPrompt = String.raw`# Custom Trading Dashboard Card Generator

You are creating a custom dashboard card for a professional trading dashboard built with React, TypeScript, and TailwindCSS. Follow these specifications exactly for best results.

## TECHNICAL REQUIREMENTS

### Framework & Language:
- React 18+ functional component
- TypeScript with strict typing
- Export as default export
- No external dependencies beyond React

### Styling Requirements:
- Use TailwindCSS classes only
- Follow dark mode support: \`dark:\` prefixes
- Use existing design tokens:
  - Cards: \`card p-6\`
  - Text: \`text-gray-900 dark:text-white\` (primary), \`text-muted\` (secondary)
  - Colors: \`text-success\` (green), \`text-danger\` (red), \`text-primary\` (blue)
  - Backgrounds: \`bg-white dark:bg-dark-800\`
  - Borders: \`border-gray-200 dark:border-gray-600\`

### Data Access:
\`\`\`tsx
import { useAppStore } from '../store/useAppStore'

const { accountsData } = useAppStore()
\`\`\`

## COMPLETE DATA STRUCTURE

### accountsData Array:
Each account contains:
\`\`\`typescript
{
  id: string
  name: string
  balance: {
    totalEquity: string           // "6075.132"
    totalWalletBalance: string    // Total wallet balance
    totalUnrealizedPnl: string   // Unrealized P&L
    totalMarginBalance: string   // Margin balance
    totalAvailableBalance: string // Available balance
    totalPerpUPL: string         // Perpetual unrealized P&L
    totalInitialMargin: string   // Initial margin
    totalMaintenanceMargin: string // Maintenance margin
  }
  closedPnL: Array<{
    symbol: string               // "BTCUSDT"
    side: string                // "Buy" | "Sell"
    qty: string                 // Position quantity
    orderPrice: string          // Order price
    orderType: string           // Order type
    execType: string            // Execution type
    closedSize: string          // Closed position size
    cumEntryValue: string       // Cumulative entry value
    avgEntryPrice: string       // Average entry price
    cumExitValue: string        // Cumulative exit value
    avgExitPrice: string        // Average exit price
    closedPnl: string           // Realized P&L: "25.93"
    fillCount: string           // Number of fills
    leverage: string            // Leverage used
    createdTime: string         // Creation timestamp: "1727410891623"
    updatedTime: string         // Update timestamp: "1727410891623"
  }>
  openPositions: Array<{
    symbol: string              // "BTCUSDT"
    side: string               // "Buy" | "Sell"
    size: string               // Position size
    positionValue: string      // Position value
    entryPrice: string         // Entry price
    markPrice: string          // Current mark price
    unrealizedPnl: string      // Unrealized P&L: "7.78"
    percentage: string         // P&L percentage
    leverage: string           // Leverage
    riskLimitValue: string     // Risk limit
    createdTime: string        // Position creation time
    updatedTime: string        // Last update time
  }>
}
\`\`\`

## COMPONENT TEMPLATE

\`\`\`tsx
import { useAppStore } from '../store/useAppStore'
import { useMemo } from 'react'

interface CustomCardProps {
  // Add any props you need
}

const CustomCard = ({ }: CustomCardProps) => {
  const { accountsData } = useAppStore()

  // Calculate your metrics using useMemo for performance
  const metrics = useMemo(() => {
    // Your calculations here using accountsData
    return {
      // Your calculated values
    }
  }, [accountsData])

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Your Card Title
        </h2>
        <div className="text-primary-600 dark:text-primary-400">
          {/* Optional icon */}
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="..." />
          </svg>
        </div>
      </div>

      {/* Your card content */}

    </div>
  )
}

export default CustomCard
\`\`\`

## COMMON CALCULATIONS

### Total Portfolio Value:
\`\`\`tsx
const totalEquity = accountsData.reduce((sum, account) =>
  sum + parseFloat(account.balance?.totalEquity || '0'), 0
)
\`\`\`

### Recent P&L (24h example):
\`\`\`tsx
const yesterday = Date.now() - (24 * 60 * 60 * 1000)
const recentTrades = accountsData.flatMap(account =>
  (account.closedPnL || []).filter(trade =>
    parseInt(trade.updatedTime) >= yesterday
  )
)
const totalPnL24h = recentTrades.reduce((sum, trade) =>
  sum + parseFloat(trade.closedPnl), 0
)
\`\`\`

### Win Rate:
\`\`\`tsx
const allTrades = accountsData.flatMap(account => account.closedPnL || [])
const winningTrades = allTrades.filter(trade => parseFloat(trade.closedPnl) > 0)
const winRate = allTrades.length > 0 ? (winningTrades.length / allTrades.length) * 100 : 0
\`\`\`

### Unrealized P&L:
\`\`\`tsx
const totalUnrealizedPnL = accountsData.reduce((sum, account) =>
  sum + (account.openPositions || []).reduce((posSum, pos) =>
    posSum + parseFloat(pos.unrealizedPnl || '0'), 0
  ), 0
)
\`\`\`

## STYLING EXAMPLES

### Stats Display:
\`\`\`tsx
<div className="grid grid-cols-2 gap-4">
  <div className="text-center">
    <div className="text-2xl font-bold text-success">+$1,234</div>
    <div className="text-sm text-muted">Profit This Month</div>
  </div>
  <div className="text-center">
    <div className="text-lg font-semibold text-gray-900 dark:text-white">156</div>
    <div className="text-sm text-muted">Total Trades</div>
  </div>
</div>
\`\`\`

### Progress Bar:
\`\`\`tsx
<div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
  <div
    className="bg-success h-2 rounded-full transition-all duration-300"
    style={{ width: \`\$\{percentage}%\` }}
  ></div>
</div>
\`\`\`

### Color-coded Values:
\`\`\`tsx
<span className={\`font-semibold \$\{value >= 0 ? 'text-success' : 'text-danger'}\`}>
  {value >= 0 ? '+' : ''}\$\{value.toFixed(2)}
</span>
\`\`\`

## YOUR TASK

Create a custom dashboard card that: [DESCRIBE WHAT YOU WANT THE CARD TO SHOW]

Requirements:
- Use the exact data structure provided
- Follow the styling guidelines
- Include error handling for missing data
- Make it responsive and professional
- Add loading states if needed
- Include dark mode support`

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setFileName(file.name)
      const reader = new FileReader()
      reader.onload = (e) => {
        const content = e.target?.result as string
        setCustomCode(content)
      }
      reader.readAsText(file)
    }
  }

  const handleAddCard = async () => {
    if (!customCode.trim()) {
      alert('Please add some code or upload a file first.')
      return
    }

    const cardName = fileName || `Custom Card ${customCards.length + 1}`

    try {
      await addCustomCard(cardName, customCode)
      setCustomCode('')
      setFileName('')
      alert('Custom card added successfully!')
    } catch (error) {
      alert('Failed to add custom card. Please try again.')
    }
  }

  const handleEditCard = (card: any) => {
    setEditingCard(card.id)
    setEditName(card.name)
    setEditCode(card.code)
  }

  const handleSaveEdit = async () => {
    if (!editingCard) return

    try {
      await editCustomCard(editingCard, editName, editCode)
      setEditingCard(null)
      setEditName('')
      setEditCode('')
      alert('Card updated successfully!')
    } catch (error) {
      alert('Failed to update card. Please try again.')
    }
  }

  const handleCancelEdit = () => {
    setEditingCard(null)
    setEditName('')
    setEditCode('')
  }

  const copyPromptToClipboard = async () => {
    try {
      // Try modern clipboard API first
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(pluginPrompt)
        alert('Card generation prompt copied to clipboard! Paste it into ChatGPT or Claude to generate your custom card.')
      } else {
        // Fallback for older browsers or non-secure contexts
        const textArea = document.createElement('textarea')
        textArea.value = pluginPrompt
        textArea.style.position = 'fixed'
        textArea.style.left = '-999999px'
        textArea.style.top = '-999999px'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()

        try {
          document.execCommand('copy')
          alert('Card generation prompt copied to clipboard! Paste it into ChatGPT or Claude to generate your custom card.')
        } catch (err) {
          console.error('Fallback copy failed:', err)
          alert('Failed to copy to clipboard. Please manually select and copy the text from the prompt box below.')
        } finally {
          document.body.removeChild(textArea)
        }
      }
    } catch (err) {
      console.error('Clipboard copy failed:', err)
      alert('Failed to copy to clipboard. Please manually select and copy the text from the prompt box below.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Custom Cards
        </h1>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('add')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'add'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          Add Card
        </button>
        <button
          onClick={() => setActiveTab('manage')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'manage'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          Manage Cards
        </button>
      </div>

      {activeTab === 'add' && (
        <div className="space-y-6">
          {/* Custom Card Idea Generator */}
          <div className="card p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              💡 Smart Card Generator
            </h2>

            <p className="text-blue-800 dark:text-blue-200 mb-4">
              Describe what you want your custom card to show, and we'll generate a perfect AI prompt for you!
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  What should your card display? 🤔
                </label>
                <textarea
                  value={cardIdea}
                  onChange={(e) => setCardIdea(e.target.value)}
                  placeholder="Example: A profit/loss chart showing daily performance over the last 30 days with color-coded gains and losses..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Card Size 📏
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: 'small', label: 'Small', desc: 'Compact, 1 column' },
                    { value: 'medium', label: 'Medium', desc: 'Standard, 1-2 columns' },
                    { value: 'large', label: 'Large', desc: 'Wide, 2-3 columns' }
                  ].map((size) => (
                    <button
                      key={size.value}
                      onClick={() => setSelectedSize(size.value as 'small' | 'medium' | 'large')}
                      className={`p-3 rounded-lg border text-sm transition-all duration-200 ${
                        selectedSize === size.value
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                          : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-800 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'
                      }`}
                    >
                      <div className="font-medium">{size.label}</div>
                      <div className="text-xs opacity-75 mt-1">{size.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={generateCustomPrompt}
                  disabled={!cardIdea.trim()}
                  className="btn-primary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span>Generate Custom Prompt</span>
                </button>

                {generatedPrompt && (
                  <button
                    id="copy-generated-btn"
                    onClick={copyGeneratedPrompt}
                    className="btn-secondary flex items-center space-x-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 00-2-2M9 5h6" />
                    </svg>
                    <span>Copy Custom Prompt</span>
                  </button>
                )}
              </div>

              {generatedPrompt && (
                <div className="mt-4 p-4 bg-white dark:bg-dark-900 rounded-lg border border-blue-300 dark:border-blue-700">
                  <h4 className="text-sm font-semibold text-green-600 dark:text-green-400 mb-2 flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    ✨ Your Custom Prompt is Ready!
                  </h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                    Copy this prompt and paste it into ChatGPT or Claude to generate your custom card:
                  </p>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded p-3 max-h-32 overflow-y-auto">
                    <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono">
                      {generatedPrompt}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Plugin Prompt Section */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Alternative: Use Complete Template
              </h2>
              <button
                onClick={copyPromptToClipboard}
                className="btn-secondary flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 00-2-2M9 5h6" />
                </svg>
                <span>Copy Full Prompt</span>
              </button>
            </div>
            <p className="text-muted mb-4">
              Copy this comprehensive prompt and paste it into ChatGPT or Claude. Replace the last line with your specific requirements to generate a custom dashboard card.
            </p>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 max-h-96 overflow-y-auto">
              <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono">
                {pluginPrompt}
              </pre>
            </div>
          </div>

          {/* Code Input Section */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Step 2: Add Your Generated Code
            </h2>

            {/* File Upload */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Upload .tsx file
              </label>
              <div className="flex items-center space-x-4">
                <input
                  type="file"
                  accept=".tsx,.ts,.jsx,.js"
                  onChange={handleFileUpload}
                  className="block w-full text-sm text-gray-500 dark:text-gray-400
                           file:mr-4 file:py-2 file:px-4
                           file:rounded-md file:border-0
                           file:text-sm file:font-medium
                           file:bg-blue-50 file:text-blue-700
                           hover:file:bg-blue-100
                           dark:file:bg-blue-900/20 dark:file:text-blue-300"
                />
                {fileName && (
                  <span className="text-sm text-green-600 dark:text-green-400">
                    ✓ {fileName}
                  </span>
                )}
              </div>
            </div>

            {/* Code Textarea */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Or paste code directly
              </label>
              <textarea
                value={customCode}
                onChange={(e) => setCustomCode(e.target.value)}
                placeholder="Paste your generated React component code here..."
                className="w-full h-64 p-3 border border-gray-300 dark:border-gray-600 rounded-lg
                         bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                         font-mono text-sm resize-none"
              />
            </div>

            <button
              onClick={handleAddCard}
              className="btn-primary"
            >
              Add Custom Card
            </button>
          </div>
        </div>
      )}

      {activeTab === 'manage' && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Your Custom Cards
          </h2>
          {customCards.length === 0 ? (
            <div className="text-center py-8">
              <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No Custom Cards Yet
              </h3>
              <p className="text-muted mb-4">
                Create your first custom card using the "Add Card" tab.
              </p>
              <button
                onClick={() => setActiveTab('add')}
                className="btn-primary"
              >
                Add Your First Card
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {customCards.map((card) => (
                <div key={card.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                  {editingCard === card.id ? (
                    // Edit mode
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Card Name
                        </label>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded
                                   bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Code
                        </label>
                        <textarea
                          value={editCode}
                          onChange={(e) => setEditCode(e.target.value)}
                          className="w-full h-64 p-3 border border-gray-300 dark:border-gray-600 rounded
                                   bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                                   font-mono text-sm resize-none"
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={handleSaveEdit}
                          className="btn-primary text-sm"
                        >
                          Save Changes
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="btn-secondary text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    // View mode
                    <>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                            {card.name}
                          </h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            card.isActive
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                          }`}>
                            {card.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleEditCard(card)}
                            className="btn-secondary text-sm"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => toggleCustomCard(card.id)}
                            className="btn-secondary text-sm"
                          >
                            {card.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={() => removeCustomCard(card.id)}
                            className="btn-danger text-sm"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                      <div className="text-sm text-muted mb-2">
                        Created: {new Date(card.createdAt).toLocaleDateString()}
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800 rounded p-3 max-h-64 overflow-auto">
                        <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre font-mono overflow-x-auto">
                          {card.code}
                        </pre>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}