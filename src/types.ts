export interface Position {
  id: number
  assetType: string
  investType: string
  assetCode: string
  assetName: string
  counterparty: string
  account: string
  currency: string
  qtySod: number
  qtyIntra: number
  qtyEod: number
  cost: number
  price: number
  accruedInt: number
  marketValue: number
  pnl: number
}

/** 汇总行 — 与 Position 字段对齐，保证主子表列一致 */
export interface GroupSummary {
  assetType: string
  /** 对应 detail 的 assetCode 列位置，展示 "XX 汇总" */
  assetCode: string
  counterparty: string
  assetName: string
  account: string
  currency: string
  qtySod: number
  qtyIntra: number
  qtyEod: number
  cost: number
  price: number | null
  accruedInt: number
  marketValue: number
  pnl: number
  rowCount: number
}
