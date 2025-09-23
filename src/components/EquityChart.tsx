import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface EquityData {
  timestamp: number
  totalEquity: number
  account1?: number
  account2?: number
  account3?: number
}

interface EquityChartProps {
  data: EquityData[]
}

export const EquityChart = ({ data }: EquityChartProps) => {
  console.log('EquityChart component rendering with real data:', data.length, 'points')

  // Debug: Log the actual data being passed to the chart
  if (data && data.length > 0) {
    console.log('📊 CHART DEBUG - First data point:', data[0])
    console.log('📊 CHART DEBUG - Last data point:', data[data.length - 1])
    console.log('📊 CHART DEBUG - Sample values:', {
      totalEquity: data[data.length - 1]?.totalEquity,
      account1: data[data.length - 1]?.account1,
      account2: data[data.length - 1]?.account2,
    })
  }

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  }

  const formatCurrency = (value: number) => {
    return `$${value.toLocaleString()}`
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-600 rounded-lg shadow-lg p-3">
          <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
            {new Date(label).toLocaleDateString('en-US', {
              weekday: 'short',
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  // Use real data if available, otherwise show message
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="text-center">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Real-time Equity Tracking
          </h3>
          <p className="text-sm text-muted">
            Equity history will appear here as data is collected over time
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 30, left: 20, bottom: 20 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            className="opacity-20"
            stroke="currentColor"
          />
          <XAxis
            dataKey="timestamp"
            tickFormatter={formatDate}
            className="text-xs"
            stroke="currentColor"
            opacity={0.7}
            tick={{ fontSize: 12 }}
            interval="preserveStartEnd"
            minTickGap={60}
            domain={['dataMin', 'dataMax']}
            type="number"
            scale="time"
          />
          <YAxis
            tickFormatter={(value) => `$${(value / 1000).toFixed(1)}k`}
            className="text-xs"
            stroke="currentColor"
            opacity={0.7}
            tick={{ fontSize: 12 }}
            domain={['dataMin - 100', 'dataMax + 100']}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="totalEquity"
            stroke="#3b82f6"
            strokeWidth={3}
            dot={false}
            name="Total Equity"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {data[0]?.account1 !== undefined && (
            <Line
              type="monotone"
              dataKey="account1"
              stroke="#10b981"
              strokeWidth={2}
              dot={false}
              name="Account 1"
              opacity={0.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
          {(data[0] as any)?.account2 !== undefined && (
            <Line
              type="monotone"
              dataKey="account2"
              stroke="#14b8a6"
              strokeWidth={2}
              dot={false}
              name="Account 2"
              opacity={0.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
          {(data[0] as any)?.account3 !== undefined && (
            <Line
              type="monotone"
              dataKey="account3"
              stroke="#ef4444"
              strokeWidth={2}
              dot={false}
              name="Account 3"
              opacity={0.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}