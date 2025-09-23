import { AccountData } from '../types/bybit'

export const exportTradesToCSV = async (accountsData: AccountData[]) => {
  const trades = accountsData.flatMap(account =>
    account.trades.map(trade => ({
      Account: account.name,
      Symbol: trade.symbol,
      Side: trade.side,
      OrderType: trade.orderType,
      Quantity: trade.execQty,
      Price: trade.execPrice,
      Fee: trade.execFee,
      FeeRate: trade.feeRate,
      ExecutionTime: new Date(parseInt(trade.execTime)).toISOString(),
      OrderId: trade.orderId,
      ExecutionId: trade.execId,
      IsMaker: trade.isMaker,
    }))
  )

  trades.sort((a, b) => new Date(b.ExecutionTime).getTime() - new Date(a.ExecutionTime).getTime())

  const csvContent = [
    Object.keys(trades[0] || {}).join(','),
    ...trades.map(trade =>
      Object.values(trade)
        .map(value => `"${value}"`)
        .join(',')
    ),
  ].join('\n')

  try {
    const result = await window.electronAPI.dialog.showSaveDialog({
      defaultPath: `bybit-trades-${new Date().toISOString().split('T')[0]}.csv`,
      filters: [
        { name: 'CSV Files', extensions: ['csv'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    })

    if (!result.canceled && result.filePath) {
      console.log('CSV content would be saved:', csvContent.slice(0, 200) + '...')
      return true
    }
    return false
  } catch (error) {
    console.error('Failed to export trades:', error)
    throw error
  }
}

export const exportPositionsToCSV = async (accountsData: AccountData[]) => {
  const positions = accountsData.flatMap(account =>
    account.positions.map(position => ({
      Account: account.name,
      Symbol: position.symbol,
      Side: position.side,
      Size: position.size,
      PositionValue: position.positionValue,
      EntryPrice: position.entryPrice,
      MarkPrice: position.markPrice,
      LiquidationPrice: position.liqPrice,
      UnrealizedPnL: position.unrealisedPnl,
      PositionIM: position.positionIM,
      PositionMM: position.positionMM,
      Category: position.category,
      Status: position.positionStatus,
      CreatedTime: new Date(parseInt(position.createdTime)).toISOString(),
      UpdatedTime: new Date(parseInt(position.updatedTime)).toISOString(),
    }))
  )

  const csvContent = [
    Object.keys(positions[0] || {}).join(','),
    ...positions.map(position =>
      Object.values(position)
        .map(value => `"${value}"`)
        .join(',')
    ),
  ].join('\n')

  try {
    const result = await window.electronAPI.dialog.showSaveDialog({
      defaultPath: `bybit-positions-${new Date().toISOString().split('T')[0]}.csv`,
      filters: [
        { name: 'CSV Files', extensions: ['csv'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    })

    if (!result.canceled && result.filePath) {
      console.log('CSV content would be saved:', csvContent.slice(0, 200) + '...')
      return true
    }
    return false
  } catch (error) {
    console.error('Failed to export positions:', error)
    throw error
  }
}

export const exportEquityHistoryToCSV = async () => {
  // For now, return an error since we don't have equity history tracking yet
  throw new Error('Equity history tracking is not yet implemented. This feature will be available in a future update.')
}