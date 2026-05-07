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

export type Row = GroupRowData | DetailRowData
