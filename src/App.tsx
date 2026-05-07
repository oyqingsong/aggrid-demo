import { useMemo, useState, useCallback, useEffect, useRef } from 'react'
import { AgGridReact } from 'ag-grid-react'
import type { ColDef, ICellRendererParams, ValueFormatterParams, CellClassParams } from 'ag-grid-community'
import { AllCommunityModule, ModuleRegistry, themeQuartz } from 'ag-grid-community'
import { RowGroupingModule } from 'ag-grid-enterprise'
import { generateMockData, ALL_ACCOUNTS, ALL_ASSET_TYPES, ALL_INVEST_ACCOUNTS, ASSET_TO_COUNTERPARTY } from './data'
import type { Position } from './types'
import './ag-overrides.css'

ModuleRegistry.registerModules([AllCommunityModule, RowGroupingModule])

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
  oddRowBackgroundColor: '#ffffff', rowBorderColor: '#f1f5f9', columnBorderColor: '#e2e8f0',
})

const UNITS: Record<string, number> = { '1': 1, '1000': 1000, '10000': 10000, '1000000': 1000000, '100000000': 100000000 }

function formatNum(val: number | null | undefined, unit: number, fraction = 2): string {
  if (val == null) return '—'
  return (val / unit).toLocaleString('en-US', { minimumFractionDigits: fraction, maximumFractionDigits: fraction })
}

// ─── AutoGroupColumn CellRenderer ────────────────────
function GroupRowRenderer(props: ICellRendererParams) {
  const [expanded, setExpanded] = useState(false)
  useEffect(() => {
    const sync = () => setExpanded(!!props.node.expanded)
    sync()
    props.api.addEventListener('rowGroupOpened', sync)
    return () => { if (!props.api.isDestroyed()) props.api.removeEventListener('rowGroupOpened', sync) }
  }, [props.api, props.node])
  const count = props.node.allLeafChildren?.length ?? 0
  return (
    <span onClick={() => props.node.setExpanded(!props.node.expanded)}
      style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, userSelect: 'none', paddingLeft: 4 }}>
      <span style={{ fontSize: 10, width: 14, flexShrink: 0 }}>{expanded ? '▼' : '▶'}</span>
      <span style={{ fontWeight: 600, fontSize: 12 }}>{props.value} 汇总</span>
      <span style={{ color: '#64748b', fontSize: 11 }}>({count})</span>
    </span>
  )
}

// ─── 列定义（15 列，与 new27.html 完全对齐） ──────────
function buildColumns(unit: number): ColDef<Position>[] {
  const num = (f: string, h: string, w = 110, frac = 2): ColDef<Position> => ({
    field: f, headerName: h, width: w, sortable: true, resizable: true, type: 'numericColumn',
    enableValue: true,
    aggFunc: 'sum',
    valueFormatter: (p: ValueFormatterParams) => formatNum(p.value, unit, frac),
    cellClass: (p: CellClassParams) => {
      if (p.value == null) return ''
      return p.value > 0 ? 'cell-positive' : p.value < 0 ? 'cell-negative' : ''
    },
  })

  const txt = (f: string, h: string, w: number): ColDef<Position> =>
    ({ field: f, headerName: h, width: w, sortable: true, resizable: true })

  return [
    { field: 'assetType', headerName: '证券分类', rowGroup: true, hide: true },
    txt('assetCode', '资产代码', 140),
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
      field: 'price', headerName: '估值价格', width: 90, sortable: true, resizable: true, type: 'numericColumn',
      valueFormatter: (p: ValueFormatterParams) => p.value != null ? formatNum(p.value, unit, 4) : '—',
      cellClass: (p: CellClassParams) => p.value != null ? '' : 'cell-dash',
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
  const unitDiv = UNITS[unit] || 1

  const allData = useMemo(() => generateMockData(), [])

  // 级联：当前可选 counterparty
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

  // 筛选后数据
  const filteredData = useMemo(() => {
    const f = appliedFilters
    return allData.filter(row => {
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
  }, [allData, appliedFilters])

  const columnDefs = useMemo(() => buildColumns(unitDiv), [unitDiv])

  const autoGroupColumnDef = useMemo(() => ({
    headerName: '资产代码',
    pinned: 'left' as const,
    width: 240,
    cellRenderer: GroupRowRenderer,
    cellRendererParams: { suppressCount: true },
  }), [])

  const doQuery = () => setAppliedFilters({ ...filters })
  const doClear = () => {
    setFilters({ ...defaultFilters })
    setAppliedFilters({ ...defaultFilters })
  }

  const groupCount = useMemo(() => {
    return new Set(filteredData.map(r => r.assetType)).size
  }, [filteredData])

  return (
    <div className="app-container">
      <header className="app-header">
        <div>
          <span className="app-title">FICC Position Blotter</span>
          <span className="app-subtitle">v2.0 — Row Grouping</span>
        </div>
        <div className="app-header-right">
          <span>Trading Desk: Global Macro</span>
          <span>User: Admin</span>
        </div>
      </header>

      {/* 查询筛选 — 与 new27.html 对齐 */}
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

      {/* Toolbar */}
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
          <span className="toolbar-stat">总数据量: <strong>{filteredData.length.toLocaleString()}</strong> 条</span>
          <span className="toolbar-stat">分组: <strong>{groupCount}</strong> 类</span>
        </div>
        <div className="toolbar-right">
          <span className="toolbar-hint">行分组模式 | 点击列头组内排序 | 虚拟滚动</span>
        </div>
      </section>

      {/* Grid — 行分组 + 虚拟滚动 */}
      <section className="grid-wrapper">
        <div className="ag-theme-alpine grid-inner" style={{ height: '100%' }}>
          <AgGridReact<Position>
            rowData={filteredData}
            columnDefs={columnDefs}
            defaultColDef={{ sortable: true, resizable: true }}
            groupDisplayType="groupRows"
            autoGroupColumnDef={autoGroupColumnDef}
            groupDefaultExpanded={0}
            animateRows={true}
            alwaysShowVerticalScroll={true}
            suppressAggFuncInHeader={true}
            theme={myTheme}
            overlayNoRowsTemplate={'<span style="padding:20px;color:#94a3b8;">暂无符合条件的数据</span>'}
          />
        </div>
      </section>
    </div>
  )
}
