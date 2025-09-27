import { ReactNode } from 'react'

interface StatsCardProps {
  title: string
  value: string
  change: number
  icon: ReactNode
  timeframe?: string
}

export const StatsCard = ({ title, value, change, icon, timeframe }: StatsCardProps) => {
  const isPositive = change >= 0
  const isZero = change === 0

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-muted">{title}</p>
            {timeframe && (
              <span className="text-xs text-muted opacity-70">{timeframe}</span>
            )}
          </div>
          <p className={`text-2xl font-bold mt-1 ${
            isZero ? 'text-gray-900 dark:text-white' : isPositive ? 'text-success' : 'text-danger'
          }`}>
            {value}
          </p>
        </div>
        <div className="text-primary-600 dark:text-primary-400">
          {icon}
        </div>
      </div>
    </div>
  )
}