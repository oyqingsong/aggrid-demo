import { useMemo, useState, useCallback, useEffect } from 'react'
import { AllEnterpriseModule } from 'ag-grid-enterprise'
import { AgGridReact, AgGridProvider } from 'ag-grid-react'
import type { CellClickedEvent } from 'ag-grid-community'
import { AllCommunityModule, ModuleRegistry, themeQuartz } from 'ag-grid-community'
import { generateMockData, buildGroupedRows, ASSET_TO_COUNTERPARTY } from './data'
import type { Row, DetailRowData, Filters, SortState } from './types'
import { buildColumns, UNITS } from './columns'
import Header from './components/header'
import { ConfigProvider } from '@chenhui996/gg-ui'
import FilterBar from './components/FilterBar'
import Toolbar from './components/Toolbar'
import './ag-overrides.css'

ModuleRegistry.registerModules([AllCommunityModule])

const modules = [AllEnterpriseModule]

const defaultFilters: Filters = {
  investType: [], account: [], assetType: [], counterparty: [], keyword: '',
}

const PRIMARY_COLORS = {
  blue:   '#1677ff',
  green:  '#00b96b',
  purple: '#722ed1',
  orange: '#fa8c16',
} as const

// ─── App ─────────────────────────────────────────────
export default function App() {
  const [mode, setMode] = useState<'light' | 'dark'>('light')
  const [primaryColor, setPrimaryColor] = useState<string>(PRIMARY_COLORS.blue)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', mode)
  }, [mode])

  const myTheme = useMemo(() => themeQuartz.withParams({
    fontSize: '12px',
    headerFontSize: '12px',
    rowHeight: 30,
    headerHeight: 32,
    wrapperBorder: false,
    cellHorizontalPadding: 8,
    headerBackgroundColor: 'var(--ant-color-bg-elevated)',
    headerTextColor: 'var(--ant-color-text)',
    borderColor: 'var(--ant-color-border)',
    oddRowBackgroundColor: 'var(--ant-color-fill-secondary)',
    backgroundColor: 'var(--ant-color-bg-container)',
    foregroundColor: 'var(--ant-color-text)',
  }), [])

  const themeConfig = useMemo(() => ({
    token: { colorPrimary: primaryColor },
    cssVar: { prefix: 'ant' },
  }), [primaryColor])

  // ── 状态 ──────────────────────────────────────────
  const [unit, setUnit] = useState('1')
  const [filters, setFilters] = useState<Filters>({ ...defaultFilters })
  const [appliedFilters, setAppliedFilters] = useState<Filters>({ ...defaultFilters })
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(['碳现货', '股票', '债券', '互换', '期权'])
  )
  const [groupSortState, setGroupSortState] = useState<SortState>({})
  const unitDiv = UNITS[unit] || 1

  // ── 原始数据 & 筛选联动 ───────────────────────────
  const allData = useMemo(() => generateMockData(), [])

  // 根据已选的 "证券分类" 计算可用 "二级分类" 选项
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

  // 反向联动：选中二级分类时自动补全对应的证券分类
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

  // ── 筛选 → 分组 → 组内排序 ──────────────────────
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

    const state = groupSortState
    if (Object.keys(state).length > 0) {
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]
        if (row.kind !== 'group') continue
        const sortCfg = state[row.assetType]
        if (!sortCfg) continue

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

  // 根据折叠状态过滤分组行下的明细行
  const visibleRows = useMemo(() => {
    return allGroupedRows.filter(row => {
      if (row.kind === 'group') return true
      return expandedGroups.has(row.assetType)
    })
  }, [allGroupedRows, expandedGroups])

  // ── 分组行点击排序 ──────────────────────────────
  const onCellClicked = useCallback((params: CellClickedEvent<Row>) => {
    const row = params.data as Row | undefined
    if (!row || row.kind !== 'group') return

    const colId = params.column.getColId()
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

  const clearGroupSort = useCallback((assetType: string) => {
    setGroupSortState(prev => {
      const next = { ...prev }
      delete next[assetType]
      return next
    })
  }, [])

  const columnDefs = useMemo(() => buildColumns(unitDiv), [unitDiv])

  // ── 查询/清除 ─────────────────────────────────────
  const doQuery = () => setAppliedFilters({ ...filters })
  const doClear = () => {
    setFilters({ ...defaultFilters })
    setAppliedFilters({ ...defaultFilters })
    setGroupSortState({})
  }

  const groupCount = useMemo(() => allGroupedRows.filter(r => r.kind === 'group').length, [allGroupedRows])
  const detailCount = useMemo(() => allGroupedRows.filter(r => r.kind === 'detail').length, [allGroupedRows])
  // 透传给 ag-grid cellRenderer 和 valueFormatter 访问
  const context = useMemo(() => ({ expandedGroups, setExpandedGroups, groupSortState, clearGroupSort }), [expandedGroups, groupSortState, clearGroupSort])

  return (
    <ConfigProvider mode={mode} theme={themeConfig}>
    <div className="app-container">
      <Header
        mode={mode}
        onToggleMode={() => setMode(m => m === 'light' ? 'dark' : 'light')}
        primaryColor={primaryColor}
        onPrimaryColorChange={setPrimaryColor}
        primaryColorOptions={PRIMARY_COLORS}
      />

      <FilterBar
        filters={filters}
        setFilters={setFilters}
        setAssetType={setAssetType}
        setCounterparty={setCounterparty}
        availableCounterparties={availableCounterparties}
        onQuery={doQuery}
        onClear={doClear}
      />

      <Toolbar
        unit={unit}
        setUnit={setUnit}
        detailCount={detailCount}
        groupCount={groupCount}
      />

      <section className="grid-wrapper">
        <div className="ag-theme-alpine grid-inner" style={{ height: '100%' }}>
          <AgGridProvider modules={modules} licenseKey="AgGridLicense66fwc79n[NORMAL][v0102]_NDA3MDk2NjQwMDAwMA==80908dd5fb71b58d3ce28b2ed320216d">
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
    </ConfigProvider>
  )
}
