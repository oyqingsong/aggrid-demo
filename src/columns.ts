import type { ColDef, ValueFormatterParams, CellClassParams } from 'ag-grid-community'
import type { Row, SortState } from './types'
import GroupCellRenderer from './components/GroupCellRenderer'

/** 金额单位映射：元 / 千元 / 万元 / 百万元 / 亿元 */
export const UNITS: Record<string, number> = {
  '1': 1, '1000': 1000, '10000': 10000, '1000000': 1000000, '100000000': 100000000,
}

/** 数值格式化：null → "—", 整数位三位一组逗号分隔, 小数位固定 */
function formatNum(val: number | null | undefined, unit: number, fraction = 2): string {
  if (val == null) return '—'
  return (val / unit).toLocaleString('en-US', { minimumFractionDigits: fraction, maximumFractionDigits: fraction })
}

/** 构建 ag-grid 列定义。unit 控制所有金额列的显示精度 */
export function buildColumns(unit: number): ColDef<Row>[] {
  /** 数值型列工厂：自动处理正负颜色、空值占位符、分组行排序指示 */
  const num = (f: string, h: string, w = 110, frac = 2): ColDef<Row> => ({
    field: f as keyof Row, headerName: h, width: w, sortable: false, resizable: true, type: 'numericColumn',
    valueFormatter: (p: ValueFormatterParams<Row>) => {
      let text = formatNum(p.value as number | null, unit, frac)
      const row = p.data as Row | undefined
      if (row?.kind === 'group') {
        const sortState = (p.context?.groupSortState as SortState | undefined)?.[row.assetType]
        if (sortState && sortState.colId === f) text += sortState.sort === 'desc' ? ' ▼' : ' ▲'
      }
      return text
    },
    cellClass: (p: CellClassParams<Row>) => {
      const row = p.data as Row | undefined
      const v = p.value
      const classes: string[] = []
      if (v == null || (row?.kind === 'group' && f === 'price')) classes.push('cell-dash')
      else classes.push(v > 0 ? 'cell-positive' : 'cell-negative')
      if (row?.kind === 'group') {
        const sortState = (p.context?.groupSortState as SortState | undefined)?.[row.assetType]
        if (sortState && sortState.colId === f) classes.push('sort-active')
      }
      return classes.join(' ')
    },
  })

  /** 文本型列工厂：空值占位 + 分组行排序指示 */
  const txt = (f: string, h: string, w: number): ColDef<Row> =>
    ({ field: f as keyof Row, headerName: h, width: w, sortable: false, resizable: true,
      valueFormatter: (p: ValueFormatterParams<Row>) => {
        let text = (p.value ?? '') as string
        const row = p.data as Row | undefined
        if (row?.kind === 'group') {
          if (!text) text = '—'
          const sortState = (p.context?.groupSortState as SortState | undefined)?.[row.assetType]
          if (sortState && sortState.colId === f) text += sortState.sort === 'desc' ? ' ▼' : ' ▲'
        }
        return text
      },
      cellClass: (p: CellClassParams<Row>) => {
        const row = p.data as Row | undefined
        const classes: string[] = []
        if (row?.kind === 'group') {
          if (!(p.value)) classes.push('cell-dash')
          const sortState = (p.context?.groupSortState as SortState | undefined)?.[row.assetType]
          if (sortState && sortState.colId === f) classes.push('sort-active')
        }
        return classes.join(' ')
      },
    })

  return [
    {
      field: 'assetCode', headerName: '资产代码', pinned: 'left', width: 240,
      sortable: false, resizable: true,
      cellRenderer: GroupCellRenderer,
      valueFormatter: (p: ValueFormatterParams<Row>) => {
        const row = p.data as Row | undefined
        return row?.kind === 'detail' ? (p.value as string) : ''
      },
    },
    txt('counterparty', '证券二级分类', 120),
    txt('assetName', '资产名称', 160),
    txt('investType', '管理证券账户', 120),
    txt('account', '证券账户', 130),
    txt('currency', '币种', 70),
    txt('positionType', '持仓分类', 90),
    num('qtySod', '数量(SOD)'),
    num('qtyIntra', '日内变动数量'),
    num('qtyEod', '数量(EOD)'),
    num('cost', '成本', 90),
    {
      field: 'price', headerName: '估值价格', width: 90, sortable: false, resizable: true, type: 'numericColumn',
      valueFormatter: (p: ValueFormatterParams<Row>) => p.value != null ? formatNum(p.value as number, unit, 4) : '—',
      cellClass: (p: CellClassParams<Row>) => p.value != null ? '' : 'cell-dash',
    },
    num('accruedInt', '应计利息'),
    num('marketValue', '市值(全价)', 120),
    num('pnl', '合计浮动盈亏', 120),
  ]
}
