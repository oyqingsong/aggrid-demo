# 分组行手动合计 + 自定义组内排序 设计文档

**日期:** 2026-05-07  
**目标:** 放弃 ag-grid 企业版 RowGroupingModule，改为纯社区版 + 手动预处理数据，实现 new27.html 的分组汇总 + 组内独立排序 + 虚拟滚动

## 1. 架构

- **ag-grid 社区版 only**（不依赖 enterprise 任何模块）
- 单一扁平数组作为 `rowData`，GroupRow 和 DetailRow 混合排列
- React state 管理展开/折叠，动态计算可见行
- `postSortRows` 控制组内排序，GroupRow 始终钉在分组顶部
- 虚拟滚动由 ag-grid ClientSideRowModel 内置支持

## 2. 数据模型

```typescript
type Row = GroupRowData | DetailRowData

interface GroupRowData {
  kind: 'group'
  assetType: string
  rowCount: number
  assetCode: ''        // cellRenderer 渲染 "XX 汇总 (N)"
  counterparty: ''
  assetName: ''
  investType: ''
  account: ''
  currency: ''
  positionType: ''
  qtySod: number      // 合计值
  qtyIntra: number
  qtyEod: number
  cost: number
  price: null
  accruedInt: number
  marketValue: number
  pnl: number
}

interface DetailRowData {
  kind: 'detail'
  // 完整 Position 字段
}
```

数组顺序：[碳现货Group, 碳现货Detail×N, 股票Group, 股票Detail×N, 债券Group, ...]

## 3. 展开/折叠

- `useState<Set<string>>(expandedGroups)` 管理展开状态，默认全部展开
- 可⻅行 = 遍历全量 rows，遇到 GroupRow 始终保留；DetailRow 仅在所属 assetType 展开时保留
- 点击 GroupRow 第一列的 ▶/▼ 切换对应 assetType 的展开状态

## 4. 自定义排序

- `postSortRows` 回调：
  1. 将 rows 按 assetType 分组
  2. 每组内 DetailRow 按当前 sortModel 排序
  3. 拼接：GroupRow 始终在每组顶部，各组之间按固定顺序排列
- GroupRow 不参与排序比较

## 5. CellRenderer

- 第一列：GroupRow → `GroupCellRenderer`（▶/▼ + "碳现货 汇总 (200)"）；DetailRow → 显示 assetCode
- 数值列：GroupRow 显示合计值，DetailRow 显示原始值，共用 formatNum + cellClass（正绿负红）
- 文本列：GroupRow 显示 "—"

## 6. 模块依赖

| 模块 | 用途 |
|------|------|
| ag-grid-community | 表格渲染、虚拟滚动、排序 |
| ag-grid-react | React 绑定 |
| RowGroupingModule | **不再使用** |
| MasterDetailModule | **不再使用** |

## 7. 风险点

- `postSortRows` 在排序触发后回调，需确保 `setData` 不触发额外的重新排序（无限循环）
- GroupRow 和 DetailRow 共用同一套 ColDef，field 名称需完全一致
- 展开/折叠切换时 rowData 引用变化，ag-grid 会全量重新渲染，1400 行无明显性能问题
