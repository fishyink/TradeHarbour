import { ReactNode } from 'react'

interface StatsCardProps {
  title: string
  value: string
  change: number
  icon: ReactNode
}

export const StatsCard = ({ title, value, change, icon }: StatsCardProps) => {
  const isPositive = change >= 0
  const isZero = change === 0

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {value}
          </p>
          {!isZero && (
            <p className={`text-sm mt-1 flex items-center ${
              isPositive ? 'text-success' : 'text-danger'
            }`}>
              <svg
                className={`w-4 h-4 mr-1 ${isPositive ? '' : 'rotate-180'}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 11l5-5m0 0l5 5m-5-5v12"
                />
              </svg>
              {isPositive ? '+' : ''}{change.toFixed(2)}
              {title.includes('%') ? '' : title.includes('Rate') ? '%' : ''}
            </p>
          )}
        </div>
        <div className="text-primary-600 dark:text-primary-400">
          {icon}
        </div>
      </div>
    </div>
  )
}