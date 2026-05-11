export interface Position {
  id: number
  assetType: string
  assetCode: string
  assetName: string
  counterparty: string
  investType: string
  account: string
  currency: string
  positionType: string
  qtySod: number
  qtyIntra: number
  qtyEod: number
  cost: number
  price: number
  accruedInt: number
  marketValue: number
  pnl: number
}

/** 分组汇总行 */
export interface GroupRowData {
  kind: 'group'
  assetType: string
  rowCount: number
  assetCode: string
  counterparty: string
  assetName: string
  investType: string
  account: string
  currency: string
  positionType: string
  qtySod: number
  qtyIntra: number
  qtyEod: number
  cost: number
  price: number | null
  accruedInt: number
  marketValue: number
  pnl: number
}

/** 明细行 */
export interface DetailRowData extends Position {
  kind: 'detail'
}

/** 联合类型：表格内可展示分组汇总行或明细行 */
export type Row = GroupRowData | DetailRowData

// ─── 筛选 & 排序状态 ────────────────────────────

/** 筛选栏表单状态（未提交时与已提交的解耦） */
export interface Filters {
  investType: string[]
  account: string[]
  assetType: string[]
  counterparty: string[]
  keyword: string
}

/** 分组行排序状态：key=assetType, 记录排序列和方向 */
export type SortState = Record<string, { colId: string; sort: 'asc' | 'desc' }>
