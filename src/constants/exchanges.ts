// Supported exchanges - fully tested and supported
export const SUPPORTED_EXCHANGES = ['bybit'] as const

// Priority beta exchanges - show at top but marked as beta
export const PRIORITY_BETA_EXCHANGES = ['toobit', 'blofin'] as const

export type SupportedExchange = typeof SUPPORTED_EXCHANGES[number]
export type PriorityBetaExchange = typeof PRIORITY_BETA_EXCHANGES[number]

// Exchange display information
export const EXCHANGE_INFO: Record<string, {
  name: string
  supported: boolean
}> = {
  bybit: { name: 'Bybit', supported: true },
  toobit: { name: 'Toobit', supported: false },
  blofin: { name: 'BloFin', supported: false },
}

// Check if an exchange is supported
export function isSupportedExchange(exchange: string): boolean {
  return SUPPORTED_EXCHANGES.includes(exchange as SupportedExchange)
}

// Get exchange display name
export function getExchangeDisplayName(exchange: string): string {
  return EXCHANGE_INFO[exchange]?.name || exchange.charAt(0).toUpperCase() + exchange.slice(1)
}
