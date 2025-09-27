import { BybitTrade } from '../types/bybit'
import { UnifiedTrade } from '../types/exchanges'
import { exchangeFactory } from '../services/exchangeFactory'

interface TradeWithAccount extends BybitTrade {
  accountName: string
  exchange?: string
}

interface UnifiedTradeWithAccount extends UnifiedTrade {
  accountName: string
}

interface TradesTableProps {
  trades: (TradeWithAccount | UnifiedTradeWithAccount)[]
}

export const TradesTable = ({ trades }: TradesTableProps) => {
  if (trades.length === 0) {
    return (
      <div className="text-center py-8 text-muted">
        <svg className="w-8 h-8 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
        <p className="text-sm">No recent trades</p>
      </div>
    )
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(parseInt(timestamp))
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-dark-600">
              <th className="text-left py-3 font-medium text-muted">Symbol</th>
              <th className="text-left py-3 font-medium text-muted">Side</th>
              <th className="text-left py-3 font-medium text-muted">Exchange</th>
              <th className="text-right py-3 font-medium text-muted">Qty</th>
              <th className="text-right py-3 font-medium text-muted">Price</th>
              <th className="text-right py-3 font-medium text-muted">Value</th>
              <th className="text-right py-3 font-medium text-muted">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-dark-600">
            {trades.map((trade, index) => {
              const qty = parseFloat(trade.execQty)
              const price = parseFloat(trade.execPrice)
              const value = qty * price

              const exchange = (trade as UnifiedTradeWithAccount).exchange || (trade as TradeWithAccount).exchange || 'bybit'

              return (
                <tr key={`${trade.execId}-${index}`} className="hover:bg-gray-50 dark:hover:bg-dark-700/50">
                  <td className="py-3">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {trade.symbol}
                      </div>
                      <div className="text-xs text-muted">
                        {trade.accountName}
                      </div>
                    </div>
                  </td>
                  <td className="py-3">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      trade.side === 'Buy'
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                        : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                    }`}>
                      {trade.side}
                    </span>
                  </td>
                  <td className="py-3">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      exchange === 'bybit' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' :
                      exchange === 'toobit' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' :
                      exchange === 'blofin' ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' :
                      'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300'
                    }`}>
                      {exchangeFactory.getExchangeDisplayName(exchange as any)}
                    </span>
                  </td>
                  <td className="py-3 text-right font-mono">
                    {qty.toFixed(4)}
                  </td>
                  <td className="py-3 text-right font-mono">
                    ${price.toFixed(2)}
                  </td>
                  <td className="py-3 text-right font-mono">
                    ${value.toFixed(2)}
                  </td>
                  <td className="py-3 text-right text-xs text-muted">
                    {formatTime(trade.execTime)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {trades.length > 20 && (
        <div className="text-center py-3 text-xs text-muted border-t border-gray-200 dark:border-dark-600">
          Showing 20 of {trades.length} trades
        </div>
      )}
    </div>
  )
}