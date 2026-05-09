import { useMemo, useState, useCallback, useEffect, useRef } from 'react'
import { AllEnterpriseModule } from 'ag-grid-enterprise'
import { AgGridReact, AgGridProvider } from 'ag-grid-react'
import type { ColDef, ICellRendererParams, ValueFormatterParams, CellClassParams, CellClickedEvent } from 'ag-grid-community'
import { AllCommunityModule, ModuleRegistry, themeQuartz } from 'ag-grid-community'
import { generateMockData, buildGroupedRows, ALL_ACCOUNTS, ALL_ASSET_TYPES, ALL_INVEST_ACCOUNTS, ASSET_TO_COUNTERPARTY } from './data'
import type { Row, GroupRowData, DetailRowData } from './types'
import './ag-overrides.css'

ModuleRegistry.registerModules([AllCommunityModule])

const modules = [AllEnterpriseModule]

// ─── 筛选配置 ────────────────────────────────────────
interface Filters {
  investType: string[]
  account: string[]
  assetType: string[]
  counterparty: string[]
  keyword: string
}

const defaultFilters: Filters = {
  investType: [], account: [], assetType: [], counterparty: [], keyword: '',
}

// ─── 多选下拉组件 ────────────────────────────────────
function MultiSelect({ label, options, selected, onChange, disabled }: {
  label: string; options: string[]; selected: string[]; onChange: (s: string[]) => void; disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  const toggle = (opt: string) => {
    if (selected.includes(opt)) onChange(selected.filter(s => s !== opt))
    else onChange([...selected, opt])
  }
  return (
    <div className="filter-dropdown" ref={ref}>
      <label className="filter-label">{label}</label>
      <div className={`filter-box ${disabled ? 'disabled' : ''}`} onClick={() => !disabled && setOpen(!open)}>
        {selected.length === 0
          ? <span className="placeholder">请选择...</span>
          : selected.map(s => (
            <span key={s} className="filter-tag">{s}
              <span className="filter-tag-x" onClick={(e) => { e.stopPropagation(); toggle(s) }}>×</span>
            </span>
          ))}
      </div>
      {open && (
        <div className="filter-menu">
          {options.map(opt => (
            <div key={opt} className="filter-item" onClick={() => toggle(opt)}>
              <input type="checkbox" checked={selected.includes(opt)} readOnly /> <span>{opt}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── 主题 ────────────────────────────────────────────
const myTheme = themeQuartz.withParams({
  fontSize: '12px', headerFontSize: '12px', rowHeight: 30, headerHeight: 32,
  wrapperBorder: false, cellHorizontalPadding: 8,
  borderColor: '#e2e8f0', headerBackgroundColor: '#e2e8f0', headerTextColor: '#334155',
  oddRowBackgroundColor: '#ffffff',
})

const UNITS: Record<string, number> = { '1': 1, '1000': 1000, '10000': 10000, '1000000': 1000000, '100000000': 100000000 }

function formatNum(val: number | null | undefined, unit: number, fraction = 2): string {
  if (val == null) return '—'
  return (val / unit).toLocaleString('en-US', { minimumFractionDigits: fraction, maximumFractionDigits: fraction })
}

// ─── GroupCellRenderer ───────────────────────────────
function GroupCellRenderer(props: ICellRendererParams<GroupRowData>) {
  const data = props.data as GroupRowData | undefined
  if (!data || data.kind !== 'group') return <span>{props.value as string}</span>

  const expandedGroups: Set<string> = props.context?.expandedGroups
  const setExpandedGroups: ((s: Set<string>) => void) | undefined = props.context?.setExpandedGroups
  const isExpanded = expandedGroups?.has(data.assetType) ?? true

  const toggle = () => {
    if (!setExpandedGroups) return
    const next = new Set(expandedGroups)
    if (next.has(data.assetType)) next.delete(data.assetType)
    else next.add(data.assetType)
    setExpandedGroups(next)
  }

  return (
    <span onClick={toggle}
      style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, userSelect: 'none', paddingLeft: 4 }}>
      <span style={{ fontSize: 10, width: 14, flexShrink: 0 }}>{isExpanded ? '▼' : '▶'}</span>
      <span style={{ fontWeight: 600, fontSize: 12 }}>{data.assetType} 汇总</span>
      <span style={{ color: '#64748b', fontSize: 11 }}>({data.rowCount})</span>
    </span>
  )
}

type SortState = Record<string, { colId: string; sort: 'asc' | 'desc' }>

// ─── 列定义 ──────────────────────────────────────────
function buildColumns(unit: number): ColDef<Row>[] {
  const num = (f: string, h: string, w = 110, frac = 2): ColDef<Row> => ({
    field: f as keyof Row, headerName: h, width: w, sortable: false, resizable: true, type: 'numericColumn',
    valueFormatter: (p: ValueFormatterParams<Row>) => {
      let text = formatNum(p.value as number | null, unit, frac)
      const row = p.data as Row | undefined
      if (row?.kind === 'group') {
        const sortState = (p.context?.groupSortState as SortState | undefined)?.[row.assetType]
        if (sortState && sortState.colId === f) {
          text += sortState.sort === 'desc' ? ' ▼' : ' ▲'
        }
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

  const txt = (f: string, h: string, w: number): ColDef<Row> =>
    ({ field: f as keyof Row, headerName: h, width: w, sortable: false, resizable: true,
      valueFormatter: (p: ValueFormatterParams<Row>) => {
        let text = (p.value ?? '') as string
        const row = p.data as Row | undefined
        if (row?.kind === 'group') {
          if (!text) text = '—'
          const sortState = (p.context?.groupSortState as SortState | undefined)?.[row.assetType]
          if (sortState && sortState.colId === f) {
            text += sortState.sort === 'desc' ? ' ▼' : ' ▲'
          }
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

// ─── App ─────────────────────────────────────────────
export default function App() {
  const [unit, setUnit] = useState('1')
  const [filters, setFilters] = useState<Filters>({ ...defaultFilters })
  const [appliedFilters, setAppliedFilters] = useState<Filters>({ ...defaultFilters })
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(['碳现货', '股票', '债券', '互换', '期权'])
  )
  const [groupSortState, setGroupSortState] = useState<SortState>({})
  const unitDiv = UNITS[unit] || 1

  const allData = useMemo(() => generateMockData(), [])

  const availableCounterparties = useMemo(() => {
    if (filters.assetType.length === 0) return ASSET_TO_COUNTERPARTY.all
    const set = new Set<string>()
    filters.assetType.forEach(at => { (ASSET_TO_COUNTERPARTY.map[at] || []).forEach(cp => set.add(cp)) })
    return [...set]
  }, [filters.assetType])

  const setAssetType = useCallback((selected: string[]) => {
    setFilters(prev => ({
      ...prev, assetType: selected,
      counterparty: prev.counterparty.filter(cp => availableCounterparties.includes(cp)),
    }))
  }, [availableCounterparties])

  const setCounterparty = useCallback((selected: string[]) => {
    setFilters(prev => {
      let assetType = [...prev.assetType]
      for (const [parent, subs] of Object.entries(ASSET_TO_COUNTERPARTY.map)) {
        const has = subs.some(s => selected.includes(s))
        if (has && !assetType.includes(parent)) assetType.push(parent)
        else if (!has && assetType.includes(parent)) assetType = assetType.filter(a => a !== parent)
      }
      return { ...prev, counterparty: selected, assetType }
    })
  }, [])

  const allGroupedRows = useMemo(() => {
    const f = appliedFilters
    const filtered = allData.filter(row => {
      if (f.investType.length && !f.investType.includes(row.investType)) return false
      if (f.account.length && !f.account.includes(row.account)) return false
      if (f.assetType.length && !f.assetType.includes(row.assetType)) return false
      if (f.counterparty.length && !f.counterparty.includes(row.counterparty)) return false
      if (f.keyword) {
        const kw = f.keyword.toLowerCase()
        if (!row.assetCode.toLowerCase().includes(kw) && !row.assetName.toLowerCase().includes(kw)) return false
      }
      return true
    })
    const rows = buildGroupedRows(filtered)

    // 按 groupSortState 对每组 detail 排序
    const state = groupSortState
    if (Object.keys(state).length > 0) {
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]
        if (row.kind !== 'group') continue
        const sortCfg = state[row.assetType]
        if (!sortCfg) continue

        // 找到该组所有 detail 行的起止位置
        const detailStart = i + 1
        let detailEnd = detailStart
        while (detailEnd < rows.length && rows[detailEnd].kind === 'detail' && rows[detailEnd].assetType === row.assetType) {
          detailEnd++
        }
        if (detailEnd <= detailStart) continue

        const details = rows.slice(detailStart, detailEnd) as DetailRowData[]
        const dir = sortCfg.sort === 'desc' ? -1 : 1
        details.sort((a, b) => {
          const va = (a as any)[sortCfg.colId] ?? ''
          const vb = (b as any)[sortCfg.colId] ?? ''
          let cmp = 0
          if (typeof va === 'number' && typeof vb === 'number') {
            cmp = va - vb
          } else {
            cmp = String(va).localeCompare(String(vb), 'zh')
          }
          return cmp * dir
        })
        rows.splice(detailStart, details.length, ...details)
      }
    }

    return rows
  }, [allData, appliedFilters, groupSortState])

  const visibleRows = useMemo(() => {
    return allGroupedRows.filter(row => {
      if (row.kind === 'group') return true
      return expandedGroups.has(row.assetType)
    })
  }, [allGroupedRows, expandedGroups])

  // 点击分组行任意列（除第一列展开/折叠外）→ 对该组按该列排序
  const onCellClicked = useCallback((params: CellClickedEvent<Row>) => {
    const row = params.data as Row | undefined
    if (!row || row.kind !== 'group') return

    const colId = params.column.getColId()
    // 第一列留给展开/折叠，其余所有列均可点击排序
    if (colId === 'assetCode') return

    setGroupSortState(prev => {
      const current = prev[row.assetType]
      let sort: 'asc' | 'desc' = 'desc'
      if (current && current.colId === colId) {
        sort = current.sort === 'desc' ? 'asc' : 'desc'
      }
      return { ...prev, [row.assetType]: { colId, sort } }
    })
  }, [])

  // 清除某组的排序
  const clearGroupSort = useCallback((assetType: string) => {
    setGroupSortState(prev => {
      const next = { ...prev }
      delete next[assetType]
      return next
    })
  }, [])

  const columnDefs = useMemo(() => buildColumns(unitDiv), [unitDiv])

  const doQuery = () => setAppliedFilters({ ...filters })
  const doClear = () => {
    setFilters({ ...defaultFilters })
    setAppliedFilters({ ...defaultFilters })
    setGroupSortState({})
  }

  const groupCount = useMemo(() => allGroupedRows.filter(r => r.kind === 'group').length, [allGroupedRows])
  const detailCount = useMemo(() => allGroupedRows.filter(r => r.kind === 'detail').length, [allGroupedRows])
  const context = useMemo(() => ({ expandedGroups, setExpandedGroups, groupSortState, clearGroupSort }), [expandedGroups, groupSortState, clearGroupSort])

  return (
    <div className="app-container">
      <header className="app-header">
        <div>
          <span className="app-title">FICC Position Blotter</span>
          <span className="app-subtitle">v2.0 — Click Group Row to Sort</span>
        </div>
        <div className="app-header-right">
          <span>Trading Desk: Global Macro</span>
          <span>User: Admin</span>
        </div>
      </header>

      <section className="filter-bar">
        <div className="filter-row">
          <MultiSelect label="管理证券账户" options={ALL_INVEST_ACCOUNTS} selected={filters.investType}
            onChange={(v) => setFilters(p => ({ ...p, investType: v }))} />
          <MultiSelect label="证券账户" options={ALL_ACCOUNTS} selected={filters.account}
            onChange={(v) => setFilters(p => ({ ...p, account: v }))} />
          <MultiSelect label="证券分类" options={ALL_ASSET_TYPES} selected={filters.assetType}
            onChange={setAssetType} />
          <MultiSelect label="证券二级分类" options={availableCounterparties} selected={filters.counterparty}
            onChange={setCounterparty} disabled={availableCounterparties.length === 0} />
          <div className="filter-dropdown">
            <label className="filter-label">标的名称/代码</label>
            <input type="text" className="filter-input" placeholder="输入名称或代码" value={filters.keyword}
              onChange={(e) => setFilters(p => ({ ...p, keyword: e.target.value }))}
              onKeyDown={(e) => { if (e.key === 'Enter') doQuery() }} />
          </div>
          <div className="filter-actions">
            <button className="btn-clear" onClick={doClear}>清除</button>
            <button className="btn-query" onClick={doQuery}>查询 / 刷新</button>
          </div>
        </div>
      </section>

      <section className="toolbar">
        <div className="toolbar-left">
          <div className="toolbar-item">
            <label>金额单位:</label>
            <select value={unit} onChange={(e) => setUnit(e.target.value)}>
              <option value="1">元</option>
              <option value="1000">千元</option>
              <option value="10000">万元</option>
              <option value="1000000">百万元</option>
              <option value="100000000">亿元</option>
            </select>
          </div>
          <div className="toolbar-divider" />
          <span className="toolbar-stat">总数据量: <strong>{detailCount.toLocaleString()}</strong> 条</span>
          <span className="toolbar-stat">分组: <strong>{groupCount}</strong> 类</span>
        </div>
        <div className="toolbar-right">
          <span className="toolbar-hint">点击分组行任意列 → 该组内排序 | 再次点击切换 ▲▼</span>
        </div>
      </section>

      <section className="grid-wrapper">
        <div className="ag-theme-alpine grid-inner" style={{ height: '100%' }}>
        <AgGridProvider modules={modules} licenseKey='AgGridLicense66fwc79n[NORMAL][v0102]_NDA3MDk2NjQwMDAwMA==80908dd5fb71b58d3ce28b2ed320216d'>
          <AgGridReact<Row>
            rowData={visibleRows}
            columnDefs={columnDefs}
            defaultColDef={{ sortable: false, resizable: true }}
            onCellClicked={onCellClicked}
            getRowClass={(p) => p.data?.kind === 'group' ? 'row-group' : 'row-detail'}
            animateRows={true}
            alwaysShowVerticalScroll={true}
            context={context}
            theme={myTheme}
            overlayNoRowsTemplate={'<span style="padding:20px;color:#94a3b8;">暂无符合条件的数据</span>'}
          />

        </AgGridProvider>
        </div>
      </section>
    </div>
  )
}
