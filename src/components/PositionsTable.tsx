import { BybitPosition } from '../types/bybit'

interface PositionWithAccount extends BybitPosition {
  accountName: string
}

interface PositionsTableProps {
  positions: PositionWithAccount[]
}

export const PositionsTable = ({ positions }: PositionsTableProps) => {
  if (positions.length === 0) {
    return (
      <div className="text-center py-8 text-muted">
        <svg className="w-8 h-8 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <p className="text-sm">No open positions</p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-dark-600">
              <th className="text-left py-3 font-medium text-muted">Symbol</th>
              <th className="text-left py-3 font-medium text-muted">Side</th>
              <th className="text-right py-3 font-medium text-muted">Size</th>
              <th className="text-right py-3 font-medium text-muted">PnL</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-dark-600">
            {positions.map((position, index) => {
              const pnl = parseFloat(position.unrealisedPnl)
              const size = parseFloat(position.size)

              return (
                <tr key={`${position.symbol}-${index}`} className="hover:bg-gray-50 dark:hover:bg-dark-700/50">
                  <td className="py-3">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {position.symbol}
                      </div>
                      <div className="text-xs text-muted">
                        {position.accountName}
                      </div>
                    </div>
                  </td>
                  <td className="py-3">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      position.side === 'Buy'
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                        : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                    }`}>
                      {position.side}
                    </span>
                  </td>
                  <td className="py-3 text-right font-mono">
                    {size.toFixed(4)}
                  </td>
                  <td className="py-3 text-right">
                    <span className={`font-medium ${
                      pnl >= 0 ? 'text-success' : 'text-danger'
                    }`}>
                      {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}