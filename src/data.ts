import type { Position, GroupSummary } from './types'

const ASSET_TYPES = ['碳现货', '股票', '债券', '互换', '期权'] as const
const ACCOUNTS = ['Book_Alpha', 'Book_Beta', 'Macro_Fund1', 'Quant_Prop', 'Delta_One', 'FixedInc_01']
const COUNTERPARTY_MAP: Record<string, string[]> = {
  '碳现货': ['碳现货'],
  '股票': ['A股', '港股通'],
  '债券': ['债券', '资产支持证券'],
  '互换': ['收益互换'],
  '期权': ['外汇期权'],
}
const CURRENCIES = ['USD', 'CNY', 'HKD']

/** 导出供筛选组件使用 */
export const ALL_ACCOUNTS = [...ACCOUNTS]
export const ALL_ASSET_TYPES = [...ASSET_TYPES]
export const ASSET_TO_COUNTERPARTY = {
  map: { ...COUNTERPARTY_MAP },
  get all() {
    return [...new Set(Object.values(COUNTERPARTY_MAP).flat())]
  },
}

export function generateMockData(): Position[] {
  const data: Position[] = []
  let idCounter = 1

  ASSET_TYPES.forEach((type) => {
    const count = type === '股票' ? 60 : type === '债券' ? 40 : 20
    for (let i = 0; i < count; i++) {
      const sod = Math.floor(Math.random() * 100000) * 100
      const intra = Math.floor(Math.random() * 20000) * (Math.random() > 0.5 ? 1 : -1)
      const cost = 10 + Math.random() * 100
      const price = cost + (Math.random() - 0.4) * 20
      const cptyList = COUNTERPARTY_MAP[type] || [type]

      data.push({
        id: idCounter++,
        assetType: type,
        investType: (type === '互换' || type === '期权') ? '衍生品合约' : '证券',
        assetCode: `${type === '股票' ? 'STK' : type === '债券' ? 'BND' : type === '互换' ? 'IRS' : type === '期权' ? 'OPT' : 'CBN'}_${1000 + i}`,
        assetName: `${type}测试标的${i + 1}`,
        counterparty: cptyList[i % cptyList.length],
        account: ACCOUNTS[i % ACCOUNTS.length],
        currency: CURRENCIES[i % 3],
        qtySod: sod,
        qtyIntra: intra,
        qtyEod: sod + intra,
        cost,
        price,
        accruedInt: type === '债券' ? sod * 0.02 : 0,
        marketValue: (sod + intra) * price,
        pnl: (sod + intra) * (price - cost),
      })
    }
  })
  return data
}

/** 按资产类型汇总，返回与 Position 列对齐的 GroupSummary */
export function buildGroupSummaries(positions: Position[]): GroupSummary[] {
  const groups: Record<string, { rows: Position[]; sums: Record<string, number> }> = {}
  const numericCols = ['qtySod', 'qtyIntra', 'qtyEod', 'cost', 'accruedInt', 'marketValue', 'pnl']

  positions.forEach((row) => {
    if (!groups[row.assetType]) {
      groups[row.assetType] = { rows: [], sums: {} }
    }
    groups[row.assetType].rows.push(row)
    numericCols.forEach((col) => {
      groups[row.assetType].sums[col] = (groups[row.assetType].sums[col] || 0) + (row as any)[col]
    })
  })

  return Object.entries(groups).map(([assetType, g]) => ({
    assetType,
    assetCode: assetType, // 用于 GroupCellRenderer
    counterparty: '',
    assetName: '',
    account: '',
    currency: '',
    qtySod: g.sums.qtySod || 0,
    qtyIntra: g.sums.qtyIntra || 0,
    qtyEod: g.sums.qtyEod || 0,
    cost: g.sums.cost || 0,
    price: null, // 估值价格不汇总
    accruedInt: g.sums.accruedInt || 0,
    marketValue: g.sums.marketValue || 0,
    pnl: g.sums.pnl || 0,
    rowCount: g.rows.length,
  }))
}
