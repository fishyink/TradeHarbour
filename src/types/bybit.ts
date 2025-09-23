export interface BybitBalance {
  coin: string
  walletBalance: string
  usdValue: string
  bonus: string
}

export interface BybitPosition {
  symbol: string
  side: string
  size: string
  positionValue: string
  entryPrice: string
  markPrice: string
  liqPrice: string
  unrealisedPnl: string
  positionMM: string
  positionIM: string
  tpslMode: string
  riskId: string
  riskLimitValue: string
  category: string
  positionStatus: string
  adlRankIndicator: string
  isReduceOnly: boolean
  mmrSysUpdatedTime: string
  leverageSysUpdatedTime: string
  createdTime: string
  updatedTime: string
}

export interface BybitTrade {
  symbol: string
  orderId: string
  orderLinkId: string
  side: string
  orderType: string
  execFee: string
  execId: string
  execPrice: string
  execQty: string
  execTime: string
  isMaker: boolean
  feeRate: string
  tradeIv: string
  markIv: string
  markPrice: string
  indexPrice: string
  underlyingPrice: string
  blockTradeId: string
  closedSize: string
}

export interface BybitClosedPnL {
  symbol: string
  orderId: string
  side: 'Buy' | 'Sell'
  qty: string
  orderPrice: string
  orderType: 'Market' | 'Limit'
  execType: 'Trade' | 'BustTrade' | 'SessionSettlePnL' | 'Settle' | 'MovePosition'
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
}

export interface BybitAccountInfo {
  totalEquity: string
  totalWalletBalance: string
  totalMarginBalance: string
  totalAvailableBalance: string
  totalPerpUPL: string
  totalInitialMargin: string
  totalMaintenanceMargin: string
  coin: BybitBalance[]
}

export interface BybitApiResponse<T> {
  retCode: number
  retMsg: string
  result: T
  retExtInfo: any
  time: number
}

export interface AccountData {
  id: string
  name: string
  balance: BybitAccountInfo | null
  positions: BybitPosition[]
  trades: BybitTrade[]
  closedPnL: BybitClosedPnL[]
  lastUpdated: number
  error?: string
}