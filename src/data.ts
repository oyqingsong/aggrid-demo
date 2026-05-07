import type { Position, Row } from './types'

const ASSET_TYPES = ['碳现货', '股票', '债券', '互换', '期权'] as const
const ASSET_ORDER = ['碳现货', '股票', '债券', '互换', '期权']
const ACCOUNTS = ['Book_Alpha', 'Book_Beta', 'Macro_Fund1', 'Quant_Prop', 'Delta_One', 'FixedInc_01']
const INVEST_ACCOUNTS = ['组合1', '组合2']
const COUNTERPARTY_MAP: Record<string, string[]> = {
  '碳现货': ['碳现货'],
  '股票': ['A股', '港股通'],
  '债券': ['债券', '资产支持证券'],
  '互换': ['收益互换'],
  '期权': ['外汇期权'],
}
const CURRENCIES = ['USD', 'CNY', 'HKD']

export const ALL_ACCOUNTS = [...ACCOUNTS]
export const ALL_ASSET_TYPES = [...ASSET_TYPES]
export const ALL_INVEST_ACCOUNTS = [...INVEST_ACCOUNTS]
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
    const count = type === '股票' ? 500 : type === '债券' ? 300 : 200
    for (let i = 0; i < count; i++) {
      const sod = Math.floor(Math.random() * 100000) * 100
      const intra = Math.floor(Math.random() * 20000) * (Math.random() > 0.5 ? 1 : -1)
      const cost = 10 + Math.random() * 100
      const price = cost + (Math.random() - 0.4) * 20
      const cptyList = COUNTERPARTY_MAP[type] || [type]

      data.push({
        id: idCounter++,
        assetType: type,
        assetCode: `${type === '股票' ? 'STK' : type === '债券' ? 'BND' : type === '互换' ? 'IRS' : type === '期权' ? 'OPT' : 'CBN'}_${1000 + i}`,
        assetName: `${type}测试标的${i + 1}`,
        counterparty: cptyList[i % cptyList.length],
        investType: INVEST_ACCOUNTS[i % 2],
        account: ACCOUNTS[i % ACCOUNTS.length],
        currency: CURRENCIES[i % 3],
        positionType: '普通',
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

/** 将 Position 数组转换为 GroupRow + DetailRow 混合的扁平数组 */
export function buildGroupedRows(positions: Position[]): Row[] {
  const groups: Record<string, Position[]> = {}
  const numericCols = ['qtySod', 'qtyIntra', 'qtyEod', 'cost', 'accruedInt', 'marketValue', 'pnl']

  positions.forEach((row) => {
    if (!groups[row.assetType]) groups[row.assetType] = []
    groups[row.assetType].push(row)
  })

  const result: Row[] = []

  for (const assetType of ASSET_ORDER) {
    const rows = groups[assetType]
    if (!rows || rows.length === 0) continue

    const sums: Record<string, number> = {}
    numericCols.forEach((col) => {
      sums[col] = rows.reduce((acc, r) => acc + ((r as any)[col] || 0), 0)
    })

    // GroupRow
    result.push({
      kind: 'group',
      assetType,
      rowCount: rows.length,
      assetCode: assetType,
      counterparty: '',
      assetName: '',
      investType: '',
      account: '',
      currency: '',
      positionType: '',
      qtySod: sums.qtySod || 0,
      qtyIntra: sums.qtyIntra || 0,
      qtyEod: sums.qtyEod || 0,
      cost: sums.cost || 0,
      price: null,
      accruedInt: sums.accruedInt || 0,
      marketValue: sums.marketValue || 0,
      pnl: sums.pnl || 0,
    })

    // DetailRows
    rows.forEach((r) => {
      result.push({ kind: 'detail', ...r })
    })
  }

  return result
}
