export type ExchangeType = 'bybit' | 'toobit' | 'blofin'

// Common interface that all exchanges must implement
export interface ExchangeAccount {
  id: string
  name: string
  exchange: ExchangeType
  apiKey: string
  apiSecret: string
  isTestnet: boolean
  createdAt: number
  // Toobit specific fields
  passphrase?: string // Required for Toobit
  // Blofin specific fields
  accessPassphrase?: string // Required for BloFin
}

// Unified data structures
export interface UnifiedBalance {
  coin: string
  walletBalance: string
  usdValue: string
  bonus?: string
}

export interface UnifiedPosition {
  symbol: string
  side: string
  size: string
  positionValue: string
  entryPrice: string
  markPrice: string
  liqPrice?: string
  unrealisedPnl: string
  leverage?: string
  exchange: ExchangeType
  createdTime: string
  updatedTime: string
}

export interface UnifiedTrade {
  symbol: string
  orderId: string
  side: string
  orderType: string
  execFee: string
  execId: string
  execPrice: string
  execQty: string
  execTime: string
  exchange: ExchangeType
  isMaker?: boolean
  feeRate?: string
}

export interface UnifiedClosedPnL {
  symbol: string
  orderId: string
  side: 'Buy' | 'Sell'
  qty: string
  orderPrice: string
  orderType: 'Market' | 'Limit'
  execType: string
  closedSize: string
  cumEntryValue: string
  avgEntryPrice: string
  cumExitValue: string
  avgExitPrice: string
  closedPnl: string
  fillCount: string
  leverage: string
  createdTime: string
  updatedTime: string
  exchange: ExchangeType
}

export interface UnifiedAccountInfo {
  totalEquity: string
  totalWalletBalance: string
  totalMarginBalance: string
  totalAvailableBalance: string
  totalPerpUPL: string
  totalInitialMargin: string
  totalMaintenanceMargin: string
  coin: UnifiedBalance[]
  exchange: ExchangeType
}

export interface UnifiedAccountData {
  id: string
  name: string
  exchange: ExchangeType
  balance: UnifiedAccountInfo | null
  positions: UnifiedPosition[]
  trades: UnifiedTrade[]
  closedPnL: UnifiedClosedPnL[]
  lastUpdated: number
  error?: string
}

// API Response interfaces
export interface ApiResponse<T> {
  success: boolean
  code: number
  message: string
  data: T
  timestamp?: number
}

// Common exchange API interface
export interface ExchangeAPI {
  getAccountBalance(account: ExchangeAccount): Promise<UnifiedAccountInfo>
  getPositions(account: ExchangeAccount): Promise<UnifiedPosition[]>
  getTrades(account: ExchangeAccount, limit?: number): Promise<UnifiedTrade[]>
  getClosedPnL(account: ExchangeAccount, limit?: number): Promise<UnifiedClosedPnL[]>
  fetchAccountData(account: ExchangeAccount): Promise<UnifiedAccountData>
}