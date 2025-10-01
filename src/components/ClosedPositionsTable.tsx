import { BybitClosedPnL } from '../types/bybit'

interface PositionWithAccount extends BybitClosedPnL {
  accountName: string
  exchange?: string
}

interface ClosedPositionsTableProps {
  positions: PositionWithAccount[]
}

export const ClosedPositionsTable = ({ positions }: ClosedPositionsTableProps) => {
  if (positions.length === 0) {
    return (
      <div className="text-center py-8 text-muted">
        <svg className="w-8 h-8 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
        <p className="text-sm">No closed positions</p>
      </div>
    )
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(parseInt(timestamp))
    return date.toLocaleString('en-US', {
      day: '2-digit',
      month: 'short',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).replace(',', ' -')
  }

  const formatDuration = (startTime: string, endTime: string) => {
    const start = parseInt(startTime)
    const end = parseInt(endTime)
    const durationMs = end - start

    const seconds = Math.floor(durationMs / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) {
      const remainingHours = hours % 24
      const remainingMinutes = minutes % 60
      return `${days}d ${remainingHours}h ${remainingMinutes}m`
    } else if (hours > 0) {
      const remainingMinutes = minutes % 60
      const remainingSeconds = seconds % 60
      return `${hours}h ${remainingMinutes}m ${remainingSeconds}s`
    } else if (minutes > 0) {
      const remainingSeconds = seconds % 60
      return `${minutes}m ${remainingSeconds}s`
    } else {
      return `${seconds}s`
    }
  }

  const formatSize = (qty: string, side: string) => {
    const quantity = parseFloat(qty)
    const sign = side === 'Buy' ? '+' : '-'
    return `${sign}${quantity}`
  }

  const getTradeDirection = (side: string) => {
    // Convert Bybit's 'Buy'/'Sell' to 'Long'/'Short'
    // Buy = Long position, Sell = Short position
    return side === 'Buy' ? 'LONG' : 'SHORT'
  }

  const getDirectionStyle = (side: string) => {
    return side === 'Buy'
      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
      : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
  }

  return (
    <div className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm table-fixed">
          <colgroup>
            <col className="w-[15%]" />
            <col className="w-[16%]" />
            <col className="w-[10%]" />
            <col className="w-[18%]" />
            <col className="w-[12%]" />
            <col className="w-[18%]" />
            <col className="w-[11%]" />
          </colgroup>
          <thead>
            <tr className="border-b border-gray-200 dark:border-dark-600">
              <th className="text-left py-2 px-3 font-medium text-muted">Account</th>
              <th className="text-left py-2 px-3 font-medium text-muted">Symbol/Size</th>
              <th className="text-center py-2 px-3 font-medium text-muted">Side</th>
              <th className="text-left py-2 px-3 font-medium text-muted">Open</th>
              <th className="text-center py-2 px-3 font-medium text-muted">Duration</th>
              <th className="text-left py-2 px-3 font-medium text-muted">Close</th>
              <th className="text-right py-2 px-3 font-medium text-muted">Realised PnL</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-dark-600">
            {positions.map((position, index) => {
              const qty = parseFloat(position.qty || position.closedSize || '0')
              const avgEntryPrice = parseFloat(position.avgEntryPrice || '0')
              const avgExitPrice = parseFloat(position.avgExitPrice || '0')
              const closedPnl = parseFloat(position.closedPnl || '0')

              const duration = formatDuration(
                position.createdTime,
                position.updatedTime || position.createdTime
              )

              return (
                <tr key={`${position.orderId}-${index}`} className="hover:bg-gray-50 dark:hover:bg-dark-700/50">
                  <td className="py-2 px-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900/30 rounded flex items-center justify-center">
                        <span className="text-blue-600 dark:text-blue-400 text-xs font-bold">
                          B
                        </span>
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900 dark:text-white text-xs">
                          Bybit
                        </div>
                        <div className="text-xs text-muted truncate">
                          {position.accountName}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="py-2 px-3">
                    <div className="min-w-0">
                      <div className="font-medium text-gray-900 dark:text-white text-sm">
                        {position.symbol}
                      </div>
                      <div className="text-xs text-muted">
                        {formatSize(position.qty || position.closedSize || '0', position.side)}
                      </div>
                    </div>
                  </td>

                  <td className="py-2 px-3 text-center">
                    <span className={`inline-flex px-2 py-1 text-xs font-bold rounded ${getDirectionStyle(position.side)}`}>
                      {getTradeDirection(position.side)}
                    </span>
                  </td>

                  <td className="py-2 px-3">
                    <div className="min-w-0">
                      <div className="font-mono text-sm text-gray-900 dark:text-white">
                        ${avgEntryPrice.toFixed(2)}@
                      </div>
                      <div className="text-xs text-muted truncate">
                        {formatTime(position.createdTime)}
                      </div>
                    </div>
                  </td>

                  <td className="py-2 px-3 text-center">
                    <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                      {duration}
                    </span>
                  </td>

                  <td className="py-2 px-3">
                    <div className="min-w-0">
                      <div className="font-mono text-sm text-gray-900 dark:text-white">
                        ${avgExitPrice.toFixed(2)}@
                      </div>
                      <div className="text-xs text-muted truncate">
                        {formatTime(position.updatedTime || position.createdTime)}
                      </div>
                    </div>
                  </td>

                  <td className="py-2 px-3 text-right">
                    <div className={`font-semibold text-sm ${
                      closedPnl >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    }`}>
                      {closedPnl >= 0 ? '+' : ''}${closedPnl.toFixed(2)}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {positions.length > 20 && (
        <div className="text-center py-3 text-xs text-muted border-t border-gray-200 dark:border-dark-600">
          Showing {Math.min(20, positions.length)} of {positions.length} positions
        </div>
      )}
    </div>
  )
}