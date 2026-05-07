export interface Position {
  id: number
  assetType: string         // 证券分类: 碳现货/股票/债券/互换/期权
  assetCode: string
  assetName: string
  counterparty: string      // 证券二级分类
  investType: string        // 管理证券账户: 组合1/组合2
  account: string           // 证券账户
  currency: string
  positionType: string      // 持仓分类: 普通
  qtySod: number
  qtyIntra: number
  qtyEod: number
  cost: number
  price: number
  accruedInt: number
  marketValue: number
  pnl: number
}
