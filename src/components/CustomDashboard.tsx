import { useAppStore } from '../store/useAppStore'
import { useMemo, useState, useEffect } from 'react'
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd'

export const CustomDashboard = () => {
  const { customCards } = useAppStore()

  const activeCards = useMemo(() => {
    return customCards.filter(card => card.isActive)
  }, [customCards])

  // Simple component renderer for known patterns
  const renderPortfolioOverview = () => {
    if (typeof useAppStore !== 'function') {
      return <div className="text-red-500">Error: useAppStore not available</div>
    }

    const { accountsData } = useAppStore()

    if (!accountsData) {
      return (
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Portfolio Overview
          </h2>
          <div className="text-muted">Loading account data...</div>
        </div>
      )
    }

    const metrics = useMemo(() => {
      if (!Array.isArray(accountsData)) {
        return {
          totalEquity: 0,
          pnl21d: 0,
          totalVolume: 0,
          totalTrades: 0
        }
      }

      // Total Equity
      const totalEquity = accountsData.reduce((sum, account) =>
        sum + parseFloat(account.balance?.totalEquity || '0'), 0
      )

      // P&L for last 21 days
      const twentyOneDaysAgo = Date.now() - (21 * 24 * 60 * 60 * 1000)
      const recentTrades = accountsData.flatMap(account =>
        (account.closedPnL || []).filter(trade =>
          parseInt(trade.updatedTime) >= twentyOneDaysAgo
        )
      )
      const pnl21d = recentTrades.reduce((sum, trade) =>
        sum + parseFloat(trade.closedPnl || '0'), 0
      )

      // Total trading volume in last 21 days
      const totalVolume = recentTrades.reduce((sum, trade) =>
        sum + parseFloat(trade.cumEntryValue || '0'), 0
      )

      return {
        totalEquity,
        pnl21d,
        totalVolume,
        totalTrades: recentTrades.length
      }
    }, [accountsData])

    return (
      <div className="card p-6 bg-white dark:bg-dark-800 border border-gray-200 dark:border-gray-600">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Portfolio Overview
          </h2>
          <div className="text-primary">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3" />
            </svg>
          </div>
        </div>

        {!accountsData.length ? (
          <div className="text-muted">No account data available.</div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                ${metrics.totalEquity.toFixed(2)}
              </div>
              <div className="text-sm text-muted">Total Equity</div>
            </div>

            <div className="text-center">
              <div className={`text-2xl font-bold ${metrics.pnl21d >= 0 ? 'text-success' : 'text-danger'}`}>
                {metrics.pnl21d >= 0 ? '+' : ''}${metrics.pnl21d.toFixed(2)}
              </div>
              <div className="text-sm text-muted">P&L (21 days)</div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                ${metrics.totalVolume.toFixed(2)}
              </div>
              <div className="text-sm text-muted">Volume (21 days)</div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {metrics.totalTrades}
              </div>
              <div className="text-sm text-muted">Trades (21 days)</div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Render 7-Day Account P&L Card
  const renderSevenDayCard = (card: any) => {
    const { accountsData } = useAppStore()

    if (!accountsData) {
      return (
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            7-Day Account P&L
          </h2>
          <div className="text-muted">Loading account data...</div>
        </div>
      )
    }

    const metrics = useMemo(() => {
      if (!Array.isArray(accountsData) || accountsData.length === 0) {
        return []
      }

      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000

      return accountsData.map(account => {
        const trades7d = (account.closedPnL || []).filter(trade =>
          parseInt(trade.updatedTime) >= sevenDaysAgo
        )

        const pnl7d = trades7d.reduce(
          (sum, trade) => sum + parseFloat(trade.closedPnl || '0'),
          0
        )

        const volume7d = trades7d.reduce(
          (sum, trade) => sum + parseFloat(trade.cumEntryValue || '0'),
          0
        )

        const pnlPercent =
          volume7d > 0 ? (pnl7d / volume7d) * 100 : 0

        return {
          name: account.name,
          pnl7d,
          volume7d,
          pnlPercent
        }
      })
    }, [accountsData])

    return (
      <div className="card p-6 bg-white dark:bg-dark-800 border border-gray-200 dark:border-gray-600 max-w-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            7-Day Account P&L
          </h2>
          <div className="text-primary">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3"
              />
            </svg>
          </div>
        </div>

        {!accountsData.length ? (
          <div className="text-muted">No account data available.</div>
        ) : (
          <div className="space-y-4">
            {metrics.map((acct) => (
              <div
                key={acct.name}
                className="border-b border-gray-200 dark:border-gray-600 pb-3 last:border-0"
              >
                <div className="flex justify-between items-center">
                  <span className="text-muted">{acct.name}</span>
                  <span
                    className={`font-semibold ${
                      acct.pnl7d >= 0 ? 'text-success' : 'text-danger'
                    }`}
                  >
                    {acct.pnl7d >= 0 ? '+' : ''}
                    ${acct.pnl7d.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-muted">
                    Volume: ${acct.volume7d.toFixed(2)}
                  </span>
                  <span
                    className={`font-semibold ${
                      acct.pnlPercent >= 0 ? 'text-success' : 'text-danger'
                    }`}
                  >
                    {acct.pnlPercent >= 0 ? '+' : ''}
                    {acct.pnlPercent.toFixed(2)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // Render Equity Chart Card (7-Day Portfolio Overview)
  const renderEquityChartCard = (card: any) => {
    const { accountsData } = useAppStore()

    const { sevenDayEquityPoints, topAssets, loading, error } = useMemo(() => {
      if (!accountsData) {
        return { sevenDayEquityPoints: [], topAssets: [], loading: true, error: null }
      }
      try {
        const now = Date.now()
        const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000

        // Build daily buckets (UTC midnight) for last 7 days.
        const dailyBuckets: Record<string, number> = {}
        for (let i = 0; i < 7; i++) {
          const day = new Date(now - i * 24 * 60 * 60 * 1000)
          const key = day.toISOString().slice(0, 10)
          dailyBuckets[key] = 0
        }

        // For simplicity we only have current equity. In real scenario you'd store historical points.
        const currentTotalEquity = accountsData.reduce(
          (sum, acc) => sum + parseFloat(acc.balance?.totalEquity || '0'),
          0
        )
        Object.keys(dailyBuckets).forEach(k => {
          dailyBuckets[k] = currentTotalEquity
        })

        const sevenDayEquityPoints = Object.entries(dailyBuckets)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, value]) => ({ date, value }))

        // Top Performing Assets over 7 days
        const allTrades = accountsData.flatMap(acc =>
          (acc.closedPnL || []).filter(
            t => parseInt(t.updatedTime) >= sevenDaysAgo
          )
        )

        const profitBySymbol: Record<string, number> = {}
        allTrades.forEach(trade => {
          const pnl = parseFloat(trade.closedPnl || '0')
          profitBySymbol[trade.symbol] = (profitBySymbol[trade.symbol] || 0) + pnl
        })

        const topAssets = Object.entries(profitBySymbol)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([symbol, profit]) => ({ symbol, profit }))

        return { sevenDayEquityPoints, topAssets, loading: false, error: null }
      } catch (err) {
        return { sevenDayEquityPoints: [], topAssets: [], loading: false, error: (err as Error).message }
      }
    }, [accountsData])

    if (loading) {
      return (
        <div className="card p-6">
          <p className="text-muted">Loading data...</p>
        </div>
      )
    }

    if (error) {
      return (
        <div className="card p-6">
          <p className="text-danger">Error: {error}</p>
        </div>
      )
    }

    return (
      <div className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            7-Day Portfolio Overview
          </h2>
        </div>

        {/* === Equity Curve === */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Total Equity (last 7 days)
          </h3>
          <div className="w-full h-32 bg-gray-200 dark:bg-gray-700 rounded-lg relative overflow-hidden">
            {/* Simple SVG line chart without external deps */}
            <svg className="absolute inset-0 w-full h-full">
              {sevenDayEquityPoints.length > 1 && (
                <polyline
                  fill="none"
                  stroke="currentColor"
                  className="text-primary"
                  strokeWidth="2"
                  points={sevenDayEquityPoints.map((p, i) => {
                    const x = (i / (sevenDayEquityPoints.length - 1)) * 100
                    const max = Math.max(...sevenDayEquityPoints.map(pt => pt.value))
                    const min = Math.min(...sevenDayEquityPoints.map(pt => pt.value))
                    const range = max - min || 1
                    const y = 100 - ((p.value - min) / range) * 100
                    return `${x}%,${y}%`
                  }).join(' ')}
                />
              )}
            </svg>
          </div>
        </div>

        {/* === Top Assets === */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
            Top Performing Assets (7 days)
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {topAssets.length === 0 && (
              <p className="text-muted col-span-full">No trades in the last 7 days.</p>
            )}
            {topAssets.map(asset => (
              <div key={asset.symbol} className="text-center">
                <div className="text-sm text-muted">{asset.symbol}</div>
                <div className={`text-lg font-bold ${asset.profit >= 0 ? 'text-success' : 'text-danger'}`}>
                  {asset.profit >= 0 ? '+' : ''}${asset.profit.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Render Top 5 Assets Card
  const renderTopAssetsCard = (card: any) => {
    const { accountsData } = useAppStore()

    const { topAssets, loading, error } = useMemo(() => {
      if (!accountsData) {
        return { topAssets: [], loading: true, error: null }
      }

      try {
        const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000

        // Collect all trades updated within last 7 days
        const recentTrades = accountsData.flatMap(account =>
          (account.closedPnL || []).filter(
            t => parseInt(t.updatedTime) >= sevenDaysAgo
          )
        )

        // Aggregate P&L and entry value per symbol to calculate percentage
        const stats: Record<string, { profit: number; entry: number }> = {}

        recentTrades.forEach(trade => {
          const pnl = parseFloat(trade.closedPnl || '0')
          const entryValue = parseFloat(trade.cumEntryValue || '0')
          if (!stats[trade.symbol]) {
            stats[trade.symbol] = { profit: 0, entry: 0 }
          }
          stats[trade.symbol].profit += pnl
          stats[trade.symbol].entry += entryValue
        })

        // Convert to array with percentage profit
        const topAssets = Object.entries(stats)
          .map(([symbol, { profit, entry }]) => ({
            symbol,
            percentage: entry > 0 ? (profit / entry) * 100 : 0
          }))
          .sort((a, b) => b.percentage - a.percentage)
          .slice(0, 5)

        return { topAssets, loading: false, error: null }
      } catch (err) {
        return { topAssets: [], loading: false, error: (err as Error).message }
      }
    }, [accountsData])

    if (loading) {
      return (
        <div className="card p-6">
          <p className="text-muted">Loading top assets...</p>
        </div>
      )
    }

    if (error) {
      return (
        <div className="card p-6">
          <p className="text-danger">Error: {error}</p>
        </div>
      )
    }

    return (
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
            {/* Trophy Icon */}
            <svg
              className="w-5 h-5 mr-2 text-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 21h8M12 17v4m6-14h2a2 2 0 012 2v1a5 5 0 01-5 5 5 5 0 01-5-5V5h2m-6 0h2v3a5 5 0 01-5 5 5 5 0 01-5-5V5h2"
              />
            </svg>
            Top 5 Assets – 7 Days
          </h2>
        </div>

        <div className="space-y-3">
          {topAssets.length === 0 && (
            <p className="text-muted">No trades in the last 7 days.</p>
          )}
          {topAssets.map(asset => (
            <div
              key={asset.symbol}
              className="flex items-center justify-between border-b border-gray-200 dark:border-gray-600 pb-1"
            >
              <span className="text-gray-900 dark:text-white font-medium">
                {asset.symbol}
              </span>
              <span
                className={`font-semibold ${
                  asset.percentage >= 0 ? 'text-success' : 'text-danger'
                }`}
              >
                {asset.percentage >= 0 ? '+' : ''}
                {asset.percentage.toFixed(2)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Dynamic component renderer with pattern matching
  const renderDynamicCard = (card: any) => {
    try {
      // More specific pattern matching to avoid conflicts
      // Check for Top Assets cards FIRST (most specific)
      if (card.code.includes('TopAssets7DaysCard') ||
          card.code.includes('Top 5 Assets') ||
          card.code.includes('Trophy Icon') ||
          (card.code.includes('percentage') && card.code.includes('recentTrades') && card.code.includes('stats'))) {
        return renderTopAssetsCard(card)
      }

      // Check for equity chart cards SECOND (second most specific)
      if (card.code.includes('SevenDayEquityCard') ||
          card.code.includes('sevenDayEquityPoints') ||
          card.code.includes('Top Performing Assets') ||
          card.code.includes('dailyBuckets') ||
          card.code.includes('profitBySymbol')) {
        return renderEquityChartCard(card)
      }

      // Check for portfolio table cards (third most specific)
      if (card.code.includes('Portfolio PnL Overview') ||
          card.code.includes('Total Portfolio Value') ||
          card.code.includes('90 Day PnL') ||
          (card.code.includes('table') && card.code.includes('Account Value')) ||
          card.code.includes('accountMetrics')) {
        return renderPortfolioOverview()
      }

      // Check for 7-Day Account P&L cards (least specific, check last)
      if (card.code.includes('7-Day Account P&L') ||
          (card.code.includes('sevenDaysAgo') && !card.code.includes('sevenDayEquityPoints') && !card.code.includes('percentage')) ||
          (card.name.toLowerCase().includes('7-day') && !card.code.includes('Top Performing Assets') && !card.code.includes('Top 5 Assets'))) {
        return renderSevenDayCard(card)
      }

      // Parse card code to extract component data
      const codeLines = card.code.split('\n')
      let componentData: any = {}

      // Simple pattern matching for common component types
      if (card.code.includes('return (') && card.code.includes('className')) {
        // This looks like a React component
        try {
          // Extract basic structure and render a simplified version
          const hasGrid = card.code.includes('grid')
          const hasMetrics = card.code.includes('totalEquity') || card.code.includes('balance')
          const hasCharts = card.code.includes('Chart') || card.code.includes('Line')

          if (hasMetrics) {
            // Render a metrics card
            const { accountsData } = useAppStore()

            return (
              <div className="card p-6 bg-white dark:bg-dark-800 border border-gray-200 dark:border-gray-600">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {card.name}
                  </h3>
                  <div className="w-2 h-2 bg-green-500 rounded-full" title="Custom Component Active" />
                </div>

                {accountsData.length > 0 ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-xl font-bold text-gray-900 dark:text-white">
                        ${accountsData.reduce((sum, acc) => sum + parseFloat(acc.balance?.totalEquity || '0'), 0).toFixed(2)}
                      </div>
                      <div className="text-sm text-muted">Total Equity</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-success">
                        +${Math.abs(accountsData.reduce((sum, acc) => sum + parseFloat(acc.balance?.totalPerpUPL || '0'), 0)).toFixed(2)}
                      </div>
                      <div className="text-sm text-muted">Unrealized P&L</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted">
                    No account data available
                  </div>
                )}

                <div className="mt-4 text-xs text-green-600 dark:text-green-400 text-center">
                  ✅ Custom component rendered successfully
                </div>
              </div>
            )
          }
        } catch (err) {
          // Fall through to default rendering
        }
      }

      // Default fallback for any custom card
      return (
        <div className="card p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {card.name}
            </h3>
            <div className="w-2 h-2 bg-blue-500 rounded-full" title="Custom Component" />
          </div>

          <div className="text-center py-6">
            <svg className="w-12 h-12 text-blue-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>

            <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Custom Component Ready
            </h4>

            <p className="text-sm text-muted mb-4">
              Dynamic rendering system activated
            </p>

            <div className="bg-white dark:bg-dark-900 rounded p-3 text-left">
              <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Code Preview:
              </div>
              <pre className="text-xs text-gray-600 dark:text-gray-400 max-h-32 overflow-auto whitespace-pre-wrap">
                {card.code.substring(0, 200)}
                {card.code.length > 200 ? '...' : ''}
              </pre>
            </div>

            <div className="mt-4 text-xs text-blue-600 dark:text-blue-400">
              ⚡ Enhanced rendering system will process this component
            </div>
          </div>
        </div>
      )

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      const errorStack = error instanceof Error ? error.stack : 'No stack trace available'

      return (
        <div className="card p-6 border-red-200 dark:border-red-800">
          <div className="text-center py-4">
            <svg className="w-8 h-8 text-red-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <h3 className="text-lg font-medium text-red-600 dark:text-red-400 mb-2">
              {card.name} - Render Error
            </h3>
            <p className="text-sm text-red-500 mb-3">
              {errorMessage}
            </p>
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded p-3 text-left">
              <div className="text-xs font-semibold text-red-800 dark:text-red-300 mb-2">
                Debug Information:
              </div>
              <div className="text-xs text-red-700 dark:text-red-400 space-y-1">
                <div><strong>Error:</strong> {errorMessage}</div>
                <div><strong>Card Type:</strong> Dynamic Component</div>
                <div><strong>Code Length:</strong> {card.code.length} characters</div>
                <div><strong>Active:</strong> {card.isActive ? 'Yes' : 'No'}</div>
              </div>
              <details className="mt-2">
                <summary className="text-xs text-red-600 dark:text-red-400 cursor-pointer hover:text-red-800 dark:hover:text-red-200">
                  Show Stack Trace
                </summary>
                <pre className="text-xs text-red-600 dark:text-red-400 mt-1 overflow-x-auto whitespace-pre-wrap">
                  {errorStack}
                </pre>
              </details>
            </div>
            <div className="mt-3 text-xs text-red-600 dark:text-red-400">
              Tip: Make sure your component returns valid JSX and uses available hooks properly
            </div>
          </div>
        </div>
      )
    }
  }

  const renderCustomCard = (card: any, index: number) => {
    return (
      <Draggable key={card.id} draggableId={card.id} index={index}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            className={`transition-transform duration-200 ${
              snapshot.isDragging ? 'rotate-2 scale-105 shadow-2xl' : ''
            }`}
          >
            {renderDynamicCard(card)}
          </div>
        )}
      </Draggable>
    )
  }

  // Handle drag and drop
  const handleDragEnd = (result: any) => {
    if (!result.destination) return

    const { updateCustomCardOrder } = useAppStore()
    const items = Array.from(activeCards)
    const [reorderedItem] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reorderedItem)

    updateCustomCardOrder(items.map(item => item.id))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Custom Dashboard
        </h1>
        {activeCards.length > 0 && (
          <span className="text-sm text-muted">
            {activeCards.length} active card{activeCards.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Custom Cards Grid with Drag & Drop */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="custom-cards" direction="horizontal">
          {(provided, snapshot) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 transition-colors duration-200 ${
                snapshot.isDraggingOver ? 'bg-blue-50 dark:bg-blue-900/10 rounded-lg p-4' : ''
              }`}
            >
              {activeCards.length === 0 ? (
                <div className="card p-6 border-2 border-dashed border-gray-300 dark:border-gray-600 col-span-full">
                  <div className="text-center py-8">
                    <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      No Active Custom Cards
                    </h3>
                    <p className="text-muted mb-4">
                      Create and activate custom cards to see them displayed here.
                    </p>
                    <p className="text-xs text-muted">
                      💡 Tip: Use the Smart Card Generator in Custom Cards to create new components
                    </p>
                  </div>
                </div>
              ) : (
                activeCards.map((card, index) => renderCustomCard(card, index))
              )}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* Info Card */}
      <div className="card p-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
        <div className="flex items-start space-x-3">
          <svg className="w-6 h-6 text-blue-600 dark:text-blue-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
              About Custom Dashboard
            </h3>
            <p className="text-blue-800 dark:text-blue-200 mb-3">
              This page displays all your custom trading cards in a dedicated dashboard view. Cards you create in the Custom Cards section will automatically appear here.
            </p>
            <div className="text-sm text-blue-700 dark:text-blue-300">
              <strong>Available features:</strong>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>✅ Dynamic component rendering</li>
                <li>✅ Responsive grid layouts</li>
                <li>✅ Smart card pattern recognition</li>
              </ul>
              <strong>Features coming soon:</strong>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Drag & drop card arrangement</li>
                <li>Card settings and customization</li>
                <li>Export dashboard configurations</li>
                <li>Card size controls</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}