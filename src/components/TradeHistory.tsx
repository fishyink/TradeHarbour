import React, { useState, useMemo } from 'react'
import { useAppStore } from '../store/useAppStore'
import { TradesTable } from './TradesTable'
import { exportTradesToCSV } from '../utils/csvExport'

export const TradeHistory = () => {
  const { accountsData, accounts } = useAppStore()
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null)
  const [selectedPair, setSelectedPair] = useState<string>('')
  const [selectedSide, setSelectedSide] = useState<string>('')
  const [selectedExchange, setSelectedExchange] = useState<string>('')
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')
  const [currentPage, setCurrentPage] = useState(0)

  const filteredData = selectedAccount
    ? (accountsData || []).filter(account => account.id === selectedAccount)
    : (accountsData || [])

  const allTrades = useMemo(() => {
    return filteredData
      .flatMap(account =>
        account.trades.map(trade => ({
          ...trade,
          accountName: account.name,
          exchange: 'Bybit' // Default to Bybit for now, will support multiple exchanges
        }))
      )
      .sort((a, b) => parseInt(b.execTime) - parseInt(a.execTime))
  }, [filteredData])

  const uniquePairs = useMemo(() => {
    const pairs = Array.from(new Set(allTrades.map(trade => trade.symbol)))
    return pairs.sort()
  }, [allTrades])

  const uniqueExchanges = useMemo(() => {
    const exchanges = Array.from(new Set(allTrades.map(trade => trade.exchange)))
    return exchanges.sort()
  }, [allTrades])

  const filteredTrades = useMemo(() => {
    let filtered = allTrades

    if (selectedPair) {
      filtered = filtered.filter(trade => trade.symbol === selectedPair)
    }

    if (selectedSide) {
      filtered = filtered.filter(trade => trade.side === selectedSide)
    }

    if (selectedExchange) {
      filtered = filtered.filter(trade => trade.exchange === selectedExchange)
    }

    if (dateFrom) {
      const fromTime = new Date(dateFrom).getTime()
      filtered = filtered.filter(trade => parseInt(trade.execTime) >= fromTime)
    }

    if (dateTo) {
      const toTime = new Date(dateTo).getTime() + (24 * 60 * 60 * 1000) // End of day
      filtered = filtered.filter(trade => parseInt(trade.execTime) <= toTime)
    }

    return filtered
  }, [allTrades, selectedPair, selectedSide, selectedExchange, dateFrom, dateTo])

  const tradesPerPage = 50
  const totalPages = Math.ceil(filteredTrades.length / tradesPerPage)
  const startIndex = currentPage * tradesPerPage
  const paginatedTrades = filteredTrades.slice(startIndex, startIndex + tradesPerPage)

  const clearFilters = () => {
    setSelectedAccount(null)
    setSelectedPair('')
    setSelectedSide('')
    setSelectedExchange('')
    setDateFrom('')
    setDateTo('')
    setCurrentPage(0)
  }

  const handleExport = () => {
    exportTradesToCSV(filteredTrades, `trade-history-${new Date().toISOString().split('T')[0]}.csv`)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Trade History
        </h1>
        <button
          onClick={handleExport}
          className="btn-primary flex items-center space-x-2"
          disabled={filteredTrades.length === 0}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span>Export ({filteredTrades.length} trades)</span>
        </button>
      </div>

      {/* Filters */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Filters
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-4">
          {/* Account Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Account
            </label>
            <select
              value={selectedAccount || ''}
              onChange={(e) => setSelectedAccount(e.target.value || null)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-md bg-white dark:bg-dark-800 text-gray-900 dark:text-white text-sm"
            >
              <option value="">All Accounts</option>
              {accounts.map(account => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </div>

          {/* Pair Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Trading Pair
            </label>
            <select
              value={selectedPair}
              onChange={(e) => setSelectedPair(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-md bg-white dark:bg-dark-800 text-gray-900 dark:text-white text-sm"
            >
              <option value="">All Pairs</option>
              {uniquePairs.map(pair => (
                <option key={pair} value={pair}>
                  {pair}
                </option>
              ))}
            </select>
          </div>

          {/* Side Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Side
            </label>
            <select
              value={selectedSide}
              onChange={(e) => setSelectedSide(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-md bg-white dark:bg-dark-800 text-gray-900 dark:text-white text-sm"
            >
              <option value="">Buy & Sell</option>
              <option value="Buy">Buy</option>
              <option value="Sell">Sell</option>
            </select>
          </div>

          {/* Exchange Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Exchange
            </label>
            <select
              value={selectedExchange}
              onChange={(e) => setSelectedExchange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-md bg-white dark:bg-dark-800 text-gray-900 dark:text-white text-sm"
            >
              <option value="">All Exchanges</option>
              {uniqueExchanges.map(exchange => (
                <option key={exchange} value={exchange}>
                  {exchange}
                </option>
              ))}
            </select>
          </div>

          {/* Date From */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              From Date
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-md bg-white dark:bg-dark-800 text-gray-900 dark:text-white text-sm"
            />
          </div>

          {/* Date To */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              To Date
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-md bg-white dark:bg-dark-800 text-gray-900 dark:text-white text-sm"
            />
          </div>

          {/* Clear Filters */}
          <div className="flex items-end">
            <button
              onClick={clearFilters}
              className="w-full px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-dark-700 hover:bg-gray-200 dark:hover:bg-dark-600 rounded-md transition-colors"
            >
              Clear All
            </button>
          </div>
        </div>

        {/* Active Filters Summary */}
        {(selectedAccount || selectedPair || selectedSide || selectedExchange || dateFrom || dateTo) && (
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Active filters:</span>
            {selectedAccount && (
              <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-full">
                Account: {accounts.find(acc => acc.id === selectedAccount)?.name}
              </span>
            )}
            {selectedPair && (
              <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 rounded-full">
                Pair: {selectedPair}
              </span>
            )}
            {selectedSide && (
              <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 rounded-full">
                Side: {selectedSide}
              </span>
            )}
            {selectedExchange && (
              <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-200 rounded-full">
                Exchange: {selectedExchange}
              </span>
            )}
            {dateFrom && (
              <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 rounded-full">
                From: {dateFrom}
              </span>
            )}
            {dateTo && (
              <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 rounded-full">
                To: {dateTo}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Results */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Trade Results ({filteredTrades.length} trades)
          </h2>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                disabled={currentPage === 0}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-dark-700 disabled:opacity-50 text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="text-sm text-muted px-2">
                {currentPage + 1} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                disabled={currentPage === totalPages - 1}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-dark-700 disabled:opacity-50 text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {filteredTrades.length === 0 ? (
          <div className="text-center py-8 text-muted">
            <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-lg font-medium">No trades found</p>
            <p className="text-sm mt-1">Try adjusting your filters to see trade data</p>
          </div>
        ) : (
          <TradesTable trades={paginatedTrades} />
        )}
      </div>
    </div>
  )
}