import { useMemo, useState, useCallback, useEffect, useRef } from 'react'
import { AgGridReact } from 'ag-grid-react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { AllCommunityModule, ModuleRegistry, themeQuartz } from 'ag-grid-community'
import { MasterDetailModule } from 'ag-grid-enterprise'
import { generateMockData, buildGroupSummaries, ASSET_TO_COUNTERPARTY, ALL_ACCOUNTS, ALL_ASSET_TYPES } from './data'
import type { Position, GroupSummary } from './types'
import './ag-overrides.css'

ModuleRegistry.registerModules([AllCommunityModule, MasterDetailModule])

// ─── 查询筛选配置 ────────────────────────────────────
const INVEST_TYPES = ['全部', '衍生品合约', '证券']

interface Filters {
  account: string[]
  assetType: string[]
  counterparty: string[]
  investType: string
  keyword: string
}

const defaultFilters: Filters = {
  account: [],
  assetType: [],
  counterparty: [],
  investType: '全部',
  keyword: '',
}

// ─── 多选下拉组件 ────────────────────────────────────
interface MultiSelectProps {
  label: string
  options: string[]
  selected: string[]
  onChange: (selected: string[]) => void
  disabled?: boolean
}

function MultiSelect({ label, options, selected, onChange, disabled }: MultiSelectProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const toggle = (opt: string) => {
    if (selected.includes(opt)) {
      onChange(selected.filter(s => s !== opt))
    } else {
      onChange([...selected, opt])
    }
  }

  return (
    <div className="filter-dropdown" ref={ref}>
      <label className="filter-label">{label}</label>
      <div className={`filter-box ${disabled ? 'disabled' : ''}`} onClick={() => !disabled && setOpen(!open)}>
        {selected.length === 0
          ? <span className="placeholder">请选择...</span>
          : selected.map(s => (
              <span key={s} className="filter-tag">
                {s}
                <span className="filter-tag-x" onClick={(e) => { e.stopPropagation(); toggle(s) }}>×</span>
              </span>
            ))
        }
      </div>
      {open && (
        <div className="filter-menu">
          {options.map(opt => (
            <div key={opt} className="filter-item" onClick={() => toggle(opt)}>
              <input type="checkbox" checked={selected.includes(opt)} readOnly />
              <span>{opt}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── 主题 ────────────────────────────────────────────
const myTheme = themeQuartz.withParams({
  fontSize: '12px',
  headerFontSize: '12px',
  rowHeight: 30,
  headerHeight: 32,
  wrapperBorder: false,
  cellHorizontalPadding: 8,
  borderColor: '#e2e8f0',
  headerBackgroundColor: '#e2e8f0',
  headerTextColor: '#334155',
  oddRowBackgroundColor: '#ffffff',
  rowBorderColor: '#f1f5f9',
  columnBorderColor: '#e2e8f0',
})

const UNITS: Record<string, number> = {
  '1': 1,
  '1000': 1000,
  '10000': 10000,
  '1000000': 1000000,
  '100000000': 100000000,
}

function formatNum(val: number | null | undefined, unit: number, fraction = 2): string {
  if (val == null) return '-'
  const v = val / unit
  return v.toLocaleString('en-US', { minimumFractionDigits: fraction, maximumFractionDigits: fraction })
}

// ─── GroupCellRenderer ───────────────────────────────
function GroupCellRenderer(props: ICellRendererParams<GroupSummary>) {
  const [expanded, setExpanded] = useState(false)
  useEffect(() => {
    const sync = () => setExpanded(!!props.node.expanded)
    sync()
    props.api.addEventListener('rowGroupOpened', sync)
    return () => { if (!props.api.isDestroyed()) props.api.removeEventListener('rowGroupOpened', sync) }
  }, [props.api, props.node])

  const toggle = () => props.node.setExpanded(!props.node.expanded)
  const type = props.data?.assetType ?? ''
  const count = props.data?.rowCount ?? 0

  return (
    <span onClick={toggle}
      style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, userSelect: 'none', paddingLeft: 4 }}>
      <span style={{ fontSize: 10, width: 14, flexShrink: 0 }}>{expanded ? '▼' : '▶'}</span>
      <span style={{ fontWeight: 600, fontSize: 12 }}>{type} 汇总</span>
      <span style={{ color: '#64748b', fontSize: 11 }}>({count})</span>
    </span>
  )
}

// ─── 列构建 ──────────────────────────────────────────
function numCol(field: string, headerName: string, unit: number, w = 110): ColDef {
  return {
    field, headerName, width: w, sortable: true, resizable: true, type: 'numericColumn',
    valueFormatter: (p) => formatNum(p.value, unit),
    cellClass: (p) => { const v = p.value; if (v == null) return ''; return v > 0 ? 'cell-positive' : v < 0 ? 'cell-negative' : '' },
  }
}
function txtCol(field: string, headerName: string, w: number, pinned?: 'left'): ColDef {
  return { field, headerName, width: w, pinned, sortable: true, resizable: true }
}

function buildColumns(unit: number): ColDef[] {
  return [
    txtCol('assetCode', '资产代码', 140, 'left'),
    txtCol('counterparty', '证券二级分类', 120),
    txtCol('assetName', '资产名称', 160),
    txtCol('account', '证券账户', 130),
    txtCol('currency', '币种', 70),
    numCol('qtySod', '数量(SOD)', unit),
    numCol('qtyIntra', '日内变动', unit),
    numCol('qtyEod', '数量(EOD)', unit),
    numCol('cost', '成本', unit, 90),
    { field: 'price', headerName: '估值价格', width: 90, sortable: true, resizable: true, type: 'numericColumn',
      valueFormatter: (p) => p.value != null ? formatNum(p.value, unit, 4) : '—',
      cellClass: (p) => p.value != null ? '' : 'cell-dash',
    } as ColDef,
    numCol('accruedInt', '应计利息', unit),
    numCol('marketValue', '市值(全价)', unit, 120),
    numCol('pnl', '合计浮动盈亏', unit, 120),
  ]
}

function buildMasterColumns(unit: number): ColDef<GroupSummary>[] {
  const cols = buildColumns(unit) as ColDef<GroupSummary>[]
  cols[0] = { ...cols[0], cellRenderer: GroupCellRenderer, headerName: '资产代码', pinned: 'left' }
  for (let i = 1; i <= 4; i++) {
    cols[i] = { ...cols[i], sortable: false, resizable: false,
      valueFormatter: (p: any) => p.value || '—', cellClass: 'cell-dash' }
  }
  return cols
}

function buildDetailColumns(unit: number): ColDef<Position>[] {
  return buildColumns(unit) as ColDef<Position>[]
}

// ─── App ─────────────────────────────────────────────
export default function App() {
  const [unit, setUnit] = useState('1')
  const [filters, setFilters] = useState<Filters>({ ...defaultFilters })
  const [appliedFilters, setAppliedFilters] = useState<Filters>({ ...defaultFilters })
  const unitDiv = UNITS[unit] || 1

  const allData = useMemo(() => generateMockData(), [])

  // 级联：当前可选 counterparty（基于已选 assetType）
  const availableCounterparties = useMemo(() => {
    if (filters.assetType.length === 0) return ASSET_TO_COUNTERPARTY.all
    const set = new Set<string>()
    filters.assetType.forEach(at => {
      (ASSET_TO_COUNTERPARTY.map[at] || []).forEach(cp => set.add(cp))
    })
    return [...set]
  }, [filters.assetType])

  // 资产类型变化 → 级联清理非法 counterparty
  const setAssetType = useCallback((selected: string[]) => {
    setFilters(prev => ({
      ...prev,
      assetType: selected,
      counterparty: prev.counterparty.filter(cp => availableCounterparties.includes(cp)),
    }))
  }, [availableCounterparties])

  // counterparty 变化 → 反向级联 assetType
  const setCounterparty = useCallback((selected: string[]) => {
    setFilters(prev => {
      let assetType = [...prev.assetType]
      // 选中子项时自动勾选父级，取消子项时检查是否需要取消父级
      for (const [parent, subs] of Object.entries(ASSET_TO_COUNTERPARTY.map)) {
        const hasSelectedChild = subs.some(s => selected.includes(s))
        if (hasSelectedChild && !assetType.includes(parent)) {
          assetType.push(parent)
        } else if (!hasSelectedChild && assetType.includes(parent)) {
          assetType = assetType.filter(a => a !== parent)
        }
      }
      return { ...prev, counterparty: selected, assetType }
    })
  }, [])

  // 应用筛选
  const filteredData = useMemo(() => {
    const f = appliedFilters
    return allData.filter(row => {
      if (f.account.length && !f.account.includes(row.account)) return false
      if (f.assetType.length && !f.assetType.includes(row.assetType)) return false
      if (f.counterparty.length && !f.counterparty.includes(row.counterparty)) return false
      if (f.investType !== '全部' && row.investType !== f.investType) return false
      if (f.keyword) {
        const kw = f.keyword.toLowerCase()
        if (!row.assetCode.toLowerCase().includes(kw) && !row.assetName.toLowerCase().includes(kw)) return false
      }
      return true
    })
  }, [allData, appliedFilters])

  const groupsMap = useMemo(() => {
    const map: Record<string, Position[]> = {}
    filteredData.forEach(row => {
      if (!map[row.assetType]) map[row.assetType] = []
      map[row.assetType].push(row)
    })
    return map
  }, [filteredData])

  const masterRows = useMemo(() => buildGroupSummaries(filteredData), [filteredData])

  const masterColDefs = useMemo(() => buildMasterColumns(unitDiv), [unitDiv])
  const detailColDefs = useMemo(() => buildDetailColumns(unitDiv), [unitDiv])

  const detailCellRendererParams = useMemo(() => ({
    detailGridOptions: {
      columnDefs: detailColDefs,
      defaultColDef: { sortable: true, resizable: true } as ColDef,
      domLayout: 'normal' as const,
      headerHeight: 32,
      alwaysShowVerticalScroll: true,
      enableCellTextSelection: true,
      suppressRowHoverHighlight: false,
      theme: myTheme,
    },
    getDetailRowData: (params: any) => {
      params.successCallback(groupsMap[params.data.assetType] || [])
    },
  }), [detailColDefs, groupsMap])

  const handleMasterSortChanged = useCallback((params: any) => {
    const sortModel = params.api.getSortModel()
    params.api.forEachDetailGridInfo((detailInfo: any) => {
      if (detailInfo.api && !detailInfo.api.isDestroyed()) {
        detailInfo.api.applyColumnState({
          state: sortModel.map((s: any) => ({ colId: s.colId, sort: s.sort })),
          defaultState: { sort: null },
        })
      }
    })
  }, [])

  const handleMasterColumnResized = useCallback((params: any) => {
    if (params.finished && params.source === 'uiColumnResized') {
      const columns = params.api.getAllGridColumns()
      if (!columns) return
      const widthMap: Record<string, number> = {}
      columns.forEach((col: any) => { if (col.isVisible()) widthMap[col.getColId()] = col.getActualWidth() })
      params.api.forEachDetailGridInfo((detailInfo: any) => {
        if (detailInfo.api && !detailInfo.api.isDestroyed()) {
          const detailCols = detailInfo.api.getAllGridColumns()
          if (!detailCols) return
          detailCols.forEach((col: any) => {
            const w = widthMap[col.getColId()]
            if (w) detailInfo.api.setColumnWidth(col, w)
          })
        }
      })
    }
  }, [])

  const doQuery = () => setAppliedFilters({ ...filters })
  const doClear = () => {
    setFilters({ ...defaultFilters })
    setAppliedFilters({ ...defaultFilters })
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <div>
          <span className="app-title">FICC Position Blotter</span>
          <span className="app-subtitle">v2.0 ag-grid Master/Detail</span>
        </div>
        <div className="app-header-right">
          <span>Trading Desk: Global Macro</span>
          <span>User: Admin</span>
        </div>
      </header>

      {/* 查询筛选 */}
      <section className="filter-bar">
        <div className="filter-row">
          <MultiSelect label="证券账户" options={ALL_ACCOUNTS} selected={filters.account}
            onChange={(v) => setFilters(p => ({ ...p, account: v }))} />
          <MultiSelect label="证券分类" options={ALL_ASSET_TYPES} selected={filters.assetType}
            onChange={setAssetType} />
          <MultiSelect label="证券二级分类" options={availableCounterparties} selected={filters.counterparty}
            onChange={setCounterparty}
            disabled={availableCounterparties.length === 0} />
          <div className="filter-dropdown">
            <label className="filter-label">证券投资类型</label>
            <select className="filter-select" value={filters.investType}
              onChange={(e) => setFilters(p => ({ ...p, investType: e.target.value }))}>
              {INVEST_TYPES.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
          <div className="filter-dropdown">
            <label className="filter-label">标的名称/代码</label>
            <input type="text" className="filter-input" placeholder="输入名称或代码" value={filters.keyword}
              onChange={(e) => setFilters(p => ({ ...p, keyword: e.target.value }))}
              onKeyDown={(e) => { if (e.key === 'Enter') doQuery() }}
            />
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
          <span className="toolbar-stat">分组: <strong>{Object.keys(groupsMap).length}</strong> 类</span>
        </div>
        <div className="toolbar-right">
          <span className="toolbar-hint">点击 ▶ 展开明细，子表独立排序</span>
        </div>
      </section>

      {/* Grid */}
      <section className="grid-wrapper">
        <div className="ag-theme-alpine grid-inner" style={{ height: '100%' }}>
          <AgGridReact<GroupSummary>
            rowData={masterRows}
            columnDefs={masterColDefs}
            defaultColDef={{ sortable: true, resizable: true }}
            masterDetail={true}
            detailCellRendererParams={detailCellRendererParams}
            detailRowHeight={360}
            animateRows={true}
            alwaysShowVerticalScroll={true}
            theme={myTheme}
            overlayNoRowsTemplate={'<span style="padding:20px;color:#94a3b8;">暂无符合条件的数据</span>'}
            onSortChanged={handleMasterSortChanged}
            onColumnResized={handleMasterColumnResized}
          />
        </div>
      </section>
    </div>
  )
}
