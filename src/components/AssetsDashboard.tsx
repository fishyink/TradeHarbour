import { useAppStore } from '../store/useAppStore'
import { useMemo, useState } from 'react'

type SortField = 'value' | 'balance' | 'coin' | 'price' | 'change'
type SortOrder = 'asc' | 'desc'
type CoinCategory = 'all' | 'stablecoin' | 'token' | 'altcoin'

interface Asset {
  coin: string
  balance: number
  usdValue: number
  accountName: string
  accountId: string
  price: number
  change24h: number
  accountColor?: string
  accountType?: string
}

interface GroupedAsset {
  coin: string
  totalBalance: number
  totalValue: number
  avgPrice: number
  change24h: number
  accounts: Asset[]
  isExpanded: boolean
}

interface AccountGroup {
  accountId: string
  accountName: string
  accountColor: string
  totalValue: number
  walletTypes: WalletTypeGroup[]
  isExpanded: boolean
}

interface WalletTypeGroup {
  accountType: string
  assets: Asset[]
  totalValue: number
}

const STABLECOINS = ['USDT', 'USDC', 'BUSD', 'DAI', 'TUSD', 'USDD']
const ACCOUNT_COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#ef4444', // red
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#f97316', // orange
]

export const AssetsDashboard = () => {
  const { accountsData } = useAppStore()
  const [sortField, setSortField] = useState<SortField>('value')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [searchQuery, setSearchQuery] = useState('')
  const [hideDust, setHideDust] = useState(false)
  const [groupByCoin, setGroupByCoin] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<string>('all')
  const [selectedCategory, setSelectedCategory] = useState<CoinCategory>('all')
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set())
  const [groupByAccount, setGroupByAccount] = useState(false)
  const dustThreshold = 1 // Hide assets below $1

  const lastUpdated = useMemo(() => {
    const timestamps = accountsData.map(acc => acc.lastUpdated).filter(Boolean)
    return timestamps.length > 0 ? Math.max(...timestamps) : Date.now()
  }, [accountsData])

  // Generate consistent mock 24h changes based on coin name
  const getMock24hChange = (coin: string): number => {
    // Use coin name to generate consistent pseudo-random number
    let hash = 0
    for (let i = 0; i < coin.length; i++) {
      hash = ((hash << 5) - hash) + coin.charCodeAt(i)
      hash = hash & hash
    }
    // Convert to -10% to +10% range
    return ((Math.abs(hash) % 2000) / 100) - 10
  }

  // Helper to get coin category
  const getCoinCategory = (coin: string): CoinCategory => {
    if (STABLECOINS.includes(coin)) return 'stablecoin'
    return 'altcoin'
  }

  // Helper to get account color
  const getAccountColor = (accountId: string): string => {
    const index = accountsData.findIndex(acc => acc.id === accountId)
    return ACCOUNT_COLORS[index % ACCOUNT_COLORS.length]
  }

  // Aggregate assets across all accounts
  const { assets, totalValue, assetCount, portfolio24hChange } = useMemo(() => {
    const assetMap = new Map<string, Asset[]>()
    let totalCurrentValue = 0
    let total24hAgoValue = 0

    accountsData.forEach(account => {
      if (!account.balance?.coin) return

      account.balance.coin.forEach(coinData => {
        const balance = parseFloat(coinData.walletBalance || '0')
        const usdValue = parseFloat(coinData.usdValue || '0')

        if (balance === 0) return

        const price = balance > 0 ? usdValue / balance : 0
        // Mock 24h change - in real app, fetch from price API
        const change24h = getMock24hChange(coinData.coin)

        totalCurrentValue += usdValue
        total24hAgoValue += usdValue / (1 + change24h / 100)

        const key = `${coinData.coin}-${account.id}-${coinData.accountType || 'default'}`
        const asset: Asset = {
          coin: coinData.coin,
          balance,
          usdValue,
          accountName: account.name,
          accountId: account.id,
          price,
          change24h,
          accountColor: getAccountColor(account.id),
          accountType: coinData.accountType
        }

        if (!assetMap.has(key)) {
          assetMap.set(key, [])
        }
        assetMap.get(key)!.push(asset)
      })
    })

    const allAssets = Array.from(assetMap.values()).flat()
    const portfolioChange = total24hAgoValue > 0
      ? ((totalCurrentValue - total24hAgoValue) / total24hAgoValue) * 100
      : 0

    return {
      assets: allAssets,
      totalValue: totalCurrentValue,
      assetCount: allAssets.length,
      portfolio24hChange: portfolioChange
    }
  }, [accountsData])

  // Group assets by coin
  const groupedAssets = useMemo((): GroupedAsset[] => {
    const groups = new Map<string, Asset[]>()

    assets.forEach(asset => {
      if (!groups.has(asset.coin)) {
        groups.set(asset.coin, [])
      }
      groups.get(asset.coin)!.push(asset)
    })

    return Array.from(groups.entries()).map(([coin, accounts]) => {
      const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0)
      const totalValue = accounts.reduce((sum, a) => sum + a.usdValue, 0)
      const avgPrice = totalBalance > 0 ? totalValue / totalBalance : 0
      const avgChange = accounts.reduce((sum, a) => sum + a.change24h, 0) / accounts.length

      return {
        coin,
        totalBalance,
        totalValue,
        avgPrice,
        change24h: avgChange,
        accounts,
        isExpanded: expandedGroups.has(coin)
      }
    })
  }, [assets, expandedGroups])

  // Group assets by account (with wallet type breakdown)
  const accountGroups = useMemo((): AccountGroup[] => {
    const groups = new Map<string, { assets: Asset[], accountName: string, accountColor: string }>()

    assets.forEach(asset => {
      if (!groups.has(asset.accountId)) {
        groups.set(asset.accountId, {
          assets: [],
          accountName: asset.accountName,
          accountColor: asset.accountColor || '#3b82f6'
        })
      }
      groups.get(asset.accountId)!.assets.push(asset)
    })

    return Array.from(groups.entries()).map(([accountId, data]) => {
      // Group by wallet type
      const walletTypeMap = new Map<string, Asset[]>()
      data.assets.forEach(asset => {
        const type = asset.accountType || 'spot'
        if (!walletTypeMap.has(type)) {
          walletTypeMap.set(type, [])
        }
        walletTypeMap.get(type)!.push(asset)
      })

      const walletTypes: WalletTypeGroup[] = Array.from(walletTypeMap.entries()).map(([accountType, assets]) => ({
        accountType,
        assets,
        totalValue: assets.reduce((sum, a) => sum + a.usdValue, 0)
      }))

      const totalValue = data.assets.reduce((sum, a) => sum + a.usdValue, 0)

      return {
        accountId,
        accountName: data.accountName,
        accountColor: data.accountColor,
        totalValue,
        walletTypes,
        isExpanded: expandedAccounts.has(accountId)
      }
    })
  }, [assets, expandedAccounts])

  // Filter and sort assets
  const filteredAndSortedAssets = useMemo(() => {
    let filtered = [...assets]

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(asset =>
        asset.coin.toLowerCase().includes(query) ||
        asset.accountName.toLowerCase().includes(query)
      )
    }

    // Apply account filter
    if (selectedAccount !== 'all') {
      filtered = filtered.filter(asset => asset.accountId === selectedAccount)
    }

    // Apply category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(asset => getCoinCategory(asset.coin) === selectedCategory)
    }

    // Apply dust filter
    if (hideDust) {
      filtered = filtered.filter(asset => asset.usdValue >= dustThreshold)
    }

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0

      if (sortField === 'value') {
        comparison = a.usdValue - b.usdValue
      } else if (sortField === 'balance') {
        comparison = a.balance - b.balance
      } else if (sortField === 'coin') {
        comparison = a.coin.localeCompare(b.coin)
      } else if (sortField === 'price') {
        comparison = a.price - b.price
      } else if (sortField === 'change') {
        comparison = a.change24h - b.change24h
      }

      return sortOrder === 'asc' ? comparison : -comparison
    })

    return filtered
  }, [assets, sortField, sortOrder, searchQuery, hideDust, dustThreshold, selectedAccount, selectedCategory, getCoinCategory])

  // Filter grouped assets
  const filteredGroupedAssets = useMemo(() => {
    let filtered = [...groupedAssets]

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(group => group.coin.toLowerCase().includes(query))
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(group => getCoinCategory(group.coin) === selectedCategory)
    }

    if (hideDust) {
      filtered = filtered.filter(group => group.totalValue >= dustThreshold)
    }

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0
      if (sortField === 'value') {
        comparison = a.totalValue - b.totalValue
      } else if (sortField === 'balance') {
        comparison = a.totalBalance - b.totalBalance
      } else if (sortField === 'coin') {
        comparison = a.coin.localeCompare(b.coin)
      } else if (sortField === 'price') {
        comparison = a.avgPrice - b.avgPrice
      } else if (sortField === 'change') {
        comparison = a.change24h - b.change24h
      }

      return sortOrder === 'asc' ? comparison : -comparison
    })

    return filtered
  }, [groupedAssets, searchQuery, selectedCategory, hideDust, dustThreshold, sortField, sortOrder, getCoinCategory])

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
  }

  const toggleExpand = (coin: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(coin)) {
        next.delete(coin)
      } else {
        next.add(coin)
      }
      return next
    })
  }

  const toggleAccountExpand = (accountId: string) => {
    setExpandedAccounts(prev => {
      const next = new Set(prev)
      if (next.has(accountId)) {
        next.delete(accountId)
      } else {
        next.add(accountId)
      }
      return next
    })
  }

  const formatTimestamp = (timestamp: number) => {
    const now = Date.now()
    const diff = now - timestamp
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)

    if (seconds < 60) return `${seconds}s ago`
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return new Date(timestamp).toLocaleString()
  }

  const getCoinIcon = (coin: string) => {
    // Placeholder for coin icons - return first 2 letters
    return coin.slice(0, 2).toUpperCase()
  }

  const exportToCSV = () => {
    const headers = ['Asset', 'Account', 'Balance', 'Price', 'Value', 'Allocation %']
    const rows = filteredAndSortedAssets.map(asset => {
      const allocation = totalValue > 0 ? (asset.usdValue / totalValue) * 100 : 0
      const price = asset.balance > 0 ? asset.usdValue / asset.balance : 0
      return [
        asset.coin,
        asset.accountName,
        asset.balance.toString(),
        price.toFixed(8),
        asset.usdValue.toFixed(2),
        allocation.toFixed(2)
      ]
    })

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `assets-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Assets</h1>
          <p className="text-sm text-muted-foreground mt-1">Last updated: {formatTimestamp(lastUpdated)}</p>
        </div>
        <button
          onClick={exportToCSV}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 text-sm font-medium"
        >
          Export CSV
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border bg-card p-6">
          <p className="text-sm font-medium text-muted-foreground">Total Value</p>
          <p className="text-2xl font-bold mt-2">
            ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <p className="text-sm font-medium text-muted-foreground">24h Change</p>
          <p className={`text-2xl font-bold mt-2 ${portfolio24hChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {portfolio24hChange >= 0 ? '+' : ''}{portfolio24hChange.toFixed(2)}%
          </p>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <p className="text-sm font-medium text-muted-foreground">Assets</p>
          <p className="text-2xl font-bold mt-2">{assetCount}</p>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <p className="text-sm font-medium text-muted-foreground">Accounts</p>
          <p className="text-2xl font-bold mt-2">{accountsData.length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search assets or accounts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 rounded-md border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <select
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
            className="px-4 py-2 rounded-md border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Accounts</option>
            {accountsData.map(account => (
              <option key={account.id} value={account.id}>{account.name}</option>
            ))}
          </select>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as CoinCategory)}
            className="px-4 py-2 rounded-md border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Types</option>
            <option value="stablecoin">Stablecoins</option>
            <option value="altcoin">Altcoins</option>
          </select>
        </div>

        <div className="flex gap-4 flex-wrap">
          <label className="flex items-center gap-2 px-4 py-2 rounded-md border bg-card cursor-pointer hover:bg-muted/50">
            <input
              type="checkbox"
              checked={hideDust}
              onChange={(e) => setHideDust(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm font-medium">Hide dust (&lt;${dustThreshold})</span>
          </label>

          <label className="flex items-center gap-2 px-4 py-2 rounded-md border bg-card cursor-pointer hover:bg-muted/50">
            <input
              type="checkbox"
              checked={groupByCoin}
              onChange={(e) => setGroupByCoin(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm font-medium">Group by coin</span>
          </label>

          <label className="flex items-center gap-2 px-4 py-2 rounded-md border bg-card cursor-pointer hover:bg-muted/50">
            <input
              type="checkbox"
              checked={groupByAccount}
              onChange={(e) => setGroupByAccount(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm font-medium">Group by account</span>
          </label>
        </div>
      </div>

      {/* Assets Table */}
      <div className="rounded-lg border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted/80"
                  onClick={() => toggleSort('coin')}
                >
                  Asset {sortField === 'coin' && (sortOrder === 'desc' ? '↓' : '↑')}
                </th>
                {!groupByCoin && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Account
                  </th>
                )}
                <th
                  className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted/80"
                  onClick={() => toggleSort('price')}
                >
                  Price {sortField === 'price' && (sortOrder === 'desc' ? '↓' : '↑')}
                </th>
                <th
                  className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted/80"
                  onClick={() => toggleSort('change')}
                >
                  24h Change {sortField === 'change' && (sortOrder === 'desc' ? '↓' : '↑')}
                </th>
                <th
                  className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted/80"
                  onClick={() => toggleSort('balance')}
                >
                  Balance {sortField === 'balance' && (sortOrder === 'desc' ? '↓' : '↑')}
                </th>
                <th
                  className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted/80"
                  onClick={() => toggleSort('value')}
                >
                  Value {sortField === 'value' && (sortOrder === 'desc' ? '↓' : '↑')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Allocation
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {groupByAccount ? (
                accountGroups.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                      No assets found. Add an account to get started.
                    </td>
                  </tr>
                ) : (
                  accountGroups.map((group) => {
                    const allocation = totalValue > 0 ? (group.totalValue / totalValue) * 100 : 0

                    return (
                      <>
                        {/* Account Row */}
                        <tr key={group.accountId} className="hover:bg-muted/50 bg-muted/30">
                          <td className="px-6 py-4" colSpan={2}>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => toggleAccountExpand(group.accountId)}
                                className="text-muted-foreground hover:text-foreground"
                              >
                                {group.isExpanded ? '▼' : '▶'}
                              </button>
                              <div
                                className="h-3 w-3 rounded-full"
                                style={{ backgroundColor: group.accountColor }}
                              />
                              <span className="font-medium">{group.accountName}</span>
                              <span className="text-xs text-muted-foreground">
                                ({group.walletTypes.length} wallet{group.walletTypes.length > 1 ? 's' : ''})
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right font-mono text-sm">-</td>
                          <td className="px-6 py-4 text-right">-</td>
                          <td className="px-6 py-4 text-right font-mono">-</td>
                          <td className="px-6 py-4 text-right font-medium">
                            ${group.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-primary rounded-full"
                                  style={{ width: `${Math.min(allocation, 100)}%` }}
                                />
                              </div>
                              <span className="text-sm text-muted-foreground w-12 text-right">
                                {allocation.toFixed(1)}%
                              </span>
                            </div>
                          </td>
                        </tr>

                        {/* Wallet Type Rows (when expanded) */}
                        {group.isExpanded && group.walletTypes.map((walletType) => (
                          <>
                            <tr key={`${group.accountId}-${walletType.accountType}`} className="hover:bg-muted/50 bg-background">
                              <td className="px-6 py-4 pl-16" colSpan={2}>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium capitalize">{walletType.accountType}</span>
                                  <span className="text-xs text-muted-foreground">({walletType.assets.length} assets)</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-right font-mono text-sm">-</td>
                              <td className="px-6 py-4 text-right">-</td>
                              <td className="px-6 py-4 text-right font-mono">-</td>
                              <td className="px-6 py-4 text-right text-sm">
                                ${walletType.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="px-6 py-4 text-right">
                                <span className="text-sm text-muted-foreground">
                                  {totalValue > 0 ? ((walletType.totalValue / totalValue) * 100).toFixed(1) : '0.0'}%
                                </span>
                              </td>
                            </tr>

                            {/* Asset Rows under Wallet Type */}
                            {walletType.assets.map((asset, idx) => {
                              const assetAllocation = totalValue > 0 ? (asset.usdValue / totalValue) * 100 : 0
                              return (
                                <tr key={`${group.accountId}-${walletType.accountType}-${asset.coin}-${idx}`} className="hover:bg-muted/50 bg-background/50">
                                  <td className="px-6 py-4 pl-24">
                                    <div className="flex items-center">
                                      <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center mr-2">
                                        <span className="text-xs font-bold text-primary">{getCoinIcon(asset.coin)}</span>
                                      </div>
                                      <span className="text-sm">{asset.coin}</span>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4"></td>
                                  <td className="px-6 py-4 text-right font-mono text-sm">
                                    ${asset.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })}
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                    <span className={`text-sm ${asset.change24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                      {asset.change24h >= 0 ? '+' : ''}{asset.change24h.toFixed(2)}%
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 text-right font-mono text-sm">
                                    {asset.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })}
                                  </td>
                                  <td className="px-6 py-4 text-right text-sm">
                                    ${asset.usdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                    <span className="text-sm text-muted-foreground">{assetAllocation.toFixed(1)}%</span>
                                  </td>
                                </tr>
                              )
                            })}
                          </>
                        ))}
                      </>
                    )
                  })
                )
              ) : groupByCoin ? (
                filteredGroupedAssets.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                      No assets found. Add an account to get started.
                    </td>
                  </tr>
                ) : (
                  filteredGroupedAssets.map((group) => {
                    const allocation = totalValue > 0 ? (group.totalValue / totalValue) * 100 : 0

                    return (
                      <>
                        <tr key={group.coin} className="hover:bg-muted/50 bg-muted/30">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => toggleExpand(group.coin)}
                                className="text-muted-foreground hover:text-foreground"
                              >
                                {group.isExpanded ? '▼' : '▶'}
                              </button>
                              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <span className="text-xs font-bold text-primary">{getCoinIcon(group.coin)}</span>
                              </div>
                              <span className="font-medium">{group.coin}</span>
                              <span className="text-xs text-muted-foreground">({group.accounts.length} accounts)</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right font-mono text-sm">
                            ${group.avgPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className={`font-medium ${group.change24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                              {group.change24h >= 0 ? '+' : ''}{group.change24h.toFixed(2)}%
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right font-mono">
                            {group.totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })}
                          </td>
                          <td className="px-6 py-4 text-right font-medium">
                            ${group.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-primary rounded-full"
                                  style={{ width: `${Math.min(allocation, 100)}%` }}
                                />
                              </div>
                              <span className="text-sm text-muted-foreground w-12 text-right">
                                {allocation.toFixed(1)}%
                              </span>
                            </div>
                          </td>
                        </tr>
                        {group.isExpanded && group.accounts.map((asset, idx) => {
                          const assetAllocation = totalValue > 0 ? (asset.usdValue / totalValue) * 100 : 0
                          return (
                            <tr key={`${asset.accountId}-${asset.coin}-${idx}`} className="hover:bg-muted/50 bg-background">
                              <td className="px-6 py-4 pl-20">
                                <div className="flex items-center gap-2">
                                  <div
                                    className="h-3 w-3 rounded-full"
                                    style={{ backgroundColor: asset.accountColor }}
                                  />
                                  <span className="text-sm text-muted-foreground">{asset.accountName}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-right font-mono text-sm">
                                ${asset.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })}
                              </td>
                              <td className="px-6 py-4 text-right">
                                <span className={`text-sm ${asset.change24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                  {asset.change24h >= 0 ? '+' : ''}{asset.change24h.toFixed(2)}%
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right font-mono text-sm">
                                {asset.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })}
                              </td>
                              <td className="px-6 py-4 text-right text-sm">
                                ${asset.usdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="px-6 py-4 text-right">
                                <span className="text-sm text-muted-foreground">{assetAllocation.toFixed(1)}%</span>
                              </td>
                            </tr>
                          )
                        })}
                      </>
                    )
                  })
                )
              ) : (
                filteredAndSortedAssets.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                      No assets found. Add an account to get started.
                    </td>
                  </tr>
                ) : (
                  filteredAndSortedAssets.map((asset, idx) => {
                    const allocation = totalValue > 0 ? (asset.usdValue / totalValue) * 100 : 0

                    return (
                      <tr
                        key={`${asset.accountId}-${asset.coin}-${idx}`}
                        className="hover:bg-muted/50"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center mr-3">
                              <span className="text-xs font-bold text-primary">{getCoinIcon(asset.coin)}</span>
                            </div>
                            <span className="font-medium">{asset.coin}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div
                              className="h-3 w-3 rounded-full"
                              style={{ backgroundColor: asset.accountColor }}
                            />
                            <span className="text-sm text-muted-foreground">{asset.accountName}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right font-mono text-sm">
                          ${asset.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className={`font-medium ${asset.change24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {asset.change24h >= 0 ? '+' : ''}{asset.change24h.toFixed(2)}%
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-mono">
                          {asset.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })}
                        </td>
                        <td className="px-6 py-4 text-right font-medium">
                          ${asset.usdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full"
                                style={{ width: `${Math.min(allocation, 100)}%` }}
                              />
                            </div>
                            <span className="text-sm text-muted-foreground w-12 text-right">
                              {allocation.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}